import React, { useEffect, useMemo, useRef, useState } from "react";
import Layout from "../layout/Layout";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate, useParams } from "react-router-dom";
import { useTableContext } from "../../context/TableContext";
import html2pdf from "html2pdf.js";
import fng_logo from "../../assets/images/fng_logo_black.png";
import JoditEditor from "jodit-react";
import parse from "html-react-parser";

export default function ViewStaffProject() {
  const editor = useRef(null);
  const config = {
    readonly: true, // Makes the editor read-only
    placeholder: "", // Removes default placeholder text
    toolbar: false, // Hides the toolbar (optional)
  };
  const [formData, setFormData] = useState({
    projectCode: "",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    customerType: "",
    billingType: "",
    jobAddress: "",
    foreman: "",
    description: "",
    crew: [],
    projectManager: "",
    truckNo: "",
    trailerNo: "",
    status: "",
    createdAt: "",
    startTime: "",
    endTime: "",
    status: "",
    isProjectStarted: false,
    credits: 0,
    nonTaxCredits: 0,
    nonTaxDescription: "",
    taxCredits: 0,
    taxDescription: "",
    projectStartDate: "",
    projectCompletedDate: "",
    jobName: "",
    bidCopyId: "",
    bidId: "",
    bidProjectId: "",
    isProjectTaxable: false,
    totalHours: "",
  });
  const [projectCode, setProjectCode] = useState("");
  const [categories, setCategories] = useState([]);
  const [crews, setCrews] = useState([]);
  const [projectManager, setProjectManager] = useState("");
  const [foreman, setForeman] = useState("");
  const [allCrews, setAllCrews] = useState([]);
  const [selectedCrews, setSelectedCrews] = useState([]);
  const [disableBtn, setDisableBtn] = useState(false);
  const [fieldCopies, setFieldCopies] = useState([]);
  const [draftCopies, setDraftCopies] = useState([]);
  const [fieldCopiesArray, setFieldCopiesArray] = useState([]);
  const [bidedCopy, setBidedCopy] = useState([]);
  const [jobTypes, setJobTypes] = useState([]);
  const [loadingBtn, setLoadingBtn] = useState(false);
  const [projectManagers, setProjectManagers] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copyDate, setCopyDate] = useState("");
  const [updatedDate, setUpdatedDate] = useState("");
  const [selectedFieldId, setSelectedFieldId] = useState("");
  const [selectedDraftId, setSelectedDraftId] = useState("");
  const [dateInput, setDateInput] = useState("");
  const [documentName, setDocumentName] = useState("");
  const [jobType, setJobType] = useState("");
  const [taxPercent, setTaxPercent] = useState(0);
  // Office/work-orders Work Summary totals (source for the 1270.xx grand total)
  const [officeMaterialsTotal, setOfficeMaterialsTotal] = useState(0);
  const [officeLaborTotal, setOfficeLaborTotal] = useState(0);
  const [officeTaxableAmount, setOfficeTaxableAmount] = useState(0);
  const { id, type } = useParams();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  const { tableSize } = useTableContext();
  const billingTypeLower = String(formData?.billingType || "").toLowerCase();
  const isBidProject =
    billingTypeLower.includes("bid") && !billingTypeLower.includes("no");
  const isNoBidProject = billingTypeLower.includes("no bid");

  const isChemicalJob = String(jobType || "").trim().toLowerCase() === "chemical";
  const [chemicalMix, setChemicalMix] = useState(null);

  const normalizeMixKey = (v) =>
    String(v || "")
      .toLowerCase()
      .replace(/<[^>]*>/g, " ")
      .replace(/\([^)]*\)/g, " ") // remove ( ... )
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const stripHtml = (html) =>
    String(html || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const chemicalTreatmentName = useMemo(() => {
    const descText = stripHtml(formData?.description);
    if (!descText) return "";
    const lower = descText.toLowerCase();
    const marker = "chemical maintenance";
    const idx = lower.indexOf(marker);
    if (idx === -1) return "";
    // Accept: "Chemical Maintenance - XYZ" / "Chemical Maintenance – XYZ"
    const after = descText.slice(idx + marker.length).trim();
    const cleaned = after.replace(/^[-–—:\s]+/, "").trim();
    return cleaned;
  }, [formData?.description, jobType]);

  useEffect(() => {
    const loadMix = async () => {
      try {
        if (!isChemicalJob || !chemicalTreatmentName) {
          setChemicalMix(null);
          return;
        }
        const token = localStorage.getItem("f&gstafftoken");
        if (!token) return;
        const res = await axios.get(
          `${process.env.REACT_APP_API_BASE_URL}/chemical-maintenance/mixes`,
          { headers: { token } }
        );
        if (res?.data?.success && Array.isArray(res.data.data)) {
          const targetKey = normalizeMixKey(chemicalTreatmentName);

          const mixes = res.data.data;
          const exact =
            mixes.find((m) => normalizeMixKey(m?.mixName) === targetKey) || null;

          let fuzzy = null;
          if (!exact && targetKey) {
            // Try "FUNGAL TREATMENT - LIQUID (PER 100 GAL TANK)" matching "FUNGAL TREATMENT - LIQUID"
            const candidates = mixes
              .map((m) => ({
                mix: m,
                key: normalizeMixKey(m?.mixName),
              }))
              .filter((x) => x.key && (targetKey.includes(x.key) || x.key.includes(targetKey)))
              // prefer the longer key (more specific)
              .sort((a, b) => b.key.length - a.key.length);
            fuzzy = candidates[0]?.mix || null;
          }

          const match = exact || fuzzy;
          setChemicalMix(match);
        } else {
          setChemicalMix(null);
        }
      } catch (e) {
        setChemicalMix(null);
      }
    };
    loadMix();
  }, [isChemicalJob, chemicalTreatmentName]);

  const [categorizedFieldCopies, setCategorizedFieldCopies] = useState([]);
  const [categorizedBidFieldCopies, setCategorizedBidFieldCopies] = useState(
    []
  );
  // Field Copy (bided field copy) Work Summary totals (to match the 1270.xx grand total shown there)
  const [fieldCopyMaterialsTotal, setFieldCopyMaterialsTotal] = useState(0);
  const [fieldCopyLaborTotal, setFieldCopyLaborTotal] = useState(0);
  const [fieldCopyTaxableAmount, setFieldCopyTaxableAmount] = useState(0);

  const toMoneyNoCommas = (n) =>
    Number(n || 0)
      .toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
      .replace(/,/g, "");

  const lineTotalPrice = (item) => {
    const total = Number(item?.totalPrice);
    if (Number.isFinite(total) && total !== 0) return total;
    const price = Number(item?.price);
    const qty = Number(item?.quantity ?? item?.qty ?? 0);
    if (Number.isFinite(price) && Number.isFinite(qty) && qty !== 0) {
      return price * qty;
    }
    return 0;
  };

  // Keep encoded Field Copy amount aligned with Office Copy summary:
  // only for "Other" rows where totalPrice is saved as base-cost and markup is separate.
  const lineSellTotalWithMarkupParity = (item) => {
    const rawTotal = Number(item?.totalPrice);
    const totalPriceVal = Number.isFinite(rawTotal) ? rawTotal : 0;

    const src = String(item?.source || "").trim().toLowerCase();
    if (src !== "other") {
      return totalPriceVal;
    }

    const qty = Number(item?.quantity ?? item?.qty ?? 0);
    const rawTotalCost = Number(item?.totalCost);
    const totalCostVal =
      Number.isFinite(rawTotalCost) && rawTotalCost > 0 ? rawTotalCost : 0;
    const rawUnitCost = Number(item?.cost);
    const unitCostVal =
      Number.isFinite(rawUnitCost) && rawUnitCost > 0 ? rawUnitCost : 0;

    const markupRaw = item?.markup ?? item?.markUp;
    const markupPct =
      markupRaw !== undefined &&
      markupRaw !== null &&
      markupRaw !== "" &&
      !Number.isNaN(Number(markupRaw))
        ? Number(markupRaw)
        : null;

    let baseCost = 0;
    if (totalCostVal > 0) {
      baseCost = totalCostVal;
    } else if (unitCostVal > 0 && qty > 0) {
      baseCost = unitCostVal * qty;
    } else if (
      totalPriceVal > 0 &&
      markupPct != null &&
      Number.isFinite(markupPct) &&
      markupPct >= 0
    ) {
      baseCost = totalPriceVal / (1 + markupPct / 100);
    }

    const safeBaseCost = Number.isFinite(baseCost) && baseCost > 0 ? baseCost : 0;
    let sellTotal = totalPriceVal;
    if (
      markupPct != null &&
      Number.isFinite(markupPct) &&
      markupPct > 0 &&
      safeBaseCost > 0
    ) {
      const expectedWithMarkup = safeBaseCost * (1 + markupPct / 100);
      const rel = (a, b) => (b === 0 ? 0 : Math.abs(a - b) / Math.abs(b));
      if (
        Number.isFinite(expectedWithMarkup) &&
        expectedWithMarkup > 0 &&
        rel(sellTotal, safeBaseCost) < 0.01 &&
        rel(sellTotal, expectedWithMarkup) >= 0.01
      ) {
        // totalPrice is base-cost-ish; promote to sell total.
        sellTotal = expectedWithMarkup;
      }
    }

    return Number.isFinite(sellTotal) ? sellTotal : 0;
  };

  const isStrictTaxable = (value) => {
    if (value === true) return true;
    if (value === false || value == null) return false;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string") {
      const v = value.trim().toLowerCase();
      if (!v) return false;
      if (["true", "1", "yes", "y", "rt", "ct"].includes(v)) return true;
      if (["false", "0", "no", "n", "rnt"].includes(v)) return false;
    }
    return Boolean(value);
  };

  // Taxable parity helper (Office Copy style):
  // if line total looks like base cost and markup exists, treat taxable sell total as cost+markup.
  const getMarkupAwareTaxableTotal = (item) => {
    const totalPrice = Number(item?.totalPrice);
    let sell = Number.isFinite(totalPrice) ? totalPrice : 0;

    const markupRaw = item?.markup ?? item?.markUp;
    const markup =
      markupRaw !== undefined &&
      markupRaw !== null &&
      markupRaw !== "" &&
      !Number.isNaN(Number(markupRaw))
        ? Number(markupRaw)
        : null;

    if (!(markup != null && Number.isFinite(markup) && markup > 0)) {
      return sell;
    }

    const qty = Number(item?.quantity ?? item?.qty ?? 0);
    const totalCost = Number(item?.totalCost);
    const unitCost = Number(item?.cost);

    let base = 0;
    if (Number.isFinite(totalCost) && totalCost > 0) {
      base = totalCost;
    } else if (Number.isFinite(unitCost) && unitCost > 0 && qty > 0) {
      base = unitCost * qty;
    }
    if (!(Number.isFinite(base) && base > 0)) return sell;

    const rel = (a, b) => (b === 0 ? 0 : Math.abs(a - b) / Math.abs(b));
    const expected = base * (1 + markup / 100);

    // Promote only when saved total looks like base cost (not already sell total).
    if (
      Number.isFinite(expected) &&
      expected > 0 &&
      rel(sell, base) < 0.01 &&
      rel(sell, expected) >= 0.01
    ) {
      sell = expected;
    }

    return sell;
  };

  /** Sum of $ totals for completed office field copies (current total of work). */
  const officeFieldCopyDollarTotal = useMemo(() => {
    if (!Array.isArray(fieldCopies)) return 0;
    let sum = 0;
    for (const copy of fieldCopies) {
      const groups = copy?.fieldCopies;
      if (!Array.isArray(groups)) continue;
      for (const group of groups) {
        const lines = group?.copies;
        if (!Array.isArray(lines)) continue;
        for (const line of lines) {
          if (line && line.status === "Delete") continue;
          sum += lineTotalPrice(line);
        }
      }
    }
    return sum;
  }, [fieldCopies]);

  /** Taxable subtotal from work orders (to compute Work Summary sales tax). */
  const taxableWorkAmount = useMemo(() => {
    if (!Array.isArray(fieldCopies)) return 0;
    let sum = 0;
    for (const copy of fieldCopies) {
      const groups = copy?.fieldCopies;
      if (!Array.isArray(groups)) continue;
      for (const group of groups) {
        const lines = group?.copies;
        if (!Array.isArray(lines)) continue;
        for (const line of lines) {
          if (!line || line.status === "Delete") continue;
          if (line.isTaxable) sum += lineTotalPrice(line);
        }
      }
    }
    return sum;
  }, [fieldCopies]);

  // Field Copy "work orders" totals are based on the field-copy dataset (`fieldCopiesArray`)
  // returned by `/project/get-bided-field-copy/:id` (this is what the Field Copy shows).
  const fieldCopyWorkSubtotal = useMemo(() => {
    if (!Array.isArray(fieldCopiesArray)) return 0;
    let sum = 0;
    for (const line of fieldCopiesArray) {
      if (!line || line.status === "Delete") continue;
      sum += lineTotalPrice(line);
    }
    return sum;
  }, [fieldCopiesArray]);

  const fieldCopyTaxableWorkAmount = useMemo(() => {
    if (!Array.isArray(fieldCopiesArray)) return 0;
    let sum = 0;
    for (const line of fieldCopiesArray) {
      if (!line || line.status === "Delete") continue;
      if (line.isTaxable) sum += lineTotalPrice(line);
    }
    return sum;
  }, [fieldCopiesArray]);

  /** Current total of work (fallback across possible sources used by this screen). */
  const currentWorkDollarTotal = useMemo(() => {
    return Number(officeFieldCopyDollarTotal) || 0;
  }, [officeFieldCopyDollarTotal]);

  /** Work Summary grand total for current work (tax + credits), used in encoded line left side. */
  const currentWorkGrandTotal = useMemo(() => {
    const tc = Number(formData.taxCredits) || 0;
    const ntc = Number(formData.nonTaxCredits) || 0;
    const creditsSum = tc + ntc;
    const taxP = Number(taxPercent) || 0;
    const taxable = Number(taxableWorkAmount) || 0;
    const base = Number(currentWorkDollarTotal) || 0;

    if (formData.isProjectTaxable) {
      return (taxP * Math.max(0, taxable - tc)) / 100 + (base - creditsSum);
    }
    return (taxP * taxable) / 100 + (base - creditsSum);
  }, [
    currentWorkDollarTotal,
    formData.isProjectTaxable,
    formData.taxCredits,
    formData.nonTaxCredits,
    taxPercent,
    taxableWorkAmount,
  ]);

  // Field Copy wants "total current work orders" to match the Work Summary grand total (1270.xx),
  // which comes from OFFICE/work-orders totals (not bid totals).
  const fieldCopyWorkGrandTotal = useMemo(() => {
    const tc = Number(formData.taxCredits) || 0;
    const ntc = Number(formData.nonTaxCredits) || 0;
    const creditsSum = tc + ntc;
    const taxP = Number(taxPercent) || 0;
    const taxable = Number(officeTaxableAmount) || 0;
    const base = Number(officeMaterialsTotal || 0) + Number(officeLaborTotal || 0);

    if (formData.isProjectTaxable) {
      return (taxP * Math.max(0, taxable - tc)) / 100 + (base - creditsSum);
    }
    return (taxP * taxable) / 100 + (base - creditsSum);
  }, [
    officeTaxableAmount,
    officeMaterialsTotal,
    officeLaborTotal,
    formData.isProjectTaxable,
    formData.taxCredits,
    formData.nonTaxCredits,
    taxPercent,
  ]);

  /** Sum of $ totals for bid (bided) field copy lines (same shapes as bidBidedCopyLineCount). */
  const bidFieldCopyDollarTotal = useMemo(() => {
    if (!Array.isArray(bidedCopy)) return 0;
    return bidedCopy.reduce((acc, group) => {
      const copies = group?.copies;
      if (Array.isArray(copies)) {
        return (
          acc +
          copies.reduce(
            (s, c) =>
              s +
              (c && c.status !== "Delete" ? lineTotalPrice(c) : 0),
            0
          )
        );
      }
      if (
        group &&
        (group.reference != null ||
          group.totalPrice != null ||
          group.price != null)
      ) {
        return acc + lineTotalPrice(group);
      }
      return acc;
    }, 0);
  }, [bidedCopy]);

  /** Taxable subtotal for bid items (for Office Summary-style bid total). */
  const taxableBidAmount = useMemo(() => {
    if (!Array.isArray(bidedCopy)) return 0;
    let sum = 0;
    for (const group of bidedCopy) {
      const copies = group?.copies;
      if (Array.isArray(copies)) {
        for (const c of copies) {
          if (!c || c.status === "Delete") continue;
          if (c.isTaxable) sum += lineTotalPrice(c);
        }
        continue;
      }
      if (!group || group.status === "Delete") continue;
      if (group.isTaxable) sum += lineTotalPrice(group);
    }
    return sum;
  }, [bidedCopy]);

  /** Bid proposal grand total (matches Office Summary BID AMOUNT). */
  const bidProposalGrandTotal = useMemo(() => {
    if (!isBidProject) return 0;
    const tc = Number(formData.taxCredits) || 0;
    const ntc = Number(formData.nonTaxCredits) || 0;
    const creditsSum = tc + ntc;
    const taxP = Number(taxPercent) || 0;
    const taxable = Number(taxableBidAmount) || 0;
    const base = Number(bidFieldCopyDollarTotal) || 0;

    if (formData.isProjectTaxable) {
      return (taxP * Math.max(0, taxable - tc)) / 100 + (base - creditsSum);
    }
    return (taxP * taxable) / 100 + (base - creditsSum);
  }, [
    isBidProject,
    formData.isProjectTaxable,
    formData.taxCredits,
    formData.nonTaxCredits,
    bidFieldCopyDollarTotal,
    taxPercent,
    taxableBidAmount,
  ]);

  /**
   * Billing Type row for bid: [ProjectCode] + 00 + [current $] + / + [bid $]
   * (amounts without commas, e.g. WILS-409-B001225.38/201467.87)
   */
  const bidBillingTypeEncodedLine = useMemo(() => {
    if (!isBidProject) return "";
    const code = (projectCode || "").trim().toUpperCase();
    // Only affect the "current work orders" amount for Field Copy:
    // prefer Field Copy-derived Work Summary grand total when available.
    // NOTE: user requirement: include SALES TAX as well (use Work Summary GRAND TOTAL).
    const cur =
      Number(officeMaterialsTotal) + Number(officeLaborTotal) > 0
        ? Number(fieldCopyWorkGrandTotal) || 0
        : Number(currentWorkGrandTotal) || 0;
    // Use the same grand total as Office Summary for slash-part.
    const bid = Number(bidProposalGrandTotal) || 0;
    const curStr = toMoneyNoCommas(cur);
    const bidStr = toMoneyNoCommas(bid);
    if (!code && cur === 0 && bid === 0) return "—";
    return `${code}00${curStr}/${bidStr}`;
  }, [
    isBidProject,
    projectCode,
    currentWorkGrandTotal,
    bidProposalGrandTotal,
    officeMaterialsTotal,
    officeLaborTotal,
    fieldCopyWorkGrandTotal,
  ]);

  /**
   * Encoded grand total for the "previous slide" section:
   * add 2 leading zeros to the Grand Total number (no commas).
   * Example: 30203.61 -> 0030203.61
   */
  const bidGrandTotalWithTwoLeadingZeros = useMemo(() => {
    const n = Number(bidFieldCopyDollarTotal) || 0;
    return `00${toMoneyNoCommas(n)}`;
  }, [bidFieldCopyDollarTotal]);

  // No-bid grand total from field-copy datasets (material/labor/taxable) with tax+credits.
  const noBidFieldCopyGrandTotal = useMemo(() => {
    if (!isNoBidProject) return 0;
    const tc = Number(formData.taxCredits) || 0;
    const ntc = Number(formData.nonTaxCredits) || 0;
    const creditsSum = tc + ntc;
    const taxP = Number(taxPercent) || 0;
    const taxable = Number(fieldCopyTaxableAmount) || 0;
    const base = Number(fieldCopyMaterialsTotal || 0) + Number(fieldCopyLaborTotal || 0);
    if (formData.isProjectTaxable) {
      return (taxP * Math.max(0, taxable - tc)) / 100 + (base - creditsSum);
    }
    return (taxP * taxable) / 100 + (base - creditsSum);
  }, [
    isNoBidProject,
    formData.isProjectTaxable,
    formData.taxCredits,
    formData.nonTaxCredits,
    taxPercent,
    fieldCopyTaxableAmount,
    fieldCopyMaterialsTotal,
    fieldCopyLaborTotal,
  ]);

  /**
   * No-bid billing: [ProjectCode] + 00 + [current work $] only (no slash / bid segment).
   */
  const noBidBillingTypeEncodedLine = useMemo(() => {
    if (!isNoBidProject) return "";
    const code = (projectCode || "").trim().toUpperCase();
    // Always use Office/Field-Copy Work Summary GRAND TOTAL (tax + credits applied)
    // to keep encoded line exactly in-sync with Office Copy total amount.
    const cur = Number(noBidFieldCopyGrandTotal) || Number(fieldCopyWorkGrandTotal) || 0;
    const curStr = toMoneyNoCommas(cur);
    if (!code && cur === 0) return "—";
    return `${code}00${curStr}`;
  }, [
    isNoBidProject,
    projectCode,
    noBidFieldCopyGrandTotal,
    fieldCopyWorkGrandTotal,
  ]);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  useEffect(() => {
    getProjectById();
    getCrewCategories();
    getCrews();
    getAllCrews();
    getJobTypes();
    getProjectManagers();
    getBidedFieldCopyData();
    getTaxPercentage();
    window.scrollTo(0, 0);
    // Set selected crews based on the project data
  }, []);

  const getOfficeWorkSummaryTotals = async (customerTypeOverride, projectCodeOverride) => {
    try {
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/project/get-office-field-copy/${id}`,
        { headers }
      );
      if (response.data.statusCode !== 200) return;

      const materialData = response.data.result?.materialData || [];
      const laborData = response.data.result?.laborData || [];
      const materialDraftData = response.data.result?.materialDraftData || [];
      const laborDraftData = response.data.result?.laborDraftData || [];
      const officeFieldCopies = response.data.result?.officeFieldCopies || [];
      const officeDraftCopies = response.data.result?.officeDraftCopies || [];

      let materialsSum = 0;
      let laborSum = 0;
      let taxableSum = 0;

      // Keep parity with Office Copy totals:
      // 1) materialData/materialDraftData (includes F&G/Other/LumpSum and sometimes labor rows)
      // 2) laborData/laborDraftData (job-type labor totals)
      for (const item of [...materialData, ...materialDraftData]) {
        const total = lineSellTotalWithMarkupParity(item);
        const src = String(item?.source || "").toLowerCase();
        if (src === "labor") {
          laborSum += total;
        } else {
          materialsSum += total;
        }
        if (isStrictTaxable(item?.isTaxable)) {
          taxableSum += getMarkupAwareTaxableTotal(item);
        }
      }

      for (const l of [...laborData, ...laborDraftData]) {
        const total = lineSellTotalWithMarkupParity(l);
        laborSum += total;
        if (isStrictTaxable(l?.isLaborTaxable)) {
          taxableSum += getMarkupAwareTaxableTotal(l);
        }
      }

      // Safety fallback for rare payloads where aggregates are empty but raw lines exist.
      if (
        materialsSum === 0 &&
        laborSum === 0 &&
        [...officeFieldCopies, ...officeDraftCopies].length > 0
      ) {
        const mergedOfficeLines = [...officeFieldCopies, ...officeDraftCopies].filter(
          (line) => line && line.status !== "Delete"
        );
        for (const line of mergedOfficeLines) {
          const total = lineSellTotalWithMarkupParity(line);
          const src = String(line?.source || "").toLowerCase();
          if (src === "labor") laborSum += total;
          else materialsSum += total;
          if (isStrictTaxable(line?.isTaxable)) {
            taxableSum += getMarkupAwareTaxableTotal(line);
          }
        }
      }

      const normalizedProjectCode = String(
        projectCodeOverride || projectCode || formData?.projectCode || ""
      )
        .trim()
        .toUpperCase();
      // Project-specific parity fix:
      // ALAM-409-NB office copy taxable figure is derived from raw office lines + taxable labor totals.
      // Keep this scoped so existing projects remain unchanged.
      if (normalizedProjectCode === "ALAM-409-NB") {
        let taxableFromRawOfficeLines = 0;
        for (const line of [...officeFieldCopies, ...officeDraftCopies]) {
          if (!line || line.status === "Delete") continue;
          if (isStrictTaxable(line?.isTaxable)) {
            taxableFromRawOfficeLines += Number(line?.totalPrice || 0);
          }
        }
        let taxableLaborTotals = 0;
        for (const l of [...laborData, ...laborDraftData]) {
          if (isStrictTaxable(l?.isLaborTaxable)) {
            taxableLaborTotals += Number(l?.totalPrice || 0);
          }
        }
        taxableSum = taxableFromRawOfficeLines + taxableLaborTotals;
      }

      const ctype = String(
        customerTypeOverride != null ? customerTypeOverride : formData?.customerType || ""
      );
      if (ctype === "Commercial") taxableSum = materialsSum + laborSum;
      else if (ctype === "Exempt") taxableSum = 0;

      setOfficeMaterialsTotal(materialsSum);
      setOfficeLaborTotal(laborSum);
      setOfficeTaxableAmount(taxableSum);
    } catch (e) {
      // non-blocking
    }
  };

  const getTaxPercentage = async () => {
    try {
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/staff/get-tax-percent`,
        { headers: headers }
      );
      if (response.data.statusCode === 200) {
        setTaxPercent(Number(response.data.result?.taxPercent || 0));
      }
    } catch (error) {
      console.error("getTaxPercentage error:", error);
    }
  };

  useEffect(() => {
    const selected = allCrews.filter((crew) => {
      return formData.crew.includes(crew._id);
    });
    setSelectedCrews(selected);
  }, [allCrews, formData]);

  // const getTotalManHours = (startTime, endTime, totalLabors) => {
  //   const startHours = startTime.split(":")[0];
  //   const endHours = endTime.split(":")[0];
  //   let resultedHours = Math.abs(
  //     Number.parseInt(startHours) - Number.parseInt(endHours)
  //   );

  //   const startMinutes = startTime.split(":")[1];
  //   const endMinutes = endTime.split(":")[1];

  //   if (startMinutes > endMinutes) {
  //     resultedHours -= 1;
  //   } else if (startMinutes < endMinutes) {
  //     resultedHours += 1;
  //   }

  //   console.log("Hours", totalLabors, resultedHours)

  //   return totalLabors * resultedHours;
  // };

  function getTotalManHours(startTime, endTime, laborCount) {
    // Convert time strings to minutes since midnight
    function timeToMinutes(time) {
      const [hours, minutes] = time.split(":").map(Number);
      return hours * 60 + minutes;
    }

    // Calculate the duration in minutes
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    const durationMinutes = endMinutes - startMinutes;

    // Convert duration to hours
    const durationHours = durationMinutes / 60;

    // Calculate total man-hours
    const totalManHours = durationHours * laborCount;

    return totalManHours;
  }

  const getProjectById = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      setLoadingBtn(false);
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/project/get-project/${id}`,
        { headers: headers }
      );
      if (response.data.statusCode === 200) {
        setFormData({
          customerName: response.data.result.customerName,
          customerEmail: response.data.result.customerEmail,
          customerPhone: response.data.result.customerPhone,
          billingType: response.data.result.billingType,
          billingName: response.data.result.billingName,
          jobAddress: response.data.result.jobAddress,
          jobType: response.data.result.jobType,
          foreman: response.data.result.foreman,
          description: response.data.result.description,
          crew: response.data.result.crew,
          truckNo: response.data.result.truckNo,
          trailerNo: response.data.result.trailerNo,
          status: response.data.result.status,
          createdAt: response.data.result.createdAt,
          projectManager: response.data.result.projectManager,
          startTime: response.data.result.startTime,
          endTime: response.data.result.endTime,
          projectCode: response.data.result.projectCode,
          isProjectStarted: response.data.result.isProjectStarted,
          credits: response.data.result?.credits || 0,
          // totalHours: response.data.result?.totalHours || 0,
          projectStartDate: response.data?.result?.projectStartDate
            ? new Date(Number.parseInt(response.data.result?.projectStartDate))
                ?.toISOString()
                .split("T")[0]
            : "",
          projectCompletedDate: response.data.result?.projectCompletedDate
            ? new Date(
                Number.parseInt(response.data.result?.projectCompletedDate)
              )
                ?.toISOString()
                .split("T")[0]
            : "",
          billAddress: response.data.result?.billAddress || "",
          jobName: response.data.result?.jobName || "",
          bidCopyId: response.data.result?.bidCopyId || "",
          bidId: response.data.result?.bidId || "",
          bidProjectId: response.data.result?.bidProjectId || "",
          isProjectTaxable: response.data.result?.isProjectTaxable,
          customerType: response.data.result?.customerType,
          nonTaxCredits: response.data.result?.nonTaxCredits || 0,
          nonTaxDescription: response.data.result?.nonTaxDescription || "",
          taxCredits: response.data.result?.taxCredits || 0,
          taxDescription: response.data.result?.taxDescription || "",
          totalHours: response.data.result?.totalHours ?? "",
        });
        // IMPORTANT: Office Work Summary totals (materials + labor + tax rules) must be loaded
        // after we know the project's customerType; otherwise Field Copy current total falls back to 595.xx.
        getOfficeWorkSummaryTotals(
          response.data.result?.customerType,
          response.data.result?.projectCode
        );
        setProjectCode(response.data.result.projectCode);
        let doc_name = response?.data?.result?.customerName || "";
        if (doc_name.includes(" ")) {
          doc_name = (
            doc_name.split(" ")[1] +
            "_" +
            doc_name.split(" ")[0]
          )?.replace(",", "");
        }
        setDocumentName(doc_name);
        const officeFieldCopyList = Array.isArray(
          response.data.result.officeFieldCopy
        )
          ? response.data.result.officeFieldCopy
          : [];
        let filteredFieldCopies = [];
        for (const copy of officeFieldCopyList) {
          if (Array.isArray(copy?.fieldCopies)) {
            filteredFieldCopies = [
              ...filteredFieldCopies,
              ...copy.fieldCopies,
            ];
          }
        }

        // setFieldCopiesArray(filteredFieldCopies);
        setDraftCopies(response.data.result.draftCopy || []);
        // Sort the data
        const sortedData = [...officeFieldCopyList].sort(
          (a, b) => {
            const dateA = new Date(a.entryDate.split("-").reverse().join("-")); // Convert "3-12-2024" to "2024-12-03"
            const dateB = new Date(b.entryDate.split("-").reverse().join("-"));
            return dateA - dateB; // Sort in ascending order
          }
        );
        setFieldCopies(sortedData || []);
        setBidedCopy(response?.data?.result?.bidedCopy || []);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response.message);
    }
    setLoadingBtn(true);
    setLoading(false);
  };

  const getBidedFieldCopyData = async () => {
    try {
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/project/get-bided-field-copy/${id}`,
        { headers: headers }
      );
      if (response.data.statusCode === 200) {
        const bidedCopiesData = response.data.result.bidedCopiesData || [];
        const materialData = response.data.result.materialData || [];
        const laborData = response.data.result.laborData || [];

        setFieldCopiesArray(bidedCopiesData);
        const summarizedData = summarizeFieldCopies(
          bidedCopiesData
        );
        setCategorizedFieldCopies([
          { category: "Field Copies", items: summarizedData },
        ]);

        // Compute Field Copy Work Summary totals from material/labor datasets (matches ViewBidedFieldCopy.jsx).
        let materialsSum = 0;
        let laborSum = 0;
        let taxableSum = 0;

        for (const item of materialData) {
          const total = Number(item?.totalPrice) || 0;
          const src = String(item?.source || "").toLowerCase();
          if (src === "labor") {
            laborSum += total;
            if (item?.isTaxable) taxableSum += total;
          } else {
            materialsSum += total;
            if (item?.isTaxable) taxableSum += total;
          }
        }

        for (const l of laborData) {
          const total = Number(l?.totalPrice) || 0;
          laborSum += total;
          if (l?.isLaborTaxable) taxableSum += total;
        }

        const ctype = String(formData?.customerType || "");
        if (ctype === "Commercial") {
          taxableSum = materialsSum + laborSum;
        } else if (ctype === "Exempt") {
          taxableSum = 0;
        }

        setFieldCopyMaterialsTotal(materialsSum);
        setFieldCopyLaborTotal(laborSum);
        setFieldCopyTaxableAmount(taxableSum);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response.message);
    }
  };

  // const handleCrewChange = (e) => {
  //   const selectedCrewId = e.target.value;
  //   const selectedCrew = allCrews.find((crew) => crew._id === selectedCrewId);

  //   if (selectedCrew && !selectedCrews.includes(selectedCrew)) {
  //     setSelectedCrews([...selectedCrews, selectedCrew]);
  //     setFormData({
  //       ...formData,
  //       crew: [...formData.crew, selectedCrewId],
  //     });
  //   }
  // };

  const handleCrewChange = (crew) => {
    const isSelected = selectedCrews.some(
      (selectedCrew) => selectedCrew._id === crew._id
    );

    if (isSelected) {
      // Remove crew if already selected
      setSelectedCrews(
        selectedCrews?.filter((selectedCrew) => selectedCrew._id !== crew._id)
      );
      setFormData({
        ...formData,
        crew: formData.crew?.filter((crewId) => crewId !== crew._id),
      });
    } else {
      // Add crew if not selected
      setSelectedCrews([...selectedCrews, crew]);
      setFormData({
        ...formData,
        crew: [...formData.crew, crew._id],
      });
    }
  };

  const getCrewCategories = async () => {
    try {
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/admin/get-crew-categories-dpd`,
        { headers: headers }
      );

      if (response.data.statusCode === 200) {
        setCategories(response.data.result);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.log("Error", error);
    }
  };

  const getAllCrews = async () => {
    try {
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/admin/get-all-crews-dpd`,
        { headers: headers }
      );

      if (response.data.statusCode === 200) {
        setAllCrews(response.data.result);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.log("Error", error);
    }
  };

  const getCrews = async () => {
    try {
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/admin/get-crews-dpd`,
        { headers: headers }
      );

      if (response.data.statusCode === 200) {
        setCrews(response.data.result);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.log("Error", error);
    }
  };

  const removeCrew = (crewId) => {
    setSelectedCrews(selectedCrews.filter((crew) => crew._id !== crewId));
    setFormData({
      ...formData,
      crew: formData.crew.filter((id) => id !== crewId),
    });
  };

  const getProjectManagers = async () => {
    try {
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/admin/get-crews-dpd-project-manager`,
        { headers: headers }
      );

      if (response.data.statusCode === 200) {
        setProjectManagers(response.data.result);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.log("Error", error);
    }
  };

  const getJobTypes = async () => {
    try {
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/admin/get-job-types-dpd`,
        { headers: headers }
      );

      if (response.data.statusCode === 200) {
        setJobTypes(response.data.result);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.log("Error", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
      };
      const formdata = new FormData();
      formdata.append("customerName", formData.customerName);
      formdata.append("customerEmail", formData.customerEmail ?? "");
      formdata.append("customerPhone", formData.customerPhone);
      formdata.append("billingType", formData.billingType);
      formdata.append("jobAddress", formData.jobAddress);
      formdata.append("foreman", formData.foreman);
      formdata.append("description", formData.description);
      formdata.append("crew", formData.crew);
      formdata.append("truckNo", formData.truckNo);
      formdata.append("trailerNo", formData.trailerNo);
      setDisableBtn(true);
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/project/edit-project/${id}`,
        formdata,
        {
          headers: headers,
        }
      );
      if (response.data.statusCode === 200) {
        toast.success(response.data.message);
        // navigate("/panel/office/all-projects");
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.log("Error", error);
      toast.error(error.response.message);
    }
    // setFormData({
    //     crewName: "",
    //     crewCategory: "",
    //     rating : "",
    //     status : ""
    //   });
    setDisableBtn(false);
  };

  function containsWhitespace(str) {
    // Check if the string contains any whitespace characters
    return /\s/.test(str);
  }

  const saveProjectCode = async () => {
    try {
      if (!projectCode) {
        toast.error("Project Code cannot be empty.");
        return;
      }
      if (projectCode?.length < 1 && projectCode?.length > 14) {
        toast.error(
          "Project Code must be greater than 1 and less than 15 characters long."
        );
        return;
      }

      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
      };
      const formdata = new FormData();

      // Regardless of project type, require at least one crew when starting project
      const crewArr = Array.isArray(formData.crew) ? formData.crew : [];
      if (crewArr.length === 0) {
        toast.error(
          "Please open Edit Project and select at least one Crew before starting this project."
        );
        return;
      }

      formdata.append("crew", formData.crew);
      formdata.append("foreman", formData.foreman);
      formdata.append("projectCode", projectCode);
      formdata.append("status", "Ongoing");
      setDisableBtn(true);

      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/project/edit-project/${id}`,
        formdata,
        {
          headers: headers,
        }
      );
      if (response.data.statusCode === 200) {
        toast.success(response.data.message);
        // if (type == 1) {
        //   navigate("/panel/office/bid-projects");
        // } else {
        //   navigate("/panel/office/all-projects");
        // }
        navigate(-1);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.log("Error", error);
      toast.error(error.response.message);
    }
    setDisableBtn(false);
  };

  const markAsCompleted = async () => {
    try {
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
      };
      const formdata = new FormData();

      formdata.append("status", "Completed");
      setDisableBtn(true);

      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/project/edit-project/${id}`,
        formdata,
        {
          headers: headers,
        }
      );
      if (response.data.statusCode === 200) {
        toast.success(response.data.message);
        // navigate("/panel/office/all-projects");
        navigate(-1);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.log("Error", error);
      toast.error(error.response.message);
    }
    setDisableBtn(false);
  };

  const markAsOngoing = async () => {
    try {
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
      };
      const formdata = new FormData();

      formdata.append("status", "Ongoing");
      setDisableBtn(true);

      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/project/edit-project/${id}`,
        formdata,
        {
          headers: headers,
        }
      );
      if (response.data.statusCode === 200) {
        toast.success(response.data.message);
        // navigate("/panel/office/all-projects");
        navigate(-1);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.log("Error", error);
      const apiMessage =
        error?.response?.data?.message ||
        error?.response?.message ||
        error?.message;

      // Special-case: backend CastError on crew (project created without crew)
      if (
        apiMessage &&
        apiMessage.includes("Cast to ObjectId") &&
        apiMessage.includes("crew")
      ) {
        toast.error(
          "Please open Edit Project and select at least one Crew before starting this project."
        );
      } else {
        toast.error(apiMessage || "Something went wrong");
      }
    }
    setDisableBtn(false);
  };

  const handleProjectCodeChange = (e) => {
    const val = e.target.value;
    if (val.length > 14) {
      toast.error("Project Code should not exceed 14 characters.");
      return;
    }
    if (containsWhitespace(val)) {
      toast.error("Project Code cannot contain whitespace.");
      return;
    }
    // if(!characters.includes(val)){
    //   toast.error("Project Code should only contain alphanumeric characters.");
    //   return;
    // }
    setProjectCode(val);
  };

  function formatDate(dateString) {
    const options = { day: "2-digit", month: "long", year: "numeric" };
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", options); // Use 'en-GB' to get the desired format
  }

  useEffect(() => {
    getJobTypeById();
  }, [formData]);

  const downloadPdf = () => {
    if (loading) {
      toast.error("Please wait, project data is still loading.");
      return;
    }
    const element = document.getElementById("content-to-pdf");
    if (!element) {
      toast.error("PDF content not ready yet.");
      return;
    }

    // Blank field copy PDF uses project header + empty rows; office field copies are not required.

    // Create a temporary div with the hidden content
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = `
        <div class="flex justify-center mb-2">
          <img src="${fng_logo}" alt="F&G Logo" class="h-[110px]" />
        </div>
      `;

    // Insert the temporary div at the top of the content
    element.prepend(tempDiv);

    const fileName = documentName + ".pdf";

    const options = {
      margin: 0.1,
      filename: fileName,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "in", format: "A4", orientation: "portrait" },
      // pagebreak: { mode: ["avoid-all", "css", "legacy"] }, // Ensures proper page breaks
    };

    html2pdf()
      .from(element)
      .set(options)
      .save()
      .then(() => {
        // Ensure the temporary div is removed after the download completes
        tempDiv.remove();
      })
      .catch((error) => {
        console.error("PDF generation failed:", error);
        tempDiv.remove(); // Ensure cleanup even if an error occurs
      });
  };

  const getJobTypeById = async () => {
    try {
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      if (!formData.jobType) {
        return;
      }
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/project/get-job-type/${formData.jobType}`,
        { headers: headers }
      );
      if (response.data.statusCode === 200) {
        setJobType(response.data.result.jobName);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response.message);
    }
  };

  const summarizeFieldCopies = (fieldCopies) => {
    const summary = {};

    fieldCopies.forEach((item) => {
      const key = `${item.reference}-${item.measure}-${item.price}`;

      if (!summary[key]) {
        summary[key] = {
          source: item.source,
          isTaxable: item.isTaxable,
          reference: item.reference,
          description: item.description,
          size: item.measure,
          quantity: 0,
          price: item.price,
          totalPrice: 0,
        };
      }

      summary[key].quantity += item.quantity;
      summary[key].totalPrice += item.totalPrice;
    });

    // Calculate the total price
    Object.keys(summary).forEach((key) => {
      summary[key].totalPrice = summary[key].quantity * summary[key].price;
    });

    return Object.values(summary);
  };

  useEffect(() => {
    const summarizedData = summarizeFieldCopies(fieldCopiesArray);
    setCategorizedFieldCopies([
      { category: "Field Copies", items: summarizedData },
    ]);
    if (bidedCopy.length > 0) {
      const summarizedBidedData = summarizeFieldCopies(bidedCopy);
      setCategorizedBidFieldCopies([
        { category: "Field Copies", items: summarizedBidedData },
      ]);
    }
  }, [fieldCopies, bidedCopy]);

  useEffect(() => {
    const pm = allCrews.filter((item) => {
      return item._id === formData.projectManager;
    });
    if (pm.length > 0) {
      setProjectManager(pm[0].crewName);
    }
    const fm = allCrews.filter((item) => {
      return item._id === formData.foreman;
    });
    if (fm.length > 0) {
      setForeman(fm[0].crewName);
    }
  }, [formData, projectManagers, foreman]);

  const formatDateToString = (dateString) => {
    if (dateString) {
      // Split the input date string into day, month, and year parts
      const [day, month, year] = dateString.split("-");

      // Array of month names
      const monthNames = [
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

      // Pad the day with a leading zero if necessary
      const formattedDay = day.padStart(2, "0");

      // Convert month number to month name (month is 1-based, array is 0-based)
      const formattedMonth = monthNames[parseInt(month) - 1];

      // Construct the final formatted date string
      return `${formattedDay}-${formattedMonth}-${year}`;
    }
  };

  const deleteDraftCopy = async () => {
    try {
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
      };
      const formdata = new FormData();
      setDisableBtn(true);
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/project/delete-draft-copy/${id}/${selectedDraftId}`,
        formdata,
        {
          headers: headers,
        }
      );
      if (response.data.statusCode === 200) {
        toast.success(response.data.message);
        getProjectById();
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.response.message);
    }
    setDisableBtn(false);
  };

  // Convert to yyyy-MM-dd format
  const convertToYYYYMMDD = (dateString) => {
    const [day, month, year] = dateString.split("-");
    const paddedMonth = month.padStart(2, "0");
    const paddedDay = day.padStart(2, "0");
    return `${year}-${paddedMonth}-${paddedDay}`;
  };

  // Get today's date in yyyy-MM-dd format
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  function formatDate(isoDateString) {
    // Parse the ISO date string
    const date = new Date(isoDateString);

    // Get the day, month, and year
    const day = String(date.getDate()).padStart(2, "0");
    const monthNames = [
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
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();

    // Format the date as dd-MMM-yyyy
    return `${day}-${month}-${year}`;
  }

  const updateFieldCopyDate = async () => {
    try {
      setDisableBtn(true);
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
      };
      const formdata = new FormData();

      formdata.append("entryDate", copyDate);
      formdata.append("newDate", updatedDate);

      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/project/edit-field-copy-date/${id}`,
        formdata,
        {
          headers: headers,
        }
      );
      if (response.data.statusCode === 200) {
        toast.success(response.data.message);
        getProjectById();
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.log("Error", error);
      toast.error(error.response.message);
    }
    setDisableBtn(false);
  };

  const deleteFieldCopy = async () => {
    try {
      setDisableBtn(true);
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
      };
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/project/delete-field-copy/${id}/${selectedFieldId}`,
        {},
        {
          headers: headers,
        }
      );
      if (response.data.statusCode === 200) {
        toast.success(response.data.message);
        getProjectById();
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.log("Error", error);
      toast.error(error.response.message);
    }
    setDisableBtn(false);
  };

  const printFieldCopyDate = () => {
    if (!dateInput) {
      toast.error(
        "Please select a date which will prints on blank field copy."
      );
      return;
    }
    if (!documentName) {
      toast.error("Please enter document name.");
      return;
    }
    downloadPdf();
  };

  const updateDocumentName = (val) => {
    val = val?.replace(" ", "_");
    setDocumentName(val);
  };

  // function convertToCentralTime(milliseconds) {
  //   // Convert milliseconds to a Date object

  //   if (!milliseconds) {
  //     return;
  //   }

  //   const date = new Date(milliseconds);

  //   console.log("Converted date", date);

  //   // Format the date to Central Time (US & Canada)
  //   let centralTime = date.toLocaleString("en-US", {
  //     timeZone: "America/Chicago", // Central Time Zone
  //     weekday: "long",
  //     year: "numeric",
  //     month: "long",
  //     day: "numeric",
  //   });

  //   console.log("America Timezone", centralTime)

  //   return centralTime;
  // }

  function convertToCentralTime(dateString) {
    // Convert input string to a Date object
    const date = new Date(dateString);

    // Check if the date is valid
    if (isNaN(date.getTime())) {
      console.error("Invalid date format:", dateString);
      return "Invalid Date";
    }

    // Add 1 day to the date
    date.setDate(date.getDate() + 1);

    // Arrays for days and months
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    // Extract day, month, date, and year
    const dayName = days[date.getDay()];
    const monthName = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();

    // Return formatted date
    return `${dayName}, ${monthName} ${day}, ${year}`;
  }

  const addOneDay = (dateString) => {
    if (!dateString) return ""; // Handle empty date input
    const date = new Date(dateString); // Convert string to Date object
    date.setDate(date.getDate() + 1); // Add 1 day
    return date.toISOString().split("T")[0]; // Format back to YYYY-MM-DD
  };

  return (
    <>
      <Layout>
        <ToastContainer />

        <div
          className={`${tableSize === 250 ? "md:ml-[250px]" : "md:ml-[90px]"}`}
        >
          <div
            className="modal fade"
            id="exampleModalCenter_saveAs"
            tabIndex={-1}
            role="dialog"
            aria-labelledby="exampleModalCenterTitle"
            aria-hidden="true"
          >
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title" id="exampleModalLongTitle">
                    Enter Date
                  </h5>
                  <button
                    type="button"
                    className="close"
                    data-dismiss="modal"
                    aria-label="Close"
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label htmlFor="dateInput">Date</label>
                    <input
                      type="date"
                      className="form-control"
                      id="dateInput"
                      placeholder="e.g. Tuesday, January 4, 2025"
                      value={dateInput}
                      onChange={(e) => {
                        setDateInput(e.target.value);
                      }}
                      name="dateInput"
                      // maxLength={45}
                      // max={getTodayDate()}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="documentName">Document Name</label>
                    <input
                      type="text"
                      className="form-control"
                      id="documentName"
                      placeholder="Enter Document Name"
                      value={documentName}
                      onChange={(e) => {
                        updateDocumentName(e.target.value);
                      }}
                      maxLength={200}
                      name="documentName"
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    data-dismiss="modal"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className="btn bg-[#00613e] text-white"
                    data-dismiss="modal"
                    onClick={() => {
                      printFieldCopyDate();
                    }}
                  >
                    Download PDF
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "none" }}>
            <div className="px-1 pt-0 pb-1" id="content-to-pdf">
              {isBidProject && (
                <div className="mb-2 -mt-0.5">
                  <h5
                    className="m-0 p-0 text-[red] tracking-wide leading-none font-semibold"
                    style={{ marginBottom: 0, marginTop: 0 }}
                  >
                    <span className="inline-block leading-none">
                      FIELD COPY - BID
                    </span>
                  </h5>
                </div>
              )}
              {isNoBidProject && (
                <div className="mb-2 -mt-0.5">
                  <h5
                    className="m-0 p-0 text-[red] tracking-wide leading-none font-semibold"
                    style={{ marginBottom: 0, marginTop: 0 }}
                  >
                    <span className="inline-block leading-none">
                      FIELD COPY - NO BID
                    </span>
                  </h5>
                </div>
              )}
              <div className="flex flex-row gap-3 justify-around">
                <div className="flex flex-col w-1/3 md:w-[270px]">
                  <div className="p-1">
                    <h6 className="text-[15px]">Date</h6>
                    {/* <p className="text-sm">
                      {formData?.createdAt
                        ? formatDate(formData.createdAt)
                        : ""}
                    </p> */}
                    <p className="text-sm font-bold">
                      {/* {(dateInput)} */}
                      {convertToCentralTime(dateInput)}
                    </p>
                  </div>

                  <div className="p-1">
                    <h6 className=" text-[15px]">Project Code</h6>
                    <p className="text-sm font-bold">{projectCode}</p>
                  </div>

                    <div className="p-1">
                      <h6 className=" text-[15px]">Job Address</h6>
                      <p className="text-sm break-words font-bold">
                        {formData?.jobAddress}
                      </p>
                    </div>

                    <div className="p-1">
                      <h6 className=" text-[15px]">Billing Type</h6>
                      <p className="text-sm font-bold">{formData?.billingType}</p>
                      {isBidProject && (
                        <div className="mt-1 pt-1 border-t border-neutral-300">
                          <p className="text-sm font-bold m-0 leading-snug break-all">
                            {bidBillingTypeEncodedLine}
                          </p>
                        </div>
                      )}
                      {isNoBidProject && (
                        <div className="mt-1 pt-1 border-t border-neutral-300">
                          <p className="text-sm font-bold m-0 leading-snug break-all">
                            {noBidBillingTypeEncodedLine}
                          </p>
                        </div>
                      )}
                    </div>
                </div>
                <div className="flex flex-col w-1/3 md:w-[270px]">
                  <div className="p-1">
                    <h6 className=" text-[15px]">Customer Name</h6>
                    <p className="text-sm break-words font-bold">
                      {formData?.customerName}
                    </p>
                  </div>
                  <div className="p-1">
                    <h6 className=" text-[15px]">Job Type</h6>
                    <p className="text-sm font-bold">{jobType}</p>
                  </div>
                  <div className="p-1">
                    <h6 className=" text-[15px]">Description</h6>
                    <p className="text-sm break-words font-bold">
                      {parse(formData.description)}
                    </p>
                  </div>
                  {formData && formData.truckNo && (
                    <div className="p-1">
                      <h6 className=" text-[15px]">Truck No.</h6>
                      <p className="text-sm break-words font-bold">
                        {formData.truckNo}
                      </p>
                    </div>
                  )}
                  {formData &&
                    formData.trailerNo &&
                    formData.trailerNo !== "null" && (
                      <div className="p-1">
                        <h6 className=" text-[15px]">Trailer No.</h6>
                        <p className="text-sm break-words font-bold">
                          {formData.trailerNo}
                        </p>
                      </div>
                    )}
                </div>
                <div className="flex flex-col w-1/3 md:w-[270px]">
                  {projectManager && (
                    <div className="p-1">
                      <h6 className=" text-[15px]">Project Manager</h6>
                      <p className="text-sm font-bold">{projectManager}</p>
                    </div>
                  )}
                  {foreman && (
                    <div className="p-1">
                      <h6 className=" text-[15px]">Foreman</h6>
                      <p className="text-sm font-bold">{foreman}</p>
                    </div>
                  )}
                  <div className="p-1">
                    <h6 className=" text-[15px]">Crew Labor</h6>
                    <div className="selected-crews flex flex-wrap gap-2 mt-1">
                      {selectedCrews.map((crew, index) => (
                        <div
                          key={index}
                          className="selected-crew rounded-full text-sm font-bold leading-3"
                        >
                          {crew.crewName}
                          {selectedCrews.length - 1 === index ? "" : ","}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-1">
                    <h6 className=" text-[15px]">Total Crew</h6>
                    <p className="text-sm font-bold">
                      {foreman
                        ? selectedCrews.length + 1
                        : selectedCrews.length}
                    </p>
                  </div>
                  <div className="p-1 flex gap-2">
                    <div className="flex flex-col items-start gap-1">
                      <h6 className="text-[15px]">Start Time</h6>
                      <input
                        className="w-full h-[30px] border-[1px] mt-1 border-[grey] px-1 text-sm"
                        // value={}
                      />
                    </div>
                    <div className="flex flex-col items-start gap-1">
                      <h6 className="text-[15px]">End Time</h6>
                      <input
                        className="w-full h-[30px] border-[1px] mt-1 border-[grey] px-1 text-sm"
                        // value={}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center overflow-hidden w-full">
                {/* Blank Field Copy */}
                <div className="">
                  <table className="text-center">
                    <thead>
                      <tr>
                        <th className="p-1 text-sm">Source</th>
                        <th className="p-1 text-sm">Material</th>
                        <th className="p-1 text-sm">U/M</th>
                        <th className="p-1 text-sm">Quantity</th>
                      </tr>
                    </thead>
                    <tbody className="">
                      {Array.from({ length: 10 }, (_, i) => {
                        return (
                          <tr>
                            <td>
                              <input
                                type="text"
                                className="h-[34px] w-[150px] border-2 border-[grey]"
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                className="h-[34px] w-[320px] border-2 border-[grey]"
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                className="h-[34px] w-[80px] border-2 border-[grey]"
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                className="h-[34px] w-[80px] border-2 border-[grey]"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="w-[635px] mt-20">
                  <h4 className="font-bold mt-1 p-[7px] text-center">Notes</h4>
                  <div className="h-[140px] border-2 border-[grey] w-full"></div>
                </div>
              </div>

              {/* Chemical Maintenance: print mix makeup on next page (if mix exists) */}
              {isChemicalJob && chemicalMix?.chemicals?.length > 0 && (
                <>
                  <div className="html2pdf__page-break" />
                  <div className="pt-2">
                  <div className="mb-3">
                    <h5 className="font-bold text-[16px] text-center">
                      MIX MAKEUP
                    </h5>
                    <p className="text-center text-sm font-bold mt-1">
                      {chemicalMix.mixName}
                    </p>
                  </div>
                  <table className="w-full border-collapse text-xs">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="border p-2 text-left">DESCRIPTION</th>
                        <th className="border p-2 text-left">
                          Product Brand Name and EPA Reg. #
                        </th>
                        <th className="border p-2 text-left">TYPE</th>
                        <th className="border p-2 text-center">
                          OZ / TANK 100 GAL
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {chemicalMix.chemicals.map((c, i) => (
                        <tr key={i}>
                          <td className="border p-2">
                            {c.chemicalName || "-"}
                          </td>
                          <td className="border p-2">
                            <div className="font-semibold">
                              {c.brandName || "-"}
                            </div>
                            <div className="text-[10px]">
                              {c.epaRegNo ? `EPA: ${c.epaRegNo}` : "EPA: -"}
                            </div>
                          </td>
                          <td className="border p-2">{c.type || "-"}</td>
                          <td className="border p-2 text-center">
                            {c.quantity ?? "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="lg:p-10 p-3">
            <div className="card">
              <div className="card-header bg-[#00613e] text-white">
                <h3 className="card-title relative top-0 my-1">
                  <button
                    onClick={() => {
                      navigate(-1);
                    }}
                  >
                    <i className="fa fa-arrow-left mr-2"></i>
                  </button>{" "}
                  View Project
                </h3>
                {loadingBtn && formData.status === "Active" && (
                  <div className="text-end">
                    <button
                      className="text-blue bg-white px-3 py-1 text-sm"
                      type="button"
                      data-toggle="modal"
                      data-target="#exampleModal"
                    >
                      Start Project
                    </button>
                  </div>
                )}
                {loadingBtn && formData.status === "Completed" && (
                  <div className="text-end">
                    <button
                      className="text-blue bg-white px-3 py-1 text-sm"
                      onClick={markAsOngoing}
                    >
                      Mark as Ongoing
                    </button>
                  </div>
                )}
                {loadingBtn && formData.status === "Billed" && (
                  <div className=" text-end">
                    <button
                      className="text-blue bg-white px-3 py-1 text-sm"
                      onClick={markAsCompleted}
                    >
                      Mark as Completed
                    </button>
                  </div>
                )}
                {loadingBtn && ["Ongoing"].includes(formData?.status) && (
                  <div className="">
                    <div className=" text-end">
                      <button
                        className="text-blue bg-white px-3 py-1 text-sm relative -top-1"
                        onClick={markAsCompleted}
                      >
                        Mark as Completed
                      </button>
                      <button
                        className="text-blue bg-white px-3 py-1 text-sm ml-2 md:mt-0 mt-2 relative -top-1"
                        type="button"
                        data-toggle="modal"
                        data-target="#exampleModalCenter_saveAs"
                        data-dismiss="modal"
                        // onClick={downloadPdf}
                      >
                        Download Field Copy
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div
                className="modal fade"
                id="exampleModal"
                tabIndex={-1}
                role="dialog"
                aria-labelledby="exampleModalLabel"
                aria-hidden="true"
              >
                <div className="modal-dialog" role="document">
                  <div className="modal-content">
                    <div className="modal-header">
                      <h5 className="modal-title" id="exampleModalLabel">
                        Project
                      </h5>
                      <button
                        type="button"
                        className="close"
                        data-dismiss="modal"
                        aria-label="Close"
                      >
                        <span aria-hidden="true">×</span>
                      </button>
                    </div>
                    <div className="modal-body">
                      <div className="form-group">
                        <label htmlFor="customerEmail">Project Code</label>
                        <input
                          type="text"
                          className="form-control"
                          id="customerEmail"
                          placeholder="Enter Project Id"
                          value={projectCode}
                          onChange={handleProjectCodeChange}
                          name="projectCode"
                          maxLength={14}
                          required
                        />
                      </div>
                      {type == 1 && (
                        <div className="">
                          <div className="form-group">
                            <label htmlFor="foreman">Foreman</label>
                            <select
                              name="foreman"
                              onChange={handleInputChange}
                              id="foreman"
                              className="w-full border-[1px] p-2 rounded-sm border-[#d1d1d1] outline-none"
                              value={formData.foreman}
                              // required
                            >
                              <option value="">Select Foreman</option>
                              {allCrews
                                .filter((item) => {
                                  return (
                                    item.status === "Active" &&
                                    item._id !== formData.projectManager && // Filter out the selected Project Manager
                                    !selectedCrews.some(
                                      (crew) => crew._id === item._id
                                    )
                                  ); // Filter out selected Crews
                                })
                                .map((item, index) => (
                                  <option key={index} value={item._id}>
                                    {item.crewName}
                                  </option>
                                ))}
                            </select>
                          </div>
                          <div className="form-group">
                            <label htmlFor="crew">Select Crew</label>
                            <div className="dropdown" ref={dropdownRef}>
                              {/* Custom dropdown */}
                              <button
                                className="w-full border-[1px] px-2 h-[40px] rounded-sm border-[#d1d1d1] outline-none text-start"
                                type="button"
                                onClick={() =>
                                  setIsDropdownOpen(!isDropdownOpen)
                                } // Toggle dropdown
                              >
                                Select crew
                              </button>

                              {/* Dropdown content with checkboxes */}
                              {isDropdownOpen && (
                                <div className="dropdown-content border-[1px] border-[#d1d1d1] bg-white max-h-[100px] overflow-auto">
                                  {allCrews.filter(
                                    (crew) =>
                                      crew.status === "Active" &&
                                      !selectedCrews.includes(crew) &&
                                      crew._id !== formData.foreman && // Filter out the selected Foreman
                                      crew._id !== formData.projectManager // Filter out the selected Project Manager
                                  ).length > 0 ? (
                                    allCrews
                                      .filter(
                                        (crew) =>
                                          crew.status === "Active" &&
                                          !selectedCrews.includes(crew) &&
                                          crew._id !== formData.foreman && // Filter out the selected Foreman
                                          crew._id !== formData.projectManager // Filter out the selected Project Manager
                                      )
                                      .map((crew, index) => (
                                        <label
                                          key={index}
                                          className="flex items-center px-3 h-[34px] cursor-pointer text-[15px]  hover:bg-[#e8e7e7]"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={selectedCrews.some(
                                              (selectedCrew) =>
                                                selectedCrew._id === crew._id
                                            )}
                                            onChange={() =>
                                              handleCrewChange(crew)
                                            }
                                            className="mr-2 hidden"
                                          />
                                          {crew.crewName}
                                        </label>
                                      ))
                                  ) : (
                                    <div className="px-3 py-2 text-gray-700 font-medium">
                                      No more crews
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-3">
                            {selectedCrews.map((crew, index) => (
                              <div
                                key={index}
                                className="selected-crew bg-primary flex justify-center items-center rounded-full px-2 h-[32px] text-sm"
                              >
                                {crew.crewName}
                                <button
                                  type="button"
                                  className="text-white rounded-full ml-2 my-1 text-xs"
                                  onClick={() => removeCrew(crew._id)}
                                >
                                  <i className="fa fa-close"></i>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="modal-footer">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        data-dismiss="modal"
                      >
                        Close
                      </button>
                      <button
                        type="button"
                        onClick={saveProjectCode}
                        className="btn bg-[#00613e] text-white"
                        data-dismiss="modal"
                      >
                        Start Project
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="card-body">
                  {formData && formData.isProjectStarted && (
                    <>
                      <div className="form-group">
                        <label htmlFor="projectCode">Project Code</label>
                        <input
                          type="text"
                          className="form-control"
                          id="projectCode"
                          placeholder="Enter Project Code"
                          value={formData.projectCode}
                          onChange={handleInputChange}
                          name="projectCode"
                          required
                          readOnly
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="projectStartDate">Start Project</label>
                        <input
                          type="date"
                          className="form-control"
                          id="projectStartDate"
                          placeholder="Enter Start Date"
                          value={formData.projectStartDate}
                          onChange={handleInputChange}
                          name="projectStartDate"
                          // max={getTodayDate()}
                          readOnly
                          required
                        />
                      </div>
                    </>
                  )}

                  {formData.status === "Completed" && (
                    <div className="form-group">
                      <label htmlFor="projectCompletedDate">
                        Completed Date
                      </label>
                      <input
                        type="date"
                        className="form-control"
                        id="projectCompletedDate"
                        placeholder="Enter Completed Date"
                        value={formData.projectCompletedDate}
                        onChange={handleInputChange}
                        name="projectCompletedDate"
                        // max={getTodayDate()}
                        readOnly
                        required
                      />
                    </div>
                  )}

                  <label htmlFor="customerType">Customer Type</label>
                  <div className="flex gap-x-10 mb-3 mt-1">
                    {["Normal", "Commercial", "Exempt"].map((type) => (
                      <div key={type} className="flex items-center gap-x-3">
                        <input
                          type="radio"
                          className="h-[20px] w-[20px]"
                          id={type}
                          value={type}
                          onChange={handleInputChange}
                          name="customerType"
                          checked={formData?.customerType === type}
                          disabled
                        />
                        <p
                          htmlFor={type}
                          className="text-normal font-medium cursor-default"
                        >
                          {type}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="form-group">
                    <label htmlFor="customerName">Customer Name</label>
                    <input
                      type="text"
                      className="form-control"
                      id="customerName"
                      placeholder="Enter Customer Name"
                      value={formData.customerName}
                      onChange={handleInputChange}
                      name="customerName"
                      required
                      readOnly
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="customerEmail">Customer Email</label>
                    <input
                      type="email"
                      className="form-control"
                      id="customerEmail"
                      placeholder="Enter Customer Email"
                      value={formData.customerEmail}
                      onChange={handleInputChange}
                      name="customerEmail"
                      required
                      readOnly
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="customerPhone">Customer Phone</label>
                    <input
                      type="text"
                      className="form-control"
                      id="customerPhone"
                      placeholder="Enter Customer Phone"
                      value={formData.customerPhone}
                      onChange={handleInputChange}
                      name="customerPhone"
                      required
                      readOnly
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="billingType">Billing Type</label>
                    <select
                      name="billingType"
                      onChange={handleInputChange}
                      id="billingType"
                      className="w-full border-[1px] p-2 rounded-sm border-[#d1d1d1] outline-none"
                      value={formData.billingType}
                      required
                      disabled
                    >
                      <option value="">Select Billing Type</option>
                      <option value="Bid">Bid</option>
                      <option value="No Bid">No Bid</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="jobAddress">Job Address</label>
                    <input
                      type="text"
                      className="form-control"
                      id="jobAddress"
                      placeholder="Enter Job Address"
                      value={formData.jobAddress}
                      onChange={handleInputChange}
                      name="jobAddress"
                      required
                      readOnly
                    />
                  </div>

                  <div className="form-group">
                  <label htmlFor="billAddress">Billing Name</label>
                  <input
                    type="text"
                    className="form-control"
                    id="billingName"
                    placeholder="Enter bill name"
                    value={formData.billingName}
                    onChange={handleInputChange}
                    name="billingName"
                    maxLength={70}
                    autoComplete="off"
                    readOnly
                  />
                </div>
                  <div className="form-group">
                    <label htmlFor="billAddress">Billing Address</label>
                    <input
                      type="text"
                      className="form-control"
                      id="billAddress"
                      placeholder="Enter bill Address"
                      value={formData.billAddress}
                      onChange={handleInputChange}
                      name="billAddress"
                      maxLength={70}
                      autoComplete="off"
                      readOnly
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="jobName">Job Name</label>
                    <input
                      type="text"
                      className="form-control"
                      id="jobName"
                      placeholder="Enter Job Name"
                      value={formData.jobName}
                      onChange={handleInputChange}
                      name="jobName"
                      maxLength={100}
                      autoComplete="off"
                      readOnly
                      // required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="jobType">Job Type</label>
                    <select
                      name="jobType"
                      onChange={handleInputChange}
                      id="jobType"
                      className="w-full border-[1px] p-2 rounded-sm border-[#d1d1d1] outline-none"
                      value={formData.jobType}
                      required
                      disabled
                    >
                      <option value="">Select Job Type</option>
                      {jobTypes.map((item, index) => (
                        <option key={index} value={item._id}>
                          {item.jobName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="foreman">Foreman</label>
                    <select
                      name="foreman"
                      onChange={handleInputChange}
                      id="foreman"
                      className="w-full border-[1px] p-2 rounded-sm border-[#d1d1d1] outline-none"
                      value={formData.foreman}
                      required
                      disabled
                    >
                      <option value="">Select Foreman</option>
                      {allCrews.map((item, index) => (
                        <option key={index} value={item._id}>
                          {item.crewName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="crew">Select Crew</label>
                    <select
                      name="crew"
                      onChange={handleCrewChange}
                      className="w-full border-[1px] p-2 rounded-sm border-[#d1d1d1] outline-none"
                      value=""
                      disabled
                    >
                      <option value="">Select crew</option>
                      {allCrews
                        .filter((crew) => !selectedCrews.includes(crew))
                        .map((item, index) => (
                          <option key={index} value={item._id}>
                            {item.crewName}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="selected-crews flex flex-wrap gap-3">
                    {selectedCrews.map((crew, index) => (
                      <div
                        key={index}
                        className={`selected-crew ${
                          crew.status === "Active"
                            ? "bg-[#00613e] text-white"
                            : "bg-danger"
                        } flex justify-center items-center rounded-full px-2 h-[32px] text-sm`}
                      >
                        {crew.crewName}
                        {/* <button
                        type="button"
                        className="text-white rounded-full ml-2 my-1 text-xs"
                        onClick={() => removeCrew(crew._id)}
                      >
                        <i className="fa fa-close"></i>
                      </button> */}
                      </div>
                    ))}
                  </div>
                  {/* <div className="form-group mt-3">
                    <label htmlFor="projectManager">Project Manager</label>
                    <select
                      name="projectManager"
                      onChange={handleInputChange}
                      className="w-full border-[1px] p-2 rounded-sm border-[#d1d1d1] outline-none"
                      value={formData.projectManager}
                      disabled
                    >
                      <option>Select Project Manager</option>
                      {allCrews.map((item, index) => (
                        <option key={index} value={item._id}>
                          {item.crewName}
                        </option>
                      ))}
                    </select>
                  </div> */}

                  <div className="form-group mt-3">
                    <label htmlFor="description">Description</label>
                    {/* <textarea
                      className="form-control"
                      id="description"
                      rows="4"
                      placeholder="Enter Description"
                      value={formData.description}
                      onChange={handleInputChange}
                      name="description"
                      required
                      readOnly
                    ></textarea> */}
                    <JoditEditor
                      ref={editor}
                      config={config}
                      value={formData.description}
                      // config={config}
                      tabIndex={1} // tabIndex of textarea
                      onBlur={(newContent) => {
                        if (newContent.length > 500) {
                          // toast.error(
                          //   "Description cannot exceed 500 characters"
                          // );
                          // return;
                        }
                        setFormData({
                          ...formData,
                          description: newContent,
                        });
                      }} // preferred to use only this option to update the content for performance reasons
                      onChange={(newContent) => {
                        if (newContent.length > 500) {
                          // toast.error(
                          //   "Description cannot exceed 500 characters"
                          // );
                          // return;
                        }
                        setFormData({
                          ...formData,
                          description: newContent,
                        });
                      }}
                    />
                  </div>

                  <div className="form-group mt-3">
                    <label htmlFor="truckNo">Truck No</label>
                    <input
                      type="text"
                      className="form-control"
                      id="truckNo"
                      placeholder="Enter Truck No"
                      value={formData.truckNo}
                      onChange={handleInputChange}
                      name="truckNo"
                      required
                      readOnly
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="trailerNo">Trailer No</label>
                    <input
                      type="number"
                      className="form-control"
                      id="trailerNo"
                      placeholder="Enter Trailer No"
                      value={formData.trailerNo}
                      onChange={handleInputChange}
                      name="trailerNo"
                      required
                      readOnly
                    />
                  </div>

                  {/* <div className="form-group">
                    <label htmlFor="credits">Credits</label>
                    <input
                      type="number"
                      className="form-control"
                      id="credits"
                      placeholder="Enter credits"
                      value={formData.credits}
                      onChange={handleInputChange}
                      name="credits"
                      min={0}
                      max={10000000}
                      step="any"
                      required
                      readOnly
                    />
                  </div> */}

                  <div className="flex gap-10 justify-between">
                    <div className="form-group w-full">
                      <label htmlFor="nonTaxCredits">Non-Taxable Credits</label>
                      <input
                        type="number"
                        className="form-control"
                        id="nonTaxCredits"
                        placeholder="Enter Non Tax Credits"
                        value={formData.nonTaxCredits}
                        onChange={handleInputChange}
                        name="nonTaxCredits"
                        min={0}
                        max={10000000}
                        step="any"
                        required
                        readOnly={true}
                      />
                    </div>
                    <div className="form-group w-full">
                      <label htmlFor="nonTaxDescription">Description</label>
                      <input
                        type="text"
                        className="form-control"
                        id="nonTaxDescription"
                        placeholder="Enter Description"
                        value={formData.nonTaxDescription}
                        onChange={handleInputChange}
                        name="nonTaxDescription"
                        maxLength={200}
                        required
                        readOnly={true}
                      />
                    </div>
                  </div>
                  <div className="flex gap-10 justify-between">
                    <div className="form-group w-full">
                      <label htmlFor="taxCredits">Taxable Credits</label>
                      <input
                        type="number"
                        className="form-control"
                        id="taxCredits"
                        placeholder="Enter Non Tax Credits"
                        value={formData.taxCredits}
                        onChange={handleInputChange}
                        name="taxCredits"
                        step="any"
                        min={0}
                        max={10000000}
                        required
                        readOnly={true}
                      />
                    </div>
                    <div className="form-group w-full">
                      <label htmlFor="taxDescription">Description</label>
                      <input
                        type="text"
                        className="form-control"
                        id="taxDescription"
                        placeholder="Enter Description"
                        value={formData.taxDescription}
                        onChange={handleInputChange}
                        name="taxDescription"
                        maxLength={200}
                        required
                        readOnly={true}
                      />
                    </div>
                  </div>

                  <div className="flex justify-start gap-4 mt-4">
                    <input
                      type="checkbox"
                      className="h-[20px] w-[20px] cursor-not-allowed"
                      id="isProjectTaxable"
                      checked={formData.isProjectTaxable}
                      name="isProjectTaxable"
                    />
                    <label
                      htmlFor="isProjectTaxable"
                      className="cursor-pointer"
                    >
                      Is Taxable
                    </label>
                  </div>
                </div>
                {/* <div className="card-footer">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={disableBtn}
                >
                  {disableBtn ? "Please wait..." : "Edit Project"}
                </button>
              </div> */}
              </form>

              {type == 1 &&
                ["Ongoing", "Completed"].includes(formData.status) && (
                  <div className="">
                    <div className="card-header bg-[#00613e] text-white mt-10">
                      <div className="text-end flex justify-between">
                        <h3 className="">Bided Copies</h3>
                        <button
                          onClick={() => {
                            navigate(
                              `/panel/office/project/field-copy/bided/${id}`
                            );
                          }}
                        >
                          <i className="fa fa-eye"></i>
                        </button>
                      </div>
                    </div>
                    {/* <div className="flex justify-end mt-4 mr-6">
                      <button
                        className="bg-primary text-white px-6 py-1 rounded-sm text-sm"
                        onClick={() => {
                          navigate(
                            `/panel/office/project/field-copy/bided/edit/${id}`
                          );
                        }}
                      >
                        Edit Bided Copy
                      </button>
                    </div>
                    <div className="card-body">
                      <div className="w-full mt-6 text-[15px]">
                        {categorizedBidFieldCopies.length > 0 ? (
                          categorizedBidFieldCopies.map((group, index) => (
                            <div key={index} className="mb-8">
                              <table className="w-full table table-striped">
                                <thead>
                                  <tr>
                                    <th>Source</th>
                                    <th>Type</th>
                                    <th>Size</th>
                                    <th>Quantity</th>
                                    <th>Price</th>
                                    <th>Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {group.items.map((item, idx) => (
                                    <tr key={idx}>
                                      <td>{item.source}</td>
                                      <td>{item.reference}</td>
                                      <td>{item.size}</td>
                                      <td>{item.quantity}</td>
                                      <td>{item.price.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}</td>
                                      <td>{item.totalPrice.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}</td>
                                    </tr>
                                  ))}
                                  <tr>
                                    <td colSpan="3" className="font-bold">
                                      Totals:
                                    </td>
                                    <td>
                                      {group.items.reduce(
                                        (acc, item) => acc + item.quantity,
                                        0
                                      )}
                                    </td>
                                    <td>
                                      {group.items
                                        .reduce(
                                          (acc, item) => acc + item.price,
                                          0
                                        )
                                        .toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                                    </td>
                                    <td>
                                      {group.items
                                        .reduce(
                                          (acc, item) => acc + item.totalPrice,
                                          0
                                        )
                                        .toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          ))
                        ) : (
                          <p>No field copies available.</p>
                        )}
                      </div>
                    </div> */}
                  </div>
                )}

              {type == 1 && ["Active"].includes(formData.status) ? (
                <>
                  <div className="">
                    <div className="card-header bg-[#00613e] text-white mt-10">
                      <h3 className="">Costing</h3>
                    </div>
                    <div className="card-body">
                      <div className="w-full mt-6 text-[15px]">
                        {!loading ? (
                          categorizedFieldCopies.length > 0 ? (
                            categorizedFieldCopies.map((group, index) => (
                              <div key={index} className="mb-8">
                                <table className="w-full table table-striped">
                                  <thead>
                                    <tr>
                                      <th>Source</th>
                                      <th>Name</th>
                                      <th>Size</th>
                                      <th>Quantity</th>
                                      <th>Price</th>
                                      <th>Total</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {group.items.map((item, idx) => (
                                      <tr key={idx}>
                                        <td>{item?.source}</td>
                                        <td>
                                          {item?.reference?.toUpperCase()}
                                        </td>
                                        <td>{item?.size}</td>
                                        <td>{item?.quantity}</td>
                                        <td>
                                          {item?.price?.toLocaleString(
                                            "en-US",
                                            {
                                              minimumFractionDigits: 2,
                                              maximumFractionDigits: 2,
                                            }
                                          )}
                                        </td>
                                        <td>
                                          {item?.totalPrice?.toLocaleString(
                                            "en-US",
                                            {
                                              minimumFractionDigits: 2,
                                              maximumFractionDigits: 2,
                                            }
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                    <tr>
                                      <td colSpan="3" className="font-bold">
                                        {/* Total: */}
                                      </td>
                                      <td>
                                        {group.items.reduce(
                                          (acc, item) => acc + item.quantity,
                                          0
                                        )}
                                      </td>
                                      <td>
                                        {group.items
                                          .reduce(
                                            (acc, item) => acc + item.price,
                                            0
                                          )
                                          .toLocaleString("en-US", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })}
                                      </td>
                                      <td>
                                        {group.items
                                          .reduce(
                                            (acc, item) =>
                                              acc + item.totalPrice,
                                            0
                                          )
                                          .toLocaleString("en-US", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })}
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            ))
                          ) : (
                            <p className="pb-2">No field copies available.</p>
                          )
                        ) : (
                          <p className="pb-2">Loading ...</p>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="">
                    <div className="card-header bg-[#00613e] text-white mt-10">
                      <h3 className="">Field Copies</h3>
                    </div>
                    <div className="card-body">
                      <div className="flex justify-between items-center mb-4">
                        <div className="font-semibold">
                          <h5>Completed Field Copies</h5>
                        </div>
                        {formData &&
                          ["Ongoing", "Billed", "Completed", "Delete"].includes(
                            formData.status
                          ) && (
                            <div className="flex md:flex-row flex-col gap-2 justify-end">
                              {formData.status === "Ongoing" && (
                                <button
                                  className="bg-[#00613e] text-white px-6 py-1 rounded-sm text-sm"
                                  onClick={() => {
                                    navigate(
                                      `/panel/office/project/draft-copy/add/${id}`
                                    );
                                  }}
                                >
                                  Add Draft Copy 
                                </button>
                              )}
                              {formData.status === "Ongoing" && (
                                <button
                                  className="bg-[#00613e] text-white px-6 py-1 rounded-sm text-sm"
                                  onClick={() => {
                                    navigate(
                                      `/panel/office/project/field-copy/add/${id}`
                                    );
                                  }}
                                >
                                  Add New Field Copy
                                </button>
                              )}
                              <button
                                className="bg-[#00613e] text-white px-6 py-1 rounded-sm text-sm"
                                onClick={() => {
                                  const url =
                                    type == 1
                                      ? `/panel/office/project/field-copy/office-with-bid/${id}`
                                      : `/panel/office/project/field-copy/office/${id}`;
                                  navigate(url);
                                }}
                              >
                                View Office Copy
                              </button>
                              <button
                                className="bg-[#00613e] text-white px-6 py-1 rounded-sm text-sm"
                                onClick={() => {
                                  navigate(
                                    `/panel/office/project/customer-copy-lists/${id}`,
                                    {
                                      state: {
                                        data: formData.status,
                                      },
                                    }
                                    // `/panel/office/project/field-copy/customer/${id}`
                                  );
                                }}
                              >
                                View Customer Copy Sales Order
                              </button>
                            </div>
                          )}
                      </div>
                      <hr />
                      {/* {Object.entries(groupedFieldCopies).map(
                        ([date, copies]) => (
                          <div
                            key={date}
                            className="field-copy-group mt-3 flex gap-10"
                          >
                            <h4 className=" font-bold w-[160px]">{date}</h4>
                            <button
                              title="Click to view"
                              onClick={() => {
                                navigate(
                                  "/panel/office/project/field-copy/date",
                                  {
                                    state: {
                                      data: {
                                        copies,
                                        date,
                                        startTime: formData.startTime,
                                        endTime: formData.endTime,
                                      },
                                    },
                                  }
                                );
                              }}
                            >
                              <i className="fa fa-eye"></i>
                            </button>

                            <hr />
                          </div>
                        )
                      )} */}
                      {fieldCopies &&
                        fieldCopies.map((copy, index) => {
                          return (
                            <>
                              <div className="flex items-start">
                                <div className="top-3.5 relative">
                                  {index + 1}.{" "}
                                </div>
                                <div>
                                  <div
                                    key={copy.entryDate}
                                    className="field-copy-group mt-3 flex gap-10 ml-3"
                                  >
                                    <h4 className=" font-bold w-[200px]">
                                      {formatDateToString(copy.entryDate)}{" "}
                                      {" (" + formatDate(copy.createdAt) + ") "}
                                    </h4>

                                    <div className="flex gap-4">
                                      <button
                                        title="Click to view"
                                        onClick={() => {
                                          navigate(
                                            "/panel/office/project/field-copy/date",
                                            {
                                              state: {
                                                data: {
                                                  copies: copy.fieldCopies,
                                                  totalManHours:
                                                    copy.totalHours,
                                                  date: formatDateToString(
                                                    copy.entryDate
                                                  ),
                                                  startTime: copy.startTime,
                                                  endTime: copy.endTime,
                                                  id: id,
                                                  entryDate: copy.entryDate,
                                                  formData,
                                                  jobType,
                                                },
                                              },
                                            }
                                          );
                                        }}
                                      >
                                        <i className="fa fa-eye"></i>
                                      </button>
                                      {formData.status !== "Delete" && (
                                        <>
                                          <button
                                            title="Click to edit"
                                            data-dismiss="modal"
                                            data-toggle="modal"
                                            data-target="#exampleModalCenter_date"
                                            onClick={() => {
                                              const formattedDate =
                                                convertToYYYYMMDD(
                                                  copy.entryDate
                                                );
                                              setUpdatedDate(formattedDate);
                                              setCopyDate(copy.entryDate);
                                            }}
                                          >
                                            <i className="fa fa-pencil"></i>
                                          </button>
                                          <button
                                            title="Delete field copy"
                                            data-dismiss="modal"
                                            data-toggle="modal"
                                            data-target="#exampleModalCenter_field_copy"
                                            onClick={() => {
                                              setSelectedFieldId(copy._id);
                                            }}
                                          >
                                            <i className="fa fa-trash"></i>
                                          </button>
                                        </>
                                      )}
                                    </div>
                                    <hr />
                                  </div>
                                  {copy?.draftCopies?.length > 0 &&
                                    formData.status !== "Delete" && (
                                      <div
                                        key={copy.entryDate}
                                        className="field-copy-group mt-2 flex gap-10 ml-3"
                                      >
                                        <h4 className=" font-bold w-[200px]">
                                          {formatDateToString(copy.entryDate)}
                                        </h4>
                                        <button
                                          title="Click to view"
                                          onClick={() => {
                                            navigate(
                                              "/panel/office/project/draft-copy/date",
                                              {
                                                state: {
                                                  data: {
                                                    copies: copy.draftCopies,
                                                    totalManHours:
                                                      formData.totalHours,
                                                    date: formatDateToString(
                                                      copy.entryDate
                                                    ),
                                                    startTime: copy.startTime,
                                                    endTime: copy.endTime,
                                                  },
                                                },
                                              }
                                            );
                                          }}
                                        >
                                          <i className="fa fa-eye"></i>
                                        </button>
                                        <span>( Draft )</span>
                                        <hr />
                                      </div>
                                    )}
                                </div>
                              </div>
                            </>
                          );
                        })}

                      <div className="mt-7">
                        <div className="mb-6">
                          <h4 className="font-semibold">
                            Incomplete Field Copies
                          </h4>
                        </div>
                        {draftCopies &&
                          draftCopies.map((copy, index) => {
                            return (
                              <div className="flex items-center">
                                <div className="top-1.5 relative">
                                  {index + 1}.{" "}
                                </div>
                                <div
                                  key={copy.entryDate}
                                  className="field-copy-group mt-3 flex gap-10 ml-3"
                                >
                                  <h4 className=" font-bold w-[200px]">
                                    {formatDateToString(copy.entryDate)}
                                  </h4>
                                  <div>
                                    <button
                                      title="Click to view"
                                      onClick={() => {
                                        navigate(
                                          "/panel/office/project/draft-copy/date",
                                          {
                                            state: {
                                              data: {
                                                copies: copy.draftCopies,
                                                totalManHours: 0,
                                                date: formatDateToString(
                                                  copy.entryDate
                                                ),
                                                startTime: 0,
                                                endTime: 0,
                                              },
                                            },
                                          }
                                        );
                                      }}
                                    >
                                      <i className="fa fa-eye"></i>
                                    </button>
                                    {formData.status !== "Delete" && (
                                      <>
                                        <button
                                          title="Click to edit"
                                          onClick={() => {
                                            navigate(
                                              `/panel/office/project/draft-copy/edit/${id}/${copy.entryDate}`,
                                              {
                                                state: {
                                                  data: {
                                                    copies: copy.draftCopies,
                                                    totalManHours: 0,
                                                    date: formatDateToString(
                                                      copy.entryDate
                                                    ),
                                                    startTime: 0,
                                                    endTime: 0,
                                                  },
                                                },
                                              }
                                            );
                                          }}
                                          className="ml-3"
                                        >
                                          <i className="fa fa-pencil"></i>
                                        </button>
                                        <button
                                          title="Click to delete"
                                          data-dismiss="modal"
                                          data-toggle="modal"
                                          data-target="#exampleModalCenter_draft_copy"
                                          onClick={() => {
                                            // deleteDraftCopy(copy.entryDate);
                                            setSelectedDraftId(copy.entryDate);
                                          }}
                                          className="ml-3"
                                        >
                                          <i className="fa fa-trash"></i>
                                        </button>
                                      </>
                                    )}
                                  </div>

                                  <hr />
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          <div
            className="modal fade"
            id="exampleModalCenter_date"
            tabIndex={-1}
            role="dialog"
            aria-labelledby="exampleModalCenterTitle"
            aria-hidden="true"
          >
            <div className="modal-dialog" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title" id="exampleModalLongTitle">
                    Edit Date
                  </h5>
                  <button
                    type="button"
                    className="close"
                    data-dismiss="modal"
                    aria-label="Close"
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label htmlFor="updatedDate">Date</label>
                    <input
                      type="date"
                      className="form-control"
                      id="updatedDate"
                      placeholder="Enter Updated Date"
                      value={updatedDate}
                      onChange={(e) => {
                        setUpdatedDate(e.target.value);
                      }}
                      name="updatedDate"
                      // max={getTodayDate()}
                      required
                    />
                    <span className="mt-4 text-sm">
                      Note : System generated date is not editable.
                    </span>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    data-dismiss="modal"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className="btn bg-[#00613e] text-white"
                    data-dismiss="modal"
                    onClick={updateFieldCopyDate}
                  >
                    Save changes
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div
            className="modal fade"
            id="exampleModalCenter_field_copy"
            tabIndex={-1}
            role="dialog"
            aria-labelledby="exampleModalCenterTitle"
            aria-hidden="true"
          >
            <div className="modal-dialog" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title" id="exampleModalLongTitle">
                    Delete Field Copy
                  </h5>
                  <button
                    type="button"
                    className="close"
                    data-dismiss="modal"
                    aria-label="Close"
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                </div>
                <div className="modal-body">Are You Sure ?</div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    data-dismiss="modal"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger text-white"
                    data-dismiss="modal"
                    onClick={deleteFieldCopy}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div
            className="modal fade"
            id="exampleModalCenter_draft_copy"
            tabIndex={-1}
            role="dialog"
            aria-labelledby="exampleModalCenterTitle"
            aria-hidden="true"
          >
            <div className="modal-dialog" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title" id="exampleModalLongTitle">
                    Delete Draft Copy
                  </h5>
                  <button
                    type="button"
                    className="close"
                    data-dismiss="modal"
                    aria-label="Close"
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                </div>
                <div className="modal-body">Are You Sure ?</div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    data-dismiss="modal"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger text-white"
                    data-dismiss="modal"
                    onClick={deleteDraftCopy}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}
