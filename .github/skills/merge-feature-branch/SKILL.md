---
name: merge-feature-branch
description: Best-practice process for merging a feature branch into main, including pre-merge checks, conflict resolution, and post-merge cleanup.
---

# Merging a Feature Branch into Main

Follow these steps in order every time a feature branch is ready to merge. Complete all steps without stopping.

## Step 1: Confirm the branch is ready

- Verify the working tree is clean: `git status`
- Confirm you are on the feature branch (not main): `git branch`
- Review all commits that will be merged: `git log main..HEAD --oneline`
- Check the diff for anything unexpected: `git diff main...HEAD --stat`

## Step 2: Pull the latest main

Ensure main is up to date with the remote before doing anything else:

```bash
git fetch origin
git log HEAD..origin/main --oneline
```

If `origin/main` has commits that are not on the feature branch, rebase the branch onto the latest main:

```bash
git rebase origin/main
```

Resolve any conflicts that arise during the rebase. After resolving, run:

```bash
git rebase --continue
```

If the rebase becomes unrecoverable, abort and reassess:

```bash
git rebase --abort
```

## Step 3: Run build and type checks

From the repo root, validate that the codebase compiles cleanly:

```bash
cd apps/web && npx tsc --noEmit
```

Fix any TypeScript errors before proceeding. Do not merge a branch with known compile errors.

## Step 4: Review the commits one final time

```bash
git log main..HEAD --oneline
```

Confirm:
- Commit messages are clear and meaningful
- No debug code, console.logs, or temporary files are included
- No secrets or credentials have been committed

Check for accidentally committed sensitive files:

```bash
git diff main...HEAD -- '*.env' '*.env.*' '*.key' '*.pem'
```

## Step 5: Merge into main

Switch to main, merge, and push:

```bash
git checkout main
git merge <branch-name>
git push origin main
```

If the branch has diverged from main and a fast-forward is not possible, use `--no-ff` to preserve the merge history:

```bash
git merge --no-ff <branch-name> -m "Merge branch '<branch-name>' into main"
```

## Step 6: Verify the push

Confirm the remote is updated:

```bash
git log origin/main --oneline -5
```

## Step 7: Post-merge cleanup

Delete the feature branch locally and remotely after a successful merge:

```bash
git branch -d <branch-name>
git push origin --delete <branch-name>
```

If the branch is not fully merged and deletion is blocked, verify you are on main and the merge is confirmed before forcing:

```bash
git branch -D <branch-name>
```

## Notes

- Never force-push to `main`.
- If the branch was opened as a pull request, prefer merging through the PR so that history and review comments are preserved.
- After merging, remind the user to sign out and back in if `npm run db:reset` was part of the changes (stale JWT may reference a deleted household).
