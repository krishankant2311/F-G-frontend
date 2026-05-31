import React, { useEffect, useMemo, useState } from "react";
import Layout from "../layout/Layout";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate, useParams } from "react-router-dom";
import { useTableContext } from "../../context/TableContext";
import html2pdf from "html2pdf.js";
import fng_logo from "../../assets/images/fng_logo_black.png";
import parse from "html-react-parser";
import {
  formatFieldCopyAmount,
  getFieldCopyLineDisplayCost,
  getFieldCopyPdfLaborManHours,
  isFieldCopyLaborContext,
  getOfficeFieldCopyCrewLaborRowFields,
  getOfficeFieldCopyLineCost,
  getLaborPdfDescription,
  getOfficeFieldCopyRowCalculations,
  isLumpSumLaborCrewEntry,
  isLumpSumLaborFieldCopyItem,
  lookupLaborMapValue,
  shouldHideContractorLaborWorkSummaryRow,
  shouldSkipAggregatedLaborPdfRow,
} from "../../utils/fieldCopyLaborDisplay";
import {
  buildOfficeWorkSummaryDisplayRows,
  getOfficeWorkSummaryDisplayLabel,
  getOfficeWorkSummaryLaborMergeKey,
} from "../../utils/officeWorkSummaryDisplay";

export default function OfficeFieldCopyView() {
  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    billingType: "",
    jobAddress: "",
    jobType: "",
    crewCategory: "",
    description: "",
    crew: [],
    truckNo: "",
    trailerNo: "",
    createdAt: "",
    status: "",
    totalManHours: 0,
    credits: 0,
    projectCompletedDate: "",
    officeCopyId: "",
    bidCopyId: "",
    billAddress: "",
    jobName: "",
    isProjectTaxable: false,
    nonTaxCredits: 0,
    nonTaxDescription: "",
    taxCredits: 0,
    taxDescription: "",
  });
  const [fieldCopies, setFieldCopies] = useState([]);
  const [jobType, setJobType] = useState("");
  const { id } = useParams();
  const [laborTotal, setLaborTotal] = useState(0);
  const [materialsTotal, setMaterialsTotal] = useState(0);
  const [taxPercent, setTaxPercent] = useState(0);
  const [address, setAddress] = useState("");
  const [taxableAmount, setTaxableAmount] = useState(0);
  const [categorizedFieldCopies, setCategorizedFieldCopies] = useState([]);
  const [materialData, setMaterialData] = useState([]);
  const [laborData, setLaborData] = useState([]);
  const [fieldLaborData, setFieldLaborData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [documentName, setDocumentName] = useState("");
  const [materialLaborData, setMaterialLaborData] = useState([]);
  const [cost, setCost] = useState(null);
  const [markup, setMarkup] = useState(null);


  const navigate = useNavigate();

  const { tableSize } = useTableContext();
  const billingTypeLower = String(formData?.billingType || "").toLowerCase();
  const bidAmountNumeric = Number(
    String(formData?.bidAmount ?? "")
      .replace(/[^0-9.-]/g, "")
      .trim()
  );
  const hasBidSignal =
    (Number.isFinite(bidAmountNumeric) ? bidAmountNumeric : 0) > 0 ||
    String(formData?.bidCopyId || "")
      .trim()
      .length > 0;
  const isBidProject =
    !billingTypeLower.includes("no bid") &&
    (billingTypeLower.includes("bid") || hasBidSignal);

  const taxEq = (a, b) => {
    const x = a === true || a === "true";
    const y = b === true || b === "true";
    return x === y;
  };

  const isLaborLikeEntry = (entry) => {
    const source = String(entry?.source || "").toLowerCase();
    const jobTypeText = String(entry?.jobType || "").toLowerCase();
    const referenceText = String(entry?.reference || "").toLowerCase();
    return (
      source === "labor" ||
      jobTypeText.includes("labor") ||
      referenceText.includes("labor")
    );
  };

  const invoiceSalesTax = useMemo(() => {
    const tc = Number(formData.taxCredits) || 0;
    if (formData.isProjectTaxable) {
      return (taxPercent * Math.max(0, Number(taxableAmount) - tc)) / 100;
    }
    if (tc > Number(taxableAmount)) return 0;
    return (taxPercent * Number(taxableAmount)) / 100;
  }, [
    formData.isProjectTaxable,
    formData.taxCredits,
    taxPercent,
    taxableAmount,
  ]);

  const noBidGrandTotal = useMemo(() => {
    const tc = Number(formData.taxCredits) || 0;
    const ntc = Number(formData.nonTaxCredits) || 0;
    const creditsSum = tc + ntc;
    return invoiceSalesTax + (materialsTotal + laborTotal - creditsSum);
  }, [
    formData.taxCredits,
    formData.nonTaxCredits,
    invoiceSalesTax,
    laborTotal,
    materialsTotal,
  ]);

  const workSummaryRows = useMemo(() => {
    const hideContractorLaborDup = (rows) =>
      (rows || []).filter(
        (item) =>
          !shouldHideContractorLaborWorkSummaryRow(item, {
            laborData,
            fieldLaborData,
          })
      );

    if (!isBidProject) return hideContractorLaborDup(materialLaborData);

    const tableItems = categorizedFieldCopies?.[0]?.items || [];
    const bidMaterialSeed = tableItems.map((item) => {
      const sourceNorm = String(item?.source || "")
        .trim()
        .toLowerCase();
      const laborLike = isFieldCopyLaborContext(item);
      const isLaborSource = sourceNorm === "labor" || laborLike;
      const jobTypeFromReference = String(item?.reference || "")
        .replace(/\s*\([^)]*\)\s*$/, "")
        .trim();
      const fallbackJobType = String(item?.jobType || item?.type || "").trim();
      const qty = Number(item?.quantity || 0);
      const unitPrice = Number(item?.price || 0);
      const unitCost = Number(item?.cost || 0);
      const markupPct = Number(item?.markup ?? item?.markUp ?? 0);
      const explicitTotalPrice = Number(item?.totalPrice || 0);
      const derivedSellFromPrice =
        unitPrice > 0 && qty > 0 ? unitPrice * qty : 0;
      const derivedSellFromCost =
        unitCost > 0
          ? unitCost * (qty > 0 ? qty : 1) * (1 + markupPct / 100)
          : 0;
      const displayTotal =
        explicitTotalPrice > 0
          ? explicitTotalPrice
          : derivedSellFromPrice > 0
            ? derivedSellFromPrice
            : derivedSellFromCost;
      const explicitTotalCost = Number(item?.totalCost || 0);
      const displayCost =
        explicitTotalCost > 0
          ? explicitTotalCost
          : unitCost > 0
            ? unitCost * (qty > 0 ? qty : 1)
            : 0;
      return {
        jobType: fallbackJobType || jobTypeFromReference,
        reference: item?.reference,
        description: item?.description,
        source: isLaborSource ? "Labor" : item?.source,
        dataType: "Material",
        isTaxable: item?.isTaxable,
        totalPrice: displayTotal,
        totalCost: displayCost,
        cost: item?.cost,
        quantity: item?.quantity,
        price: item?.price,
        markup: item?.markup,
        markUp: item?.markUp,
      };
    });

    const mergedMaterials = categorizeMaterial(
      bidMaterialSeed.filter((row) => Number(row?.totalPrice || 0) > 0)
    );

    const mergedLabors = (laborData || []).map((labor) => ({
      ...labor,
      dataType: "Labor",
    }));
    return hideContractorLaborDup(
      sortByJobType([...mergedMaterials, ...mergedLabors])
    );
  }, [
    isBidProject,
    materialLaborData,
    categorizedFieldCopies,
    laborData,
    fieldLaborData,
  ]);

  const noBidJobTypeHours = useMemo(() => {
    const sums = {
      drainage: 0,
      electrical: 0,
      hardscape: 0,
      irrigation: 0,
      landscape: 0,
    };
    const office = formData?.officeFieldCopy;
    if (!Array.isArray(office)) return sums;
    for (const entry of office) {
      const groups = entry?.fieldCopies;
      if (!Array.isArray(groups)) continue;
      for (const g of groups) {
        const jt = String(g?.jobType || "").toLowerCase();
        const h = Number(g?.manHours) || 0;
        if (jt.includes("drainage")) sums.drainage += h;
        else if (jt.includes("electrical")) sums.electrical += h;
        else if (jt.includes("hardscape")) sums.hardscape += h;
        else if (jt.includes("irrigation")) sums.irrigation += h;
        else if (jt.includes("landscape")) sums.landscape += h;
      }
    }
    return sums;
  }, [formData?.officeFieldCopy]);

  const laborHourlyRateByJobType = useMemo(() => {
    const map = {};
    const pushFromGroups = (groups) => {
      if (!Array.isArray(groups)) return;
      for (const g of groups) {
        const jt = String(g?.jobType || "").trim().toUpperCase();
        if (!jt) continue;
        const directRate = Number(g?.jobTypeCost || 0);
        const derivedRate =
          Number(g?.manHours || 0) > 0
            ? Number(g?.totalCost || 0) / Number(g?.manHours || 1)
            : 0;
        const rate = directRate > 0 ? directRate : derivedRate > 0 ? derivedRate : 0;
        if (rate > 0 && (!map[jt] || map[jt] <= 0)) {
          map[jt] = rate;
        }
      }
    };

    if (Array.isArray(formData?.officeFieldCopy)) {
      for (const entry of formData.officeFieldCopy) {
        pushFromGroups(entry?.fieldCopies);
      }
    }
    if (Array.isArray(formData?.draftCopy)) {
      for (const entry of formData.draftCopy) {
        pushFromGroups(entry?.draftCopies);
      }
    }
    return map;
  }, [formData?.officeFieldCopy, formData?.draftCopy]);

  const laborManHoursByJobType = useMemo(() => {
    const map = {};
    const pushFromGroups = (groups) => {
      if (!Array.isArray(groups)) return;
      for (const g of groups) {
        const jt = String(g?.jobType || "").trim().toUpperCase();
        if (!jt) continue;
        const h = Number(g?.manHours || 0);
        if (h > 0) {
          map[jt] = (map[jt] || 0) + h;
        }
      }
    };

    if (Array.isArray(formData?.officeFieldCopy)) {
      for (const entry of formData.officeFieldCopy) {
        pushFromGroups(entry?.fieldCopies);
      }
    }
    if (Array.isArray(formData?.draftCopy)) {
      for (const entry of formData.draftCopy) {
        pushFromGroups(entry?.draftCopies);
      }
    }
    return map;
  }, [formData?.officeFieldCopy, formData?.draftCopy]);

  const formatHours = (n) =>
    Number(n || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const getOfficeCrewLaborSources = () => [
    ...fieldLaborData,
    ...Object.entries(laborManHoursByJobType)
      .filter(([jt, h]) => jt && Number(h) > 0)
      .filter(
        ([jt]) =>
          !fieldLaborData.some(
            (l) =>
              String(l?.jobType || "")
                .trim()
                .toUpperCase() === jt
          )
      )
      .map(([jt, h]) => ({ jobType: jt, manHours: h })),
  ];

  const crewLaborTaxLabel = (labor) =>
    formData?.customerType === "Normal"
      ? labor?.isLaborTaxable
        ? "RT"
        : "RNT"
      : formData?.customerType === "Commercial"
        ? "CT"
        : formData?.customerType?.toUpperCase() || "";

  const renderOfficeCrewLaborWorkSummary = (
    gridClass,
    keyPrefix = "ws-crew",
    skipMergedCrewKeys = null
  ) =>
    getOfficeCrewLaborSources()
      .filter((labor) => {
        if (
          !isBidProject &&
          isLumpSumLaborCrewEntry(labor, formData?.jobType)
        ) {
          return false;
        }
        const hours = getFieldCopyPdfLaborManHours(
          labor,
          laborManHoursByJobType
        );
        return hours > 0 || Number(labor?.totalPrice) > 0;
      })
      .filter((labor) => {
        if (!skipMergedCrewKeys?.size) return true;
        const crewRow = getOfficeFieldCopyCrewLaborRowFields(
          labor,
          laborManHoursByJobType,
          laborHourlyRateByJobType,
          formData?.jobType
        );
        const mergeKey = getOfficeWorkSummaryLaborMergeKey(
          {
            dataType: "Labor",
            jobType: labor?.jobType,
            reference: crewRow.description,
            isLaborTaxable: labor?.isLaborTaxable,
            isTaxable: labor?.isLaborTaxable,
          },
          fieldCopies
        );
        if (!mergeKey) return true;
        return !skipMergedCrewKeys.has(mergeKey);
      })
      .map((labor, idx) => {
        const row = getOfficeFieldCopyCrewLaborRowFields(
          labor,
          laborManHoursByJobType,
          laborHourlyRateByJobType,
          formData?.jobType
        );
        if (!(row.manHours > 0) && !(row.displayTotal > 0)) return null;
        return (
          <div
            key={`${keyPrefix}-${idx}`}
            className={`${gridClass} mt-1 items-baseline`}
          >
            <span className="col-span-3 min-w-0">
              <b className="w-[200px] inline-block">{row.description}</b>
              <b>{crewLaborTaxLabel(labor)}</b>
            </span>
            <span className="justify-self-end text-end tabular-nums whitespace-nowrap">
              {row.lineCost > 0 ? (
                <>
                  <b>$</b> {formatFieldCopyAmount(row.lineCost)}
                </>
              ) : (
                ""
              )}
            </span>
            <span className="min-w-0" aria-hidden />
            <span className="min-w-0" aria-hidden />
            <span className="justify-self-end text-end tabular-nums whitespace-nowrap">
              <b>$</b>{" "}
              {row.displayTotal > 0
                ? formatFieldCopyAmount(row.displayTotal)
                : ""}
            </span>
          </div>
        );
      });

  const renderOfficeCrewLaborRows = (keyPrefix = "crew") =>
    getOfficeCrewLaborSources()
      .filter((labor) => {
        if (
          !isBidProject &&
          isLumpSumLaborCrewEntry(labor, formData?.jobType)
        ) {
          return false;
        }
        const hours = getFieldCopyPdfLaborManHours(
          labor,
          laborManHoursByJobType
        );
        return hours > 0 || Number(labor?.totalPrice) > 0;
      })
      .map((labor, idx) => {
        const row = getOfficeFieldCopyCrewLaborRowFields(
          labor,
          laborManHoursByJobType,
          laborHourlyRateByJobType,
          formData?.jobType
        );
        if (!(row.manHours > 0) && !(row.displayTotal > 0)) return null;
        return (
          <tr key={`${keyPrefix}-labor-${idx}`}>
            <td className="min-w-0 pr-2 align-top pl-2">
              <p className="m-0">{row.description}</p>
            </td>
            <td className="px-2" style={{ textAlign: "center" }} />
            <td className="px-2" style={{ textAlign: "center" }}>
              {row.qtyText}
            </td>
            <td className="pr-2 tabular-nums" style={{ textAlign: "right" }}>
              {row.lineCost > 0 ? formatFieldCopyAmount(row.lineCost) : ""}
            </td>
            <td className="pr-2 tabular-nums" style={{ textAlign: "right" }}>
              {row.markupVal !== null &&
              row.markupVal !== undefined &&
              row.markupVal !== ""
                ? Number(row.markupVal).toLocaleString("en-US", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2,
                  }) + "%"
                : ""}
            </td>
            <td className="pr-2 tabular-nums" style={{ textAlign: "right" }}>
              {row.displayPrice != null && row.displayPrice > 0
                ? formatFieldCopyAmount(row.displayPrice)
                : ""}
            </td>
            <td
              className="text-end tabular-nums whitespace-nowrap pr-2"
              style={{ textAlign: "right" }}
            >
              {row.displayTotal > 0
                ? formatFieldCopyAmount(row.displayTotal)
                : ""}
            </td>
          </tr>
        );
      });

  const formatQtyText = (value) => {
    const n = Number(value);
    if (!(n > 0)) return "";
    return Number.isInteger(n)
      ? String(n)
      : n.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
  };

  const getBidTableQtyFallback = (item, qtyText = "") => {
    if (qtyText) return qtyText;
    const ownQty = Number(item?.quantity);
    if (ownQty > 0) return formatQtyText(ownQty);
    if (!isBidProject) return "";
    if (!isLaborLikeEntry(item)) return "";
    const jt = String(item?.jobType || item?.type || "").trim();
    if (!jt) return "";
    const hrs = lookupLaborMapValue(laborManHoursByJobType, jt);
    return hrs > 0 ? formatQtyText(hrs) : "";
  };

  // console.log("Formdata credits", formData.credits);

  const downloadPdf = () => {
    const element = document.getElementById("content-to-pdf");

    // Create a temporary div with the hidden content
    // const tempDiv = document.createElement("div");

    const fileName = documentName + ".pdf";

    // Insert the temporary div at the top of the content
    // element.prepend(tempDiv);

    const options = {
      margin: 0.2,
      filename: fileName,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "in", format: "A4", orientation: "portrait" },
      pagebreak: { mode: ["css", "legacy"] },
    };

    html2pdf()
      .from(element)
      .set(options)
      .save()
      .then(() => {
        // Ensure the temporary div is removed after the download completes
        // tempDiv.remove();
      })
      .catch((error) => {
        console.error("PDF generation failed:", error);
        // tempDiv.remove(); // Ensure cleanup even if an error occurs
      });
  };

  useEffect(() => {
    if (
      fieldCopies.length > 0 ||
      materialData.length > 0 ||
      laborData.length > 0
    ) {
      let summarizedData = summarizeFieldCopies(fieldCopies);
      if (!isBidProject) {
        summarizedData = summarizedData.filter(
          (item) => !isLumpSumLaborFieldCopyItem(item)
        );
      }
      setCategorizedFieldCopies([
        { category: "Materials & Other ", items: summarizedData },
      ]);
      const { laborTotal, materialsTotal } = calculateTotals(fieldCopies);
      setLaborTotal(laborTotal);
      setMaterialsTotal(materialsTotal);
    }
  }, [fieldCopies, isBidProject]);

  const visibleCrewLaborRows = useMemo(() => {
    return getOfficeCrewLaborSources()
      .filter((labor) => {
        if (!isBidProject && isLumpSumLaborCrewEntry(labor, formData?.jobType)) {
          return false;
        }
        const hours = getFieldCopyPdfLaborManHours(labor, laborManHoursByJobType);
        return hours > 0 || Number(labor?.totalPrice) > 0;
      })
      .map((labor) => ({
        labor,
        row: getOfficeFieldCopyCrewLaborRowFields(
          labor,
          laborManHoursByJobType,
          laborHourlyRateByJobType,
          formData?.jobType
        ),
      }))
      .filter(({ row }) => (row?.manHours > 0) || (row?.displayTotal > 0));
  }, [
    isBidProject,
    formData?.jobType,
    laborManHoursByJobType,
    laborHourlyRateByJobType,
    fieldLaborData,
  ]);

  const { rows: officeWorkSummaryDisplayRows, mergedCrewKeys: officeWorkSummaryMergedCrewKeys } =
    useMemo(
      () =>
        buildOfficeWorkSummaryDisplayRows(
          workSummaryRows,
          visibleCrewLaborRows,
          materialLaborData,
          fieldCopies
        ),
      [workSummaryRows, visibleCrewLaborRows, materialLaborData, fieldCopies]
    );

  const isWorkSummaryLineTaxableRt = (item, labor) => {
    const customerType = formData?.customerType;
    if (customerType === "Exempt") return false;
    if (customerType === "Commercial") {
      return taxEq(labor?.isLaborTaxable ?? labor?.isTaxable, true);
    }
    if (labor) {
      return taxEq(labor?.isLaborTaxable ?? labor?.isTaxable, true);
    }
    const laborLike = isLaborLikeEntry(item);
    if (laborLike || ["Labor", "Other"].includes(item?.source)) {
      return taxEq(item?.isTaxable, true);
    }
    if (["Lump Sum"].includes(item?.source)) {
      return taxEq(item?.isTaxable, true);
    }
    // Normal material rows (e.g. LANDSCAPE MATERIAL) show RT in Work Summary.
    if (item?.dataType === "Material") return true;
    return taxEq(item?.isLaborTaxable ?? item?.isTaxable, true);
  };

  function lineItemCostSum(item) {
    const lineCost = getOfficeFieldCopyLineCost(item);
    if (lineCost > 0) return lineCost;
    if (
      item?.totalCost != null &&
      item.totalCost !== "" &&
      !Number.isNaN(Number(item.totalCost))
    ) {
      return Number(item.totalCost);
    }
    const c = item.cost;
    const q = item.quantity != null && item.quantity !== "" ? Number(item.quantity) : 1;
    if (c != null && c !== "" && Number(c) > 0) {
      return Number(c) * q;
    }
    return 0;
  }

  const jobTypeMatch = (a, b) =>
    String(a ?? "")
      .trim()
      .toLowerCase() ===
    String(b ?? "")
      .trim()
      .toLowerCase();

  const costFromFieldCopiesForRow = (row) => {
    if (!fieldCopies?.length || !row) return 0;
    const rowJt = row.jobType;
    let sum = 0;
    for (const fc of fieldCopies) {
      const fcJt = fc.jobType ?? fc.type;
      if (!fcJt || !jobTypeMatch(fcJt, rowJt)) continue;

      if (row.dataType === "Material") {
        const rowCat =
          row.source === "Labor" ? "Labor" : "F&G/Other/LumpSum";
        const fcCat =
          fc.source === "Labor" ? "Labor" : "F&G/Other/LumpSum";
        if (fcCat !== rowCat) continue;
        if (!taxEq(fc.isTaxable, row.isTaxable)) continue;
        sum += lineItemCostSum(fc);
      } else {
        if (fc.source !== "Labor") continue;
        const lt = fc.isLaborTaxable ?? fc.isTaxable;
        if (!taxEq(lt, row.isLaborTaxable)) continue;
        sum += lineItemCostSum(fc);
      }
    }
    return sum;
  };

  const sellFromFieldCopiesForRow = (row) => {
    if (!fieldCopies?.length || !row) return 0;
    const rowJt = row.jobType;
    let sum = 0;
    for (const fc of fieldCopies) {
      if (!fc || fc.status === "Delete") continue;
      const fcJt = fc.jobType ?? fc.type;
      if (!fcJt || !jobTypeMatch(fcJt, rowJt)) continue;

      if (row.dataType === "Material") {
        const rowCat =
          row.source === "Labor" ? "Labor" : "F&G/Other/LumpSum";
        const fcCat =
          fc.source === "Labor" ? "Labor" : "F&G/Other/LumpSum";
        if (fcCat !== rowCat) continue;
        if (!taxEq(fc.isTaxable, row.isTaxable)) continue;
      } else {
        if (fc.source !== "Labor") continue;
        const lt = fc.isLaborTaxable ?? fc.isTaxable;
        if (!taxEq(lt, row.isLaborTaxable)) continue;
      }
      const lineCost = lineItemCostSum(fc);
      const markupPct = Number(fc?.markup ?? fc?.markUp) || 0;
      if (lineCost > 0) {
        sum += lineCost * (1 + markupPct / 100);
      } else {
        sum += Number(getOfficeFieldCopyRowCalculations(fc)?.displayTotal || 0);
      }
    }
    return Math.round(sum * 100) / 100;
  };

  const getBidStyleWorkSummaryCost = (item) => {
    if (item?._officeWsMerged) {
      return Number(item?.totalCost) || 0;
    }
    const fromFc = costFromFieldCopiesForRow(item);
    if (item?.dataType === "Material") {
      return fromFc > 0 ? fromFc : Number(item?.totalCost) || 0;
    }
    return fromFc > 0
      ? fromFc
      : Number(item?.totalCost) || Number(item?.cost) || Number(item?.totalPrice) || 0;
  };

  const getBidStyleWorkSummarySell = (item) => {
    if (item?._officeWsMerged) {
      return Number(item?.totalPrice) || 0;
    }
    const fromFc = sellFromFieldCopiesForRow(item);
    return fromFc > 0 ? fromFc : Number(item?.totalPrice) || 0;
  };

  const workSummaryDisplayTotals = useMemo(() => {
    const groupItems = categorizedFieldCopies?.[0]?.items;
    let costSubtotal = 0;
    let sellSubtotal = 0;
    let taxableCost = 0;
    let taxableSell = 0;

    const addLine = (cost, sell, isTaxable) => {
      costSubtotal += cost;
      sellSubtotal += sell;
      if (isTaxable) {
        taxableCost += cost;
        taxableSell += sell;
      }
    };

    for (const item of workSummaryRows || []) {
      if (item.dataType === "Material") {
        const cost = getBidStyleWorkSummaryCost(item);
        const sell = getBidStyleWorkSummarySell(item);
        if (!(cost > 0) && !(sell > 0)) continue;
        addLine(cost, sell, isWorkSummaryLineTaxableRt(item));
        continue;
      }

      const crewManHours = getFieldCopyPdfLaborManHours(
        item,
        laborManHoursByJobType
      );
      const isSourceLaborLine =
        String(item?.source || "").toLowerCase() === "labor";
      const sell = getBidStyleWorkSummarySell(item);
      if (
        sell > 0 &&
        (isSourceLaborLine ||
          (crewManHours <= 0 &&
            !shouldSkipAggregatedLaborPdfRow(
              item,
              groupItems,
              fieldCopies
            )))
      ) {
        const cost = getBidStyleWorkSummaryCost(item);
        addLine(cost, sell, isWorkSummaryLineTaxableRt(item));
      }
    }

    for (const { labor, row } of visibleCrewLaborRows) {
      const cost = Number(row?.lineCost) || 0;
      const sell = Number(row?.displayTotal) || 0;
      if (!(cost > 0) && !(sell > 0)) continue;
      addLine(cost, sell, isWorkSummaryLineTaxableRt(null, labor, row));
    }

    return { costSubtotal, sellSubtotal, taxableCost, taxableSell };
  }, [
    workSummaryRows,
    fieldCopies,
    visibleCrewLaborRows,
    categorizedFieldCopies,
    laborManHoursByJobType,
    formData?.customerType,
  ]);

  const invoiceCostSubtotal = workSummaryDisplayTotals.costSubtotal;
  const invoiceSellSubtotal = workSummaryDisplayTotals.sellSubtotal;
  const invoiceSellTaxable = workSummaryDisplayTotals.taxableSell;

  const invoiceCostTaxable = useMemo(() => {
    const customerType = formData?.customerType;

    if (customerType === "Exempt") {
      return 0;
    }

    if (customerType === "Commercial") {
      return invoiceCostSubtotal;
    }

    const normalizedProjectCode = String(formData?.projectCode || "")
      .trim()
      .toUpperCase();
    if (normalizedProjectCode === "ALAM-409-NB") {
      let costSum = 0;
      for (const line of fieldCopies || []) {
        if (!line || line.status === "Delete") continue;
        if (String(line?.source || "").toLowerCase() === "labor") continue;
        if (!line?.isTaxable) continue;
        costSum += lineItemCostSum(line);
      }
      for (const labor of laborData || []) {
        if (!labor?.isLaborTaxable) continue;
        costSum += lineItemCostSum(labor);
      }
      return costSum;
    }

    return workSummaryDisplayTotals.taxableCost;
  }, [
    workSummaryDisplayTotals,
    formData?.customerType,
    formData?.projectCode,
    fieldCopies,
    laborData,
    invoiceCostSubtotal,
  ]);

  const invoiceSalesTaxOnCost = useMemo(() => {
    const tc = Number(formData.taxCredits) || 0;
    const base = Number(invoiceCostTaxable) || 0;
    if (formData.isProjectTaxable) {
      return (taxPercent * Math.max(0, base - tc)) / 100;
    }
    if (tc > base) return 0;
    return (taxPercent * base) / 100;
  }, [
    formData.isProjectTaxable,
    formData.taxCredits,
    taxPercent,
    invoiceCostTaxable,
  ]);

  /** Subtotal / taxable / grand-total display — same rules as Customer Copy. */
  const officeInvoiceSummaryDisplay = useMemo(() => {
    const tc = Number(formData?.taxCredits) || 0;
    const ntc = Number(formData?.nonTaxCredits) || 0;
    const netSellSubtotal =
      (Number(invoiceSellSubtotal) || 0) - tc - ntc;
    const netCostSubtotal =
      (Number(invoiceCostSubtotal) || 0) - tc - ntc;
    const sellTaxableBase = Number(invoiceSellTaxable) || 0;
    const costTaxableBase = Number(invoiceCostTaxable) || 0;

    const displaySellTaxable = formData?.isProjectTaxable
      ? sellTaxableBase - tc
      : tc > sellTaxableBase
        ? 0
        : sellTaxableBase;
    const displayCostTaxable = formData?.isProjectTaxable
      ? costTaxableBase - tc
      : tc > costTaxableBase
        ? 0
        : costTaxableBase;

    return {
      netSellSubtotal,
      netCostSubtotal,
      displaySellTaxable,
      displayCostTaxable,
      sellGrandTotal: netSellSubtotal + (Number(invoiceSalesTax) || 0),
      costGrandTotal: netCostSubtotal + (Number(invoiceSalesTaxOnCost) || 0),
    };
  }, [
    formData?.taxCredits,
    formData?.nonTaxCredits,
    formData?.isProjectTaxable,
    invoiceSellSubtotal,
    invoiceCostSubtotal,
    invoiceSellTaxable,
    invoiceCostTaxable,
    invoiceSalesTax,
    invoiceSalesTaxOnCost,
  ]);

  useEffect(() => {
    const customerType = formData?.customerType;
    if (customerType === "Exempt") {
      setTaxableAmount(0);
      return;
    }
    if (customerType === "Commercial") {
      setTaxableAmount((materialsTotal || 0) + (laborTotal || 0));
      return;
    }

    const normalizedProjectCode = String(formData?.projectCode || "")
      .trim()
      .toUpperCase();
    if (normalizedProjectCode === "ALAM-409-NB") {
      let rawTaxable = 0;
      for (const line of fieldCopies || []) {
        if (!line || line.status === "Delete") continue;
        if (String(line?.source || "").toLowerCase() === "labor") continue;
        if (line?.isTaxable) rawTaxable += Number(line?.totalPrice || 0);
      }
      for (const labor of laborData || []) {
        if (!labor?.isLaborTaxable) continue;
        rawTaxable += Number(labor?.totalPrice || 0);
      }
      setTaxableAmount(rawTaxable);
      return;
    }

    setTaxableAmount(workSummaryDisplayTotals.taxableSell);
  }, [
    formData?.customerType,
    formData?.projectCode,
    workSummaryDisplayTotals,
    fieldCopies,
    laborData,
    materialsTotal,
    laborTotal,
  ]);

  // Calculate aggregate COST and MARKUP amounts for all items
  useEffect(() => {
    let calculatedCost = 0;
    let hasValidCost = false;

    fieldCopies.forEach((item) => {
      const lineCost = getOfficeFieldCopyLineCost(item);
      if (lineCost > 0) {
        calculatedCost += lineCost;
        hasValidCost = true;
      }
    });

    // Work Summary MARKUP = avg percentage (cost ke hisab se weighted)
    const subtotal = (materialsTotal || 0) + (laborTotal || 0) - (Number(formData?.taxCredits) || 0) - (Number(formData?.nonTaxCredits) || 0);
    const markupDollars = hasValidCost && subtotal >= 0 && calculatedCost > 0 ? subtotal - calculatedCost : 0;
    const calculatedMarkup = calculatedCost > 0 && markupDollars >= 0 ? (markupDollars / calculatedCost) * 100 : null;

    setCost(hasValidCost ? calculatedCost : null);
    setMarkup(calculatedMarkup);
  }, [fieldCopies, materialsTotal, laborTotal, formData?.taxCredits, formData?.nonTaxCredits]);

  useEffect(() => {
    getProjectById();
    getJobTypeById();
    getTaxPercentage();
    getFGAddress();
    getOfficeFieldCopyData();
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    getJobTypeById();
  }, [formData]);

  function formatDate(dateInput) {
    try {
      if (!dateInput) {
        return;
      }
      dateInput = Number.parseInt(dateInput, 10);
      const date = new Date(dateInput);
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        throw new Error("Invalid date input");
      }

      const months = [
        "January",
        "Febuary",
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

      const day = date.getDate();
      const month = months[date.getMonth()];
      const year = date.getFullYear();

      return `${day} ${month} ${year}`;
    } catch (error) {
      console.log("Error", error);
    }
  }

  const getProjectById = async () => {
    try {
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/project/get-project/${id}`,
        { headers: headers }
      );
      if (response.data.statusCode === 200) {
        if (!response.data.result.isProjectStarted) {
          navigate(-1);
        }
        setFormData(response.data.result);
        let doc_name = response?.data?.result?.customerName?.toUpperCase() || "";
        if (doc_name.includes(" ")) {
          doc_name = (
            doc_name.split(" ")[1] +
            "_" +
            doc_name.split(" ")[0]
          )?.replace(",", "");
        }
        setDocumentName(doc_name);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Something went wrong while loading project data."
      );
    }
  };

  function moveLaborToBottom(data) {
    return data.sort((a, b) => {
      if (a.source === "Labor" && b.source !== "Labor") return 1;
      if (a.source !== "Labor" && b.source === "Labor") return -1;
      return 0;
    });
  }

  const getOfficeFieldCopyData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/project/get-office-field-copy/${id}`,
        { headers: headers }
      );

      console.log("Response in field copy", response);

      if (response.data.statusCode === 200) {
        let resultedCopies = [
          ...response.data.result.officeFieldCopies,
          ...response.data.result.officeDraftCopies,
        ];

        // Debug: Check if cost and markup are present in the data
        console.log("Sample field copy item:", resultedCopies[0]);
        if (resultedCopies[0]) {
          console.log("Cost:", resultedCopies[0].cost, "Markup:", resultedCopies[0].markup, "MarkUp:", resultedCopies[0].markUp);
        }

        resultedCopies = moveLaborToBottom(resultedCopies);

        console.log("response.data.result.materialDraftData", response.data.result.materialDraftData)

        let resultedMaterials = [];

        const updatedDraftData = response.data.result.materialDraftData.map((item) => {
          return {
            ...item,
            jobType: item?.jobType?.jobType
          }
        })

        const bothMaterialData = [
          ...response.data.result.materialData,
          ...updatedDraftData,
        ];
        bothMaterialData.forEach((item) => {
          if (item.source !== "Labor") {
            resultedMaterials = [...resultedMaterials, item];
          } else {
            // Source=Labor contractor lines belong in material work-summary
            // rows (same as table); keep each reference separate.
            resultedMaterials = [
              ...resultedMaterials,
              {
                ...item,
                jobType: item.jobType,
                reference: item.reference,
                description: item.description,
                type: item.type,
                source: "Labor",
                dataType: "Material",
                isTaxable: item.isTaxable,
                size: item?.measure || item?.size || "",
                totalPrice: item.totalPrice,
                totalCost:
                  item?.totalCost != null && item?.totalCost !== ""
                    ? Number(item.totalCost)
                    : item?.cost != null && item?.cost !== ""
                      ? Number(item.cost) * Number(item?.quantity || 1)
                      : 0,
                cost:
                  item?.cost != null && item?.cost !== ""
                    ? Number(item.cost)
                    : undefined,
                quantity:
                  item?.quantity != null && item?.quantity !== ""
                    ? Number(item.quantity)
                    : undefined,
                price:
                  item?.price != null && item?.price !== ""
                    ? Number(item.price)
                    : undefined,
                markup:
                  item?.markup != null && item?.markup !== ""
                    ? Number(item.markup)
                    : item?.markUp != null && item?.markUp !== ""
                      ? Number(item.markUp)
                      : undefined,
                markUp:
                  item?.markUp != null && item?.markUp !== ""
                    ? Number(item.markUp)
                    : item?.markup != null && item?.markup !== ""
                      ? Number(item.markup)
                      : undefined,
                isLaborTaxable: item.isTaxable,
              },
            ];
          }
        });

        // resultedMaterials = [
        //   ...response.data.result.materialData,
        //   ...response.data.result.materialDraftData,
        // ];
        resultedMaterials = categorizeMaterial(resultedMaterials);
        // console.log("Labors Data resulter", fieldLabors);
        const baseLaborTotals = [
          ...response.data.result.laborData,
          ...response.data.result.laborDraftData,
        ];
        let resultedLabors = [...baseLaborTotals];
        // console.log("-----------------------", resultedLabors);
        resultedLabors = categorizeLabor(resultedLabors);
        // console.log("-----------------------", resultedLabors);
        setFieldLaborData(categorizeLabor(baseLaborTotals));
        setFieldCopies(resultedCopies);
        setMaterialData(resultedMaterials);
        setLaborData(resultedLabors);
        setMaterialLaborData(
          sortByJobType([...resultedMaterials, ...resultedLabors])
        );
        // setFieldCopies(response.data.result.officeFieldCopies);
        // setMaterialData(response.data.result.materialData);
        // setLaborData(response.data.result.laborData);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error(error);
      // toast.error(error.response.message);
    }
    setLoading(false);
  };

  function sortByJobType(data) {
    return data.sort((a, b) => a.jobType.localeCompare(b.jobType));
  }

  function categorizeLabor(laborData) {
    const categorizedData = laborData.reduce((result, item) => {
      // Create a unique key combining jobType and isLaborTaxable to handle distinctions
      const key = `${item.jobType}-${item.isLaborTaxable}`;

      if (!result[key]) {
        // Initialize a new entry for this jobType and tax status combination
        result[key] = {
          jobType: item.jobType,
          reference: item.reference,
          description: item.description,
          source: item.source,
          size: item?.size || item?.measure || "",
          totalPrice: 0,
          totalCost: 0,
          quantity: 0,
          cost: undefined,
          price: undefined,
          markup: undefined,
          markUp: undefined,
          isLaborTaxable: item.isLaborTaxable,
          dataType: item.dataType,
        };
      }
      // Sum up the totalPrice for the current jobType and tax status combination
      result[key].totalPrice += item.totalPrice;
      result[key].totalCost += lineItemCostSum(item);
      result[key].quantity +=
        item?.quantity != null && item?.quantity !== ""
          ? Number(item.quantity)
          : 0;
      if (result[key].cost === undefined && item?.cost != null && item?.cost !== "") {
        result[key].cost = Number(item.cost);
      }
      if ((!result[key].size || String(result[key].size).trim() === "") && (item?.size || item?.measure)) {
        result[key].size = item?.size || item?.measure;
      }
      if (result[key].price === undefined && item?.price != null && item?.price !== "") {
        result[key].price = Number(item.price);
      }
      if (result[key].markup === undefined && item?.markup != null && item?.markup !== "") {
        result[key].markup = Number(item.markup);
      }
      if (result[key].markUp === undefined && item?.markUp != null && item?.markUp !== "") {
        result[key].markUp = Number(item.markUp);
      }
      return result;
    }, {});

    // Convert the result object to an array format
    return Object.values(categorizedData);
  }

  // function categorizeMaterial(materialData) {
  //   const categorizedData = materialData.reduce((result, item) => {
  //     // Check if the jobType already exists in the result object
  //     if (!result[item.jobType]) {
  //       // Initialize a new entry for this jobType
  //       result[item.jobType] = {
  //         jobType: item.jobType,
  //         totalPrice: 0,
  //         isTaxable: item.isTaxable,
  //         source: item.source,
  //       };
  //     }
  //     // Sum up the totalPrice for the current jobType
  //     result[item.jobType].totalPrice += item.totalPrice;
  //     return result;
  //   }, {});

  //   // Convert the result object to an array format
  //   return Object.values(categorizedData);
  // }

  function categorizeMaterial(materialData) {
    console.log("Material Data", materialData)
    const categorizedData = materialData.reduce((result, item) => {
      // Determine the category based on source
      const category = item.source === "Labor" ? "Labor" : "F&G/Other/LumpSum";

      // Keep Source=Labor lines separate by reference so Work Summary
      // doesn't collapse multiple contractor rows under same job type.
      const laborRefKey =
        item.source === "Labor"
          ? String(item.reference || item.description || item.type || "")
              .trim()
              .toLowerCase()
          : "";
      const key = laborRefKey
        ? `${category}_${item.jobType}_${item.isTaxable}_${laborRefKey}`
        : `${category}_${item.jobType}_${item.isTaxable}`;

      // Check if the category and jobType already exist in the result object
      if (!result[key]) {
        result[key] = {
          category, // Store the category
          jobType: item.jobType,
          reference: item.reference,
          description: item.description,
          totalPrice: 0,
          totalCost: 0,
          isTaxable: item.isTaxable,
          source: item.source,
          dataType: item.dataType || "Material",
        };
      }

      // Sum up the totalPrice for the current category & jobType
      result[key].totalPrice += item.totalPrice;
      result[key].totalCost += lineItemCostSum(item);

      return result;
    }, {});

    // Convert the result object to an array format
    return Object.values(categorizedData);
  }

  const getFGAddress = async () => {
    try {
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/admin/get-fg-address`,
        { headers: headers }
      );
      if (response.data.statusCode === 200) {
        // console.log("Response", response.data.result);
        setAddress(response.data.result);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Something went wrong while loading address."
      );
    }
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
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Something went wrong while loading job type."
      );
    }
  };

  const calculateTotals = (fieldCopies) => {
    const totals = {
      laborTotal: 0,
      materialsTotal: 0,
    };

    materialData.forEach((item) => {
      totals.materialsTotal += item.totalPrice;
    });

    laborData.forEach((item) => {
      totals.laborTotal += item.totalPrice;
    });

    return totals;
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
        setTaxPercent(response.data.result.taxPercent);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Something went wrong while loading tax percentage."
      );
    }
  };

  const summarizeFieldCopies = (fieldCopies) => {
    const summary = {};

    fieldCopies.forEach((item) => {
      // Labor ko reference (job type) ke basis par merge karein,
      // baaki items ke liye purana key (reference+measure+price) hi rakhen.
      const laborKind =
        item?.source === "Labor" &&
        ((item?.vendorName != null && String(item.vendorName).trim() !== "") ||
          (item?.vendor != null && String(item.vendor).trim() !== "") ||
          (item?.type != null &&
            String(item.type).toLowerCase().includes("contract")))
          ? "CONTRACTOR"
          : "F&G";
      const laborRef =
        item?.source === "Labor" ? `${item.reference} (${laborKind})` : item.reference;
      const key =
        item?.source === "Labor"
          ? `${item.reference}-${laborKind}` // separate contractor labor from F&G labor
          : `${item.reference}-${item.measure}-${item.price}`;

      if (!summary[key]) {
        summary[key] = {
          source: item.source,
          isTaxable: item.isTaxable,
          reference: laborRef,
          description: item.description,
          size: item.measure,
          quantity: 0,
          price: item.price,
          totalCost: 0,
          totalPrice: 0,
          cost: item.cost !== undefined && item.cost !== null ? Number(item.cost) : undefined,
          markup: (item.markup !== undefined && item.markup !== null) ? Number(item.markup) : (item.markUp !== undefined && item.markUp !== null) ? Number(item.markUp) : undefined,
          markUp: (item.markUp !== undefined && item.markUp !== null) ? Number(item.markUp) : (item.markup !== undefined && item.markup !== null) ? Number(item.markup) : undefined,
        };
      }

      summary[key].quantity += Number(item.quantity || 0);
      summary[key].totalPrice += Number(item.totalPrice || 0);
      // totalCost should represent base cost dollars (before markup).
      // Prefer explicit totalCost; else (unit cost * qty); else derive from markup% + totalPrice.
      const qty = Number(item.quantity || 0);
      const itemTotalCost =
        item.totalCost !== undefined && item.totalCost !== null && item.totalCost !== ""
          ? Number(item.totalCost)
          : 0;
      const unitCost =
        item.cost !== undefined && item.cost !== null && item.cost !== ""
          ? Number(item.cost)
          : 0;
      const markupValRaw = item.markup ?? item.markUp ?? null;
      const markupPct =
        markupValRaw !== null &&
        markupValRaw !== undefined &&
        markupValRaw !== "" &&
        !Number.isNaN(Number(markupValRaw))
          ? Number(markupValRaw)
          : null;
      const totalPriceVal =
        item.totalPrice !== undefined && item.totalPrice !== null && item.totalPrice !== ""
          ? Number(item.totalPrice)
          : 0;

      let baseCost = 0;
      if (Number.isFinite(itemTotalCost) && itemTotalCost > 0) {
        baseCost = itemTotalCost;
      } else if (Number.isFinite(unitCost) && unitCost > 0 && qty > 0) {
        baseCost = unitCost * qty;
      } else if (
        Number.isFinite(totalPriceVal) &&
        totalPriceVal > 0 &&
        markupPct != null &&
        Number.isFinite(markupPct) &&
        markupPct >= 0
      ) {
        baseCost = totalPriceVal / (1 + markupPct / 100);
      }
      const safeBaseCost = Number.isFinite(baseCost) && baseCost > 0 ? baseCost : 0;
      summary[key].totalCost += safeBaseCost;

      // If markup is present but totalPrice doesn't reflect it, correct totalPrice aggregation.
      // - If totalPrice ~= expectedWithMarkup, keep it.
      // - If totalPrice ~= baseCost (markup not applied), use expectedWithMarkup.
      // - Otherwise keep totalPrice as-is to avoid breaking other cases.
      let sellTotalToAdd = Number.isFinite(totalPriceVal) ? totalPriceVal : 0;
      if (markupPct != null && Number.isFinite(markupPct) && markupPct >= 0 && safeBaseCost > 0) {
        const expectedWithMarkup = safeBaseCost * (1 + markupPct / 100);
        const rel = (a, b) => (b === 0 ? 0 : Math.abs(a - b) / Math.abs(b));
        if (Number.isFinite(expectedWithMarkup) && expectedWithMarkup > 0) {
          if (rel(sellTotalToAdd, expectedWithMarkup) < 0.01) {
            // already includes markup
          } else if (rel(sellTotalToAdd, safeBaseCost) < 0.01) {
            // totalPrice is base cost; apply markup
            sellTotalToAdd = expectedWithMarkup;
          }
        }
      }
      // Replace earlier naive totalPrice accumulation by adding the corrected amount.
      // Since we already did `summary[key].totalPrice += Number(item.totalPrice || 0);` above,
      // we need to adjust by removing that and adding the corrected value.
      // NOTE: this block assumes the naive add happened immediately before this section.
      // (We keep it consistent by reversing and re-adding.)
      summary[key].totalPrice -= Number(item.totalPrice || 0);
      summary[key].totalPrice += Number(sellTotalToAdd || 0);
      // Preserve cost, price, markup from first item that has value
      if (summary[key].cost === undefined && item.cost !== undefined && item.cost !== null) {
        summary[key].cost = Number(item.cost);
      }
      if ((summary[key].price === undefined || summary[key].price === null || summary[key].price === "") && item.price !== undefined && item.price !== null && item.price !== "") {
        summary[key].price = Number(item.price);
      }
      if (summary[key].markup === undefined && summary[key].markUp === undefined) {
        if (item.markup !== undefined && item.markup !== null) {
          summary[key].markup = Number(item.markup);
          summary[key].markUp = Number(item.markup);
        } else if (item.markUp !== undefined && item.markUp !== null) {
          summary[key].markup = Number(item.markUp);
          summary[key].markUp = Number(item.markUp);
        }
      }
    });

    return Object.values(summary);
  };

  // console.log("Formdata", address);

  const saveDocumentAs = () => {
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

  function convertToCentralTime(milliseconds) {
    // Convert milliseconds to a Date object

    milliseconds = Number.parseInt(milliseconds);

    const date = new Date(milliseconds);

    // Format the date to Central Time (US & Canada)
    let centralTime = date.toLocaleString("en-US", {
      // timeZone: "America/Chicago", // Central Time Zone
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    return centralTime;
  }

  function convertMillisecondsToDate(ms) {
    ms = Number.parseInt(ms);
    const date = new Date(ms);

    // Extract month, day, and year
    const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed
    const day = String(date.getDate()).padStart(2, "0");
    const year = String(date.getFullYear()).slice(-4); // Get the last 2 digits of the year

    // Return in MM/DD/YY format
    return `${month}/${day}/${year}`;
  }

  const handleInvoiceJobType = (jobType) => {
    if (["professional", "pick up/delivery"].includes(jobType?.toLowerCase())) {
      return "SERVICE";
    } else if (jobType?.toLowerCase() === "equipment rental") {
      return "";
    } else if (jobType?.toLowerCase() === "reimbursement total") {
      return "";
    } else if (jobType?.includes("Lump Sum")) {
      return "";
    } else {
      return "MATERIAL";
    }
  };

  /** Column weights: narrower DESCRIPTION so other columns shift right. */
  const workSummaryGridClass =
    "grid grid-cols-[minmax(340px,36%)_minmax(0,10.666%)_minmax(0,10.666%)_minmax(0,10.666%)_minmax(0,10.666%)_minmax(0,10.666%)_minmax(0,10.666%)] gap-x-0 gap-y-1";

  /** PDF: slight nudge so COST lines up with html2pdf render. */
  const workSummaryGridClassPdf =
    "grid grid-cols-[minmax(325px,36%)_minmax(0,10.666%)_minmax(0,10.666%)_minmax(0,10.666%)_minmax(0,10.666%)_minmax(0,10.666%)_minmax(0,10.666%)] gap-x-0 gap-y-1";

  function formatAddress(address) {
    return address.replace(/(\d+)/, "\n$1");
  }

  console.log("Material Job Type ", materialData)

  return (
    <Layout>
      <ToastContainer />
      <div
        className={`${tableSize === 250 ? "md:ml-[250px]" : "md:ml-[90px]"}`}
      >
        <div className="lg:p-10 p-3">
          <div className="card">
            <div className="card-header bg-[#00613e] text-white">
              <h3 className="card-title mt-1">
                <button
                  onClick={() => {
                    navigate(-1);
                  }}
                >
                  <i className="fa fa-arrow-left mr-2"></i>
                </button>{" "}
                View Office Copy
              </h3>
            </div>

            {/* Modal For Save As */}
            <div
              className="modal fade"
              id="exampleModalCenter_saveAs"
              tabIndex={-1}
              role="dialog"
              aria-labelledby="exampleModalCenterTitle"
              aria-hidden="true"
            >
              <div
                className="modal-dialog modal-dialog-centered"
                role="document"
              >
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title" id="exampleModalLongTitle">
                      Save Document As
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
                        name="documentName"
                        maxLength={200}
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
                        saveDocumentAs();
                      }}
                    >
                      Download PDF
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* downloaded copy */}
            <div
              className=""
              style={{
                display: "none",
              }}
            >
              <div className="pb-3" id="content-to-pdf">
                <div className="text-center mb-4">
                  <h5 className=" text-[red] tracking-wide">
                    <span className="border-b border-[red] pb-[7px]">
                      {billingTypeLower.includes("no bid")
                        ? "OFFICE COPY - NO BID"
                        : "OFFICE COPY"}
                    </span>
                  </h5>
                </div>
                {/* Project Data */}
                <div className="flex flex-row gap-3 justify-between mt-1">
                  <div className="flex flex-col w-1/3 md:w-[280px]">
                    <div className="p-0 capitalize">
                      {/* <h6 className="font-bold text-[15px]">Date</h6> */}
                      <p className="text-xs font-medium capitalize">
                        <span className="border-b border-black pb-[7px]">
                          PROJECT LOCATION
                        </span>
                      </p>
                    </div>
                    <div className="p--0 capitalize">
                      <p className="text-xs break-words capitalize">
                        {formData?.customerName?.toUpperCase()}
                      </p>
                    </div>
                    <div className="p-0 capitalize">
                      {/* <h6 className="text-[13px] font-semibold">
                          Project Location
                        </h6> */}
                      {/* <h6 className="font-bold text-[15px]">Job Address</h6> */}
                      <p className="text-xs break-words">
                        {formData?.jobAddress?.toUpperCase()}
                      </p>
                    </div>
                    {formData && formData.billAddress && (
                      <div className="p-0 capitalize mt-0.5">
                        <h6 className="text-xs font-medium ">
                          <span className="border-b border-black pb-[7px]">
                            BILLING ADDRESS
                          </span>
                        </h6>
                        <p className="text-xs break-words">
                          {formatAddress(formData?.billAddress?.toUpperCase())
                            .split("\n")
                            .map((line, index) => (
                              <React.Fragment key={index}>
                                {line}
                                <br />
                              </React.Fragment>
                            ))}
                        </p>
                      </div>
                    )}

                    {formData && formData?.billingName && (
                      <div className="p-0">
                        <p className="text-xs break-words">
                          {formData?.billingName}
                        </p>
                      </div>
                    )}

                    {/* <div className="p-0.5">
                      <h6 className="font-bold text-[15px]">Job Address</h6>
                      <p className="text-xs break-words">{formData?.jobAddress}</p>
                    </div> */}
                    {formData && formData?.customerEmail && (
                      <div className="p-0">
                        <p className="text-xs break-words">
                          {formData?.customerEmail}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col w-1/3 md:w-[280px]">
                    {/* F&G Logo */}
                    <div className="flex justify-center mr-2">
                      <img
                        src={fng_logo}
                        alt="F&G Logo"
                        className="h-[140px] w-full"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col w-1/3 md:w-[280px] text-end capitalize">
                    <div className="p-0">
                      <h6 className="font-bold text-[15px]">F&G INC</h6>
                      <pre
                        className="text-xs break-words p-0 pb-2 leading-4"
                        style={{ fontFamily: "Source Sans Pro" }}
                      >
                        {address}
                      </pre>
                    </div>
                    <div className="p-0">
                      <p className="text-xs break-words">
                        {formData.officeCopyId}
                      </p>
                    </div>
                    <div className="p-0">
                      {/* <h6 className="font-bold text-[15px]">Project Code</h6> */}
                      {formData?.projectCompletedDate && (
                        <p className="text-xs break-words">
                          {convertMillisecondsToDate(
                            formData?.projectCompletedDate
                          )}
                        </p>
                      )}
                      <p className="text-xs break-words">
                        {formData.projectCode}
                      </p>
                    </div>
                  </div>
                </div>
                {/* Description */}
                <div className="p-0 mt-8">
                  {/* <h6 className="font-semibold text-[13px] tracking-wide capitalize underline">
                    {jobType?.toUpperCase()} SERVICE ({formData?.jobName?.toUpperCase()}):
                  </h6> */}
                  <h6 className="font-semibold text-[13px] tracking-wide capitalize mt-6">
                    <span className="font-semibold text-[13px] tracking-wide capitalize">
                      <span className="border-b border-black pb-[7px]">
                        {jobType?.toUpperCase()} SERVICE
                      </span>
                    </span>
                    {formData.jobName && (
                      <span className="font-normal text-xs capitalize ml-2">
                        : {formData.jobName?.toUpperCase()}
                      </span>
                    )}
                  </h6>
                  <p className="text-xs break-words">
                    {parse(formData.description)}
                  </p>
                </div>

                {/* Office Copies Data */}
                <div className="">
                  {/* Compiled data by Material */}
                  <div className="w-full mt-3 text-[15px] overflow-x-scroll">
                    {categorizedFieldCopies.length > 0 ||
                      laborData.length > 0 ? (
                      categorizedFieldCopies.map((group, index) => (
                        <div key={index} className="mb-0">
                          {/* <h4 className="font-bold text-[15px] mb-3">
                            {group.category}
                          </h4> */}
                          <table
                            className="w-full text-xs"
                            style={{ tableLayout: "fixed", width: "100%" }}
                          >
                            <colgroup>
                              <col style={{ width: "36%" }} />
                              <col style={{ width: "10.666%" }} />
                              <col style={{ width: "10.666%" }} />
                              <col style={{ width: "10.666%" }} />
                              <col style={{ width: "10.666%" }} />
                              <col style={{ width: "10.666%" }} />
                              <col style={{ width: "10.666%" }} />
                            </colgroup>
                            <thead className="">
                              <tr>
                                {/* <th className="text-xs">
                                  <span className="relative -top-1.5">
                                    Source
                                  </span>
                                </th> */}
                                <th
                                  className="text-xs pl-2 pr-3"
                                  style={{ textAlign: "left" }}
                                >
                                  <span className="relative -top-1.5">
                                    DESCRIPTION
                                  </span>
                                </th>
                                <th
                                  className="text-xs px-2"
                                  style={{ textAlign: "center" }}
                                >
                                  <span className="relative -top-1.5">
                                    SIZE
                                  </span>
                                </th>
                                <th
                                  className="text-xs px-2"
                                  style={{ textAlign: "center" }}
                                >
                                  <span className="relative -top-1.5">
                                    QUANTITY
                                  </span>
                                </th>
                                <th
                                  className="text-xs pr-2"
                                  style={{ textAlign: "right" }}
                                >
                                  <span className="relative -top-1.5">
                                    COST
                                  </span>
                                </th>
                                <th
                                  className="text-xs pr-2"
                                  style={{ textAlign: "right" }}
                                >
                                  <span className="relative -top-1.5">
                                    MARKUP
                                  </span>
                                </th>
                                <th
                                  className="text-xs pr-2"
                                  style={{ textAlign: "right" }}
                                >
                                  <span className="relative -top-1.5">
                                    PRICE
                                  </span>
                                </th>
                                <th
                                  className="text-xs pr-2"
                                  style={{ textAlign: "right" }}
                                >
                                  <span className="relative -top-1.5">
                                    TOTAL
                                  </span>
                                </th>
                              </tr>
                            </thead>
                            {/* <tbody>
                              {group &&
                                group.items &&
                                group.items.length > 0 &&
                                group.items.map((item, idx) => (
                                  <tr key={idx}>
                                    <td className="text-xs w-[400px] pr-2">
                                      {item?.reference?.toUpperCase()}
                                    </td>
                                    <td className="text-xs">{item?.size}</td>
                                    <td className="text-xs pl-4">
                                      {item?.quantity ? item.quantity : ""}
                                    </td>
                                    <td className="text-xs">
                                      {item?.price && <b>$</b>}
                                      <span className="ml-4">
                                        {item?.price?.toLocaleString("en-US", {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        })}
                                      </span>
                                    </td>
                                    <td className="text-xs text-end">
                                      <b>$</b>
                                      <span className="w-[80px] inline-block">
                                        {" "}
                                        {item?.totalPrice?.toLocaleString(
                                          "en-US",
                                          {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          }
                                        )}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              <tr>
                                <td colSpan="3" className="font-bold">
                                </td>
                                <td>
                                  {group.items.reduce(
                                    (acc, item) => acc + item.quantity,
                                    0
                                  )}
                                </td>
                                <td>
                                  {group.items
                                    .reduce((acc, item) => acc + item.price, 0)
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
                            </tbody> */}
                            <tbody>
                              {group &&
                                group.items &&
                                group.items.length > 0 &&
                                group.items.map((item, idx) => {
                                  const {
                                    isLaborLine,
                                    lineCost,
                                    displayPrice,
                                    markupVal,
                                    displayTotal,
                                    qtyText,
                                  } = getOfficeFieldCopyRowCalculations(item);

                                  if (isLaborLine) {
                                    return (
                                      <tr key={idx}>
                                        <td
                                          className="pl-2 pr-3 min-w-0 align-top"
                                          style={{ textAlign: "left" }}
                                        >
                                          {item?.reference?.toUpperCase()}
                                        </td>
                                        <td className="px-2" style={{ textAlign: "center" }}>
                                          {item?.size}
                                        </td>
                                        <td className="px-2" style={{ textAlign: "center" }}>
                                          {getBidTableQtyFallback(item, qtyText)}
                                        </td>
                                        <td className="pr-2 tabular-nums" style={{ textAlign: "right" }}>
                                          {lineCost > 0
                                            ? lineCost.toLocaleString("en-US", {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                              })
                                            : ""}
                                        </td>
                                        <td className="pr-2 tabular-nums" style={{ textAlign: "right" }}>
                                          {markupVal !== null && markupVal !== undefined && markupVal !== ""
                                            ? Number(markupVal).toLocaleString("en-US", {
                                                minimumFractionDigits: 0,
                                                maximumFractionDigits: 2,
                                              }) + "%"
                                            : ""}
                                        </td>
                                        <td className="pr-2 tabular-nums" style={{ textAlign: "right" }}>
                                          {displayPrice != null && !isNaN(displayPrice)
                                            ? displayPrice.toLocaleString("en-US", {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                              })
                                            : ""}
                                        </td>
                                        <td
                                          className="text-end tabular-nums whitespace-nowrap pr-2"
                                          style={{ textAlign: "right" }}
                                        >
                                          {displayTotal > 0
                                            ? formatFieldCopyAmount(displayTotal)
                                            : ""}
                                        </td>
                                      </tr>
                                    );
                                  }

                                  return (
                                    <tr key={idx}>
                                      <td
                                        className="pl-2 pr-3 min-w-0 align-top"
                                        style={{ textAlign: "left" }}
                                      >
                                        {item?.reference?.toUpperCase()}
                                      </td>
                                      <td
                                        className="px-2"
                                        style={{ textAlign: "center" }}
                                      >
                                        {item?.size}
                                      </td>
                                      <td
                                        className="px-2"
                                        style={{ textAlign: "center" }}
                                      >
                                        {getBidTableQtyFallback(item)}
                                      </td>
                                      <td
                                        className="pr-2 tabular-nums"
                                        style={{ textAlign: "right" }}
                                      >
                                        {lineCost > 0
                                          ? formatFieldCopyAmount(lineCost)
                                          : ""}
                                      </td>
                                      <td
                                        className="pr-2 tabular-nums"
                                        style={{ textAlign: "right" }}
                                      >
                                        {markupVal !== null && markupVal !== undefined && markupVal !== ""
                                          ? Number(markupVal).toLocaleString("en-US", {
                                              minimumFractionDigits: 0,
                                              maximumFractionDigits: 2,
                                            }) + "%"
                                          : ""}
                                      </td>
                                      <td
                                        className="pr-2 tabular-nums"
                                        style={{ textAlign: "right" }}
                                      >
                                        {displayPrice != null && !isNaN(displayPrice)
                                          ? formatFieldCopyAmount(displayPrice)
                                          : ""}
                                      </td>
                                        <td
                                          className="text-end tabular-nums whitespace-nowrap pr-2"
                                        style={{ textAlign: "right" }}
                                      >
                                        {displayTotal > 0
                                          ? formatFieldCopyAmount(displayTotal)
                                            : ""}
                                      </td>
                                    </tr>
                                  );
                                })}
                              {renderOfficeCrewLaborRows("view")}
                            </tbody>
                          </table>
                        </div>
                      ))
                    ) : (
                      <p className="pb-2">No field copies available.</p>
                    )}
                    <table className="w-full text-xs">
                      {/* <tbody>
                        {fieldLaborData
                          .filter((labor) => labor.totalPrice !== 0)
                          .map((labor) => {
                            return (
                              <tr className="">
                                <td className="">
                                  <p>{labor.jobType?.toUpperCase()} LABOR</p>
                                </td>
                                <td className="text-xs text-end">
                                  <b>$</b>
                                  <span className="w-[80px] inline-block">
                                    {" "}
                                    {labor?.totalPrice?.toLocaleString(
                                      "en-US",
                                      {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      }
                                    )}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody> */}
                    </table>
                  </div>
                  <div className="mt-2">
                    <h4 className="text-[15px] font-semibold text-center mb-6">
                      WORK SUMMARY
                    </h4>
                  </div>

                  {/* Work Summary: same grid as table above — col 4 = COST, col 7 = $ totals */}
                  <div className="mt-4 text-xs tracking-wide w-full">
                    <div
                      className={`${workSummaryGridClassPdf} mb-1 font-semibold uppercase items-baseline`}
                    >
                      <span className="col-span-3 min-w-0" />
                      <span className="text-end whitespace-nowrap">COST</span>
                      <span className="min-w-0" aria-hidden />
                      <span className="min-w-0" aria-hidden />
                      <span className="text-end whitespace-nowrap">$</span>
                    </div>
                    {officeWorkSummaryDisplayRows.map((item) => {
                      if (item.dataType === "Material") {
                        const laborLike = isLaborLikeEntry(item);
                        const rowCost = getBidStyleWorkSummaryCost(item);
                        return (
                          <div
                            key={`ws-m-${item.jobType}-${item.source}-${item.isTaxable}`}
                            className={`${workSummaryGridClassPdf} mt-1 capitalize items-baseline`}
                          >
                            <span className="col-span-3 min-w-0">
                              <b className="w-[200px] inline-block">
                                {item.source === "Labor"
                                  ? getOfficeWorkSummaryDisplayLabel(item, fieldCopies) ||
                                    String(
                                      item.reference ||
                                        item.description ||
                                        ""
                                    ).toUpperCase()
                                  : `${item.jobType?.toUpperCase() || ""} ${
                                      laborLike
                                  ? "LABOR"
                                        : handleInvoiceJobType(item.jobType)
                                    }`.trim()}
                              </b>
                              <b>
                                {formData?.customerType === "Normal"
                                  ? laborLike || ["Labor", "Other"].includes(item.source)
                                    ? item.isTaxable
                                      ? "RT"
                                      : "RNT"
                                    : ["Lump Sum"].includes(item.source)
                                      ? `${item.isTaxable ? "RT" : "RNT"
                                      } (SALES TAX PAID ON MATERIAL)`
                                      : "RT"
                                  : formData.customerType === "Commercial"
                                    ? "CT"
                                    : formData?.customerType?.toUpperCase()}
                              </b>
                            </span>
                            <span className="text-end tabular-nums whitespace-nowrap">
                              {rowCost > 0 ? (
                                <>
                                  <b>$</b>{" "}
                                  {rowCost.toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </>
                              ) : (
                                ""
                              )}
                            </span>
                            <span className="min-w-0" aria-hidden />
                            <span className="min-w-0" aria-hidden />
                            <span className="text-end tabular-nums whitespace-nowrap">
                              <b>$</b>{" "}
                              {getBidStyleWorkSummarySell(item).toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                        );
                      } else {
                        const crewManHours = getFieldCopyPdfLaborManHours(
                          item,
                          laborManHoursByJobType
                        );
                        const isSourceLaborLine =
                          String(item?.source || "").toLowerCase() === "labor";
                        if (
                          item.totalPrice > 0 &&
                          (isSourceLaborLine ||
                            (crewManHours <= 0 &&
                              !shouldSkipAggregatedLaborPdfRow(
                                item,
                                categorizedFieldCopies?.[0]?.items,
                                fieldCopies
                              )))
                        ) {
                          const rowCost = getBidStyleWorkSummaryCost(item);
                          return (
                            <div
                              key={`ws-l-${item.jobType}-${item.isLaborTaxable}`}
                              className={`${workSummaryGridClassPdf} mt-1 items-baseline`}
                            >
                              <span className="col-span-3 min-w-0">
                                <b className="w-[200px] inline-block">
                                  {getOfficeWorkSummaryDisplayLabel(item, fieldCopies) ||
                                    getLaborPdfDescription({
                                      labor: item,
                                      groupItems:
                                        categorizedFieldCopies?.[0]?.items,
                                      fieldCopies,
                                    })?.toUpperCase()}
                                </b>
                                <b>
                                  {formData?.customerType === "Normal"
                                    ? item.isLaborTaxable
                                      ? "RT"
                                      : "RNT"
                                    : formData.customerType === "Commercial"
                                      ? "CT"
                                      : formData?.customerType?.toUpperCase()}
                                </b>
                              </span>
                              <span className="text-end tabular-nums whitespace-nowrap">
                                {rowCost > 0 ? (
                                  <>
                                    <b>$</b>{" "}
                                    {rowCost.toLocaleString("en-US", {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}
                                  </>
                                ) : (
                                  ""
                                )}
                              </span>
                              <span className="min-w-0" aria-hidden />
                              <span className="min-w-0" aria-hidden />
                              <span className="text-end tabular-nums whitespace-nowrap">
                                <b>$</b>{" "}
                                {(Number(item.totalPrice) > 0
                                  ? Number(item.totalPrice)
                                  : getBidStyleWorkSummarySell(item)
                                ).toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                            </div>
                          );
                        }
                      }
                      return null;
                    })}
                    {renderOfficeCrewLaborWorkSummary(
                      workSummaryGridClassPdf,
                      "pdf-ws-crew",
                      officeWorkSummaryMergedCrewKeys
                    )}
                  </div>

                  {/* Invoice Summary */}
                  <div className="w-full mt-5 text-xs">
                    <div className="">
                      {/* <div className="flex justify-between">
                        <span>Total Labor Cost</span>
                        <span>
                          <b>$</b> {laborTotal?.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                        </span>
                      </div>
                      <div className="flex justify-between my-2">
                        <span>Total Material Cost</span>
                        <span>
                          <b>$</b> {materialsTotal?.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                        </span>
                      </div> */}
                      {true && (
                        <>
                          <div className="flex justify-between items-baseline gap-3 my-2">
                            <span className="break-words min-w-0">
                              TAX CREDITS{" "}
                              {formData.taxDescription && (
                                <>
                                  (
                                  {formData.taxDescription.length > 50
                                    ? formData.taxDescription.slice(0, 50) +
                                    " ..."
                                    : formData.taxDescription}
                                  )
                                </>
                              )}
                            </span>
                            <span className="shrink-0 whitespace-nowrap tabular-nums text-end">
                              <b>$</b>{" "}
                              {formData.taxCredits?.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                          <div className="flex justify-between items-baseline gap-3 my-2">
                            <span className="break-words min-w-0">
                              NON TAX CREDITS {" "}
                              {formData.nonTaxDescription && (
                                <>
                                  (
                                  {formData.nonTaxDescription.length > 50
                                    ? formData.nonTaxDescription.slice(0, 50) +
                                    " ..."
                                    : formData.nonTaxDescription}
                                  )
                                </>
                              )}
                            </span>
                            <span className="shrink-0 whitespace-nowrap tabular-nums text-end">
                              <b>$</b>{" "}
                              {formData.nonTaxCredits?.toLocaleString(
                                "en-US",
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                }
                              )}
                            </span>
                          </div>
                        </>
                      )}
                      <div
                        className={`${workSummaryGridClassPdf} my-2 font-semibold items-baseline uppercase`}
                      >
                        <span className="col-span-3 min-w-0">SUBTOTAL</span>
                        <span className="text-end tabular-nums whitespace-nowrap">
                          {officeInvoiceSummaryDisplay.netCostSubtotal > 0 ? (
                            <>
                              <b>$</b>{" "}
                              {officeInvoiceSummaryDisplay.netCostSubtotal.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </>
                          ) : (
                            ""
                          )}
                        </span>
                        <span className="min-w-0" aria-hidden />
                        <span className="min-w-0" aria-hidden />
                        <span className="text-end tabular-nums whitespace-nowrap">
                          <b>$</b>{" "}
                          {Number(officeInvoiceSummaryDisplay.netSellSubtotal).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                      {/* <hr />
                      <div className="flex justify-between my-2">
                        <span>CREDITS</span>
                        <span>
                          <b>$</b>{" "}
                          <span className="inline-block w-[80px] text-end">
                            {" "}
                            {formData.credits?.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </span>
                      </div> */}
                      {/* {!formData.isProjectTaxable && (
                      <>
                      <hr />
                        <div className="flex justify-between my-2">
                          <span>CREDITS</span>
                          <span>
                            <b>$</b>{" "}
                            <span className="inline-block w-[80px] text-end">
                              {" "}
                              {formData.credits?.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </span>
                        </div>
                      </>
                    )} */}
                      <hr />

                      <div
                        className={`${workSummaryGridClassPdf} my-2 items-baseline uppercase`}
                      >
                        <span className="col-span-3 min-w-0">
                          TAXABLE AMOUNT
                        </span>
                        <span className="text-end tabular-nums whitespace-nowrap">
                          <>
                            <b>$</b>{" "}
                            {officeInvoiceSummaryDisplay.displayCostTaxable.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </>
                        </span>
                        <span className="min-w-0" aria-hidden />
                        <span className="min-w-0" aria-hidden />
                        <span className="text-end tabular-nums whitespace-nowrap">
                          <b>$</b>{" "}
                          {Number(officeInvoiceSummaryDisplay.displaySellTaxable).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                      <hr />
                      <div
                        className={`${workSummaryGridClassPdf} my-2 items-baseline uppercase`}
                      >
                        <span className="col-span-3 min-w-0">
                          SALES TAX
                        </span>
                        <span className="text-end tabular-nums whitespace-nowrap">
                          {invoiceSalesTaxOnCost > 0 ? (
                            <>
                          <b>$</b>{" "}
                              {invoiceSalesTaxOnCost.toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                              })}
                            </>
                          ) : (
                            ""
                          )}
                        </span>
                        <span className="min-w-0" aria-hidden />
                        <span className="min-w-0" aria-hidden />
                        <span className="text-end tabular-nums whitespace-nowrap">
                          <b>$</b>{" "}
                          {invoiceSalesTax.toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                          </span>
                      </div>
                      <hr />
                      <div
                        className={`${workSummaryGridClassPdf} my-2 font-semibold items-baseline uppercase`}
                      >
                        <span className="col-span-3 min-w-0">GRAND TOTAL</span>
                        <span className="text-end tabular-nums whitespace-nowrap">
                          {officeInvoiceSummaryDisplay.costGrandTotal > 0 ? (
                            <>
                              <b>$</b>{" "}
                              {officeInvoiceSummaryDisplay.costGrandTotal.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </>
                          ) : (
                            ""
                          )}
                        </span>
                        <span className="min-w-0" aria-hidden />
                        <span className="min-w-0" aria-hidden />
                        <span className="text-end tabular-nums whitespace-nowrap border-b border-black pb-[7px]">
                          <b>$</b>{" "}
                          {officeInvoiceSummaryDisplay.sellGrandTotal.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                      {billingTypeLower.includes("no bid") &&
                        formData &&
                        formData.taxCredits + formData.nonTaxCredits <=
                          invoiceSellSubtotal &&
                        !loading &&
                        (formData.taxCredits <= taxableAmount ||
                          !formData.isProjectTaxable) && (
                        <div
                          className="w-full mt-6 text-left uppercase text-[15px] space-y-1"
                          style={{ pageBreakInside: "avoid" }}
                        >
                          <p className="mb-0 font-semibold">
                            TOTAL AMOUNT:{" "}
                            <span className="tabular-nums normal-case">
                              $
                              {noBidGrandTotal?.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </p>
                          <p className="mb-0 mt-2">
                            TOTAL MAN HOURS:{" "}
                            <span className="tabular-nums normal-case">
                              {formatHours(formData?.totalManHours)}
                            </span>
                          </p>
                          <p className="mb-0">
                            DRAINAGE HOURS:{" "}
                            <span className="tabular-nums normal-case">
                              {formatHours(noBidJobTypeHours.drainage)}
                            </span>
                          </p>
                          <p className="mb-0">
                            ELECTRICAL HOURS:{" "}
                            <span className="tabular-nums normal-case">
                              {formatHours(noBidJobTypeHours.electrical)}
                            </span>
                          </p>
                          <p className="mb-0">
                            HARDSCAPE HOURS:{" "}
                            <span className="tabular-nums normal-case">
                              {formatHours(noBidJobTypeHours.hardscape)}
                            </span>
                          </p>
                          <p className="mb-0">
                            IRRIGATION HOURS:{" "}
                            <span className="tabular-nums normal-case">
                              {formatHours(noBidJobTypeHours.irrigation)}
                            </span>
                          </p>
                          <p className="mb-0">
                            LANDSCAPE HOURS:{" "}
                            <span className="tabular-nums normal-case">
                              {formatHours(noBidJobTypeHours.landscape)}
                            </span>
                          </p>
                          <hr className="mt-2 border-gray-300" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Real Copy */}
            <div className="mt-6 px-6">
              {/* F&G Logo */}
              {/* <div className="hidden">
                <div className="flex justify-center">
                  <img src={fng_logo} alt="F&G Logo" className="h-[100px] " />
                </div>
              </div> */}

              {/* Project Data */}
              <div className="flex flex-col md:flex-row gap-6 justify-around mt-2">
                <div className="flex flex-col w-[300px]">
                  <div className="p-2">
                    <h6 className="font-bold text-[17px]">Date</h6>
                    <p>
                      {formData?.projectStartDate
                        ? formatDate(formData.projectStartDate)
                        : ""}
                    </p>
                  </div>
                  <div className="p-2">
                    <h6 className="font-bold text-[17px]">Customer Name</h6>
                    <p>{formData?.customerName}</p>
                  </div>
                  {formData && formData.jobAddress && (
                    <div className="p-2">
                      <h6 className="font-bold text-[17px]">Job Address</h6>
                      <p>{formData?.jobAddress}</p>
                    </div>
                  )}
                  {formData && formData.customerEmail && (
                    <div className="p-2">
                      <h6 className="font-bold text-[17px]">Email</h6>
                      <p>{formData?.customerEmail}</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col w-[300px]">
                  <div className="p-2">
                    <h6 className="font-bold text-[17px]">Project Code</h6>
                    <p>{formData.projectCode}</p>
                  </div>
                  <div className="p-2">
                    <h6 className="font-bold text-[17px]">Job Type</h6>
                    <p>{jobType}</p>
                  </div>
                  {formData.description && (
                    <div className="p-2">
                      <h6 className="font-bold text-[17px]">
                        Description of work
                      </h6>
                      <p>{parse(formData.description)}</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col w-[300px]">
                  <div className="p-2">
                    <h6 className="font-bold text-[17px]">F&G INC</h6>
                    <pre
                      className="text-base break-words p-0 pb-3"
                      style={{ fontFamily: "Source Sans Pro" }}
                    >
                      {address}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Office Copies Data */}
              <div className="">
                {/* Compiled data by Material */}
                <div className="w-full mt-10 text-[15px] overflow-x-scroll">
                  {!loading ? (
                    categorizedFieldCopies.length > 0 ||
                      laborData.length > 0 ? (
                      categorizedFieldCopies.map((group, index) => (
                        <div key={index} className="mb-8">
                          <h4 className="font-bold text-lg mb-2">
                            {group.category}
                          </h4>
                          <table
                            className="w-full table table-striped text-start"
                            style={{ tableLayout: "fixed", width: "100%" }}
                          >
                            <colgroup>
                              <col style={{ width: "36%" }} />
                              <col style={{ width: "10.666%" }} />
                              <col style={{ width: "10.666%" }} />
                              <col style={{ width: "10.666%" }} />
                              <col style={{ width: "10.666%" }} />
                              <col style={{ width: "10.666%" }} />
                              <col style={{ width: "10.666%" }} />
                            </colgroup>
                            <thead className="bg-[#00613e] text-white">
                              <tr>
                                {/* <th>Source</th> */}
                                <th className="text-start pl-2">Description</th>
                                <th className="text-center">Size</th>
                                <th className="text-center">Quantity</th>
                                <th className="text-end pr-2">Cost</th>
                                <th className="text-end pr-2">Markup</th>
                                <th className="text-end pr-2">Price</th>
                                <th className="text-end pr-2">Total</th>
                              </tr>
                            </thead>
                            {/* <tbody>
                              {group &&
                                group.items &&
                                group.items.length > 0 &&
                                group.items.map((item, idx) => (
                                  <tr key={idx}>
                                    <td className="w-[400px] pr-2">
                                      {item?.reference?.toUpperCase()}
                                    </td>
                                    <td>{item?.size}</td>
                                    <td>
                                      {item?.quantity ? item.quantity : ""}
                                    </td>
                                    <td>
                                      {item?.price?.toLocaleString("en-US", {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })}
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
                              {fieldLaborData
                                .filter((labor) => labor.totalPrice !== 0)
                                .map((labor) => {
                                  return (
                                    <tr className="">
                                      <td className="">
                                        <p>{labor.jobType} LABOR</p>
                                      </td>
                                      <td colSpan={3}></td>
                                      <td className="text-start">
                                        {labor.totalPrice?.toLocaleString(
                                          "en-US",
                                          {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          }
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                            </tbody> */}
                            <tbody>
                              {group &&
                                group.items &&
                                group.items.length > 0 &&
                                group.items.map((item, idx) => {
                                  const {
                                    isLaborLine,
                                    lineCost,
                                    displayPrice,
                                    markupVal,
                                    displayTotal,
                                    qtyText,
                                  } = getOfficeFieldCopyRowCalculations(item);

                                  if (isLaborLine) {
                                    return (
                                      <tr key={idx}>
                                        <td className="min-w-0 pr-2 align-top pl-2">
                                          <p className="m-0">
                                            {item?.reference?.toUpperCase()}
                                          </p>
                                        </td>
                                        <td className="px-2" style={{ textAlign: "center" }}>
                                          {item?.size}
                                        </td>
                                        <td className="px-2" style={{ textAlign: "center" }}>
                                          {getBidTableQtyFallback(item, qtyText)}
                                        </td>
                                        <td className="pr-2 tabular-nums" style={{ textAlign: "right" }}>
                                          {lineCost > 0
                                            ? lineCost.toLocaleString("en-US", {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                              })
                                            : ""}
                                        </td>
                                        <td className="pr-2 tabular-nums" style={{ textAlign: "right" }}>
                                          {markupVal !== null && markupVal !== undefined && markupVal !== ""
                                            ? Number(markupVal).toLocaleString("en-US", {
                                                minimumFractionDigits: 0,
                                                maximumFractionDigits: 2,
                                              }) + "%"
                                            : ""}
                                        </td>
                                        <td className="pr-2 tabular-nums" style={{ textAlign: "right" }}>
                                          {displayPrice != null && !isNaN(displayPrice)
                                            ? displayPrice.toLocaleString("en-US", {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                              })
                                            : ""}
                                        </td>
                                        <td
                                          className="text-end tabular-nums whitespace-nowrap pr-2"
                                          style={{ textAlign: "right" }}
                                        >
                                          {displayTotal > 0
                                            ? formatFieldCopyAmount(displayTotal)
                                            : ""}
                                        </td>
                                      </tr>
                                    );
                                  }

                                  return (
                                    <tr key={idx}>
                                      <td className="min-w-0 pr-2 align-top pl-2">
                                        {item?.reference?.toUpperCase()}
                                      </td>
                                      <td className="text-center px-2">{item?.size}</td>
                                      <td className="text-center px-2">
                                        {getBidTableQtyFallback(item)}
                                      </td>
                                      <td
                                        className="text-end tabular-nums whitespace-nowrap pr-2"
                                        style={{ textAlign: "right" }}
                                      >
                                        {lineCost > 0
                                          ? formatFieldCopyAmount(lineCost)
                                          : ""}
                                      </td>
                                      <td
                                        className="text-end tabular-nums whitespace-nowrap pr-2"
                                        style={{ textAlign: "right" }}
                                      >
                                        {markupVal !== null && markupVal !== undefined && markupVal !== ""
                                          ? Number(markupVal).toLocaleString("en-US", {
                                            minimumFractionDigits: 0,
                                            maximumFractionDigits: 2,
                                            }) + "%"
                                          : ""}
                                      </td>
                                      <td
                                        className="text-end tabular-nums whitespace-nowrap pr-2"
                                        style={{ textAlign: "right" }}
                                      >
                                        {displayPrice != null && !isNaN(displayPrice)
                                          ? formatFieldCopyAmount(displayPrice)
                                          : ""}
                                      </td>
                                      <td
                                        className="text-end tabular-nums whitespace-nowrap pr-2"
                                        style={{ textAlign: "right" }}
                                      >
                                        {displayTotal > 0
                                          ? formatFieldCopyAmount(displayTotal)
                                            : ""}
                                      </td>
                                    </tr>
                                  );
                                })}
                              {renderOfficeCrewLaborRows("pdf")}
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

                <div className="border-t border-neutral-200 pt-5 mt-6">
                  <h4 className="text-base font-semibold text-center tracking-wide text-[#00613e] mb-4">
                    Work Summary
                  </h4>

                {/* Work Summary (on-screen): COST / $ columns match Materials & Other table */}
                <div className="text-xs tracking-wide w-full mb-2 px-2">
                  <div
                    className={`${workSummaryGridClass} mb-1 font-semibold uppercase items-baseline`}
                  >
                    <span className="col-span-3 min-w-0" />
                    <span className="justify-self-end text-end whitespace-nowrap">
                      COST
                    </span>
                    <span className="min-w-0" aria-hidden />
                    <span className="min-w-0" aria-hidden />
                    <span className="justify-self-end text-end whitespace-nowrap">
                      $
                    </span>
                  </div>
                  {officeWorkSummaryDisplayRows.map((item) => {
                    if (item.dataType === "Material") {
                      const laborLike = isLaborLikeEntry(item);
                      const rowCost = getBidStyleWorkSummaryCost(item);
                      return (
                        <div
                          key={`ws2-m-${item.jobType}-${item.source}-${item.isTaxable}`}
                          className={`${workSummaryGridClass} mt-1 capitalize items-baseline`}
                        >
                          <span className="col-span-3 min-w-0">
                            <b className="w-[200px] inline-block">
                              {item.source === "Labor"
                                ? getOfficeWorkSummaryDisplayLabel(item, fieldCopies) ||
                                  String(
                                    item.reference ||
                                      item.description ||
                                      ""
                                  ).toUpperCase()
                                : `${item.jobType?.toUpperCase() || ""} ${
                                    laborLike
                                ? "LABOR"
                                      : handleInvoiceJobType(item.jobType)
                                  }`.trim()}
                            </b>
                            <b>
                              {formData?.customerType === "Normal"
                                ? laborLike || ["Labor", "Other"].includes(item.source)
                                  ? item.isTaxable
                                    ? "RT"
                                    : "RNT"
                                  : ["Lump Sum"].includes(item.source)
                                    ? `${
                                        item.isTaxable ? "RT" : "RNT"
                                      } (SALES TAX PAID ON MATERIAL)`
                                    : "RT"
                                : formData.customerType === "Commercial"
                                  ? "CT"
                                  : formData?.customerType?.toUpperCase()}
                            </b>
                          </span>
                          <span className="justify-self-end text-end tabular-nums whitespace-nowrap">
                            {rowCost > 0 ? (
                              <>
                                <b>$</b>{" "}
                                {rowCost.toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </>
                            ) : (
                              ""
                            )}
                          </span>
                          <span className="min-w-0" aria-hidden />
                          <span className="min-w-0" aria-hidden />
                          <span className="justify-self-end text-end tabular-nums whitespace-nowrap">
                            <b>$</b>{" "}
                            {getBidStyleWorkSummarySell(item).toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      );
                    }

                    const crewManHours = getFieldCopyPdfLaborManHours(
                      item,
                      laborManHoursByJobType
                    );
                    const isSourceLaborLine =
                      String(item?.source || "").toLowerCase() === "labor";
                    if (
                      item.totalPrice > 0 &&
                      (isSourceLaborLine ||
                        (crewManHours <= 0 &&
                          !shouldSkipAggregatedLaborPdfRow(
                            item,
                            categorizedFieldCopies?.[0]?.items,
                            fieldCopies
                          )))
                    ) {
                      const rowCost = getBidStyleWorkSummaryCost(item);
                      return (
                        <div
                          key={`ws2-l-${item.jobType}-${item.isLaborTaxable}`}
                          className={`${workSummaryGridClass} mt-1 items-baseline`}
                        >
                          <span className="col-span-3 min-w-0">
                            <b className="w-[200px] inline-block">
                              {getOfficeWorkSummaryDisplayLabel(item, fieldCopies) ||
                                getLaborPdfDescription({
                                  labor: item,
                                  groupItems:
                                    categorizedFieldCopies?.[0]?.items,
                                  fieldCopies,
                                })?.toUpperCase()}
                            </b>
                            <b>
                              {formData?.customerType === "Normal"
                                ? item.isLaborTaxable
                                  ? "RT"
                                  : "RNT"
                                : formData.customerType === "Commercial"
                                  ? "CT"
                                  : formData?.customerType?.toUpperCase()}
                            </b>
                          </span>
                          <span className="justify-self-end text-end tabular-nums whitespace-nowrap">
                            {rowCost > 0 ? (
                              <>
                                <b>$</b>{" "}
                                {rowCost.toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </>
                            ) : (
                              ""
                            )}
                          </span>
                          <span className="min-w-0" aria-hidden />
                          <span className="min-w-0" aria-hidden />
                          <span className="justify-self-end text-end tabular-nums whitespace-nowrap">
                            <b>$</b>{" "}
                            {(Number(item.totalPrice) > 0
                              ? Number(item.totalPrice)
                              : getBidStyleWorkSummarySell(item)
                            ).toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      );
                    }
                    return null;
                  })}
                  {renderOfficeCrewLaborWorkSummary(
                    workSummaryGridClass,
                    "view-ws-crew",
                    officeWorkSummaryMergedCrewKeys
                  )}
                  <hr className="my-3 border-neutral-300" />
                  {true && (
                    <>
                      <div
                        className={`${workSummaryGridClass} my-2 items-baseline`}
                      >
                        <span className="col-span-3 min-w-0 break-words">
                          TAX CREDITS{" "}
                          {formData.taxDescription && (
                            <>
                              (
                              {formData.taxDescription.length > 50
                                ? formData.taxDescription.slice(0, 50) +
                                  " ..."
                                : formData.taxDescription}
                              )
                            </>
                          )}
                        </span>
                        <span className="min-w-0" aria-hidden />
                        <span className="min-w-0" aria-hidden />
                        <span className="min-w-0" aria-hidden />
                        <span className="justify-self-end text-end tabular-nums whitespace-nowrap inline-flex items-baseline justify-end gap-1">
                          <b className="inline-block w-3 text-end">$</b>
                          <input
                            type="text"
                            className="w-20 max-w-[7rem] outline-none px-1 text-end bg-transparent"
                            value={formData.taxCredits}
                            onInput={(e) => {
                              let val = e.target.value.replace(/[^0-9]/g, "");
                              val = val === "" ? "0" : val;
                              if (Number(val) > 10000000000) return;
                              setFormData({
                                ...formData,
                                taxCredits: Number.parseFloat(val),
                              });
                            }}
                          />
                        </span>
                      </div>
                      <div
                        className={`${workSummaryGridClass} my-2 items-baseline`}
                      >
                        <span className="col-span-3 min-w-0 break-words">
                          NON TAX CREDITS{" "}
                          {formData.nonTaxDescription && (
                            <>
                              (
                              {formData.nonTaxDescription.length > 50
                                ? formData.nonTaxDescription.slice(0, 50) +
                                  " ..."
                                : formData.nonTaxDescription}
                              )
                            </>
                          )}
                        </span>
                        <span className="min-w-0" aria-hidden />
                        <span className="min-w-0" aria-hidden />
                        <span className="min-w-0" aria-hidden />
                        <span className="justify-self-end text-end tabular-nums whitespace-nowrap inline-flex items-baseline justify-end gap-1">
                          <b className="inline-block w-3 text-end">$</b>
                          <input
                            type="text"
                            className="w-20 max-w-[7rem] outline-none px-1 text-end bg-transparent"
                            value={formData.nonTaxCredits}
                            onInput={(e) => {
                              let val = e.target.value.replace(/[^0-9]/g, "");
                              val = val === "" ? "0" : val;
                              if (Number(val) > 10000000000) return;
                              setFormData({
                                ...formData,
                                nonTaxCredits: Number.parseFloat(val),
                              });
                            }}
                          />
                        </span>
                      </div>
                    </>
                  )}
                  <hr className="my-2 border-neutral-300" />
                  <div
                    className={`${workSummaryGridClass} my-2 font-semibold items-baseline uppercase`}
                  >
                    <span className="col-span-3 min-w-0">Subtotal</span>
                    <span className="justify-self-end text-end tabular-nums whitespace-nowrap">
                      {officeInvoiceSummaryDisplay.netCostSubtotal > 0 ? (
                        <>
                          <b>$</b>{" "}
                          {officeInvoiceSummaryDisplay.netCostSubtotal.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </>
                      ) : (
                        ""
                      )}
                    </span>
                    <span className="min-w-0" aria-hidden />
                    <span className="min-w-0" aria-hidden />
                    <span className="justify-self-end text-end tabular-nums whitespace-nowrap">
                      <b>$</b>{" "}
                      {Number(officeInvoiceSummaryDisplay.netSellSubtotal).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <hr className="my-2 border-neutral-300" />
                  <div
                    className={`${workSummaryGridClass} my-2 items-baseline uppercase`}
                  >
                    <span className="col-span-3 min-w-0">Taxable Amount</span>
                    <span className="justify-self-end text-end tabular-nums whitespace-nowrap">
                      <>
                        <b>$</b>{" "}
                        {officeInvoiceSummaryDisplay.displayCostTaxable.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </>
                    </span>
                    <span className="min-w-0" aria-hidden />
                    <span className="min-w-0" aria-hidden />
                    <span className="justify-self-end text-end tabular-nums whitespace-nowrap">
                      <b>$</b>{" "}
                      {Number(officeInvoiceSummaryDisplay.displaySellTaxable).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <hr className="my-2 border-neutral-300" />
                  <div
                    className={`${workSummaryGridClass} my-2 items-baseline uppercase`}
                  >
                    <span className="col-span-3 min-w-0">
                      SALES TAX
                    </span>
                    <span className="justify-self-end text-end tabular-nums whitespace-nowrap">
                      {invoiceSalesTaxOnCost > 0 ? (
                        <>
                          <b>$</b>{" "}
                          {invoiceSalesTaxOnCost.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </>
                      ) : (
                        ""
                      )}
                    </span>
                    <span className="min-w-0" aria-hidden />
                    <span className="min-w-0" aria-hidden />
                    <span className="justify-self-end text-end tabular-nums whitespace-nowrap">
                      <b>$</b>{" "}
                      {invoiceSalesTax.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <hr className="my-2 border-neutral-300" />
                  <div
                    className={`${workSummaryGridClass} my-2 font-semibold items-baseline uppercase`}
                  >
                    <span className="col-span-3 min-w-0">Grand Total</span>
                    <span className="justify-self-end text-end tabular-nums whitespace-nowrap">
                      {officeInvoiceSummaryDisplay.costGrandTotal > 0 ? (
                        <>
                          <b>$</b>{" "}
                          {officeInvoiceSummaryDisplay.costGrandTotal.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </>
                      ) : (
                        ""
                      )}
                    </span>
                    <span className="min-w-0" aria-hidden />
                    <span className="min-w-0" aria-hidden />
                    <span className="justify-self-end text-end tabular-nums whitespace-nowrap">
                      <b>$</b>{" "}
                      {officeInvoiceSummaryDisplay.sellGrandTotal.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
                </div>

                {/* Invoice Summary */}

                <div className="">
                  <div className="">
                    <hr className="my-3 border-neutral-300" />
                    <div className="w-full">

                {formData &&
                  formData.taxCredits + formData.nonTaxCredits <=
                  invoiceSellSubtotal ? (
                  !loading ? (
                    formData && formData.taxCredits <= taxableAmount ? (
                      <div className="">
                        <div className="w-full mt-0 text-[15px]">
                          <div className="">
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        {formData.isProjectTaxable ? (
                          <div className="h-[150px] w-full flex justify-center items-center">
                            Please ensure the credits are less than the taxable
                            amount.
                          </div>
                        ) : (
                          <div className="" />
                        )}
                      </>
                    )
                  ) : (
                    <div className="h-[150px] w-full flex justify-center items-center">
                      Loading ...
                    </div>
                  )
                ) : (
                  <div className="h-[150px] w-full flex justify-center items-center">
                    Please ensure the credits are less than the sub total amount
                  </div>
                )}
                    </div>
                  </div>
                </div>

                {formData &&
                  formData.taxCredits + formData.nonTaxCredits <=
                    invoiceSellSubtotal &&
                  !loading &&
                  (formData.taxCredits <= taxableAmount ||
                    !formData.isProjectTaxable) && (
                  <div
                    className="w-full mt-6 text-left uppercase text-[15px] space-y-1"
                    style={{ pageBreakInside: "avoid" }}
                  >
                    <p className="mb-0 font-semibold">
                      TOTAL AMOUNT:{" "}
                      <span className="tabular-nums normal-case">
                        $
                        {noBidGrandTotal?.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </p>
                    <p className="mb-0 mt-2">
                      TOTAL MAN HOURS:{" "}
                      <span className="tabular-nums normal-case">
                        {formatHours(formData?.totalManHours)}
                      </span>
                    </p>
                    <p className="mb-0">
                      DRAINAGE HOURS:{" "}
                      <span className="tabular-nums normal-case">
                        {formatHours(noBidJobTypeHours.drainage)}
                      </span>
                    </p>
                    <p className="mb-0">
                      ELECTRICAL HOURS:{" "}
                      <span className="tabular-nums normal-case">
                        {formatHours(noBidJobTypeHours.electrical)}
                      </span>
                    </p>
                    <p className="mb-0">
                      HARDSCAPE HOURS:{" "}
                      <span className="tabular-nums normal-case">
                        {formatHours(noBidJobTypeHours.hardscape)}
                      </span>
                    </p>
                    <p className="mb-0">
                      IRRIGATION HOURS:{" "}
                      <span className="tabular-nums normal-case">
                        {formatHours(noBidJobTypeHours.irrigation)}
                      </span>
                    </p>
                    <p className="mb-0">
                      LANDSCAPE HOURS:{" "}
                      <span className="tabular-nums normal-case">
                        {formatHours(noBidJobTypeHours.landscape)}
                      </span>
                    </p>
                    <hr className="mt-2 border-gray-300" />
                  </div>
                )}

              </div>
            </div>

            {formData.status !== "Delete" && (
              <div className="w-full mb-10 text-[15px] flex justify-end flex-col md:flex-row gap-4 p-4">
                <button
                  className={`bg-[#00613e] text-white py-1 px-6`}
                  onClick={() => {
                    navigate(
                      `/panel/office/project/customer-copy-lists/${id}`,
                      {
                        state: {
                          data: formData.status,
                        },
                      }
                    );
                  }}
                // disabled={
                //   formData && formData.credits > laborTotal + materialsTotal
                // }
                >
                  Create Customer Copy
                </button>
                <button
                  className={`bg-[#00613e] text-white py-1 px-6 md:mr-4 mr-0 ${(formData &&
                    formData.taxCredits > taxableAmount &&
                    formData.isProjectTaxable) ||
                  invoiceSellSubtotal <
                    formData.taxCredits + formData.nonTaxCredits
                    ? "cursor-not-allowed"
                    : "cursor-pointer"
                    }`}
                  type="button"
                  data-toggle="modal"
                  data-target="#exampleModalCenter_saveAs"
                  data-dismiss="modal"
                  disabled={
                    (formData &&
                      formData.taxCredits > taxableAmount &&
                      formData.isProjectTaxable) ||
                  invoiceSellSubtotal <
                    formData.taxCredits + formData.nonTaxCredits
                  }
                >
                  Download
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
