import assert from "node:assert/strict";
import test from "node:test";
import { buildRecentActivities, summarizeRecentActivities } from "../src/services/activity-service.ts";

test("最近の活動を日時の新しい順に統合する", () => {
  const activities = buildRecentActivities({
    favorites: [{ accountId: 1, itemId: 10, createdAt: new Date("2026-07-10T10:00:00Z"), item: { id: 10, textbook: { title: "数学Ⅰ 基礎演習" } } }],
    views: [{ accountId: 1, itemId: 11, viewedAt: new Date("2026-07-12T10:00:00Z"), viewCount: 2, item: { id: 11, textbook: { title: "アルゴリズム理論" } } }],
    items: [{ id: 12, createdAt: new Date("2026-07-11T10:00:00Z"), textbook: { title: "民法概説" } }],
  });

  assert.deepEqual(activities.map((activity) => activity.type), ["view", "listing", "favorite"]);
  assert.equal(activities[0].title, "アルゴリズム理論");
});

test("過去7日間の活動内訳を数える", () => {
  const now = new Date("2026-07-15T00:00:00Z");
  const activities = buildRecentActivities({
    favorites: [{ accountId: 1, itemId: 1, createdAt: new Date("2026-07-14T00:00:00Z"), item: { id: 1, textbook: { title: "本A" } } }],
    views: [{ accountId: 1, itemId: 2, viewedAt: new Date("2026-07-13T00:00:00Z"), item: { id: 2, textbook: { title: "本B" } } }],
    chatMessages: [{ id: 3, sentAt: new Date("2026-07-12T00:00:00Z"), message: "確認です", item: { id: 3, textbook: { title: "本C" } } }],
    notifications: [{ id: 4, createdAt: new Date("2026-06-01T00:00:00Z"), message: "古い通知" }],
  });
  const summary = summarizeRecentActivities(activities, 7, now);
  assert.deepEqual(summary, { total: 3, favorites: 1, views: 1, messages: 1, updates: 0 });
});
