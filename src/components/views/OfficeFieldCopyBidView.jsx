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
  getOfficeFieldCopyLineCost,
  getOfficeFieldCopyRowCalculations,
  getLaborPdfDescription,
  isFieldCopyLaborContext,
  shouldSkipAggregatedLaborPdfRow,
} from "../../utils/fieldCopyLaborDisplay";
import { finalizeLaborSummaryRow } from "../../utils/materialReference";

export default function OfficeFieldCopyBidView() {
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
    projectCompletedDate: "",
    credits: 0,
    officeCopyId: "",
    bidCopyId: "",
    billAddress: "",
    totalManHours: 0,
    jobName: "",
    isProjectTaxable: false,
    customerType: "",
    nonTaxCredits: 0,
    nonTaxDescription: "",
    taxCredits: 0,
    taxDescription: "",
  });
  const [fieldCopies, setFieldCopies] = useState([]);
  const [bidCopies, setBidCopies] = useState([]);
  const [jobType, setJobType] = useState("");
  const { id } = useParams();
  const [laborTotal, setLaborTotal] = useState(0);
  const [materialsTotal, setMaterialsTotal] = useState(0);
  const [laborBidTotal, setLaborBidTotal] = useState(0);
  const [fieldLaborData, setFieldLaborData] = useState([]);
  const [materialsBidTotal, setMaterialsBidTotal] = useState(0);
  const [taxPercent, setTaxPercent] = useState(0);
  const [address, setAddress] = useState("");
  const [taxableAmount, setTaxableAmount] = useState(0);
  const [taxableBidAmount, setTaxableBidAmount] = useState(0);
  const [categorizedFieldCopies, setCategorizedFieldCopies] = useState([]);
  const [categorizedBidCopies, setCategorizedBidCopies] = useState([]);
  const [materialData, setMaterialData] = useState([]);
  const [laborData, setLaborData] = useState([]);
  const [materialBidData, setMaterialBidData] = useState([]);
  const [laborBidData, setLaborBidData] = useState([]);
  const [fieldLaborBidData, setFieldLaborBidData] = useState([]);
  const [materialLaborData, setMaterialLaborData] = useState([]);

  const [bidCopiesArr, setBidCopiesArr] = useState([]);

  const [hideBidData, setHideBidData] = useState(false);
  const [loading, setLoading] = useState(false);
  const [documentName, setDocumentName] = useState("");
  const navigate = useNavigate();

  const { tableSize } = useTableContext();

  const taxEq = (a, b) => {
    const x = a === true || a === "true";
    const y = b === true || b === "true";
    return x === y;
  };

  const invoiceSalesTax = useMemo(() => {
    const tc = Number(formData.taxCredits) || 0;
    const taxableBase = formData.isProjectTaxable
      ? Math.max(0, Number(taxableAmount) - tc)
      : tc > Number(taxableAmount)
        ? 0
        : Number(taxableAmount);
    return (taxPercent * taxableBase) / 100;
  }, [
    formData.isProjectTaxable,
    formData.taxCredits,
    taxPercent,
    taxableAmount,
  ]);

  const workSummarySellTaxableRaw = useMemo(() => {
    const customerType = formData?.customerType;
    if (customerType === "Exempt") return 0;
    if (customerType === "Commercial") {
      return (Number(materialsTotal) || 0) + (Number(laborTotal) || 0);
    }
    return (materialLaborData || []).reduce((acc, it) => {
      const sell = Number(it?.totalPrice) || 0;
      if (!(sell > 0)) return acc;
      if (it?.dataType === "Material") {
        return taxEq(it?.isTaxable, true) ? acc + sell : acc;
      }
      return taxEq(it?.isLaborTaxable, true) ? acc + sell : acc;
    }, 0);
  }, [formData?.customerType, materialLaborData, materialsTotal, laborTotal]);

  const workSummarySellTaxableDisplay = useMemo(() => {
    const tc = Number(formData?.taxCredits) || 0;
    if (formData?.isProjectTaxable) {
      return Math.max(0, workSummarySellTaxableRaw - tc);
    }
    if (tc > workSummarySellTaxableRaw) return 0;
    return workSummarySellTaxableRaw;
  }, [
    formData?.isProjectTaxable,
    formData?.taxCredits,
    workSummarySellTaxableRaw,
  ]);

  const workSummarySalesTax = useMemo(
    () => (Number(taxPercent) || 0) * (Number(workSummarySellTaxableDisplay) || 0) / 100,
    [taxPercent, workSummarySellTaxableDisplay]
  );

  const workSummaryGrandTotal = useMemo(() => {
    const tc = Number(formData?.taxCredits) || 0;
    const ntc = Number(formData?.nonTaxCredits) || 0;
    const subtotal =
      (Number(materialsTotal) || 0) + (Number(laborTotal) || 0) - tc - ntc;
    return subtotal + workSummarySalesTax;
  }, [
    materialsTotal,
    laborTotal,
    formData?.taxCredits,
    formData?.nonTaxCredits,
    workSummarySalesTax,
  ]);

  /** Bid proposal grand total (matches hidden “Proposal Summary” totals). */
  const bidProposalGrandTotal = useMemo(() => {
    const tc = Number(formData.taxCredits) || 0;
    const ntc = Number(formData.nonTaxCredits) || 0;
    const creditsSum = tc + ntc;
    if (formData.isProjectTaxable) {
      return (
        (taxPercent * (taxableBidAmount - tc)) / 100 +
        (materialsBidTotal + laborBidTotal - creditsSum)
      );
    }
    return (
      (taxPercent * taxableBidAmount) / 100 +
      (materialsBidTotal + laborBidTotal - creditsSum)
    );
  }, [
    formData.isProjectTaxable,
    formData.taxCredits,
    formData.nonTaxCredits,
    laborBidTotal,
    materialsBidTotal,
    taxPercent,
    taxableBidAmount,
  ]);

  /** Sum manHours per category from project office field copies (get-project payload). */
  const jobTypeManHoursSums = useMemo(() => {
    const sums = {
      drainage: 0,
      electrical: 0,
      hardscape: 0,
      irrigation: 0,
      landscape: 0,
    };
    const parseHoursValue = (value) => {
      if (value == null) return 0;
      if (typeof value === "number") return Number.isFinite(value) ? value : 0;
      const txt = String(value).trim();
      if (!txt) return 0;
      const direct = Number(txt);
      if (Number.isFinite(direct)) return direct;
      const m = txt.match(/-?\d+(\.\d+)?/);
      return m ? Number(m[0]) || 0 : 0;
    };
    const addHoursToBucket = (categoryText, hours) => {
      const jt = String(categoryText || "").toLowerCase();
      const h = parseHoursValue(hours);
      if (!(h > 0)) return;
      if (jt.includes("drainage")) sums.drainage += h;
      else if (jt.includes("electrical")) sums.electrical += h;
      else if (jt.includes("hardscape")) sums.hardscape += h;
      else if (jt.includes("irrigation")) sums.irrigation += h;
      else if (jt.includes("landscape")) sums.landscape += h;
    };
    const addHoursFromEntry = (entry, hours) => {
      const categoryText = [
        entry?.jobType,
        entry?.reference,
        entry?.description,
        entry?.type,
      ]
        .filter(Boolean)
        .join(" ");
      addHoursToBucket(categoryText, hours);
    };
    const office = formData?.officeFieldCopy;
    if (Array.isArray(office)) {
      for (const copyEntry of office) {
        const groups = copyEntry?.fieldCopies;
        if (!Array.isArray(groups)) continue;
        for (const g of groups) {
          addHoursFromEntry(g, g?.manHours);
        }
      }
    }
    const draft = formData?.draftCopy;
    if (Array.isArray(draft)) {
      for (const copyEntry of draft) {
        const groups = copyEntry?.draftCopies;
        if (!Array.isArray(groups)) continue;
        for (const g of groups) {
          addHoursFromEntry(g, g?.manHours);
        }
      }
    }

    const totalFromProjectPayload =
      sums.drainage + sums.electrical + sums.hardscape + sums.irrigation + sums.landscape;
    if (totalFromProjectPayload <= 0) {
      // Bid views often have job-type hours only on labor arrays.
      for (const labor of laborBidData || []) {
        addHoursFromEntry(labor, labor?.manHours ?? labor?.quantity);
      }
      for (const labor of laborData || []) {
        addHoursFromEntry(labor, labor?.manHours ?? labor?.quantity);
      }
    }
    const totalAfterLaborFallback =
      sums.drainage + sums.electrical + sums.hardscape + sums.irrigation + sums.landscape;
    if (totalAfterLaborFallback <= 0) {
      // Final bid-only fallback: some projects keep labor hours on raw bid rows.
      for (const row of bidCopies || []) {
        const looksLikeLabor =
          String(row?.source || "").toLowerCase() === "labor" ||
          isFieldCopyLaborContext(row) ||
          String(row?.reference || "").toLowerCase().includes("labor") ||
          String(row?.description || "").toLowerCase().includes("labor");
        if (!looksLikeLabor) continue;
        const rawHoursCandidate =
          row?.manHours ??
          row?.totalManHours ??
          row?.totalHours ??
          row?.hours ??
          row?.hrs ??
          row?.measure ??
          row?.size ??
          row?.quantity;
        addHoursFromEntry(
          row,
          rawHoursCandidate
        );
      }
    }
    return sums;
  }, [
    formData?.officeFieldCopy,
    formData?.draftCopy,
    laborBidData,
    laborData,
    bidCopies,
  ]);

  const formatHours = (n) =>
    Number(n || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

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
        if (rate > 0 && (!map[jt] || map[jt] <= 0)) map[jt] = rate;
      }
    };
    if (Array.isArray(formData?.officeFieldCopy)) {
      for (const entry of formData.officeFieldCopy) pushFromGroups(entry?.fieldCopies);
    }
    if (Array.isArray(formData?.draftCopy)) {
      for (const entry of formData.draftCopy) pushFromGroups(entry?.draftCopies);
    }
    return map;
  }, [formData?.officeFieldCopy, formData?.draftCopy]);

  const downloadPdf = () => {
    setHideBidData(true);

    const element = document.getElementById("content-to-pdf");

    const fileName = documentName + ".pdf";

    // Create a temporary div with the hidden content
    // const tempDiv = document.createElement("div");
    //   tempDiv.innerHTML = `
    //   <div class="flex justify-center mb-4">
    //     <img src="${fng_logo}" alt="F&G Logo" class="h-[110px]" />
    //   </div>
    // `;

    // Insert the temporary div at the top of the content
    // element.prepend(tempDiv);

    const options = {
      margin: 0.2,
      filename: fileName,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "in", format: "A4", orientation: "portrait" },
      // pagebreak: { mode: ["avoid-all", "css", "legacy"] } // Ensures proper page breaks
    };

    html2pdf()
      .from(element)
      .set(options)
      .save()
      .then(() => {
        // Ensure the temporary div is removed after the download completes
        // tempDiv.remove();
        setHideBidData(false);
      })
      .catch((error) => {
        console.error("PDF generation failed:", error);
        setHideBidData(false);
      });
  };

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

  useEffect(() => {
    if (bidCopies.length > 0) {
      const summarizedBidData = summarizeFieldCopies(bidCopies);
      setCategorizedBidCopies([
        { category: "Bid Materials & Labor", items: summarizedBidData },
      ]);
    }
    const { laborTotal, materialsTotal } = calculateBidTotals(bidCopies);
    setLaborBidTotal(laborTotal);
    setMaterialsBidTotal(materialsTotal);
  }, [bidCopies]);

  useEffect(() => {
    let taxAmount = 0;
    const isWils409B = (formData?.projectCode || "").toLowerCase() === "wils-409-b";
    if (
      categorizedFieldCopies &&
      categorizedFieldCopies[0] &&
      categorizedFieldCopies[0]?.items?.length > 0
    ) {
      for (let type of categorizedFieldCopies[0].items) {
        // Labor-like lines are represented in laborData as well; skip to avoid double tax.
        if (type.source === "Labor" || isFieldCopyLaborContext(type)) {
          continue;
        }
        if (type.isTaxable) {
          // taxAmount +=
          //   Number.parseFloat(type.price) * Number.parseFloat(type.quantity);
          if (type.source === "Labor" || type.source === "Lump Sum") {
            taxAmount =
              Number.parseFloat(taxAmount) + Number.parseFloat(type.totalPrice);
          } else {
            // taxAmount =
            //   Number.parseFloat(taxAmount) +
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

    // Special case: wils-409-b has a mismatch where summarized items can reflect markup/price
    // while Work Summary totals rely on raw field copy totals. For this one document,
    // compute taxable from raw fieldCopies + taxable labor only.
    if (isWils409B) {
      let rawTaxable = 0;
      for (const it of fieldCopies || []) {
        if (it?.status !== "Active") continue;
        if (it?.source === "Labor") continue;
        if (!it?.isTaxable) continue;
        rawTaxable += Number(it?.totalPrice || 0);
      }
      for (const l of laborData || []) {
        if (!l?.isLaborTaxable) continue;
        rawTaxable += Number(l?.totalPrice || 0);
      }
      taxAmount = rawTaxable;
    }

    if (formData.customerType === "Normal") {
      setTaxableAmount(Number.parseFloat(taxAmount));
    } else if (formData.customerType === "Commercial") {
      // Special case: wils-409-b stores labor as jobType-level totals and can be non-taxable.
      // For this one document, compute taxable from taxable flags only.
      setTaxableAmount(isWils409B ? Number.parseFloat(taxAmount) : materialsTotal + laborTotal);
    } else if (formData.customerType === "Exempt") {
      setTaxableAmount(0);
    }
  }, [
    categorizedFieldCopies,
    laborData,
    fieldCopies,
    formData?.customerType,
    formData?.projectCode,
    materialsTotal,
    laborTotal,
  ]);

  // useEffect(() => {
  //   let taxAmount = 0;
  //   if (
  //     categorizedBidCopies &&
  //     categorizedBidCopies[0] &&
  //     categorizedBidCopies[0]?.items?.length > 0
  //   ) {
  //     for (let type of categorizedBidCopies[0].items) {
  //       if (type.isTaxable) {
  //         // taxAmount +=
  //         //   Number.parseFloat(type.price) * Number.parseFloat(type.quantity);
  //         if (type.source === "Labor") {
  //           taxAmount = taxAmount + Number.parseFloat(type.totalPrice);
  //         } else {
  //           taxAmount =
  //             taxAmount +
  //             Number.parseFloat(type.price) * Number.parseFloat(type.quantity);
  //         }
  //       }
  //     }
  //   }
  //   for (let labor of laborBidData) {
  //     if (labor.isLaborTaxable) {
  //       taxAmount += Number.parseFloat(labor.totalPrice);
  //     }
  //   }
  //   setTaxableAmount(Number.parseFloat(taxAmount));
  // }, [categorizedBidCopies]);

  useEffect(() => {
    let taxAmount = 0;
    if (
      categorizedBidCopies &&
      categorizedBidCopies[0] &&
      categorizedBidCopies[0]?.items?.length > 0
    ) {
      for (let type of categorizedBidCopies[0].items) {
        if (type.source === "Labor" || isFieldCopyLaborContext(type)) {
          continue;
        }
        if (type.isTaxable) {
          taxAmount = taxAmount + Number.parseFloat(type.totalPrice);
        }
      }
    }
    for (let labor of laborBidData) {
      if (labor.isLaborTaxable) {
        taxAmount += Number.parseFloat(labor.totalPrice);
      }
    }
    setTaxableBidAmount(taxAmount);
  }, [categorizedBidCopies, laborBidData]);

  useEffect(() => {
    getProjectById();
    getJobTypeById();
    getTaxPercentage();
    getFGAddress();
    getOfficeFieldCopyData();
    getBidedFieldCopyData();
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
      toast.error(error.response.message);
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
      if (response.data.statusCode === 200) {
        let resultedCopies = [
          ...response.data.result.officeFieldCopies,
          ...response.data.result.officeDraftCopies,
        ];
        resultedCopies = moveLaborToBottom(resultedCopies);

        // Materials

        let resultedMaterials = [];
        let fieldLabors = [];
        const bothMaterialData = [
          ...response.data.result.materialData,
          ...response.data.result.materialDraftData,
        ];
        // console.log("Both Material", bothMaterialData);
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

        // let resultedMaterials = [
        //   ...response.data.result.materialData,
        //   ...response.data.result.materialDraftData,
        // ];
        resultedMaterials = categorizeMaterial(resultedMaterials);
        const baseLaborTotals = [
          ...response.data.result.laborData,
          ...response.data.result.laborDraftData,
        ];
        let resultedLabors = [
          ...baseLaborTotals,
          ...fieldLabors,
        ];
        // console.log("Resulted Material Before", resultedMaterials, fieldLabors);
        resultedLabors = categorizeLabor(resultedLabors);
        // console.log("Resulted Material After", resultedLabors);
        setFieldLaborData(categorizeLabor(baseLaborTotals));
        setFieldCopies(resultedCopies);
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
      toast.error(error.response.message);
    }
    setLoading(false);
  };

  function sortByJobType(data) {
    return data.sort((a, b) => a.jobType.localeCompare(b.jobType));
  }

  // function categorizeLabor(laborData) {
  //   return laborData.reduce((result, item) => {
  //     // Check if the jobType already exists in the result object
  //     if (!result[item.jobType]) {
  //       // Initialize a new entry for this jobType
  //       result[item.jobType] = {
  //         jobType: item.jobType,
  //         totalPrice: 0,
  //         isLaborTaxable: item.isLaborTaxable,
  //       };
  //     }
  //     // Sum up the totalPrice for the current jobType
  //     result[item.jobType].totalPrice += item.totalPrice;
  //     return result;
  //   }, {});
  // }

  // function categorizeMaterial(materialData) {
  //   return materialData.reduce((result, item) => {
  //     // Check if the jobType already exists in the result object
  //     if (!result[item.jobType]) {
  //       // Initialize a new entry for this jobType
  //       result[item.jobType] = {
  //         jobType: item.jobType,
  //         totalPrice: 0,
  //       };
  //     }
  //     // Sum up the totalPrice for the current jobType
  //     result[item.jobType].totalPrice += item.totalPrice;
  //     return result;
  //   }, {});
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
          size: item?.size || item?.measure || "",
          totalPrice: 0,
          totalCost: 0,
          quantity: 0,
          manHours: 0,
          cost: undefined,
          price: undefined,
          markup: undefined,
          markUp: undefined,
          isLaborTaxable: item.isLaborTaxable,
          type: item.type,
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
      result[key].manHours +=
        item?.manHours != null && item?.manHours !== ""
          ? Number(item.manHours)
          : item?.quantity != null && item?.quantity !== ""
            ? Number(item.quantity)
            : 0;
      if ((!result[key].size || String(result[key].size).trim() === "") && (item?.size || item?.measure)) {
        result[key].size = item?.size || item?.measure;
      }
      if (result[key].cost === undefined && item?.cost != null && item?.cost !== "") {
        result[key].cost = Number(item.cost);
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
        const sortedCopies = moveLaborToBottom(
          response.data.result?.bidedCopiesData
        );
        setBidCopies(sortedCopies || []);
        const bidCopiesArr = response.data.result?.bidedCopiesData.map(
          (bid) => {
            return bid.reference;
          }
        );
        setBidCopiesArr(bidCopiesArr);

        //

        let resultedMaterials = [];
        let fieldLabors = [];
        response.data.result.materialData.forEach((item) => {
          if (item.source !== "Labor") {
            resultedMaterials = [...resultedMaterials, item];
          } else {
            fieldLabors = [
              ...fieldLabors,
              {
                jobType: item.jobType,
                reference: item.reference,
                description: item.description,
                source: "Labor",
                totalPrice: item.totalPrice,
                manHours:
                  item?.manHours != null && item.manHours !== ""
                    ? Number(item.manHours)
                    : item?.measure != null && item.measure !== ""
                      ? Number(String(item.measure).match(/-?\d+(\.\d+)?/)?.[0] || 0)
                      : item?.size != null && item.size !== ""
                        ? Number(String(item.size).match(/-?\d+(\.\d+)?/)?.[0] || 0)
                        : item?.hours != null && item.hours !== ""
                          ? Number(item.hours)
                    : item?.quantity != null && item.quantity !== ""
                      ? Number(item.quantity)
                      : 0,
                quantity:
                  item?.quantity != null && item.quantity !== ""
                    ? Number(item.quantity)
                    : undefined,
                isLaborTaxable: item.isTaxable,
                type: "field",
              },
            ];
          }
        });
        const laborData = response.data.result.laborData.map((labor) => {
          return {
            jobType: labor.jobType,
            isLaborTaxable: labor.isLaborTaxable,
            totalPrice: labor.totalPrice,
            manHours:
              labor?.manHours != null && labor.manHours !== ""
                ? Number(labor.manHours)
                : labor?.quantity != null && labor.quantity !== ""
                  ? Number(labor.quantity)
                  : 0,
            type: "labor",
          };
        });

        setMaterialBidData(resultedMaterials || []);
        setFieldLaborBidData(laborData);
        // setLaborBidData(response.data.result.laborData);
        let resultedLabors = [...laborData, ...fieldLabors];
        setLaborBidData(categorizeLabor(resultedLabors));
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response.message);
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
        setAddress(response.data.result);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response.message);
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
      toast.error(error.response.message);
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

  const calculateBidTotals = (fieldCopies) => {
    const totals = {
      laborTotal: 0,
      materialsTotal: 0,
    };

    materialBidData.forEach((item) => {
      totals.materialsTotal += item.totalPrice;
    });

    laborBidData.forEach((item) => {
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
      toast.error(error.response.message);
    }
  };

  const summarizeFieldCopies = (fieldCopies) => {
    const summary = {};

    fieldCopies.forEach((item) => {
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
          ? `${item.reference}-${laborKind}`
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
          cost:
            item.cost !== undefined && item.cost !== null ? Number(item.cost) : undefined,
          markup:
            item.markup !== undefined && item.markup !== null
              ? Number(item.markup)
              : item.markUp !== undefined && item.markUp !== null
                ? Number(item.markUp)
                : undefined,
          markUp:
            item.markUp !== undefined && item.markUp !== null
              ? Number(item.markUp)
              : item.markup !== undefined && item.markup !== null
                ? Number(item.markup)
                : undefined,
          totalPrice: 0,
        };
      }

      summary[key].quantity += Number(item.quantity || 0);

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
      summary[key].totalPrice += Number(sellTotalToAdd || 0);

      // Preserve cost/price/markup from first item that has value
      if (
        (summary[key].cost === undefined || Number(summary[key].cost) <= 0) &&
        unitCost > 0
      ) {
        summary[key].cost = unitCost;
      }
      if (
        (summary[key].price === undefined ||
          summary[key].price === null ||
          summary[key].price === "") &&
        item.price !== undefined &&
        item.price !== null &&
        item.price !== ""
      ) {
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

    // Calculate the total price
    // Object.keys(summary).forEach((key) => {
    //   summary[key].totalPrice = summary[key].quantity * summary[key].price;
    // });

    return Object.values(summary).map((row) =>
      row.source === "Labor" ? finalizeLaborSummaryRow(row) : row
    );
  };

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
    const year = String(date.getFullYear()).slice(-2); // Get the last 2 digits of the year

    // Return in MM/DD/YY format
    return `${month}/${day}/${year}`;
  }

  const handleInvoiceJobType = (jobType) => {
    if (["professional", "pick up/delivery"].includes(jobType.toLowerCase())) {
      return "SERVICE";
    } else if (jobType.toLowerCase() === "equipment rental") {
      return "";
    } else if (jobType.toLowerCase() === "reimbursement total") {
      return "";
    }else if (jobType.includes("Lump Sum")) {
      return "";
    } else {
      return "MATERIAL";
    }
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
    const q =
      item.quantity != null && item.quantity !== "" ? Number(item.quantity) : 1;
    if (c != null && c !== "" && Number(c) > 0) {
      return Number(c) * q;
    }
    return 0;
  }

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

  const jobTypeMatch = (a, b) =>
    String(a ?? "")
      .trim()
      .toLowerCase() ===
    String(b ?? "")
      .trim()
      .toLowerCase();

  const parseHoursNumber = (value) => {
    if (value == null) return 0;
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    const txt = String(value).trim();
    if (!txt) return 0;
    const direct = Number(txt);
    if (Number.isFinite(direct)) return direct;
    const m = txt.match(/-?\d+(\.\d+)?/);
    return m ? Number(m[0]) || 0 : 0;
  };

  const getWorkSummaryLaborHours = (item) => {
    const rowJobType = item?.jobType;
    const rowTaxable = item?.isLaborTaxable ?? item?.isTaxable;
    let hours = 0;
    for (const fc of fieldCopies || []) {
      const sourceLaborLike =
        String(fc?.source || "").toLowerCase() === "labor" ||
        isFieldCopyLaborContext(fc);
      if (!sourceLaborLike) continue;
      const fcJt = fc?.jobType ?? fc?.type;
      if (!jobTypeMatch(fcJt, rowJobType)) continue;
      const fcTaxable = fc?.isLaborTaxable ?? fc?.isTaxable;
      if (!taxEq(fcTaxable, rowTaxable)) continue;
      hours +=
        parseHoursNumber(fc?.manHours) ||
        parseHoursNumber(fc?.totalManHours) ||
        parseHoursNumber(fc?.hours) ||
        parseHoursNumber(fc?.quantity) ||
        parseHoursNumber(fc?.measure) ||
        parseHoursNumber(fc?.size);
    }
    if (hours > 0) return hours;
    return (
      parseHoursNumber(item?.manHours) ||
      parseHoursNumber(item?.hours) ||
      parseHoursNumber(item?.quantity) ||
      parseHoursNumber(item?.measure) ||
      parseHoursNumber(item?.size)
    );
  };

  /** Same column weights as itemized table colgroup: 40% + six 10% cols — COST is column 4, TOTAL column 7. */
  const workSummaryGridClass =
    // Keep COST aligned under the table's DESCRIPTION column (which uses a fixed ~400px width in rows).
    "grid grid-cols-[minmax(380px,40%)_minmax(0,10%)_minmax(0,10%)_minmax(0,10%)_minmax(0,10%)_minmax(0,10%)_minmax(0,10%)] gap-x-0 gap-y-1";

  // PDF-only: nudge COST column slightly left to better align
  const workSummaryGridClassPdf =
    "grid grid-cols-[minmax(365px,40%)_minmax(0,10%)_minmax(0,10%)_minmax(0,10%)_minmax(0,10%)_minmax(0,10%)_minmax(0,10%)] gap-x-0 gap-y-1";

  /** Work Summary COST: sum from flat fieldCopies only. */
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

  const workSummaryCostSubtotalDisplay = useMemo(
    () => {
      let subtotal = 0;

      for (const group of categorizedFieldCopies || []) {
        for (const item of group?.items || []) {
          const { lineCost } = getOfficeFieldCopyRowCalculations(item);
          subtotal += Number(lineCost) || 0;
        }
      }

      for (const labor of fieldLaborData || []) {
        if (!(Number(labor?.totalPrice) > 0)) continue;
        if (
          shouldSkipAggregatedLaborPdfRow(
            labor,
            categorizedFieldCopies?.[0]?.items,
            fieldCopies
          )
        ) {
          continue;
        }
        const displayCost =
          Number(labor?.totalCost || labor?.cost || 0) > 0
            ? Number(labor?.totalCost || labor?.cost || 0)
            : Number(labor?.totalPrice || 0);
        subtotal += Number(displayCost) || 0;
      }

      return subtotal;
    },
    [categorizedFieldCopies, fieldLaborData, fieldCopies]
  );

  function formatAddress(address) {
    return address.replace(/(\d+)/, "\n$1");
  }

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

            {/* Model Save As */}
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
              <div className="" id="content-to-pdf">
                <div className="text-center mb-4">
                  <h5 className=" text-[red] tracking-wide">
                    <span className="border-b border-[red] pb-[7px]">
                      OFFICE COPY – BID
                    </span>
                  </h5>
                </div>

                {/* Project Data */}
                <div className="flex flex-row gap-3 justify-between mt-1">
                  <div className="flex flex-col w-1/3 md:w-[280px]">
                    <div className="p-0 capitalize">
                      <p className="text-xs font-medium">
                        <span className="border-b border-black pb-[7px]">
                          PROJECT LOCATION
                        </span>
                      </p>
                    </div>
                    <div className="p-0 capitalize">
                      <p className="text-xs break-words">
                        {formData?.customerName?.toUpperCase()}
                      </p>
                    </div>
                    <div className="p-0 capitalize">
                      <p className="text-xs break-words capitalize">
                        {formData?.jobAddress?.toUpperCase()}
                      </p>
                    </div>
                    {formData && formData.billAddress && (
                      <div className="p-0 capitalize mt-1">
                        <h6 className="text-xs font-medium ">
                          <span className="border-b border-black pb-[7px]">
                            BILLING ADDRESS
                          </span>
                        </h6>
                        <p className="text-xs break-words ">
                          {formData?.billAddress?.toUpperCase()}
                        </p>
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
                    {formData && formData?.customerEmail && (
                      <div className="p-0">
                        <p className="text-xs break-words">
                          {formData?.customerEmail}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col w-1/3 md:w-[280px]">
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
                  <h6 className="font-semibold text-[13px] tracking-wide capitalize mt-6">
                    <span className="font-semibold text-[13px] tracking-wide capitalize border-b border-black pb-[7px]">
                      {jobType?.toUpperCase()} SERVICE
                    </span>
                    {formData.jobName && (
                      <span className="font-normal text-xs capitalize ml-2">
                        : {formData.jobName?.toUpperCase()}
                      </span>
                    )}
                  </h6>
                  <p className="text-xs break-words mt-0.5">
                    {parse(formData.description)}
                  </p>
                </div>

                {/* Office Copies Data */}
                <div className="">
                  {/* Compiled data by Material */}
                  <div className="w-full mt-3 text-[15px] overflow-x-scroll py-1">
                    {categorizedFieldCopies.length > 0 ||
                    laborData.length > 0 ? (
                      categorizedFieldCopies.map((group, index) => (
                        <div key={index} className="mb-0">
                          <table
                            className="w-full text-xs"
                            style={{ tableLayout: "fixed", width: "100%" }}
                          >
                            <colgroup>
                              <col style={{ width: "40%" }} />
                              <col style={{ width: "10%" }} />
                              <col style={{ width: "10%" }} />
                              <col style={{ width: "10%" }} />
                              <col style={{ width: "10%" }} />
                              <col style={{ width: "10%" }} />
                              <col style={{ width: "10%" }} />
                            </colgroup>
                            <thead className="">
                              <tr>
                                <th className="text-xs" style={{ textAlign: "left" }}>
                                  <span className="relative -top-1.5">
                                    DESCRIPTION
                                  </span>
                                </th>
                                <th className="text-xs" style={{ textAlign: "center" }}>
                                  <span className="relative -top-1.5">
                                    SIZE
                                  </span>
                                </th>
                                <th className="text-xs" style={{ textAlign: "center" }}>
                                  <span className="relative -top-1.5">
                                    QUANTITY
                                  </span>
                                </th>
                                <th className="text-xs" style={{ textAlign: "right" }}>
                                  <span className="relative -top-1.5">
                                    COST
                                  </span>
                                </th>
                                <th className="text-xs" style={{ textAlign: "right" }}>
                                  <span className="relative -top-1.5">
                                    MARKUP
                                  </span>
                                </th>
                                <th className="text-xs" style={{ textAlign: "right" }}>
                                  <span className="relative -top-1.5">
                                    PRICE
                                  </span>
                                </th>
                                <th className="text-xs" style={{ textAlign: "right" }}>
                                  <span className="relative -top-1.5">
                                    TOTAL
                                  </span>
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {group &&
                                group.items &&
                                group.items.length > 0 &&
                                group.items.map((item, idx) => {
                                  const {
                                    lineCost,
                                    displayPrice,
                                    markupVal,
                                    displayTotal,
                                    qtyText,
                                  } = getOfficeFieldCopyRowCalculations(item);

                                  return (
                                    <tr key={idx}>
                                      <td className="w-[400px] pr-2" style={{ textAlign: "left" }}>
                                        {item?.reference?.toUpperCase()}
                                      </td>
                                      <td style={{ textAlign: "center" }}>{item?.size}</td>
                                      <td style={{ textAlign: "center" }}>
                                        {qtyText || (item?.quantity ? item.quantity : "")}
                                      </td>
                                      <td style={{ textAlign: "right" }}>
                                        {lineCost > 0
                                          ? lineCost.toLocaleString("en-US", {
                                              minimumFractionDigits: 2,
                                              maximumFractionDigits: 2,
                                            })
                                          : ""}
                                      </td>
                                      <td style={{ textAlign: "right" }}>
                                        {markupVal !== null &&
                                        markupVal !== undefined &&
                                        markupVal !== ""
                                          ? Number(markupVal).toLocaleString("en-US", {
                                              minimumFractionDigits: 0,
                                              maximumFractionDigits: 2,
                                            }) + "%"
                                          : ""}
                                      </td>
                                      <td style={{ textAlign: "right" }}>
                                        {displayPrice != null && !isNaN(displayPrice)
                                          ? displayPrice.toLocaleString("en-US", {
                                              minimumFractionDigits: 2,
                                              maximumFractionDigits: 2,
                                            })
                                          : ""}
                                      </td>
                                      <td style={{ textAlign: "right" }}>
                                        {displayTotal > 0
                                          ? displayTotal.toLocaleString("en-US", {
                                              minimumFractionDigits: 2,
                                              maximumFractionDigits: 2,
                                            })
                                          : ""}
                                      </td>
                                    </tr>
                                  );
                                })}
                              {fieldLaborData
                                .filter((labor) => labor.totalPrice !== 0)
                                .filter((labor) =>
                                  !shouldSkipAggregatedLaborPdfRow(
                                    labor,
                                    group?.items,
                                    fieldCopies
                                  )
                                )
                                .map((labor, idx) => {
                                  const jt = String(labor?.jobType || "")
                                    .trim()
                                    .toUpperCase();
                                  const hourly = Number(
                                    laborHourlyRateByJobType?.[jt] || 0
                                  );
                                  const displayCost =
                                    Number(labor?.totalCost || labor?.cost || 0) >
                                    0
                                      ? Number(
                                          labor?.totalCost || labor?.cost || 0
                                        )
                                      : Number(labor?.totalPrice || 0);
                                  const displayPrice =
                                    labor?.price != null && labor?.price !== ""
                                      ? Number(labor.price)
                                      : hourly > 0
                                        ? hourly
                                        : 0;
                                  const qty =
                                    labor?.quantity > 0
                                      ? Number(labor.quantity)
                                      : displayPrice > 0 &&
                                          Number(labor?.totalPrice || 0) > 0
                                        ? Number(labor.totalPrice) / displayPrice
                                        : 0;
                                  return (
                                    <tr key={`pdf-labor-${idx}`}>
                                      <td
                                        className="w-[400px] pr-2"
                                        style={{ textAlign: "left" }}
                                      >
                                        {getLaborPdfDescription({
                                          labor,
                                          groupItems: group?.items,
                                          fieldCopies,
                                        })?.toUpperCase()}
                                      </td>
                                      <td style={{ textAlign: "center" }}>
                                        {labor?.size || ""}
                                      </td>
                                      <td style={{ textAlign: "center" }}>
                                        {qty > 0
                                          ? Number.isInteger(qty)
                                            ? String(qty)
                                            : qty.toLocaleString("en-US", {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                              })
                                          : ""}
                                      </td>
                                      <td style={{ textAlign: "right" }}>
                                        {displayCost > 0
                                          ? displayCost.toLocaleString("en-US", {
                                              minimumFractionDigits: 2,
                                              maximumFractionDigits: 2,
                                            })
                                          : ""}
                                      </td>
                                      <td style={{ textAlign: "right" }}>
                                        {labor?.markup != null &&
                                        labor?.markup !== ""
                                          ? Number(labor.markup).toLocaleString(
                                              "en-US",
                                              {
                                                minimumFractionDigits: 0,
                                                maximumFractionDigits: 2,
                                              }
                                            ) + "%"
                                          : labor?.markUp != null &&
                                              labor?.markUp !== ""
                                            ? Number(labor.markUp).toLocaleString(
                                                "en-US",
                                                {
                                                  minimumFractionDigits: 0,
                                                  maximumFractionDigits: 2,
                                                }
                                              ) + "%"
                                            : ""}
                                      </td>
                                      <td style={{ textAlign: "right" }}>
                                        {displayPrice > 0
                                          ? displayPrice.toLocaleString("en-US", {
                                              minimumFractionDigits: 2,
                                              maximumFractionDigits: 2,
                                            })
                                          : ""}
                                      </td>
                                      <td style={{ textAlign: "right" }}>
                                        {labor?.totalPrice?.toLocaleString(
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
                            </tbody>
                          </table>
                        </div>
                      ))
                    ) : (
                      <p className="pb-2">No field copies available.</p>
                    )}
                  </div>
                  <div className="mt-2">
                    <h4 className="text-[15px] font-semibold text-center mb-6">
                      WORK SUMMARY
                    </h4>
                  </div>

                  {/* Work Summary: same grid as item table above — col 4 = COST, col 7 = $ totals */}
                  <div className="mt-4 text-xs tracking-wide w-full">
                    <div
                      className={`${workSummaryGridClassPdf} mb-1 font-semibold uppercase items-baseline`}
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
                    {materialLaborData.map((item) => {
                      if (item.dataType === "Material") {
                        const laborLike = isLaborLikeEntry(item);
                        const laborHours = laborLike
                          ? getWorkSummaryLaborHours(item)
                          : 0;
                        const fromFc = costFromFieldCopiesForRow(item);
                        const rowCost =
                          fromFc > 0 ? fromFc : Number(item.totalCost) || 0;
                        return (
                          <div
                            key={`pdf-ws-m-${item.jobType}-${item.source}-${item.isTaxable}`}
                            className={`${workSummaryGridClassPdf} mt-1 capitalize items-baseline`}
                          >
                            <span className="col-span-3 min-w-0">
                              <b className="w-[200px] inline-block">
                                {item.source === "Labor"
                                  ? getLaborPdfDescription({
                                      labor: item,
                                      groupItems:
                                        categorizedFieldCopies?.[0]?.items,
                                      fieldCopies,
                                    })?.toUpperCase()
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
                              {laborHours > 0 && (
                                <span className="ml-2">
                                  ({laborHours.toLocaleString("en-US", {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 2,
                                  })} HRS)
                                </span>
                              )}
                            </span>
                            <span className="justify-self-end text-end tabular-nums whitespace-nowrap">
                              {rowCost > 0 ? (
                                <span className="whitespace-nowrap">
                                  <b>$</b>{" "}
                                  {rowCost.toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </span>
                              ) : (
                                ""
                              )}
                            </span>
                            <span className="min-w-0" aria-hidden />
                            <span className="min-w-0" aria-hidden />
                            <span className="justify-self-end text-end tabular-nums whitespace-nowrap">
                              <span className="whitespace-nowrap">
                                <b>$</b>{" "}
                                {item.totalPrice?.toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                            </span>
                          </div>
                        );
                      }
                      if (
                        item.totalPrice > 0 &&
                        !shouldSkipAggregatedLaborPdfRow(
                          item,
                          categorizedFieldCopies?.[0]?.items,
                          fieldCopies
                        )
                      ) {
                        const fromFc = costFromFieldCopiesForRow(item);
                        const rowCost =
                          fromFc > 0
                            ? fromFc
                            : Number(item.totalCost) || Number(item.cost) || Number(item.totalPrice) || 0;
                        return (
                          <div
                            key={`pdf-ws-l-${item.jobType}-${item.isLaborTaxable}`}
                            className={`${workSummaryGridClassPdf} mt-1 items-baseline`}
                          >
                            <span className="col-span-3 min-w-0">
                              <b className="w-[200px] inline-block">
                                {getLaborPdfDescription({
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
                              {getWorkSummaryLaborHours(item) > 0 && (
                                <span className="ml-2">
                                  ({getWorkSummaryLaborHours(item).toLocaleString("en-US", {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 2,
                                  })} HRS)
                                </span>
                              )}
                            </span>
                            <span className="justify-self-end text-end tabular-nums whitespace-nowrap">
                              {rowCost > 0 ? (
                                <span className="whitespace-nowrap">
                                  <b>$</b>{" "}
                                  {rowCost.toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </span>
                              ) : (
                                ""
                              )}
                            </span>
                            <span className="min-w-0" aria-hidden />
                            <span className="min-w-0" aria-hidden />
                            <span className="justify-self-end text-end tabular-nums whitespace-nowrap">
                              <span className="whitespace-nowrap">
                                <b>$</b>{" "}
                                {item.totalPrice?.toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                            </span>
                          </div>
                        );
                      }
                      return null;
                    })}
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
                          <div className={`${workSummaryGridClassPdf} my-2 items-baseline`}>
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
                            <span className="justify-self-end text-end tabular-nums whitespace-nowrap" />
                            <span className="min-w-0" aria-hidden />
                            <span className="min-w-0" aria-hidden />
                            <span className="justify-self-end text-end tabular-nums whitespace-nowrap">
                              <b>$</b>{" "}
                              {formData.taxCredits?.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                          <div className={`${workSummaryGridClassPdf} my-2 items-baseline`}>
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
                            <span className="justify-self-end text-end tabular-nums whitespace-nowrap" />
                            <span className="min-w-0" aria-hidden />
                            <span className="min-w-0" aria-hidden />
                            <span className="justify-self-end text-end tabular-nums whitespace-nowrap">
                              <b>$</b>{" "}
                              {formData.nonTaxCredits?.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                        </>
                      )}
                      <hr />
                      <div
                        className={`${workSummaryGridClassPdf} my-2 font-semibold items-baseline uppercase`}
                      >
                        <span className="col-span-3 min-w-0">SUBTOTAL</span>
                        <span className="justify-self-end text-end tabular-nums whitespace-nowrap">
                          {workSummaryCostSubtotalDisplay > 0 ? (
                            <>
                              <b>$</b>{" "}
                              {workSummaryCostSubtotalDisplay.toLocaleString("en-US", {
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
                          {(
                            Number(materialsTotal) +
                            Number(laborTotal) -
                            (Number(formData.taxCredits) || 0) -
                            (Number(formData.nonTaxCredits) || 0)
                          ).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
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
                      <hr />
                      <div
                        className={`${workSummaryGridClassPdf} my-2 items-baseline uppercase`}
                      >
                        <span className="col-span-3 min-w-0">TAXABLE AMOUNT</span>
                        <span className="justify-self-end text-end tabular-nums whitespace-nowrap">
                          {(() => {
                            const costTaxable = materialLaborData.reduce((acc, it) => {
                              if (it.dataType === "Material") {
                                if (!taxEq(it.isTaxable, true)) return acc;
                              } else if (it.totalPrice > 0) {
                                if (!taxEq(it.isLaborTaxable, true)) return acc;
                              } else {
                                return acc;
                              }
                              const fromFc = costFromFieldCopiesForRow(it);
                              const fallback = Number(it.totalCost) || 0;
                              return acc + (fromFc > 0 ? fromFc : fallback);
                            }, 0);
                            return costTaxable > 0 ? (
                              <>
                                <b>$</b>{" "}
                                {costTaxable.toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </>
                            ) : (
                              ""
                            );
                          })()}
                        </span>
                        <span className="min-w-0" aria-hidden />
                        <span className="min-w-0" aria-hidden />
                        <span className="justify-self-end text-end tabular-nums whitespace-nowrap">
                          <b>$</b>{" "}
                          {Math.max(
                            0,
                            Number(taxableAmount) - (Number(formData.taxCredits) || 0)
                          ).toLocaleString("en-US", {
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
                      <span className="justify-self-end text-end tabular-nums whitespace-nowrap">
                        {(() => {
                          const costTaxable = materialLaborData.reduce((acc, it) => {
                            if (it.dataType === "Material") {
                              if (!taxEq(it.isTaxable, true)) return acc;
                            } else if (it.totalPrice > 0) {
                              if (!taxEq(it.isLaborTaxable, true)) return acc;
                            } else {
                              return acc;
                            }
                            const fromFc = costFromFieldCopiesForRow(it);
                            const fallback = Number(it.totalCost) || 0;
                            return acc + (fromFc > 0 ? fromFc : fallback);
                          }, 0);
                          const tc = Number(formData.taxCredits) || 0;
                          const taxableBase = formData.isProjectTaxable
                            ? Math.max(0, costTaxable - tc)
                            : tc > costTaxable
                              ? 0
                              : costTaxable;
                          return (
                            <>
                              <b>$</b>{" "}
                              {((Number(taxPercent) || 0) * taxableBase / 100).toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </>
                          );
                        })()}
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
                        <span className="justify-self-end text-end tabular-nums whitespace-nowrap">
                          {(() => {
                            const costSubtotal = workSummaryCostSubtotalDisplay;
                            const costTaxable = materialLaborData.reduce((acc, it) => {
                              if (it.dataType === "Material") {
                                if (!taxEq(it.isTaxable, true)) return acc;
                              } else if (it.totalPrice > 0) {
                                if (!taxEq(it.isLaborTaxable, true)) return acc;
                              } else {
                                return acc;
                              }
                              const fromFc = costFromFieldCopiesForRow(it);
                              const fallback = Number(it.totalCost) || 0;
                              return acc + (fromFc > 0 ? fromFc : fallback);
                            }, 0);
                            const tc = Number(formData.taxCredits) || 0;
                            const ntc = Number(formData.nonTaxCredits) || 0;
                            const taxableBase = formData.isProjectTaxable
                              ? Math.max(0, costTaxable - tc)
                              : tc > costTaxable
                                ? 0
                                : costTaxable;
                            const costSalesTax = ((Number(taxPercent) || 0) * taxableBase) / 100;
                            const costGrandTotal = costSubtotal - tc - ntc + costSalesTax;
                            return (
                              <>
                                <b>$</b>{" "}
                                {costGrandTotal.toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </>
                            );
                          })()}
                        </span>
                        <span className="min-w-0" aria-hidden />
                        <span className="min-w-0" aria-hidden />
                        <span className="text-end tabular-nums whitespace-nowrap border-b border-black pb-[7px]">
                          <b>$</b>{" "}
                          {(
                            invoiceSalesTax +
                            (materialsTotal +
                              laborTotal -
                              (Number(formData.taxCredits) || 0) -
                              (Number(formData.nonTaxCredits) || 0))
                          ).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                      {!loading && formData && (
                        <div
                          className="w-full mt-6 text-left uppercase text-[15px] space-y-1"
                          style={{ pageBreakInside: "avoid" }}
                        >
                          <p className="mb-0">
                            BID AMOUNT:{" "}
                            <span className="tabular-nums normal-case">
                              $
                              {bidProposalGrandTotal?.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </p>
                          <p className="mb-0">
                            TOTAL MAN HOURS:{" "}
                            <span className="tabular-nums normal-case">
                              {formatHours(formData?.totalManHours)}
                            </span>
                          </p>
                          <p className="mb-0">
                            DRAINAGE HOURS:{" "}
                            <span className="tabular-nums normal-case">
                              {formatHours(jobTypeManHoursSums.drainage)}
                            </span>
                          </p>
                          <p className="mb-0">
                            ELECTRICAL HOURS:{" "}
                            <span className="tabular-nums normal-case">
                              {formatHours(jobTypeManHoursSums.electrical)}
                            </span>
                          </p>
                          <p className="mb-0">
                            HARDSCAPE HOURS:{" "}
                            <span className="tabular-nums normal-case">
                              {formatHours(jobTypeManHoursSums.hardscape)}
                            </span>
                          </p>
                          <p className="mb-0">
                            IRRIGATION HOURS:{" "}
                            <span className="tabular-nums normal-case">
                              {formatHours(jobTypeManHoursSums.irrigation)}
                            </span>
                          </p>
                          <p className="mb-0">
                            LANDSCAPE HOURS:{" "}
                            <span className="tabular-nums normal-case">
                              {formatHours(jobTypeManHoursSums.landscape)}
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
            <div className="mt-6 px-6 pb-4">
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
                  <div className="p-2">
                    <h6 className="font-bold text-[17px]">Job Address</h6>
                    <p>{formData?.jobAddress}</p>
                  </div>
                  {formData && formData?.customerEmail && (
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
                  {/* <div className="p-2">
                    <h6 className="font-bold text-[17px]">
                      Description of work
                    </h6>
                    <p>{parse(formData.description)}</p>
                  </div> */}
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

              {/* Bid Copies Data */}
              <div className={`${hideBidData ? "hidden" : ""}`}>
                {/* Compiled data by Material */}
                <div className="w-full mt-10 text-[15px] overflow-x-scroll">
                  {categorizedBidCopies.length > 0 ? (
                    categorizedBidCopies.map((group, index) => (
                      <div key={index} className="mb-8">
                        <h4 className="font-bold text-lg mb-2">
                          {group.category}
                        </h4>
                        <table
                          className="w-full table table-striped text-start"
                          style={{ tableLayout: "fixed", width: "100%" }}
                        >
                          <colgroup>
                            <col style={{ width: "40%" }} />
                            <col style={{ width: "10%" }} />
                            <col style={{ width: "10%" }} />
                            <col style={{ width: "10%" }} />
                            <col style={{ width: "10%" }} />
                            <col style={{ width: "10%" }} />
                            <col style={{ width: "10%" }} />
                          </colgroup>
                          <thead className="bg-[#00613e] text-white">
                            <tr>
                              {/* <th>Source</th> */}
                              <th>Description</th>
                              <th>Size</th>
                              <th>Quantity</th>
                              <th>Cost</th>
                              <th>Markup</th>
                              <th>Price</th>
                              <th>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group &&
                              group.items &&
                              group.items.length > 0 &&
                              group.items.map((item, idx) => {
                                const {
                                  lineCost,
                                  displayPrice,
                                  markupVal,
                                  displayTotal,
                                  qtyText,
                                } = getOfficeFieldCopyRowCalculations(item);

                                return (
                                  <tr key={idx}>
                                  {/* <td>{item?.source}</td> */}
                                  <td className="w-[400px] pr-2">
                                    {item?.reference?.toUpperCase()}
                                  </td>
                                  <td>{item?.size}</td>
                                  <td>
                                    {qtyText ||
                                      (item?.quantity === 0 ? "" : item.quantity)}
                                  </td>
                                  <td>
                                    {lineCost > 0
                                      ? lineCost.toLocaleString("en-US", {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        })
                                      : ""}
                                  </td>
                                  <td>
                                    {markupVal !== null &&
                                    markupVal !== undefined &&
                                    markupVal !== ""
                                      ? Number(markupVal).toLocaleString("en-US", {
                                          minimumFractionDigits: 0,
                                          maximumFractionDigits: 2,
                                        }) + "%"
                                      : ""}
                                  </td>
                                  <td>
                                    {displayPrice != null && !isNaN(displayPrice)
                                      ? displayPrice.toLocaleString("en-US", {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        })
                                      : ""}
                                  </td>
                                  <td>
                                    {displayTotal > 0
                                      ? displayTotal.toLocaleString("en-US", {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        })
                                      : ""}
                                  </td>
                                </tr>
                                );
                              })}
                            {fieldLaborBidData
                              .filter((labor) => labor.totalPrice !== 0)
                              .map((labor) => {
                                return (
                                  <tr className="">
                                    <td className="">
                                      <p>
                                        {getLaborPdfDescription({
                                          labor,
                                          groupItems:
                                            categorizedFieldCopies?.[0]?.items,
                                          fieldCopies,
                                        })}
                                      </p>
                                    </td>
                                    <td colSpan={5}></td>
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
                          </tbody>
                        </table>
                      </div>
                    ))
                  ) : (
                    <p>No bid copies available.</p>
                  )}
                </div>

                <div className="">
                  <h4 className="text-lg font-semibold text-center mb-6">
                    Proposal Summary
                  </h4>
                </div>

                {/* Compiled data by Job Type */}
                <div className="mt-10">
                  {materialBidData.map((material) => {
                    return (
                      <div className="flex justify-between mt-1 capitalize">
                        <span>
                          <b>
                            {material.jobType?.toUpperCase()}{" "}
                            {material.source === "Labor"
                              ? "LABOR"
                              : handleInvoiceJobType(material.jobType)}
                          </b>
                        </span>
                        <span>
                          <b>$</b>{" "}
                          {material.totalPrice?.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    );
                  })}
                  {/* {laborBidData
                    .filter((labor) => labor.totalPrice !== 0)
                    .map((labor) => {
                      return (
                        <div className="flex justify-between mt-1">
                          <span>
                            <b>{labor.jobType} Labor</b>
                          </span>
                          <span>
                            <b>$</b> {labor.totalPrice}
                          </span>
                        </div>
                      );
                    })} */}
                </div>

                {/* Invoice Summary */}
                <div className="w-full mt-10 text-[15px]">
                  <div className="">
                    {/* <div className="flex justify-between">
                      <span>Total Labor Cost</span>
                      <span>
                        <b>$</b> {laborBidTotal?.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                      </span>
                    </div>
                    <div className="flex justify-between my-2">
                      <span>Total Material Cost</span>
                      <span>
                        <b>$</b> {materialsBidTotal?.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                      </span>
                    </div> */}
                    <hr />
                    <div className="flex justify-between my-2">
                      <span>SubTotal</span>
                      <span>
                        <b>$</b>{" "}
                        {(
                          materialsBidTotal +
                          laborBidTotal -
                          (formData.taxCredits + formData.nonTaxCredits)
                        )?.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <hr />
                    <div className="flex justify-between my-2">
                      <span>Taxable Amount</span>
                      <span>
                        <b>$</b>{" "}
                        {(
                          formData.isProjectTaxable
                            ? Math.max(
                                0,
                                Number(taxableBidAmount) -
                                  (Number(formData.taxCredits) || 0)
                              )
                            : Number(taxableBidAmount) || 0
                        )?.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <hr />
                    <div className="flex justify-between my-2">
                      <span>Sales Tax</span>
                      <span>
                        <b>$</b>{" "}
                        {(
                          formData.isProjectTaxable
                            ? (
                                (taxPercent *
                                  Math.max(
                                    0,
                                    (Number(taxableBidAmount) || 0) -
                                      (Number(formData.taxCredits) || 0)
                                  )) /
                                100
                              )
                            : (
                                (taxPercent *
                                  Math.max(0, Number(taxableBidAmount) || 0)) /
                                100
                              )
                        )?.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <hr />
                    <div className="flex justify-between my-2">
                      <span>Grand Total</span>
                      <span>
                        <b>$</b>{" "}
                        {formData.isProjectTaxable
                          ? (
                              (taxPercent *
                                (taxableBidAmount - formData.taxCredits)) /
                                100 +
                              (materialsBidTotal +
                                laborBidTotal -
                                (formData.taxCredits + formData.nonTaxCredits))
                            )?.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })
                          : (
                              (taxPercent * taxableBidAmount) / 100 +
                              (materialsBidTotal +
                                laborBidTotal -
                                (formData.taxCredits + formData.nonTaxCredits))
                            )?.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                      </span>
                    </div>
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
                            className="w-full table"
                            style={{ tableLayout: "fixed", width: "100%" }}
                          >
                            <colgroup>
                              <col style={{ width: "42%" }} />
                              <col style={{ width: "9%" }} />
                              <col style={{ width: "9%" }} />
                              <col style={{ width: "10%" }} />
                              <col style={{ width: "9%" }} />
                              <col style={{ width: "10%" }} />
                              <col style={{ width: "11%" }} />
                            </colgroup>
                            <thead>
                              <tr>
                                {/* <th>Source</th> */}
                                <th className="text-start ps-3">Description</th>
                                <th className="text-center">Size</th>
                                <th className="text-center">Quantity</th>
                                <th className="text-end pe-3">Cost</th>
                                <th className="text-end pe-3">Markup</th>
                                <th className="text-end pe-3">Price</th>
                                <th className="text-end pe-3">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {group &&
                                group.items &&
                                group.items.length > 0 &&
                                group.items.map((item, idx) => {
                                  const {
                                    lineCost,
                                    displayPrice,
                                    markupVal,
                                    displayTotal,
                                    qtyText,
                                  } = getOfficeFieldCopyRowCalculations(item);

                                  return (
                                    <tr
                                      key={idx}
                                      className={`${
                                        bidCopiesArr.includes(item.reference)
                                          ? idx % 2 === 0
                                            ? "bg-[whitesmoke]"
                                            : "bg-[white]"
                                          : "bg-[#e0fafa]"
                                      }`}
                                    >
                                    {/* <td>{item?.source}</td> */}
                                    <td className="w-[400px] pr-2 ps-3">
                                      {item?.reference?.toUpperCase()}
                                    </td>
                                    <td className="text-center">{item?.size}</td>
                                    <td className="text-center">
                                      {qtyText || (item?.quantity ? item?.quantity : "")}
                                    </td>
                                    <td className="text-end pe-3 tabular-nums">
                                      {lineCost > 0
                                        ? lineCost.toLocaleString("en-US", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })
                                        : ""}
                                    </td>
                                    <td className="text-end pe-3 tabular-nums">
                                      {markupVal !== null &&
                                      markupVal !== undefined &&
                                      markupVal !== ""
                                        ? Number(markupVal).toLocaleString("en-US", {
                                            minimumFractionDigits: 0,
                                            maximumFractionDigits: 2,
                                          }) + "%"
                                        : ""}
                                    </td>
                                    <td className="text-end pe-3 tabular-nums">
                                      {displayPrice != null && !isNaN(displayPrice)
                                        ? displayPrice.toLocaleString("en-US", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })
                                        : ""}
                                    </td>
                                    <td className="text-end pe-3 tabular-nums">
                                      {displayTotal > 0
                                        ? displayTotal.toLocaleString("en-US", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })
                                        : ""}
                                    </td>
                                  </tr>
                                  );
                                })}
                              {fieldLaborData
                                .filter((labor) => labor.totalPrice !== 0)
                                .filter((labor) =>
                                  !shouldSkipAggregatedLaborPdfRow(
                                    labor,
                                    group?.items,
                                    fieldCopies
                                  )
                                )
                                .map((labor, idx) => {
                                  const jt = String(labor?.jobType || "").trim().toUpperCase();
                                  const hourly = Number(laborHourlyRateByJobType?.[jt] || 0);
                                  const displayCost =
                                    Number(labor?.totalCost || labor?.cost || 0) > 0
                                      ? Number(labor?.totalCost || labor?.cost || 0)
                                      : Number(labor?.totalPrice || 0);
                                  const displayPrice =
                                    labor?.price != null && labor?.price !== ""
                                      ? Number(labor.price)
                                      : hourly > 0
                                        ? hourly
                                        : 0;
                                  const qty =
                                    labor?.quantity > 0
                                      ? Number(labor.quantity)
                                      : displayPrice > 0 && Number(labor?.totalPrice || 0) > 0
                                        ? Number(labor.totalPrice) / displayPrice
                                        : 0;
                                  return (
                                    <tr key={`labor-${idx}`} className="">
                                      <td className="ps-3">
                                        <p>
                                          {getLaborPdfDescription({
                                            labor,
                                            groupItems: group?.items,
                                            fieldCopies,
                                          })}
                                        </p>
                                      </td>
                                      <td className="text-center">
                                        {labor?.size || ""}
                                      </td>
                                      <td className="text-center">
                                        {qty > 0
                                          ? (Number.isInteger(qty)
                                              ? String(qty)
                                              : qty.toLocaleString("en-US", {
                                                  minimumFractionDigits: 2,
                                                  maximumFractionDigits: 2,
                                                }))
                                          : ""}
                                      </td>
                                      <td className="text-end pe-3 tabular-nums">
                                        {displayCost > 0
                                          ? displayCost.toLocaleString("en-US", {
                                              minimumFractionDigits: 2,
                                              maximumFractionDigits: 2,
                                            })
                                          : ""}
                                      </td>
                                      <td className="text-end pe-3 tabular-nums">
                                        {labor?.markup != null && labor?.markup !== ""
                                          ? Number(labor.markup).toLocaleString("en-US", {
                                              minimumFractionDigits: 0,
                                              maximumFractionDigits: 2,
                                            }) + "%"
                                          : labor?.markUp != null && labor?.markUp !== ""
                                            ? Number(labor.markUp).toLocaleString("en-US", {
                                                minimumFractionDigits: 0,
                                                maximumFractionDigits: 2,
                                              }) + "%"
                                            : ""}
                                      </td>
                                      <td className="text-end pe-3 tabular-nums">
                                        {displayPrice > 0
                                          ? displayPrice.toLocaleString("en-US", {
                                              minimumFractionDigits: 2,
                                              maximumFractionDigits: 2,
                                            })
                                          : ""}
                                      </td>
                                      <td className="text-end pe-3 tabular-nums">
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

                <div className="">
                  <h4 className="text-lg font-semibold text-center mb-6">
                    Work Summary
                  </h4>
                </div>

                {/* Work Summary: same grid as item table — col 4 = COST, col 7 = $ totals */}
                <div className="mt-4 text-xs tracking-wide w-full mb-4">
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
                  {materialLaborData.map((item) => {
                    if (item.dataType === "Material") {
                      const laborLike = isLaborLikeEntry(item);
                      const laborHours = laborLike
                        ? getWorkSummaryLaborHours(item)
                        : 0;
                      const fromFc = costFromFieldCopiesForRow(item);
                      const rowCost =
                        fromFc > 0 ? fromFc : Number(item.totalCost) || 0;
                      return (
                        <div
                          key={`ws-m-${item.jobType}-${item.source}-${item.isTaxable}`}
                          className={`${workSummaryGridClass} mt-1 capitalize items-baseline`}
                        >
                          <span className="col-span-3 min-w-0">
                            <b className="w-[200px] inline-block">
                              {item.source === "Labor"
                                ? getLaborPdfDescription({
                                    labor: item,
                                    groupItems:
                                      categorizedFieldCopies?.[0]?.items,
                                    fieldCopies,
                                  })?.toUpperCase()
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
                            {laborHours > 0 && (
                              <span className="ml-2">
                                ({laborHours.toLocaleString("en-US", {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 2,
                                })} HRS)
                              </span>
                            )}
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
                            {item.totalPrice?.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      );
                    }

                    if (
                      item.totalPrice > 0 &&
                      !shouldSkipAggregatedLaborPdfRow(
                        item,
                        categorizedFieldCopies?.[0]?.items,
                        fieldCopies
                      )
                    ) {
                      const fromFc = costFromFieldCopiesForRow(item);
                      const rowCost =
                        fromFc > 0
                          ? fromFc
                          : Number(item.totalCost) || Number(item.cost) || Number(item.totalPrice) || 0;
                      return (
                        <div
                          key={`ws-l-${item.jobType}-${item.isLaborTaxable}`}
                          className={`${workSummaryGridClass} mt-1 items-baseline`}
                        >
                          <span className="col-span-3 min-w-0">
                            <b className="w-[200px] inline-block">
                              {getLaborPdfDescription({
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
                            {getWorkSummaryLaborHours(item) > 0 && (
                              <span className="ml-2">
                                ({getWorkSummaryLaborHours(item).toLocaleString("en-US", {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 2,
                                })} HRS)
                              </span>
                            )}
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
                            {item.totalPrice?.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>

                {/* Invoice Summary */}
                <div className="">
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
                        {/* <div className="flex justify-between my-2">
                          <span>Credits</span>
                          <span>
                            <b>$</b>{" "}
                           
                            <input
                              type="text"
                              className="w-16 outline-none border-b px-1 text-end"
                              value={formData.credits}
                              onInput={(e) => {
                                const val = e.target.value.replace(
                                  /[^0-9]/g,
                                  ""
                                );
                                if (Number(val) > 10000000000) return; // Prevent setting if greater
                                setFormData({ ...formData, credits: val });
                              }}
                            />
                          </span>
                        </div> */}
                        <div className={`${workSummaryGridClass} my-2 items-baseline`}>
                          <span className="col-span-3 min-w-0 break-words">
                            Tax Credits{" "}
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
                          <span className="justify-self-end text-end tabular-nums whitespace-nowrap" />
                          <span className="min-w-0" aria-hidden />
                          <span className="min-w-0" aria-hidden />
                          <span className="justify-self-end text-end tabular-nums whitespace-nowrap">
                            <b>$</b>{" "}
                            <input
                              type="text"
                              className="w-16 outline-none border-b px-1 text-end"
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
                        <div className={`${workSummaryGridClass} my-2 items-baseline`}>
                          <span className="col-span-3 min-w-0 break-words">
                            Non Tax Credits{" "}
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
                          <span className="justify-self-end text-end tabular-nums whitespace-nowrap" />
                          <span className="min-w-0" aria-hidden />
                          <span className="min-w-0" aria-hidden />
                          <span className="justify-self-end text-end tabular-nums whitespace-nowrap">
                            <b>$</b>{" "}
                            <input
                              type="text"
                              className="w-16 outline-none border-b px-1 text-end"
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
                    <hr />
                    <div
                      className={`${workSummaryGridClass} my-2 font-semibold items-baseline uppercase`}
                    >
                      <span className="col-span-3 min-w-0">SUBTOTAL</span>
                      <span className="justify-self-end text-end tabular-nums whitespace-nowrap">
                        {workSummaryCostSubtotalDisplay > 0 ? (
                          <>
                            <b>$</b>{" "}
                            {workSummaryCostSubtotalDisplay.toLocaleString("en-US", {
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
                        {(
                          Number(materialsTotal) +
                          Number(laborTotal) -
                          (Number(formData.taxCredits) || 0) -
                          (Number(formData.nonTaxCredits) || 0)
                        ).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className="w-full">

                {formData &&
                formData.taxCredits + formData.nonTaxCredits <=
                  materialsTotal + laborTotal ? (
                  !loading ? (
                    formData && formData.taxCredits <= taxableAmount ? (
                      <div className="">
                        <div className="w-full mt-0 text-[15px]">
                          <div className="">
                            {/* {!formData.isProjectTaxable && (
                              <>
                                <div className="flex justify-between my-2">
                                  <span>Credits</span>
                                  <span>
                                    <b>$</b>{" "}
                                      {formData.credits?.toLocaleString("en-US", {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })}
                                    </span>
                                </div>
                              </>
                            )} */}
                            {/* <hr />
                            <div className="flex justify-between my-2">
                              <span>Credits</span>
                              <span>
                                <b>$</b>{" "}
                                {formData.credits?.toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                            </div> */}
                            <hr />
                            <div
                              className={`${workSummaryGridClass} my-2 items-baseline uppercase`}
                            >
                              <span className="col-span-3 min-w-0">
                                TAXABLE AMOUNT
                              </span>
                              <span className="justify-self-end text-end tabular-nums whitespace-nowrap">
                                {(() => {
                                  const costTaxable = materialLaborData.reduce((acc, it) => {
                                    if (it.dataType === "Material") {
                                      if (!taxEq(it.isTaxable, true)) return acc;
                                    } else if (it.totalPrice > 0) {
                                      if (!taxEq(it.isLaborTaxable, true)) return acc;
                                    } else {
                                      return acc;
                                    }
                                    const fromFc = costFromFieldCopiesForRow(it);
                                    const fallback = Number(it.totalCost) || 0;
                                    return acc + (fromFc > 0 ? fromFc : fallback);
                                  }, 0);
                                  return costTaxable > 0 ? (
                                    <>
                                      <b>$</b>{" "}
                                      {costTaxable.toLocaleString("en-US", {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })}
                                    </>
                                  ) : (
                                    ""
                                  );
                                })()}
                              </span>
                              <span className="min-w-0" aria-hidden />
                              <span className="min-w-0" aria-hidden />
                              <span className="justify-self-end text-end tabular-nums whitespace-nowrap">
                                <b>$</b>{" "}
                                {Number(workSummarySellTaxableDisplay).toLocaleString("en-US", {
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
                              <span className="justify-self-end text-end tabular-nums whitespace-nowrap">
                                {(() => {
                                  const costTaxable = materialLaborData.reduce((acc, it) => {
                                    if (it.dataType === "Material") {
                                      if (!taxEq(it.isTaxable, true)) return acc;
                                    } else if (it.totalPrice > 0) {
                                      if (!taxEq(it.isLaborTaxable, true)) return acc;
                                    } else {
                                      return acc;
                                    }
                                    const fromFc = costFromFieldCopiesForRow(it);
                                    const fallback = Number(it.totalCost) || 0;
                                    return acc + (fromFc > 0 ? fromFc : fallback);
                                  }, 0);
                                  const tc = Number(formData.taxCredits) || 0;
                                  const taxableBase = formData.isProjectTaxable
                                    ? Math.max(0, costTaxable - tc)
                                    : tc > costTaxable
                                      ? 0
                                      : costTaxable;
                                  return (
                                    <>
                                      <b>$</b>{" "}
                                      {((Number(taxPercent) || 0) * taxableBase / 100).toLocaleString("en-US", {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })}
                                    </>
                                  );
                                })()}
                              </span>
                              <span className="min-w-0" aria-hidden />
                              <span className="min-w-0" aria-hidden />
                              <span className="justify-self-end text-end tabular-nums whitespace-nowrap">
                                <b>$</b>{" "}
                                {Number(workSummarySalesTax).toLocaleString("en-US", {
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
                              <span className="justify-self-end text-end tabular-nums whitespace-nowrap">
                                {(() => {
                                  const costSubtotal = workSummaryCostSubtotalDisplay;
                                  const costTaxable = materialLaborData.reduce((acc, it) => {
                                    if (it.dataType === "Material") {
                                      if (!taxEq(it.isTaxable, true)) return acc;
                                    } else if (it.totalPrice > 0) {
                                      if (!taxEq(it.isLaborTaxable, true)) return acc;
                                    } else {
                                      return acc;
                                    }
                                    const fromFc = costFromFieldCopiesForRow(it);
                                    const fallback = Number(it.totalCost) || 0;
                                    return acc + (fromFc > 0 ? fromFc : fallback);
                                  }, 0);
                                  const tc = Number(formData.taxCredits) || 0;
                                  const ntc = Number(formData.nonTaxCredits) || 0;
                                  const taxableBase = formData.isProjectTaxable
                                    ? Math.max(0, costTaxable - tc)
                                    : tc > costTaxable
                                      ? 0
                                      : costTaxable;
                                  const costSalesTax = ((Number(taxPercent) || 0) * taxableBase) / 100;
                                  const costGrandTotal = costSubtotal - tc - ntc + costSalesTax;
                                  return (
                                    <>
                                      <b>$</b>{" "}
                                      {costGrandTotal.toLocaleString("en-US", {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })}
                                    </>
                                  );
                                })()}
                              </span>
                              <span className="min-w-0" aria-hidden />
                              <span className="min-w-0" aria-hidden />
                              <span className="justify-self-end text-end tabular-nums whitespace-nowrap">
                                <b>$</b>{" "}
                                {Number(workSummaryGrandTotal).toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                            </div>
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
                          <div className="">
                            <hr />
                            <div className="flex justify-between my-2">
                              <span>Taxable Amount</span>
                              <span>
                                <b>$</b>{" "}
                                {0?.toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                            </div>
                            <hr />

                            <div className="flex justify-between my-2">
                              <span>Grand Total</span>
                              <span>
                                <b>$</b>{" "}
                                {formData.isProjectTaxable
                                  ? (
                                      (taxPercent *
                                        (taxableAmount - formData.taxCredits)) /
                                        100 +
                                      (materialsTotal +
                                        laborTotal -
                                        (formData.taxCredits +
                                          formData.nonTaxCredits))
                                    )?.toLocaleString("en-US", {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })
                                  : (
                                      0 / 100 +
                                      (materialsTotal +
                                        laborTotal -
                                        (formData.taxCredits +
                                          formData.nonTaxCredits))
                                    )?.toLocaleString("en-US", {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}
                              </span>
                            </div>
                          </div>
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

                {!loading && formData && (
                  <div
                    className="w-full mt-6 text-left uppercase text-[15px] space-y-1"
                    style={{ pageBreakInside: "avoid" }}
                  >
                    <p className="mb-0">
                      BID AMOUNT:{" "}
                      <span className="tabular-nums normal-case">
                        $
                        {bidProposalGrandTotal?.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </p>
                    <p className="mb-0">
                      TOTAL MAN HOURS:{" "}
                      <span className="tabular-nums normal-case">
                        {formatHours(formData?.totalManHours)}
                      </span>
                    </p>
                    <p className="mb-0">
                      DRAINAGE HOURS:{" "}
                      <span className="tabular-nums normal-case">
                        {formatHours(jobTypeManHoursSums.drainage)}
                      </span>
                    </p>
                    <p className="mb-0">
                      ELECTRICAL HOURS:{" "}
                      <span className="tabular-nums normal-case">
                        {formatHours(jobTypeManHoursSums.electrical)}
                      </span>
                    </p>
                    <p className="mb-0">
                      HARDSCAPE HOURS:{" "}
                      <span className="tabular-nums normal-case">
                        {formatHours(jobTypeManHoursSums.hardscape)}
                      </span>
                    </p>
                    <p className="mb-0">
                      IRRIGATION HOURS:{" "}
                      <span className="tabular-nums normal-case">
                        {formatHours(jobTypeManHoursSums.irrigation)}
                      </span>
                    </p>
                    <p className="mb-0">
                      LANDSCAPE HOURS:{" "}
                      <span className="tabular-nums normal-case">
                        {formatHours(jobTypeManHoursSums.landscape)}
                      </span>
                    </p>
                    <hr className="mt-2 border-gray-300" />
                  </div>
                )}

                {/* <div className="w-full mt-16 text-[15px]">
                  <div className="">
                    <h4 className="text-lg font-semibold text-center mb-6">
                      Invoice Summary
                    </h4>
                  </div>
                  <div className="">
                    <div className="flex justify-between">
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
                    </div>
                    <hr />
                    <div className="flex justify-between my-2">
                      <span>SubTotal</span>
                      <span>
                        <b>$</b> {(materialsTotal + laborTotal)?.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                      </span>
                    </div>
                    <hr />
                    <div className="flex justify-between my-2">
                      <span>Credits</span>
                      <span>
                        <b>$</b> {formData.credits?.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                      </span>
                    </div>
                    <hr />
                    <div className="flex justify-between my-2">
                      <span>Taxable Amount</span>
                      <span>
                        <b>$</b>{" "}
                        {(
                          (taxPercent * (taxableAmount - formData.credits)) /
                          100
                        )?.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                      </span>
                    </div>
                    <hr />
                    <div className="flex justify-between my-2">
                      <span>Grand Total</span>
                      <span>
                        <b>$</b>{" "}
                        {(
                          (taxPercent * (taxableAmount - formData.credits)) /
                            100 +
                          (materialsTotal + laborTotal)
                        )?.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                      </span>
                    </div>
                  </div>
                </div> */}
              </div>
            </div>

            {formData.status !== "Delete" && (
              <div className="w-full mb-10 text-[15px] flex justify-end flex-col md:flex-row gap-4 p-4">
                <button
                  className="bg-[#00613e] text-white py-1 px-6"
                  // onClick={() => {
                  //   navigate(`/panel/office/project/field-copy/customer/${id}`);
                  // }}
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
                >
                  Create Customer Copy
                </button>
                <button
                  className={`bg-[#00613e] text-white py-1 px-6 md:mr-4 mr-0 ${
                    (formData &&
                      formData.taxCredits > taxableAmount &&
                      formData.isProjectTaxable) ||
                    materialsTotal + laborTotal <
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
                    materialsTotal + laborTotal <
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
