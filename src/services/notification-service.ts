import { itemMatchesSearch } from "./search-service.ts";

export async function createNotification(prisma: any, data: {
  accountId: number;
  type: string;
  message: string;
  dedupeKey: string;
  itemId?: number | null;
  savedSearchId?: number | null;
}) {
  return prisma.notification.upsert({
    where: { dedupeKey: data.dedupeKey },
    update: {},
    create: {
      accountId: data.accountId,
      type: data.type,
      message: data.message,
      dedupeKey: data.dedupeKey,
      itemId: data.itemId || null,
      savedSearchId: data.savedSearchId || null,
    },
  });
}

export async function notifySavedSearchMatches(prisma: any, item: any) {
  const savedSearches = await prisma.savedSearch.findMany({
    where: { accountId: { not: item.sellerAccountId } },
  });

  for (const search of savedSearches) {
    if (!itemMatchesSearch(item, {
      keyword: search.keyword,
      searchTarget: search.searchTarget,
      condition: search.condition,
      itemStatus: search.itemStatus,
      sortOrder: search.sortOrder,
    })) continue;

    await createNotification(prisma, {
      accountId: search.accountId,
      type: "saved_search",
      itemId: item.id,
      savedSearchId: search.id,
      message: `保存した検索「${search.name}」に合う「${item.textbook.title}」が新しく出品されました。`,
      dedupeKey: `saved-search:${search.id}:item:${item.id}`,
    });
  }
}

export async function notifyChatParticipants(prisma: any, item: any, chatMessage: any) {
  const priorParticipants = await prisma.chatMessage.findMany({
    where: { itemId: item.id },
    select: { senderAccountId: true },
    distinct: ["senderAccountId"],
  });
  const accountIds = new Set<number>([
    item.sellerAccountId,
    ...(item.receiverAccountId ? [item.receiverAccountId] : []),
    ...priorParticipants.map((participant: any) => participant.senderAccountId),
  ]);
  accountIds.delete(chatMessage.senderAccountId);

  for (const accountId of accountIds) {
    await createNotification(prisma, {
      accountId,
      type: "chat",
      itemId: item.id,
      message: `「${item.textbook.title}」のチャットに新しいメッセージがあります。`,
      dedupeKey: `chat:${chatMessage.id}:account:${accountId}`,
    });
  }
}

export async function notifyFavoriteStateChange(
  prisma: any,
  item: any,
  eventKey: string,
  message: string,
) {
  const favorites = await prisma.favorite.findMany({
    where: { itemId: item.id },
    select: { accountId: true },
  });

  for (const favorite of favorites) {
    if (favorite.accountId === item.sellerAccountId) continue;
    await createNotification(prisma, {
      accountId: favorite.accountId,
      type: "favorite_update",
      itemId: item.id,
      message,
      dedupeKey: `favorite:${eventKey}:item:${item.id}:account:${favorite.accountId}`,
    });
  }
}
