export const conditionOptions: string[] = [
  "新品に近い",
  "比較的きれい",
  "書き込み少しあり",
  "書き込みあり",
  "表紙に傷あり",
  "角に折れあり",
  "全体的に使用感あり",
];

export const searchTargets = ["all", "title", "author", "course", "teacher"] as const;
export const itemStatuses = ["open", "negotiating", "completed", "all"] as const;
export const sortOrders = ["newest", "updated", "condition", "popular"] as const;

export type SearchCriteria = {
  keyword?: string | null;
  searchTarget?: string | null;
  condition?: string | null;
  itemStatus?: string | null;
  sortOrder?: string | null;
};

const conditionRank = new Map(conditionOptions.map((condition, index) => [condition, index]));

export function normalizeSearchCriteria(criteria: SearchCriteria) {
  const keyword = String(criteria.keyword || "").trim();
  const searchTarget = searchTargets.includes(criteria.searchTarget as any)
    ? String(criteria.searchTarget)
    : "all";
  const condition = conditionOptions.includes(criteria.condition as any)
    ? String(criteria.condition)
    : "all";
  const itemStatus = itemStatuses.includes(criteria.itemStatus as any)
    ? String(criteria.itemStatus)
    : "open";
  const sortOrder = sortOrders.includes(criteria.sortOrder as any)
    ? String(criteria.sortOrder)
    : "newest";

  return { keyword, searchTarget, condition, itemStatus, sortOrder };
}

function makeKeywordCondition(keyword: string, searchTarget: string) {
  const contains = { contains: keyword, mode: "insensitive" };
  const conditions: Record<string, any> = {
    title: { textbook: { title: contains } },
    author: { textbook: { author: contains } },
    course: {
      textbook: {
        textbookCourses: { some: { course: { courseName: contains } } },
      },
    },
    teacher: {
      textbook: {
        textbookCourses: { some: { course: { teacherName: contains } } },
      },
    },
  };

  if (searchTarget !== "all" && conditions[searchTarget]) return conditions[searchTarget];
  return { OR: Object.values(conditions) };
}

export function buildItemWhere(criteria: SearchCriteria, options?: { createdAfter?: Date; excludeCanceled?: boolean }) {
  const normalized = normalizeSearchCriteria(criteria);
  const andConditions: any[] = [];

  if (options?.excludeCanceled !== false) andConditions.push({ isCanceled: false });
  if (normalized.itemStatus === "open") {
    andConditions.push({ receiverAccountId: null, completedAt: null });
  } else if (normalized.itemStatus === "negotiating") {
    andConditions.push({ receiverAccountId: { not: null }, completedAt: null });
  } else if (normalized.itemStatus === "completed") {
    andConditions.push({ completedAt: { not: null } });
  }

  if (normalized.keyword) {
    andConditions.push(makeKeywordCondition(normalized.keyword, normalized.searchTarget));
  }
  if (normalized.condition !== "all") {
    andConditions.push({ condition: normalized.condition });
  }
  if (options?.createdAfter) {
    andConditions.push({ createdAt: { gt: options.createdAfter } });
  }

  return andConditions.length > 0 ? { AND: andConditions } : {};
}

export function sortItems(items: any[], sortOrder: string) {
  const sorted = [...items];
  if (sortOrder === "updated") {
    return sorted.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }
  if (sortOrder === "condition") {
    return sorted.sort((a, b) =>
      (conditionRank.get(a.condition) ?? 999) - (conditionRank.get(b.condition) ?? 999) ||
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }
  if (sortOrder === "popular") {
    return sorted.sort((a, b) =>
      (b._count?.favorites || 0) - (a._count?.favorites || 0) ||
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }
  return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function itemStatusCode(item: any) {
  if (item.isCanceled) return "canceled";
  if (item.completedAt) return "completed";
  if (item.receiverAccountId || item.receiver) return "negotiating";
  return "open";
}

function searchableValues(item: any, target: string) {
  const courses = item.textbook?.textbookCourses?.map((tc: any) => tc.course) || [];
  if (target === "title") return [item.textbook?.title || ""];
  if (target === "author") return [item.textbook?.author || ""];
  if (target === "course") return courses.map((course: any) => course.courseName || "");
  if (target === "teacher") return courses.map((course: any) => course.teacherName || "");
  return [
    item.textbook?.title || "",
    item.textbook?.author || "",
    ...courses.flatMap((course: any) => [course.courseName || "", course.teacherName || ""]),
  ];
}

export function itemMatchesSearch(item: any, criteria: SearchCriteria) {
  const normalized = normalizeSearchCriteria(criteria);
  if (item.isCanceled) return false;
  if (normalized.itemStatus !== "all" && itemStatusCode(item) !== normalized.itemStatus) return false;
  if (normalized.condition !== "all" && item.condition !== normalized.condition) return false;
  if (!normalized.keyword) return true;

  const keyword = normalized.keyword.toLocaleLowerCase("ja");
  return searchableValues(item, normalized.searchTarget).some((value) =>
    String(value).toLocaleLowerCase("ja").includes(keyword),
  );
}

export function buildSearchQuery(criteria: SearchCriteria, extra?: Record<string, string | number>) {
  const normalized = normalizeSearchCriteria(criteria);
  const params = new URLSearchParams();
  if (normalized.keyword) params.set("q", normalized.keyword);
  params.set("target", normalized.searchTarget);
  params.set("condition", normalized.condition);
  params.set("status", normalized.itemStatus);
  params.set("sort", normalized.sortOrder);
  for (const [key, value] of Object.entries(extra || {})) params.set(key, String(value));
  return params.toString();
}

export function describeSavedSearch(search: any) {
  const targetLabels: Record<string, string> = {
    all: "すべて",
    title: "教科書名",
    author: "著者名",
    course: "教科名",
    teacher: "担当教員名",
  };
  const statusLabels: Record<string, string> = {
    open: "募集中",
    negotiating: "交渉中",
    completed: "譲渡完了",
    all: "すべての取引状態",
  };
  const parts = [
    search.keyword ? `「${search.keyword}」` : "キーワード指定なし",
    targetLabels[search.searchTarget] || "すべて",
    search.condition && search.condition !== "all" ? search.condition : "本の状態指定なし",
    statusLabels[search.itemStatus] || "募集中",
  ];
  return parts.join("・");
}
