#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/webpro"
ZIP_PATH="/mnt/c/Users/nakae/Downloads/my-app-updated-v12.zip"
PROJECT_DIR="$HOME/webpro/my-app"
EXTRACT_DIR="/tmp/my-app-updated-v12"
BACKUP_DIR="$HOME/webpro/my-app_backup_$(date +%Y%m%d_%H%M%S)"

test -f "$ZIP_PATH" || { echo "zipが見つかりません: $ZIP_PATH"; exit 1; }
test -d "$PROJECT_DIR" || { echo "本体プロジェクトが見つかりません: $PROJECT_DIR"; exit 1; }

cp -a "$PROJECT_DIR" "$BACKUP_DIR"
rm -rf "$EXTRACT_DIR"
mkdir -p "$EXTRACT_DIR"
unzip -q "$ZIP_PATH" -d "$EXTRACT_DIR"
SOURCE_DIR="$EXTRACT_DIR/my-app"

for file in index.ts package.json package-lock.json README.md prisma.config.ts; do
  cp -v "$SOURCE_DIR/$file" "$PROJECT_DIR/$file"
done

for directory in prisma views public src tests scripts; do
  rm -rf "$PROJECT_DIR/$directory"
  cp -a "$SOURCE_DIR/$directory" "$PROJECT_DIR/$directory"
done

echo "v12への置き換えが完了しました。"
echo "バックアップ: $BACKUP_DIR"
