import React, { useEffect, useState } from "react";
import Layout from "../layout/Layout";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useTableContext } from "../../context/TableContext";
import html2pdf from "html2pdf.js";
import fng_logo from "../../assets/images/fng_logo_black.png";
import parse from "html-react-parser";

export default function CustomerCompiledProjectsView() {
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
    isProjectTaxable: false,
  });
  const [fieldCopies, setFieldCopies] = useState([]);
  const [desc, setDesc] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [projectData, setProjectData] = useState([]);
  const [jobType, setJobType] = useState("");
  const [creditAmount, setCreditAmount] = useState(0);
  const [laborTotal, setLaborTotal] = useState(0);
  const [materialsTotal, setMaterialsTotal] = useState(0);
  const [taxPercent, setTaxPercent] = useState(0);
  const [taxableAmount, setTaxableAmount] = useState(0);
  const [materialData, setMaterialData] = useState([]);
  const [laborData, setLaborData] = useState([]);
  const [categorizedFieldCopies, setCategorizedFieldCopies] = useState([]);
  const [hideFieldCopy, setHideFieldCopy] = useState(true);
  const [jobAddress, setJobAddress] = useState("");
  const [description, setDescription] = useState("");
  const [fgAddress, setFGAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [documentName, setDocumentName] = useState("");
  const [materialLaborData, setMaterialLaborData] = useState([]);

  console.log("Project Data", materialLaborData);

  const { id } = useParams();

  const location = useLocation();
  const selectedProjects = location.state.data;

  const navigate = useNavigate();
  const { tableSize } = useTableContext();

  const downloadPdf = () => {
    if (!jobAddress?.trim()) {
      toast.error("Please enter job address");
      return;
    }
    // if (!description) {
    //   toast.error("Please enter description");
    //   return;
    // }
    setHideFieldCopy(false);
    const element = document.getElementById("content-to-pdf");

    const fileName = documentName + ".pdf";

    const options = {
      margin: 0.1,
      filename: fileName,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 1 },
      jsPDF: { unit: "in", format: "A4", orientation: "portrait" },
      // pagebreak: { mode: ["avoid-all", "css", "legacy"] }, // Ensures proper page breaks
    };

    html2pdf()
      .from(element)
      .set(options)
      .toPdf()
      .get("pdf")
      .then((pdf) => {
        // Ensure we're on the last page
        const pageCount = pdf.internal.getNumberOfPages();
        pdf.setPage(pageCount);

        // Get page dimensions
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

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
        setHideFieldCopy(true);
      })
      .catch((error) => {
        console.error("PDF generation failed:", error);
        // tempDiv.remove(); // Ensure cleanup even if an error occurs
        setHideFieldCopy(true);
      });
  };

  useEffect(() => {
    let taxAmount = 0;
    if (
      categorizedFieldCopies &&
      categorizedFieldCopies[0] &&
      categorizedFieldCopies[0]?.items?.length > 0
    ) {
      for (let type of categorizedFieldCopies[0].items) {
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
    setTaxableAmount(Number.parseFloat(taxAmount));
  }, [categorizedFieldCopies]);

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
    getProjectByIds();
    getJobTypeById();
    getTaxPercentage();
    getCustomerFieldCopyData();
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    getJobTypeById();
  }, [formData]);

  const getProjectByIds = async () => {
    try {
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/project/get-compiled-projects`,
        { projectIds: JSON.stringify(selectedProjects) },
        { headers: headers }
      );
      // console.log("Response", response.data);
      if (response.data.statusCode === 200) {
        let allProjects = [];
        let allCustomerCopies = [];
        let allMaterialData = [];
        let allLaborData = [];
        let projectData = [];
        let projectDesc = [];
        let credits = 0;
        // console.log("Project", response.data.result);
        for (let project of response.data.result) {
          if (project.customerCopiesData.length > 0) {
            const resultedCopies = [
              ...project.customerCopiesData,
              // ...project.officeDraftCopies,
            ];
            const summarizedData = summarizeFieldCopies(resultedCopies);

            // const categorizedFieldCopies = [
            //   { category: "Materials & Other", items: summarizedData },
            // ];

            let resultedMaterials = [
              ...project.materialData,
              // ...project.materialDraftData,
            ];
            let resultedLabors = [
              ...project.laborData,
              // ...project.laborDraftData,
            ];

            resultedMaterials = categorizeMaterial(resultedMaterials);
            console.log("Resulted Labors before", resultedLabors);
            resultedLabors = categorizeLabor(resultedLabors);

            console.log("Resulted Labors after", resultedLabors);

            allProjects = [
              ...allProjects,
              {
                copies: summarizedData,
                laborData: resultedLabors,
                materialData: resultedMaterials,
              },
            ];
          }
          projectDesc = [
            ...projectDesc,
            {
              description: project.projectData.description,
              jobName: project.projectData.jobType.jobName,
            },
          ];
          allCustomerCopies = [
            ...allCustomerCopies,
            ...project.customerCopiesData,
            // ...project.officeDraftCopies,
          ];
          allMaterialData = [
            ...allMaterialData,
            ...project.materialData,
            // ...project.materialDraftData,
          ];
          allLaborData = [
            ...allLaborData,
            ...project.laborData,
            // ...project.laborDraftData,
          ];
          credits += project.projectData.credits;
          projectData = [...projectData, project.projectData];
        }
        const resultedMaterials = categorizeMaterial(allMaterialData);
        const resultedLabors = categorizeLabor(allLaborData);

        const allJobAddressesEqual = projectData.every(
          (item) => item.jobAddress === projectData[0].jobAddress
        );
        if (allJobAddressesEqual) {
          setJobAddress(projectData[0]?.jobAddress);
        } else {
          setJobAddress("");
        }
        setDesc(projectDesc);
        setCreditAmount(credits);
        setAllProjects(allProjects);
        setProjectData(projectData);

        // allCustomerCopies.push(...project.customerCopiesData);

        // console.log(
        //   "All Projects Data",
        //   allCustomerCopies,
        //   allMaterialData,
        //   allLaborData
        // );
        // setFormData(response.data.result);
        const sortedCopies = moveLaborToBottom(allCustomerCopies);
        setFieldCopies(sortedCopies || []);
        setMaterialData(resultedMaterials || []);
        setLaborData(resultedLabors || []);
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
  };

  function sortByJobType(data) {
    return data.sort((a, b) => a.jobType.localeCompare(b.jobType));
  }

  // console.log("Descriptoin", desc);

  function moveLaborToBottom(data) {
    return data.sort((a, b) => {
      if (a.source === "Labor" && b.source !== "Labor") return 1;
      if (a.source !== "Labor" && b.source === "Labor") return -1;
      return 0;
    });
  }

  function categorizeLabor(laborData) {
    const categorizedData = laborData.reduce((result, item) => {
      // Create a unique key combining jobType and isLaborTaxable to handle distinctions
      const key = `${item.jobType}`;

      if (!result[key]) {
        // Initialize a new entry for this jobType and tax status combination
        result[key] = {
          jobType: item.jobType,
          totalPrice: 0,
          isLaborTaxable: item.isLaborTaxable,
          dataType: "Labor",
        };
      }
      // Sum up the totalPrice for the current jobType and tax status combination
      result[key].totalPrice += item.totalPrice;
      return result;
    }, {});

    // Convert the result object to an array format
    return Object.values(categorizedData);
  }

  function categorizeMaterial(materialData) {
    const categorizedData = materialData.reduce((result, item) => {
      // Check if the jobType already exists in the result object

      const category = item.dataType === "Labor" ? "Labor" : "Material";
      const key = `${item.jobType}-${category}`;

      if (!result[key]) {
        // Initialize a new entry for this jobType
        result[key] = {
          jobType: item.jobType,
          totalPrice: 0,
          dataType: category,
        };
      }
      // Sum up the totalPrice for the current jobType
      result[key].totalPrice += item.totalPrice;
      return result;
    }, {});

    // Convert the result object to an array format
    return Object.values(categorizedData);
  }

  const getCustomerFieldCopyData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/project/get-customer-project-info/${selectedProjects[0]}`,
        { headers: headers }
      );
      if (response.data.statusCode === 200) {
        setFormData(response.data.result);
        let doc_name =
          response?.data?.result?.customerName?.toUpperCase() || "";

        // Create doc_name like customer name = last name + "_" + firstName
        // if (doc_name.includes(" ")) {
        //   doc_name = (
        //     doc_name.split(" ")[1] +
        //     "_" +
        //     doc_name.split(" ")[0]
        //   )?.replace(",", "");
        // }
        setDocumentName(doc_name);
        setFGAddress(response.data.result.companyAddress);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response.message);
    }
    setLoading(false);
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

    // Calculate the total price
    // Object.keys(summary).forEach((key) => {
    //   summary[key].totalPrice = summary[key].quantity * summary[key].price;
    // });

    return Object.values(summary);
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

  const handleInvoiceJobType = (jobType) => {
    if (["professional", "pick up/delivery"].includes(jobType.toLowerCase())) {
      return "SERVICE";
    } else if (jobType.toLowerCase() === "equipment rental") {
      return "";
    }else if (jobType.toLowerCase() === "reimbursement total") {
      return "";
    }else if (jobType.includes("Lump Sum")) {
      return "";
    } else {
      return "MATERIAL";
    }
  };

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
                View Compiled Data
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

            <div
              className=""
              style={{
                display: "none",
              }}
            >
              <div className="p-2" id="content-to-pdf">
                {/* Project Data */}
                {true ? (
                  <div className="flex flex-row gap-3 justify-around">
                    <div className="flex flex-col w-1/3 md:w-[280px]">
                      <div className="px-0.5 capitalize">
                        <h6 className="text-[13px] font-semibold underline">
                          PROJECT LOCATION
                        </h6>
                        <div className="p-0 mt-0.5">
                          <p className="text-xs break-words capitalize">
                            {formData?.customerName?.toUpperCase()}
                          </p>
                          <div className="p-0 capitalize">
                            <p className="text-xs break-words">
                              {jobAddress?.toUpperCase()}
                            </p>
                          </div>
                        </div>
                        {/* <input
                          type="text"
                          value={jobAddress}
                          className="border-0 border-black outline-none tracking-wide bg-transparent h-[30px] pb-1 md:text-xs text-xs w-full"
                          onChange={(e) => {
                            setJobAddress(e.target.value);
                          }}
                        /> */}
                      </div>
                      <div className="px-0.5 capitalize m-0">
                        <h6 className="text-[13px] font-semibold">Bill To</h6>
                        {/* <h6 className="font-bold text-[15px]">Customer Name</h6> */}
                        <p className="md:text-xs text-xs break-words">
                          {formData?.customerName?.toUpperCase()}
                        </p>
                      </div>
                      <div className="px-0.5 -my-1">
                        {/* <h6 className="font-bold text-[15px]">Email</h6> */}
                        <p className="md:text-xs text-xs break-words m-0">
                          {formData?.customerEmail}
                        </p>
                      </div>

                      <div className="px-0.5 mt-2">
                        {/* <h6 className="font-bold text-[15px]">Email</h6> */}
                        <p className="md:text-xs text-xs break-words">
                          {parse(description)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-center w-1/3 md:w-[280px] ml-4">
                      <div className="p-1">
                        <img
                          src={fng_logo}
                          className="h-[140px] w-full"
                          alt=""
                        />
                      </div>
                    </div>
                    <div className="flex flex-col w-1/3 md:w-[280px] text-end capitalize">
                      <div className="p-0.5">
                        <h6 className="font-bold md:text-[15px] text-xs">
                          F&G INC
                        </h6>
                        <pre
                          className="text-xs break-words p-0 pb-3 leading-4"
                          style={{ fontFamily: "Source Sans Pro" }}
                        >
                          {fgAddress}
                        </pre>
                      </div>
                      <div className="px-0.5">
                        {/* <h6 className="font-bold text-[15px]">
            Customer Phone
          </h6> */}
                        <p className="md:text-xs text-xs break-words">
                          {formData?.customerPhone}
                        </p>
                      </div>
                      {/* <div className="p-1">
          <h6 className="font-bold text-[15px]">Date</h6>
          <p className="text-xs">{formatDate(Date.now())}</p>
        </div> */}
                      <div className="px-0.5">
                        {/* <h6 className="font-bold text-[15px]">Project Codes</h6> */}
                        {projectData.map((data) => {
                          return (
                            <div className="my-0.5" key={data._id}>
                              <p className="md:text-xs text-xs">
                                {data?.lastCustomerCopyId}
                              </p>
                              <p className="md:text-xs text-xs">
                                {convertMillisecondsToDate(
                                  data.projectCompletedDate
                                )}
                              </p>
                              <p className="md:text-xs text-xs">
                                {data.projectCode}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col md:flex-row gap-6 justify-around">
                    <div className="flex flex-col w-[300px]">
                      <div className="p-2">
                        <h6 className="font-bold text-[15px]">Customer Name</h6>
                        <p>{formData?.customerName}</p>
                      </div>
                      <div className="p-2">
                        <h6 className="font-bold text-[15px]">Job Address</h6>
                        <input
                          type="text"
                          // placeholder="Enter job address"
                          value={jobAddress}
                          className="border-0 border-black outline-none mt-1.5 tracking-wide bg-transparent h-[40px] pb-1"
                          onChange={(e) => {
                            setJobAddress(e.target.value);
                          }}
                        />
                      </div>
                      <div className="p-2">
                        <h6 className="font-bold text-[15px] mt-1">
                          Description of work
                        </h6>
                        <textarea
                          value={description}
                          className="border-0 border-black outline-none resize-none bg-transparent w-[400px] mt-1.5 tracking-wide"
                          // placeholder="Enter description"
                          onChange={(e) => {
                            setDescription(e.target.value);
                          }}
                        ></textarea>
                        {/* <input type="text" placeholder="Enter job address" value= className="border-b border-black outline" /> */}
                      </div>
                    </div>
                    <div className="flex flex-col w-[300px]">
                      {/* <div className="p-2">
      <h6 className="font-bold text-[15px]">Project Code</h6>
      <p>{formData.projectCode}</p>
    </div> */}
                      {/* <div className="p-2">
      <h6 className="font-bold text-[15px]">Job Type</h6>
      <p>Lnadsc</p>
    </div> */}
                      {formData && formData.customerEmail && (
                        <div className="p-2">
                          <h6 className="font-bold text-[15px]">Email</h6>
                          <p>{formData?.customerEmail}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col w-[300px]">
                      <div className="p-2">
                        <h6 className="font-bold text-[15px]">F&G INC</h6>
                        <pre
                          className="text-base break-words p-0 pb-3"
                          style={{ fontFamily: "Source Sans Pro" }}
                        >
                          {fgAddress}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}

                <div className="px-0.5 mt-8">
                  {desc.map((item) => {
                    return (
                      <h6 className="font-semibold text-[12px] capitalize">
                        <div className="flex">
                          <span className="font-semibold text-[12px] capitalize pb-[7px] border-b border-black">
                            {item.jobName?.toUpperCase()} SERVICE
                          </span>
                          {item.description && (
                            <span className="font-normal text-xs ml-2 flex">
                              : <span className="w-[4px]"></span>{" "}
                              {parse(item.description)}
                            </span>
                          )}
                        </div>
                      </h6>
                    );
                  })}
                </div>

                {/* Compiled data */}
                <>
                  <div className="w-full mt-4 text-[15px] overflow-x-auto pb-6">
                    {categorizedFieldCopies.length > 0 ||
                    laborData.length > 0 ? (
                      categorizedFieldCopies.map((group, index) => (
                        <div key={index} className="mb-0">
                          {/* <h4 className="font-bold text-[15px] mb-3">
              Compilation
            </h4> */}
                          <table className="w-full text-start">
                            <thead className=" text-black">
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
                                  <span className="relative -top-1.5">
                                    SIZE
                                  </span>
                                </th>
                                <th className="text-xs">
                                  <span className="relative -top-1.5">
                                    QUANTITY
                                  </span>
                                </th>
                                <th className="text-xs">
                                  <span className="relative -top-1.5">
                                    PRICE
                                  </span>
                                </th>
                                <th className="text-xs text-end">
                                  <span className="relative -top-1.5">
                                    TOTAL
                                  </span>
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {group.items.map((item, idx) => (
                                <tr key={idx}>
                                  {/* <td className="text-xs">{item.source}</td> */}
                                  <td className="text-xs w-[400px] pr-2">
                                    {item.reference?.toUpperCase()}
                                  </td>
                                  <td className="text-xs">{item.size}</td>
                                  <td className="text-xs pl-3">
                                    {item.quantity}
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
                  <td colSpan="2" className="font-bold">
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
                      ?.toLocaleString("en-US", {
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
                      ?.toLocaleString("en-US", {
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
                        {laborData
                          .filter((labor) => labor.totalPrice !== 0)
                          .map((labor) => {
                            return (
                              <tr className="">
                                <td className="">
                                  <p>{labor.jobType?.toUpperCase()} LABOR</p>
                                </td>
                                <td className="text-end">
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
                                  {/* {labor.totalPrice?.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} */}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                  <div className="">
                    <h4 className="text-[15px] font-semibold text-center mb-6">
                      INVOICE SUMMARY
                    </h4>
                  </div>
                  {/* Compiled data by Job Type */}
                  <div className="mt-1 text-xs">
                    {materialLaborData.map((item) => {
                      if (item.dataType === "Material") {
                        return (
                          <div className="flex justify-between mt-1 capitalize">
                            <span>
                              <b className="w-[200px] inline-block">
                                {item.jobType?.toUpperCase()} {item.source === "Labor"
                                  ? "LABOR"
                                  : handleInvoiceJobType(item.jobType)}
                              </b>
                              <b>
                                {["Labor", "Lump Sum", "Other"].includes(
                                  item.source
                                )
                                  ? item.isTaxable
                                    ? "RT"
                                    : "RNT"
                                  : "RT"}
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
                                <b>{item.isLaborTaxable ? "RT" : "RNT"}</b>
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
                </>

                {/* Invoice Summary */}
                <div className="w-full mt-5 text-xs">
                  <div className="text-xs">
                    {/* <div className="flex justify-between">
        <span>TOTAL LABOR COST</span>
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
                    <hr />
                    <div className="flex justify-between my-2">
                      <span>SUBTOTAL</span>
                      <span>
                        <b>$</b>{" "}
                        <span className="inline-block w-[80px] text-end">
                          {(materialsTotal + laborTotal)?.toLocaleString(
                            "en-US",
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }
                          )}
                        </span>
                      </span>
                    </div>
                    <hr />
                    <div className="flex justify-between my-2">
                      <span>TAXABLE AMOUNT</span>
                      <span>
                        <b>$</b>{" "}
                        <span className="inline-block w-[80px] text-end">
                          {((taxPercent * taxableAmount) / 100)?.toLocaleString(
                            "en-US",
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }
                          )}
                        </span>
                      </span>
                    </div>
                    <hr />
                    <div className="flex justify-between my-2">
                      <span>GRAND TOTAL</span>
                      <span>
                        <b>$</b>{" "}
                        <span className="inline-block w-[80px] text-end">
                          <span className="border-b border-black pb-[7px]">
                            {(
                              (taxPercent * taxableAmount) / 100 +
                              (materialsTotal + laborTotal)
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

                {/* Signature & Date Fields */}
                {false && (
                  <div className="mt-3">
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
                    <div className="mt-2">
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
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 p-6">
              {/* Project Data */}
              {!hideFieldCopy ? (
                <div className="flex flex-col md:flex-row gap-6 justify-around">
                  <div className="flex flex-col w-[280px]">
                    <div className="p-2">
                      <h6 className="font-bold text-[17px]">Customer Name</h6>
                      <p>{formData?.customerName}</p>
                    </div>
                    {formData && formData?.customerEmail && (
                      <div className="p-2">
                        <h6 className="font-bold text-[17px]">Email</h6>
                        <p>{formData?.customerEmail}</p>
                      </div>
                    )}

                    <div className="p-2">
                      <h6 className="font-bold text-[17px]">Job Address</h6>
                      <input
                        type="text"
                        value={jobAddress}
                        className="border-0 border-black outline-none mt-1.5 tracking-wide bg-transparent h-[40px] pb-1"
                        onChange={(e) => {
                          setJobAddress(e.target.value);
                        }}
                      />
                    </div>
                    <div className="p-2">
                      <h6 className="font-bold text-[17px]">
                        Description of work
                      </h6>
                      <textarea
                        value={description}
                        className="border-0 border-black outline-none resize-none bg-transparent w-[250px] mt-1.5 tracking-wide"
                        onChange={(e) => {
                          setDescription(e.target.value);
                        }}
                      ></textarea>
                    </div>
                  </div>
                  <div className="flex flex-col w-[290px]">
                    <div className="p-2">
                      <img
                        src={fng_logo}
                        className="h-[100px] w-[150px]"
                        alt=""
                      />
                    </div>
                  </div>
                  <div className="flex flex-col w-[280px]">
                    <div className="p-2">
                      <h6 className="font-bold text-[17px]">F&G INC</h6>
                      <p>{fgAddress}</p>
                    </div>
                    <div className="p-2">
                      <h6 className="font-bold text-[17px]">Customer Phone</h6>
                      <p>{formData?.customerPhone}</p>
                    </div>
                    <div className="p-2">
                      <h6 className="font-bold text-[17px]">Date</h6>
                      <p>{formatDate(Date.now())}</p>
                    </div>
                    <div className="p-2">
                      <h6 className="font-bold text-[17px]">Project Codes</h6>
                      {projectData.map((data) => {
                        return <p key={data._id}>{data.projectCode}</p>;
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row gap-6 justify-around">
                  <div className="flex flex-col w-[300px]">
                    {/* <div className="p-2">
                    <h6 className="font-bold text-[17px]">Date</h6>
                    <p>
                      {formData?.projectStartDate
                        ? formatDate(formData.projectStartDate)
                        : ""}
                    </p>
                  </div> */}
                    <div className="p-2">
                      <h6 className="font-bold text-[17px]">Customer Name</h6>
                      <p>{formData?.customerName}</p>
                    </div>
                    <div className="p-2">
                      <h6 className="font-bold text-[17px]">Job Address</h6>
                      <input
                        type="text"
                        // placeholder="Enter job address"
                        value={jobAddress}
                        className="border-b border-black outline-none mt-1.5 tracking-wide bg-transparent h-[40px] pb-1"
                        onChange={(e) => {
                          setJobAddress(e.target.value);
                        }}
                        maxLength={150}
                      />
                    </div>
                    <div className="p-2">
                      <h6 className="font-bold text-[17px]">
                        Description of work
                      </h6>
                      <textarea
                        value={description}
                        className="border-b border-black outline-none resize-none bg-transparent w-[400px] mt-1.5 tracking-wide"
                        // placeholder="Enter description"
                        onChange={(e) => {
                          // if(e.target.value.length > 300){
                          //   toast.error("You can't enter more than 300 characters.");
                          //   return
                          // }
                          setDescription(e.target.value);
                        }}
                        maxLength={400}
                      ></textarea>
                      {/* <input type="text" placeholder="Enter job address" value= className="border-b border-black outline" /> */}
                    </div>
                  </div>
                  <div className="flex flex-col w-[300px]">
                    {/* <div className="p-2">
                    <h6 className="font-bold text-[17px]">Project Code</h6>
                    <p>{formData.projectCode}</p>
                  </div> */}
                    {/* <div className="p-2">
                    <h6 className="font-bold text-[17px]">Job Type</h6>
                    <p>Lnadsc</p>
                  </div> */}
                    {formData && formData?.customerEmail && (
                      <div className="p-2">
                        <h6 className="font-bold text-[17px]">Email</h6>
                        <p>{formData?.customerEmail}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col w-[300px]">
                    <div className="p-2">
                      <h6 className="font-bold text-[17px]">F&G INC</h6>
                      <p>{fgAddress}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Compiled data */}
              <>
                <div className="w-full mt-10 text-[15px] overflow-x-auto">
                  {!loading ? (
                    categorizedFieldCopies.length > 0 ||
                    laborData.length > 0 ? (
                      categorizedFieldCopies.map((group, index) => (
                        <div key={index} className="mb-8">
                          <h4 className="font-bold text-lg mb-2">
                            Compilation
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
                              {group.items.map((item, idx) => (
                                <tr key={idx}>
                                  {/* <td>{item.source}</td> */}
                                  <td className="w-[400px] pr-2">
                                    {item.reference}
                                  </td>
                                  <td>{item.size}</td>
                                  <td>{item.quantity}</td>
                                  <td>
                                    {item.price?.toLocaleString("en-US", {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}
                                  </td>
                                  <td>
                                    {item.totalPrice?.toLocaleString("en-US", {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}
                                  </td>
                                </tr>
                              ))}
                              {laborData
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
                  {materialData.map((item) => {
                    // return (
                    //   <div className="flex justify-between mt-1 capitalize">
                    //     <span>
                    //       <b>{material.jobType} {" "}
                    //             {material.source === "Labor"
                    //               ? "LABOR"
                    //               : handleInvoiceJobType(material.jobType)}</b>
                    //     </span>
                    //     <span>
                    //       <b>$</b>{" "}
                    //       {material.totalPrice?.toLocaleString("en-US", {
                    //         minimumFractionDigits: 2,
                    //         maximumFractionDigits: 2,
                    //       })}
                    //     </span>
                    //   </div>
                    // );
                  
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
                  {laborData
                    .filter((labor) => labor.totalPrice !== 0)
                    .map((labor) => {
                      return (
                        <div className="flex justify-between mt-1">
                          <span>
                            <b>{labor.jobType} LABOR</b>
                          </span>
                          <span>
                            <b>$</b>{" "}
                            {labor.totalPrice?.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </>

              {/* Invoice Summary */}

              <div className="">
                {/* <div className="">
                  <h4 className="text-lg font-semibold text-center mb-6">
                    Work Summary
                  </h4>
                </div> */}
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
                        <span>Credits</span>
                        <span>
                          <b>$</b>{" "}
                          {creditAmount?.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </>
                  )}
                  <hr />
                  <div className="flex justify-between my-2">
                    <span>SubTotal</span>
                    <span>
                      <b>$</b>{" "}
                      {(materialsTotal + laborTotal)?.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {!loading ? (
                creditAmount < laborTotal + materialsTotal ? (
                  <div className="">
                    {/* {!formData.isProjectTaxable && (
                      <>
                        <hr />
                        <div className="flex justify-between my-2">
                          <span>Credits</span>
                          <span>
                            <b>$</b>{" "}
                            {creditAmount?.toLocaleString("en-US", {
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
                        {/* {((taxPercent * taxableAmount) / 100)?.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })} */}
                        {(
                          (taxPercent * (taxableAmount - creditAmount)) /
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
                        {/* {(
                          (taxPercent * taxableAmount) / 100 +
                          (materialsTotal + laborTotal)
                        )?.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })} */}
                        {(
                          (taxPercent * (taxableAmount - creditAmount)) / 100 +
                          (materialsTotal + laborTotal)
                        )?.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="h-[100px] w-full flex justify-center items-center">
                    Please ensure the credits are less than the Sub Total.
                  </div>
                )
              ) : (
                <div className="h-[100px] w-full flex justify-center items-center">
                  Loading ...
                </div>
              )}

              {/* {taxableAmount}
              <br />
              {creditAmount} */}
            </div>
            <div className="w-full mb-10 text-[15px] flex justify-end flex-col md:flex-row gap-4 p-6">
              <button
                className={`bg-[#00613e] text-white py-1 px-6 md:mr-4 mr-0 ${
                  creditAmount > laborTotal + materialsTotal
                    ? "cursor-not-allowed"
                    : "cursor-pointer"
                }`}
                type="button"
                data-toggle="modal"
                data-target="#exampleModalCenter_saveAs"
                data-dismiss="modal"
                disabled={creditAmount > laborTotal + materialsTotal}
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
