import test from "node:test";
import assert from "node:assert/strict";
import { rerankRecommendations, scoreRecommendationCandidates } from "../src/services/recommendation-service.ts";

function item(id: number, textbookId: number, courseId: number, createdAt = "2026-07-14T00:00:00Z") {
  return {
    id,
    textbookId,
    createdAt,
    _count: { favorites: 0 },
    textbook: {
      textbookCourses: [{ course: { id: courseId, teacherName: `教員${courseId}` } }],
    },
  };
}

test("興味なしの商品は推薦候補から除外される", () => {
  const scored = scoreRecommendationCandidates([item(1, 1, 1), item(2, 2, 2)], {
    favoriteItems: [],
    viewedItems: [],
    feedbackItemIds: new Set([1]),
    now: new Date("2026-07-14T00:00:00Z"),
  });
  assert.deepEqual(scored.map((candidate) => candidate.id), [2]);
});

test("同じ教科書は再順位付けで1件までになる", () => {
  const ranked = rerankRecommendations([
    { ...item(1, 10, 1), recommendationScore: 10 },
    { ...item(2, 10, 1), recommendationScore: 9 },
    { ...item(3, 11, 2), recommendationScore: 8 },
  ], 3);
  assert.equal(ranked.filter((candidate) => candidate.textbookId === 10).length, 1);
});

test("履修中の教科に関連する商品は推薦スコアが加算される", () => {
  const scored = scoreRecommendationCandidates([item(1, 1, 42), item(2, 2, 7)], {
    favoriteItems: [],
    viewedItems: [],
    enrolledCourseIds: new Set([42]),
    now: new Date("2026-07-14T00:00:00Z"),
  });
  assert.equal(scored[0].id, 1);
  assert.ok(scored[0].recommendationReasons.some((reason: any) => reason.text === "履修中の教科に関連"));
});
