const STORAGE_KEY = "FG_HIGHLIGHT_ARCHIVED_PLAN";

export function saveHighlightedArchivedPlan(plan) {
  if (!plan?._id) return;
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        id: plan._id,
        customerName: plan.customerName || "",
        planYear: plan.planYear,
      })
    );
  } catch (_) {
    /* ignore quota errors */
  }
}

export function consumeHighlightedArchivedPlan() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(STORAGE_KEY);
    return JSON.parse(raw);
  } catch (_) {
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}
