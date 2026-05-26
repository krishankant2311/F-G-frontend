import React, { useEffect, useMemo, useState } from "react";
import Layout from "../layout/Layout";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useTableContext } from "../../context/TableContext";
import html2pdf from "html2pdf.js";
import fng_logo from "../../assets/images/fng_logo_black.png";
import parse from "html-react-parser";
import {
  finalizeLaborSummaryRow,
  materialNameBaseForEdit,
} from "../../utils/materialReference";

export default function CustomerFieldCopyView() {
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
    projectStartDate: "",
    status: "",
    credits: 0,
    projectCompletedDate: "",
    officeCopyId: "",
    bidCopyId: "",
    billAddress: "",
    jobName: "",
    isProjectTaxable: false,
    customerType: "",
    nonTaxCredits: 0,
    nonTaxDescription: "",
    taxCredits: 0,
    taxDescription: "",
    billingName: ""
  });
  const [fieldCopies, setFieldCopies] = useState([]);
  const [jobType, setJobType] = useState("");
  const [loading, setLoading] = useState(false);
  const [laborTotal, setLaborTotal] = useState(0);
  const [fieldLaborData, SetFieldLaborData] = useState([]);
  const [materialsTotal, setMaterialsTotal] = useState(0);
  const [taxPercent, setTaxPercent] = useState(0);
  const [taxableAmount, setTaxableAmount] = useState(0);
  const [materialData, setMaterialData] = useState([]);
  const [laborData, setLaborData] = useState([]);
  const [categorizedFieldCopies, setCategorizedFieldCopies] = useState([]);
  const [documentName, setDocumentName] = useState("");
  const [address, setAddress] = useState("");
  const [materialLaborData, setMaterialLaborData] = useState([]);

  const location = useLocation();
  const data = location.state.data;

  const { id, entryDate, index } = useParams();

  const navigate = useNavigate();
  const { tableSize } = useTableContext();

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
            ? Number(g?.totalCost || 0) / Number(g.manHours)
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
    return map;
  }, [formData?.officeFieldCopy]);

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
    return map;
  }, [formData?.officeFieldCopy]);

  console.log("Data -----------", fieldLaborData, categorizedFieldCopies);

  const downloadPdf = () => {
    const element = document.getElementById("content-to-pdf");

    // Create a temporary div with the hidden content
    const tempDiv = document.createElement("div");

    // Insert the temporary div at the top of the content
    element.prepend(tempDiv);

    const fileName = documentName + ".pdf";

    const options = {
      margin: 0.3,
      filename: fileName,
      image: { type: "jpeg", quality: 0.95 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "in", format: "A4", orientation: "portrait" },
      // pagebreak: { mode: ["avoid-all", "css", "legacy"] }, // Ensures proper page breaks
      pagebreak: { mode: 'avoid-all', before: '#page2el' }
    };

    html2pdf()
      .from(element)
      .set(options)
      // .save()
      .toPdf()
      .get("pdf")
      .then((pdf) => {
        // Ensure we're on the last page
        const pageCount = pdf.internal.getNumberOfPages();
        pdf.setPage(pageCount);

        // Get page dimensions
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        // console.log("Page details", pageCount, pageWidth, pageHeight);

        // Add footer text
        pdf.setFontSize(10);
        pdf.text(
          `


Approved by: __________________  Date: ____________________


Approved by: __________________  Date: ____________________`,
          pageWidth / 30,
          pageHeight - 1.2,
          { align: "left" }
        );

        // Save the PDF with the footer added
        pdf.save(fileName);
      })
      .then(() => {
        // Ensure the temporary div is removed after the download completes
        tempDiv.remove();
      })
      .catch((error) => {
        console.error("PDF generation failed:", error);
        tempDiv.remove(); // Ensure cleanup even if an error occurs
      });
  };

  useEffect(() => {
    let taxAmount = 0;
    if (
      categorizedFieldCopies &&
      categorizedFieldCopies[0] &&
      categorizedFieldCopies[0]?.items?.length > 0
    ) {
      // console.log("ITEMS", categorizedFieldCopies[0].items)
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
        // console.log("Tax Amount index", taxAmount);
      }
    }
    // console.log("Taxable Amount Before", taxAmount);
    for (let labor of laborData) {
      if (labor.isLaborTaxable) {
        taxAmount += Number.parseFloat(labor.totalPrice);
      }
    }

    // console.log("Taxable Amount", taxAmount);

    if (formData.customerType === "Normal") {
      setTaxableAmount(Number.parseFloat(taxAmount));
    } else if (formData.customerType === "Commercial") {
      setTaxableAmount(materialsTotal + laborTotal);
    } else if (formData.customerType === "Exempt") {
      setTaxableAmount(0);
    }
  }, [categorizedFieldCopies, formData]);

  // console.log("Labor Data", laborData)

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
    getProjectById();
    getJobTypeById();
    getTaxPercentage();
    getCustomerFieldCopyData();
    getFGAddress();
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    getJobTypeById();
  }, [formData]);

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
      console.log("Server Project response", response.data.result);
      if (response.data.statusCode === 200) {
        if (!response.data.result.isProjectStarted) {
          navigate(-1);
        }
        setFormData(response.data.result);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response.message);
    }
  };

  useEffect(() => {
    let doc_name = formData?.customerName || "";
    const completedDate = formData?.projectCompletedDate
      ? convertMillisecondsToDate(formData?.projectCompletedDate)
      : "";
    const salesOrderNumber = data.uniqueId;
    const projectCode = formData?.projectCode;

    if (doc_name.includes(" ")) {
      doc_name = (
        formData?.customerName?.toUpperCase() +
        (completedDate ? "-" : "") +
        completedDate +
        "-" +
        jobType +
        "-" +
        salesOrderNumber +
        "-" +
        projectCode
      )?.replace(" ", "");
    }
    setDocumentName(doc_name);
  }, [jobType, formData]);

  function moveLaborToBottom(data) {
    return data.sort((a, b) => {
      if (a.source === "Labor" && b.source !== "Labor") return 1;
      if (a.source !== "Labor" && b.source === "Labor") return -1;
      return 0;
    });
  }

  const getCustomerFieldCopyData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/project/get-customer-copy/${id}/${entryDate}/${index}`,
        { headers: headers }
      );
      console.log("Server Customer response ", response.data.result);
      if (response.data.statusCode === 200) {
        const sortedCopies = moveLaborToBottom(
          response.data.result.customerCopiesData
        );
        let resultedCopies = [
          ...sortedCopies,
          // ...response.data.result.officeDraftCopies,
        ];

        let resultedMaterials = [];
        let fieldLabors = [];
        response.data.result.materialData.forEach((item) => {
          if (item.category !== "Labor") {
            resultedMaterials = [...resultedMaterials, item];
          } else {
            fieldLabors = [
              ...fieldLabors,
              {
                jobType: item.jobType,
                totalPrice: item.totalPrice,
                isLaborTaxable: item.isTaxable,
                dataType: "Labor",
              },
            ];
          }
        });
        resultedMaterials = categorizeMaterial(resultedMaterials);
        SetFieldLaborData(
          categorizeLabor(response.data.result.laborData || [])
        );
        let resultedLabors = [
          ...response.data.result.laborData,
          ...fieldLabors,
        ];
        resultedLabors = categorizeLabor(resultedLabors);
        // console.log("-----------------------", resultedCopies);

        setFieldCopies(resultedCopies);
        setMaterialData(resultedMaterials);
        setLaborData(resultedLabors);
        setMaterialLaborData(
          sortByJobType([...resultedMaterials, ...resultedLabors])
        );

        // setFieldCopies(response.data.result.customerCopiesData || []);
        // setMaterialData(response.data.result.materialData || []);
        // setLaborData(response.data.result.laborData || []);
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

  console.log("Material Labor Data", laborData);

  function lineItemCostSum(item) {
    if (
      item.totalCost != null &&
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

  function categorizeLabor(laborData) {
    const categorizedData = laborData.reduce((result, item) => {
      const key = `${item.jobType}-${item.isLaborTaxable}`;

      if (!result[key]) {
        result[key] = {
          jobType: item.jobType,
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
      result[key].totalPrice += item.totalPrice || 0;
      result[key].totalCost += lineItemCostSum(item);
      result[key].quantity +=
        item?.quantity != null && item?.quantity !== ""
          ? Number(item.quantity)
          : 0;
      if (
        result[key].cost === undefined &&
        item?.cost != null &&
        item?.cost !== ""
      ) {
        result[key].cost = Number(item.cost);
      }
      if (
        (!result[key].size || String(result[key].size).trim() === "") &&
        (item?.size || item?.measure)
      ) {
        result[key].size = item?.size || item?.measure;
      }
      if (
        result[key].price === undefined &&
        item?.price != null &&
        item?.price !== ""
      ) {
        result[key].price = Number(item.price);
      }
      if (
        result[key].markup === undefined &&
        item?.markup != null &&
        item?.markup !== ""
      ) {
        result[key].markup = Number(item.markup);
      }
      if (
        result[key].markUp === undefined &&
        item?.markUp != null &&
        item?.markUp !== ""
      ) {
        result[key].markUp = Number(item.markUp);
      }
      return result;
    }, {});

    return Object.values(categorizedData);
  }

  const getPdfItemDisplayFields = (item) => {
    if (item?.source === "Labor") {
      const row = finalizeLaborSummaryRow(item);
      return {
        qty: row.quantity,
        unitCostVal: Number(row.cost) || 0,
        displayPrice: Number(row.price) || 0,
        markupVal: row.markup ?? row.markUp ?? null,
        totalVal: Number(row.totalPrice) || 0,
      };
    }
    const refUpper = String(item?.reference || "").toUpperCase();
    const isLaborItem = refUpper.includes("LABOR");
    const isContractorLabor =
      isLaborItem &&
      (refUpper.includes("(CONTRACTOR)") || refUpper.includes("CONTRACTOR"));
    const qty = Number(item?.quantity || 0);
    const unitCostVal =
      item?.cost != null && item?.cost !== "" ? Number(item.cost) : 0;
    const priceVal =
      item?.price != null && item?.price !== "" ? Number(item.price) : null;
    const totalVal =
      item?.totalPrice != null && item?.totalPrice !== ""
        ? Number(item.totalPrice)
        : null;
    const displayPrice = isContractorLabor
      ? priceVal ?? (unitCostVal > 0 ? unitCostVal : null)
      : priceVal ??
        (qty > 0 && totalVal != null && totalVal > 0 ? totalVal / qty : null);
    const markupVal = item?.markup ?? item?.markUp ?? null;
    return {
      qty,
      unitCostVal,
      displayPrice,
      markupVal,
      totalVal: totalVal ?? 0,
    };
  };

  const getPdfAggregateLaborDisplayFields = (labor) => {
    const jt = String(labor?.jobType || "").trim().toUpperCase();
    const hourly = Number(laborHourlyRateByJobType?.[jt] || 0);
    const manHours = Number(laborManHoursByJobType?.[jt] || 0);
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
        : manHours > 0
          ? manHours
          : displayPrice > 0 && Number(labor?.totalPrice || 0) > 0
            ? Number(labor.totalPrice) / displayPrice
            : hourly > 0 && displayCost > 0
              ? displayCost / hourly
              : 0;
    return {
      qty,
      displayCost,
      displayPrice,
      markupVal: labor?.markup ?? labor?.markUp ?? null,
      totalPrice: Number(labor?.totalPrice || 0),
    };
  };

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
      const category = item.source === "Labor" ? "Labor" : "F&G/Other/LumpSum";
      const key = `${category}_${item.jobType}_${item.isTaxable}`;

      if (!result[key]) {
        result[key] = {
          category,
          jobType: item.jobType,
          totalPrice: 0,
          isTaxable: item.isTaxable,
          source: item.source,
          dataType: item.dataType,

          cost: 0,
          markup: 0,
          quantity: 0,
        };
      }

      const qty = item.quantity || 1;

      result[key].totalPrice += item.totalPrice || 0;
      result[key].quantity += qty;

      if (item.cost) {
        result[key].cost += Number(item.cost) * qty;
      }

      if (item.markUp || item.markup) {
        result[key].markup += Number(item.markUp || item.markup);
      }

      return result;
    }, {});

    return Object.values(categorizedData);
  }

  // function categorizeMaterial(materialData) {
  //   const categorizedData = materialData.reduce((result, item) => {
  //     // Determine the category based on source
  //     const category = item.source === "Labor" ? "Labor" : "F&G/Other/LumpSum";

  //     // Create a unique key using category & jobType
  //     const key = `${category}_${item.jobType}_${item.isTaxable}`;

  //     // Check if the category and jobType already exist in the result object
  //     if (!result[key]) {
  //       result[key] = {
  //         category, // Store the category
  //         jobType: item.jobType,
  //         totalPrice: 0,
  //         isTaxable: item.isTaxable,
  //         source: item.source,
  //         dataType: item.dataType,

  //       };
  //     }

  //     // Sum up the totalPrice for the current category & jobType
  //     result[key].totalPrice += item.totalPrice;

  //     return result;
  //   }, {});

  //   // Convert the result object to an array format
  //   return Object.values(categorizedData);
  // }

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
      // console.log("abhinandan",response)
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
      console.log("Server Tax Percentage response ", response.data.result);
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
  //         cost: item.cost || 0,
  //         markup: item.markUp || item.markup || 0,
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
    const num = (v) => {
      const n = Number.parseFloat(v);
      return Number.isFinite(n) ? n : 0;
    };

    fieldCopies.forEach((item) => {
      if (item.source === "Labor") {
        const key = `${item.reference}-${item.measure}-${item.price}`;
        if (!summary[key]) {
          summary[key] = {
            source: item.source,
            isTaxable: item.isTaxable,
            reference: item.reference,
            size: item.measure,
            quantity: 0,
            price: item.price,
            cost: 0,
            markup: 0,
            markUp: 0,
            totalPrice: 0,
          };
        }
        const qty = item.quantity || 1;
        summary[key].quantity += qty;
        summary[key].totalPrice += item.totalPrice || 0;
        if (item.cost) {
          summary[key].cost += Number(item.cost) * qty;
        }
        if (
          (summary[key].markup === 0 || summary[key].markup === undefined) &&
          (item.markUp != null || item.markup != null)
        ) {
          summary[key].markup = Number(item.markUp ?? item.markup);
          summary[key].markUp = summary[key].markup;
        }
        return;
      }

      const baseMaterialName = materialNameBaseForEdit(
        String(item.reference || ""),
        item.vendorName
      ).trim();
      const key = baseMaterialName.toUpperCase();
      if (!key) return;

      const qty = num(item.quantity);
      const unitPrice = num(item.price);
      const unitCost =
        item.cost !== undefined && item.cost !== null && item.cost !== ""
          ? num(item.cost)
          : 0;
      const markupRaw = item.markUp ?? item.markup;

      if (!summary[key]) {
        summary[key] = {
          source: item.source,
          isTaxable: item.isTaxable,
          reference: baseMaterialName,
          size: item.measure,
          quantity: 0,
          price: 0,
          cost: 0,
          markup: 0,
          markUp: 0,
        };
      }

      const row = summary[key];
      row.quantity += qty;

      if (unitPrice > row.price) {
        row.price = unitPrice;
        if (markupRaw != null && markupRaw !== "") {
          row.markup = num(markupRaw);
          row.markUp = row.markup;
        }
      }

      if (unitCost > row.cost) {
        row.cost = unitCost;
      }

      if (
        (row.markup === 0 || row.markup === undefined) &&
        markupRaw != null &&
        markupRaw !== ""
      ) {
        row.markup = num(markupRaw);
        row.markUp = row.markup;
      }

      row.isTaxable = row.isTaxable || item.isTaxable;
      if (!row.size && item.measure) {
        row.size = item.measure;
      }
    });

    return Object.values(summary).map((row) => {
      if (row.source === "Labor") {
        return finalizeLaborSummaryRow(row);
      }
      const qty = num(row.quantity);
      const unitPrice = num(row.price);
      const unitCost = num(row.cost);
      const totalPrice =
        qty > 0 && unitPrice > 0
          ? Math.round(qty * unitPrice * 100) / 100
          : 0;
      return {
        ...row,
        cost: unitCost,
        totalPrice,
      };
    });
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
      console.log("Server F&G Address response ", response.data.result);
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

    // Add 1 day
    date.setDate(date.getDate() + 1);

    // Extract month, day, and year
    const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed
    const day = String(date.getDate()).padStart(2, "0");
    const year = String(date.getFullYear()).slice(-4); // Get the last 2 digits of the year

    // Return in MM/DD/YY format
    return `${month}/${day}/${year}`;
  }

  // const handleInvoiceJobType = (jobType) => {
  //   if (["professional", "pick up/delivery"].includes(jobType.toLowerCase())) {
  //     return "SERVICE";
  //   } else if (jobType.toLowerCase() === "equipment rental") {
  //     return "";
  //   } else if (jobType.toLowerCase() === "reimbursement total") {
  //     return "";
  //   }else if (jobType.includes("Lump Sum")) {
  //     return "";
  //   } else {
  //     return "MATERIAL";
  //   }
  // };


  const handleInvoiceJobType = (jobType) => {
    if (["professional", "pick up/delivery"].includes(jobType.toLowerCase())) {
      return "SERVICE";
    } else if (jobType.toLowerCase() === "equipment rental") {
      return "";
    } else if (jobType.toLowerCase() === "reimbursement total") {
      return "";
    } else if (jobType.includes("Lump Sum")) {
      return "";
    } else if (jobType.toLowerCase() === "equipment fees") {
      return "LUMP SUM"; // Sirf "LUMP SUM" return karo
    } else {
      return "MATERIAL";
    }
  };



  function formatAddress(address) {
    return address.replace(/(\d+)/, "\n$1");
  }

  // console.log("Credits Formdata", materialData, laborData);

  return (
    <Layout>
      <ToastContainer />
      <div
        className={`${tableSize === 250 ? "md:ml-[250px]" : "md:ml-[90px]"}`}
      >
        <div className="lg:p-10 p-3">
          <div className="card">
            <div className="card-header bg-[#00613e] text-white">
              <h3 className="card-title">
                <button
                  onClick={() => {
                    navigate(-1);
                  }}
                >
                  <i className="fa fa-arrow-left mr-2"></i>
                </button>{" "}
                View Customer Copy
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
                      // style={{pageBreakInside:"avoid"}}
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

            {/* Download Copy */}
            <div
              className=""
              style={{
                display: "none",
              }}
            >
              <div className="p-0 mb-20" id="content-to-pdf">
                {/* Project Data */}
                <div className="flex flex-row gap-2 justify-between mt-1">
                  <div className="flex flex-col w-1/3 md:w-[280px]">
                    <div className="p-0 capitalize">
                      <p className="text-xs font-medium">
                        <span className="border-b border-black pb-[7px]">
                          PROJECT LOCATION
                        </span>
                      </p>
                    </div>
                    {/* {formData?.customerType === "Commercial" && (
                      <div className="p-0 mt-1">
                        <p className="text-xs break-words capitalize">
                          {formData?.customerName?.toUpperCase()}
                        </p>
                      </div>
                    )} */}
                    <div className="p-0 mt-0.5">
                      <p className="text-xs break-words capitalize">
                        {formData?.customerName?.toUpperCase()}
                      </p>
                    </div>
                    <div className="p-0 capitalize">
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
                    <div className="flex justify-center w-full">
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
                        className="text-xs break-words p-0 pb-2 capitalize leading-4"
                        style={{ fontFamily: "Source Sans Pro" }}
                      >
                        {address}
                      </pre>
                    </div>
                    <div className="p-0">
                      <p className="text-xs break-words">{data.uniqueId}</p>
                    </div>
                    <div className="p-0">
                      {/* <h6 className="font-bold text-[15px]">Project Code</h6> */}
                      {formData?.projectCompletedDate && (
                        <p className="text-xs break-words">
                          {convertMillisecondsToDate(
                            formData.projectCompletedDate
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
                <div className="px-0.5 mt-8">
                  <h6 className="font-semibold text-[13px] tracking-wide capitalize">
                    <span className="font-semibold text-[13px] tracking-wide capitalize pb-[7px] border-b border-black">
                      {jobType?.toUpperCase()} SERVICE
                    </span>
                    {formData.jobName && (
                      <span className="font-normal text-xs capitalize ml-2">
                        : {formData.jobName?.toUpperCase()}
                      </span>
                    )}
                  </h6>
                  <p className="text-xs break-words mt-1">
                    {parse(formData.description)}
                  </p>
                </div>

                {/* Field Copies */}
                <div className="w-full mt-2 text-[15px] overflow-x-auto pt-2 pb-4">
                  {categorizedFieldCopies.length > 0 || laborData.length > 0 ? (
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
                            <col style={{ width: "34%" }} />
                            <col style={{ width: "9%" }} />
                            <col style={{ width: "9%" }} />
                            <col style={{ width: "12%" }} />
                            <col style={{ width: "10%" }} />
                            <col style={{ width: "12%" }} />
                            <col style={{ width: "14%" }} />
                          </colgroup>
                          <thead>
                            <tr>
                              <th className="text-xs" style={{ textAlign: "left" }}>
                                <span className="relative -top-1.5">DESCRIPTION</span>
                              </th>
                              <th className="text-xs" style={{ textAlign: "center" }}>
                                <span className="relative -top-1.5">SIZE</span>
                              </th>
                              <th className="text-xs" style={{ textAlign: "center" }}>
                                <span className="relative -top-1.5">QUANTITY</span>
                              </th>
                              <th className="text-xs" style={{ textAlign: "right" }}>
                                <span className="relative -top-1.5">COST</span>
                              </th>
                              <th className="text-xs" style={{ textAlign: "right" }}>
                                <span className="relative -top-1.5">MARKUP</span>
                              </th>
                              <th className="text-xs" style={{ textAlign: "right" }}>
                                <span className="relative -top-1.5">PRICE</span>
                              </th>
                              <th className="text-xs" style={{ textAlign: "right" }}>
                                <span className="relative -top-1.5">TOTAL</span>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {group?.items?.map((item, idx) => {
                              const d = getPdfItemDisplayFields(item);
                              return (
                                <tr key={`pdf-item-${idx}`}>
                                  <td className="text-xs w-[400px] pr-2" style={{ textAlign: "left" }}>
                                    {item?.reference?.toUpperCase()}
                                  </td>
                                  <td className="text-xs" style={{ textAlign: "center" }}>
                                    {item?.size || ""}
                                  </td>
                                  <td className="text-xs" style={{ textAlign: "center" }}>
                                    {d.qty > 0 ? d.qty : ""}
                                  </td>
                                  <td className="text-xs" style={{ textAlign: "right" }}>
                                    {d.unitCostVal > 0
                                      ? d.unitCostVal.toLocaleString("en-US", {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        })
                                      : ""}
                                  </td>
                                  <td className="text-xs" style={{ textAlign: "right" }}>
                                    {d.markupVal !== null &&
                                    d.markupVal !== undefined &&
                                    d.markupVal !== ""
                                      ? Number(d.markupVal).toLocaleString("en-US", {
                                          minimumFractionDigits: 0,
                                          maximumFractionDigits: 2,
                                        }) + "%"
                                      : ""}
                                  </td>
                                  <td className="text-xs" style={{ textAlign: "right" }}>
                                    {d.displayPrice != null &&
                                    !Number.isNaN(d.displayPrice) &&
                                    d.displayPrice > 0
                                      ? d.displayPrice.toLocaleString("en-US", {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        })
                                      : ""}
                                  </td>
                                  <td className="text-xs" style={{ textAlign: "right" }}>
                                    {d.totalVal > 0
                                      ? d.totalVal.toLocaleString("en-US", {
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
                              .filter((labor) => {
                                const existsInGroupItems = group?.items?.some(
                                  (item) =>
                                    item?.reference?.toUpperCase() ===
                                    `${labor.jobType} LABOR`.toUpperCase()
                                );
                                return !existsInGroupItems;
                              })
                              .map((labor, idx) => {
                                const d = getPdfAggregateLaborDisplayFields(labor);
                                return (
                                  <tr key={`pdf-labor-${idx}`}>
                                    <td className="text-xs" style={{ textAlign: "left" }}>
                                      {labor.jobType?.toUpperCase()} LABOR
                                    </td>
                                    <td className="text-xs" style={{ textAlign: "center" }}>
                                      {labor?.size || ""}
                                    </td>
                                    <td className="text-xs" style={{ textAlign: "center" }}>
                                      {d.qty > 0
                                        ? Number.isInteger(d.qty)
                                          ? String(d.qty)
                                          : d.qty.toLocaleString("en-US", {
                                              minimumFractionDigits: 2,
                                              maximumFractionDigits: 2,
                                            })
                                        : ""}
                                    </td>
                                    <td className="text-xs" style={{ textAlign: "right" }}>
                                      {d.displayCost > 0
                                        ? d.displayCost.toLocaleString("en-US", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })
                                        : ""}
                                    </td>
                                    <td className="text-xs" style={{ textAlign: "right" }}>
                                      {d.markupVal !== null &&
                                      d.markupVal !== undefined &&
                                      d.markupVal !== ""
                                        ? Number(d.markupVal).toLocaleString("en-US", {
                                            minimumFractionDigits: 0,
                                            maximumFractionDigits: 2,
                                          }) + "%"
                                        : ""}
                                    </td>
                                    <td className="text-xs" style={{ textAlign: "right" }}>
                                      {d.displayPrice > 0
                                        ? d.displayPrice.toLocaleString("en-US", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })
                                        : ""}
                                    </td>
                                    <td className="text-xs" style={{ textAlign: "right" }}>
                                      {d.totalPrice > 0
                                        ? d.totalPrice.toLocaleString("en-US", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })
                                        : ""}
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
                    INVOICE SUMMARY
                  </h4>
                </div>

                {/* Compiled data by Job Type */}
                {/* <div className="mt-1 text-xs">
                  {materialData.map((material) => {
                    return (
                      <div className="flex justify-between mt-1">
                        <span>
                          <b className="w-[200px] inline-block">
                            {material.jobType?.toUpperCase()}{" "}
                            {material.source === "Labor"
                              ? "LABOR"
                              : handleInvoiceJobType(material.jobType)}
                          </b>
                          <b>
                            {formData?.customerType === "Normal"
                              ? ["Labor", "Other"].includes(material.source)
                                ? material.isTaxable
                                  ? "RT"
                                  : "RNT"
                                : ["Lump Sum"].includes(material.source)
                                ? `${
                                    material.isTaxable ? "RT" : "RNT"
                                  } (SALES TAX PAID ON MATERIAL)`
                                : "RT"
                              : formData.customerType === "Commercial"
                              ? "CT"
                              : formData?.customerType?.toUpperCase()}
                          </b>
                        </span>
                        <span>
                          <b>$</b>{" "}
                          <span className="inline-block w-[80px] text-end">
                            {material.totalPrice?.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </span>
                      </div>
                    );
                  })}
                  {laborData
                    .filter((labor) => labor.totalPrice !== 0)
                    .map((labor) => {
                      return (
                        <div className="flex justify-between mt-1">
                          <span>
                            <b className="w-[200px] inline-block">
                              {labor.jobType?.toUpperCase()} LABOR
                            </b>
                            <b>
                              {formData?.customerType === "Normal"
                                ? labor.isLaborTaxable
                                  ? "RT"
                                  : "RNT"
                                : formData.customerType === "Commercial"
                                ? "CT"
                                : formData?.customerType?.toUpperCase()}
                            </b>
                          </span>
                          <span>
                            <b>$</b>{" "}
                            <span className="inline-block w-[80px] text-end">
                              {labor.totalPrice?.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </span>
                        </div>
                      );
                    })}
                </div> */}

                <div className="mt-1 text-xs">
                  {materialLaborData.map((item) => {
                    if (item.dataType === "Material") {
                      return (
                        <div className="flex justify-between mt-1">
                          <span>
                            {/* <b className="w-[200px] inline-block">
                              {item.jobType?.toUpperCase()}{" "}
                              {item.source === "Labor"
                                ? "LABOR"
                                : handleInvoiceJobType(item.jobType)}
                            </b> */}

                            <b className="w-[200px] inline-block" style={{ whiteSpace: "pre" }}>
                              {item.source === "Labor" ? (
                                <>
                                  {item.jobType?.toUpperCase()}{" "}LABOR
                                </>
                              ) : item.jobType?.toLowerCase() === "equipment fees" ? (
                                "EQUIPMENT LUMP SUM"
                              ) : (
                                <>
                                  {item.jobType?.toUpperCase()}{" "}{handleInvoiceJobType(item.jobType)}
                                </>
                              )}
                            </b>
                            {/* <b classNamee="w-[200px] inline-block">
                              
                              {item.source === "Labor"
                                ? `${item.jobType?.toUpperCase()} LABOR`
                                : item.jobType?.toLowerCase() === "equipment fees"
                                  ? "EQUIPMENT LUMP SUM"
                                  : `${item.jobType?.toUpperCase()} ${handleInvoiceJobType(item.jobType)}`
                              }
                            </b> */}
                            <b>
                              {formData?.customerType === "Normal"
                                ? ["Labor", "Other"].includes(item.source)
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
                          <span>
                            <b>$</b>{" "}
                            <span className="inline-block w-[80px] text-end">
                              {item.totalPrice?.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </span>
                        </div>
                      );
                    } else {
                      if (item.totalPrice > 0) {
                        return (
                          <div className="flex justify-between mt-1">
                            <span>
                              <b className="w-[200px] inline-block">
                                {item.jobType?.toUpperCase()} LABOR
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
                            <span>
                              <b>$</b>{" "}
                              <span className="inline-block w-[80px] text-end">
                                {item.totalPrice?.toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                            </span>
                          </div>
                        );
                      }
                    }
                  })}
                </div>

                {/* Invoice Summary */}
                <div className="w-full mt-5 text-[15px]">
                  <div className="text-xs">
                    {true && (
                      <>
                        <div className="flex justify-between my-2">
                          <span>
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
                                  ? formData.nonTaxDescription.slice(0, 50) +
                                  " ..."
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
                    <div className="flex justify-between my-1 mb-2">
                      <span>SUBTOTAL</span>
                      <span>
                        <b>$</b>{" "}
                        <span className="inline-block w-[80px] text-end">
                          {(
                            materialsTotal +
                            laborTotal -
                            (formData.taxCredits + formData.nonTaxCredits)
                          )?.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
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
                    <hr />
                    <div className="flex justify-between my-1 mb-2">
                      <span>TAXABLE AMOUNT</span>
                      <span>
                        <b>$</b>{" "}
                        {formData.isProjectTaxable ? (
                          <span className="inline-block w-[80px] text-end">
                            {(
                              taxableAmount - formData.taxCredits
                            )?.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        ) : (
                          <span className="inline-block w-[80px] text-end">
                            {formData.taxCredits > taxableAmount
                              ? 0
                              : taxableAmount?.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                          </span>
                        )}
                      </span>
                    </div>
                    <hr />
                    <div className="flex justify-between my-1 mb-2">
                      <span>SALES TAX</span>
                      <span>
                        <b>$</b>{" "}
                        <span className="inline-block w-[80px] text-end">
                          {formData.isProjectTaxable ? (
                            (
                              (taxPercent *
                                (taxableAmount - formData.taxCredits)) /
                              100
                            )?.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })
                          ) : (
                            <span className="inline-block w-[80px] text-end">
                              {formData.taxCredits > taxableAmount
                                ? 0
                                : (
                                  (taxPercent * taxableAmount) /
                                  100
                                )?.toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                            </span>
                          )}
                        </span>
                      </span>
                    </div>
                    <hr />
                    <div className="flex justify-between my-1">
                      <span>GRAND TOTAL</span>
                      <span>
                        <b>$</b>{" "}
                        <span className="inline-block w-[80px] text-end">
                          <span className="border-b border-black pb-[7px]">
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
                                (taxPercent * taxableAmount) / 100 +
                                (materialsTotal +
                                  laborTotal -
                                  (formData.taxCredits +
                                    formData.nonTaxCredits))
                              )?.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                          </span>
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Real Copy */}
            <div className="mt-6 p-4 ">
              {/* Project Data */}
              <div className="flex flex-col md:flex-row gap-6 justify-around">
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
                  {formData && formData?.jobAddress && (
                    <div className="p-2">
                      <h6 className="font-bold text-[17px]">Job Address</h6>
                      <p>{formData?.jobAddress}</p>
                    </div>
                  )}
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

              {/* Field Copies */}
              <div className="w-full mt-10 text-[15px] overflow-x-auto">
                {!loading ? (
                  categorizedFieldCopies.length > 0 || laborData.length > 0 ? (
                    categorizedFieldCopies.map((group, index) => (
                      <div key={index} className="mb-8">
                        <h4 className="font-bold text-lg mb-3">
                          {group.category}
                        </h4>
                        <table className="w-full table table-striped text-start">
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
                            {group.items.map((item, idx) => (
                              <tr key={idx}>
                                {/* <td>{item.source}</td> */}
                                <td className="w-[400px] pr-2">
                                  {item.reference?.toUpperCase()}
                                </td>
                                <td>{item.size}</td>
                                <td>{item.quantity ? item.quantity : ""}</td>
                                <td>
                                  {item.cost != null && item.cost !== ""
                                    ? Number(item.cost).toLocaleString("en-US", {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })
                                    : ""}
                                </td>
                                <td>
                                  {(() => {
                                    const markupVal = item?.markup ?? item?.markUp ?? null;
                                    if (markupVal === null || markupVal === undefined || markupVal === "") return "";
                                    return Number(markupVal).toLocaleString("en-US", {
                                      minimumFractionDigits: 0,
                                      maximumFractionDigits: 2,
                                    }) + "%";
                                  })()}
                                </td>
                                <td>
                                  {(() => {
                                    const d = getPdfItemDisplayFields(item);
                                    return d.displayPrice != null &&
                                      !Number.isNaN(d.displayPrice) &&
                                      d.displayPrice > 0
                                      ? d.displayPrice.toLocaleString("en-US", {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        })
                                      : "";
                                  })()}
                                </td>
                                <td>
                                  {item.totalPrice?.toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </td>
                              </tr>
                            ))}
                            {fieldLaborData
                              .filter((labor) => labor.totalPrice !== 0)
                              .filter((labor) => {
                                const existsInGroupItems = group?.items?.some(
                                  (item) =>
                                    item?.reference?.toUpperCase() ===
                                    `${labor.jobType} LABOR`.toUpperCase()
                                );
                                return !existsInGroupItems;
                              })
                              .map((labor, idx) => {
                                const jt = String(labor?.jobType || "")
                                  .trim()
                                  .toUpperCase();
                                const hourly = Number(
                                  laborHourlyRateByJobType?.[jt] || 0
                                );
                                const manHours = Number(
                                  laborManHoursByJobType?.[jt] || 0
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
                                    : manHours > 0
                                      ? manHours
                                      : displayPrice > 0 &&
                                          Number(labor?.totalPrice || 0) > 0
                                        ? Number(labor.totalPrice) / displayPrice
                                        : hourly > 0 && displayCost > 0
                                          ? displayCost / hourly
                                          : 0;
                                return (
                                  <tr key={`field-labor-${idx}`}>
                                    <td className="w-[400px] pr-2">
                                      <p className="m-0">
                                        {labor.jobType} LABOR
                                      </p>
                                    </td>
                                    <td>{labor?.size || ""}</td>
                                    <td>
                                      {qty > 0
                                        ? Number.isInteger(qty)
                                          ? String(qty)
                                          : qty.toLocaleString("en-US", {
                                              minimumFractionDigits: 2,
                                              maximumFractionDigits: 2,
                                            })
                                        : ""}
                                    </td>
                                    <td>
                                      {displayCost > 0
                                        ? displayCost.toLocaleString("en-US", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })
                                        : ""}
                                    </td>
                                    <td>
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
                                    <td>
                                      {displayPrice > 0
                                        ? displayPrice.toLocaleString("en-US", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })
                                        : ""}
                                    </td>
                                    <td>
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
                  Invoice Summary
                </h4>
              </div>

              {/* Compiled data by Job Type */}
              <div className="mt-6 mb-4">
                {materialData.map((material) => {
                  return (
                    <div className="flex justify-between mt-1 capitalize">
                      <span>
                        {/* <b>
                          {material.jobType?.toUpperCase()}{" "}
                          {material.source === "Labor"
                            ? "LABOR"
                            : handleInvoiceJobType(material.jobType)}
                        </b> */}
                        <b style={{ whiteSpace: "pre" }}>
                          {material.source === "Labor" ? (
                            <>
                              {material.jobType?.toUpperCase()}{" "}LABOR
                            </>
                          ) : material.jobType?.toLowerCase() === "equipment fees" ? (
                            "EQUIPMENT LUMP SUM"
                          ) : (
                            <>
                              {material.jobType?.toUpperCase()}{" "}{handleInvoiceJobType(material.jobType)}
                            </>
                          )}
                        </b>
                        {/* <b>
                          {material.source === "Labor"
                            ? `${material.jobType?.toUpperCase()} LABOR`
                            : material.jobType?.toLowerCase() === "equipment fees"
                              ? "EQUIPMENT LUMP SUM"
                              : `${material.jobType?.toUpperCase()} ${handleInvoiceJobType(material.jobType)}`
                          }
                        </b> */}
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
                {/* {laborData
                  .filter((labor) => labor.totalPrice !== 0)
                  .map((labor) => {
                    return (
                      <div className="flex justify-between mt-1">
                        <span>
                          <b>{labor.jobType} Labor</b>
                        </span>
                        <span>
                          <b>$</b> {labor.totalPrice?.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                        </span>
                      </div>
                    );
                  })} */}
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
                              const val = e.target.value.replace(/[^0-9]/g, "");

                              if (Number(val) > 10000000000) return; // Prevent setting if greater
                              setFormData({ ...formData, credits: val });
                            }}
                          />
                        </span>
                      </div> */}
                      <div className="flex justify-between my-2">
                        <span>
                          Tax Credits{" "}
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
                          <input
                            type="text"
                            className="w-16 outline-none border-b px-1 text-end"
                            value={formData.taxCredits}
                            onInput={(e) => {
                              let val = e.target.value.replace(/[^0-9]/g, "");

                              // If input is empty, default to "0"
                              val = val === "" ? "0" : val;

                              if (Number(val) > 10000000000) return; // Prevent setting if greater
                              setFormData({
                                ...formData,
                                taxCredits: Number.parseFloat(val),
                              });
                            }}
                          />
                        </span>
                      </div>
                      <div className="flex justify-between my-2">
                        <span>
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
                        <span>
                          <b>$</b>{" "}
                          <input
                            type="text"
                            className="w-16 outline-none border-b px-1 text-end"
                            value={formData.nonTaxCredits}
                            onInput={(e) => {
                              let val = e.target.value.replace(/[^0-9]/g, "");
                              // If input is empty, default to "0"
                              val = val === "" ? "0" : val;
                              if (Number(val) > 10000000000) return; // Prevent setting if greater
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
                  {(() => {
                    const items = categorizedFieldCopies?.[0]?.items ?? [];
                    const totalCost = items.reduce((s, i) => {
                      if (i.source === "Labor") {
                        return s + (Number(i.cost) || 0);
                      }
                      return (
                        s + (Number(i.quantity) || 0) * (Number(i.cost) || 0)
                      );
                    }, 0);
                    const subtotalVal =
                      (materialsTotal || 0) +
                      (laborTotal || 0) -
                      (Number(formData?.taxCredits) || 0) -
                      (Number(formData?.nonTaxCredits) || 0);
                    const totalMarkupDollars = totalCost > 0 ? subtotalVal - totalCost : 0;
                    const markupPercent = totalCost > 0 && totalMarkupDollars >= 0 ? (totalMarkupDollars / totalCost) * 100 : null;
                    return (
                      <>
                        <div className="flex justify-between my-2">
                          <span>Cost</span>
                          <span>
                            <b>$</b>{" "}
                            {totalCost.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                        <div className="flex justify-between my-2">
                          <span>Markup</span>
                          <span>
                            {markupPercent != null ? (
                              <>
                                {markupPercent.toLocaleString("en-US", {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 2,
                                })}
                                %
                              </>
                            ) : (
                              ""
                            )}
                          </span>
                        </div>
                      </>
                    );
                  })()}
                  <hr />

                  <div className="flex justify-between my-2">
                    <span>SubTotal</span>
                    <span>
                      <b>$</b>{" "}
                      {(
                        materialsTotal +
                        laborTotal -
                        (formData.taxCredits + formData.nonTaxCredits)
                      )?.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <hr />
                </div>
              </div>

              {formData &&
                formData.taxCredits + formData.nonTaxCredits <=
                materialsTotal + laborTotal ? (
                !loading ? (
                  formData && formData.taxCredits <= taxableAmount ? (
                    <div className="">
                      {/* <div className="flex justify-between my-2">
                                <span>Credits</span>
                                <span>
                                  <b>$</b>{" "}
                                  {formData.credits?.toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </span>
                              </div> */}
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
                      <hr />
                      <div className="flex justify-between my-2">
                        <span>Taxable Amount</span>
                        <span>
                          <b>$</b>{" "}
                          {formData.isProjectTaxable
                            ? (
                              taxableAmount - formData.taxCredits
                            )?.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })
                            : taxableAmount?.toLocaleString("en-US", {
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
                          {formData.isProjectTaxable
                            ? (
                              (taxPercent *
                                (taxableAmount - formData.taxCredits)) /
                              100
                            )?.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })
                            : (
                              (taxPercent * taxableAmount) /
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
                              (taxPercent * taxableAmount) / 100 +
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
                            <span>Sales Tax</span>
                            <span>
                              <b>$</b>{" "}
                              {(0 / 100)?.toLocaleString("en-US", {
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

              <hr />
            </div>

            <div className="w-full mb-10 text-[15px] flex justify-end flex-col md:flex-row gap-4 p-6">
              <button
                className={`bg-[#00613e] text-white py-1 px-6 md:mr-3 mr-0 ${(formData &&
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
              // onClick={downloadPdf}
              >
                Download
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
