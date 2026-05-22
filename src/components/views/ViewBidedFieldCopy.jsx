import React, { useEffect, useState } from "react";
import Layout from "../layout/Layout";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate, useParams } from "react-router-dom";
import { useTableContext } from "../../context/TableContext";
import html2pdf from "html2pdf.js";
import fng_logo from "../../assets/images/fng_logo_black.png";
import parse from "html-react-parser";

export default function ViewBidedFieldCopy() {
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
    bidingDate: "",
    status: "",
    credits: 0,
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
  });
  const [fieldCopies, setFieldCopies] = useState([]);
  const [jobType, setJobType] = useState("");
  const { id } = useParams();
  const [materialData, setMaterialData] = useState([]);
  const [fieldLaborData, SetFieldLaborData] = useState([]);
  const [laborData, setLaborData] = useState([]);
  const [laborTotal, setLaborTotal] = useState(0);
  const [materialsTotal, setMaterialsTotal] = useState(0);
  const [taxPercent, setTaxPercent] = useState(0);
  const [address, setAddress] = useState("");
  const [taxableAmount, setTaxableAmount] = useState(0);
  const [documentName, setDocumentName] = useState("");
  const [loading, setLoading] = useState(false);
  const [dateInput, setDateInput] = useState("");
    const [materialLaborData, setMaterialLaborData] = useState([]);

  const navigate = useNavigate();
  const { tableSize } = useTableContext();

  const [categorizedFieldCopies, setCategorizedFieldCopies] = useState([]);

  const toMoneyNoCommas = (n) =>
    Number(n || 0)
      .toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
      .replace(/,/g, "");

  // Work Summary grand total for this Field Copy (matches the on-screen GRAND TOTAL).
  const workSummaryGrandTotal = React.useMemo(() => {
    const tc = Number(formData.taxCredits) || 0;
    const ntc = Number(formData.nonTaxCredits) || 0;
    const creditsSum = tc + ntc;
    const base = (Number(materialsTotal) || 0) + (Number(laborTotal) || 0);
    const taxP = Number(taxPercent) || 0;
    const taxable = Number(taxableAmount) || 0;

    if (formData.isProjectTaxable) {
      return (taxP * Math.max(0, taxable - tc)) / 100 + (base - creditsSum);
    }
    return (taxP * taxable) / 100 + (base - creditsSum);
  }, [
    formData.isProjectTaxable,
    formData.taxCredits,
    formData.nonTaxCredits,
    laborTotal,
    materialsTotal,
    taxPercent,
    taxableAmount,
  ]);

  // Display the encoded line using computed Work Summary total (left side).
  // Keep the right side (bid amount) from the existing stored bidCopyId when present.
  const displayBidCopyId = React.useMemo(() => {
    const code = String(formData.projectCode || "").trim().toUpperCase();
    const existing = String(formData.bidCopyId || "").trim();
    const right = existing.includes("/") ? existing.split("/").pop() : "";
    const left = toMoneyNoCommas(workSummaryGrandTotal);
    if (!code) return existing || "";
    return `${code}00${left}${right ? `/${right}` : ""}`;
  }, [formData.projectCode, formData.bidCopyId, workSummaryGrandTotal]);

  useEffect(() => {
    let taxAmount = 0;
    if (
      categorizedFieldCopies &&
      categorizedFieldCopies[0] &&
      categorizedFieldCopies[0]?.items?.length > 0
    ) {
      // console.log("Categrize copies", categorizedFieldCopies[0]?.items)
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
    if (
      fieldCopies.length > 0 ||
      materialData.length > 0 ||
      laborData.length > 0
    ) {
      const summarizedData = summarizeFieldCopies(fieldCopies);
      setCategorizedFieldCopies([
        { category: "Materials & Labor", items: summarizedData },
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
    getBidedFieldCopyData();
    getFGAddress();
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    getJobTypeById();
  }, [formData]);

  const getProjectById = async () => {
    try {
      setLoading(true);
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
        const date = formatDateToYYYYMMDD(response.data.result?.createdAt)
        setDateInput(date);
        // setFieldCopies(response.data.result.bidedCopy);
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
                totalPrice: item.totalPrice,
                isLaborTaxable: item.isTaxable,
                type: "field",
                dataType : "Labor"
              },
            ];
          }
        });
        const laborData = response.data.result.laborData.map((labor) => {
          return {
            jobType: labor.jobType,
            isLaborTaxable: labor.isLaborTaxable,
            totalPrice: labor.totalPrice,
            type: "labor",
            dataType : labor.dataType,
          };
        });
        const sortedCopies = moveLaborToBottom(
          response.data.result?.bidedCopiesData
        );
        setFieldCopies(sortedCopies || []);
        setMaterialData(resultedMaterials || []);
        SetFieldLaborData(laborData);
        let resultedLabors = [...laborData, ...fieldLabors];
        setLaborData(categorizeLabor(resultedLabors));
        setMaterialLaborData(
          sortByJobType([...resultedMaterials , ...resultedLabors])
        );

        // setFieldCopies(response.data.result?.bidedCopiesData || []);
        // setMaterialData(response.data.result.materialData || []);
        // setLaborData(response.data.result.laborData || []);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response.message);
    }
  };

  function sortByJobType(data) {
    return data.sort((a, b) => a.jobType.localeCompare(b.jobType));
  }

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

    return Object.values(summary);
  };

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
          type: item.type,
          dataType : item.dataType,
        };
      }
      // Sum up the totalPrice for the current jobType and tax status combination
      result[key].totalPrice += item.totalPrice;
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
        setAddress(response.data.result);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response.message);
    }
  };

  function formatDate(dateString) {
    const options = { day: "2-digit", month: "long", year: "numeric" };
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", options); // Use 'en-GB' to get the desired format
  }

  function moveLaborToBottom(data) {
    return data.sort((a, b) => {
      if (a.source === "Labor" && b.source !== "Labor") return 1;
      if (a.source !== "Labor" && b.source === "Labor") return -1;
      return 0;
    });
  }

  const downloadPdf = () => {
    const element = document.getElementById("content-to-pdf");
    // console.log("View Bidede Field Copy");

    // Create a temporary div with the hidden content
    const tempDiv = document.createElement("div");
    // tempDiv.innerHTML = `
    //     <div class="flex justify-center mb-0">
    //       <img src="${fng_logo}" alt="F&G Logo" class="h-[110px]" />
    //     </div>
    //   `;

    // Insert the temporary div at the top of the content
    element.prepend(tempDiv);

    const fileName = documentName + ".pdf";

    const options = {
      margin: 0.1,
      filename: fileName,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, logging: true, dpi: 300, letterRendering: true },
      jsPDF: { unit: "in", format: "A4", orientation: "portrait" },
      // pagebreak: { mode: ["avoid-all", "css", "legacy"] } // Ensures proper page breaks
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

Project Proposed on: ${
            dateInput ? formatDate(dateInput) : ""
          }`,
          pageWidth / 35,
          pageHeight - 0.75,
          { align: "left" }
        );
        // pdf.text("", pageWidth/4, pageHeight-0.5, { align: "right" });

        // console.log("PDF", pdf);

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

  function formatDateToYYYYMMDD(isoDate) {
    const dateObj = new Date(isoDate);
    return `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1)
      .toString()
      .padStart(2, "0")}-${dateObj.getDate().toString().padStart(2, "0")}`;
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
              <h3 className="card-title mt-1"><button
                    onClick={() => {
                      navigate(-1);
                    }}
                  >
                    <i className="fa fa-arrow-left mr-2"></i>
                  </button>{" "}View Bided Copy</h3>
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
                      <label htmlFor="dateInput">Bidding Date</label>
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
                        saveDocumentAs();
                      }}
                    >
                      Download PDF
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Downloaded copy */}
            <div className="" style={{ display: "none" }}>
              <div className="p-1" id="content-to-pdf">
                {/* <div className="text-center mb-4">
                  <h5 className=" text-[red] tracking-wide">
                    <span className="border-b border-[red] pb-[7px]">
                      Bid Copy
                    </span>
                  </h5>
                </div> */}
                {/* Project data */}
                <div className="flex flex-row gap-3 justify-between mt-1">
                  <div className="flex flex-col w-1/3 md:w-[280px]">
                    <div className="p-0 capitalize">
                      {/* <h6 className="font-bold text-[15px]">Date</h6> */}
                      <p className="text-xs font-medium">
                        {/* {formData?.projectStartDate
? formatDate(formData.projectStartDate)
: ""} */}
                        <span className="border-b border-black pb-[7px]">
                          PROJECT LOCATION
                        </span>
                      </p>
                    </div>
                    <div className="p-0 capitalize mt-0.5">
                      <p className="text-xs break-words">
                        {formData?.customerName?.toUpperCase()}
                      </p>
                    </div>
                    {/* {
                      formData?.customerType === "Commercial" && <div className="p-0 mt-1">
                      <p className="text-xs break-words capitalize">
                        {formData?.customerName?.toUpperCase()}
                      </p>
                    </div>
                    } */}
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
                      <div className="p-0 capitalize mt-1">
                        <h6 className="text-xs font-medium ">
                          <span className="border-b border-black pb-[7px]">
                            BILLING ADDRESS
                          </span>
                        </h6>
                        {/* <p className="text-xs break-words">
                          {formData?.billAddress?.toUpperCase()}
                        </p> */}
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

                    {/* <div className="p-0">
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
                        className="h-[140px]"
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
                        {displayBidCopyId}
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
                  <h6 className="font-semibold text-[13px] tracking-wide capitalize">
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

                <div className="w-full mt-3 py-1 text-[15px] overflow-x-scroll">
                  {(categorizedFieldCopies.length > 0 || laborData.length > 0) >
                  0 ? (
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
                              <th className="text-xs text-center">
                                <span className="relative -top-1.5">
                                  DESCRIPTION
                                </span>
                              </th>
                              <th className="text-xs">
                                <span className="relative -top-1.5">SIZE</span>
                              </th>
                              <th className="text-xs">
                                <span className="relative -top-1.5">
                                  QUANTITY
                                </span>
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
                  <table className="w-full text-xs">
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
                  </table>
                </div>

                {/* Compiled Material */}
                {/* <div className="w-full mt-4 text-[15px] overflow-x-auto">
{categorizedFieldCopies.length > 0 ? (
categorizedFieldCopies.map((group, index) => (
<div key={index} className="mb-8">
<h4 className="font-bold text-[15px] mb-3">
{group.category}
</h4>
<table className="w-full text-xs">
<thead className="">
<tr>

<th>
<span className="relative -top-1.5">Description</span>
</th>
<th>
<span className="relative -top-1.5">Size</span>
</th>
<th>
<span className="relative -top-1.5">
Quantity
</span>
</th>
<th>
<span className="relative -top-1.5">Price</span>
</th>
<th>
<span className="relative -top-1.5 ">Total</span>
</th>
</tr>
</thead>
<tbody>
{group &&
group.items &&
group.items.length > 0 &&
group.items.map((item, idx) => (
<tr key={idx}>
<td>{item.reference}</td>
<td>{item.size}</td>
<td>{item.quantity || ""}</td>
<td>{item.price?.toLocaleString("en-US", {
minimumFractionDigits: 2,
maximumFractionDigits: 2,
}) || ""}</td>
<td>{item.totalPrice?.toLocaleString("en-US", {
minimumFractionDigits: 2,
maximumFractionDigits: 2,
}) || ""}</td>
</tr>
))}

</tbody>
</table>
</div>
))
) : (
<p>Loading ...</p>
)}
</div> */}

                <div className="">
                  <h4 className="text-[15px] font-semibold text-center mb-6">
                    PROPOSAL SUMMARY
                  </h4>
                </div>

                {/* Compiled data by Job Type */}
                <div className=" text-xs mt-4 mb-2">
                  {
                    materialLaborData.map((item) => {
                      if (item.dataType === "Material") {
                        return (
                          <div className="flex justify-between mt-1 capitalize">
                            <span>
                              <b className="w-[200px] inline-block">
                                {item.jobType?.toUpperCase()}{" "}
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
                                    ? `${
                                      item.isTaxable ? "RT" : "RNT"
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
                      }else{
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
                    })
                  }
                </div>

                {/* Invoice Summary */}
                <div className="w-full mt-5 text-[15px]">
                  <div className="text-xs  bg-[whitesmoke] p-3">
                    {/* <div className="flex justify-between">
<span>Total Labor Cost</span>
<span>
<b>$</b> {laborTotal?.toLocaleString("en-US", {
minimumFractionDigits: 2,
maximumFractionDigits: 2,
})}
</span>
</div>
<div className="flex justify-between my-1.5">
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
                    <div className="flex justify-between my-1.5">
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
                    <div className="flex justify-between my-1.5">
                      <span>TAXABLE AMOUNT</span>
                      <span>
                        <b>$</b>{" "}
                        <span className="inline-block w-[80px] text-end">
                          {formData.isProjectTaxable ? (
                            (
                              taxableAmount - formData.taxCredits
                            )?.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })
                          ) : (
                            <>
                              {formData.taxCredits > taxableAmount
                                ? 0
                                : taxableAmount?.toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                            </>
                          )}
                        </span>
                      </span>
                    </div>
                    <hr />
                    <div className="flex justify-between my-2">
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
                            <>
                              {formData.taxCredits > taxableAmount
                                ? 0
                                : (
                                    (taxPercent * taxableAmount) /
                                    100
                                  )?.toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                            </>
                          )}
                        </span>
                      </span>
                    </div>
                    <hr />
                    <div className="flex justify-between my-1.5">
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

                {/* Approved by */}
                {/* <div className="abosolute bottom-0 left-0 mt-4">
<div className="">
<span className="text-xs">Approved by</span>
<input
type="text"
className="border-b border-black ml-2 w-[150px] outline-none"
/>
<span className="text-xs ml-2">Date</span>
<input
type="text"
className="border-b border-black ml-2 w-[150px] outline-none"
/>
</div>
<div className="flex items-center mt-2 pb-2">
<h6 className="font-semibold text-[15px]">
PROJECT PROPOSED ON :{" "}
</h6>
<p className="text-xs">
{formData?.createdAt
? formatDate(formData.createdAt)
: ""}
</p>
</div>
</div> */}
              </div>
            </div>
            {/* Real Copy */}
            <div className="mt-6 p-6 ">
              {/* Project data */}
              <div className="flex flex-col md:flex-row gap-6 justify-around">
                <div className="flex flex-col w-[300px]">
                  <div className="p-2">
                    <h6 className="font-bold text-[17px]">Bidding Date</h6>
                    <p>
                      {formData?.createdAt
                        ? formatDate(dateInput)
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
                  {formData?.customerEmail && (
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

              {/* Compiled Material */}
              <div className="w-full mt-10 text-[15px] overflow-x-auto">
                {categorizedFieldCopies.length > 0 || laborData.length > 0 ? (
                  categorizedFieldCopies.map((group, index) => (
                    <div key={index} className="mb-8">
                      <h4 className="font-bold text-lg mb-2">
                        {group.category}
                      </h4>
                      <table className="w-full table table-striped text-start">
                        <thead className="bg-[#00613e] text-white">
                          <tr>
                            {/* <th>Source</th> */}
                            <th>Name</th>
                            <th>Size</th>
                            <th>Quantity</th>
                            <th>Price</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group &&
                            group.items &&
                            group.items.length > 0 &&
                            group.items.map((item, idx) => (
                              <tr key={idx}>
                                {/* <td>{item.source}</td> */}
                                <td className="w-[400px] pr-2">
                                  {item.reference?.toUpperCase()}
                                </td>
                                <td>{item.size}</td>
                                <td>{item.quantity || ""}</td>
                                <td>
                                  {item.price?.toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  }) || ""}
                                </td>
                                <td>
                                  {item.totalPrice?.toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  }) || 0}
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
                                    {labor.totalPrice?.toLocaleString("en-US", {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  ))
                ) : (
                  <p>Loading ...</p>
                )}
              </div>

              <div className="">
                <h4 className="text-lg font-semibold text-center mb-6">
                  Proposal Summary
                </h4>
              </div>

              {/* Compiled data by Job Type */}
              <div className="mt-6 mb-4">
                {materialData.map((material) => {
                  return (
                    <div className="flex justify-between mt-1 capitalize">
                      <span>
                        <b>
                          {material.jobType.toUpperCase()}{" "}
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
                      <hr />
                      <div className="flex justify-between my-1.5">
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
                              {formData.isProjectTaxable
                                ? (
                                    (taxPercent *
                                      (taxableAmount - formData.taxCredits)) /
                                    100
                                  )?.toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })
                                : ((taxPercent * 0) / 100)?.toLocaleString(
                                    "en-US",
                                    {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    }
                                  )}
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

            <div className="w-full mb-10 text-[15px] flex justify-end flex-col md:flex-row gap-4 p-6">
              {formData.status === "Ongoing" && (
                <button
                  className="bg-[#00613e] text-white py-1 px-6"
                  onClick={() => {
                    navigate(
                      `/panel/office/project/field-copy/bided/edit/${id}`
                    );
                  }}
                >
                  Edit
                </button>
              )}
              <button
                className={`bg-[#00613e] text-white py-1 px-6 md:mr-3 mr-0 ${
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
          </div>
        </div>
      </div>
    </Layout>
  );
}
