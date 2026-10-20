"""Opt-in server-side client for Perplexity's OpenAI-compatible Router API."""

from __future__ import annotations

import json
import math
import os
import time
from dataclasses import dataclass
from datetime import timezone
from email.utils import parsedate_to_datetime
from typing import Any, Callable, Iterator, Mapping, Sequence

import httpx
import openai
from openai.types.chat import ChatCompletion, ChatCompletionChunk

BASE_URL = "https://api.perplexity.ai/router/v1"
_MAX_MESSAGES = 64
_MAX_CONTENT_BYTES = 65_536
_MAX_SSE_EVENT_BYTES = 1_048_576
_MAX_RETRY_WAIT = 30.0
_ALLOWED_ROLES = frozenset(("system", "user", "assistant"))
_STATUS_CODES = {
    400: "upstream_bad_request",
    401: "upstream_unauthorized",
    402: "upstream_payment_required",
    403: "upstream_forbidden",
    429: "upstream_rate_limited",
}


class RouterError(Exception):
    """A sanitized error with an HTTP status suitable for server-side callers."""

    def __init__(
        self,
        status_code: int,
        code: str,
        retry_after_seconds: float | None = None,
        http_status: int | None = None,
    ) -> None:
        self.status_code = status_code
        self.code = code
        self.retry_after_seconds = retry_after_seconds
        self.http_status = http_status
        super().__init__(code)


@dataclass(frozen=True)
class CompletionResult:
    status_code: int
    completion: ChatCompletion


class _UpstreamStatus(Exception):
    def __init__(self, status_code: int, headers: Mapping[str, str]) -> None:
        self.status_code = status_code
        self.headers = headers
        super().__init__()


def _api_error(
    status_code: int, retry_after_seconds: float | None = None
) -> RouterError:
    code = _STATUS_CODES.get(status_code, "upstream_error")
    return RouterError(status_code, code, retry_after_seconds, http_status=status_code)


def _retry_after(value: str | None, now: Callable[[], float]) -> float | None:
    if value is None:
        return None
    try:
        seconds = float(value.strip())
        if math.isfinite(seconds) and seconds >= 0:
            return seconds
    except ValueError:
        pass
    try:
        timestamp = parsedate_to_datetime(value)
        if timestamp.tzinfo is None:
            timestamp = timestamp.replace(tzinfo=timezone.utc)
        return max(0.0, timestamp.timestamp() - now())
    except (TypeError, ValueError, OverflowError):
        return None


def _messages(value: Sequence[Mapping[str, Any]]) -> list[dict[str, str]]:
    if isinstance(value, (str, bytes)) or not isinstance(value, Sequence):
        raise ValueError("messages must be a sequence")
    if not 1 <= len(value) <= _MAX_MESSAGES:
        raise ValueError("messages must contain between 1 and 64 entries")
    total_bytes = 0
    result: list[dict[str, str]] = []
    for item in value:
        if not isinstance(item, Mapping) or set(item) != {"role", "content"}:
            raise ValueError("each message must contain only role and content")
        role = item["role"]
        content = item["content"]
        if not isinstance(role, str) or role not in _ALLOWED_ROLES:
            raise ValueError("message role is not supported")
        if not isinstance(content, str):
            raise ValueError("message content must be text")
        try:
            total_bytes += len(content.encode("utf-8"))
        except UnicodeEncodeError:
            raise ValueError("message content must be valid UTF-8 text") from None
        if total_bytes > _MAX_CONTENT_BYTES:
            raise ValueError("combined message content exceeds 65536 UTF-8 bytes")
        result.append({"role": role, "content": content})
    return result


def _max_completion_tokens(value: int) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or not 1 <= value <= 4096:
        raise ValueError("max_completion_tokens must be an integer from 1 to 4096")
    return value


def _sse_events(chunks: Iterator[bytes]) -> Iterator[str]:
    line = bytearray()
    data_lines: list[bytes] = []
    event_size = 0
    for chunk in chunks:
        for byte in chunk:
            if byte == 10:
                if line.endswith(b"\r"):
                    del line[-1]
                if not line:
                    if data_lines:
                        yield b"\n".join(data_lines).decode("utf-8")
                    data_lines = []
                    event_size = 0
                elif line.startswith(b"data:"):
                    data = bytes(line[5:])
                    if data.startswith(b" "):
                        data = data[1:]
                    event_size += len(data)
                    if event_size > _MAX_SSE_EVENT_BYTES:
                        raise RouterError(502, "stream_event_too_large")
                    data_lines.append(data)
                line.clear()
            else:
                line.append(byte)
                if len(line) + event_size > _MAX_SSE_EVENT_BYTES:
                    raise RouterError(502, "stream_event_too_large")


class RouterClient:
    """Explicit Perplexity Router client; construction performs no network calls."""

    def __init__(
        self,
        model: str | None = None,
        *,
        transport: httpx.BaseTransport | None = None,
        sleep: Callable[[float], None] = time.sleep,
        clock: Callable[[], float] = time.time,
        max_attempts: int = 3,
    ) -> None:
        api_key = os.environ.get("PERPLEXITY_API_KEY", "")
        if not api_key.strip():
            raise RouterError(503, "PERPLEXITY_API_KEY is required")
        configured_model = model if model is not None else os.environ.get("PERPLEXITY_MODEL")
        if configured_model is not None and (
            not isinstance(configured_model, str) or not configured_model.strip()
        ):
            raise RouterError(400, "PERPLEXITY_MODEL must not be blank")
        if isinstance(max_attempts, bool) or not isinstance(max_attempts, int):
            raise ValueError("max_attempts must be an integer")
        if not 1 <= max_attempts <= 3:
            raise ValueError("max_attempts must be from 1 to 3")

        http_client = (
            httpx.Client(transport=transport) if transport is not None else None
        )
        self._client = openai.OpenAI(
            api_key=api_key,
            base_url=BASE_URL,
            max_retries=0,
            http_client=http_client,
        )
        self._model = configured_model.strip() if configured_model else None
        self._sleep = sleep
        self._clock = clock
        self._max_attempts = max_attempts

    def close(self) -> None:
        self._client.close()

    def __enter__(self) -> RouterClient:
        return self

    def __exit__(self, *_: object) -> None:
        self.close()

    def _selected_model(self, model: str | None) -> str:
        selected = model if model is not None else self._model
        if not isinstance(selected, str) or not selected.strip():
            raise RouterError(400, "PERPLEXITY_MODEL is required")
        return selected.strip()

    def _retry(self, operation: Callable[[], Any]) -> Any:
        waited = 0.0
        for attempt in range(self._max_attempts):
            try:
                return operation()
            except _UpstreamStatus as error:
                status_code = error.status_code
                headers = error.headers
            except openai.APIStatusError as error:
                status_code = error.status_code
                headers = error.response.headers
            except openai.APIConnectionError:
                raise RouterError(502, "upstream_connection_error") from None

            if status_code != 429:
                raise _api_error(status_code) from None
            delay = _retry_after(headers.get("retry-after"), self._clock)
            if delay is None:
                delay = float(2**attempt)
            if attempt + 1 >= self._max_attempts or waited + delay > _MAX_RETRY_WAIT:
                raise _api_error(429, delay) from None
            self._sleep(delay)
            waited += delay
        raise RouterError(502, "upstream_error")

    def list_models(self) -> list[str]:
        try:
            page = self._retry(self._client.models.list)
            data = page.data
            if not isinstance(data, list):
                raise ValueError
            ids = [model.id for model in data]
            if any(not isinstance(model_id, str) or not model_id for model_id in ids):
                raise ValueError
            return ids
        except RouterError:
            raise
        except Exception:
            raise RouterError(502, "invalid_catalog") from None

    def _require_catalog_model(self, model: str) -> None:
        if model not in self.list_models():
            raise RouterError(400, "model_not_available")

    def complete(
        self,
        messages: Sequence[Mapping[str, Any]],
        *,
        model: str | None = None,
        max_completion_tokens: int = 256,
    ) -> CompletionResult:
        selected_model = self._selected_model(model)
        normalized = _messages(messages)
        token_limit = _max_completion_tokens(max_completion_tokens)
        self._require_catalog_model(selected_model)

        def request() -> tuple[int, ChatCompletion]:
            response = self._client.chat.completions.with_raw_response.create(
                model=selected_model,
                messages=normalized,
                max_completion_tokens=token_limit,
            )
            return response.status_code, response.parse()

        try:
            status_code, completion = self._retry(request)
        except RouterError:
            raise
        except Exception:
            raise RouterError(502, "invalid_completion_response") from None
        if not isinstance(completion.choices, list) or len(completion.choices) != 1:
            raise RouterError(502, "invalid_completion_response")
        return CompletionResult(status_code, completion)

    def stream(
        self,
        messages: Sequence[Mapping[str, Any]],
        *,
        model: str | None = None,
        max_completion_tokens: int = 256,
    ) -> Iterator[ChatCompletionChunk]:
        selected_model = self._selected_model(model)
        normalized = _messages(messages)
        token_limit = _max_completion_tokens(max_completion_tokens)
        self._require_catalog_model(selected_model)
        return self._stream_after_catalog(selected_model, normalized, token_limit)

    def _stream_after_catalog(
        self,
        model: str,
        messages: list[dict[str, str]],
        max_completion_tokens: int,
    ) -> Iterator[ChatCompletionChunk]:
        def close_stream(manager: Any) -> None:
            try:
                manager.__exit__(None, None, None)
            except Exception:
                pass

        def open_stream() -> tuple[Any, Any]:
            manager = self._client.chat.completions.with_streaming_response.create(
                model=model,
                messages=messages,
                max_completion_tokens=max_completion_tokens,
                stream=True,
                stream_options={"include_usage": True},
            )
            try:
                response = manager.__enter__()
            except openai.APIStatusError:
                raise
            status_code = response.status_code
            if status_code != 200:
                headers = dict(response.headers)
                close_stream(manager)
                raise _UpstreamStatus(status_code, headers)
            return manager, response

        manager, response = self._retry(open_stream)
        finished = False
        usage_seen = False
        done_seen = False
        try:
            chunks = response.http_response.iter_bytes(chunk_size=4096)
            for event in _sse_events(chunks):
                if event == "[DONE]":
                    done_seen = True
                    break
                if usage_seen:
                    raise RouterError(502, "invalid_stream_event")
                try:
                    payload = json.loads(event)
                    if not isinstance(payload, dict):
                        raise ValueError
                    if "error" in payload:
                        raise RouterError(502, "upstream_stream_error")
                    chunk = ChatCompletionChunk.model_validate(payload)
                except RouterError:
                    raise
                except Exception:
                    raise RouterError(502, "invalid_stream_event") from None
                if finished and chunk.choices:
                    raise RouterError(502, "invalid_stream_event")
                if chunk.usage is not None:
                    usage_seen = True
                if any(choice.finish_reason is not None for choice in chunk.choices):
                    finished = True
                yield chunk
            if not done_seen or not finished or not usage_seen:
                raise RouterError(502, "incomplete_stream")
        except RouterError:
            raise
        except Exception:
            raise RouterError(502, "incomplete_stream") from None
        finally:
            close_stream(manager)
