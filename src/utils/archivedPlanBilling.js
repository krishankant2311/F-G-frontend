export const sumCompletedTreatmentPrices = (rows = []) =>
  (rows || []).reduce((sum, row) => sum + (Number(row.price) || 0), 0);

export const resolveArchivedPlanBillingDisplay = (plan = {}) => {
  const contractTotal = Number(plan.contractTotal || 0);
  const fromCompleted = sumCompletedTreatmentPrices(plan.completedTreatments);
  const usedAmount = Math.max(Number(plan.usedAmount || 0), fromCompleted);
  const remainingAmount = Math.max(contractTotal - usedAmount, 0);
  return { contractTotal, usedAmount, remainingAmount };
};
