# NeuroAPI endpoint reference

Base URL: `https://api.neurobro.ai/api/v1`

All endpoints require the `X-API-Key` header. Keys look like `neuro_<random>`;
the leading `neuro_<8 chars>` is the public prefix surfaced in logs and
dashboards. There is no OAuth or `Authorization: Bearer` flow.

---

## `GET /health`

Free, non-billable. Confirms auth and connectivity. Use it as a smoke test in
deploy pipelines and before running billable work.

Request:

```bash
curl -s https://api.neurobro.ai/api/v1/health -H "X-API-Key: $NEUROAPI_API_KEY"
```

Response `200`:

```json
{
  "status": "healthy",
  "service": "neuroapi",
  "version": "0.1.0",
  "authenticated": true,
  "key_prefix": "neuro_a1b2c3d4",
  "timestamp": "2026-05-08T12:34:56.789Z"
}
```

---

## `POST /agent/ask`

Runs the NeuroAPI financial research agent. Billable.

### Headers

| Header | Required | Notes |
| --- | --- | --- |
| `X-API-Key` | yes | `neuro_...` secret. |
| `Content-Type` | yes | `application/json`. |
| `Idempotency-Key` | no | 1-255 printable ASCII chars. Safe-retries the call; reusing it with a different body returns `422`. |

### Request body - `AgentAskRequest`

| Field | Type | Default | Constraints |
| --- | --- | --- | --- |
| `prompt` | string | - (required) | 1-32,000 chars. |
| `mode` | `"fast"` \| `"smart"` \| `"max"` | `"smart"` | `max` requires Pro+. |
| `stream` | boolean | `false` | When `true`, an SSE response. |
| `message_history` | array of `ChatMessage` | `null` | Max 50 messages. |

`ChatMessage`:

| Field | Type | Constraints |
| --- | --- | --- |
| `role` | string | `"user"` or `"assistant"`. |
| `content` | string | Max 32,000 chars. |

Mode names are opaque tier labels - the underlying model is not revealed and
may change without notice on the same label.

### Cost per mode

| Mode | `cost_units` debited | Plans |
| --- | --- | --- |
| `fast` | 1 | all |
| `smart` | 2 | all |
| `max` | 8 | Pro, Enterprise |

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

`UsageBlock` fields: `prompt_tokens`, `completion_tokens`, `cached_tokens`
(subset of `prompt_tokens` served from the provider cache), and `cost_units`
(the only field that maps to billing).

### Streaming response (`stream=true`)

`Content-Type: text/event-stream`. Each event is one `TaskResponseMessage`
JSON object on a `data:` line. Success terminates with `data: [DONE]\n\n`.
On error, a `data: {"type":"error",...}` event is emitted and the stream
closes with no `[DONE]` - the terminator is the only success signal.

### Status codes

| Code | Meaning | Retry |
| --- | --- | --- |
| `200` | Success | - |
| `400` | Malformed body or invalid `Idempotency-Key` | No |
| `401` | Missing/invalid `X-API-Key` | No |
| `402` | No active subscription, or quota exhausted | No - fix billing |
| `403` | `mode` not on plan (`code: mode_not_in_plan`) | No - lower the mode |
| `409` | Same `Idempotency-Key` still in flight | Yes, after a wait |
| `422` | Request body validation error | No - fix the body |
| `429` | Rate limit exceeded | Yes, after `Retry-After` |
| `500` | Server-side bug | Maybe (idempotent calls only) |
| `503` | Agent capacity saturated | Yes, with backoff |

### Error body

```json
{ "detail": "Human-readable message" }
```

`422` returns a list instead, each entry a `{type, loc, msg}` pointer into the
request body. Every error response carries an `X-Request-Id` header.

### Rate-limit headers

Present on every response:

| Header | Meaning |
| --- | --- |
| `X-RateLimit-Limit` | Allowed requests in the current window. |
| `X-RateLimit-Remaining` | Requests left before reset. |
| `X-RateLimit-Reset` | Unix timestamp of the window reset. |
| `Retry-After` | Seconds until the next allowed call (only on `429`). |

Per-minute budgets: Starter 60, Pro 60, Enterprise 300 (negotiable).
