export function getItemCourses(item: any) {
  return item.textbook?.textbookCourses?.map((tc: any) => tc.course) || [];
}

export function rankItemsForEnrolledCourses(items: any[], enrolledCourseIds: Set<number>, limit = 8) {
  if (enrolledCourseIds.size === 0) return [];
  return items
    .map((item) => {
      const matchedCourses = getItemCourses(item).filter((course: any) => enrolledCourseIds.has(course.id));
      return {
        ...item,
        matchedCourses,
        dashboardReason: matchedCourses.length > 0 ? `履修中：${matchedCourses.map((course: any) => course.courseName).join("、")}` : null,
      };
    })
    .filter((item) => item.matchedCourses.length > 0)
    .sort((a, b) =>
      b.matchedCourses.length - a.matchedCourses.length ||
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, limit);
}

export function rankTrendingItems(items: any[], limit = 8) {
  return items
    .map((item) => {
      const favorites = item._count?.favorites || 0;
      const views = item._count?.itemViews || 0;
      const trendScore = favorites * 3 + Math.min(views, 20);
      return {
        ...item,
        trendScore,
        dashboardReason: trendScore > 0 ? `注目度 ${trendScore}` : "新着の教科書",
      };
    })
    .sort((a, b) =>
      b.trendScore - a.trendScore ||
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, limit);
}
