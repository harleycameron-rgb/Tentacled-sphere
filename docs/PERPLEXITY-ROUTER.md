# Perplexity Router (server-side, opt-in)

This integration provides one explicit server-side entry point for OpenAI
Chat Completions callers. No existing LLM calls were present in the inspected
project, so it does not migrate or add any browser feature. The geometry API,
coordinate modules, and browser adapter remain independent. No network request
is made at import, page load, test, build, or during ordinary geometry requests.

Router is appropriate for direct model access without web grounding. It is an
external inference service, not a source of verified evidence, and model output
must not be treated as authority or used to execute tools. Perplexity describes
Router/Orchestrator as a private preview; access and available models are
account-specific and can change. The authenticated live catalog is authoritative.
No particular model is promised by this client.

## Key and model configuration

Create or rotate an API key in the
[Perplexity API Console](https://console.perplexity.ai), then export it only in
your own terminal. Never put the value in source, a `.env` example, a browser
bundle, or logs:

```sh
export PERPLEXITY_API_KEY='your key, entered locally'
```

Discover models using the same authenticated client and then select an exact
catalog ID:

```sh
python scripts/router_smoke.py --models
export PERPLEXITY_MODEL='exact ID copied from the catalog'
python scripts/router_smoke.py --smoke --model "$PERPLEXITY_MODEL"
```

The smoke command makes at most one completion request after checking the
catalog, with a 16-token limit and `Reply OK.` It prints only HTTP status and
response-shape metadata. It may use existing API credits. A missing key, an
unlisted ID, or unavailable account access stops the request; the client does
not select a substitute model or another provider.

## Server-side API

Install the pinned dependency from `requirements.txt`. A future trusted server
caller can explicitly create and use the shared client:

```python
from llm import RouterClient

with RouterClient() as router:
    result = router.complete(
        [{"role": "user", "content": "A caller-provided question"}],
        model="an exact ID discovered from the live catalog",
    )
    status = result.status_code
    completion = result.completion
```

`PERPLEXITY_MODEL` can provide the model instead of the `model` argument.
Every completion and stream checks that exact ID against the authenticated
`GET /router/v1/models` catalog before posting to
`POST /router/v1/chat/completions`. Inputs are text-only conversations of 1–64
system/user/assistant messages, at most 65,536 aggregate UTF-8 content bytes,
and 1–4,096 `max_completion_tokens` (default 256). No tools or image inputs are
accepted.

Successful non-streaming results retain the SDK completion and usage fields,
including cached prompt-token details and reasoning-token details; cached
prompt tokens are already included in `prompt_tokens` and must not be counted
again. Streaming requests use `stream=true` and
`stream_options.include_usage=true`. A stream is successful only after a finish
indication, a usage chunk, and the explicit SSE `[DONE]` marker. Incomplete
streams and in-band errors are surfaced as bounded `RouterError` codes and are
never replayed after output begins.

The SDK retry mechanism is disabled. At most three attempts are made for
pre-output 429s, honoring numeric or HTTP-date `Retry-After` values and a
30-second accumulated wait budget. Other statuses and connection/timeout
failures are not retried. Errors do not include upstream bodies, credentials,
prompts, or completions. This client is not an unauthenticated public proxy;
callers must enforce their own authorization before allowing user-triggered
paid inference.

## Provider references

- [Router quickstart](https://docs.perplexity.ai/docs/gateway/quickstart)
- [Router models](https://docs.perplexity.ai/docs/gateway/models)
- [Routing and reliability](https://docs.perplexity.ai/docs/gateway/routing-and-reliability)
- [Chat Completions API](https://docs.perplexity.ai/api-reference/gateway-chat-completions-post)
- [Router model catalog API](https://docs.perplexity.ai/api-reference/gateway-models-get)
- [Messages API reference](https://docs.perplexity.ai/api-reference/gateway-messages-post)
- [SDK overview](https://docs.perplexity.ai/docs/sdk/overview)
- [Pricing](https://docs.perplexity.ai/docs/getting-started/pricing)
- [Rate limits and usage tiers](https://docs.perplexity.ai/docs/admin/rate-limits-usage-tiers)

This implementation uses the OpenAI Chat Completions schema only. It does not
use the Messages endpoint or claim that its availability or schema is
interchangeable with Chat Completions.
