# Git Workflow Guide

## Branch Strategy

### Main Branches
- **`main`** - Production-ready code, always stable
- **`develop`** - Integration branch for features, staging environment

### Feature Branches
- **`feature/feature-name`** - For new features
- **`bugfix/bug-description`** - For bug fixes
- **`hotfix/urgent-fix`** - For critical production fixes

## Daily Workflow

### 1. Starting Work
```bash
# Always start from develop branch
git checkout develop
git pull origin develop

# Create a new feature branch
git checkout -b feature/your-feature-name
```

### 2. Making Changes
```bash
# Make your changes, then stage them
git add .

# Commit with descriptive messages
git commit -m "feat: add new gallery component"
git commit -m "fix: resolve build dependency issues"
git commit -m "docs: update README with new instructions"
```

### 3. Pushing Changes
```bash
# Push your feature branch
git push origin feature/your-feature-name
```

### 4. Merging Back
```bash
# Switch to develop
git checkout develop
git pull origin develop

# Merge your feature branch
git merge feature/your-feature-name

# Push to develop
git push origin develop

# Delete the feature branch (optional)
git branch -d feature/your-feature-name
```

## Commit Message Convention

Use conventional commits format:
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

## Rollback Strategies

### 1. Undo Last Commit (Keep Changes)
```bash
git reset --soft HEAD~1
```

### 2. Undo Last Commit (Discard Changes)
```bash
git reset --hard HEAD~1
```

### 3. Revert a Specific Commit
```bash
git revert <commit-hash>
```

### 4. Rollback to Previous State
```bash
# See commit history
git log --oneline

# Rollback to specific commit
git reset --hard <commit-hash>
```

## Emergency Procedures

### Critical Bug in Production
```bash
# Create hotfix from main
git checkout main
git checkout -b hotfix/critical-bug-fix

# Make the fix
# ... make changes ...

# Commit and push
git add .
git commit -m "hotfix: fix critical production bug"
git push origin hotfix/critical-bug-fix

# Merge to both main and develop
git checkout main
git merge hotfix/critical-bug-fix
git push origin main

git checkout develop
git merge hotfix/critical-bug-fix
git push origin develop
```

## Useful Commands

### Check Status
```bash
git status
git log --oneline -10  # Last 10 commits
git branch -a          # All branches
```

### Stash Changes (Temporary Save)
```bash
git stash              # Save changes temporarily
git stash pop          # Restore changes
git stash list         # See all stashes
```

### Compare Changes
```bash
git diff               # See unstaged changes
git diff --staged      # See staged changes
git diff HEAD~1        # Compare with previous commit
```

## Best Practices

1. **Always pull before starting work**
2. **Use descriptive commit messages**
3. **Keep commits small and focused**
4. **Test before merging to develop**
5. **Never commit directly to main**
6. **Use feature branches for all changes**
7. **Delete merged feature branches**

## Backup Strategy

### Remote Repository
Set up a remote repository (GitHub, GitLab, etc.):
```bash
git remote add origin <your-repo-url>
git push -u origin main
git push -u origin develop
```

### Regular Backups
```bash
# Push all branches to remote
git push --all origin
```

## Troubleshooting

### Lost Changes
```bash
# Find lost commits
git reflog

# Recover lost commit
git checkout <commit-hash>
```

### Merge Conflicts
```bash
# Resolve conflicts in your editor
# Then add and commit
git add .
git commit -m "resolve merge conflicts"
```

### Reset Everything
```bash
# Reset to remote state
git fetch origin
git reset --hard origin/main
``` 