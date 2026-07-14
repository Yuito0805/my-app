import test from "node:test";
import assert from "node:assert/strict";
import { itemMatchesSearch, normalizeSearchCriteria } from "../src/services/search-service.ts";

const sampleItem = {
  isCanceled: false,
  completedAt: null,
  receiverAccountId: null,
  condition: "比較的きれい",
  textbook: {
    title: "Webアプリ開発入門",
    author: "山田太郎",
    textbookCourses: [{ course: { courseName: "Webプログラミング", teacherName: "佐藤先生" } }],
  },
};

test("不正な検索条件は既定値に正規化される", () => {
  const normalized = normalizeSearchCriteria({ searchTarget: "unknown", itemStatus: "unknown" });
  assert.equal(normalized.searchTarget, "all");
  assert.equal(normalized.itemStatus, "open");
});

test("教科名による保存検索に一致する", () => {
  assert.equal(itemMatchesSearch(sampleItem, {
    keyword: "Webプログラミング",
    searchTarget: "course",
    condition: "比較的きれい",
    itemStatus: "open",
  }), true);
});
