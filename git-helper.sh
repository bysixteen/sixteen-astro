#!/bin/bash

# Git Helper Script for Sixteen Astro Project
# Usage: ./git-helper.sh [command]

case "$1" in
    "start-work")
        echo "🚀 Starting work..."
        git checkout develop
        git pull origin develop
        echo "✅ Ready to create feature branch"
        ;;
    "new-feature")
        if [ -z "$2" ]; then
            echo "❌ Please provide feature name: ./git-helper.sh new-feature feature-name"
            exit 1
        fi
        echo "🆕 Creating feature branch: feature/$2"
        git checkout develop
        git pull origin develop
        git checkout -b "feature/$2"
        echo "✅ Feature branch created: feature/$2"
        ;;
    "save")
        echo "💾 Saving changes..."
        git add .
        git commit -m "$2"
        echo "✅ Changes saved"
        ;;
    "push")
        echo "📤 Pushing changes..."
        git push origin $(git branch --show-current)
        echo "✅ Changes pushed"
        ;;
    "merge")
        echo "🔀 Merging feature branch..."
        current_branch=$(git branch --show-current)
        if [[ $current_branch == feature/* ]]; then
            git checkout develop
            git pull origin develop
            git merge $current_branch
            git push origin develop
            echo "✅ Feature merged to develop"
        else
            echo "❌ Not on a feature branch"
        fi
        ;;
    "undo")
        echo "↩️ Undoing last commit (keeping changes)..."
        git reset --soft HEAD~1
        echo "✅ Last commit undone"
        ;;
    "rollback")
        echo "🔄 Rolling back to previous commit..."
        git reset --hard HEAD~1
        echo "✅ Rolled back"
        ;;
    "status")
        echo "📊 Git Status:"
        git status
        ;;
    "history")
        echo "📜 Recent commits:"
        git log --oneline -10
        ;;
    "backup")
        echo "💾 Creating backup..."
        git push --all origin
        echo "✅ All branches backed up"
        ;;
    *)
        echo "Git Helper Script"
        echo ""
        echo "Commands:"
        echo "  start-work              - Switch to develop and pull latest"
        echo "  new-feature <name>      - Create new feature branch"
        echo "  save <message>          - Add and commit changes"
        echo "  push                    - Push current branch"
        echo "  merge                   - Merge feature branch to develop"
        echo "  undo                    - Undo last commit (keep changes)"
        echo "  rollback                - Rollback to previous commit"
        echo "  status                  - Show git status"
        echo "  history                 - Show recent commits"
        echo "  backup                  - Push all branches to remote"
        echo ""
        echo "Examples:"
        echo "  ./git-helper.sh new-feature gallery-updates"
        echo "  ./git-helper.sh save 'feat: add new gallery component'"
        echo "  ./git-helper.sh merge"
        ;;
esac 