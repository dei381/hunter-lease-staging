---
name: ship-safely
description: The mandatory verify-then-PR-then-merge workflow for the hunter-lease repo. Use whenever you are about to commit, push, open a PR, or merge a change here — or when asked to "ship", "land", "merge", or "verify" work. Encodes the exact checks (tsc/vitest/vite/esbuild), the branch-off-integrate-services rule, CI gates, and the worktree trick to avoid colliding with background tasks.
---

# Ship safely on hunter-lease

Never push to `main`. Never deploy to prod without the founder's explicit approval. All work flows
through `integrate-services`.

## 1. Branch
```
git fetch origin --quiet
git checkout -b <type>/<short-name> origin/integrate-services   # type: feat | fix | chore
```
If a background task (a spawned chip) is editing the same working tree, do your work in an isolated
worktree instead, so you do not collide:
```
git worktree add /tmp/hl-work <branch-or-base>
# ...edit, commit, push from /tmp/hl-work...
git worktree remove /tmp/hl-work
```

## 2. Implement, then VERIFY (all must pass before commit)
```
npx tsc --noEmit                                   # type check (also the lint)
npx vitest run                                     # tests green; note pre-existing failures honestly
npx vite build                                     # frontend bundles
# server.ts / backend change? also:
npx esbuild server.ts --bundle --platform=node --format=esm --packages=external --outfile=/tmp/srv.js
```
A change is NOT done until these pass. If a test was already red on the base branch, prove it (stash
your diff and re-run) and say so in the PR; do not silently ship around it.

## 3. Commit (scoped) + push
Stage only the files you intended. End the commit message with:
```
Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```
```
git push -u origin <branch>
```

## 4. PR into integrate-services, wait for CI, merge
```
gh pr create --base integrate-services --head <branch> --title "..." --body "..."
```
Poll checks until `scan` (gitleaks) and `semgrep` are `pass`:
```
gh pr checks <n>
```
`analyze` (CodeQL) and `review` (Claude) show `skipping` — that is intentional (gated on repo vars
`ENABLE_CODEQL` / `ENABLE_CLAUDE`), not a failure. Then:
```
gh pr merge <n> --merge
```
After several merges, sanity-check the combined branch: checkout the updated `integrate-services` and
re-run tsc + vitest + vite build once.

## Rules of thumb
- One PR = one coherent change; files should not overlap with other open PRs where avoidable.
- Behavior-changing or money/price/auth changes go behind a flag or a settings default that preserves
  current behavior, and are flagged for staging because Stripe/Firebase/credit cannot be tested locally.
- Flag, don't bundle: if you spot an unrelated bug, note it (or spawn a task), do not enlarge the PR.
