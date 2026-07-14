import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("主要ページにスキップ先とエラー画面がある", () => {
  const nav = readFileSync("views/partials/nav.ejs", "utf8");
  const mypage = readFileSync("views/mypage.ejs", "utf8");
  const serverError = readFileSync("views/server-error.ejs", "utf8");
  assert.match(nav, /href="#main-content"/);
  assert.match(mypage, /id="main-content"/);
  assert.match(serverError, /処理中にエラーが発生しました/);
});

test("マイページのタブにaria-controlsとtabpanelが対応する", () => {
  const mypage = readFileSync("views/mypage.ejs", "utf8");
  assert.match(mypage, /aria-controls="panel-updates"/);
  assert.match(mypage, /id="panel-updates"[\s\S]*role="tabpanel"/);
  assert.match(mypage, /aria-labelledby="tab-courses"/);
});
