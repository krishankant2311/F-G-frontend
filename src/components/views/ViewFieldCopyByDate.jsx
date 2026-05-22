import React, { useEffect, useState } from "react";
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
      // COST = per-unit cost × quantity (sirf item.cost se, Office Copy jaisa)
      if (item.cost !== null && item.cost !== undefined && item.cost !== "" && Number(item.cost) > 0) {
        const qty = Number(item.quantity || 1);
        const unitCost = Number(item.cost);
        calculatedCost += unitCost * qty;
        hasValidCost = true;
      }
    });

    // Work Summary MARKUP = weighted avg percentage (Office/Customer Copy jaisa)
    const subtotal = (materialsTotal || 0) + (laborTotal || 0) - (Number(formData?.taxCredits) || 0) - (Number(formData?.nonTaxCredits) || 0);
    const markupDollars = hasValidCost && subtotal >= 0 && calculatedCost > 0 ? subtotal - calculatedCost : 0;
    const calculatedMarkup = calculatedCost > 0 && markupDollars >= 0 ? (markupDollars / calculatedCost) * 100 : null;

    setCost(hasValidCost ? calculatedCost : null);
    setMarkup(calculatedMarkup);
  }, [fieldCopies, materialsTotal, laborTotal, formData?.taxCredits, formData?.nonTaxCredits]);

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
  }, [categorizedFieldCopies, formData]);

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
          isTaxable: item.isTaxable,
          source: item.source,
          dataType: item.dataType,
        };
      }

      // Sum up the totalPrice for the current category & jobType
      result[key].totalPrice += item.totalPrice;

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
      summary[key].totalCost += Number(item.totalCost || item.cost || 0);
      if (summary[key].cost === undefined && item.cost !== undefined && item.cost !== null) {
        summary[key].cost = Number(item.cost);
      }
      if ((summary[key].markup === undefined || summary[key].markUp === undefined) && (item.markup != null || item.markUp != null)) {
        summary[key].markup = Number(item.markup ?? item.markUp);
        summary[key].markUp = Number(item.markUp ?? item.markup);
      }
    });

    return Object.values(summary);
  };
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
              {categorizedFieldCopies.length > 0 || laborData.length > 0 ? (
                categorizedFieldCopies.map((group, index) => (
                  <div key={index} className="mb-0">
                    {/* <h4 className="font-bold text-[15px] mb-3">
                            {group.category}
                          </h4> */}
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
                        {group &&
                          group.items &&
                          group.items.length > 0 &&
                          group.items.map((item, idx) => (
                            <tr key={idx}>
                              {/* <td className="text-xs">{item?.source}</td> */}
                              <td className="text-xs pr-2">
                                {item?.reference?.toUpperCase()}
                              </td>
                              <td className="text-xs">
                                {item?.vendorName?.toUpperCase()}
                              </td>
                              <td className="text-xs">{item?.size}</td>
                              <td className="text-xs pl-4">
                                {item?.quantity ? item.quantity : ""}
                              </td>
                              <td className="text-xs">
                                {/* Cost = cost × quantity (Office Copy jaisa - sirf item.cost se) */}
                                {(() => {
                                  if (item?.cost == null || item?.cost === "" || Number(item?.cost) <= 0) return "";
                                  const qty = Number(item?.quantity || 1);
                                  const lineCost = Number(item.cost) * qty;
                                  return lineCost.toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  });
                                })()}
                              </td>
                              <td className="text-xs">
                                {/* Markup = DB se percentage (e.g. 20%) */}
                                {(() => {
                                  const markupVal = item?.markup ?? item?.markUp ?? null;
                                  if (markupVal === null || markupVal === undefined || markupVal === "") return "";
                                  return Number(markupVal).toLocaleString("en-US", {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 2,
                                  }) + "%";
                                })()}
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
                                  {item?.totalPrice?.toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </span>
                              </td>
                            </tr>
                          ))}
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
                ))
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


              <table className="w-full text-xs">
                <tbody>
                  {laborData
                    .filter((labor) => labor.totalPrice !== 0)
                    .map((labor) => {
                      return (
                        <tr className="">
                          <td className="">
                            <p>{String(labor?.jobType || "").toUpperCase()} LABOR</p>
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
              </table>
            </div>
            <div className="mt-2">
              <h4 className="text-[15px] font-semibold text-center mb-6">
                WORK SUMMARY
              </h4>
            </div>

            {/* Compiled data by Job Type */}
            <div className="mt-4 text-xs tracking-wide">
              {materialLaborData.map((item) => {
                if (item.dataType === "Material") {
                  return (
                    <div className="flex justify-between mt-1 capitalize">
                      <span>
                        <b className="w-[200px] inline-block">
                          {typeof item?.jobType === "string"
                            ? item.jobType.toUpperCase()
                            : String(item?.jobType || "").toUpperCase()}{" "}
                          {item.source === "Labor"
                            ? "LABOR"
                            : handleInvoiceJobType(item.jobType)}
                        </b>
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
                            {typeof item?.jobType === "string"
                              ? item.jobType.toUpperCase()
                              : String(item?.jobType || "").toUpperCase()} LABOR
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
                {/* COST & MARKUP summary (Office Copy jaisa) */}
                {cost !== null && cost !== undefined && (
                  <div className="flex justify-between my-2">
                    <span>COST</span>
                    <span>
                      <b>$</b>{" "}
                      <span className="inline-block w-[80px] text-end">
                        {cost.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </span>
                  </div>
                )}
                {markup !== null && markup !== undefined && (
                  <div className="flex justify-between my-2">
                    <span>MARKUP</span>
                    <span>
                      <span className="inline-block w-[80px] text-end">
                        {markup.toLocaleString("en-US", {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        })}
                        %
                      </span>
                    </span>
                  </div>
                )}
                <div className="flex justify-between my-2">
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

                <div className="flex justify-between my-2">
                  <span>TAXABLE AMOUNT</span>
                  <span>
                    <b>$</b>{" "}
                    {formData.isProjectTaxable ? (
                      <span className="inline-block w-[80px] text-end">
                        {(
                          (taxPercent * (taxableAmount - formData.taxCredits)) /
                          100
                        )?.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
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
                </div>
                <hr />
                <div className="flex justify-between my-2">
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
                              (formData.taxCredits + formData.nonTaxCredits))
                          )?.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                          : (
                            (taxPercent * taxableAmount) / 100 +
                            (materialsTotal +
                              laborTotal -
                              (formData.taxCredits + formData.nonTaxCredits))
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
