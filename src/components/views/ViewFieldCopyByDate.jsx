import React, { useEffect, useMemo, useState } from "react";
import Layout from "../layout/Layout";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useLocation, useNavigate } from "react-router-dom";
import { useTableContext } from "../../context/TableContext";
import axios from "axios";
import html2pdf from "html2pdf.js";
import parse from "html-react-parser";
import fng_logo from "../../assets/images/fng_logo_black.png";
import JoditEditor from "jodit-react";
import {
  buildLaborManHoursByJobType,
  formatFieldCopyAmount,
  enrichFieldCopyDownloadCrewLabor,
  getFieldCopyDownloadCrewLaborRowFields,
  getFieldCopyLaborLineDisplayTotal,
  getFieldCopyLineDisplayCost,
  getOfficeFieldCopyRowCalculations,
  getFieldCopyPdfLaborManHours,
  getLaborPdfDescription,
  isFieldCopyCrewHoursAggregateLine,
  isFieldCopyLaborContext,
  isMongoObjectIdString,
  resolveFieldCopyCrewUnitRate,
  resolveFieldCopyDisplayJobType,
} from "../../utils/fieldCopyLaborDisplay";

export default function ViewFieldCopyByDate() {
  const { tableSize } = useTableContext();
  const location = useLocation();
  const data = location.state.data;
  const id = data.id;
  const formData = data.formData;
  const jobType = data.jobType;
  const [copies, setCopies] = useState([]);
  const [documentName, setDocumentName] = useState("");
  const [fieldCopies, setFieldCopies] = useState([]);
  const [laborTotal, setLaborTotal] = useState(0);
  const [materialsTotal, setMaterialsTotal] = useState(0);
  const [taxPercent, setTaxPercent] = useState(0);
  const [address, setAddress] = useState("");
  const [taxableAmount, setTaxableAmount] = useState(0);
  const [categorizedFieldCopies, setCategorizedFieldCopies] = useState([]);
  const [materialData, setMaterialData] = useState([]);
  const [laborData, setLaborData] = useState([]);
  const [fieldLaborData, setFieldLaborData] = useState([]);
  const [apiOfficeDayLaborGroups, setApiOfficeDayLaborGroups] = useState([]);
  const [showPreviousData, setShowPreviousData] = useState(false);
  const [selectedCrews, setSelectedCrews] = useState([]);
  const [modalCrew, setModalCrew] = useState([]);
  const [loading, setLoading] = useState(false);
  const [materialLaborData, setMaterialLaborData] = useState([]);
  const [note, setNote] = useState("");
  const [cost, setCost] = useState(0);
  const [markup, setMarkup] = useState(0);
  const [projectManager, setProjectManager] = useState("");
  const [foreman, setForeman] = useState("");
  const [projectManagers, setProjectManagers] = useState([]);
  const [allCrews, setAllCrews] = useState([]);

  const displayJobType = useMemo(
    () =>
      resolveFieldCopyDisplayJobType({
        jobType,
        formDataJobType: formData?.jobType,
      }),
    [jobType, formData?.jobType]
  );

  const isFieldCopyLaborSummaryRow = (g) => {
    if (!g) return false;
    if (Number(g?.manHours) > 0) return true;
    if (Number(g?.totalCost) > 0 && g?.jobType && !g?.reference) return true;
    return false;
  };

  const findLaborRateForJobType = (jt) => {
    if (!jt) return 0;
    const rateSources = [
      ...(Array.isArray(data?.copies) ? data.copies : []),
      ...apiOfficeDayLaborGroups,
    ];
    for (const g of rateSources) {
      const gjt = resolveFieldCopyDisplayJobType({
        jobType: g?.jobType,
        formDataJobType: formData?.jobType,
      });
      if (gjt === jt) {
        const rate = resolveFieldCopyCrewUnitRate(g);
        if (rate > 0) return rate;
      }
    }
    const fromField = fieldLaborData.find(
      (l) =>
        resolveFieldCopyDisplayJobType({
          jobType: l?.jobType,
          formDataJobType: formData?.jobType,
        }) === jt
    );
    const fromFieldRate = resolveFieldCopyCrewUnitRate(fromField);
    if (fromFieldRate > 0) return fromFieldRate;

    const fromLabor = Array.isArray(laborData)
      ? laborData.find(
          (l) =>
            resolveFieldCopyDisplayJobType({
              jobType: l?.jobType,
              formDataJobType: formData?.jobType,
            }) === jt
        )
      : null;
    return resolveFieldCopyCrewUnitRate(fromLabor);
  };

  const crewLaborEnrichOptions = {
    displayJobType,
    formDataJobType: formData?.jobType,
    resolveRateForJobType: findLaborRateForJobType,
  };

  const fieldCopyDownloadCrewManHours = useMemo(() => {
    if (Array.isArray(data?.copies)) {
      const fromCopies = data.copies
        .filter(isFieldCopyLaborSummaryRow)
        .reduce((acc, g) => acc + Number(g?.manHours || 0), 0);
      if (fromCopies > 0) return fromCopies;
    }
    if (Number(data?.totalManHours) > 0) return Number(data.totalManHours);
    if (Array.isArray(copies) && copies.length > 0) {
      const copyHours = copies.reduce(
        (acc, c) => acc + Number(c?.totalHours || 0),
        0
      );
      if (copyHours > 0) return copyHours;
    }
    return 0;
  }, [data?.copies, data?.totalManHours, copies]);

  /** Line items from this specific field-copy entry (not whole office day). */
  const fieldCopyEntryLineItems = useMemo(() => {
    const lines = [];
    const groups = Array.isArray(data?.copies) ? data.copies : [];
    for (const group of groups) {
      const groupJt = group?.jobType || group?.type;
      if (!Array.isArray(group?.copies)) continue;
      for (const item of group.copies) {
        lines.push({
          ...item,
          source: item?.source || group?.source,
          jobType: item?.jobType || item?.type || groupJt,
          type: item?.type || groupJt,
        });
      }
    }
    return lines;
  }, [data?.copies]);

  /** Per-job-type labor for this field-copy entry (Drainage, Hardscape, Landscape, etc.). */
  const fieldCopyDayLaborGroups = useMemo(() => {
    const hoursFallback = Number(data?.totalManHours) || 0;
    const entryGroups = Array.isArray(data?.copies) ? [...data.copies] : [];
    const withHours = entryGroups.map((g) => ({
      ...g,
      manHours: Number(g.manHours) || 0,
    }));
    const sumMh = withHours.reduce((a, g) => a + g.manHours, 0);
    if (hoursFallback > 0 && sumMh === 0) {
      if (withHours.length === 1) {
        withHours[0].manHours = hoursFallback;
      } else if (withHours.length > 0) {
        const pickIdx = (pred) =>
          withHours.findIndex((g) => pred(String(g?.jobType || "")));
        const drainageIdx = pickIdx((s) => s.toLowerCase().includes("drainage"));
        const hardscapeIdx = pickIdx((s) => s.toLowerCase().includes("hardscape"));
        const landscapeIdx = pickIdx((s) => s.toLowerCase().includes("landscape"));
        const targetIdx =
          drainageIdx >= 0
            ? drainageIdx
            : hardscapeIdx >= 0
              ? hardscapeIdx
              : landscapeIdx >= 0
                ? landscapeIdx
                : 0;
        withHours[targetIdx].manHours = hoursFallback;
      }
    }

    const fromEntry = withHours
      .filter(
        (g) =>
          Number(g.manHours) > 0 ||
          isFieldCopyLaborSummaryRow(g) ||
          (Number(g.totalCost) > 0 && g.jobType)
      )
      .map((g) =>
        enrichFieldCopyDownloadCrewLabor(
          {
            ...g,
            jobType:
              resolveFieldCopyDisplayJobType({
                jobType: g?.jobType,
                formDataJobType: formData?.jobType,
              }) || g?.jobType,
            isLaborTaxable: g?.isLaborTaxable ?? g?.isTaxable,
          },
          { ...crewLaborEnrichOptions, manHoursFallback: 0 }
        )
      )
      .filter(Boolean);

    if (fromEntry.length > 0) return fromEntry;

    const rawGroups = [
      ...(Array.isArray(data?.copies)
        ? data.copies.filter(isFieldCopyLaborSummaryRow)
        : []),
      ...apiOfficeDayLaborGroups,
    ];
    if (!rawGroups.length) return [];
    return rawGroups
      .map((g) =>
        enrichFieldCopyDownloadCrewLabor(
          {
            ...g,
            jobType:
              resolveFieldCopyDisplayJobType({
                jobType: g?.jobType,
                formDataJobType: formData?.jobType,
              }) || displayJobType,
            isLaborTaxable: g?.isLaborTaxable ?? g?.isTaxable,
          },
          { ...crewLaborEnrichOptions, manHoursFallback: hoursFallback }
        )
      )
      .filter(Boolean);
  }, [
    data?.copies,
    data?.totalManHours,
    displayJobType,
    formData?.jobType,
    fieldLaborData,
    laborData,
    apiOfficeDayLaborGroups,
    crewLaborEnrichOptions,
  ]);

  const laborManHoursByJobType = useMemo(() => {
    const map = {};
    for (const g of fieldCopyDayLaborGroups) {
      const jt = String(g?.jobType || "")
        .trim()
        .toUpperCase();
      const h = Number(g?.manHours || 0);
      if (jt && h > 0) map[jt] = h;
    }
    const normalizedLabor = fieldLaborData.map((l) => ({
      ...l,
      jobType: isMongoObjectIdString(l?.jobType) ? displayJobType : l?.jobType,
    }));
    Object.assign(map, buildLaborManHoursByJobType(normalizedLabor));
    return map;
  }, [
    fieldCopyDayLaborGroups,
    fieldLaborData,
    displayJobType,
    fieldCopyDownloadCrewManHours,
  ]);

  const laborHourlyRateByJobType = useMemo(() => {
    const map = {};
    for (const g of fieldCopyDayLaborGroups) {
      const jt = String(g?.jobType || "")
        .trim()
        .toUpperCase();
      if (!jt) continue;
      const rate = Number(g?.jobTypeCost || 0);
      if (rate > 0) map[jt] = rate;
    }
    const normalizedLabor = fieldLaborData.map((l) => ({
      ...l,
      jobType: isMongoObjectIdString(l?.jobType) ? displayJobType : l?.jobType,
    }));
    for (const labor of normalizedLabor) {
      const jt = String(labor?.jobType || "")
        .trim()
        .toUpperCase();
      if (!jt || map[jt] > 0) continue;
      const rate = Number(labor?.jobTypeCost) || 0;
      if (rate > 0) map[jt] = rate;
    }
    for (const labor of normalizedLabor) {
      const jt = String(labor?.jobType || "")
        .trim()
        .toUpperCase();
      if (!jt || map[jt] > 0) continue;
      const rate = resolveFieldCopyCrewUnitRate(labor);
      if (rate > 0) map[jt] = rate;
    }
    if (Array.isArray(laborData)) {
      for (const labor of laborData) {
        const jt = resolveFieldCopyDisplayJobType({
          jobType: labor?.jobType,
          formDataJobType: formData?.jobType,
        });
        if (!jt || map[jt] > 0) continue;
        const rate = resolveFieldCopyCrewUnitRate(labor);
        if (rate > 0) map[jt] = rate;
      }
    }
    if (displayJobType && !(map[displayJobType] > 0)) {
      const fallback = findLaborRateForJobType(displayJobType);
      if (fallback > 0) map[displayJobType] = fallback;
    }
    return map;
  }, [
    fieldCopyDayLaborGroups,
    fieldLaborData,
    displayJobType,
    laborManHoursByJobType,
    laborData,
    formData?.jobType,
  ]);

  const workSummaryGridClass =
    "grid grid-cols-[minmax(280px,36%)_minmax(0,10.666%)_minmax(0,10.666%)_minmax(0,10.666%)_minmax(0,10.666%)_minmax(0,10.666%)_minmax(0,10.666%)] gap-x-2 gap-y-1";

  const crewLaborTaxLabel = (labor) =>
    formData?.customerType === "Normal"
      ? labor?.isLaborTaxable
        ? "RT"
        : "RNT"
      : formData?.customerType === "Commercial"
        ? "CT"
        : formData?.customerType?.toUpperCase() || "";

  const taxEq = (a, b) => {
    const x = a === true || a === "true";
    const y = b === true || b === "true";
    return x === y;
  };

  const isFieldCopyWorkSummaryLineTaxableRt = (item, labor) => {
    const customerType = formData?.customerType;
    if (customerType === "Exempt") return false;
    if (customerType === "Commercial") {
      return taxEq(labor?.isLaborTaxable ?? labor?.isTaxable, true);
    }
    if (labor) {
      return taxEq(labor?.isLaborTaxable ?? labor?.isTaxable, true);
    }
    if (["Labor", "Other"].includes(item?.source)) {
      return taxEq(item?.isTaxable, true);
    }
    if (["Lump Sum"].includes(item?.source)) {
      return taxEq(item?.isTaxable, true);
    }
    if (item?.dataType === "Material" || item?.dataType !== "Labor") {
      return true;
    }
    return taxEq(item?.isLaborTaxable ?? item?.isTaxable, true);
  };

  const jobTypeMatch = (a, b) =>
    String(a ?? "")
      .trim()
      .toLowerCase() ===
    String(b ?? "")
      .trim()
      .toLowerCase();

  const lineItemCostSum = (item) => {
    const lineCost = getFieldCopyLineDisplayCost(item);
    if (lineCost > 0) return lineCost;
    if (
      item?.totalCost != null &&
      item.totalCost !== "" &&
      !Number.isNaN(Number(item.totalCost))
    ) {
      return Number(item.totalCost);
    }
    const c = item.cost;
    const q =
      item.quantity != null && item.quantity !== ""
        ? Number(item.quantity)
        : 1;
    if (c != null && c !== "" && Number(c) > 0) {
      return Number(c) * q;
    }
    return 0;
  };

  /** Work Summary COST — sum from entry line items (Office Copy pattern). */
  const costFromFieldCopiesForRow = (row) => {
    const pool =
      fieldCopyEntryLineItems.length > 0
        ? fieldCopyEntryLineItems
        : fieldCopies;
    if (!pool?.length || !row) return 0;
    const rowJt = resolveFieldCopyDisplayJobType({
      jobType: row.jobType,
      formDataJobType: formData?.jobType,
    });
    let sum = 0;
    for (const fc of pool) {
      const fcJt = resolveFieldCopyDisplayJobType({
        jobType: fc.jobType ?? fc.type,
        formDataJobType: formData?.jobType,
      });
      if (!fcJt || !rowJt || !jobTypeMatch(fcJt, rowJt)) continue;

      if (row.dataType !== "Labor") {
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
        if (!taxEq(lt, row.isLaborTaxable ?? row.isTaxable)) continue;
        sum += lineItemCostSum(fc);
      }
    }
    return sum;
  };

  const getFieldCopyWorkSummaryMaterialCost = (item) => {
    const fromFc = costFromFieldCopiesForRow(item);
    if (item?.dataType !== "Labor") {
      return fromFc > 0 ? fromFc : Number(item?.totalCost) || 0;
    }
    return fromFc > 0
      ? fromFc
      : Number(item?.totalCost) ||
          Number(item?.cost) ||
          Number(item?.totalPrice) ||
          0;
  };

  /** Same inclusion rules as the main table crew rows. */
  const isFieldCopyCrewLaborRowVisible = (labor) => {
    const hours = getFieldCopyPdfLaborManHours(
      labor,
      laborManHoursByJobType
    );
    return (
      hours > 0 ||
      Number(labor?.totalPrice) > 0 ||
      Number(labor?.totalCost) > 0
    );
  };

  const getFieldCopyDownloadCrewLaborSources = () => {
    const hoursFallback = fieldCopyDownloadCrewManHours;
    const enrichOpts = { ...crewLaborEnrichOptions, manHoursFallback: hoursFallback };

    if (fieldCopyDayLaborGroups.length > 0) return fieldCopyDayLaborGroups;

    if (displayJobType && hoursFallback > 0) {
      const rate = findLaborRateForJobType(displayJobType);
      const enriched = enrichFieldCopyDownloadCrewLabor(
        {
          jobType: displayJobType,
          manHours: hoursFallback,
          jobTypeCost: rate,
          isLaborTaxable: laborData?.find(
            (l) =>
              resolveFieldCopyDisplayJobType({
                jobType: l?.jobType,
                formDataJobType: formData?.jobType,
              }) === displayJobType
          )?.isLaborTaxable,
        },
        enrichOpts
      );
      if (enriched) return [enriched];
    }

    const fromField = fieldLaborData
      .map((l) =>
        enrichFieldCopyDownloadCrewLabor(
          {
            ...l,
            jobType: isMongoObjectIdString(l?.jobType)
              ? displayJobType
              : l?.jobType,
          },
          enrichOpts
        )
      )
      .filter(Boolean);

    if (fromField.length > 0) return fromField;

    return [];
  };

  const fieldCopyPdfCrewWorkSummaryRows = useMemo(() => {
    return getFieldCopyDownloadCrewLaborSources()
      .filter(isFieldCopyCrewLaborRowVisible)
      .map((labor) => ({
        labor,
        row: getFieldCopyDownloadCrewLaborRowFields(
          labor,
          laborManHoursByJobType,
          laborHourlyRateByJobType,
          formData?.jobType,
          findLaborRateForJobType
        ),
      }))
      .filter(
        ({ row }) =>
          row.manHours > 0 || row.displayTotal > 0 || row.lineCost > 0
      );
  }, [
    fieldCopyDayLaborGroups,
    fieldCopyDownloadCrewManHours,
    displayJobType,
    fieldLaborData,
    laborData,
    laborManHoursByJobType,
    laborHourlyRateByJobType,
    formData?.jobType,
    apiOfficeDayLaborGroups,
  ]);

  // console.log("data", showPreviousData,data);

  const navigate = useNavigate();

  useEffect(() => {
    getFieldCopiesByDate();
    getOfficeFieldCopyData();
    getFGAddress();
    getTaxPercentage();
    getProjectManagers();
    getAllCrews();

    setProjectManager(data?.formData?.projectManager);

    // setting document name
    let doc_name = formData.customerName?.toUpperCase() || "";
    if (doc_name.includes(" ")) {
      doc_name = (
        doc_name.split(" ")[1] +
        "_" +
        doc_name.split(" ")[0]
      )?.replace(",", "");
    }
    setDocumentName(doc_name);

    const isShowPreviousData = isBefore(data.entryDate, "18-3-2025");
    setShowPreviousData(isShowPreviousData);

    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (
      fieldCopies.length > 0 ||
      materialData.length > 0 ||
      laborData.length > 0
    ) {
      const summarizedData = summarizeFieldCopies(fieldCopies);
      setCategorizedFieldCopies([
        { category: "Materials & Other", items: summarizedData },
      ]);
      const { laborTotal, materialsTotal } = calculateTotals(fieldCopies);
      setLaborTotal(laborTotal);
      setMaterialsTotal(materialsTotal);
    }
  }, [fieldCopies]);

  // Calculate aggregate COST and MARKUP for this date's field copies (Office Copy jaisa)
  useEffect(() => {
    let calculatedCost = 0;
    let hasValidCost = false;

    fieldCopies.forEach((item) => {
      const lineCost = getFieldCopyLineDisplayCost(item);
      if (lineCost > 0) {
        calculatedCost += lineCost;
        hasValidCost = true;
      }
    });

    getFieldCopyDownloadCrewLaborSources().forEach((labor) => {
      const row = getFieldCopyDownloadCrewLaborRowFields(
        labor,
        laborManHoursByJobType,
        laborHourlyRateByJobType,
        formData?.jobType,
        findLaborRateForJobType
      );
      if (row.lineCost > 0) {
        calculatedCost += row.lineCost;
        hasValidCost = true;
      }
    });

    // Work Summary MARKUP = weighted avg percentage (Office/Customer Copy jaisa)
    const subtotal = (materialsTotal || 0) + (laborTotal || 0) - (Number(formData?.taxCredits) || 0) - (Number(formData?.nonTaxCredits) || 0);
    const markupDollars = hasValidCost && subtotal >= 0 && calculatedCost > 0 ? subtotal - calculatedCost : 0;
    const calculatedMarkup = calculatedCost > 0 && markupDollars >= 0 ? (markupDollars / calculatedCost) * 100 : null;

    setCost(hasValidCost ? calculatedCost : null);
    setMarkup(calculatedMarkup);
  }, [
    fieldCopies,
    materialsTotal,
    laborTotal,
    formData?.taxCredits,
    formData?.nonTaxCredits,
    fieldCopyDayLaborGroups,
    laborManHoursByJobType,
    laborHourlyRateByJobType,
    displayJobType,
    fieldCopyDownloadCrewManHours,
    laborData,
    fieldLaborData,
  ]);

  useEffect(() => {
    let taxAmount = 0;
    if (
      categorizedFieldCopies &&
      categorizedFieldCopies[0] &&
      categorizedFieldCopies[0]?.items?.length > 0
    ) {
      for (let type of categorizedFieldCopies[0].items) {
        if (type.source === "Labor") {
          continue;
        }
        if (type.isTaxable) {
          // taxAmount +=
          //   Number.parseFloat(type.price) * Number.parseFloat(type.quantity);
          if (type.source === "Labor" || type.source === "Lump Sum") {
            taxAmount = taxAmount + Number.parseFloat(type.totalPrice);
          } else {
            // taxAmount =
            //   taxAmount +
            //   Number.parseFloat(type.price) * Number.parseFloat(type.quantity);
            taxAmount = taxAmount + Number.parseFloat(type.totalPrice);
          }
        }
      }
    }
    for (let labor of laborData) {
      if (labor.isLaborTaxable) {
        taxAmount += Number.parseFloat(labor.totalPrice);
      }
    }

    // setTaxableAmount(Number.parseFloat(taxAmount));
    if (formData.customerType === "Normal") {
      setTaxableAmount(Number.parseFloat(taxAmount));
    } else if (formData.customerType === "Commercial") {
      setTaxableAmount(materialsTotal + laborTotal);
    } else if (formData.customerType === "Exempt") {
      setTaxableAmount(0);
    }
  }, [categorizedFieldCopies, formData, laborData, materialsTotal]);

  /** Sell amount tax is calculated on (PDF / download footer). */
  const pdfTaxableBase = useMemo(() => {
    if (formData?.customerType === "Exempt") return 0;
    const base = Number(taxableAmount) || 0;
    const tc = Number(formData?.taxCredits) || 0;
    if (formData?.isProjectTaxable) {
      return Math.max(0, base - tc);
    }
    if (tc > base) return 0;
    return base;
  }, [
    taxableAmount,
    formData?.taxCredits,
    formData?.isProjectTaxable,
    formData?.customerType,
  ]);

  const pdfSalesTax = useMemo(() => {
    const pct = Number(taxPercent) || 0;
    if (!(pct > 0)) return 0;
    return (pct * pdfTaxableBase) / 100;
  }, [taxPercent, pdfTaxableBase]);

  const pdfSubtotalSell = useMemo(() => {
    const tc = Number(formData?.taxCredits) || 0;
    const ntc = Number(formData?.nonTaxCredits) || 0;
    return (
      (Number(materialsTotal) || 0) +
      (Number(laborTotal) || 0) -
      tc -
      ntc
    );
  }, [
    materialsTotal,
    laborTotal,
    formData?.taxCredits,
    formData?.nonTaxCredits,
  ]);

  const pdfGrandTotal = useMemo(
    () => pdfSubtotalSell + pdfSalesTax,
    [pdfSubtotalSell, pdfSalesTax]
  );

  useEffect(() => {
    const pm = allCrews.filter((item) => {
      return item._id === formData.projectManager;
    });
    const fm = allCrews.filter((item) => {
      return item._id === formData.foreman;
    });
    if (fm.length > 0) {
      setForeman(fm[0].crewName);
    }
  }, [formData, projectManagers, foreman]);

  useEffect(() => {
    const selected = allCrews.filter((crew) => {
      return formData.crew.includes(crew._id);
    });
    setSelectedCrews(selected);
  }, [allCrews, formData]);

  const getFieldCopiesByDate = async () => {
    try {
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/copy/get-field-copies-by-date/${id}`,
        {
          date: data.entryDate,
        },
        { headers: headers }
      );
      console.log("Copies", response.data.result, data.entryDate)
      if (response.data.statusCode === 200) {
        setCopies(response.data.result);
        // let doc_name = response?.data?.result?.customerName || "";
        // if (doc_name.includes(" ")) {
        //   doc_name = (
        //     doc_name.split(" ")[1] +
        //     "_" +
        //     doc_name.split(" ")[0]
        //   )?.replace(",", "");
        // }
        // setDocumentName(doc_name);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.message || error?.response?.message || error?.message || "Something went wrong");
    }
  };

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
      toast.error(error?.response?.data?.message || error?.response?.message || error?.message || "Something went wrong");
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
        setTaxPercent(response.data.result.taxPercent);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.message || error?.response?.message || error?.message || "Something went wrong");
    }
  };

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

  const downloadPdf = () => {
    const element = document.getElementById("content-to-pdf");

    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = `
            <div class="flex justify-center mb-2">
              <img src="${fng_logo}" alt="F&G Logo" class="h-[110px]" />
            </div>
          `;

    // Insert the temporary div at the top of the content
    element.prepend(tempDiv);

    // Create a temporary div with the hidden content
    const fileName = documentName + ".pdf";

    const options = {
      margin: 0.1,
      filename: fileName,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "in", format: "A4", orientation: "portrait" },
      pagebreak: { mode: ["avoid-all", "css", "legacy"] }, // Ensures proper page breaks
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

  const printFieldCopyDate = () => {
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

  // Downloaded Copies

  function moveLaborToBottom(data) {
    return data.sort((a, b) => {
      if (a.source === "Labor" && b.source !== "Labor") return 1;
      if (a.source !== "Labor" && b.source === "Labor") return -1;
      return 0;
    });
  }

  // const getOfficeFieldCopyData = async () => {
  //   try {
  //     setLoading(true);
  //     const token = localStorage.getItem("f&gstafftoken");
  //     const headers = {
  //       token: token,
  //       "Content-Type": "application/json",
  //     };
  //     const formdata = new FormData();
  //     formdata.append("date", data.entryDate);
  //     const response = await axios.post(
  //       `${process.env.REACT_APP_API_BASE_URL}/project/get-field-copies-by-date/${id}`,
  //       formdata,
  //       { headers: headers }
  //     );
  //     if (response.data.statusCode === 200) {
  //       let resultedCopies = [
  //         ...response.data.result.officeFieldCopies,
  //         ...response.data.result.officeDraftCopies,
  //       ];

  //       resultedCopies = moveLaborToBottom(resultedCopies);

  //       let resultedMaterials = [];
  //       let fieldLabors = [];
  //       const bothMaterialData = [
  //         ...response.data.result.materialData,
  //         ...response.data.result.materialDraftData,
  //       ];
  //       bothMaterialData.forEach((item) => {
  //         if (item.source !== "Labor") {
  //           resultedMaterials = [...resultedMaterials, item];
  //         } else {
  //           fieldLabors = [
  //             ...fieldLabors,
  //             {
  //               jobType: item.jobType,
  //               totalPrice: item.totalPrice,
  //               isLaborTaxable: item.isTaxable,
  //             },
  //           ];
  //         }
  //       });

  //       // resultedMaterials = [
  //       //   ...response.data.result.materialData,
  //       //   ...response.data.result.materialDraftData,
  //       // ];
  //       resultedMaterials = categorizeMaterial(resultedMaterials);
  //       setFieldLaborData([
  //         ...response.data.result.laborData,
  //         ...response.data.result.laborDraftData,
  //       ]);
  //       let resultedLabors = [
  //         ...response.data.result.laborData,
  //         ...response.data.result.laborDraftData,
  //         ...fieldLabors,
  //       ];
  //       resultedLabors = categorizeLabor(resultedLabors);
  //       setFieldCopies(resultedCopies);
  //       setMaterialData(resultedMaterials);
  //       setLaborData(resultedLabors);
  //       setMaterialLaborData(
  //         sortByJobType([...resultedMaterials, ...resultedLabors])
  //       );
  //       // setFieldCopies(response.data.result.officeFieldCopies);
  //       // setMaterialData(response.data.result.materialData);
  //       // setLaborData(response.data.result.laborData);
  //     } else {
  //       toast.error(response.data.message);
  //     }
  //   } catch (error) {
  //     console.error(error);
  //     toast.error(error.response.message);
  //   }
  //   setLoading(false);
  // };


  const getOfficeFieldCopyData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      const formdata = new FormData();
      formdata.append("date", data.entryDate);
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/project/get-field-copies-by-date/${id}`,
        formdata,
        { headers: headers }
      );
      if (response.data.statusCode === 200) {
        let resultedCopies = [
          ...response.data.result.officeFieldCopies,
          ...response.data.result.officeDraftCopies,
        ];

        resultedCopies = moveLaborToBottom(resultedCopies);

        let resultedMaterials = [];
        let fieldLabors = [];
        const bothMaterialData = [
          ...response.data.result.materialData,
          ...response.data.result.materialDraftData,
        ];
        bothMaterialData.forEach((item) => {
          if (item.source !== "Labor") {
            resultedMaterials = [...resultedMaterials, item];
          } else {
            fieldLabors = [
              ...fieldLabors,
              {
                jobType: item.jobType,
                reference: item.reference,
                description: item.description,
                type: item.type,
                source: "Labor",
                totalPrice: item.totalPrice,
                isLaborTaxable: item.isTaxable,
              },
            ];
          }
        });

        resultedMaterials = categorizeMaterial(resultedMaterials);

        // Combine labor data from fieldLabors and laborData
        let allLaborData = [
          ...response.data.result.laborData,
          ...response.data.result.laborDraftData,
          ...fieldLabors,
        ];

        // Store field labor data separately (without fieldLabors combined)
        setFieldLaborData([
          ...response.data.result.laborData,
          ...response.data.result.laborDraftData,
        ]);

        // Categorize all labor together
        let resultedLabors = categorizeLabor(allLaborData);

        setFieldCopies(resultedCopies);

        const officeEntries = [
          ...(response.data.result.officeFieldCopies || []),
          ...(response.data.result.officeDraftCopies || []),
        ];
        const entryKey = String(data?.entryDate || "").trim();
        const matchedOffice = officeEntries.find(
          (e) => String(e?.entryDate || "").trim() === entryKey
        );
        const apiLabor = Array.isArray(matchedOffice?.fieldCopies)
          ? matchedOffice.fieldCopies.filter(isFieldCopyLaborSummaryRow)
          : [];
        setApiOfficeDayLaborGroups(apiLabor);

        setMaterialData(resultedMaterials);
        setLaborData(resultedLabors);
        setMaterialLaborData(
          sortByJobType([...resultedMaterials, ...resultedLabors])
        );
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.message || error?.response?.message || error?.message || "Something went wrong");
    }
    setLoading(false);
  };
  function sortByJobType(data) {
    return data.sort((a, b) => {
      const jobA = typeof a?.jobType === "string" ? a.jobType : String(a?.jobType ?? "");
      const jobB = typeof b?.jobType === "string" ? b.jobType : String(b?.jobType ?? "");
      return jobA.localeCompare(jobB);
    });
  }

  function categorizeMaterial(materialData) {
    const categorizedData = materialData.reduce((result, item) => {
      // Determine the category based on source
      const category = item.source === "Labor" ? "Labor" : "F&G/Other/LumpSum";

      // Create a unique key using category & jobType
      const key = `${category}_${item.jobType}_${item.isTaxable}`;

      // Check if the category and jobType already exist in the result object
      if (!result[key]) {
        result[key] = {
          category, // Store the category
          jobType: item.jobType,
          totalPrice: 0,
          totalCost: 0,
          isTaxable: item.isTaxable,
          source: item.source,
          dataType: item.dataType,
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

  // function categorizeLabor(laborData) {
  //   const categorizedData = laborData.reduce((result, item) => {
  //     // Create a unique key combining jobType and isLaborTaxable to handle distinctions
  //     const key = `${item.jobType}-${item.isLaborTaxable}`;

  //     if (!result[key]) {
  //       // Initialize a new entry for this jobType and tax status combination
  //       result[key] = {
  //         jobType: item.jobType,
  //         totalPrice: 0,
  //         isLaborTaxable: item.isLaborTaxable,
  //         dataType: item.dataType,
  //       };
  //     }
  //     // Sum up the totalPrice for the current jobType and tax status combination
  //     result[key].totalPrice += item.totalPrice;
  //     return result;
  //   }, {});

  //   // Convert the result object to an array format
  //   return Object.values(categorizedData);
  // }
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
          totalPrice: 0,
          isLaborTaxable: item.isLaborTaxable,
          dataType: "Labor", // Ensure dataType is set
        };
      }
      // Sum up the totalPrice for the current jobType and tax status combination
      result[key].totalPrice += item.totalPrice;
      return result;
    }, {});

    // Convert the result object to an array format
    return Object.values(categorizedData);
  }

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

  // const summarizeFieldCopies = (fieldCopies) => {
  //   const summary = {};

  //   fieldCopies.forEach((item) => {
  //     const key = `${item.reference}-${item.measure}-${item.price}`;

  //     if (!summary[key]) {
  //       summary[key] = {
  //         source: item.source,
  //         isTaxable: item.isTaxable,
  //         reference: item.reference,
  //         description: item.description,
  //         size: item.measure,
  //         quantity: 0,
  //         price: item.price,
  //         totalPrice: 0,
  //         vendorName: item.vendorName,
  //       };
  //     }

  //     summary[key].quantity += item.quantity;
  //     summary[key].totalPrice += item.totalPrice;
  //   });

  //   // Calculate the total price
  //   // Object.keys(summary).forEach((key) => {
  //   //   summary[key].totalPrice = summary[key].quantity * summary[key].price;
  //   // });

  //   return Object.values(summary);
  // };

  const summarizeFieldCopies = (fieldCopies) => {
    const summary = {};

    fieldCopies.forEach((item) => {
      // Group by description/size/price so same line items merge
      const key = `${item.reference}-${item.measure}-${item.price}`;

      if (!summary[key]) {
        summary[key] = {
          source: item.source,
          isTaxable: item.isTaxable,
          reference: item.reference,
          description: item.description,
          size: item.measure,
          type: item.type,
          jobType: item.jobType || item.type,
          manHours: item.manHours,
          quantity: 0,
          price: item.price,
          totalPrice: 0,
          totalCost: 0,
          cost: item.cost !== undefined && item.cost !== null ? Number(item.cost) : undefined,
          vendorName: item.vendorName,
          markup: item.markup !== undefined && item.markup !== null ? Number(item.markup) : (item.markUp !== undefined && item.markUp !== null ? Number(item.markUp) : undefined),
          markUp: item.markUp !== undefined && item.markUp !== null ? Number(item.markUp) : (item.markup !== undefined && item.markup !== null ? Number(item.markup) : undefined),
        };
      }

      // aggregate quantity, selling price and cost
      summary[key].quantity += Number(item.quantity || 0);
      summary[key].totalPrice += Number(item.totalPrice || 0);
      summary[key].totalCost += getFieldCopyLineDisplayCost(item);
      if (summary[key].cost === undefined && item.cost !== undefined && item.cost !== null) {
        summary[key].cost = Number(item.cost);
      }
      if ((summary[key].markup === undefined || summary[key].markUp === undefined) && (item.markup != null || item.markUp != null)) {
        summary[key].markup = Number(item.markup ?? item.markUp);
        summary[key].markUp = Number(item.markUp ?? item.markup);
      }
      if (!summary[key].source && item?.source) {
        summary[key].source = item.source;
      }
      if (!summary[key].type && item?.type) {
        summary[key].type = item.type;
      }
    });

    return Object.values(summary);
  };

  const fieldCopyPdfTableItems = useMemo(() => {
    if (fieldCopyEntryLineItems.length > 0) {
      return summarizeFieldCopies(fieldCopyEntryLineItems);
    }
    return categorizedFieldCopies?.[0]?.items ?? [];
  }, [fieldCopyEntryLineItems, categorizedFieldCopies, fieldCopies]);

  const fieldCopyPdfWorkSummaryMaterials = useMemo(() => {
    if (fieldCopyEntryLineItems.length > 0) {
      const mats = fieldCopyEntryLineItems
        .filter(
          (i) =>
            !isFieldCopyCrewHoursAggregateLine(i, fieldCopyDownloadCrewManHours)
        )
        .map((i) => ({
          ...i,
          dataType: "Material",
          jobType: resolveFieldCopyDisplayJobType({
            jobType: i?.jobType || i?.type,
            formDataJobType: formData?.jobType,
          }),
          totalPrice: Number(i.totalPrice) || 0,
        }));
      if (mats.length > 0) return categorizeMaterial(mats);
    }
    return (materialLaborData || []).filter((i) => i?.dataType === "Material");
  }, [
    fieldCopyEntryLineItems,
    materialLaborData,
    formData?.jobType,
    fieldCopyDownloadCrewManHours,
  ]);

  const fieldCopyPdfWorkSummaryTotals = useMemo(() => {
    let costSubtotal = 0;
    let sellSubtotal = 0;
    let taxableCost = 0;
    let taxableSell = 0;

    for (const item of fieldCopyPdfWorkSummaryMaterials) {
      const rowCost = getFieldCopyWorkSummaryMaterialCost(item);
      const sell = Number(item?.totalPrice) || 0;
      costSubtotal += rowCost;
      sellSubtotal += sell;
      if (isFieldCopyWorkSummaryLineTaxableRt(item)) {
        taxableCost += rowCost;
        taxableSell += sell;
      }
    }

    for (const { labor, row } of fieldCopyPdfCrewWorkSummaryRows) {
      const rowCost = Number(row?.lineCost) || 0;
      const sell = Number(row?.displayTotal) || 0;
      costSubtotal += rowCost;
      sellSubtotal += sell;
      if (isFieldCopyWorkSummaryLineTaxableRt(null, labor)) {
        taxableCost += rowCost;
        taxableSell += sell;
      }
    }

    return { costSubtotal, sellSubtotal, taxableCost, taxableSell };
  }, [
    fieldCopyPdfWorkSummaryMaterials,
    fieldCopyPdfCrewWorkSummaryRows,
    fieldCopyEntryLineItems,
    fieldCopies,
    formData?.customerType,
    formData?.jobType,
  ]);

  const pdfCostTaxable = useMemo(() => {
    if (formData?.customerType === "Exempt") return 0;
    if (formData?.customerType === "Commercial") {
      return fieldCopyPdfWorkSummaryTotals.costSubtotal;
    }
    return fieldCopyPdfWorkSummaryTotals.taxableCost;
  }, [fieldCopyPdfWorkSummaryTotals, formData?.customerType]);

  const pdfSalesTaxOnCost = useMemo(() => {
    const tc = Number(formData?.taxCredits) || 0;
    const base = Number(pdfCostTaxable) || 0;
    if (formData?.isProjectTaxable) {
      return (taxPercent * Math.max(0, base - tc)) / 100;
    }
    if (tc > base) return 0;
    return (taxPercent * base) / 100;
  }, [
    formData?.isProjectTaxable,
    formData?.taxCredits,
    taxPercent,
    pdfCostTaxable,
  ]);

  const pdfCostNetSubtotal = useMemo(() => {
    const tc = Number(formData?.taxCredits) || 0;
    const ntc = Number(formData?.nonTaxCredits) || 0;
    return fieldCopyPdfWorkSummaryTotals.costSubtotal - tc - ntc;
  }, [
    fieldCopyPdfWorkSummaryTotals,
    formData?.taxCredits,
    formData?.nonTaxCredits,
  ]);

  const pdfCostGrandTotal = useMemo(
    () => pdfCostNetSubtotal + pdfSalesTaxOnCost,
    [pdfCostNetSubtotal, pdfSalesTaxOnCost]
  );

  const pdfSellTaxableDisplay = useMemo(() => {
    if (formData?.customerType === "Exempt") return 0;
    const fromLines = fieldCopyPdfWorkSummaryTotals.taxableSell;
    if (fromLines > 0) return fromLines;
    return pdfTaxableBase;
  }, [
    fieldCopyPdfWorkSummaryTotals,
    pdfTaxableBase,
    formData?.customerType,
  ]);

  function convertMillisecondsToDate(ms) {
    ms = Number.parseInt(ms);
    const date = new Date(ms);

    // Extract month, day, and year
    const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed
    const day = String(date.getDate()).padStart(2, "0");
    const year = String(date.getFullYear()).slice(-2); // Get the last 2 digits of the year

    // Return in MM/DD/YY format
    return `${month}/${day}/${year}`;
  }
const handleInvoiceJobType = (jobType) => {
  const type =
    typeof jobType === "string"
      ? jobType.toLowerCase()
      : String(jobType || "").toLowerCase();

  if (["professional", "pick up/delivery"].includes(type)) {
    return "SERVICE";
  } else if (type === "equipment rental") {
    return "";
  } else if (type === "reimbursement total") {
    return "";
  } else if (String(jobType || "").includes("Lump Sum")) {
    return "";
  } else {
    return "MATERIAL";
  }
};


  function formatAddress(address) {
    return address.replace(/(\d+)/, "\n$1");
  }

  function isBefore(date1, date2) {
    const parseDate = (dateStr) => {
      let [day, month, year] = dateStr.split("-").map(Number);
      return new Date(year, month - 1, day); // Month is 0-based in JS Date
    };

    return parseDate(date1) < parseDate(date2);
  }

  // function formatDate(dateStr) {
  //   const [day, month, year] = dateStr.split("-");
  //   const date = new Date(`${year}-${month}-${day}`);
  //   return date.toLocaleDateString("en-GB", {
  //     day: "numeric",
  //     month: "long",
  //     year: "numeric",
  //   });
  // }


  //updated date format   
  // function formatDate(dateStr) {
  //   if (!dateStr) return "";

  //   let date;

  //   // If string contains 'T' or 'Z' => treat as UTC ISO date
  //   if (dateStr.includes("T") || dateStr.includes("Z")) {
  //     date = new Date(dateStr);
  //   } else {
  //     // If format is DD-MM-YYYY
  //     if (dateStr.includes("-")) {
  //       const parts = dateStr.split("-");
  //       if (parts[0].length === 4) {
  //         // YYYY-MM-DD
  //         date = new Date(`${dateStr}T00:00:00`);
  //       } else {
  //         // DD-MM-YYYY
  //         const [day, month, year] = parts;
  //         date = new Date(`${year}-${month}-${day}T00:00:00`);
  //       }
  //     } else {
  //       return "Invalid date";
  //     }
  //   }

  //   if (isNaN(date.getTime())) return "Invalid date";

  //   return date.toLocaleDateString("en-GB", {
  //     day: "numeric",
  //     month: "long",
  //     year: "numeric",
  //   });
  // }
  function formatDate(dateStr) {
    if (!dateStr) return "";

    let date;

    try {
      // If string contains 'T' or 'Z' => treat as UTC ISO date
      if (typeof dateStr === "string" && (dateStr.includes("T") || dateStr.includes("Z"))) {
        date = new Date(dateStr);
      }

      // Firestore timestamp object (if any)
      else if (typeof dateStr === "object" && dateStr.seconds) {
        date = new Date(dateStr.seconds * 1000);
      }

      // DD-MM-YYYY or YYYY-MM-DD
      else if (typeof dateStr === "string" && dateStr.includes("-")) {
        const parts = dateStr.split("-");
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            // YYYY-MM-DD
            date = new Date(`${dateStr}T00:00:00`);
          } else {
            // DD-MM-YYYY (or D-M-YYYY)
            const [day, month, year] = parts.map(p => p.padStart(2, "0"));
            date = new Date(`${year}-${month}-${day}T00:00:00`);
          }
        }
      }

      // If date is still invalid
      if (!date || isNaN(date.getTime())) return "Invalid date";

      // ✅ keep local timezone formatting
      return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch (err) {
      return "Invalid date";
    }
  }






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

  const stripHtml = (html) => {
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent || div.innerText || "";
  };

  function convertTo12HourFormat(time24) {
    // Split the input into [hours, minutes]
    const [hourStr, minuteStr] = time24.split(':');
    const hour = parseInt(hourStr, 10);

    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12; // 0 or 12 becomes 12

    return `${hour12}:${minuteStr} ${period}`;
  }

  return (
    <Layout>
      <ToastContainer />
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
                Document Name
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
                  printFieldCopyDate();
                }}
              >
                Download PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`${tableSize === 250 ? "md:ml-[250px]" : "md:ml-[90px]"}`}
      >
        {/* Download Copy */}
        <div
          className=""
          style={{
            display: "none",
          }}
        >
          <div className="" id="content-to-pdf">
            {/* Project Data  */}
            <div className="flex flex-row gap-3 justify-around">
              <div className="flex flex-col w-1/3 md:w-[270px]">
                <div className="p-1">
                  <h6 className="text-[15px]">Date </h6>
                  <p className="text-sm font-bold">
                    {data.entryDate ? formatDate(data.entryDate) : ""}
                  </p>
                  <p className="text-sm font-bold">
                    {/* {(dateInput)} */}
                    {/* {convertToCentralTime(dateInput)} */}
                  </p>
                </div>
                <div className="p-1">
                  <h6 className=" text-[15px]">Project Code</h6>
                  <p className="text-sm font-bold">
                    {data.formData.projectCode}
                  </p>
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
                {/* <div className="p-1">
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
                    {foreman ? selectedCrews.length + 1 : selectedCrews.length}
                  </p>
                </div> */}
                {showPreviousData ? (
                  <div className="flex gap-3 flex-row text-sm mt-1">
                    <div className="">
                      <h4 className=" font-semibold">Start Time</h4>
                      <p className=" font-medium">{data && convertTo12HourFormat(data.startTime)}</p>
                    </div>
                    <div className="">
                      <h4 className=" font-semibold">End Time</h4>
                      <p className=" font-medium">{data && convertTo12HourFormat(data.endTime)}</p>
                    </div>
                    <div className="">
                      <h4 className=" font-semibold">Total Man Hours</h4>
                      <p className=" font-medium">
                        {data &&
                          data.totalManHours?.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {copies &&
                      copies
                        .filter((data) => data.totalHours !== 0)
                        .map((data, index) => {
                          return (
                            <div className="mt-2">
                              <div className="flex text-sm">
                                <span className="font-semibold">
                                  {" "}
                                  Crew {index + 1} :{" "}
                                </span>
                                <span className="w-1"></span>
                                <div className="flex flex-wrap mx-1">
                                  {data.crew.map((crew, outerIdx) => {
                                    return (
                                      <p>
                                        {crew.crewName}{" "}
                                        {outerIdx !== data.crew.length - 1
                                          ? ","
                                          : ""}
                                      </p>
                                    );
                                  })}
                                </div>
                              </div>
                              <div className="flex gap-3 flex-row text-sm mt-1">
                                <div className="">
                                  <h4 className=" font-semibold">Start Time</h4>
                                  <p className=" font-medium">
                                    {data && convertTo12HourFormat(data.startTime)}
                                  </p>
                                </div>
                                <div className="">
                                  <h4 className=" font-semibold">End Time</h4>
                                  <p className=" font-medium">
                                    {data && convertTo12HourFormat(data.endTime)}
                                  </p>
                                </div>
                                <div className="">
                                  <h4 className=" font-semibold">
                                    Total Man Hours
                                  </h4>
                                  <p className=" font-medium">
                                    {data &&
                                      data.totalHours?.toLocaleString("en-US", {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                  </>
                )}
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
                  <span className="font-normal text-xs capitalize ml-2 relative top-1">
                    : {formData.jobName?.toUpperCase()}
                  </span>
                )}
              </h6>
              <p className="text-xs break-words mt-1">
                {parse(formData.description)}
              </p>
            </div>

            {/* Office Copies Data */}
            {/* Compiled data by Material */}
            <div className="w-full mt-3 text-[15px] overflow-x-scroll">
              {fieldCopyPdfTableItems.length > 0 ||
              getFieldCopyDownloadCrewLaborSources().length > 0 ? (
                  <div className="mb-0">
                    <table className="w-full text-xs">
                      <thead className="">
                        <tr>
                          {/* <th className="text-xs">
                                  <span className="relative -top-1.5">
                                    Source
                                  </span>
                                </th> */}
                          <th className="text-xs border border-white">
                            <span className="relative -top-1.5 text-center ">
                              DESCRIPTION
                            </span>
                          </th>
                          <th className="text-xs">
                            <span className="relative -top-1.5">
                              Vendor Name
                            </span>
                          </th>
                          <th className="text-xs">
                            <span className="relative -top-1.5">SIZE</span>
                          </th>
                          <th className="text-xs">
                            <span className="relative -top-1.5">QUANTITY</span>
                          </th>
                          <th className="text-xs">
                            <span className="relative -top-1.5">COST</span>
                          </th>
                          <th className="text-xs">
                            <span className="relative -top-1.5">MARKUP</span>
                          </th>
                          <th className="text-xs">
                            <span className="relative -top-1.5">PRICE</span>
                          </th>
                          <th className="text-xs text-end">
                            <span className="relative -top-1.5">TOTAL</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {fieldCopyPdfTableItems.length > 0 &&
                          fieldCopyPdfTableItems.map((item, idx) => {
                            if (
                              isFieldCopyCrewHoursAggregateLine(
                                item,
                                fieldCopyDownloadCrewManHours
                              )
                            ) {
                              return null;
                            }
                            const {
                              lineCost,
                              displayPrice,
                              markupVal,
                              displayTotal,
                              qtyText,
                            } = getOfficeFieldCopyRowCalculations(item);
                            return (
                            <tr key={idx}>
                              {/* <td className="text-xs">{item?.source}</td> */}
                              <td className="text-xs pr-2">
                                {item?.source === "Labor"
                                  ? getLaborPdfDescription({
                                      labor: item,
                                      groupItems: fieldCopyPdfTableItems,
                                      fieldCopies: fieldCopyEntryLineItems.length
                                        ? fieldCopyEntryLineItems
                                        : fieldCopies,
                                    })?.toUpperCase()
                                  : item?.reference?.toUpperCase()}
                              </td>
                              <td className="text-xs">
                                {item?.vendorName?.toUpperCase()}
                              </td>
                              <td className="text-xs">{item?.size}</td>
                              <td className="text-xs pl-4">
                                {qtyText || (item?.quantity ? item.quantity : "")}
                              </td>
                              <td className="text-xs">
                                {lineCost > 0 ? formatFieldCopyAmount(lineCost) : ""}
                              </td>
                              <td className="text-xs">
                                {markupVal !== null &&
                                markupVal !== undefined &&
                                markupVal !== ""
                                  ? Number(markupVal).toLocaleString("en-US", {
                                      minimumFractionDigits: 0,
                                      maximumFractionDigits: 2,
                                    }) + "%"
                                  : ""}
                              </td>
                              <td className="text-xs">
                                {displayPrice != null && displayPrice > 0
                                  ? formatFieldCopyAmount(displayPrice)
                                  : ""}
                              </td>
                              <td className="text-xs text-end">
                                <b>$</b>
                                <span className="w-[80px] inline-block">
                                  {" "}
                                  {displayTotal > 0
                                    ? formatFieldCopyAmount(displayTotal)
                                    : ""}
                                </span>
                              </td>
                            </tr>
                          );
                          })}
                        {getFieldCopyDownloadCrewLaborSources()
                          .filter(isFieldCopyCrewLaborRowVisible)
                          .map((labor, laborIdx) => {
                            const row = getFieldCopyDownloadCrewLaborRowFields(
                              labor,
                              laborManHoursByJobType,
                              laborHourlyRateByJobType,
                              formData?.jobType,
                              findLaborRateForJobType
                            );
                            if (!(row.manHours > 0) && !(row.displayTotal > 0)) {
                              return null;
                            }
                            return (
                              <tr key={`field-labor-${laborIdx}`}>
                                <td className="text-xs pr-2">
                                  {row.description}
                                </td>
                                <td className="text-xs" />
                                <td className="text-xs">
                                  {labor?.size || labor?.measure || ""}
                                </td>
                                <td className="text-xs pl-4">{row.qtyText}</td>
                                <td className="text-xs">
                                  {row.lineCost > 0
                                    ? formatFieldCopyAmount(row.lineCost)
                                    : ""}
                                </td>
                                <td className="text-xs">
                                  {row.markupVal != null &&
                                  row.markupVal !== ""
                                    ? Number(row.markupVal).toLocaleString(
                                        "en-US",
                                        {
                                          minimumFractionDigits: 0,
                                          maximumFractionDigits: 2,
                                        }
                                      ) + "%"
                                    : ""}
                                </td>
                                <td className="text-xs">
                                  {row.displayPrice != null &&
                                  row.displayPrice > 0
                                    ? formatFieldCopyAmount(row.displayPrice)
                                    : ""}
                                </td>
                                <td className="text-xs text-end">
                                  <b>$</b>
                                  <span className="w-[80px] inline-block">
                                    {" "}
                                    {row.displayTotal > 0
                                      ? formatFieldCopyAmount(row.displayTotal)
                                      : ""}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        {/* <tr>
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
                              </tr> */}
                      </tbody>
                    </table>
                  </div>
              ) : (
                <p className="pb-2">No field copies available.</p>
              )}
              {/* <table className="w-full text-xs">
                <tbody>
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
                              {labor?.totalPrice?.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table> */}


            </div>
            <div className="mt-2">
              <h4 className="text-[15px] font-semibold text-center mb-6">
                WORK SUMMARY
              </h4>
            </div>

            {/* Work Summary — Office Copy style (COST + $ columns) */}
            <div className="mt-4 text-xs tracking-wide w-full">
              <div
                className={`${workSummaryGridClass} mb-1 font-semibold uppercase items-baseline`}
              >
                <span className="col-span-3 min-w-0" />
                <span className="text-end whitespace-nowrap">COST</span>
                <span className="min-w-0" aria-hidden />
                <span className="min-w-0" aria-hidden />
                <span className="text-end whitespace-nowrap">$</span>
              </div>
              {fieldCopyPdfWorkSummaryMaterials.map((item) => {
                const rowCost = getFieldCopyWorkSummaryMaterialCost(item);
                const label =
                  item.source === "Labor"
                    ? getLaborPdfDescription({
                        labor: item,
                        groupItems: fieldCopyPdfTableItems,
                        fieldCopies: fieldCopyEntryLineItems.length
                          ? fieldCopyEntryLineItems
                          : fieldCopies,
                      })?.toUpperCase()
                    : `${resolveFieldCopyDisplayJobType({
                        jobType: item?.jobType,
                        formDataJobType: formData?.jobType,
                      })} ${handleInvoiceJobType(item.jobType)}`.trim();
                return (
                  <div
                    key={`fc-ws-m-${item.jobType}-${item.source}-${item.isTaxable}`}
                    className={`${workSummaryGridClass} mt-1 capitalize items-baseline`}
                  >
                    <span className="col-span-3 min-w-0">
                      <b className="w-[200px] inline-block">{label}</b>
                      <b>
                        {formData?.customerType === "Normal"
                          ? ["Labor", "Other"].includes(item.source)
                            ? item.isTaxable
                              ? "RT"
                              : "RNT"
                            : ["Lump Sum"].includes(item.source)
                              ? `${item.isTaxable ? "RT" : "RNT"} (SALES TAX PAID ON MATERIAL)`
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
                          {formatFieldCopyAmount(rowCost)}
                        </>
                      ) : (
                        ""
                      )}
                    </span>
                    <span className="min-w-0" aria-hidden />
                    <span className="min-w-0" aria-hidden />
                    <span className="text-end tabular-nums whitespace-nowrap">
                      <b>$</b>{" "}
                      {item.totalPrice?.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                );
              })}
              {fieldCopyPdfCrewWorkSummaryRows.map(({ labor, row }, idx) => (
                <div
                  key={`fc-ws-crew-${row.description}-${idx}`}
                  className={`${workSummaryGridClass} mt-1 items-baseline`}
                >
                  <span className="col-span-3 min-w-0">
                    <b className="w-[200px] inline-block">{row.description}</b>
                    <b>{crewLaborTaxLabel(labor)}</b>
                  </span>
                  <span className="text-end tabular-nums whitespace-nowrap">
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
                  <span className="text-end tabular-nums whitespace-nowrap">
                    <b>$</b>{" "}
                    {row.displayTotal > 0
                      ? formatFieldCopyAmount(row.displayTotal)
                      : ""}
                  </span>
                </div>
              ))}
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
                    <div className="flex justify-between my-2">
                      <span>
                        TAX CREDITS{" "}
                        {formData.taxDescription && (
                          <>
                            (
                            {formData.taxDescription.length > 50
                              ? formData.taxDescription.slice(0, 50) + " ..."
                              : formData.taxDescription}
                            )
                          </>
                        )}
                      </span>
                      <span>
                        <b>$</b>{" "}
                        <span className="inline-block w-[80px] text-end">
                          {" "}
                          {formData.taxCredits?.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </span>
                    </div>
                    <div className="flex justify-between my-2">
                      <span>
                        NON TAX CREDITS{" "}
                        {formData.nonTaxDescription && (
                          <>
                            (
                            {formData.nonTaxDescription.length > 50
                              ? formData.nonTaxDescription.slice(0, 50) + " ..."
                              : formData.nonTaxDescription}
                            )
                          </>
                        )}
                      </span>
                      <span>
                        <b>$</b>{" "}
                        <span className="inline-block w-[80px] text-end">
                          {" "}
                          {formData.nonTaxCredits?.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </span>
                    </div>
                  </>
                )}
                <hr />
                {/* COST & MARKUP summary — COST + $ columns (Office Copy jaisa) */}
                {cost !== null && cost !== undefined && (
                  <div
                    className={`${workSummaryGridClass} my-2 items-baseline uppercase`}
                  >
                    <span className="col-span-3 min-w-0">COST</span>
                    <span className="min-w-0" aria-hidden />
                    <span className="min-w-0" aria-hidden />
                    <span className="min-w-0" aria-hidden />
                    <span className="text-end tabular-nums whitespace-nowrap">
                      <b>$</b>{" "}
                      {fieldCopyPdfWorkSummaryTotals.costSubtotal.toLocaleString(
                        "en-US",
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }
                      )}
                    </span>
                  </div>
                )}
                {markup !== null && markup !== undefined && (
                  <div
                    className={`${workSummaryGridClass} my-2 items-baseline uppercase`}
                  >
                    <span className="col-span-3 min-w-0">MARKUP</span>
                    <span className="min-w-0" aria-hidden />
                    <span className="min-w-0" aria-hidden />
                    <span className="min-w-0" aria-hidden />
                    <span className="text-end tabular-nums whitespace-nowrap">
                      {markup.toLocaleString("en-US", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2,
                      })}
                      %
                    </span>
                  </div>
                )}
                <div
                  className={`${workSummaryGridClass} my-2 items-baseline uppercase`}
                >
                  <span className="col-span-3 min-w-0">SUBTOTAL</span>
                  <span className="text-end tabular-nums whitespace-nowrap">
                    <b>$</b>{" "}
                    {pdfCostNetSubtotal.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                  <span className="min-w-0" aria-hidden />
                  <span className="min-w-0" aria-hidden />
                  <span className="text-end tabular-nums whitespace-nowrap">
                    <b>$</b>{" "}
                    {pdfSubtotalSell.toLocaleString("en-US", {
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
                  className={`${workSummaryGridClass} my-2 items-baseline uppercase`}
                >
                  <span className="col-span-3 min-w-0">TAXABLE AMOUNT</span>
                  <span className="text-end tabular-nums whitespace-nowrap">
                    <b>$</b>{" "}
                    {pdfCostTaxable.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                  <span className="min-w-0" aria-hidden />
                  <span className="min-w-0" aria-hidden />
                  <span className="text-end tabular-nums whitespace-nowrap">
                    <b>$</b>{" "}
                    {pdfSellTaxableDisplay.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <hr />
                <div
                  className={`${workSummaryGridClass} my-2 items-baseline uppercase`}
                >
                  <span className="col-span-3 min-w-0">SALES TAX</span>
                  <span className="text-end tabular-nums whitespace-nowrap">
                    <b>$</b>{" "}
                    {pdfSalesTaxOnCost.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                  <span className="min-w-0" aria-hidden />
                  <span className="min-w-0" aria-hidden />
                  <span className="text-end tabular-nums whitespace-nowrap">
                    <b>$</b>{" "}
                    {pdfSalesTax.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <hr />
                <div
                  className={`${workSummaryGridClass} my-2 font-semibold items-baseline uppercase`}
                >
                  <span className="col-span-3 min-w-0">GRAND TOTAL</span>
                  <span className="text-end tabular-nums whitespace-nowrap">
                    {pdfCostGrandTotal > 0 ? (
                      <>
                        <b>$</b>{" "}
                        {pdfCostGrandTotal.toLocaleString("en-US", {
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
                    {pdfGrandTotal.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="mt-4">
              {copies &&
                copies.length > 0 &&
                copies.map((copy, index) => {
                  if (!stripHtml(copy.note)) {
                    return;
                  }
                  return (
                    <div className="p-1">
                      <h6 className=" text-[15px]">Note {index + 1}</h6>
                      <p className="text-sm break-words font-bold">
                        {parse(copy.note)}
                      </p>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Data */}

        {showPreviousData ? (
          <div className="lg:p-10 p-3">
            <div className="card">
              {/* <div className="card-header bg-[#00613e] text-white">
                <h3 className="card-title">View Field Copy</h3>
              </div> */}
              <div className="card-header bg-[#00613e] text-white">
                <h3 className="card-title mt-1">
                  <button
                    onClick={() => {
                      navigate(-1);
                    }}
                  >
                    <i className="fa fa-arrow-left mr-2"></i>
                  </button>{" "}
                  View Field Copy
                </h3>
                <div className=" text-end">
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
              <div className="p-6">
                <div className="mb-2 flex justify-between">
                  <div className="">
                    <h4 className=" font-bold">{data && data.date}</h4>
                  </div>
                  <div className="flex gap-6 flex-row">
                    <div className="">
                      <h4 className=" font-bold">Start Time</h4>
                      <p className=" font-medium">{data && convertTo12HourFormat(data.startTime)}</p>
                    </div>
                    <div className="">
                      <h4 className=" font-bold">End Time</h4>
                      <p className=" font-medium">{data && convertTo12HourFormat(data.endTime)}</p>
                    </div>
                    <div className="">
                      <h4 className=" font-bold">Total Man Hours</h4>
                      <p className=" font-medium">
                        {data &&
                          data.totalManHours?.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                      </p>
                    </div>
                  </div>
                </div>
                <hr />
                <div className="">
                  <ul className="mt-6">
                    {/* F&G */}
                    {data &&
                      data.copies &&
                      data.copies.map((outerCopy) =>
                        outerCopy.copies
                          .filter((item) => item.source === "F&G")
                          .map((copy) => (
                            <li
                              key={copy._id}
                              className="w-full flex gap-6 mt-3"
                            >
                              <div className="md:w-[20%] w-full">
                                <h6 className=" font-semibold">Source Used</h6>
                                <p>{copy.source}</p>
                              </div>
                              <div className="md:w-[30%] w-full">
                                <h6 className=" font-bold">Name</h6>
                                <p>{copy.reference}</p>
                              </div>
                              <div className="md:w-[10%] w-full">
                                <h6 className=" font-bold">Measure</h6>
                                <p>{copy.measure}</p>
                              </div>
                              <div className="md:w-[10%] w-full">
                                <h6 className=" font-bold">Quantity</h6>
                                <p>{copy.quantity}</p>
                              </div>
                              <div className="md:w-[10%] w-full">
                                <h6 className=" font-bold">Price</h6>
                                <p>
                                  <b>$</b>{" "}
                                  {copy.price?.toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </p>
                              </div>
                              <div className="md:w-[10%] w-full">
                                <h6 className=" font-bold">Total Price</h6>
                                <p>
                                  <b>$</b>{" "}
                                  {copy.totalPrice?.toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </p>
                              </div>
                            </li>
                          ))
                      )}
                    {/* Other */}
                    {data &&
                      data.copies &&
                      data.copies.map((outerCopy) =>
                        outerCopy.copies
                          .filter((item) => item.source === "Other")
                          .map((copy) => (
                            <li
                              key={copy._id}
                              className="w-full flex gap-6 mt-3"
                            >
                              <div className="md:w-[20%] w-full">
                                <h6 className=" font-semibold">Source Used</h6>
                                <p>{copy.source}</p>
                              </div>
                              <div className="md:w-[30%] w-full">
                                <h6 className=" font-bold">Name</h6>
                                <p>{copy.reference}</p>
                              </div>
                              <div className="md:w-[10%] w-full">
                                <h6 className=" font-bold">Measure</h6>
                                <p>{copy.measure}</p>
                              </div>
                              <div className="md:w-[10%] w-full">
                                <h6 className=" font-bold">Quantity</h6>
                                <p>{copy.quantity}</p>
                              </div>
                              {copy.invoice && (
                                <div className="md:w-[10%] w-full">
                                  <h6 className=" font-bold">Invoice</h6>
                                  <p>{copy.invoice}</p>
                                </div>
                              )}
                              {copy.PO && (
                                <div className="md:w-[10%] w-full">
                                  <h6 className=" font-bold">PO</h6>
                                  <p>{copy.PO}</p>
                                </div>
                              )}
                              {copy?.vendorName && (
                                <div className="md:w-[10%] w-full">
                                  <h6 className=" font-bold">Vendor Name</h6>
                                  <p>{copy.vendorName}</p>
                                </div>
                              )}
                              <div className="md:w-[10%] w-full">
                                <h6 className=" font-bold">Price</h6>
                                <p>
                                  <b>$</b>{" "}
                                  {copy.price?.toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </p>
                              </div>
                              <div className="md:w-[10%] w-full">
                                <h6 className=" font-bold">Total Price</h6>
                                <p>
                                  <b>$</b>{" "}
                                  {copy.totalPrice?.toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </p>
                              </div>
                            </li>
                          ))
                      )}
                    {/* Lump Sum */}
                    {data &&
                      data.copies &&
                      data.copies.map((outerCopy) =>
                        outerCopy.copies
                          .filter((item) => item.source.includes("Lump Sum"))
                          .map((copy) => (
                            <li
                              key={copy._id}
                              className="w-full flex gap-6 mt-3"
                            >
                              <div className="md:w-[20%] w-full">
                                <h6 className=" font-semibold">Source Used</h6>
                                <p>{copy.source}</p>
                              </div>
                              {false && (
                                <div className="md:w-[30%] w-full">
                                  <h6 className=" font-bold">Vendor Name</h6>
                                  <p>{copy.vendorName}</p>
                                </div>
                              )}
                              <div className="md:w-[30%] w-full">
                                <h6 className=" font-bold">Description</h6>
                                <p>{copy.reference}</p>
                              </div>
                              {copy?.vendorName && (
                                <div className="md:w-[10%] w-full">
                                  <h6 className=" font-bold">Vendor Name</h6>
                                  <p>{copy.vendorName}</p>
                                </div>
                              )}
                              <div className="md:w-[10%] w-full">
                                <h6 className=" font-bold">Price</h6>
                                <p>
                                  <b>$</b>{" "}
                                  {copy.totalPrice?.toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </p>
                              </div>
                              <div className="md:w-[10%] w-full">
                                <h6 className=" font-bold">Total Price</h6>
                                <p>
                                  <b>$</b>{" "}
                                  {copy.totalPrice?.toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </p>
                              </div>
                            </li>
                          ))
                      )}

                    <div className="my-10" />

                    {/* Labor Data */}
                    {data &&
                      data.copies &&
                      data.copies
                        .filter((copy) => copy.totalCost != 0)
                        .map((copy) => {
                          return (
                            <li
                              key={copy._id}
                              className="w-full flex justify-between gap-6 mt-2"
                            >
                              <div className="md:w-[20%] w-full">
                                <p className="font-semibold">
                                  {copy.jobType} LABOR
                                </p>
                              </div>
                              {copy.manHours != 0 && (
                                <div className="md:w-[30%] w-full text-end">
                                  <p>{copy?.manHours} Hrs</p>
                                </div>
                              )}
                              {copy.jobTypeCost != 0 && (
                                <div className="md:w-[20%] w-full text-end">
                                  <p>
                                    <b>$</b>{" "}
                                    {copy?.jobTypeCost?.toLocaleString(
                                      "en-US",
                                      {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      }
                                    )}{" "}
                                    / per
                                  </p>
                                </div>
                              )}

                              <div className="md:w-[20%] w-full text-end">
                                <p>
                                  <b>$</b>{" "}
                                  {copy?.totalCost?.toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </p>
                              </div>
                            </li>
                          );
                        })}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:p-10 p-3">
            <div className="card">
              <div className="card-header bg-[#00613e] text-white">
                <h3 className="card-title mt-2">
                  <button
                    onClick={() => {
                      navigate(-1);
                    }}
                  >
                    <i className="fa fa-arrow-left mr-2"></i>
                  </button>{" "}
                  View Field Copy
                </h3>
                <div className=" text-end">
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
              {copies.map((data) => {
                return (
                  <div className="p-6">
                    <hr />
                    <div className="mb-2 mt-4 flex justify-between">
                      <div className="">
                        <h4 className=" font-bold">
                          {data && formatDateToString(data.entryDate)}
                        </h4>
                      </div>
                      <div className="flex gap-7 flex-row">
                        <div className="">
                          <button
                            type="button"
                            data-toggle="modal"
                            data-target="#exampleModal_crew"
                            title="More Details"
                            className=""
                            onClick={() => {
                              setModalCrew(data.crew);
                              setNote(data.note);
                            }}
                          >
                            <i className="fa fa-eye" />
                          </button>
                        </div>
                        <div className="">
                          <h4 className=" font-bold">Start Time</h4>
                          <p className=" font-medium">
                            {data && convertTo12HourFormat(data.startTime)}
                          </p>
                        </div>
                        <div className="">
                          <h4 className=" font-bold">End Time</h4>
                          <p className=" font-medium">{data && convertTo12HourFormat(data.endTime)}</p>
                        </div>
                        <div className="">
                          <h4 className=" font-bold">Total Man Hours</h4>
                          <p className=" font-medium">
                            {data &&
                              data.totalHours?.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                          </p>
                        </div>
                      </div>
                    </div>
                    <hr />
                    <div className="">
                      <ul className="mt-6">
                        {/* F&G */}
                        {data &&
                          data.fieldCopies &&
                          data.fieldCopies.map((outerCopy) =>
                            outerCopy.copies
                              .filter((item) => item.source === "F&G")
                              .map((copy) => (
                                <li
                                  key={copy._id}
                                  className="w-full flex gap-6 mt-3"
                                >
                                  <div className="md:w-[20%] w-full">
                                    <h6 className=" font-semibold">
                                      Source Used
                                    </h6>
                                    <p>{copy.source}</p>
                                  </div>
                                  <div className="md:w-[30%] w-full">
                                    <h6 className=" font-bold">Name</h6>
                                    <p>{copy.reference}</p>
                                  </div>
                                  <div className="md:w-[10%] w-full">
                                    <h6 className=" font-bold">Measure</h6>
                                    <p>{copy.measure}</p>
                                  </div>
                                  <div className="md:w-[10%] w-full">
                                    <h6 className=" font-bold">Quantity</h6>
                                    <p>{copy.quantity}</p>
                                  </div>
                                  <div className="md:w-[10%] w-full">
                                    <h6 className=" font-bold">Price</h6>
                                    <p>
                                      <b>$</b>{" "}
                                      {copy.price?.toLocaleString("en-US", {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })}
                                    </p>
                                  </div>
                                  <div className="md:w-[10%] w-full">
                                    <h6 className=" font-bold">Total Price</h6>
                                    <p>
                                      <b>$</b>{" "}
                                      {copy.totalPrice?.toLocaleString(
                                        "en-US",
                                        {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        }
                                      )}
                                    </p>
                                  </div>
                                </li>
                              ))
                          )}
                        {/* Other */}
                        {data &&
                          data.fieldCopies &&
                          data.fieldCopies.map((outerCopy) =>
                            outerCopy.copies
                              .filter((item) => item.source === "Other")
                              .map((copy) => (
                                <li
                                  key={copy._id}
                                  className="w-full flex gap-6 mt-3"
                                >
                                  <div className="md:w-[20%] w-full">
                                    <h6 className=" font-semibold">
                                      Source Used
                                    </h6>
                                    <p>{copy.source}</p>
                                  </div>
                                  <div className="md:w-[30%] w-full">
                                    <h6 className=" font-bold">Name</h6>
                                    <p>{copy.reference}</p>
                                  </div>
                                  <div className="md:w-[10%] w-full">
                                    <h6 className=" font-bold">Measure</h6>
                                    <p>{copy.measure}</p>
                                  </div>
                                  <div className="md:w-[10%] w-full">
                                    <h6 className=" font-bold">Quantity</h6>
                                    <p>{copy.quantity}</p>
                                  </div>
                                  {copy.invoice && (
                                    <div className="md:w-[10%] w-full">
                                      <h6 className=" font-bold">Invoice</h6>
                                      <p>{copy.invoice}</p>
                                    </div>
                                  )}
                                  {copy.PO && (
                                    <div className="md:w-[10%] w-full">
                                      <h6 className=" font-bold">PO</h6>
                                      <p>{copy.PO}</p>
                                    </div>
                                  )}
                                  {copy?.vendorName && (
                                    <div className="md:w-[10%] w-full">
                                      <h6 className=" font-bold">
                                        Vendor Name
                                      </h6>
                                      <p>{copy.vendorName}</p>
                                    </div>
                                  )}
                                  <div className="md:w-[10%] w-full">
                                    <h6 className=" font-bold">Price</h6>
                                    <p>
                                      <b>$</b>{" "}
                                      {copy.price?.toLocaleString("en-US", {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })}
                                    </p>
                                  </div>
                                  <div className="md:w-[10%] w-full">
                                    <h6 className=" font-bold">Total Price</h6>
                                    <p>
                                      <b>$</b>{" "}
                                      {copy.totalPrice?.toLocaleString(
                                        "en-US",
                                        {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        }
                                      )}
                                    </p>
                                  </div>
                                </li>
                              ))
                          )}
                        {/* Lump Sum */}
                        {data &&
                          data.fieldCopies &&
                          data.fieldCopies.map((outerCopy) =>
                            outerCopy.copies
                              .filter((item) =>
                                item.source.includes("Lump Sum")
                              )
                              .map((copy) => (
                                <li
                                  key={copy._id}
                                  className="w-full flex gap-6 mt-3"
                                >
                                  <div className="md:w-[20%] w-full">
                                    <h6 className=" font-semibold">
                                      Source Used
                                    </h6>
                                    <p>{copy.source}</p>
                                  </div>
                                  {false && (
                                    <div className="md:w-[30%] w-full">
                                      <h6 className=" font-bold">
                                        Vendor Name
                                      </h6>
                                      <p>{copy.vendorName}</p>
                                    </div>
                                  )}
                                  <div className="md:w-[30%] w-full">
                                    <h6 className=" font-bold">Description</h6>
                                    <p>{copy.reference}</p>
                                  </div>
                                  {copy?.vendorName && (
                                    <div className="md:w-[10%] w-full">
                                      <h6 className=" font-bold">
                                        Vendor Name
                                      </h6>
                                      <p>{copy.vendorName}</p>
                                    </div>
                                  )}
                                  <div className="md:w-[10%] w-full">
                                    <h6 className=" font-bold">Price</h6>
                                    <p>
                                      <b>$</b>{" "}
                                      {copy.totalPrice?.toLocaleString(
                                        "en-US",
                                        {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        }
                                      )}
                                    </p>
                                  </div>
                                  <div className="md:w-[10%] w-full">
                                    <h6 className=" font-bold">Total Price</h6>
                                    <p>
                                      <b>$</b>{" "}
                                      {copy.totalPrice?.toLocaleString(
                                        "en-US",
                                        {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        }
                                      )}
                                    </p>
                                  </div>
                                </li>
                              ))
                          )}

                        {/* Labor Field Copy */}
                        {data &&
                          data.fieldCopies &&
                          data.fieldCopies.map((outerCopy) =>
                            outerCopy.copies
                              .filter((item) => item.source === "Labor")
                              .map((copy) => (
                                <li
                                  key={copy._id}
                                  className="w-full flex gap-6 mt-3"
                                >
                                  <div className="md:w-[20%] w-full">
                                    <h6 className=" font-semibold">
                                      Source Used
                                    </h6>
                                    <p>{copy.source}</p>
                                  </div>
                                  <div className="md:w-[30%] w-full">
                                    <h6 className="font-bold">Name</h6>
                                    <p>{copy.reference}</p>
                                  </div>
                                  {copy?.vendorName && (
                                    <div className="md:w-[10%] w-full">
                                      <h6 className=" font-bold">
                                        Vendor Name
                                      </h6>
                                      <p>{copy.vendorName}</p>
                                    </div>
                                  )}
                                  <div className="md:w-[30%] w-full">
                                    <h6 className=" font-bold">Total Price</h6>
                                    <p>
                                      <b>$</b>{" "}
                                      {copy.totalPrice?.toLocaleString(
                                        "en-US",
                                        {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        }
                                      )}
                                    </p>
                                  </div>
                                </li>
                              ))
                          )}

                        <div className="my-10" />

                        {/* Labor Data */}
                        {data &&
                          data.fieldCopies &&
                          data.fieldCopies
                            .filter((copy) => copy.totalCost != 0)
                            .map((copy) => {
                              return (
                                <li
                                  key={copy._id}
                                  className="w-full flex justify-between gap-6 mt-2"
                                >
                                  <div className="md:w-[20%] w-full">
                                    <p className="font-semibold">
                                      {copy.jobType} LABOR
                                    </p>
                                  </div>
                                  {copy.manHours != 0 && (
                                    <div className="md:w-[30%] w-full text-end">
                                      <p>{copy?.manHours} Hrs</p>
                                    </div>
                                  )}
                                  {copy.jobTypeCost != 0 && (
                                    <div className="md:w-[20%] w-full text-end">
                                      <p>
                                        <b>$</b>{" "}
                                        {copy?.jobTypeCost?.toLocaleString(
                                          "en-US",
                                          {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          }
                                        )}{" "}
                                        / per
                                      </p>
                                    </div>
                                  )}

                                  <div className="md:w-[20%] w-full text-end">
                                    <p>
                                      <b>$</b>{" "}
                                      {copy?.totalCost?.toLocaleString(
                                        "en-US",
                                        {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        }
                                      )}
                                    </p>
                                  </div>
                                </li>
                              );
                            })}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div
          className="modal fade"
          id="exampleModal_crew"
          tabIndex={-1}
          aria-labelledby="exampleModalLabel"
          aria-hidden="true"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" id="exampleModalLabel">
                  More Details
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
                <div className="">
                  <h6 className="font-semibold text-base mb-1.5">Crew</h6>
                  <div className="flex flex-wrap gap-2">
                    {modalCrew.length > 0
                      ? modalCrew.map((crew, index) => (
                        <div
                          key={index}
                          className="selected-crew bg-[#00613e] text-white flex justify-center items-center rounded-full px-2 h-[32px] text-sm"
                        >
                          {crew.crewName}
                        </div>
                      ))
                      : "No Crew Available"}
                  </div>
                </div>
                <div className="mt-4">
                  <h6 className="font-semibold text-base mb-1.5">
                    Description
                  </h6>
                  <p className="break-words">{parse(note)}</p>
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
