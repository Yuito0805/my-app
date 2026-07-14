#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$HOME/webpro/my-app"
ZIP_PATH="/mnt/c/Users/nakae/Downloads/my-app-updated-v11.zip"
TEMP_DIR="/tmp/my-app-updated-v11"

cd "$HOME/webpro"
cp -r my-app "my-app_backup_$(date +%Y%m%d_%H%M%S)"
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"
unzip "$ZIP_PATH" -d "$TEMP_DIR"

cp -v "$TEMP_DIR/my-app/index.ts" "$PROJECT_DIR/index.ts"
cp -v "$TEMP_DIR/my-app/package.json" "$PROJECT_DIR/package.json"
cp -v "$TEMP_DIR/my-app/package-lock.json" "$PROJECT_DIR/package-lock.json"
cp -v "$TEMP_DIR/my-app/README.md" "$PROJECT_DIR/README.md"
cp -v "$TEMP_DIR/my-app/prisma.config.ts" "$PROJECT_DIR/prisma.config.ts"

rm -rf "$PROJECT_DIR/prisma" "$PROJECT_DIR/src" "$PROJECT_DIR/tests" "$PROJECT_DIR/views" "$PROJECT_DIR/public" "$PROJECT_DIR/scripts"
cp -rv "$TEMP_DIR/my-app/prisma" "$PROJECT_DIR/prisma"
cp -rv "$TEMP_DIR/my-app/src" "$PROJECT_DIR/src"
cp -rv "$TEMP_DIR/my-app/tests" "$PROJECT_DIR/tests"
cp -rv "$TEMP_DIR/my-app/views" "$PROJECT_DIR/views"
cp -rv "$TEMP_DIR/my-app/public" "$PROJECT_DIR/public"
cp -rv "$TEMP_DIR/my-app/scripts" "$PROJECT_DIR/scripts"

echo "v11への置き換えが完了しました。"
