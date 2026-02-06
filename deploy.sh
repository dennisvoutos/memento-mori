#!/usr/bin/env bash
# deploy.sh — build & deploy to GitHub Pages manually
set -e

echo "Building production bundle..."
npm run build

echo "Deploying dist/ to gh-pages branch..."
npx gh-pages -d dist

echo ""
echo "Done! Site will be live at:"
echo "  https://dennisvoutos.github.io/memento-mori/"
