---
name: merge-feature-branch
description: Simple process for merging a feature branch into main.
---

# Merging a Feature Branch into Main

## Step 1: Make sure main is up to date

```bash
git fetch origin
git checkout main
git pull origin main
```

## Step 2: Merge the feature branch

```bash
git merge <branch-name>
git push origin main
```

## Step 3: Clean up the feature branch

```bash
git branch -d <branch-name>
git push origin --delete <branch-name>
```
