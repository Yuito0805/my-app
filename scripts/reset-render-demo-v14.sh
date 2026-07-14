#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/webpro/my-app"

read -rsp "RenderのExternal Database URLを貼り付けてください: " RENDER_DB_URL
echo
RENDER_DB_URL="${RENDER_DB_URL//$'\r'/}"
export DATABASE_URL="$RENDER_DB_URL"

node --input-type=module <<'NODE'
const value = process.env.DATABASE_URL;
if (!value) throw new Error("DATABASE_URL が空です。");
const url = new URL(value);
console.log(`host: ${url.hostname}`);
console.log(`database: ${url.pathname.replace(/^\//, "")}`);
if (["127.0.0.1", "localhost"].includes(url.hostname)) {
  throw new Error("ローカルDBが指定されています。RenderのExternal Database URLを使用してください。");
}
NODE

echo "上記DBの既存データをすべて削除し、v14の架空データへ置換します。"
read -r -p "続行する場合は RESET と入力してください: " answer
[[ "$answer" == "RESET" ]] || { echo "中止しました。"; unset DATABASE_URL RENDER_DB_URL; exit 1; }

npm run db:generate
CONFIRM_DEMO_RESET=YES npm run db:reset-demo

unset DATABASE_URL RENDER_DB_URL
echo "Render DBの置換が完了しました。"
