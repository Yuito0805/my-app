import test from "node:test";
import assert from "node:assert/strict";
import { itemMatchesSearch, normalizeSearchCriteria } from "../src/services/search-service.ts";

const sampleItem = {
  isCanceled: false,
  completedAt: null,
  receiverAccountId: null,
  condition: "比較的きれい",
  textbook: {
    title: "アルゴリズム理論演習",
    author: "著者D03",
    textbookCourses: [{ course: { courseName: "アルゴリズム理論", teacherName: "教員D03" } }],
  },
};

test("不正な検索条件は既定値に正規化される", () => {
  const normalized = normalizeSearchCriteria({ searchTarget: "unknown", itemStatus: "unknown" });
  assert.equal(normalized.searchTarget, "all");
  assert.equal(normalized.itemStatus, "open");
});

test("教科名による保存検索に一致する", () => {
  assert.equal(itemMatchesSearch(sampleItem, {
    keyword: "アルゴリズム理論",
    searchTarget: "course",
    condition: "比較的きれい",
    itemStatus: "open",
  }), true);
});
