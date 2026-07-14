#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/webpro/my-app"

echo "接続先DBを確認します。DATABASE_URLの値自体は表示しません。"
node --input-type=module -e '
import "dotenv/config";
const url = new URL(process.env.DATABASE_URL);
console.log(`host: ${url.hostname}`);
console.log(`database: ${url.pathname.replace(/^\//, "")}`);
'

echo "上記DBの既存データをすべて削除し、架空データへ置換します。"
read -r -p "続行する場合は RESET と入力してください: " answer
[[ "$answer" == "RESET" ]] || { echo "中止しました。"; exit 1; }

CONFIRM_DEMO_RESET=YES npm run db:reset-demo
