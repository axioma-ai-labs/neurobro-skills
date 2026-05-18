<p align="center">
  <img src="assets/neurobro-skills.png" alt="Neurobro Skills: Agent skills for the NeuroAPI financial market research API" width="100%">
</p>

<h1 align="center">Neurobro Skills</h1>

<p align="center">
  <a href="https://neuroapi.neurobro.ai"><img src="https://img.shields.io/badge/NeuroAPI-financial%20research-1f6feb" alt="NeuroAPI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="License: MIT"></a>
</p>

Agent skills for **[NeuroAPI](https://neuroapi.neurobro.ai)** - Neurobro's
paid public API for financial market research. These skills teach AI coding
agents (Claude Code, Cursor, Codex, Gemini CLI, and others) how to call
NeuroAPI correctly: choosing the right intelligence tier, handling billing
and rate limits, and writing prompts that produce useful research.

[Create an API key](https://neuroapi.neurobro.ai) or [read the docs](https://neuroapi.neurobro.ai/docs).

## Skills

| Skill | What it does |
| --- | --- |
| [`neurobro-market-research`](skills/neurobro-market-research/) | Financial market research via the NeuroAPI agent - equity and crypto analysis, technical setups, fundamental research, macro outlooks, and multi-asset investigations. |
| [`neurobro-meme-hunting`](skills/neurobro-meme-hunting/) | Discover and risk-vet trending and newly launched memecoins - scan trending DEX pools, filter by liquidity and age, audit for honeypots, rug-pull risk, and holder concentration. |
| [`neurobro-trading-setup`](skills/neurobro-trading-setup/) | Build structured trade setups - entry zones, stop-loss, take-profit targets, and risk/reward ratios grounded in technical analysis and derivatives positioning. |
| [`neurobro-catalyst-watch`](skills/neurobro-catalyst-watch/) | Build event-driven trade plans - map upcoming catalysts (earnings, FOMC and macro prints, token unlocks, launches, listings, regulatory decisions), assess what is priced in, and plan positioning around the event. |

Every skill name is prefixed `neurobro-`; more are added over time.

## Install

With the [`skills`](https://www.skills.sh) CLI (works with any supported agent):

```bash
npx skills add axioma-ai-labs/neurobro-skills
```

Or as a Claude Code plugin:

```bash
/plugin marketplace add https://github.com/axioma-ai-labs/neurobro-skills
/plugin install neurobro-market-research@neurobro-skills
```

## Setup

1. [Create an API key](https://neuroapi.neurobro.ai) in the NeuroAPI dashboard
   under **API Keys**. Keys look like `neuro_<random>` and are shown only once.
2. Make sure the account has an active plan - `/agent/ask` requires one.
3. Provide the key via the `NEUROAPI_API_KEY` environment variable:

   ```bash
   cp .env.example .env        # then edit .env and set NEUROAPI_API_KEY
   export NEUROAPI_API_KEY="neuro_..."
   ```

`.env` is git-ignored, so the real key is never committed. `.env.example` is
the committed template and holds no secret.

## Repo layout

```
.claude-plugin/      Claude Code plugin marketplace manifests
.github/workflows/   CI - validates every SKILL.md on push
agents/              Shared context for non-Claude agents (Codex, Gemini)
scripts/             validate-skills.mjs - frontmatter checker
skills/              One directory per skill, each with a SKILL.md
```

## Contributing

New skills welcome - see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT - see [LICENSE](LICENSE).
