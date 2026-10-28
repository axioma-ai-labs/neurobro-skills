# Neurobro Skills - agent context

This repository provides skills for working with **NeuroAPI**, Neurobro's
paid public API for financial market research.

## What NeuroAPI is

- Base URL: `https://api.neurobro.ai/api/v1`
- Auth: REST calls use the `X-API-Key` header. Keys look like `neuro_<random>`.
  No OAuth. `Authorization: Bearer` is not accepted on the REST API. It is
  accepted only by the MCP server at `https://api.neurobro.ai/api/v1/mcp`
  (tool `ask_neuroapi`). Do not put the key in the URL.
- Core endpoint: `POST /agent/ask` - runs a financial research agent over a
  natural-language `prompt` and returns an `answer`. With `output_schema`,
  the object is on `output` and `answer` is null.
- Free check: `GET /health` - verifies the key, consumes no quota. An active
  subscription is still required.

## API key

The key is always read from the `NEUROAPI_API_KEY` environment variable.
Never hardcode it, print it, log it, or commit it. Locally, copy
`.env.example` to `.env` (git-ignored) and set the value there.

## Using the skills

Each directory under `skills/` is one skill with a `SKILL.md`. Load the skill
relevant to the task:

- `neurobro-market-research` - financial market research via `/agent/ask`:
  equities (US, Indonesia, Brazil, Vietnam), crypto, commodities, and macro.
- `neurobro-meme-hunting` - discover and risk-vet trending and newly launched
  memecoins: screen for scam flags, mint and freeze authority, holder
  concentration, and buy/sell pressure, and filter new launches by age and
  liquidity.
- `neurobro-trading-setup` - build structured trade setups for crypto,
  stocks, and commodities: entry zones, stop-loss, take-profit targets, and
  risk/reward ratios.
- `neurobro-catalyst-watch` - build event-driven trade plans: map upcoming
  catalysts (earnings, FOMC and macro prints, token unlocks, launches,
  listings, regulatory decisions), assess what is priced in, and plan
  positioning before and after the event.

Each `SKILL.md` carries the full instructions, including request/response
schemas, mode selection, billing, error handling, and rate limits.
