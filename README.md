# Neurobro Skills

Agent skills for [NeuroAPI](https://api.neurobro.ai) — Axioma AI's paid public
API for financial market research. These skills teach AI coding agents
(Claude Code, Cursor, Codex, Gemini CLI, and others) how to call NeuroAPI
correctly: picking the right intelligence tier, handling billing and rate
limits, and writing prompts that produce useful research.

## Skills

| Skill | What it does |
| --- | --- |
| [`neurobro-market-research`](skills/neurobro-market-research/) | Run financial market research through the NeuroAPI agent — equity and crypto analysis, technical setups, fundamental research, macro outlooks, and multi-asset investigations. |

More skills are added over time; every skill name is prefixed `neurobro-`.

## Install

With the [`skills`](https://www.skills.sh) CLI (any supported agent):

```bash
npx skills add axioma-ai-labs/neurobro-skills
```

Or as a Claude Code plugin:

```bash
/plugin marketplace add https://github.com/axioma-ai-labs/neurobro-skills
/plugin install neurobro-market-research@neurobro-skills
```

## Setup

1. Mint an API key in the NeuroAPI dashboard → **API Keys**. Keys look like
   `neuro_<random>` and are shown once.
2. Make sure the account has an active plan — `/agent/ask` requires one.
3. Provide the key via the `NEUROAPI_API_KEY` environment variable:

   ```bash
   cp .env.example .env        # then edit .env and set NEUROAPI_API_KEY
   export NEUROAPI_API_KEY="neuro_..."
   ```

`.env` is git-ignored — the real key never gets committed. `.env.example` is
the committed template and contains no secret.

## Repo layout

```
.claude-plugin/      Claude Code plugin marketplace manifests
.github/workflows/   CI — validates every SKILL.md on push
agents/              Shared context for non-Claude agents (Codex, Gemini)
scripts/             validate-skills.mjs — frontmatter checker
skills/              One directory per skill, each with a SKILL.md
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to add a new skill.

## License

MIT — see [LICENSE](LICENSE).
