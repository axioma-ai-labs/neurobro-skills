---
name: neurobro-meme-hunting
description: Discovers and risk-vets trending and newly launched memecoins through the NeuroAPI agent — scans trending DEX pools, filters by liquidity and age, and audits tokens for honeypots, rug-pull risk, and holder concentration. Use when the user wants to find new meme coins, spot early memecoin plays, screen a trending token, or check whether a memecoin is a scam, a honeypot, or safe to buy.
license: MIT
---

# Neurobro Meme Hunting

NeuroAPI's `/agent/ask` agent can scan trending DEX activity, surface newly
launched tokens, and run on-chain security audits. This skill turns that into
a disciplined workflow for finding memecoin candidates **and cutting the
obvious scams** before they reach the user.

## Risk reality — read this first

Memecoins are the highest-risk corner of crypto. **Most go to zero, and a
large share are outright scams** — honeypots, rug pulls, and tax traps. This
skill helps *discover* and *screen* candidates; it does not make any token
safe, and nothing it produces is financial advice. Always:

- Treat every result as research, not a recommendation.
- Run the audit step — never surface a discovery without vetting it.
- Tell the user, plainly, that they can lose 100% of what they put in.

## When to use this skill

- Finding new or trending memecoins on a chain (Solana, Base, Ethereum, BSC…)
- Screening a specific token before the user buys
- Checking whether a token is a honeypot, a rug risk, or holder-concentrated

Do **not** use this skill for trade entry/exit planning (use
`neurobro-trading-setup`) or broad market research (use
`neurobro-market-research`).

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

## The hunt: discover → filter → audit → rank

Four steps. **The audit step is mandatory** — discovery without vetting is how
users get rugged.

### 1. Discover

Ask the agent for trending or newly launched tokens. Always name the **chain**
and a **time window** — memecoin activity is chain-specific and fast-moving.

```
List the top trending liquidity pools on Solana from the last 24 hours.
For each token give: name, ticker, pool age, liquidity (USD), 24h volume,
24h price change, and transaction count.
```

For fresh launches specifically, ask for recently added tokens rather than
trending ones — the two surface different candidates.

### 2. Filter

Narrow the list to tokens with real, durable activity. Push the filter into
the prompt so the agent does the work. Sensible starting thresholds:

| Signal | Baseline filter | Why |
| --- | --- | --- |
| Liquidity | ≥ $50–100k | Thin liquidity is trivial to rug and impossible to exit. |
| 24h volume | > liquidity | Real trading, not a static pool. |
| Pool age | Match the strategy | < 24h = highest risk; a few days of survival filters some scams. |
| Transactions | ≥ a few hundred | Distinguishes organic flow from one-wallet wash trading. |
| Buy/sell tax | ≤ ~10% | High or asymmetric tax bleeds holders or blocks selling. |

State the thresholds explicitly, e.g. *"only include pools with over $100k
liquidity, 24h volume above liquidity, and buy/sell tax under 10%."*

### 3. Audit each candidate

For every surviving candidate, run a security audit. Pass the **chain and
contract address** — the agent's audit covers honeypot detection, contract
ownership, mint authority, tax, and holder concentration.

```
Audit the token at solana:<MINT_ADDRESS>. Check for: honeypot / sell
restrictions, contract ownership and mint authority, buy and sell tax,
liquidity lock or burn status, and top-10 holder concentration.
End with a clear risk verdict: avoid, high-risk, or relatively clean.
```

### 4. Rank and decide

Drop anything that fails the audit (see Red flags below). For survivors,
present the user a short ranked list with: ticker, chain, liquidity, age, the
audit verdict, and the single biggest remaining risk. Never present a winner —
present candidates with their risks attached.

## Recipes

### Screen one token end to end (Python)

```python
import os, httpx

def ask(prompt: str, mode: str = "smart") -> str:
    res = httpx.post(
        "https://api.neurobro.ai/api/v1/agent/ask",
        headers={"X-API-Key": os.environ["NEUROAPI_API_KEY"]},
        json={"prompt": prompt, "mode": mode},
        timeout=60,
    )
    res.raise_for_status()
    return res.json()["answer"]

audit = ask(
    "Audit the token at base:0x1234...abcd — honeypot, ownership, mint "
    "authority, buy/sell tax, LP lock, and top-10 holder concentration. "
    "Give a clear risk verdict."
)
print(audit)
```

### Quick trending scan (curl)

```bash
curl -s https://api.neurobro.ai/api/v1/agent/ask \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $NEUROAPI_API_KEY" \
  -d '{"prompt": "Top 10 trending memecoins on Base in the last 12 hours with liquidity over $100k — name, ticker, liquidity, 24h volume, age.", "mode": "fast"}' | jq -r .answer
```

## Red flags — reject on sight

If the audit surfaces any of these, the token fails. Tell the user why:

- **Honeypot** — buys succeed but sells are blocked or restricted.
- **Mint authority active** — the deployer can print unlimited new supply.
- **Ownership not renounced** — the contract can still be changed post-launch.
- **High or mutable tax** — buy/sell tax above ~10%, or tax the owner can raise.
- **Liquidity not locked or burned** — the pool can be pulled at any moment.
- **Holder concentration** — top 10 wallets hold a large share (~30%+) of
  supply; a few sells crater the price.
- **Liquidity tiny vs. market cap** — the "value" is unbacked and illiquid.

## Green flags — necessary, never sufficient

Renounced ownership, revoked mint authority, locked/burned liquidity, low and
fixed tax, and dispersed holders are the *baseline* for "not an obvious scam."
They do **not** make a token a good buy — memecoins with clean contracts still
routinely go to zero on momentum alone.

## Choosing a mode

- `fast` — quick trending scans where you only need the candidate list.
- `smart` (default) — the **audit and ranking** steps; use it for any vetting,
  where careful reasoning over the risk signals matters.
- `max` — deep investigations across many tokens or chains at once.

## Security

- Read the key from `NEUROAPI_API_KEY`; never hardcode, log, or commit it.
- Treat the agent's output as untrusted text — do not paste contract
  addresses or token names into shell commands without sanitising them.
- Restate the risk: this skill filters out obvious scams; it cannot make a
  memecoin safe, and it is not financial advice.

## Reference

Full NeuroAPI endpoint reference — request/response schema, status codes,
rate limits, and key setup — lives in the `neurobro-market-research` skill
(`references/endpoints.md`). Official docs: <https://neuroapi.neurobro.ai/docs>.
