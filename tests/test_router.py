import json
import os
import subprocess
import sys
import unittest
from datetime import datetime, timezone
from email.utils import format_datetime
from pathlib import Path
from unittest.mock import patch

import httpx

from llm import RouterClient, RouterError


ROOT = Path(__file__).resolve().parents[1]
MODEL = "test/synthetic-router-model"
KEY = "synthetic-test-key-never-valid"


def catalog(model=MODEL):
    return {"data": [{"id": model, "object": "model", "created": 0, "owned_by": "test"}]}


def completion(choices=None):
    return {
        "id": "chatcmpl-test",
        "object": "chat.completion",
        "created": 1,
        "model": MODEL,
        "choices": choices
        if choices is not None
        else [
            {
                "index": 0,
                "message": {"role": "assistant", "content": "OK"},
                "finish_reason": "stop",
            }
        ],
        "usage": {
            "prompt_tokens": 4,
            "completion_tokens": 1,
            "total_tokens": 5,
            "prompt_tokens_details": {"cached_tokens": 2},
            "completion_tokens_details": {"reasoning_tokens": 0},
        },
    }


def response(payload, status=200, headers=None):
    return httpx.Response(
        status,
        headers=headers,
        json=payload,
    )


def sse_event(payload):
    return ("data: " + json.dumps(payload) + "\n\n").encode()


def stream_body(include_done=True):
    events = [
        {
            "id": "chatcmpl-test",
            "object": "chat.completion.chunk",
            "created": 1,
            "model": MODEL,
            "choices": [{"index": 0, "delta": {"content": "OK"}, "finish_reason": None}],
        },
        {
            "id": "chatcmpl-test",
            "object": "chat.completion.chunk",
            "created": 1,
            "model": MODEL,
            "choices": [{"index": 0, "delta": {}, "finish_reason": "stop"}],
        },
        {
            "id": "chatcmpl-test",
            "object": "chat.completion.chunk",
            "created": 1,
            "model": MODEL,
            "choices": [],
            "usage": {"prompt_tokens": 4, "completion_tokens": 1, "total_tokens": 5},
        },
    ]
    body = b"".join(sse_event(event) for event in events)
    if include_done:
        body += b"data: [DONE]\n\n"
    return body


class RouterTests(unittest.TestCase):
    def make_router(self, handler, **kwargs):
        client = RouterClient(
            model=MODEL,
            transport=httpx.MockTransport(handler),
            **kwargs,
        )
        self.addCleanup(client.close)
        return client

    def test_exact_paths_and_same_key_authentication(self):
        requests = []

        def handler(request):
            requests.append(request)
            if request.url.path.endswith("/models"):
                return response(catalog())
            return response(completion())

        with patch.dict(os.environ, {"PERPLEXITY_API_KEY": KEY}, clear=True):
            router = self.make_router(handler)
            result = router.complete([{"role": "user", "content": "hello"}])

        self.assertEqual(result.status_code, 200)
        self.assertEqual([request.url.path for request in requests], [
            "/router/v1/models",
            "/router/v1/chat/completions",
        ])
        auth_headers = [request.headers["authorization"] for request in requests]
        self.assertEqual(auth_headers[0], auth_headers[1])
        self.assertEqual(auth_headers[0][len("Bearer "):], KEY)
        self.assertEqual(json.loads(requests[1].content)["max_completion_tokens"], 256)
        self.assertEqual(requests[1].url.host, "api.perplexity.ai")
        self.assertEqual(result.completion.choices[0].message.content, "OK")

    def test_missing_model_does_not_guess_or_request(self):
        requests = []
        with patch.dict(os.environ, {"PERPLEXITY_API_KEY": KEY}, clear=True):
            router = RouterClient(transport=httpx.MockTransport(lambda request: requests.append(request)))
            self.addCleanup(router.close)
            with self.assertRaises(RouterError) as caught:
                router.complete([{"role": "user", "content": "hello"}])
        self.assertEqual(caught.exception.code, "PERPLEXITY_MODEL is required")
        self.assertEqual(requests, [])

    def test_environment_model_is_used(self):
        requests = []

        def handler(request):
            requests.append(request)
            return response(catalog()) if request.url.path.endswith("/models") else response(completion())

        with patch.dict(
            os.environ,
            {"PERPLEXITY_API_KEY": KEY, "PERPLEXITY_MODEL": MODEL},
            clear=True,
        ):
            router = RouterClient(transport=httpx.MockTransport(handler))
            self.addCleanup(router.close)
            router.complete([{"role": "user", "content": "hello"}])
        self.assertEqual(len(requests), 2)

    def test_unlisted_model_is_rejected_before_post(self):
        requests = []

        def handler(request):
            requests.append(request)
            return response(catalog("test/another-model"))

        with patch.dict(os.environ, {"PERPLEXITY_API_KEY": KEY}, clear=True):
            router = self.make_router(handler)
            with self.assertRaises(RouterError) as caught:
                router.complete([{"role": "user", "content": "hello"}])
        self.assertEqual(caught.exception.code, "model_not_available")
        self.assertEqual([request.url.path for request in requests], ["/router/v1/models"])

    def test_malformed_catalog_is_sanitized(self):
        with patch.dict(os.environ, {"PERPLEXITY_API_KEY": KEY}, clear=True):
            router = self.make_router(lambda request: response({"data": [{"wrong": "secret"}]}))
            with self.assertRaises(RouterError) as caught:
                router.list_models()
        self.assertEqual(caught.exception.status_code, 502)
        self.assertEqual(caught.exception.code, "invalid_catalog")
        self.assertNotIn("secret", str(caught.exception))

    def test_nonstreaming_requires_exactly_one_choice(self):
        def handler(request):
            return response(catalog()) if request.url.path.endswith("/models") else response(completion([]))

        with patch.dict(os.environ, {"PERPLEXITY_API_KEY": KEY}, clear=True):
            router = self.make_router(handler)
            with self.assertRaises(RouterError) as caught:
                router.complete([{"role": "user", "content": "hello"}])
        self.assertEqual(caught.exception.code, "invalid_completion_response")

    def test_completion_usage_fields_are_preserved(self):
        def handler(request):
            return response(catalog()) if request.url.path.endswith("/models") else response(completion())

        with patch.dict(os.environ, {"PERPLEXITY_API_KEY": KEY}, clear=True):
            result = self.make_router(handler).complete([{"role": "user", "content": "hello"}])
        usage = result.completion.usage
        self.assertEqual(usage.prompt_tokens, 4)
        self.assertEqual(usage.prompt_tokens_details.cached_tokens, 2)
        self.assertEqual(usage.completion_tokens_details.reasoning_tokens, 0)

    def test_http_errors_are_sanitized_and_not_retried(self):
        for status in (400, 401, 402, 403):
            with self.subTest(status=status):
                requests = []

                def handler(request):
                    requests.append(request)
                    if request.url.path.endswith("/models"):
                        return response(catalog())
                    return httpx.Response(status, json={"error": f"{KEY} private body"})

                with patch.dict(os.environ, {"PERPLEXITY_API_KEY": KEY}, clear=True):
                    router = self.make_router(handler)
                    with self.assertRaises(RouterError) as caught:
                        router.complete([{"role": "user", "content": "secret prompt"}])
                self.assertEqual(caught.exception.status_code, status)
                self.assertEqual(caught.exception.http_status, status)
                self.assertEqual(len(requests), 2)
                self.assertNotIn(KEY, str(caught.exception))
                self.assertNotIn("private body", str(caught.exception))
                self.assertNotIn("secret prompt", str(caught.exception))

    def test_retry_after_seconds_and_http_date(self):
        for header, expected, clock in (
            ("2", 2.0, lambda: 1000.0),
            (
                format_datetime(datetime.fromtimestamp(1005, timezone.utc), usegmt=True),
                5.0,
                lambda: 1000.0,
            ),
        ):
            with self.subTest(header=header):
                posts = []
                waits = []

                def handler(request):
                    if request.url.path.endswith("/models"):
                        return response(catalog())
                    posts.append(request)
                    if len(posts) == 1:
                        return httpx.Response(429, headers={"Retry-After": header})
                    return response(completion())

                with patch.dict(os.environ, {"PERPLEXITY_API_KEY": KEY}, clear=True):
                    router = self.make_router(handler, sleep=waits.append, clock=clock)
                    result = router.complete([{"role": "user", "content": "hello"}])
                self.assertEqual(result.status_code, 200)
                self.assertEqual(waits, [expected])
                self.assertEqual(len(posts), 2)

    def test_retry_after_longer_than_budget_is_not_shortened(self):
        posts = []
        waits = []

        def handler(request):
            if request.url.path.endswith("/models"):
                return response(catalog())
            posts.append(request)
            delay = "20" if len(posts) == 1 else "15"
            return httpx.Response(429, headers={"Retry-After": delay})

        with patch.dict(os.environ, {"PERPLEXITY_API_KEY": KEY}, clear=True):
            router = self.make_router(handler, sleep=waits.append)
            with self.assertRaises(RouterError) as caught:
                router.complete([{"role": "user", "content": "hello"}])
        self.assertEqual(waits, [20.0])
        self.assertEqual(len(posts), 2)
        self.assertEqual(caught.exception.status_code, 429)
        self.assertEqual(caught.exception.retry_after_seconds, 15.0)

    def test_retry_attempts_are_bounded(self):
        posts = []
        waits = []

        def handler(request):
            if request.url.path.endswith("/models"):
                return response(catalog())
            posts.append(request)
            return httpx.Response(429)

        with patch.dict(os.environ, {"PERPLEXITY_API_KEY": KEY}, clear=True):
            router = self.make_router(handler, sleep=waits.append)
            with self.assertRaises(RouterError):
                router.complete([{"role": "user", "content": "hello"}])
        self.assertEqual(len(posts), 3)
        self.assertEqual(waits, [1.0, 2.0])

    def test_connection_and_timeout_failures_are_not_retried(self):
        for failure in (httpx.ConnectError("private connection detail"), httpx.ReadTimeout("private timeout")):
            with self.subTest(failure=type(failure).__name__):
                requests = []

                def handler(request):
                    requests.append(request)
                    if request.url.path.endswith("/models"):
                        return response(catalog())
                    raise failure

                with patch.dict(os.environ, {"PERPLEXITY_API_KEY": KEY}, clear=True):
                    router = self.make_router(handler)
                    with self.assertRaises(RouterError) as caught:
                        router.complete([{"role": "user", "content": "hello"}])
                self.assertEqual(len(requests), 2)
                self.assertNotIn("private", str(caught.exception))

    def test_stream_includes_empty_choice_final_usage_and_validates_done(self):
        requests = []

        def handler(request):
            requests.append(request)
            if request.url.path.endswith("/models"):
                return response(catalog())
            body = stream_body()
            return httpx.Response(200, headers={"Content-Type": "text/event-stream"}, content=body)

        with patch.dict(os.environ, {"PERPLEXITY_API_KEY": KEY}, clear=True):
            router = self.make_router(handler)
            chunks = list(router.stream([{"role": "user", "content": "hello"}]))
        self.assertEqual(len(chunks), 3)
        self.assertEqual(chunks[-1].choices, [])
        self.assertEqual(chunks[-1].usage.prompt_tokens, 4)
        post = requests[-1]
        body = json.loads(post.content)
        self.assertEqual(post.url.path, "/router/v1/chat/completions")
        self.assertIs(body["stream"], True)
        self.assertEqual(body["stream_options"], {"include_usage": True})

    def test_stream_without_done_is_incomplete_even_after_finish_and_usage(self):
        def handler(request):
            if request.url.path.endswith("/models"):
                return response(catalog())
            return httpx.Response(200, content=stream_body(include_done=False))

        with patch.dict(os.environ, {"PERPLEXITY_API_KEY": KEY}, clear=True):
            router = self.make_router(handler)
            with self.assertRaises(RouterError) as caught:
                list(router.stream([{"role": "user", "content": "hello"}]))
        self.assertEqual(caught.exception.code, "incomplete_stream")

    def test_stream_rejects_events_after_final_usage(self):
        events = stream_body().replace(b"data: [DONE]\n\n", b"")
        events += sse_event(
            {
                "id": "chatcmpl-test",
                "object": "chat.completion.chunk",
                "created": 1,
                "model": MODEL,
                "choices": [],
            }
        ) + b"data: [DONE]\n\n"

        def handler(request):
            return response(catalog()) if request.url.path.endswith("/models") else httpx.Response(200, content=events)

        with patch.dict(os.environ, {"PERPLEXITY_API_KEY": KEY}, clear=True):
            router = self.make_router(handler)
            with self.assertRaises(RouterError) as caught:
                list(router.stream([{"role": "user", "content": "hello"}]))
        self.assertEqual(caught.exception.code, "invalid_stream_event")

    def test_stream_inband_error_is_sanitized_and_not_replayed(self):
        posts = []

        def handler(request):
            if request.url.path.endswith("/models"):
                return response(catalog())
            posts.append(request)
            return httpx.Response(
                200,
                content=sse_event({"error": {"message": f"{KEY} private prompt"}}),
            )

        with patch.dict(os.environ, {"PERPLEXITY_API_KEY": KEY}, clear=True):
            router = self.make_router(handler)
            with self.assertRaises(RouterError) as caught:
                list(router.stream([{"role": "user", "content": "hello"}]))
        self.assertEqual(len(posts), 1)
        self.assertEqual(caught.exception.code, "upstream_stream_error")
        self.assertNotIn(KEY, str(caught.exception))
        self.assertNotIn("private prompt", str(caught.exception))

    def test_stream_requires_terminal_finish_and_usage(self):
        body = sse_event(
            {
                "id": "chatcmpl-test",
                "object": "chat.completion.chunk",
                "created": 1,
                "model": MODEL,
                "choices": [{"index": 0, "delta": {}, "finish_reason": "stop"}],
            }
        ) + b"data: [DONE]\n\n"

        def handler(request):
            return response(catalog()) if request.url.path.endswith("/models") else httpx.Response(200, content=body)

        with patch.dict(os.environ, {"PERPLEXITY_API_KEY": KEY}, clear=True):
            router = self.make_router(handler)
            with self.assertRaises(RouterError) as caught:
                list(router.stream([{"role": "user", "content": "hello"}]))
        self.assertEqual(caught.exception.code, "incomplete_stream")

    def test_input_bounds_are_rejected_before_network(self):
        requests = []

        def handler(request):
            requests.append(request)
            return response(catalog())

        cases = (
            ([], 256),
            ([{"role": "developer", "content": "x"}], 256),
            ([{"role": "user", "content": ["x"]}], 256),
            ([{"role": "user", "content": "x", "name": "no"}], 256),
            ([{"role": "user", "content": "é" * 32769}], 256),
            ([{"role": "user", "content": "x"}] * 65, 256),
            ([{"role": "user", "content": "x"}], 0),
            ([{"role": "user", "content": "x"}], 4097),
            ([{"role": "user", "content": "x"}], True),
        )
        with patch.dict(os.environ, {"PERPLEXITY_API_KEY": KEY}, clear=True):
            router = self.make_router(handler)
            for messages, tokens in cases:
                with self.subTest(messages=len(messages), tokens=tokens):
                    with self.assertRaises(ValueError):
                        router.complete(messages, max_completion_tokens=tokens)
        self.assertEqual(requests, [])

    def test_missing_key_smoke_has_no_traceback_or_secret(self):
        env = {key: value for key, value in os.environ.items() if key != "PERPLEXITY_API_KEY"}
        env.pop("PERPLEXITY_MODEL", None)
        result = subprocess.run(
            [
                sys.executable,
                str(ROOT / "scripts" / "router_smoke.py"),
                "--smoke",
                "--model",
                MODEL,
            ],
            cwd=ROOT,
            env=env,
            text=True,
            capture_output=True,
            check=False,
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("PERPLEXITY_API_KEY is required", result.stderr)
        self.assertIn("HTTP status: unavailable", result.stderr)
        self.assertNotIn("Traceback", result.stderr)
        self.assertNotIn(KEY, result.stdout + result.stderr)


if __name__ == "__main__":
    unittest.main()
