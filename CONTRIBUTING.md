# Contributing

## Adding a new skill

1. Create a directory under `skills/`. **The name must be prefixed
   `neurobro-`** — that prefix is what makes every skill discoverable under a
   "Neurobro" search on [skills.sh](https://www.skills.sh).

   ```
   skills/neurobro-<topic>/
   ├── SKILL.md
   └── references/        # optional deep-dive docs
   ```

2. Write `SKILL.md` with YAML frontmatter. Only `name` and `description` are
   required; `name` **must equal the directory name**.

   ```markdown
   ---
   name: neurobro-<topic>
   description: What the skill does and when to use it. Pack in the
     keywords a user would phrase a request with.
   ---

   # Title

   Agent-facing instructions...
   ```

3. Keep `SKILL.md` focused. Move long schemas, tables, and examples into
   `references/*.md` and link to them.

4. Register the skill in [`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json)
   as a new entry in the `plugins` array.

5. Add a row to the skills table in [`README.md`](README.md).

6. Validate before committing:

   ```bash
   node scripts/validate-skills.mjs
   ```

   CI runs the same check on every push.

## Conventions

- Never put a real API key in any tracked file. Skills read the key from the
  `NEUROAPI_API_KEY` environment variable.
- Write instructions for an agent, not a human reader — be concrete and
  imperative.
- Document failure modes (error codes, rate limits) — agents need them to
  recover.
