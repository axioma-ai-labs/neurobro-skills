#!/usr/bin/env node
/**
 * Validates every skill in skills/.
 *
 * Checks, for each skills/<dir>/SKILL.md:
 *   - the file exists
 *   - it has a YAML frontmatter block
 *   - frontmatter has non-empty `name` and `description`
 *   - `name` equals the directory name
 *   - `name` is prefixed `neurobro-` (skills.sh discoverability)
 *
 * Exits non-zero on any failure. No dependencies.
 */
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const SKILLS_DIR = "skills";
const errors = [];

function frontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const fields = {};
  for (const line of match[1].split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (m) fields[m[1]] = m[2].trim();
  }
  return fields;
}

if (!existsSync(SKILLS_DIR)) {
  console.error(`No ${SKILLS_DIR}/ directory found.`);
  process.exit(1);
}

const dirs = readdirSync(SKILLS_DIR).filter((d) =>
  statSync(join(SKILLS_DIR, d)).isDirectory(),
);

if (dirs.length === 0) errors.push(`${SKILLS_DIR}/ has no skill directories.`);

for (const dir of dirs) {
  const skillPath = join(SKILLS_DIR, dir, "SKILL.md");
  if (!existsSync(skillPath)) {
    errors.push(`${dir}: missing SKILL.md`);
    continue;
  }
  const fm = frontmatter(readFileSync(skillPath, "utf8"));
  if (!fm) {
    errors.push(`${dir}: SKILL.md has no YAML frontmatter`);
    continue;
  }
  if (!fm.name) errors.push(`${dir}: frontmatter missing \`name\``);
  if (!fm.description) errors.push(`${dir}: frontmatter missing \`description\``);
  if (fm.name && fm.name !== dir)
    errors.push(`${dir}: \`name\` is "${fm.name}", expected "${dir}"`);
  if (fm.name && !fm.name.startsWith("neurobro-"))
    errors.push(`${dir}: \`name\` must be prefixed "neurobro-"`);
}

if (errors.length) {
  console.error("Skill validation failed:");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(`OK - ${dirs.length} skill(s) validated.`);
