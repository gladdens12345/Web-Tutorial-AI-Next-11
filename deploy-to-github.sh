#!/bin/bash

# Deployment script for Web Tutorial AI Next.js website
# This script pushes the local repository to GitHub

echo "🚀 Deploying Web Tutorial AI to GitHub..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: This script must be run from the webtutorialai-auth directory"
    exit 1
fi

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "📦 Initializing git repository..."
    git init
    git branch -m main
fi

echo "📝 Adding files to git..."
git add .

echo "💾 Committing changes..."
git commit -m "Deploy: AI Web Assistant authentication website

- Complete Next.js app with Firebase auth and Stripe payments
- Ready for Vercel deployment
- Configured for webtutorialai.com domain"

echo "🔗 Setting up GitHub remote..."
# Replace YOUR_GITHUB_USERNAME and YOUR_REPO_NAME with actual values
GITHUB_USERNAME="gladdens12345"
REPO_NAME="Web-Tutorial-Ai-Next"

git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/${GITHUB_USERNAME}/${REPO_NAME}.git

echo "⬆️ Pushing to GitHub..."
git push -u origin main

echo "✅ Successfully deployed to GitHub!"
echo "🌐 Next steps:"
echo "1. Go to https://vercel.com/dashboard"
echo "2. Import your GitHub repository: ${GITHUB_USERNAME}/${REPO_NAME}"
echo "3. Configure environment variables in Vercel"
echo "4. Deploy to webtutorialai.com"