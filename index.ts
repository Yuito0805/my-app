import "dotenv/config";
import express, { Request, Response } from "express";
import path from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
// @ts-ignore
import { PrismaClient } from "./generated/prisma/index.js";
import {
  buildItemWhere,
  buildSearchQuery,
  conditionOptions,
  describeSavedSearch,
  normalizeSearchCriteria,
  sortItems,
} from "./src/services/search-service.ts";
import { rerankRecommendations, scoreRecommendationCandidates } from "./src/services/recommendation-service.ts";
import { rankItemsForEnrolledCourses, rankTrendingItems } from "./src/services/course-personalization-service.ts";
import {
  notifyChatParticipants,
  notifyFavoriteStateChange,
  notifySavedSearchMatches,
} from "./src/services/notification-service.ts";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);
// @ts-ignore
const prisma: any = new PrismaClient({ adapter });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8888;
const CANCELED_ITEM_VISIBLE_HOURS = 24;
const RECOMMENDATION_LIMIT = 6;
const SEARCH_PAGE_SIZE = 12;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

function getCookie(req: Request, name: string): string | null {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
  const target = cookies.find((cookie) => cookie.startsWith(`${name}=`));
  if (!target) return null;

  return decodeURIComponent(target.slice(name.length + 1));
}

async function getCurrentAccount(req: Request) {
  const accountId = Number(getCookie(req, "accountId"));
  if (!Number.isInteger(accountId)) return null;
  return prisma.account.findUnique({ where: { id: accountId } });
}

function redirectWithQuery(res: Response, targetPath: string, params: Record<string, string>) {
  const query = new URLSearchParams(params).toString();
  const separator = targetPath.includes("?") ? "&" : "?";
  res.redirect(query ? `${targetPath}${separator}${query}` : targetPath);
}

function getSafeReturnTo(value: unknown, fallback: string) {
  const returnTo = String(value || "").trim();
  if (!returnTo.startsWith("/") || returnTo.startsWith("//")) return fallback;
  return returnTo.split("#")[0];
}

function redirectBackWithMessage(
  res: Response,
  returnToValue: unknown,
  fallback: string,
  params: Record<string, string>,
) {
  const returnTo = getSafeReturnTo(returnToValue, fallback);
  const separator = returnTo.includes("?") ? "&" : "?";
  res.redirect(`${returnTo}${separator}${new URLSearchParams(params).toString()}`);
}

function getQueryString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function getMessageParams(req: Request) {
  return {
    notice: req.query.notice || "",
    error: req.query.error || "",
  };
}

function formatDate(value: Date | string | null) {
  if (!value) return "";
  const date = new Date(value);
  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isKeioEmail(email: string) {
  return normalizeEmail(email).endsWith("@keio.jp");
}

function getCourseInputs(body: any) {
  return [1, 2, 3]
    .map((number) => ({
      courseName: String(body[`courseName${number}`] || "").trim(),
      teacherName: String(body[`teacherName${number}`] || "").trim(),
    }))
    .filter((pair) => pair.courseName || pair.teacherName);
}

function getItemStatusLabel(item: any) {
  if (item.isCanceled) return "取り消し済み";
  if (item.completedAt) return "譲渡完了";
  if (item.receiverAccountId || item.receiver) return "交渉中";
  return "募集中";
}

function getItemStatusClass(item: any) {
  if (item.isCanceled) return "canceled-status";
  if (item.completedAt) return "completed-status";
  if (item.receiverAccountId || item.receiver) return "negotiating-status";
  return "open-status";
}

function itemHasNewMessage(item: any, readStatus: any, currentAccountId: number) {
  const lastReadAt = readStatus?.lastReadAt ? new Date(readStatus.lastReadAt) : null;
  return item.chatMessages.some((message: any) => {
    if (message.senderAccountId === currentAccountId) return false;
    if (!lastReadAt) return true;
    return new Date(message.sentAt) > lastReadAt;
  });
}

const textbookWithCoursesInclude = {
  textbookCourses: {
    include: { course: true },
    orderBy: [{ courseId: "asc" }],
  },
};

const itemCardInclude = {
  seller: true,
  receiver: true,
  textbook: { include: textbookWithCoursesInclude },
  _count: { select: { favorites: true, itemViews: true } },
};

const itemInclude = {
  ...itemCardInclude,
  chatMessages: {
    include: { sender: true },
    orderBy: [{ sentAt: "asc" }, { id: "asc" }],
  },
};

async function getHeaderNotificationCount(accountId: number) {
  return prisma.notification.count({ where: { accountId, isRead: false } });
}

async function baseRenderData(req: Request, currentAccount: any) {
  return {
    currentAccount,
    currentPath: req.path,
    currentUrl: req.originalUrl,
    unreadCount: currentAccount ? await getHeaderNotificationCount(currentAccount.id) : 0,
    ...getMessageParams(req),
    formatDate,
    getItemStatusLabel,
    getItemStatusClass,
  };
}

async function getFavoriteItemIds(accountId: number) {
  const favorites = await prisma.favorite.findMany({
    where: { accountId },
    select: { itemId: true },
  });
  return favorites.map((favorite: any) => favorite.itemId);
}

async function getEnrolledCourses(accountId: number) {
  const rows = await prisma.accountCourse.findMany({
    where: { accountId },
    include: { course: true },
    orderBy: [{ course: { courseName: "asc" } }],
  });
  return rows.map((row: any) => row.course);
}

function isDefaultDiscovery(criteria: any, page: number) {
  return !criteria.keyword &&
    criteria.searchTarget === "all" &&
    criteria.condition === "all" &&
    criteria.itemStatus === "open" &&
    criteria.sortOrder === "newest" &&
    page === 1;
}

function buildCriteriaUrl(criteria: any, overrides: Record<string, string>) {
  return `/?${buildSearchQuery({ ...criteria, ...overrides })}`;
}

async function getRecommendationSection(accountId: number, enrolledCourseIds = new Set<number>()) {
  const [favoriteSignals, viewSignals, feedbackRows] = await Promise.all([
    prisma.favorite.findMany({
      where: { accountId },
      include: { item: { include: { textbook: { include: textbookWithCoursesInclude } } } },
      orderBy: { createdAt: "desc" },
      take: 16,
    }),
    prisma.itemView.findMany({
      where: { accountId },
      include: { item: { include: { textbook: { include: textbookWithCoursesInclude } } } },
      orderBy: { viewedAt: "desc" },
      take: 16,
    }),
    prisma.recommendationFeedback.findMany({
      where: { accountId, feedback: "not_interested" },
      select: { itemId: true },
    }),
  ]);

  const favoriteItems = favoriteSignals.map((signal: any) => signal.item);
  const viewedItems = viewSignals.map((signal: any) => signal.item);
  const excludedItemIds = new Set<number>([
    ...favoriteItems.map((item: any) => item.id),
    ...viewedItems.slice(0, 5).map((item: any) => item.id),
  ]);
  const feedbackItemIds = new Set<number>(feedbackRows.map((row: any) => row.itemId));

  const candidateItems = await prisma.item.findMany({
    where: {
      isCanceled: false,
      completedAt: null,
      receiverAccountId: null,
      sellerAccountId: { not: accountId },
    },
    include: itemCardInclude,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const hasSignals = favoriteItems.length > 0 || viewedItems.length > 0 || enrolledCourseIds.size > 0;
  const scoredItems = scoreRecommendationCandidates(candidateItems, {
    favoriteItems,
    viewedItems,
    excludedItemIds,
    feedbackItemIds,
    enrolledCourseIds,
  });
  const items = rerankRecommendations(scoredItems, RECOMMENDATION_LIMIT);

  return {
    title: hasSignals ? "あなたへのおすすめ" : "新着の教科書",
    description: hasSignals
      ? "お気に入り・閲覧履歴を点数化し、同じ教科書への偏りを抑えて表示しています。"
      : "閲覧やお気に入りの履歴が増えると、あなたに合う教科書を優先して表示します。",
    items,
  };
}

async function notifyForNewItem(itemId: number) {
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: itemCardInclude,
  });
  if (item) await notifySavedSearchMatches(prisma, item);
}

function getSavedSearchCriteriaFromBody(body: any) {
  return normalizeSearchCriteria({
    keyword: body.keyword,
    searchTarget: body.searchTarget,
    condition: body.condition,
    itemStatus: body.itemStatus,
    sortOrder: body.sortOrder,
  });
}

function buildPageUrl(criteria: any, page: number) {
  return `/?${buildSearchQuery(criteria, { page })}`;
}

app.get("/", async (req: Request, res: Response) => {
  try {
    const currentAccount = await getCurrentAccount(req);
    const criteria = normalizeSearchCriteria({
      keyword: getQueryString(req.query.q),
      searchTarget: getQueryString(req.query.target),
      condition: getQueryString(req.query.condition),
      itemStatus: getQueryString(req.query.status),
      sortOrder: getQueryString(req.query.sort),
    });
    const requestedPage = Number(req.query.page || 1);
    const currentPage = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

    const rawItems = await prisma.item.findMany({
      where: buildItemWhere(criteria),
      include: itemCardInclude,
      orderBy: { createdAt: "desc" },
    });
    const sortedItems = sortItems(rawItems, criteria.sortOrder);
    const totalItems = sortedItems.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / SEARCH_PAGE_SIZE));
    const safePage = Math.min(currentPage, totalPages);
    const items = sortedItems.slice((safePage - 1) * SEARCH_PAGE_SIZE, safePage * SEARCH_PAGE_SIZE);

    let favoriteItemIds: number[] = [];
    let recommendationSection: any = null;
    let enrolledCourses: any[] = [];
    let discoveryShelves: any = null;
    const showDiscovery = Boolean(currentAccount && isDefaultDiscovery(criteria, safePage));

    if (currentAccount) {
      [favoriteItemIds, enrolledCourses] = await Promise.all([
        getFavoriteItemIds(currentAccount.id),
        getEnrolledCourses(currentAccount.id),
      ]);
      const enrolledCourseIds = new Set<number>(enrolledCourses.map((course: any) => course.id));
      if (!criteria.keyword) recommendationSection = await getRecommendationSection(currentAccount.id, enrolledCourseIds);

      if (showDiscovery) {
        const [discoveryItems, recentViews] = await Promise.all([
          prisma.item.findMany({
            where: {
              isCanceled: false,
              completedAt: null,
              receiverAccountId: null,
              sellerAccountId: { not: currentAccount.id },
            },
            include: itemCardInclude,
            orderBy: { createdAt: "desc" },
            take: 120,
          }),
          prisma.itemView.findMany({
            where: {
              accountId: currentAccount.id,
              item: { is: { isCanceled: false, completedAt: null, sellerAccountId: { not: currentAccount.id } } },
            },
            include: { item: { include: itemCardInclude } },
            orderBy: { viewedAt: "desc" },
            take: 8,
          }),
        ]);
        discoveryShelves = {
          enrolledItems: rankItemsForEnrolledCourses(discoveryItems, enrolledCourseIds, 8),
          trendingItems: rankTrendingItems(discoveryItems, 8),
          recentItems: recentViews.map((row: any) => ({ ...row.item, dashboardReason: `最近見た：${formatDate(row.viewedAt)}` })),
        };
      }
    }

    const savedSearchId = Number(req.query.savedSearchId || 0);
    const activeSavedSearch = currentAccount && Number.isInteger(savedSearchId) && savedSearchId > 0
      ? await prisma.savedSearch.findFirst({ where: { id: savedSearchId, accountId: currentAccount.id } })
      : null;

    const activeFilters = [
      criteria.keyword ? { label: `キーワード：${criteria.keyword}`, url: buildCriteriaUrl(criteria, { keyword: "" }) } : null,
      criteria.searchTarget !== "all" ? {
        label: `対象：${({ title: "教科書名", author: "著者名", course: "教科名", teacher: "担当教員" } as any)[criteria.searchTarget]}`,
        url: buildCriteriaUrl(criteria, { searchTarget: "all" }),
      } : null,
      criteria.condition !== "all" ? { label: `状態：${criteria.condition}`, url: buildCriteriaUrl(criteria, { condition: "all" }) } : null,
      criteria.itemStatus !== "open" ? {
        label: `取引：${({ negotiating: "交渉中", completed: "譲渡完了", all: "すべて" } as any)[criteria.itemStatus]}`,
        url: buildCriteriaUrl(criteria, { itemStatus: "open" }),
      } : null,
      criteria.sortOrder !== "newest" ? {
        label: `並び：${({ updated: "更新順", condition: "状態順", popular: "人気順" } as any)[criteria.sortOrder]}`,
        url: buildCriteriaUrl(criteria, { sortOrder: "newest" }),
      } : null,
    ].filter(Boolean);

    res.render("index", {
      ...await baseRenderData(req, currentAccount),
      items,
      q: criteria.keyword,
      statusFilter: criteria.itemStatus,
      searchTarget: criteria.searchTarget,
      conditionFilter: criteria.condition,
      sort: criteria.sortOrder,
      conditionOptions,
      favoriteItemIds,
      recommendationSection,
      discoveryShelves,
      enrolledCourses,
      showDiscovery,
      activeFilters,
      totalItems,
      currentPage: safePage,
      totalPages,
      pageUrl: (page: number) => `${buildPageUrl(criteria, page)}${activeSavedSearch ? `&savedSearchId=${activeSavedSearch.id}` : ""}`,
      activeSavedSearch,
      searchCriteria: criteria,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("データベースの読み込みに失敗しました。");
  }
});

app.get("/login", async (req: Request, res: Response) => {
  const currentAccount = await getCurrentAccount(req);
  res.render("login", {
    ...await baseRenderData(req, currentAccount),
    mode: req.query.mode || "",
    prefillName: req.query.name || "",
    prefillEmail: req.query.email || "",
  });
});

app.get("/mypage", async (req: Request, res: Response) => {
  try {
    const currentAccount = await getCurrentAccount(req);
    if (!currentAccount) {
      return redirectWithQuery(res, "/login", { error: "マイページを見るにはログインしてください。" });
    }

    const canceledVisibleSince = new Date(Date.now() - CANCELED_ITEM_VISIBLE_HOURS * 60 * 60 * 1000);
    const myItems = await prisma.item.findMany({
      where: {
        sellerAccountId: currentAccount.id,
        OR: [{ isCanceled: false }, { canceledAt: { gte: canceledVisibleSince } }],
      },
      include: itemInclude,
      orderBy: { id: "desc" },
    });

    const myChatMessages = await prisma.chatMessage.findMany({
      where: {
        senderAccountId: currentAccount.id,
        item: { is: { OR: [{ isCanceled: false }, { canceledAt: { gte: canceledVisibleSince } }] } },
      },
      include: { item: { include: itemInclude } },
      orderBy: [{ sentAt: "desc" }, { id: "desc" }],
      take: 60,
    });

    const myChatThreadsByItemId = new Map<number, any>();
    myChatMessages.forEach((chat: any) => {
      if (!myChatThreadsByItemId.has(chat.item.id)) {
        myChatThreadsByItemId.set(chat.item.id, { item: chat.item, latestOwnMessage: chat });
      }
    });
    const myChatThreads = [...myChatThreadsByItemId.values()];

    const relevantItemsById = new Map<number, any>();
    myItems.forEach((item: any) => relevantItemsById.set(item.id, item));
    myChatThreads.forEach((thread: any) => relevantItemsById.set(thread.item.id, thread.item));
    const relevantItemIds = [...relevantItemsById.keys()];

    const readStatuses = relevantItemIds.length > 0
      ? await prisma.itemReadStatus.findMany({ where: { accountId: currentAccount.id, itemId: { in: relevantItemIds } } })
      : [];
    const readStatusByItemId = new Map<number, any>();
    readStatuses.forEach((status: any) => readStatusByItemId.set(status.itemId, status));

    const unreadItems = relevantItemIds
      .filter((itemId) => itemHasNewMessage(relevantItemsById.get(itemId), readStatusByItemId.get(itemId), currentAccount.id))
      .map((itemId) => relevantItemsById.get(itemId));
    const unreadItemIds = unreadItems.map((item: any) => item.id);

    const favoriteRows = await prisma.favorite.findMany({
      where: { accountId: currentAccount.id },
      include: { item: { include: itemCardInclude } },
      orderBy: { createdAt: "desc" },
    });
    const favoriteItems = favoriteRows.map((favorite: any) => favorite.item).filter((item: any) => !item.isCanceled);
    const favoriteItemIds = favoriteRows.map((favorite: any) => favorite.itemId);

    const recentViews = await prisma.itemView.findMany({
      where: {
        accountId: currentAccount.id,
        item: { is: { isCanceled: false, completedAt: null, sellerAccountId: { not: currentAccount.id } } },
      },
      include: { item: { include: itemCardInclude } },
      orderBy: { viewedAt: "desc" },
      take: 8,
    });

    const [savedSearches, enrolledCourses] = await Promise.all([
      prisma.savedSearch.findMany({
        where: { accountId: currentAccount.id },
        orderBy: { createdAt: "desc" },
      }),
      getEnrolledCourses(currentAccount.id),
    ]);
    const savedSearchesWithCounts = await Promise.all(savedSearches.map(async (search: any) => ({
      ...search,
      newItemCount: await prisma.item.count({
        where: buildItemWhere({
          keyword: search.keyword,
          searchTarget: search.searchTarget,
          condition: search.condition,
          itemStatus: search.itemStatus,
          sortOrder: search.sortOrder,
        }, { createdAfter: search.lastCheckedAt }),
      }),
      description: describeSavedSearch(search),
    })));

    const notificationSummary = await prisma.notification.findMany({
      where: { accountId: currentAccount.id, isRead: false },
      include: { item: { include: { textbook: true } }, savedSearch: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    });

    res.render("mypage", {
      ...await baseRenderData(req, currentAccount),
      myItems,
      myChatThreads,
      unreadItems,
      unreadItemIds,
      favoriteItems,
      favoriteItemIds,
      recentViews,
      savedSearches: savedSearchesWithCounts,
      enrolledCourses,
      notificationSummary,
      canceledItemVisibleHours: CANCELED_ITEM_VISIBLE_HOURS,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("マイページの読み込みに失敗しました。");
  }
});

app.get("/notifications", async (req: Request, res: Response) => {
  const currentAccount = await getCurrentAccount(req);
  if (!currentAccount) {
    return redirectWithQuery(res, "/login", { error: "通知を見るにはログインしてください。" });
  }

  const notifications = await prisma.notification.findMany({
    where: { accountId: currentAccount.id },
    include: {
      item: { include: { textbook: true } },
      savedSearch: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  res.render("notifications", {
    ...await baseRenderData(req, currentAccount),
    notifications,
  });
});

app.get("/notifications/:notificationId/open", async (req: Request, res: Response) => {
  const currentAccount = await getCurrentAccount(req);
  if (!currentAccount) return redirectWithQuery(res, "/login", { error: "通知を見るにはログインしてください。" });

  const notificationId = Number(req.params.notificationId);
  const notification = Number.isInteger(notificationId)
    ? await prisma.notification.findFirst({ where: { id: notificationId, accountId: currentAccount.id } })
    : null;
  if (!notification) return redirectWithQuery(res, "/notifications", { error: "通知が見つかりません。" });

  await prisma.notification.update({ where: { id: notification.id }, data: { isRead: true } });
  if (notification.savedSearchId) return res.redirect(`/saved-searches/${notification.savedSearchId}/results`);
  if (notification.itemId) return res.redirect(`/items/${notification.itemId}`);
  return res.redirect("/notifications");
});

app.post("/notifications/read-all", async (req: Request, res: Response) => {
  const currentAccount = await getCurrentAccount(req);
  if (!currentAccount) return redirectWithQuery(res, "/login", { error: "通知を操作するにはログインしてください。" });
  await prisma.notification.updateMany({
    where: { accountId: currentAccount.id, isRead: false },
    data: { isRead: true },
  });
  return redirectWithQuery(res, "/notifications", { notice: "すべての通知を既読にしました。" });
});

app.get("/saved-searches/:savedSearchId/results", async (req: Request, res: Response) => {
  const currentAccount = await getCurrentAccount(req);
  if (!currentAccount) return redirectWithQuery(res, "/login", { error: "保存した検索を利用するにはログインしてください。" });

  const savedSearchId = Number(req.params.savedSearchId);
  const search = Number.isInteger(savedSearchId)
    ? await prisma.savedSearch.findFirst({ where: { id: savedSearchId, accountId: currentAccount.id } })
    : null;
  if (!search) return redirectWithQuery(res, "/mypage", { error: "保存した検索が見つかりません。" });

  await prisma.$transaction([
    prisma.savedSearch.update({ where: { id: search.id }, data: { lastCheckedAt: new Date() } }),
    prisma.notification.updateMany({
      where: { accountId: currentAccount.id, savedSearchId: search.id, isRead: false },
      data: { isRead: true },
    }),
  ]);

  const query = buildSearchQuery({
    keyword: search.keyword,
    searchTarget: search.searchTarget,
    condition: search.condition,
    itemStatus: search.itemStatus,
    sortOrder: search.sortOrder,
  }, { savedSearchId: search.id });
  return res.redirect(`/?${query}`);
});

app.get("/courses", async (req: Request, res: Response) => {
  const currentAccount = await getCurrentAccount(req);
  if (!currentAccount) return redirectWithQuery(res, "/login", { error: "履修科目を設定するにはログインしてください。" });

  const q = getQueryString(req.query.q).trim();
  const courses = await prisma.course.findMany({
    where: q ? {
      OR: [
        { courseName: { contains: q, mode: "insensitive" } },
        { teacherName: { contains: q, mode: "insensitive" } },
        { faculty: { contains: q, mode: "insensitive" } },
      ],
    } : {},
    include: {
      _count: { select: { textbookCourses: true, enrolledAccounts: true } },
    },
    orderBy: [{ courseName: "asc" }, { teacherName: "asc" }],
    take: 80,
  });
  const enrolledCourses = await getEnrolledCourses(currentAccount.id);
  const enrolledCourseIds = enrolledCourses.map((course: any) => course.id);

  res.render("courses", {
    ...await baseRenderData(req, currentAccount),
    q,
    courses,
    enrolledCourses,
    enrolledCourseIds,
  });
});

app.post("/courses/:courseId/enroll", async (req: Request, res: Response) => {
  const currentAccount = await getCurrentAccount(req);
  if (!currentAccount) return redirectWithQuery(res, "/login", { error: "履修科目を設定するにはログインしてください。" });
  const courseId = Number(req.params.courseId);
  if (!Number.isInteger(courseId)) return redirectWithQuery(res, "/courses", { error: "教科の指定が正しくありません。" });
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return redirectWithQuery(res, "/courses", { error: "教科が見つかりません。" });
  const count = await prisma.accountCourse.count({ where: { accountId: currentAccount.id } });
  if (count >= 12) return redirectWithQuery(res, "/courses", { error: "履修科目は最大12件まで登録できます。" });
  await prisma.accountCourse.upsert({
    where: { accountId_courseId: { accountId: currentAccount.id, courseId } },
    update: {},
    create: { accountId: currentAccount.id, courseId },
  });
  return redirectBackWithMessage(res, req.body.returnTo, "/courses", { notice: `「${course.courseName}」を履修科目に追加しました。` });
});

app.post("/courses/:courseId/unenroll", async (req: Request, res: Response) => {
  const currentAccount = await getCurrentAccount(req);
  if (!currentAccount) return redirectWithQuery(res, "/login", { error: "履修科目を設定するにはログインしてください。" });
  const courseId = Number(req.params.courseId);
  if (!Number.isInteger(courseId)) return redirectWithQuery(res, "/courses", { error: "教科の指定が正しくありません。" });
  await prisma.accountCourse.deleteMany({ where: { accountId: currentAccount.id, courseId } });
  return redirectBackWithMessage(res, req.body.returnTo, "/courses", { notice: "履修科目から削除しました。" });
});

app.get("/items/new", async (req: Request, res: Response) => {
  const currentAccount = await getCurrentAccount(req);
  if (!currentAccount) {
    return redirectWithQuery(res, "/login", { error: "出品するにはログインしてください。" });
  }

  res.render("item-new", {
    ...await baseRenderData(req, currentAccount),
    conditionOptions,
  });
});

app.get("/items/:itemId", async (req: Request, res: Response) => {
  try {
    const currentAccount = await getCurrentAccount(req);
    const itemId = Number(req.params.itemId);
    if (!Number.isInteger(itemId)) {
      return redirectWithQuery(res, "/", { error: "指定された譲渡品が正しくありません。" });
    }

    const item = await prisma.item.findUnique({ where: { id: itemId }, include: itemInclude });
    if (!item) {
      return redirectWithQuery(res, "/", { error: "指定された譲渡品が見つかりません。" });
    }

    let isFavorite = false;
    if (currentAccount) {
      await prisma.itemReadStatus.upsert({
        where: { accountId_itemId: { accountId: currentAccount.id, itemId } },
        update: { lastReadAt: new Date() },
        create: { accountId: currentAccount.id, itemId, lastReadAt: new Date() },
      });
      await prisma.notification.updateMany({
        where: { accountId: currentAccount.id, itemId, isRead: false },
        data: { isRead: true },
      });

      if (currentAccount.id !== item.sellerAccountId) {
        await prisma.itemView.upsert({
          where: { accountId_itemId: { accountId: currentAccount.id, itemId } },
          update: { viewedAt: new Date(), viewCount: { increment: 1 } },
          create: { accountId: currentAccount.id, itemId, viewedAt: new Date(), viewCount: 1 },
        });
      }

      isFavorite = Boolean(await prisma.favorite.findUnique({
        where: { accountId_itemId: { accountId: currentAccount.id, itemId } },
      }));
    }

    res.render("item-detail", {
      ...await baseRenderData(req, currentAccount),
      item,
      isFavorite,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("譲渡品詳細の読み込みに失敗しました。");
  }
});

app.get("/items/:itemId/edit", async (req: Request, res: Response) => {
  try {
    const currentAccount = await getCurrentAccount(req);
    if (!currentAccount) {
      return redirectWithQuery(res, "/login", { error: "出品内容を編集するにはログインしてください。" });
    }

    const itemId = Number(req.params.itemId);
    if (!Number.isInteger(itemId)) {
      return redirectWithQuery(res, "/", { error: "指定された譲渡品が正しくありません。" });
    }

    const item = await prisma.item.findUnique({ where: { id: itemId }, include: itemInclude });
    if (!item) return redirectWithQuery(res, "/", { error: "指定された譲渡品が見つかりません。" });
    if (item.sellerAccountId !== currentAccount.id) {
      return redirectWithQuery(res, "/", { error: "出品内容を編集できるのは出品者だけです。" });
    }
    if (item.isCanceled || item.completedAt) {
      return redirectWithQuery(res, `/items/${itemId}`, {
        error: "取り消し済みまたは譲渡完了済みの出品は編集できません。",
      });
    }

    res.render("item-edit", {
      ...await baseRenderData(req, currentAccount),
      item,
      conditionOptions,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("出品編集画面の読み込みに失敗しました。");
  }
});

app.get("/api/search-suggestions", async (req: Request, res: Response) => {
  const q = getQueryString(req.query.q).trim();
  if (q.length < 1) return res.json([]);
  const [textbooks, courses] = await Promise.all([
    prisma.textbook.findMany({
      where: { OR: [{ title: { contains: q, mode: "insensitive" } }, { author: { contains: q, mode: "insensitive" } }] },
      orderBy: { title: "asc" },
      take: 5,
    }),
    prisma.course.findMany({
      where: { OR: [{ courseName: { contains: q, mode: "insensitive" } }, { teacherName: { contains: q, mode: "insensitive" } }] },
      orderBy: { courseName: "asc" },
      take: 5,
    }),
  ]);
  return res.json([
    ...textbooks.map((book: any) => ({ type: "title", label: book.title, meta: `著者：${book.author}`, value: book.title })),
    ...courses.map((course: any) => ({ type: "course", label: course.courseName, meta: `${course.teacherName}${course.faculty ? `・${course.faculty}` : ""}`, value: course.courseName })),
  ]);
});

app.get("/api/textbooks", async (req: Request, res: Response) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!q) return res.json([]);

  const textbooks = await prisma.textbook.findMany({
    where: { title: { contains: q, mode: "insensitive" } },
    include: { textbookCourses: { include: { course: true }, orderBy: [{ courseId: "asc" }] } },
    orderBy: { title: "asc" },
    take: 8,
  });

  return res.json(textbooks.map((textbook: any) => ({
    id: textbook.id,
    title: textbook.title,
    author: textbook.author,
    courses: textbook.textbookCourses.map((tc: any) => ({
      courseName: tc.course.courseName,
      teacherName: tc.course.teacherName,
    })),
  })));
});

app.post("/login", async (req: Request, res: Response) => {
  const accountName = String(req.body.accountName || "").trim();
  const email = normalizeEmail(String(req.body.email || ""));
  if (!accountName || !email) {
    return redirectWithQuery(res, "/login", { error: "名前とメールアドレスを入力してください。" });
  }

  const account = await prisma.account.findFirst({ where: { accountName, email } });
  if (account) {
    res.cookie("accountId", String(account.id), {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });
    return redirectWithQuery(res, "/", { notice: `${account.accountName} としてログインしました。` });
  }

  return redirectWithQuery(res, "/login", {
    mode: "signup",
    name: accountName,
    email,
    notice: "一致するアカウントが見つかりませんでした。新規アカウント作成に進んでください。",
  });
});

app.post("/accounts", async (req: Request, res: Response) => {
  const accountName = String(req.body.accountName || "").trim();
  const email = normalizeEmail(String(req.body.email || ""));
  if (!accountName || !email) {
    return redirectWithQuery(res, "/login", { mode: "signup", error: "名前とメールアドレスを入力してください。" });
  }
  if (!isKeioEmail(email)) {
    return redirectWithQuery(res, "/login", {
      mode: "signup",
      name: accountName,
      email,
      error: "新規アカウント作成には、@keio.jp で終わるメールアドレスが必要です。",
    });
  }

  const sameEmailAccount = await prisma.account.findUnique({ where: { email } });
  if (sameEmailAccount && sameEmailAccount.accountName !== accountName) {
    return redirectWithQuery(res, "/login", {
      mode: "signup",
      name: accountName,
      email,
      error: "そのメールアドレスは別の名前で登録済みです。登録済みの名前でログインしてください。",
    });
  }

  const account = sameEmailAccount || await prisma.account.create({ data: { accountName, email } });
  res.cookie("accountId", String(account.id), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });
  return redirectWithQuery(res, "/", { notice: `${account.accountName} のアカウントを作成してログインしました。` });
});

app.post("/logout", (_req: Request, res: Response) => {
  res.clearCookie("accountId");
  res.redirect("/");
});

app.post("/saved-searches", async (req: Request, res: Response) => {
  const currentAccount = await getCurrentAccount(req);
  if (!currentAccount) return redirectWithQuery(res, "/login", { error: "検索条件を保存するにはログインしてください。" });

  const name = String(req.body.name || "").trim();
  const criteria = getSavedSearchCriteriaFromBody(req.body);
  if (!name) {
    return redirectBackWithMessage(res, req.body.returnTo, "/", { error: "保存する検索条件の名前を入力してください。" });
  }

  const existing = await prisma.savedSearch.findUnique({
    where: { accountId_name: { accountId: currentAccount.id, name } },
  });
  if (existing) {
    return redirectBackWithMessage(res, req.body.returnTo, "/", { error: "同じ名前の保存検索がすでにあります。" });
  }

  await prisma.savedSearch.create({
    data: {
      accountId: currentAccount.id,
      name,
      keyword: criteria.keyword || null,
      searchTarget: criteria.searchTarget,
      condition: criteria.condition,
      itemStatus: criteria.itemStatus,
      sortOrder: criteria.sortOrder,
      lastCheckedAt: new Date(),
    },
  });
  return redirectBackWithMessage(res, req.body.returnTo, "/", { notice: `検索条件「${name}」を保存しました。` });
});

app.post("/saved-searches/:savedSearchId/delete", async (req: Request, res: Response) => {
  const currentAccount = await getCurrentAccount(req);
  if (!currentAccount) return redirectWithQuery(res, "/login", { error: "保存した検索を削除するにはログインしてください。" });

  const savedSearchId = Number(req.params.savedSearchId);
  const search = Number.isInteger(savedSearchId)
    ? await prisma.savedSearch.findFirst({ where: { id: savedSearchId, accountId: currentAccount.id } })
    : null;
  if (!search) return redirectWithQuery(res, "/mypage?tab=saved", { error: "保存した検索が見つかりません。" });

  await prisma.savedSearch.delete({ where: { id: search.id } });
  return redirectWithQuery(res, "/mypage?tab=saved", { notice: `保存した検索「${search.name}」を削除しました。` });
});

app.post("/items/:itemId/recommendation-feedback", async (req: Request, res: Response) => {
  const currentAccount = await getCurrentAccount(req);
  if (!currentAccount) return redirectWithQuery(res, "/login", { error: "おすすめを調整するにはログインしてください。" });

  const itemId = Number(req.params.itemId);
  if (!Number.isInteger(itemId)) {
    return redirectBackWithMessage(res, req.body.returnTo, "/", { error: "指定された譲渡品が正しくありません。" });
  }
  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item || item.sellerAccountId === currentAccount.id) {
    return redirectBackWithMessage(res, req.body.returnTo, "/", { error: "このおすすめにはフィードバックできません。" });
  }

  await prisma.recommendationFeedback.upsert({
    where: { accountId_itemId: { accountId: currentAccount.id, itemId } },
    update: { feedback: "not_interested", createdAt: new Date() },
    create: { accountId: currentAccount.id, itemId, feedback: "not_interested" },
  });
  return redirectBackWithMessage(res, req.body.returnTo, "/", { notice: "この教科書をおすすめから除外しました。" });
});

app.post("/items", async (req: Request, res: Response) => {
  const currentAccount = await getCurrentAccount(req);
  if (!currentAccount) return redirectWithQuery(res, "/login", { error: "出品するにはログインしてください。" });

  const textbookIdText = String(req.body.textbookId || "").trim();
  const title = String(req.body.title || "").trim();
  const author = String(req.body.author || "").trim();
  const condition = String(req.body.condition || "").trim();
  const conditionNote = String(req.body.conditionNote || "").trim();

  if (!condition || !conditionOptions.includes(condition)) {
    return redirectWithQuery(res, "/items/new", { error: "教科書の状態を選択してください。" });
  }

  let createdItem: any;
  if (textbookIdText) {
    const textbookId = Number(textbookIdText);
    if (!Number.isInteger(textbookId)) {
      return redirectWithQuery(res, "/items/new", { error: "選択された教科書が正しくありません。" });
    }
    const textbook = await prisma.textbook.findUnique({ where: { id: textbookId } });
    if (!textbook) return redirectWithQuery(res, "/items/new", { error: "選択された教科書が見つかりません。" });

    createdItem = await prisma.item.create({
      data: {
        sellerAccountId: currentAccount.id,
        textbookId,
        condition,
        conditionNote: conditionNote || null,
      },
    });
    await notifyForNewItem(createdItem.id);
    return redirectWithQuery(res, `/items/${createdItem.id}`, { notice: "登録済みの教科書情報を使って出品しました。" });
  }

  const courseInputs = getCourseInputs(req.body);
  const hasIncompleteCourse = courseInputs.some((pair) => !pair.courseName || !pair.teacherName);
  if (!title || !author || courseInputs.length === 0 || hasIncompleteCourse) {
    return redirectWithQuery(res, "/items/new", {
      error: "新しい教科書として出品する場合は、教科書名、著者名、教科1、担当教員1を入力してください。教科名と担当教員名は必ずセットで入力してください。",
    });
  }

  createdItem = await prisma.$transaction(async (tx: any) => {
    const textbook = await tx.textbook.upsert({
      where: { title_author: { title, author } },
      update: {},
      create: { title, author },
    });

    for (const pair of courseInputs) {
      const course = await tx.course.upsert({
        where: { courseName_teacherName: { courseName: pair.courseName, teacherName: pair.teacherName } },
        update: {},
        create: { courseName: pair.courseName, teacherName: pair.teacherName },
      });
      await tx.textbookCourse.upsert({
        where: { textbookId_courseId: { textbookId: textbook.id, courseId: course.id } },
        update: {},
        create: { textbookId: textbook.id, courseId: course.id },
      });
    }

    return tx.item.create({
      data: {
        sellerAccountId: currentAccount.id,
        textbookId: textbook.id,
        condition,
        conditionNote: conditionNote || null,
      },
    });
  });
  await notifyForNewItem(createdItem.id);
  return redirectWithQuery(res, `/items/${createdItem.id}`, { notice: "新しい教科書情報を登録して出品しました。" });
});

app.post("/items/:itemId/favorite", async (req: Request, res: Response) => {
  const currentAccount = await getCurrentAccount(req);
  const itemId = Number(req.params.itemId);
  const fallback = Number.isInteger(itemId) ? `/items/${itemId}` : "/";
  if (!currentAccount) {
    return redirectWithQuery(res, "/login", { error: "お気に入りを利用するにはログインしてください。" });
  }
  if (!Number.isInteger(itemId)) {
    return redirectBackWithMessage(res, req.body.returnTo, "/", { error: "指定された譲渡品が正しくありません。" });
  }

  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item || item.isCanceled) {
    return redirectBackWithMessage(res, req.body.returnTo, fallback, { error: "この譲渡品はお気に入りに追加できません。" });
  }
  if (item.sellerAccountId === currentAccount.id) {
    return redirectBackWithMessage(res, req.body.returnTo, fallback, { error: "自分の出品はお気に入りに追加できません。" });
  }

  const existing = await prisma.favorite.findUnique({
    where: { accountId_itemId: { accountId: currentAccount.id, itemId } },
  });
  if (existing) {
    await prisma.favorite.delete({
      where: { accountId_itemId: { accountId: currentAccount.id, itemId } },
    });
    return redirectBackWithMessage(res, req.body.returnTo, fallback, { notice: "お気に入りから削除しました。" });
  }

  await prisma.favorite.create({ data: { accountId: currentAccount.id, itemId } });
  return redirectBackWithMessage(res, req.body.returnTo, fallback, { notice: "お気に入りに追加しました。" });
});

app.post("/items/:itemId/edit", async (req: Request, res: Response) => {
  const currentAccount = await getCurrentAccount(req);
  if (!currentAccount) return redirectWithQuery(res, "/login", { error: "出品内容を編集するにはログインしてください。" });

  const itemId = Number(req.params.itemId);
  const condition = String(req.body.condition || "").trim();
  const conditionNote = String(req.body.conditionNote || "").trim();
  if (!Number.isInteger(itemId)) return redirectWithQuery(res, "/", { error: "指定された譲渡品が正しくありません。" });
  if (!condition || !conditionOptions.includes(condition)) {
    return redirectWithQuery(res, `/items/${itemId}/edit`, { error: "教科書の状態を選択してください。" });
  }

  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) return redirectWithQuery(res, "/", { error: "指定された譲渡品が見つかりません。" });
  if (item.sellerAccountId !== currentAccount.id) return redirectWithQuery(res, "/", { error: "出品内容を編集できるのは出品者だけです。" });
  if (item.isCanceled || item.completedAt) {
    return redirectWithQuery(res, `/items/${itemId}`, { error: "取り消し済みまたは譲渡完了済みの出品は編集できません。" });
  }

  const updatedItem = await prisma.item.update({
    where: { id: itemId },
    data: { condition, conditionNote: conditionNote || null },
    include: { textbook: true },
  });
  await notifyFavoriteStateChange(
    prisma,
    updatedItem,
    `condition-${updatedItem.updatedAt.getTime()}`,
    `お気に入りの「${updatedItem.textbook.title}」の状態情報が更新されました。`,
  );
  return redirectWithQuery(res, `/items/${itemId}`, { notice: "出品内容を更新しました。" });
});

app.post("/items/:itemId/cancel", async (req: Request, res: Response) => {
  const currentAccount = await getCurrentAccount(req);
  if (!currentAccount) return redirectWithQuery(res, "/login", { error: "出品を取り消すにはログインしてください。" });

  const itemId = Number(req.params.itemId);
  if (!Number.isInteger(itemId)) return redirectWithQuery(res, "/", { error: "指定された譲渡品が正しくありません。" });
  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) return redirectWithQuery(res, "/", { error: "指定された譲渡品が見つかりません。" });
  if (item.sellerAccountId !== currentAccount.id) return redirectWithQuery(res, "/", { error: "出品を取り消せるのは出品者だけです。" });
  if (item.isCanceled) return redirectWithQuery(res, `/items/${itemId}`, { notice: "この出品はすでに取り消し済みです。" });
  if (item.completedAt) return redirectWithQuery(res, `/items/${itemId}`, { error: "譲渡完了済みの出品は取り消せません。" });

  const updatedItem = await prisma.item.update({
    where: { id: itemId },
    data: { isCanceled: true, canceledAt: new Date(), completedAt: null, receiverAccountId: null },
    include: { textbook: true },
  });
  await notifyFavoriteStateChange(
    prisma,
    updatedItem,
    `canceled-${updatedItem.updatedAt.getTime()}`,
    `お気に入りの「${updatedItem.textbook.title}」は出品者によって取り消されました。`,
  );
  return redirectWithQuery(res, "/mypage", {
    notice: `出品を取り消しました。取り消し済みの出品は自分の画面では${CANCELED_ITEM_VISIBLE_HOURS}時間後に非表示になります。`,
  });
});

app.post("/items/:itemId/complete", async (req: Request, res: Response) => {
  const currentAccount = await getCurrentAccount(req);
  if (!currentAccount) return redirectWithQuery(res, "/login", { error: "譲渡完了にするにはログインしてください。" });

  const itemId = Number(req.params.itemId);
  if (!Number.isInteger(itemId)) return redirectWithQuery(res, "/", { error: "指定された譲渡品が正しくありません。" });
  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) return redirectWithQuery(res, "/", { error: "指定された譲渡品が見つかりません。" });
  if (item.sellerAccountId !== currentAccount.id) return redirectWithQuery(res, "/", { error: "譲渡完了にできるのは出品者だけです。" });
  if (item.isCanceled) return redirectWithQuery(res, `/items/${itemId}`, { error: "取り消し済みの出品は譲渡完了にできません。" });
  if (item.completedAt) return redirectWithQuery(res, `/items/${itemId}`, { notice: "この出品はすでに譲渡完了になっています。" });
  if (!item.receiverAccountId) return redirectWithQuery(res, `/items/${itemId}`, { error: "譲渡完了にする前に、交渉相手を選択してください。" });

  const updatedItem = await prisma.item.update({
    where: { id: itemId },
    data: { completedAt: new Date() },
    include: { textbook: true },
  });
  await notifyFavoriteStateChange(
    prisma,
    updatedItem,
    `completed-${updatedItem.updatedAt.getTime()}`,
    `お気に入りの「${updatedItem.textbook.title}」は譲渡完了になりました。`,
  );
  return redirectWithQuery(res, `/items/${itemId}`, { notice: "譲渡完了として記録しました。" });
});

app.post("/items/:itemId/messages", async (req: Request, res: Response) => {
  const currentAccount = await getCurrentAccount(req);
  if (!currentAccount) return redirectWithQuery(res, "/login", { error: "チャットを送るにはログインしてください。" });

  const itemId = Number(req.params.itemId);
  const message = String(req.body.message || "").trim();
  if (!Number.isInteger(itemId) || !message) {
    return redirectWithQuery(res, Number.isInteger(itemId) ? `/items/${itemId}` : "/", { error: "メッセージ内容を入力してください。" });
  }

  const item = await prisma.item.findUnique({ where: { id: itemId }, include: { textbook: true } });
  if (!item) return redirectWithQuery(res, "/", { error: "指定された譲渡品が見つかりません。" });
  if (item.isCanceled) return redirectWithQuery(res, `/items/${itemId}`, { error: "取り消し済みの出品にはチャットを送れません。" });
  if (item.completedAt) return redirectWithQuery(res, `/items/${itemId}`, { error: "譲渡完了済みの出品にはチャットを送れません。" });

  const chatMessage = await prisma.chatMessage.create({
    data: { itemId, senderAccountId: currentAccount.id, message },
  });
  await notifyChatParticipants(prisma, item, chatMessage);
  res.redirect(`/items/${itemId}`);
});

app.post("/items/:itemId/receiver", async (req: Request, res: Response) => {
  const currentAccount = await getCurrentAccount(req);
  if (!currentAccount) return redirectWithQuery(res, "/login", { error: "交渉相手を選ぶにはログインしてください。" });

  const itemId = Number(req.params.itemId);
  const receiverAccountIdText = String(req.body.receiverAccountId || "").trim();
  if (!Number.isInteger(itemId)) return redirectWithQuery(res, "/", { error: "指定された譲渡品が正しくありません。" });

  const item = await prisma.item.findUnique({ where: { id: itemId }, include: { textbook: true } });
  if (!item) return redirectWithQuery(res, "/", { error: "指定された譲渡品が見つかりません。" });
  if (item.isCanceled) return redirectWithQuery(res, `/items/${itemId}`, { error: "取り消し済みの出品では交渉相手を変更できません。" });
  if (item.completedAt) return redirectWithQuery(res, `/items/${itemId}`, { error: "譲渡完了済みの出品では交渉相手を変更できません。" });
  if (item.sellerAccountId !== currentAccount.id) return redirectWithQuery(res, "/", { error: "交渉相手を選べるのは出品者だけです。" });

  if (!receiverAccountIdText) {
    const updatedItem = await prisma.item.update({
      where: { id: itemId },
      data: { receiverAccountId: null },
      include: { textbook: true },
    });
    await notifyFavoriteStateChange(
      prisma,
      updatedItem,
      `receiver-open-${updatedItem.updatedAt.getTime()}`,
      `お気に入りの「${updatedItem.textbook.title}」は再び募集中になりました。`,
    );
    return redirectWithQuery(res, `/items/${itemId}`, { notice: "交渉相手を未定に戻しました。" });
  }

  const receiverAccountId = Number(receiverAccountIdText);
  if (!Number.isInteger(receiverAccountId)) return redirectWithQuery(res, `/items/${itemId}`, { error: "交渉相手の指定が正しくありません。" });
  if (receiverAccountId === item.sellerAccountId) return redirectWithQuery(res, `/items/${itemId}`, { error: "出品者自身を交渉相手にすることはできません。" });

  const receiver = await prisma.account.findUnique({ where: { id: receiverAccountId } });
  if (!receiver) return redirectWithQuery(res, `/items/${itemId}`, { error: "選択したアカウントが見つかりません。" });
  const hasMessage = await prisma.chatMessage.findFirst({ where: { itemId, senderAccountId: receiverAccountId } });
  if (!hasMessage) {
    return redirectWithQuery(res, `/items/${itemId}`, {
      error: "交渉相手は、この譲渡品のチャットに参加している利用者から選んでください。",
    });
  }

  const updatedItem = await prisma.item.update({
    where: { id: itemId },
    data: { receiverAccountId },
    include: { textbook: true },
  });
  await notifyFavoriteStateChange(
    prisma,
    updatedItem,
    `receiver-${receiverAccountId}-${updatedItem.updatedAt.getTime()}`,
    `お気に入りの「${updatedItem.textbook.title}」は交渉中になりました。`,
  );
  return redirectWithQuery(res, `/items/${itemId}`, { notice: `交渉相手を ${receiver.accountName} に更新しました。` });
});

app.use(async (req: Request, res: Response) => {
  const currentAccount = await getCurrentAccount(req);
  res.status(404).render("not-found", {
    ...await baseRenderData(req, currentAccount),
    requestedPath: req.path,
  });
});

app.listen(PORT, () => {
  console.log(`サーバーが起動しました: http://localhost:${PORT}`);
});
