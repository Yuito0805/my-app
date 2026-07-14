import test from "node:test";
import assert from "node:assert/strict";
import { rankItemsForEnrolledCourses, rankTrendingItems } from "../src/services/course-personalization-service.ts";

function item(id: number, courseIds: number[], favorites = 0, views = 0) {
  return {
    id,
    createdAt: `2026-07-${String(10 + id).padStart(2, "0")}T00:00:00Z`,
    _count: { favorites, itemViews: views },
    textbook: { textbookCourses: courseIds.map((courseId) => ({ course: { id: courseId, courseName: `教科${courseId}` } })) },
  };
}

test("履修科目に一致する出品だけが棚に表示される", () => {
  const ranked = rankItemsForEnrolledCourses([item(1, [1]), item(2, [2]), item(3, [1, 2])], new Set([1]), 8);
  assert.deepEqual(ranked.map((row) => row.id), [3, 1]);
});

test("お気に入りと閲覧が多い出品が注目順で上位になる", () => {
  const ranked = rankTrendingItems([item(1, [1], 1, 1), item(2, [2], 3, 5)], 8);
  assert.equal(ranked[0].id, 2);
});
