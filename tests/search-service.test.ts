import test from "node:test";
import assert from "node:assert/strict";
import { itemMatchesSearch, normalizeSearchCriteria } from "../src/services/search-service.ts";

const sampleItem = {
  isCanceled: false,
  completedAt: null,
  receiverAccountId: null,
  condition: "比較的きれい",
  textbook: {
    title: "蒼海情報構造ノート",
    author: "デモ著者A01",
    textbookCourses: [{ course: { courseName: "蒼海情報構造演習", teacherName: "デモ教員A01" } }],
  },
};

test("不正な検索条件は既定値に正規化される", () => {
  const normalized = normalizeSearchCriteria({ searchTarget: "unknown", itemStatus: "unknown" });
  assert.equal(normalized.searchTarget, "all");
  assert.equal(normalized.itemStatus, "open");
});

test("教科名による保存検索に一致する", () => {
  assert.equal(itemMatchesSearch(sampleItem, {
    keyword: "蒼海情報構造演習",
    searchTarget: "course",
    condition: "比較的きれい",
    itemStatus: "open",
  }), true);
});
