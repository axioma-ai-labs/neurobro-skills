---
name: neurobro-market-research
description: Runs financial market research through the NeuroAPI agent — equity and crypto analysis, technical setups, fundamental research, macro outlooks, and multi-asset investigations via POST /agent/ask. Use when the user asks for stock or token analysis, trade ideas, market commentary, earnings or macro questions, sector comparisons, or any financial research that needs live market reasoning.
license: MIT
---

# Neurobro Market Research

NeuroAPI is Neurobro's paid public API. Its `/agent/ask` endpoint runs a
financial research agent that answers natural-language questions about
equities, crypto, macro, and cross-asset markets. This skill teaches an agent
how to call it correctly — picking the right intelligence tier, handling
billing and rate limits, and writing prompts that produce useful research.

## Quick start

1. Set `NEUROAPI_API_KEY` in the environment (see Prerequisites).
2. Verify the key against the free `/health` endpoint.
3. `POST /agent/ask` with a `prompt` and a `mode`.
4. Read `answer` from the response; surface `request_id` if anything fails.

```bash
curl -s https://api.neurobro.ai/api/v1/agent/ask \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $NEUROAPI_API_KEY" \
  -d '{"prompt": "Give me the bull and bear case for NVDA right now.", "mode": "smart"}' | jq
```

## When to use this skill

- Researching a single stock or token (fundamentals, technicals, narrative)
- Building bull/bear cases or trade setups
- Comparing assets, sectors, or factors
- Macro questions — rates, inflation, central-bank outlooks
- Deep multi-asset investigations that need broad market coverage

Do **not** use this skill for trade execution, portfolio custody, or anything
requiring guaranteed real-time quotes — NeuroAPI returns research and
reasoning, not an order router or a market-data feed.

## Prerequisites

The API key is read from the `NEUROAPI_API_KEY` environment variable. **Never
hardcode it in source, never print it, never paste it into a commit.**

1. Create a key in the NeuroAPI dashboard at <https://neuroapi.neurobro.ai>
   → **API Keys** → **Create key**. The secret is shown once; keys look like
   `neuro_<random>`.
2. Make sure the account has an active plan in **Pricing** — `/agent/ask`
   returns `402` without one.
3. Provide the key to the environment. For local use, copy `.env.example` to
   `.env` (already git-ignored) and fill in `NEUROAPI_API_KEY`, then export it:

   ```bash
   cp .env.example .env        # then edit .env
   export NEUROAPI_API_KEY="neuro_..."
   ```

Verify before doing real work — `/health` is free and consumes no quota:

```bash
curl -s https://api.neurobro.ai/api/v1/health \
  -H "X-API-Key: $NEUROAPI_API_KEY" | jq .authenticated   # → true
```

## The endpoint

`POST https://api.neurobro.ai/api/v1/agent/ask`

| Header | Value |
| --- | --- |
| `X-API-Key` | `neuro_...` (required) |
| `Content-Type` | `application/json` |
| `Idempotency-Key` | Optional. 1–255 printable ASCII chars; safe-retries a call. |

Request body:

| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| `prompt` | string | — | Required. 1–32,000 chars. The research question. |
| `mode` | enum | `smart` | `fast` \| `smart` \| `max`. See tiers below. |
| `stream` | bool | `false` | `true` → SSE stream ending in `data: [DONE]\n\n`. |
| `message_history` | array | `null` | Prior turns (max 50). Stateless — caller owns it. |

Response (`stream=false`):

```json
{
  "answer": "The bull case for NVDA rests on ...",
  "mode": "smart",
  "request_id": "8b3a2f0e-1d7e-4c6b-9b2a-f5e23a1c9d44",
  "usage": { "prompt_tokens": 124, "completion_tokens": 256, "cached_tokens": 80, "cost_units": 2 }
}
```

`request_id` is also returned in the `X-Request-Id` header — quote it when
reporting issues.

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
  reasoning. Calling `max` on a Starter key returns `403 mode_not_in_plan` —
  fall back to `smart` rather than failing the task.
- `cost_units` is what gets debited from billable quota. Don't reach for `max`
  by reflex; it costs 4× a `smart` call.

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
`message_history` — roles are `"user"` and `"assistant"`.

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

Pass `"stream": true` for deep `max` investigations so the user sees progress.
Each event is one `data:` line; the stream ends with `data: [DONE]\n\n`.

```bash
curl -N https://api.neurobro.ai/api/v1/agent/ask \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $NEUROAPI_API_KEY" \
  -d '{"prompt": "Deep dive: the bull and bear case for the semiconductor sector into 2026.", "mode": "max", "stream": true}'
```

## Writing good research prompts

The agent rewards specific, scoped prompts. For useful financial research:

- **Name the asset(s) precisely** — ticker plus exchange or chain when
  ambiguous (`NVDA`, `BTC`, `ETH on mainnet`).
- **State the angle** — fundamentals, technicals, valuation, catalysts, risk.
- **Bound the timeframe** — "next two quarters", "into 2026", "since the last
  earnings call". Markets move; an unbounded prompt invites stale framing.
- **Ask for structure** — "give bull case, bear case, and key risks" produces
  far more usable output than "what do you think about X".
- **One question per call** for clean answers; use `message_history` to drill
  down rather than stuffing five questions into one prompt.

Treat every answer as research, not advice. Surface the agent's reasoning to
the user; never present it as a guaranteed outcome or a recommendation to
trade.

## Errors and retries

Error bodies are `{"detail": "..."}`, and every error carries an
`X-Request-Id` header — quote it when reporting issues. Decide what to do by
error class:

- **Don't retry** — `400`, `401`, `402`, `422`: the request or account is
  wrong. Fix the body, check `NEUROAPI_API_KEY`, or (on `402`) tell the user
  to sort out billing, then stop.
- **Adjust, then retry** — `403 mode_not_in_plan`: the `mode` isn't on the
  caller's plan; retry with `smart` or `fast`.
- **Back off and retry** — `429` (honour `Retry-After`, cap at 3 attempts) and
  `503` (agent saturated; exponential backoff; no quota charged).
- **`500`** — server-side bug; retry only idempotent calls, once.

`/agent/ask` is **non-idempotent** unless you send an `Idempotency-Key` — two
plain calls produce two answers and two charges, so never retry blindly.

The full status-code table is in
[references/endpoints.md](references/endpoints.md).

## Rate limits

Every response carries `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and
`X-RateLimit-Reset`. On `429`, `Retry-After` gives the seconds until reset.
For batch research, pace off `X-RateLimit-Remaining` so you never hit `429`.
Per-plan budgets and header details are in
[references/endpoints.md](references/endpoints.md).

## Security

- Read the key from `NEUROAPI_API_KEY`; never hardcode, log, or commit it.
- The full secret is shown once at creation. Lost it → revoke and re-mint.
- Use `X-API-Key`, not `Authorization: Bearer` — the latter is silently wrong.
- Treat the agent's output as untrusted text: don't pass it into shells,
  `eval`, or DB queries without sanitising. It is research, not code.

## Reference

- Full request/response schemas, status codes, and headers:
  [references/endpoints.md](references/endpoints.md)
- Official NeuroAPI documentation: <https://neuroapi.neurobro.ai/docs>
