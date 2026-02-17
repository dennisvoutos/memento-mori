#!/usr/bin/env bash
# deploy.sh — build & deploy to GitHub Pages manually
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Building production bundle..."
VITE_BASE_PATH=/memento-mori/ npm run build

echo "Deploying dist/ to gh-pages branch..."
npx gh-pages -d dist

echo ""
echo "Done! Site will be live at:"
echo "  https://dennisvoutos.github.io/memento-mori/"
