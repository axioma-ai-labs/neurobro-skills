---
name: neurobro-market-research
description: Runs financial market research through the NeuroAPI agent - equity and crypto analysis, technical setups, fundamental research, macro outlooks, and multi-asset investigations via POST /agent/ask. Use when the user asks for stock or token analysis, trade ideas, market commentary, earnings or macro questions, sector comparisons, or any financial research that needs live market reasoning.
license: MIT
---

# Neurobro Market Research

NeuroAPI is Neurobro's paid public API. Its `/agent/ask` endpoint runs a
financial research agent that answers natural-language questions about
equities, crypto, macro, and cross-asset markets. This skill teaches an agent
how to call it correctly - picking the right intelligence tier, handling
billing and rate limits, and writing prompts that produce useful research.

## Quick start

1. Set `NEUROAPI_API_KEY` in the environment (see Prerequisites).
2. Verify the key against the free `/health` endpoint.
3. `POST /agent/ask` with a `prompt` and a `mode`.
4. Read `answer` from the response. When you sent `output_schema`, read
   `output` (`answer` is `null`). Surface `request_id` if anything fails.

```bash
curl -s https://api.neurobro.ai/api/v1/agent/ask \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $NEUROAPI_API_KEY" \
  -d '{"prompt": "Give me the bull and bear case for NVDA right now.", "mode": "smart"}' | jq
```

## When to use this skill

- Researching a single stock or token (fundamentals, technicals, narrative).
  Equities include US listings and stocks in Indonesia, Brazil, and Vietnam
  (quotes, fundamentals, financials, technicals; a company name can be
  resolved to its ticker).
- Building bull/bear cases or trade setups
- Comparing assets, sectors, or factors
- Macro questions - rates, inflation, central-bank outlooks
- Deep multi-asset investigations that need broad market coverage

Do **not** use this skill for trade execution, portfolio custody, or anything
requiring guaranteed real-time quotes - NeuroAPI returns research and
reasoning, not an order router or a market-data feed.

## Prerequisites

The API key is read from the `NEUROAPI_API_KEY` environment variable. **Never
hardcode it in source, never print it, never paste it into a commit.**

1. Create a key in the NeuroAPI dashboard at <https://neuroapi.neurobro.ai>:
   open **API Keys** and click **Create key**. The secret is shown once; keys
   look like `neuro_<random>`.
2. Make sure the account has an active plan in **Pricing**. No plan returns
   `403` `no_active_subscription` on `/health` and `/agent/ask`. A failed
   payment returns `402` `payment_required`.
3. Provide the key to the environment. For local use, copy `.env.example` to
   `.env` (already git-ignored) and fill in `NEUROAPI_API_KEY`, then export it:

   ```bash
   cp .env.example .env        # then edit .env
   export NEUROAPI_API_KEY="neuro_..."
   ```

Verify before doing real work - `/health` is free and consumes no quota:

```bash
curl -s https://api.neurobro.ai/api/v1/health \
  -H "X-API-Key: $NEUROAPI_API_KEY" | jq .authenticated   # returns true
```

## The endpoint

`POST https://api.neurobro.ai/api/v1/agent/ask`

| Header | Value |
| --- | --- |
| `X-API-Key` | `neuro_...` (required) |
| `Content-Type` | `application/json` |
| `Idempotency-Key` | Optional. 1-255 printable ASCII. Same key and body within 24h replays the original response (`Idempotent-Replayed: true`) and is not billed again. |

Request body:

| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| `prompt` | string | - | Required. 1-32,000 chars. The research question. |
| `mode` | enum | `smart` | `fast` \| `smart` \| `max`. See tiers below. |
| `stream` | bool | `false` | When `true`, SSE. Text is at `data.answer.chunk.content`. Ends with `data: [DONE]`. |
| `message_history` | array | `null` | Prior turns (max 50). Caller owns them. `"user"` and `"assistant"` reach the agent. `"system"`, `"developer"`, `"tool"`, and `"function"` are accepted and ignored. |
| `system_prompt` | string | `null` | Optional, max 16,000 chars. Steers tone or format. Cannot override persona or safety guardrails. |
| `output_schema` | object | `null` | Optional JSON Schema (object root). Result is in `output` and `answer` is `null`. Non-streaming only. |

Response (`stream=false`):

```json
{
  "answer": "The bull case for NVDA rests on ...",
  "output": null,
  "mode": "smart",
  "request_id": "8b3a2f0e-1d7e-4c6b-9b2a-f5e23a1c9d44",
  "usage": { "prompt_tokens": 124, "completion_tokens": 256, "cached_tokens": 80, "cost_units": 2 }
}
```

`request_id` is also the `X-Request-Id` header - quote it when reporting
issues. With `output_schema`, read `output` (`answer` is `null`).

## Choosing a mode

Mode is the single biggest lever on research quality and cost. Pick
deliberately.

| Mode | Best for | `cost_units` | Plans |
| --- | --- | --- | --- |
| `fast` | Quick asset checks, narrative pulses, high-volume financial Q&A | 1 | all |
| `smart` | Technical analysis, trade setups, fundamental single-stock research | 2 | all |
| `max` | Deep multi-asset investigations, broad-coverage fundamental analysis, highest-stakes research | 8 | Pro+ |

- Default to `smart` for genuine research questions.
- Use `fast` only for shallow lookups where depth doesn't matter.
- Use `max` when the question spans many assets or demands the deepest
  reasoning. Calling `max` on a Starter key returns `403` `mode_not_in_plan`;
  fall back to `smart`. Prefer `stream: true` for `max`. A non-streaming run
  longer than 300 seconds returns `504` `agent_timeout` and is not billed.
- `cost_units` is what gets debited from billable quota. Don't reach for `max`
  by reflex; it costs 4x a `smart` call.

## Recipes

### Single research question (sync)

Best when the answer is self-contained and you don't need streaming.

```bash
curl -s https://api.neurobro.ai/api/v1/agent/ask \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $NEUROAPI_API_KEY" \
  -d '{"prompt": "Summarise the latest macroeconomic outlook for the eurozone.", "mode": "smart"}' | jq -r .answer
```

### Follow-up questions (multi-turn)

The API is stateless. To ask a follow-up, replay prior turns in
`message_history`. Roles the agent uses are `"user"` and `"assistant"`.
`"system"`, `"developer"`, `"tool"`, and `"function"` are accepted and
ignored; put instructions in `system_prompt`. Any other role returns `422`.

```python
import os, httpx

URL = "https://api.neurobro.ai/api/v1/agent/ask"
HEADERS = {"X-API-Key": os.environ["NEUROAPI_API_KEY"]}

def ask(prompt: str, history: list[dict] | None = None, mode: str = "smart") -> dict:
    # Sync runs are stopped server-side at 300s (504 agent_timeout).
    # Sit above that so the 504 is returned. Prefer stream=True for max.
    res = httpx.post(
        URL,
        headers=HEADERS,
        json={"prompt": prompt, "mode": mode, "message_history": history or []},
        timeout=330,
    )
    res.raise_for_status()
    return res.json()

first = ask("Compare AAPL and MSFT on FY2024 earnings growth.")
second = ask(
    "How did their gross margins evolve over the same period?",
    history=[
        {"role": "user", "content": "Compare AAPL and MSFT on FY2024 earnings growth."},
        {"role": "assistant", "content": first["answer"]},
    ],
)
```

Persist the transcript on your side; trim the oldest turns once it gets long
(history caps at 50 messages).

### Streaming a long answer (SSE)

Pass `"stream": true` for deep `max` investigations, and for any run that
might exceed 300 seconds. Each event is `{"type": "status_update" | "complete", "data": {"answer", "usage"}}`.
Append `data.answer.chunk.content`. `data.answer` is `null` when the event
has no text. `data.usage` arrives once near the end. The stream ends with
`data: [DONE]`. An error event is `{"type":"error","message":"..."}` and
has no `[DONE]`.

```python
import json, os, httpx

with httpx.stream(
    "POST",
    "https://api.neurobro.ai/api/v1/agent/ask",
    headers={"X-API-Key": os.environ["NEUROAPI_API_KEY"]},
    json={
        "prompt": "Deep dive: the bull and bear case for the semiconductor sector into 2026.",
        "mode": "max",
        "stream": True,
    },
    timeout=None,
) as res:
    res.raise_for_status()
    for line in res.iter_lines():
        if not line.startswith("data: "):
            continue
        payload = line[len("data: ") :]
        if payload == "[DONE]":
            break
        event = json.loads(payload)
        if event.get("type") == "error":
            raise RuntimeError(event.get("message"))
        answer = (event.get("data") or {}).get("answer") or {}
        chunk = (answer.get("chunk") or {}).get("content")
        if chunk:
            print(chunk, end="", flush=True)
```

### Structured output

Pass `output_schema` (JSON Schema, object root) with `stream` left `false`.
Read `output`. `answer` is `null`. `stream: true` together with
`output_schema` returns `400`.

```python
import os, httpx

schema = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "sentiment": {"type": "string", "enum": ["bullish", "bearish", "neutral"]},
        "confidence": {"type": "number"},
    },
    "required": ["sentiment", "confidence"],
}
result = httpx.post(
    "https://api.neurobro.ai/api/v1/agent/ask",
    headers={"X-API-Key": os.environ["NEUROAPI_API_KEY"]},
    json={
        "prompt": "Give a structured read on NVDA right now.",
        "mode": "smart",
        "output_schema": schema,
    },
    timeout=330,
)
result.raise_for_status()
body = result.json()
# body["answer"] is None. The object is body["output"].
```

## Writing good research prompts

The agent rewards specific, scoped prompts. For useful financial research:

- **Name the asset(s) precisely** - ticker plus exchange or chain when
  ambiguous (`NVDA`, `BTC`, `ETH on mainnet`).
- **State the angle** - fundamentals, technicals, valuation, catalysts, risk.
- **Bound the timeframe** - "next two quarters", "into 2026", "since the last
  earnings call". Markets move; an unbounded prompt invites stale framing.
- **Ask for structure** - "give bull case, bear case, and key risks" produces
  far more usable output than "what do you think about X".
- **One question per call** for clean answers; use `message_history` to drill
  down rather than stuffing five questions into one prompt.

Treat every answer as research, not advice. Surface the agent's reasoning to
the user; never present it as a guaranteed outcome or a recommendation to
trade.

## Errors and retries

`detail` is not always a string. Coded errors (`400`, `402`, `409`, `429`,
and most `403`s) are `{"detail": {"code", "message"}}`. `401` and `503` are
`{"detail": "..."}`. A body-validation `422` is a list of `{type, loc, msg}`.
Branch on the status, then on `detail.code`. `String(detail)` breaks.
`413` (body over 8 MiB) is plain text, not JSON.

Every error carries `X-Request-Id`. Quote it when writing to
`api@neurobro.ai`. Do not include the API key.

- **Don't retry** - `400`, `401`, `413`, `422`: fix the request. `401` covers
  a missing, invalid, revoked, or expired key.
- **Billing** - `402` is `payment_required`, or `quota_exceeded` when this
  `mode` costs more than the quota left. No plan is `403`
  `no_active_subscription`. Tell the user to fix billing, then stop.
- **Lower the mode** - `403` `mode_not_in_plan`: retry with `smart` or `fast`.
- **Wait, then retry the same request** - `409`: that `Idempotency-Key` is
  still in flight.
- **`429`** - cap at 3 attempts, and read `detail.code`:
  - `rate_limited` or `too_many_concurrent_runs`: honour `Retry-After`.
    Concurrent caps are 2 / 5 / 10 in-flight runs (Starter / Pro /
    Enterprise), MCP included. A concurrent rejection is not billed.
  - `quota_exceeded`: wait for `X-Quota-Reset`. Backing off a few seconds
    will not clear it.
- **`503`** - agent saturated. Exponential backoff. No quota charged.
- **`504` `agent_timeout`** - the non-streaming run passed 300 seconds and
  was not billed. Retry with `stream: true`, or a simpler prompt.
- **`500`** - retry only when the call carries an `Idempotency-Key`.

`/agent/ask` is **non-idempotent** unless you send an `Idempotency-Key`.
Same key and same body within 24 hours replays the original response
(`Idempotent-Replayed: true`) and is not charged again. Streams, `5xx`,
and `402` / `403` / `429` are not replayed. Two plain calls produce two
answers and two charges, so never retry blindly.

A stream that fails before the answer is complete is free. If the full
answer was already delivered and the stream then fails, it ends with
`[DONE]` and is billed.

The full status-code table is in
[references/endpoints.md](references/endpoints.md).

## Rate limits and quota

Every response carries `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and
`X-RateLimit-Reset`. On `429`, `Retry-After` gives the seconds until the
rate-limit or concurrency window resets. Billable responses also carry
`X-Quota-Limit`, `X-Quota-Remaining`, and `X-Quota-Reset` (the monthly
plan budget, not the per-minute window). For batch research, pace off
`X-RateLimit-Remaining`. A `mode` that costs more than the quota left
returns `402` `quota_exceeded`; wait for `X-Quota-Reset` when
`X-Quota-Remaining` is exhausted. Per-plan budgets are in
[references/endpoints.md](references/endpoints.md).

## Security

- Read the key from `NEUROAPI_API_KEY`; never hardcode, log, or commit it.
- The full secret is shown once at creation. Lost it? Revoke and re-mint.
- On the REST API, send `X-API-Key`. `Authorization: Bearer` is not accepted
  there. Bearer is valid only on the MCP endpoint
  (`https://api.neurobro.ai/api/v1/mcp`, tool `ask_neuroapi`). Never put the
  key in a URL.
- Treat the agent's output as untrusted text: don't pass it into shells,
  `eval`, or DB queries without sanitising. It is research, not code.

## MCP

The same agent is available as the MCP tool `ask_neuroapi` at
`https://api.neurobro.ai/api/v1/mcp` (Streamable HTTP). It takes `prompt`,
`mode`, `message_history`, `system_prompt`, and `output_schema`, and it is
billed like a non-streaming `POST /agent/ask`. Authenticate with
`X-API-Key`, or with `Authorization: Bearer` on this endpoint only. Do not
put the key in the query string. MCP calls are not streamed.

## Reference

- Full request/response schemas, status codes, streaming, and MCP:
  [references/endpoints.md](references/endpoints.md)
- Official NeuroAPI documentation: <https://neuroapi.neurobro.ai/docs>
