export type ActivityType = "favorite" | "view" | "notification" | "listing" | "message";

export type ActivityEntry = {
  id: string;
  type: ActivityType;
  label: string;
  title: string;
  description: string;
  href: string;
  occurredAt: Date;
  icon: string;
};

type BuildActivityInput = {
  favorites?: any[];
  views?: any[];
  notifications?: any[];
  items?: any[];
  chatMessages?: any[];
};

function toDate(value: unknown): Date {
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
}

export function buildRecentActivities(input: BuildActivityInput, limit = 12): ActivityEntry[] {
  const activities: ActivityEntry[] = [];

  for (const favorite of input.favorites || []) {
    const item = favorite.item;
    if (!item?.textbook) continue;
    activities.push({
      id: `favorite-${favorite.accountId ?? "self"}-${favorite.itemId}`,
      type: "favorite",
      label: "お気に入り",
      title: item.textbook.title,
      description: "あとで確認する教科書として保存しました。",
      href: `/items/${item.id}`,
      occurredAt: toDate(favorite.createdAt),
      icon: "♥",
    });
  }

  for (const view of input.views || []) {
    const item = view.item;
    if (!item?.textbook) continue;
    activities.push({
      id: `view-${view.accountId ?? "self"}-${view.itemId}`,
      type: "view",
      label: "閲覧",
      title: item.textbook.title,
      description: `${view.viewCount || 1}回閲覧した出品です。`,
      href: `/items/${item.id}`,
      occurredAt: toDate(view.viewedAt),
      icon: "○",
    });
  }

  for (const notification of input.notifications || []) {
    activities.push({
      id: `notification-${notification.id}`,
      type: "notification",
      label: "通知",
      title: notification.item?.textbook?.title || notification.savedSearch?.name || "新しい更新",
      description: notification.message || "新しい更新があります。",
      href: `/notifications/${notification.id}/open`,
      occurredAt: toDate(notification.createdAt),
      icon: "!",
    });
  }

  for (const item of input.items || []) {
    if (!item?.textbook) continue;
    activities.push({
      id: `listing-${item.id}`,
      type: "listing",
      label: "出品",
      title: item.textbook.title,
      description: "教科書を出品しました。",
      href: `/items/${item.id}`,
      occurredAt: toDate(item.createdAt),
      icon: "＋",
    });
  }

  for (const message of input.chatMessages || []) {
    const item = message.item;
    if (!item?.textbook) continue;
    activities.push({
      id: `message-${message.id}`,
      type: "message",
      label: "チャット",
      title: item.textbook.title,
      description: `「${String(message.message || "").slice(0, 42)}${String(message.message || "").length > 42 ? "…" : ""}」を送信しました。`,
      href: `/items/${item.id}`,
      occurredAt: toDate(message.sentAt),
      icon: "✉",
    });
  }

  return activities
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
    .slice(0, Math.max(0, limit));
}

export function summarizeRecentActivities(activities: ActivityEntry[], days = 7, now = new Date()) {
  const since = now.getTime() - days * 24 * 60 * 60 * 1000;
  const recent = activities.filter((activity) => activity.occurredAt.getTime() >= since);
  return {
    total: recent.length,
    favorites: recent.filter((activity) => activity.type === "favorite").length,
    views: recent.filter((activity) => activity.type === "view").length,
    messages: recent.filter((activity) => activity.type === "message").length,
    updates: recent.filter((activity) => activity.type === "notification").length,
  };
}
