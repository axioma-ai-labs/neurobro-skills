---
name: neurobro-trading-setup
description: Builds structured trade setups through the NeuroAPI agent — entry zones, stop-loss levels, take-profit targets, and risk/reward ratios grounded in technical analysis and derivatives positioning. Use when the user wants a trade plan, entry and exit levels, a stop-loss or take-profit, position sizing guidance, or a risk/reward assessment for a crypto or stock asset.
license: MIT
---

# Neurobro Trading Setup

NeuroAPI's `/agent/ask` agent can read technical analysis (RSI, MACD,
Bollinger Bands, support/resistance) and crypto derivatives positioning
(funding, open interest, long/short ratio), and assemble them into a
structured trade setup. This skill turns that into a repeatable workflow that
produces a complete, validated trade plan — not a vague opinion.

## Not financial advice — read this first

A trade setup is a **hypothesis with a defined invalidation point**, not a
prediction and not a recommendation. Markets are uncertain; any setup can
fail. Whenever you surface a setup:

- State plainly that it is not financial advice.
- Make sure every setup has a real stop-loss and an invalidation level.
- Remind the user to size positions to a risk they can afford to lose.

## When to use this skill

- The user wants entry, stop-loss, and take-profit levels for an asset
- The user wants a risk/reward assessment or position sizing guidance
- The user wants a structured trade plan rather than open-ended commentary

Do **not** use this skill for discovering tokens (use `neurobro-meme-hunting`)
or broad market research (use `neurobro-market-research`).

## Calling NeuroAPI

Every request goes to one endpoint:

`POST https://api.neurobro.ai/api/v1/agent/ask`

Authenticate with the `X-API-Key` header, reading the key from the
`NEUROAPI_API_KEY` environment variable — never hardcode it. The body takes a
`prompt` and a `mode` (`fast` | `smart` | `max`, default `smart`).

```bash
curl -s https://api.neurobro.ai/api/v1/agent/ask \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $NEUROAPI_API_KEY" \
  -d '{"prompt": "<your prompt>", "mode": "smart"}' | jq -r .answer
```

For the full request/response schema, status codes, rate limits, and key
setup, see the `neurobro-market-research` skill and its
`references/endpoints.md`.

## The workflow: context → setup → validate

### 1. Gather context

Before asking for levels, have the agent read the market. Always specify the
**asset** and a **timeframe** — a setup is meaningless without one.

```
Give me the current technical picture for $SOL on the 4-hour timeframe:
RSI, MACD, key support and resistance levels, and trend direction. For
the derivatives side, include perpetual funding rate and open-interest trend.
```

Timeframe drives everything: an intraday scalp and a multi-week swing on the
same asset produce entirely different setups.

### 2. Ask for the structured setup

Request every field explicitly so the response is complete and parseable.
State the directional bias if the user has one; otherwise let the agent
derive it from the context.

```
Build a trade setup for $SOL on the 4-hour timeframe. Include:
- directional bias (long or short) and the reasoning in one line
- entry zone (a price range, not a single tick)
- stop-loss, and the structural level that invalidates the idea
- two take-profit targets (TP1, TP2)
- risk/reward ratio to each target
- the timeframe / expected horizon
Ground it in current technicals and perp funding/open interest.
```

### 3. Validate the setup

Never pass a setup through unchecked. Confirm:

- **Risk/reward** — generally aim for **≥ 2:1** to the first meaningful
  target. A setup with R:R below ~1.5:1 rarely justifies the trade.
- **Stop placement** — the stop must sit *beyond a structural level* (below
  support for a long, above resistance for a short), not at an arbitrary
  percentage. If the stop is arbitrary, ask the agent to re-anchor it.
- **Invalidation** — there must be a clear price at which the thesis is wrong.
  No invalidation level means no setup.
- **Position size** — risk per trade ÷ entry-to-stop distance. See below.

If any check fails, send the setup back to the agent with the specific
problem rather than accepting it.

## The setup output shape

A complete trade setup contains:

| Field | What it is |
| --- | --- |
| Direction | Long or short, with a one-line rationale. |
| Entry zone | A price *range* to scale into, not a single price. |
| Stop-loss | The exit if wrong — placed beyond a structural level. |
| Invalidation | The price/level that proves the thesis wrong. |
| Take-profit | TP1, TP2 (optionally TP3) — where to take partial profit. |
| Risk/reward | R:R to each target, computed from entry, stop, and TP. |
| Timeframe | The horizon the setup is valid for. |
| Caveats | What would change the picture (e.g. a macro print, funding flip). |

## Position sizing

Sizing is risk management, not a price call. The standard rule:

```
position size = (account risk per trade) / (entry-to-stop distance)
```

Example: risking 1% of a $10,000 account ($100) on a trade with a 5%
entry-to-stop distance → position size ≈ $100 / 0.05 = $2,000. Keep risk per
trade small and fixed; the stop distance, not conviction, sets the size.

## Recipes

### Full setup in one call (Python)

```python
import os, httpx

def ask(prompt: str, mode: str = "smart") -> str:
    res = httpx.post(
        "https://api.neurobro.ai/api/v1/agent/ask",
        headers={"X-API-Key": os.environ["NEUROAPI_API_KEY"]},
        json={"prompt": prompt, "mode": mode},
        timeout=90,
    )
    res.raise_for_status()
    return res.json()["answer"]

setup = ask(
    "Build a trade setup for $ETH on the daily timeframe: directional bias, "
    "entry zone, stop-loss with its invalidation level, two take-profit "
    "targets, and risk/reward to each. Base it on current technicals and "
    "perp funding/open interest."
)
print(setup)
```

### Quick level check (curl)

```bash
curl -s https://api.neurobro.ai/api/v1/agent/ask \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $NEUROAPI_API_KEY" \
  -d '{"prompt": "For AAPL on the daily timeframe, give an entry zone, stop-loss with invalidation, two take-profit targets, and the risk/reward ratio.", "mode": "smart"}' | jq -r .answer
```

## Choosing a mode

- `smart` (default) — the right choice for most setups; it reasons over
  technicals and derivatives positioning together.
- `max` — multi-asset setups, conflicting signals, or higher-stakes plans
  where the deepest reasoning is worth the extra cost.
- `fast` — only for a quick level check where you do not need full context.

## Risk notes

- A setup is a hypothesis. Always trade with the stop; never widen a stop to
  avoid being stopped out.
- Elevated funding or stretched open interest means a crowded trade — size
  down, expect sharper reversals.
- Markets gap and slip; the stop is a plan, not a guarantee of fill price.
- Restate it to the user: this is structured research, not financial advice.

## Reference

Full NeuroAPI endpoint reference — request/response schema, status codes,
rate limits, and key setup — lives in the `neurobro-market-research` skill
(`references/endpoints.md`). Official docs: <https://neuroapi.neurobro.ai/docs>.
