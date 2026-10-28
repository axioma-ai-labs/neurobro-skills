# NeuroAPI endpoint reference

Base URL: `https://api.neurobro.ai/api/v1`

REST calls authenticate with the `X-API-Key` header. Keys look like
`neuro_<random>`; the leading `neuro_<8 chars>` is the public prefix
surfaced in logs and dashboards. The REST API has no OAuth and no
`Authorization: Bearer` flow. `Authorization: Bearer` is accepted only by
the MCP server (see [MCP](#mcp)).

`version` on `GET /health` is the deployed build, the same value as the
`X-Build` header. The quickstart example is `0.1.13`.

---

## `GET /health`

Free, non-billable. Confirms the key and connectivity. An active
subscription is still required. No plan returns `403`
`no_active_subscription`. A failed payment returns `402`
`payment_required`. Use it as a smoke test before billable work.

Request:

```bash
curl -s https://api.neurobro.ai/api/v1/health -H "X-API-Key: $NEUROAPI_API_KEY"
```

Response `200`:

```json
{
  "status": "healthy",
  "service": "neuroapi",
  "version": "0.1.13",
  "authenticated": true,
  "key_prefix": "neuro_a1b2c3d4",
  "timestamp": "2026-05-08T12:34:56.789Z"
}
```

---

## `POST /agent/ask`

Runs the NeuroAPI financial research agent. A successful call is billable.
`4xx` and `5xx` responses are not.

### Headers

| Header | Required | Notes |
| --- | --- | --- |
| `X-API-Key` | yes | `neuro_...` secret. A missing, invalid, revoked, or expired key (`expires_at` in the past) returns `401`. |
| `Content-Type` | yes | `application/json`. |
| `Idempotency-Key` | no | 1-255 printable ASCII characters. See [Idempotency](#idempotency). |

### Request body - `AgentAskRequest`

| Field | Type | Default | Constraints |
| --- | --- | --- | --- |
| `prompt` | string | - (required) | 1-32,000 characters. |
| `mode` | `"fast"` \| `"smart"` \| `"max"` | `"smart"` | `max` requires Pro+. |
| `stream` | boolean | `false` | When `true`, an SSE response. |
| `message_history` | array of `ChatMessage` | `null` | Max 50 messages. |
| `system_prompt` | string | `null` | Optional. Max 16,000 characters. Steers tone, role, or domain focus. Cannot override persona or safety guardrails. |
| `output_schema` | object | `null` | Optional JSON Schema, object root. See below. |

`ChatMessage`:

| Field | Type | Constraints |
| --- | --- | --- |
| `role` | string | `"user"` or `"assistant"` reach the agent. `"system"`, `"developer"`, `"tool"`, and `"function"` are accepted and ignored. Put instructions in `system_prompt`. Any other role returns `422`. |
| `content` | string | Max 32,000 characters. |

Mode names are opaque tier labels. The underlying model is not part of the
contract and may change without notice on the same label.

#### `output_schema`

When set, the object comes back on `output` and `answer` is `null`.
Exactly one of the two is set. `stream: true` returns `400`
`streaming_unsupported_for_structured_output`. An unusable schema returns
`422` `invalid_output_schema`. Neither is charged.

Schemas are read as JSON Schema 2020-12. These return `422`: `pattern`,
`patternProperties`, dynamic refs, refs that do not point at `$defs`,
nesting deeper than 32 levels, and more than 500 parts. If a value may be
unknown, allow `null` (`{"type": ["number", "null"]}`) so the agent returns
`null` instead of a stand-in such as `0`. Set the client timeout to at
least 120 seconds.

### Cost per mode

| Mode | `cost_units` debited | Plans |
| --- | --- | --- |
| `fast` | 1 | all |
| `smart` | 2 | all |
| `max` | 8 | Pro, Enterprise |

Read `usage.cost_units` on the success response. That field is the debit.

### Sync response - `AgentAskResponse` (`stream=false`)

```json
{
  "answer": "The European Central Bank held rates steady ...",
  "mode": "smart",
  "request_id": "8b3a2f0e-1d7e-4c6b-9b2a-f5e23a1c9d44",
  "usage": {
    "prompt_tokens": 124,
    "completion_tokens": 256,
    "cached_tokens": 80,
    "cost_units": 2
  }
}
```

With `output_schema`, `answer` is `null` and the object is on `output`:

```json
{
  "answer": null,
  "output": {
    "stance": "bullish",
    "conviction": 0.62,
    "support": 58000,
    "resistance": 72000,
    "summary": "Holding above the 50-day average with improving spot demand."
  },
  "mode": "max",
  "request_id": "1c9d44f5-2f0e-4c6b-9b2a-8b3a2f0e1d7e",
  "usage": {
    "prompt_tokens": 210,
    "completion_tokens": 24,
    "cached_tokens": 0,
    "cost_units": 8
  }
}
```

`UsageBlock`: `prompt_tokens`, `completion_tokens`, `cached_tokens` (a
subset of `prompt_tokens` served from the provider cache), and
`cost_units` (the only field that maps to billing). There is no
`total_tokens`.

`request_id` is also returned in `X-Request-Id`. Quote that id when
reporting issues to `api@neurobro.ai`. Do not send the API key.

### Streaming response (`stream=true`)

`Content-Type: text/event-stream`. Each event is one JSON object on a
`data:` line. `type` is `status_update` while the agent works and
`complete` when the answer is finished. Text is at
`data.answer.chunk.content`. Append those pieces in order. `data.answer`
is `null` on events that carry no text. `data.usage` arrives once, near
the end, with the same fields as a sync `usage` block (`cost_units`, no
`total_tokens`). Success ends with `data: [DONE]`. Only `[DONE]` means
the answer is complete.

```text
data: {"type":"status_update","data":{"answer":null,"usage":null}}
data: {"type":"status_update","data":{"answer":{"chunk":{"content":"NVDA is "}},"usage":null}}
data: {"type":"status_update","data":{"answer":{"chunk":{"content":"holding above"}},"usage":null}}
data: {"type":"status_update","data":{"answer":null,"usage":{"prompt_tokens":124,"completion_tokens":256,"cached_tokens":80,"cost_units":2}}}
data: {"type":"complete","data":{"answer":null,"usage":null}}
data: [DONE]
```

On failure the last event is
`data: {"type":"error","message":"agent run failed"}` and there is no
`[DONE]`. Ignore event types and fields you do not recognize.

A non-streaming run longer than 300 seconds returns `504` `agent_timeout`
and is not billed. Stream long research with `stream: true`.

Use `timeout=60` on a sync call, at least 120 seconds with `output_schema`,
and `timeout=None` when streaming.

A stream that fails before the answer is complete is free. If the final
answer was delivered and something fails afterward, the stream ends with
`[DONE]` and counts as a run.

### Idempotency

`POST /agent/ask` is not idempotent by itself: two calls produce two
answers and two charges. Send `Idempotency-Key` (a UUID per logical
operation is the usual choice) to make a retry safe.

- Same key and same body within 24 hours replays the original status,
  body, and `X-Request-Id`, and adds `Idempotent-Replayed: true`. A replay
  is not billed again.
- Same key and a different body returns `422` `idempotency_key_mismatch`.
- The first call still running returns `409` `idempotent_request_in_flight`.
  Retry once it finishes.
- A key older than 24 hours is treated as new and is billed.
- A key that is not 1-255 printable ASCII returns `400`
  `invalid_idempotency_key`. A query string sent with the key returns
  `400` `invalid_query_string`.
- Streaming responses, `5xx` responses, and `402` / `403` / `429`
  responses are never cached. A retry of those runs the request again.

Generate the key once, outside the retry loop, and reuse it.

### Status codes

| Code | Meaning | Retry |
| --- | --- | --- |
| `200` | Success. Debits `usage.cost_units`. | - |
| `400` | Malformed body, bad `Idempotency-Key`, or `output_schema` combined with `stream: true`. | No - fix the request |
| `401` | Missing, invalid, revoked, or expired `X-API-Key`. | No |
| `402` | `payment_required`, or `quota_exceeded` when this `mode` costs more than the quota left. | No (fix billing first) |
| `403` | `no_active_subscription`, or `mode_not_in_plan` (`max` needs Pro+). | No (subscribe, lower the mode, or upgrade) |
| `404` | Endpoint or resource not found. | No |
| `409` | Same `Idempotency-Key` still in flight. | Yes, once it completes |
| `413` | Body larger than 8 MiB. Plain text, not JSON. | No (send a smaller body) |
| `422` | Body validation, idempotency-key mismatch, or unusable `output_schema`. | No |
| `429` | `rate_limited`, `quota_exceeded` (period spent), or `too_many_concurrent_runs` (Starter 2, Pro 5, Enterprise 10 in flight, MCP included, not billed). | Yes. `Retry-After` for a rate limit or concurrent runs. `X-Quota-Reset` for quota. |
| `500` | Server-side bug. | Maybe (idempotent calls) |
| `503` | Agent capacity saturated. Not billed. | Yes, with backoff |
| `504` | `agent_timeout`. Non-streaming run exceeded 300 seconds. Not billed. | Yes, with `stream: true` or a simpler prompt |

Cap retries at 3. Without an `Idempotency-Key`, a second call is a second
charge.

### Error body

`detail` is not always a string. `String(detail)` breaks on a coded error.
Branch on the HTTP status, then on `detail.code` when it is present.

Coded - `400`, `402`, `409`, `429`, and most `403`s:

```json
{
  "detail": {
    "code": "mode_not_in_plan",
    "message": "Mode 'max' is not available on the 'starter' plan. Upgrade to access it."
  }
}
```

`code` is stable. `message` may be reworded. Most `403`s use this shape.
Some are a plain string.

Plain - `401` and `503`:

```json
{ "detail": "Invalid API key" }
```

Validation - a `422` from a malformed body. `detail` is a list:

```json
{
  "detail": [
    { "type": "missing", "loc": ["body", "prompt"], "msg": "Field required" }
  ]
}
```

`413` is not one of these shapes. Its body is plain text.

A reused `Idempotency-Key` with a different body is `422`
`idempotency_key_mismatch` (coded), not the validation list.

Every error response carries `X-Request-Id`.

### Rate-limit headers

Present on every response:

| Header | Meaning |
| --- | --- |
| `X-RateLimit-Limit` | Allowed requests in the current window. |
| `X-RateLimit-Remaining` | Requests left before reset. |
| `X-RateLimit-Reset` | Unix timestamp of the window reset. |
| `Retry-After` | Seconds until the next allowed call. Only on `429`. |

Per-minute budgets: Starter 60, Pro 60, Enterprise 300 (negotiable).

### Quota headers

Present on billable responses (not on `/health`):

| Header | Meaning |
| --- | --- |
| `X-Quota-Limit` | Requests included in the current period. |
| `X-Quota-Remaining` | Requests left before the quota is exhausted. |
| `X-Quota-Reset` | Unix timestamp at which the period rolls over. |

These travel on billable calls only. `/health` reports no quota. Quota is
the period budget. The rate limit is a short sliding window. Either can
reject a call on its own.

---

## MCP

Remote MCP server, Streamable HTTP:

```text
https://api.neurobro.ai/api/v1/mcp
```

One tool, `ask_neuroapi`. It runs the same single-turn research as a
non-streaming `POST /agent/ask`, with the same rate limits, concurrent-run
cap, quota, and `cost_units`. Inputs mirror the REST body: `prompt`
(required), `mode`, `message_history`, `system_prompt`, `output_schema`.
The result has the same fields: `answer` (or `output` when
`output_schema` is set), `mode`, `request_id`, and `usage`. MCP calls are
not streamed; use `POST /agent/ask` with `stream: true` for SSE.

Auth is `X-API-Key: neuro_...`. Clients that only have a bearer-token
field may send `Authorization: Bearer neuro_...`. That bearer form is
valid on MCP only. The REST API does not accept it.

Do not put the key in the URL. A query-string key returns `400`
`api_key_in_query`. Rotate any key that has been sent that way. A browser
`Origin` that is not allow-listed returns `403` `mcp_origin_not_allowed`.
Call MCP from a local tool or a server, not from front-end `fetch()`.
