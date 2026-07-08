export const money2 = (n) =>
  Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function formatControlListDate(dateVal) {
  if (!dateVal) return "";
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  return `${day}-${MONTHS[d.getMonth()]}`;
}

export function formatControlListMoney(amount) {
  const value = money2(amount);
  if (value < 0) {
    return `(${Math.abs(value).toFixed(2)})`;
  }
  return value.toFixed(2);
}

function collectScheduleDates(customer) {
  const dates = [];
  (customer?.annualTreatments || []).forEach((at) => {
    if (Array.isArray(at.scheduleDates)) {
      at.scheduleDates.forEach((d) => {
        if (d) dates.push(new Date(d));
      });
    }
    if (at.scheduleDate) dates.push(new Date(at.scheduleDate));
  });
  (customer?.otherTreatments || []).forEach((ot) => {
    if (ot.date) dates.push(new Date(ot.date));
  });
  return dates.filter((d) => !Number.isNaN(d.getTime()));
}

/** Same billing math as Usage and Billing Summary (ClientReconcile). */
export function summarizeChemicalCustomer(customer) {
  const annualTreatments = customer?.annualTreatments || [];
  const otherTreatments = customer?.otherTreatments || [];

  const scheduledAnnualAmount = annualTreatments
    .filter((at) => at.scheduleDate)
    .reduce((sum, at) => sum + Number(at.price || 0), 0);

  const scheduledOtherAmount = otherTreatments
    .filter((ot) => ot.date)
    .reduce((sum, ot) => {
      const qty = Number(ot.qty || 0);
      const pricePerTank = Number(ot.totalPricePerTank || 0);
      return sum + qty * pricePerTank;
    }, 0);

  const annualProgramTotal = money2(scheduledAnnualAmount + scheduledOtherAmount);

  const completedAnnualAmount = annualTreatments
    .filter(
      (at) =>
        (at.status || "").toString().trim().toLowerCase() === "completed"
    )
    .reduce((sum, at) => sum + Number(at.price || 0), 0);

  const completedOtherAmount = otherTreatments
    .filter(
      (ot) =>
        (ot.status || "").toString().trim().toLowerCase() === "completed"
    )
    .reduce((sum, ot) => {
      const qty = Number(ot.qty || 0);
      const pricePerTank = Number(ot.totalPricePerTank || 0);
      return sum + qty * pricePerTank;
    }, 0);

  const contractTotalRaw = customer?.contractTotal;
  const contractTotalAmount =
    contractTotalRaw === undefined ||
    contractTotalRaw === null ||
    contractTotalRaw === ""
      ? 0
      : money2(contractTotalRaw);

  const calculatedUsedAmount = money2(
    completedAnnualAmount + completedOtherAmount
  );
  const storedUsedAmount = Number(customer?.materialsUsedToDate);

  const usedToDate = money2(
    contractTotalAmount > 0
      ? Math.max(
          Number.isFinite(storedUsedAmount) ? storedUsedAmount : 0,
          calculatedUsedAmount
        )
      : calculatedUsedAmount > 0
        ? calculatedUsedAmount
        : Number.isFinite(storedUsedAmount)
          ? storedUsedAmount
          : 0
  );

  const annualAmount =
    contractTotalAmount > 0 ? contractTotalAmount : annualProgramTotal;

  const remainingAmount =
    contractTotalAmount > 0
      ? money2(contractTotalAmount - usedToDate)
      : money2(annualProgramTotal - usedToDate);

  const scheduleDates = collectScheduleDates(customer);
  let startDate = null;
  let endDate = null;

  if (scheduleDates.length) {
    const times = scheduleDates.map((d) => d.getTime());
    startDate = new Date(Math.min(...times));
    endDate = new Date(Math.max(...times));
  } else if (customer?.createdAt) {
    startDate = new Date(customer.createdAt);
  }

  const planYear = customer?.planYear;
  if (!endDate && planYear) {
    endDate = new Date(planYear, 11, 31);
  }

  return {
    customerId: customer._id,
    customerName: customer.customerName || "-",
    annualAmount,
    usedToDate,
    remainingAmount,
    startDate,
    endDate,
    planYear: planYear || null,
    isLowBalance: remainingAmount >= 0 && remainingAmount < 50,
    isNegativeBalance: remainingAmount < 0,
  };
}

export function buildChemicalCustomerNavState(customer) {
  return {
    customerName: customer.customerName,
    customerId: customer._id,
    contractTotal: customer.contractTotal ?? 0,
    treatments: customer.annualTreatments || [],
    annualTreatments: customer.annualTreatments || [],
    otherTreatments: customer.otherTreatments || [],
  };
}
