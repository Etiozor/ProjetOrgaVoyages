#!/usr/bin/env node
// Installe (ou réinstalle) le hook git post-commit qui régénère le vault Obsidian.
// À relancer après un clone : `npm run graph:install-hook`.

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

let hooksDir;
try {
  // Respecte core.hooksPath / worktrees si configuré.
  hooksDir = execSync("git rev-parse --git-path hooks", { cwd: REPO })
    .toString()
    .trim();
  if (!path.isAbsolute(hooksDir)) hooksDir = path.join(REPO, hooksDir);
} catch {
  hooksDir = path.join(REPO, ".git", "hooks");
}

fs.mkdirSync(hooksDir, { recursive: true });
const hookPath = path.join(hooksDir, "post-commit");

const script = `#!/bin/sh
# TRIP'IN — régénère le vault Obsidian après chaque commit (posé par npm run graph:install-hook).
# Le "|| true" garantit qu'une erreur du script ne fait jamais échouer le commit.
ROOT="$(git rev-parse --show-toplevel)"
node "$ROOT/scripts/generate-graph.mjs" || true
`;

fs.writeFileSync(hookPath, script);
fs.chmodSync(hookPath, 0o755);
console.log(`[hook] post-commit installé → ${hookPath}`);
