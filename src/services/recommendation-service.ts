export type RecommendationSignals = {
  favoriteItems: any[];
  viewedItems: any[];
  excludedItemIds?: Set<number>;
  feedbackItemIds?: Set<number>;
  enrolledCourseIds?: Set<number>;
  now?: Date;
};

function getCourses(item: any) {
  return item.textbook?.textbookCourses?.map((tc: any) => tc.course) || [];
}

function getCourseIds(item: any) {
  return getCourses(item).map((course: any) => course.id);
}

function getTeacherNames(item: any) {
  return getCourses(item).map((course: any) => course.teacherName);
}

export function scoreRecommendationCandidates(candidateItems: any[], signals: RecommendationSignals) {
  const favoriteItems = signals.favoriteItems || [];
  const viewedItems = signals.viewedItems || [];
  const excludedItemIds = signals.excludedItemIds || new Set<number>();
  const feedbackItemIds = signals.feedbackItemIds || new Set<number>();
  const enrolledCourseIds = signals.enrolledCourseIds || new Set<number>();
  const now = signals.now || new Date();
  const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;

  const favoriteCourseIds = new Set<number>(favoriteItems.flatMap(getCourseIds));
  const favoriteTeacherNames = new Set<string>(favoriteItems.flatMap(getTeacherNames));
  const favoriteTextbookIds = new Set<number>(favoriteItems.map((item: any) => item.textbookId));
  const viewedCourseIds = new Set<number>(viewedItems.flatMap(getCourseIds));
  const viewedTeacherNames = new Set<string>(viewedItems.flatMap(getTeacherNames));
  const viewedTextbookIds = new Set<number>(viewedItems.map((item: any) => item.textbookId));

  return candidateItems
    .filter((item) => !excludedItemIds.has(item.id) && !feedbackItemIds.has(item.id))
    .map((item) => {
      const courseIds = getCourseIds(item);
      const teacherNames = getTeacherNames(item);
      let score = 0;
      const reasons: Array<{ points: number; text: string }> = [];

      const addReason = (points: number, text: string) => {
        score += points;
        reasons.push({ points, text });
      };

      if (courseIds.some((id: number) => enrolledCourseIds.has(id))) addReason(6, "履修中の教科に関連");
      if (favoriteTextbookIds.has(item.textbookId)) addReason(7, "お気に入りと同じ教科書");
      if (courseIds.some((id: number) => favoriteCourseIds.has(id))) addReason(5, "お気に入りと同じ教科");
      if (teacherNames.some((name: string) => favoriteTeacherNames.has(name))) addReason(3, "お気に入りと同じ担当教員");
      if (viewedTextbookIds.has(item.textbookId)) addReason(4, "最近見たものと同じ教科書");
      if (courseIds.some((id: number) => viewedCourseIds.has(id))) addReason(3, "最近見た教科書と同じ教科");
      if (teacherNames.some((name: string) => viewedTeacherNames.has(name))) addReason(2, "最近見た教科書と同じ担当教員");
      if (new Date(item.createdAt).getTime() >= sevenDaysAgo) addReason(2, "7日以内の新着");

      const favoriteBonus = Math.min(item._count?.favorites || 0, 4) * 0.5;
      if (favoriteBonus > 0) {
        score += favoriteBonus;
        reasons.push({ points: favoriteBonus, text: "ほかの利用者にも注目されています" });
      }

      reasons.sort((a, b) => b.points - a.points);
      return {
        ...item,
        recommendationScore: score,
        recommendationReason: reasons[0]?.text || "募集中の新着教科書",
        recommendationReasons: reasons.slice(0, 4),
        isFreshRecommendation: new Date(item.createdAt).getTime() >= sevenDaysAgo,
      };
    })
    .sort((a, b) =>
      b.recommendationScore - a.recommendationScore ||
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

export function rerankRecommendations(scoredItems: any[], limit = 6) {
  const selected: any[] = [];
  const selectedIds = new Set<number>();
  const usedTextbookIds = new Set<number>();
  const courseCounts = new Map<number, number>();

  for (const item of scoredItems) {
    if (selected.length >= limit) break;
    if (usedTextbookIds.has(item.textbookId)) continue;
    const courseIds = getCourseIds(item);
    if (courseIds.length > 0 && courseIds.every((id: number) => (courseCounts.get(id) || 0) >= 2)) continue;

    selected.push(item);
    selectedIds.add(item.id);
    usedTextbookIds.add(item.textbookId);
    courseIds.forEach((id: number) => courseCounts.set(id, (courseCounts.get(id) || 0) + 1));
  }

  for (const item of scoredItems) {
    if (selected.length >= limit) break;
    if (selectedIds.has(item.id) || usedTextbookIds.has(item.textbookId)) continue;
    selected.push(item);
    selectedIds.add(item.id);
    usedTextbookIds.add(item.textbookId);
  }

  if (selected.length > 0 && !selected.some((item) => item.isFreshRecommendation)) {
    const fresh = scoredItems.find((item) =>
      item.isFreshRecommendation &&
      !selectedIds.has(item.id) &&
      !usedTextbookIds.has(item.textbookId),
    );
    if (fresh) selected[selected.length - 1] = fresh;
  }

  return selected.slice(0, limit);
}
