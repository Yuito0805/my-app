import test from "node:test";
import assert from "node:assert/strict";
import { accountSeeds, bookSeeds, fieldSeeds } from "../prisma/seed-data.ts";

const oldDecorativeWords = [
  "蒼海", "星環", "白樺", "月影", "翠嶺", "紅葉", "風紋", "雪原", "黄昏", "水鏡",
  "桜雲", "紫苑", "青嵐", "銀河", "朝霧", "夕凪", "天穹", "深緑", "金砂", "藍晶",
  "琥珀", "霧島", "若草", "群青", "花霞", "流星", "碧空", "藤波", "陽炎", "水脈",
  "雲海", "灯台", "森羅", "真珠", "青磁", "薄明", "千鳥", "虹彩", "木漏日", "星霜",
];

test("8分野に教科書5冊、利用者3人ずつを均等配置する", () => {
  assert.equal(fieldSeeds.length, 8);
  assert.equal(bookSeeds.length, 40);
  assert.equal(accountSeeds.length, 24);

  for (const field of fieldSeeds) {
    assert.equal(bookSeeds.filter((book) => book.fieldKey === field.key).length, 5);
    assert.equal(accountSeeds.filter((account) => account.fieldKey === field.key).length, 3);
  }
});

test("教員名・著者名・利用者名は規則的な架空名になっている", () => {
  for (const book of bookSeeds) {
    assert.match(book.teacherName, /^教員[A-H]0[1-5]$/);
    assert.match(book.author, /^著者[A-H]0[1-5]$/);
  }
  for (const account of accountSeeds) {
    assert.match(account.accountName, /^利用者[A-H]0[1-3]$/);
  }
});

test("旧版の装飾的な接頭辞やデータ名の『デモ』を含まない", () => {
  const serialized = JSON.stringify({ accountSeeds, bookSeeds });
  assert.equal(serialized.includes("デモ"), false);
  for (const word of oldDecorativeWords) assert.equal(serialized.includes(word), false, `${word} が残っています`);
});

test("教科書・教科・著者・教員の組み合わせが重複しない", () => {
  assert.equal(new Set(bookSeeds.map((book) => book.title)).size, 40);
  assert.equal(new Set(bookSeeds.map((book) => book.courseName)).size, 40);
  assert.equal(new Set(bookSeeds.map((book) => book.author)).size, 40);
  assert.equal(new Set(bookSeeds.map((book) => book.teacherName)).size, 40);
});
