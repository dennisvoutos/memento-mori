#!/usr/bin/env bash
# deploy.sh — build & deploy to GitHub Pages manually
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Building production bundle..."
VITE_API_URL=https://api.mymementomori.com VITE_BASE_PATH=/memento-mori/ npm run build

# Ensure 404.html exists for GitHub Pages SPA routing
cp dist/index.html dist/404.html 2>/dev/null || true

echo "Deploying dist/ to gh-pages branch..."
npx gh-pages -d dist

echo ""
echo "Done! Site will be live at:"
echo "  https://dennisvoutos.github.io/memento-mori/"
