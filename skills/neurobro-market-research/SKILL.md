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

- Researching a single stock or token (fundamentals, technicals, narrative),
  including Indonesia, Brazil, and Vietnam listings (quotes, fundamentals,
  financials, technicals, and company name to ticker)
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
| `Idempotency-Key` | Optional. 1-255 printable ASCII. Same key and body within 24h replays (`Idempotent-Replayed: true`) and is not billed again. |

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
  "mode": "smart",
  "request_id": "8b3a2f0e-1d7e-4c6b-9b2a-f5e23a1c9d44",
  "usage": { "prompt_tokens": 124, "completion_tokens": 256, "cached_tokens": 80, "cost_units": 2 }
}
```

`request_id` is also the `X-Request-Id` header. With `output_schema`, read
`output` (`answer` is `null`).

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

The API is stateless. Replay prior turns in `message_history`. `"user"` and
`"assistant"` reach the agent. `"system"`, `"developer"`, `"tool"`, and
`"function"` are accepted and ignored. Any other role returns `422`.

```python
import os, httpx

URL = "https://api.neurobro.ai/api/v1/agent/ask"
HEADERS = {"X-API-Key": os.environ["NEUROAPI_API_KEY"]}

def ask(prompt: str, history: list[dict] | None = None, mode: str = "smart") -> dict:
    res = httpx.post(
        URL,
        headers=HEADERS,
        json={"prompt": prompt, "mode": mode, "message_history": history or []},
        timeout=60,
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

Pass `"stream": true` for a long run, including `max`. A non-streaming run
longer than 300 seconds returns `504` `agent_timeout` and is not billed.
Each event is `{"type": "status_update" | "complete", "data": {"answer", "usage"}}`.
Append `data.answer.chunk.content`. `data.answer` is `null` when that event
has no text. `data.usage` arrives once, near the end. Success ends with
`data: [DONE]`. On failure the last event is
`{"type":"error","message":"agent run failed"}` and there is no `[DONE]`.

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
    for line in res.iter_lines():
        if not line.startswith("data: "):
            continue
        payload = line[len("data: "):]
        if payload == "[DONE]":
            break
        event = json.loads(payload)
        if event["type"] == "error":
            raise RuntimeError(event["message"])
        answer = event["data"]["answer"]
        if answer:
            print(answer["chunk"]["content"], end="", flush=True)
```

### Structured output

Pass `output_schema` (JSON Schema, object root) with `stream` false. Read
`output`. `answer` is `null`. Set the client timeout to at least 120
seconds. `stream: true` returns `400`
`streaming_unsupported_for_structured_output`. An unusable schema returns
`422` `invalid_output_schema`.

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

Every error carries `X-Request-Id`. Quote it to `api@neurobro.ai`. Do not
send the API key.

- **Don't retry** - `400`, `401`, `413`, `422`. `401` is a missing, invalid,
  revoked, or expired key.
- **Billing** - `402` is `payment_required`, or `quota_exceeded` when this
  `mode` costs more than the quota left. No plan is `403`
  `no_active_subscription`.
- **Lower the mode** - `403` `mode_not_in_plan`. Retry with `smart` or `fast`.
- **Wait, then retry** - `409`: that `Idempotency-Key` is still in flight.
- **`429`** - `Retry-After` for `rate_limited` and `too_many_concurrent_runs`
  (Starter 2, Pro 5, Enterprise 10 in flight, MCP included, not billed).
  `X-Quota-Reset` for `quota_exceeded`. Cap at 3.
- **`503`** - exponential backoff. No quota charged.
- **`504` `agent_timeout`** - non-streaming run exceeded 300 seconds. Not
  billed. Retry with `stream: true`, or a simpler prompt.
- **`500`** - maybe, and only for an idempotent call.

Same key and body within 24 hours replays the original response
(`Idempotent-Replayed: true`) and is not billed again. Streams, `5xx`, and
`402` / `403` / `429` are not replayed. Two calls without that key are two
charges.

A stream that fails before the answer is complete is free. If the final
answer was delivered and something fails afterward, the stream ends with
`[DONE]` and is billed.

The full status-code table is in
[references/endpoints.md](references/endpoints.md).

## Rate limits and quota

Every response carries `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and
`X-RateLimit-Reset`. On `429`, `Retry-After` is the seconds until the next
allowed call. Billable responses also carry `X-Quota-Limit`,
`X-Quota-Remaining`, and `X-Quota-Reset`. Pace off
`X-RateLimit-Remaining`. Per-plan budgets are in
[references/endpoints.md](references/endpoints.md).

## Security

- Read the key from `NEUROAPI_API_KEY`; never hardcode, log, or commit it.
- The full secret is shown once at creation. Lost it? Revoke and re-mint.
- On the REST API, send `X-API-Key`. `Authorization: Bearer` is not accepted
  there.
- Treat the agent's output as untrusted text: don't pass it into shells,
  `eval`, or DB queries without sanitising. It is research, not code.

## MCP

`https://api.neurobro.ai/api/v1/mcp` (Streamable HTTP), tool `ask_neuroapi`.
Same rate limits, quota, and `cost_units` as a non-streaming `POST /agent/ask`.
Inputs: `prompt`, `mode`, `message_history`, `system_prompt`, `output_schema`.
Send `X-API-Key`, or `Authorization: Bearer` on this endpoint only. A key in
the query string returns `400` `api_key_in_query`. Calls are not streamed.

## Reference

- Full request/response schemas, status codes, streaming, and MCP:
  [references/endpoints.md](references/endpoints.md)
- Official NeuroAPI documentation: <https://neuroapi.neurobro.ai/docs>
