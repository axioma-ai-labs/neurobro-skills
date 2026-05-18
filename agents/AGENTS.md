# Neurobro Skills - agent context

This repository provides skills for working with **NeuroAPI**, Neurobro's
paid public API for financial market research.

## What NeuroAPI is

- Base URL: `https://api.neurobro.ai/api/v1`
- Auth: `X-API-Key` header. Keys look like `neuro_<random>`. No OAuth, no
  `Authorization: Bearer`.
- Core endpoint: `POST /agent/ask` - runs a financial research agent over a
  natural-language `prompt` and returns an `answer`.
- Free check: `GET /health` - verifies the key, consumes no quota.

## API key

The key is always read from the `NEUROAPI_API_KEY` environment variable.
Never hardcode it, print it, log it, or commit it. Locally, copy
`.env.example` to `.env` (git-ignored) and set the value there.

## Using the skills

Each directory under `skills/` is one skill with a `SKILL.md`. Load the skill
relevant to the task:

- `neurobro-market-research` - financial market research via `/agent/ask`:
  equity and crypto analysis, technical setups, fundamental research, macro
  outlooks, multi-asset investigations.
- `neurobro-meme-hunting` - discover and risk-vet trending and newly launched
  memecoins: scan DEX pools, filter by liquidity and age, audit for honeypots,
  rug-pull risk, and holder concentration.
- `neurobro-trading-setup` - build structured trade setups: entry zones,
  stop-loss, take-profit targets, and risk/reward ratios from technical
  analysis and derivatives positioning.
- `neurobro-catalyst-watch` - build event-driven trade plans: map upcoming
  catalysts (earnings, FOMC and macro prints, token unlocks, launches,
  listings, regulatory decisions), assess what is priced in, and plan
  positioning before and after the event.

Each `SKILL.md` carries the full instructions, including request/response
schemas, mode selection, billing, error handling, and rate limits.
