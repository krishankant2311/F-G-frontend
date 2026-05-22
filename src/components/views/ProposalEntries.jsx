import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import JoditEditor from "jodit-react";
import Layout from "../layout/Layout";
import { useTableContext } from "../../context/TableContext";
import html2pdf from "html2pdf.js";
import fng_logo from "../../assets/images/fng_logo_black.png";
import parse from "html-react-parser";

export default function ProposalEntries() {
  const [formData, setFormData] = useState({
    customerName: "",
    customerId: "",
    customerEmail: "",
    customerPhone: "",
    forms: [
      {
        jobType: "",
        jobAddress:"",
        description: "",
        copies: [
          {
            source: "F&G",
            type: "",
            vendorName: "",
            markup: 0,
            reference: "",
            measure: "",
            quantity: "",
            price: "",
            totalCost: 0,
            totalPrice: 0,
            PO: "",
            invoice: "",
            isTaxable: true,
            startDate: Date.now(),
            endDate: Date.now(),
          },
        ],
      },
    ],
  });
  const [forms, setForms] = useState([
    {
      source: "F&G",
      type: "",
      vendorName: "",
      markup: 0,
      reference: "",
      measure: "",
      quantity: "",
      price: "",
      totalCost: 0,
      totalPrice: 0,
      PO: "",
      invoice: "",
      isTaxable: true,
      startDate: Date.now(),
      endDate: Date.now(),
    },
  ]);
  const [disableBtn, setDisableBtn] = useState(false);
  const navigate = useNavigate();
  const { id, projectId } = useParams();
  const { tableSize } = useTableContext();
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  // const [selectedCustomerName, setSelectedCustomerName] = useState("");
  // const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [fieldJobType, setFieldJobType] = useState("");
  const [adminTax, setAdminTax] = useState(0);
  const [materials, setMaterials] = useState([]);
  const [jobTypes, setJobTypes] = useState([]);
  const [documentName, setDocumentName] = useState("");
  const [dateInput, setDateInput] = useState("");
  const [address, setAddress] = useState("");
  const editor = useRef(null);
  const config = useMemo(
    () => ({
      readonly: true,
      placeholder: "",
    }),
    []
  );
  // Drop down logic
  const [dropdownCustomerVisibility, setDropdownCustomerVisibility] =
    useState(false); // Track dropdown visibility
  const [searchTermCustomer, setSearchTermCustomer] = useState(""); // Track search term for filtering
  const dropdownRefCustomer = useRef({});

  const [dropdownVisibility, setDropdownVisibility] = useState(
    forms.map(() => false) // Initialize visibility for each form
  );
  const [searchTerm, setSearchTerm] = useState(""); // Track search term for filtering
  const dropdownRefs = useRef([]);

  useEffect(() => {
    getCustomers();
    getJobTypes();
    getFGAddress();
    getMaterials();
    getProposalById();
    window.scrollTo(0, 0);
  }, []);

  const getProposalById = async () => {
    try {
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/proposal/view-proposal/${id}`,
        { headers: headers }
      );

      // console.log("Repsonse server", response);

      if (response.data.statusCode === 200) {
        let doc_name = response?.data?.result?.formData?.customerName?.toUpperCase() || "";

        if (doc_name.includes(" ")) {
          doc_name = (
            doc_name.split(" ")[1] +
            "_" +
            doc_name.split(" ")[0]
          )?.replace(",", "");
        }
        setDocumentName(doc_name);

        setFormData(response.data.result.formData);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.log("Error", error);
    }
  };

  // Filter customers based on search term
  const filteredCustomers = customers.filter(
    (customer) =>
      customer.customerName
        .toLowerCase()
        .includes(searchTermCustomer.toLowerCase()) ||
      customer.customerEmail
        .toLowerCase()
        .includes(searchTermCustomer.toLowerCase())
  );

  // Find the selected customer's name and job addresses
  const selectedCustomerData = customers.find(
    (customer) => customer._id === selectedCustomer
  );

  const selectedCustomerName = selectedCustomerData
    ? `${selectedCustomerData.customerName} (${
        selectedCustomerData.jobAddress?.length
          ? selectedCustomerData.jobAddress.join(", ")
          : "No job addresses"
      })`
    : "";

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

  const handleInputChange = (e) => {
    if (e.target.name === "customerPhone") {
      if (e.target.value.toString().length > 10) {
        toast.error("Phone number should not exceed 10 digits");
        return;
      }
    }

    if (e.target.name === "customerName") {
      const val = e.target.value;
      // if (containsNumberOrSpecialChar(val)) {
      //   toast.error(
      //     "Customer Name cannot contain numbers or special characters."
      //   );
      //   return;
      // }
    }

    if (e.target.name === "trailerNo") {
      const val = e.target.value;
      if (val.toString().length > 10) {
        toast.error("Trailer number should not exceed 10 digits");
        return;
      }
    }

    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
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
      // console.log("Address Response", response);
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

  // Toggle dropdown visibility

  const toggleDropdownVisibility = (key) => {
    setDropdownVisibility((prev) => {
      const newVisibility = {};

      // close all except the one being opened
      Object.keys(prev).forEach((k) => {
        newVisibility[k] = false;
      });

      // toggle the current key
      newVisibility[key] = !prev[key];

      // reset search term if opening
      if (newVisibility[key]) {
        setSearchTerm("");
      }

      return newVisibility;
    });
  };

  const getCustomers = async () => {
    try {
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/customer/get-customers-dpd`,
        { headers: headers }
      );
      if (response.data.statusCode === 200) {
        const activeCustomers = response.data.result.filter((customer) => {
          return customer.status === "Active";
        });
        setCustomers(activeCustomers);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.log("Error", error);
    }
  };

  const getMaterials = async () => {
    try {
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/project/get-materials-dpd`,
        { headers: headers }
      );

      if (response.data.statusCode === 200) {
        setMaterials(response.data.result);
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

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleMaterialChange = (materialName, key) => {
    const [formIndex, copyIndex] = key.split("-").map(Number);
    const material = materials.find((mat) => mat.name === materialName);

    if (!material) return;

    setFormData((prevData) => {
      const updatedForms = [...prevData.forms];
      const updatedCopies = [...updatedForms[formIndex].copies];

      updatedCopies[copyIndex] = {
        ...updatedCopies[copyIndex],
        reference: material.name,
        measure: material.measure,
        price: material.price,
        isTaxable: material.isTaxable,
        totalPrice:
          Number.parseFloat(material.price) *
          Number.parseFloat(updatedCopies[copyIndex].quantity || 1),
      };

      updatedForms[formIndex] = {
        ...updatedForms[formIndex],
        copies: updatedCopies,
      };

      return {
        ...prevData,
        forms: updatedForms,
      };
    });
  };

  const handleFormChange = (index, field, value) => {
    const updatedForms = [...formData.forms];
    updatedForms[index][field] = value;
    setFormData({ ...formData, forms: updatedForms });
  };

  const handleFormInputChange = (e, formIndex, copyIndex) => {
    const { name, value } = e.target;

    setFormData((prevState) => {
      const updatedForms = [...prevState.forms];
      const updatedCopy = {
        ...updatedForms[formIndex].copies[copyIndex],
        [name]: value,
      };

      const price = parseFloat(updatedCopy.price) || 0;
      const quantity = parseFloat(updatedCopy.quantity) || 0;
      const markup = parseFloat(updatedCopy.markup) || 0;
      const isTaxable =
        updatedCopy.isTaxable === "true" || updatedCopy.isTaxable === true;

      // Handle source change
      if (name === "source") {
        updatedCopy.type = value.includes("Lump Sum")
          ? value
          : value.includes("Other")
          ? "" // You can set this to your `fieldJobType` if needed
          : "";
        updatedCopy.reference = "";
        updatedCopy.measure = "";
        updatedCopy.quantity = "";
        updatedCopy.price = "";
        updatedCopy.totalPrice = "";
        updatedCopy.totalCost = "";
        updatedCopy.isTaxable = true;
      }

      // Handle type change
      if (name === "type") {
        updatedCopy.reference = "";
        updatedCopy.measure = "";
        updatedCopy.quantity = "";
        updatedCopy.price = "";
        updatedCopy.totalPrice = "";
        updatedCopy.totalCost = "";
        updatedCopy.isTaxable = true;
      }

      // Recalculate totalCost and totalPrice if price/quantity changes
      if (name === "price" || name === "quantity") {
        if (updatedCopy.source === "Other") {
          updatedCopy.totalCost = price && quantity ? price * quantity : "";
          updatedCopy.totalPrice =
            updatedCopy.totalCost + (markup * updatedCopy.totalCost) / 100;
        } else {
          updatedCopy.totalCost = price && quantity ? price * quantity : "";
          updatedCopy.totalPrice = price && quantity ? price * quantity : "";
        }
      }

      // Handle markup change
      if (name === "markup") {
        if (updatedCopy.totalCost) {
          updatedCopy.totalPrice =
            updatedCopy.totalCost + (markup * updatedCopy.totalCost) / 100;
        }
      }

      // Handle isTaxable change
      if (name === "isTaxable") {
        updatedCopy.isTaxable = value === "true" || value === true;
        if (updatedCopy.totalCost) {
          const intermediate =
            updatedCopy.totalCost + (markup * updatedCopy.totalCost) / 100;
          // You can add admin tax here if needed
          updatedCopy.totalPrice = intermediate + (0 * intermediate) / 100;
        }
      }

      updatedForms[formIndex].copies[copyIndex] = updatedCopy;
      return { ...prevState, forms: updatedForms };
    });
  };

  const handleAddJobType = () => {
    setDisableBtn(true); // Optionally disable the button to prevent multiple clicks

    setFormData((prevFormData) => ({
      ...prevFormData,
      forms: [
        ...prevFormData.forms,
        {
          jobType: "",
          description: "",
          copies: [
            {
              source: "F&G",
              type: "",
              vendorName: "",
              markup: 0,
              reference: "",
              measure: "",
              quantity: "",
              price: "",
              totalCost: 0,
              totalPrice: 0,
              PO: "",
              invoice: "",
              isTaxable: true,
              startDate: Date.now(),
              endDate: Date.now(),
            },
          ],
        },
      ],
    }));

    setTimeout(() => setDisableBtn(false), 500); // Enable button after a short delay
  };

  const addCopy = (formIndex) => {
    setFormData((prevFormData) => {
      const updatedForms = [...prevFormData.forms];

      // Ensure copies is an array (if not, initialize it as an empty array)
      if (!Array.isArray(updatedForms[formIndex].copies)) {
        updatedForms[formIndex].copies = [];
      }

      updatedForms[formIndex].copies.push({
        source: "F&G",
        type: "",
        vendorName: "",
        markup: 0,
        reference: "",
        measure: "",
        quantity: "",
        price: "",
        totalCost: 0,
        totalPrice: 0,
        PO: "",
        invoice: "",
        isTaxable: true,
        startDate: Date.now(),
        endDate: Date.now(),
      });

      return { ...prevFormData, forms: updatedForms };
    });
  };

  const deleteForm = (formIndex) => {
    setFormData((prevFormData) => {
      const updatedForms = prevFormData.forms.filter(
        (_, index) => index !== formIndex
      );

      return { ...prevFormData, forms: updatedForms };
    });
  };

  const deleteCopy = (formIndex, copyIndex) => {
    setFormData((prevFormData) => {
      const updatedForms = prevFormData.forms.map((form, index) => {
        if (index === formIndex) {
          return {
            ...form,
            copies: form.copies.filter((_, i) => i !== copyIndex), // Remove only the targeted copy
          };
        }
        return form;
      });

      return { ...prevFormData, forms: updatedForms };
    });
  };

  const updateDocumentName = (val) => {
    val = val?.replace(" ", "_");
    setDocumentName(val);
  };

  const saveDocumentAs = () => {
    if (!documentName) {
      toast.error("Please enter document name.");
      return;
    }
    if (!dateInput) {
      toast.error("Please enter biding date.");
      return;
    }
    downloadPdf();
  };

  const downloadPdf = () => {
    const element = document.getElementById("content-to-pdf");

    // Create a temporary div with the hidden content
    const tempDiv = document.createElement("div");

    // Insert the temporary div at the top of the content
    element.prepend(tempDiv);

    const fileName = documentName + ".pdf";

    const options = {
      margin: 0.05,
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
  
  Project Proposed on: ${dateInput ? formatDate(dateInput) : ""}`,
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

  function formatDate(dateString) {
    const options = { day: "2-digit", month: "long", year: "numeric" };
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", options); // Use 'en-GB' to get the desired format
  }


  
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // console.log("FormData", formData);
      // return;
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
      };
      setDisableBtn(true);
      const formdata = new FormData();
      formdata.append("customerId", formData.customerId);
      formdata.append("customerName", formData.customerName);
      formdata.append("customerEmail", formData.customerEmail);
      formdata.append("customerPhone", formData.customerPhone);
      formdata.append("forms", JSON.stringify(formData.forms));

      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/proposal/create-proposal`,
        formdata,
        {
          headers: headers,
        }
      );

      // console.log("Reposne", response);

      if (response.data.statusCode === 201) {
        toast.success(response.data.message);
        navigate("/panel/office/all-proposals/1");
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.response.message);
    }
    setDisableBtn(false);
  };

  return (
    <Layout>
      <div
        className={`${tableSize === 250 ? "md:ml-[250px]" : "md:ml-[90px]"}`}
      >
        <ToastContainer />
        {/* Modal For Save As */}
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

        {/* Actual Copy */}
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
                View Bid Entry
              </h3>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="card-body">
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

                {/* <div className="text-end mt-2">
                  <button
                    className={`btn bg-[#00613e] text-white text-sm relative top-1 ${
                      disableBtn ? "disabled" : ""
                    }`}
                    onClick={handleAddJobType}
                    type="button"
                    disabled={disableBtn}
                  >
                    <i className="fa fa-plus mr-2"></i>
                    Add Job Type
                  </button>
                </div> */}

                {/* Bottom Section */}
                {formData.forms
                  .filter((form) => form._id === projectId)
                  .map((form, formIndex) => (
                    <div
                      key={formIndex}
                      className="mt-4 p-3 border border-gray-300 rounded"
                    >
                      <div className="text-end">
                        {/* <button
                        type="button"
                        className="btn bg-red-500 text-white mt-2"
                        onClick={() => handleRemoveForm(formIndex)}
                      >
                        <i className="fa fa-close text-white"></i>
                      </button> */}
                      </div>
                      <div className="form-group">
                        <label htmlFor={`jobType-${formIndex}`}>
                          Job Type *
                        </label>
                        <select
                          name="jobType"
                          id={`jobType-${formIndex}`}
                          className="w-full border-[1px] p-2 rounded-sm border-[#d1d1d1] outline-none"
                          value={form.jobType}
                          onChange={(e) =>
                            handleFormChange(
                              formIndex,
                              "jobType",
                              e.target.value
                            )
                          }
                          disabled
                          required
                        >
                          <option value="">Select Job Type</option>
                          {jobTypes
                            .filter((item) => item.status === "Active")
                            .map((item) => (
                              <option key={item._id} value={item._id}>
                                {item.jobName}
                              </option>
                            ))}
                        </select>
                      </div>

                      <div className="form-group mt-3">
                        <label htmlFor={`description-${formIndex}`}>
                          Description
                        </label>
                        <JoditEditor
                          ref={editor}
                          config={config}
                          value={form.description}
                          onBlur={(newContent) =>
                            handleFormChange(
                              formIndex,
                              "description",
                              newContent
                            )
                          }
                          onChange={(newContent) =>
                            handleFormChange(
                              formIndex,
                              "description",
                              newContent
                            )
                          }
                        />
                      </div>

                      <div className="card-body">
                        {form.copies.length > 0 &&
                          form.copies.map((formData, copyIndex) => (
                            <div
                              key={copyIndex}
                              className="flex gap-x-16 justify-start flex-wrap mb-4 p-6 pt-8 shadow-md relative"
                            >
                              <div className="form-group flex flex-col">
                                <label
                                  htmlFor={`source-${formIndex}-${copyIndex}`}
                                >
                                  Source *
                                </label>
                                <select
                                  name="source"
                                  onChange={(e) =>
                                    handleFormInputChange(
                                      e,
                                      formIndex,
                                      copyIndex
                                    )
                                  }
                                  id={`source-${formIndex}-${copyIndex}`}
                                  className="border-b border-[grey] outline-none w-[180px]"
                                  value={formData.source}
                                  required
                                  disabled={true}
                                >
                                  {/* <option value="">Select Source</option> */}
                                  <option value="F&G">F&G</option>
                                  <option value="Other">Other</option>
                                  <option value="Lump Sum">Lump Sum</option>
                                  <option value="Labor">Labor</option>
                                </select>
                              </div>

                              {formData.source === "F&G" && (
                                <>
                                  {/* Material Type */}
                                  <div className="form-group flex flex-col">
                                    <label
                                      htmlFor={`type-${formIndex}-${copyIndex}`}
                                    >
                                      Material Type *
                                    </label>
                                    <select
                                      name="type"
                                      id={`type-${formIndex}-${copyIndex}`}
                                      className="border-b border-gray-500 outline-none w-[180px]"
                                      value={formData.type || ""}
                                      onChange={(e) =>
                                        handleFormInputChange(
                                          e,
                                          formIndex,
                                          copyIndex
                                        )
                                      }
                                      disabled={true}
                                      required
                                    >
                                      <option value="">Select</option>
                                      {jobTypes
                                        .filter(
                                          (item) => item.status === "Active"
                                        )
                                        .map((item, index) => (
                                          <option
                                            key={index}
                                            value={item.jobName}
                                          >
                                            {item.jobName}
                                          </option>
                                        ))}
                                    </select>
                                  </div>

                                  {/* Material Name */}
                                  <div
                                    className="form-group flex flex-col w-[180px] relative cursor-pointer"
                                    key={`${formIndex}-${copyIndex}`}
                                    ref={(el) =>
                                      (dropdownRefs.current[
                                        `${formIndex}-${copyIndex}`
                                      ] = el)
                                    }
                                  >
                                    <label
                                      htmlFor={`materialName-${formIndex}-${copyIndex}`}
                                    >
                                      Material Name *
                                    </label>
                                    <div className="relative cursor-pointer">
                                      <input
                                        // type="text"
                                        id={`materialName-${formIndex}-${copyIndex}`}
                                        name="materialName"
                                        className="border-b border-gray-500 outline-none w-[180px] text-sm pr-3 placeholder:text-base cursor-pointer"
                                        value={formData.reference || ""}
                                        placeholder="Select Material Name"
                                        readOnly
                                        //   onClick={() =>
                                        //     toggleDropdownVisibility(
                                        //       `${formIndex}-${copyIndex}`
                                        //     )
                                        //   }
                                        required
                                      />
                                      <span
                                        className="absolute right-0 cursor-pointer"
                                        onClick={() =>
                                          toggleDropdownVisibility(
                                            `${formIndex}-${copyIndex}`
                                          )
                                        }
                                      >
                                        <i className="fa fa-caret-down"></i>
                                      </span>
                                    </div>

                                    {/* Dropdown Menu */}
                                    {dropdownVisibility[
                                      `${formIndex}-${copyIndex}`
                                    ] && (
                                      <div className="h-[400px] w-[200px] scrollbar-content overflow-y-auto absolute top-[100%] bg-white shadow-md mt-1 z-10">
                                        {/* Search Input */}
                                        <input
                                          type="text"
                                          className="w-full px-2 py-1 border-b"
                                          placeholder="Search material..."
                                          value={searchTerm}
                                          onChange={handleSearchChange}
                                        />

                                        {/* Filtered Materials List */}
                                        {materials
                                          .filter(
                                            (item) =>
                                              item.status === "Active" &&
                                              item.name
                                                .toLowerCase()
                                                .includes(
                                                  searchTerm.toLowerCase()
                                                )
                                          )
                                          .map((material) => (
                                            <div
                                              key={material?._id}
                                              onClick={() => {
                                                handleMaterialChange(
                                                  material.name,
                                                  `${formIndex}-${copyIndex}`
                                                );
                                                toggleDropdownVisibility(
                                                  `${formIndex}-${copyIndex}`
                                                );
                                              }}
                                              className="text-sm hover:bg-gray-200 cursor-pointer p-2"
                                            >
                                              {material.name}
                                            </div>
                                          ))}

                                        {/* No Results Message */}
                                        {materials.filter(
                                          (item) =>
                                            item.status === "Active" &&
                                            item.name
                                              .toLowerCase()
                                              .includes(
                                                searchTerm.toLowerCase()
                                              )
                                        ).length === 0 && (
                                          <div className="p-2 text-gray-500 text-center text-sm">
                                            No materials found
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </>
                              )}

                              {formData.source === "Other" && (
                                <>
                                  <div className="form-group flex flex-col">
                                    <label
                                      htmlFor={`type-${formIndex}-${copyIndex}`}
                                    >
                                      Material Type *
                                    </label>
                                    <select
                                      name="type"
                                      onChange={(e) =>
                                        handleFormInputChange(
                                          e,
                                          formIndex,
                                          copyIndex
                                        )
                                      }
                                      readOnly={true}
                                      id={`type-${formIndex}-${copyIndex}`}
                                      className="border-b border-[grey] outline-none w-[180px]"
                                      value={formData.type}
                                      required
                                    >
                                      <option value="">Select</option>
                                      {jobTypes
                                        .filter((item) => {
                                          return item.status === "Active";
                                        })
                                        .map((item, index) => (
                                          <option
                                            key={index}
                                            value={item.jobName}
                                          >
                                            {item.jobName}
                                          </option>
                                        ))}
                                    </select>
                                  </div>
                                  <div className="form-group flex flex-col w-[180px]">
                                    <label
                                      htmlFor={`vendorName-${formIndex}-${copyIndex}`}
                                    >
                                      Vendor Name
                                    </label>
                                    <input
                                      type="text"
                                      className="border-b border-[grey] outline-none"
                                      id={`vendorName-${formIndex}-${copyIndex}`}
                                      name="vendorName"
                                      onChange={(e) =>
                                        handleFormInputChange(
                                          e,
                                          formIndex,
                                          copyIndex
                                        )
                                      }
                                      readOnly={true}
                                      maxLength={50}
                                      value={formData.vendorName}
                                      placeholder="Enter Vendor Name"
                                      // required
                                    />
                                  </div>
                                  <div className="form-group flex flex-col w-[180px]">
                                    <label
                                      htmlFor={`reference-${formIndex}-${copyIndex}`}
                                    >
                                      Material Name *
                                    </label>
                                    <input
                                      type="text"
                                      className="border-b border-[grey] outline-none"
                                      id={`reference-${formIndex}-${copyIndex}`}
                                      name="reference"
                                      onChange={(e) =>
                                        handleFormInputChange(
                                          e,
                                          formIndex,
                                          copyIndex
                                        )
                                      }
                                      readOnly={true}
                                      value={formData.reference}
                                      maxLength={100}
                                      placeholder="Enter Name"
                                      required
                                    />
                                  </div>
                                </>
                              )}

                              {formData.source === "Labor" && (
                                <>
                                  <div className="form-group flex flex-col">
                                    <label
                                      htmlFor={`type-${formIndex}-${copyIndex}`}
                                    >
                                      Job Type *
                                    </label>
                                    <select
                                      name="type"
                                      onChange={(e) =>
                                        handleFormInputChange(
                                          e,
                                          formIndex,
                                          copyIndex
                                        )
                                      }
                                      id={`type-${formIndex}-${copyIndex}`}
                                      className="border-b border-[grey] outline-none w-[180px]"
                                      value={formData.type}
                                      required
                                      disabled
                                    >
                                      <option value="">Select</option>
                                      {/* <option value={fieldJobType}>{fieldJobType}</option> */}
                                      {jobTypes
                                        .filter((item) => {
                                          return item.status === "Active";
                                        })
                                        .map((item, index) => (
                                          <option
                                            key={index}
                                            value={item.jobName}
                                          >
                                            {item.jobName}
                                          </option>
                                        ))}
                                    </select>
                                  </div>
                                  <div className="form-group flex flex-col w-[180px]">
                                    <label
                                      htmlFor={`vendorName-${formIndex}-${copyIndex}`}
                                    >
                                      Vendor Name
                                    </label>
                                    <input
                                      type="text"
                                      className="border-b border-[grey] outline-none"
                                      id={`vendorName-${formIndex}-${copyIndex}`}
                                      name="vendorName"
                                      onChange={(e) =>
                                        handleFormInputChange(
                                          e,
                                          formIndex,
                                          copyIndex
                                        )
                                      }
                                      value={formData.vendorName}
                                      placeholder="Enter Vendor Name"
                                      maxLength={50}
                                      readOnly={true}
                                      // required
                                    />
                                  </div>
                                  <div className="form-group flex flex-col w-[180px]">
                                    <label
                                      htmlFor={`reference-${formIndex}-${copyIndex}`}
                                    >
                                      Description *
                                    </label>
                                    <input
                                      type="text"
                                      className="border-b border-[grey] outline-none"
                                      id={`reference-${formIndex}-${copyIndex}`}
                                      name="reference"
                                      onChange={(e) =>
                                        handleFormInputChange(
                                          e,
                                          formIndex,
                                          copyIndex
                                        )
                                      }
                                      value={formData.reference}
                                      maxLength={100}
                                      placeholder="Enter Description"
                                      required
                                      readOnly={true}
                                    />
                                  </div>
                                  <div className="form-group flex flex-col">
                                    <label
                                      htmlFor={`source-${formIndex}-${copyIndex}`}
                                    >
                                      Taxable *
                                    </label>
                                    <select
                                      name="isTaxable"
                                      onChange={(e) =>
                                        handleFormInputChange(
                                          e,
                                          formIndex,
                                          copyIndex
                                        )
                                      }
                                      id={`isTaxable-${formIndex}-${copyIndex}`}
                                      className="border-b border-[grey] outline-none w-[180px]"
                                      value={formData.isTaxable}
                                      required
                                      disabled
                                    >
                                      <option value="">Select Option</option>
                                      <option value="true">Yes</option>
                                      <option value="false">No</option>
                                    </select>
                                  </div>
                                </>
                              )}

                              {formData.source.includes("Lump Sum") && (
                                <>
                                  <div className="form-group flex flex-col hidden">
                                    <label
                                      htmlFor={`type-${formIndex}-${copyIndex}`}
                                    >
                                      Material Type
                                    </label>
                                    <select
                                      name="type"
                                      id={`type-${formIndex}-${copyIndex}`}
                                      className="border-b border-[grey] outline-none w-[180px]"
                                      value="Lump Sum"
                                      required
                                      disabled
                                    >
                                      <option value="">Select</option>
                                      <option value="Lump Sum">Lump Sum</option>
                                    </select>
                                  </div>
                                  <div className="form-group flex flex-col">
                                    <label
                                      htmlFor={`type-${formIndex}-${copyIndex}`}
                                    >
                                      Lump Sum Type
                                    </label>
                                    <select
                                      name="type"
                                      id={`type-${formIndex}-${copyIndex}`}
                                      className="border-b border-[grey] outline-none w-[180px]"
                                      value={formData.type}
                                      onChange={(e) =>
                                        handleFormInputChange(
                                          e,
                                          formIndex,
                                          copyIndex
                                        )
                                      }
                                      disabled
                                      required
                                    >
                                      <option value="">Select</option>
                                      <option value="Lump Sum">Lump Sum</option>
                                      <option value="Drainage Lump Sum">
                                        Drainage Lump Sum (Sales Tax Paid on
                                        Materials)
                                      </option>
                                      <option value="Electrical Lump Sum">
                                        Electrical Lump Sum (Sales Tax Paid on
                                        Materials)
                                      </option>
                                      <option value="Hardscape Lump Sum">
                                        Hardscape Lump Sum (Sales Tax Paid on
                                        Materials)
                                      </option>
                                      <option value="Irrigation Lump Sum">
                                        Irrigation Lump Sum (Sales Tax Paid on
                                        Materials)
                                      </option>
                                      <option value="Landscape Lump Sum">
                                        Landscape Lump Sum (Sales Tax Paid on
                                        Materials)
                                      </option>
                                      <option value="Mosquito Lump Sum">
                                        Mosquito Lump Sum (Sales Tax Paid on
                                        Materials)
                                      </option>
                                      <option value="Plumbing Lump Sum">
                                        Plumbing Lump Sum (Sales Tax Paid on
                                        Materials)
                                      </option>
                                      <option value="Pool Lump Sum">
                                        Pool Lump Sum (Sales Tax Paid on
                                        Materials)
                                      </option>
                                    </select>
                                  </div>
                                  <div className="form-group flex flex-col w-[180px]">
                                    <label
                                      htmlFor={`vendorName-${formIndex}-${copyIndex}`}
                                    >
                                      Vendor Name
                                    </label>
                                    <input
                                      type="text"
                                      className="border-b border-[grey] outline-none"
                                      id={`vendorName-${formIndex}-${copyIndex}`}
                                      name="vendorName"
                                      onChange={(e) =>
                                        handleFormInputChange(
                                          e,
                                          formIndex,
                                          copyIndex
                                        )
                                      }
                                      maxLength={50}
                                      value={formData.vendorName}
                                      placeholder="Enter Vendor Name"
                                      readOnly={true}
                                      // required
                                    />
                                  </div>
                                  <div className="form-group flex flex-col w-[180px]">
                                    <label
                                      htmlFor={`reference-${formIndex}-${copyIndex}`}
                                    >
                                      Description *
                                    </label>
                                    <input
                                      type="text"
                                      className="border-b border-[grey] outline-none"
                                      id={`reference-${formIndex}-${copyIndex}`}
                                      name="reference"
                                      onChange={(e) =>
                                        handleFormInputChange(
                                          e,
                                          formIndex,
                                          copyIndex
                                        )
                                      }
                                      value={formData.reference}
                                      maxLength={100}
                                      placeholder="Enter Description"
                                      required
                                      readOnly={true}
                                    />
                                  </div>
                                  {/* <JoditEditor
                                ref={editor}
                                // config={config}
                                value={formData.description}
                                // config={config}
                                tabIndex={1} // tabIndex of textarea
                                onBlur={(newContent) =>
                                  setFormData({
                                    ...formData,
                                    description: newContent,
                                  })
                                } // preferred to use only this option to update the content for performance reasons
                                onChange={(newContent) =>
                                  setFormData({
                                    ...formData,
                                    description: newContent,
                                  })
                                }
                              /> */}
                                  <div className="form-group flex flex-col">
                                    <label
                                      htmlFor={`source-${formIndex}-${copyIndex}`}
                                    >
                                      Taxable *
                                    </label>
                                    <select
                                      name="isTaxable"
                                      onChange={(e) =>
                                        handleFormInputChange(
                                          e,
                                          formIndex,
                                          copyIndex
                                        )
                                      }
                                      id={`isTaxable-${formIndex}-${copyIndex}`}
                                      className="border-b border-[grey] outline-none w-[180px]"
                                      value={formData.isTaxable}
                                      required
                                      disabled
                                    >
                                      <option value="">Select Option</option>
                                      <option value="true">Yes</option>
                                      <option value="false">No</option>
                                    </select>
                                  </div>
                                </>
                              )}

                              {["F&G", "Other"].includes(formData.source) && (
                                <>
                                  <div className="form-group flex flex-col">
                                    <label
                                      htmlFor={`measure-${formIndex}-${copyIndex}`}
                                    >
                                      Measure *
                                    </label>
                                    <input
                                      type="text"
                                      className="border-b border-[grey] outline-none"
                                      id={`measure-${formIndex}-${copyIndex}`}
                                      name="measure"
                                      onChange={(e) =>
                                        handleFormInputChange(
                                          e,
                                          formIndex,
                                          copyIndex
                                        )
                                      }
                                      value={formData.measure}
                                      placeholder="Enter measure"
                                      readOnly={
                                        formData.source === "Other"
                                          ? false
                                          : true
                                      }
                                      required
                                    />
                                  </div>

                                  <div className="form-group flex flex-col">
                                    <label
                                      htmlFor={`quantity-${formIndex}-${copyIndex}`}
                                    >
                                      Quantity *
                                    </label>
                                    <input
                                      type="number"
                                      className="border-b border-[grey] outline-none w-[180px]"
                                      id={`quantity-${formIndex}-${copyIndex}`}
                                      name="quantity"
                                      onChange={(e) =>
                                        handleFormInputChange(
                                          e,
                                          formIndex,
                                          copyIndex
                                        )
                                      }
                                      value={formData.quantity}
                                      placeholder="Enter Quantity"
                                      step="any"
                                      min={0}
                                      max={10000000}
                                      readOnly={true}
                                      required
                                    />
                                  </div>

                                  <div className="form-group flex flex-col">
                                    <label
                                      htmlFor={`price-${formIndex}-${copyIndex}`}
                                    >
                                      Price *
                                    </label>
                                    <input
                                      type="number"
                                      className="border-b border-[grey] outline-none"
                                      id={`price-${formIndex}-${copyIndex}`}
                                      name="price"
                                      onChange={(e) =>
                                        handleFormInputChange(
                                          e,
                                          formIndex,
                                          copyIndex
                                        )
                                      }
                                      value={formData.price}
                                      placeholder="Enter Price"
                                      // readOnly={
                                      //   formData.source === "Other" ? false : true
                                      // }
                                      min={0}
                                      max={10000000}
                                      step="any"
                                      required
                                      readOnly={true}
                                    />
                                  </div>
                                </>
                              )}

                              {formData.source === "Other" && (
                                <>
                                  <div className="form-group flex flex-col">
                                    <label
                                      htmlFor={`totalCost-${formIndex}-${copyIndex}`}
                                    >
                                      Total Cost *
                                    </label>
                                    <input
                                      type="number"
                                      className="border-b border-[grey] outline-none"
                                      id={`totalCost-${formIndex}-${copyIndex}`}
                                      name="totalCost"
                                      placeholder="Total cost goes here ..."
                                      onChange={(e) =>
                                        handleFormInputChange(
                                          e,
                                          formIndex,
                                          copyIndex
                                        )
                                      }
                                      value={formData.totalCost}
                                      min={0}
                                      required
                                      readOnly
                                    />
                                  </div>
                                  <div className="form-group flex flex-col">
                                    <label
                                      htmlFor={`markup-${formIndex}-${copyIndex}`}
                                    >
                                      Mark up
                                    </label>
                                    <input
                                      type="number"
                                      className="border-b border-[grey] outline-none w-[180px]"
                                      id={`markup-${formIndex}-${copyIndex}`}
                                      name="markup"
                                      placeholder="Enter percent"
                                      onChange={(e) =>
                                        handleFormInputChange(
                                          e,
                                          formIndex,
                                          copyIndex
                                        )
                                      }
                                      value={formData?.markup}
                                      min={0}
                                      max={100}
                                      required
                                      readOnly={true}
                                    />
                                  </div>
                                  <div className="form-group flex flex-col">
                                    <label
                                      htmlFor={`source-${formIndex}-${copyIndex}`}
                                    >
                                      Taxable
                                    </label>
                                    <select
                                      name="isTaxable"
                                      onChange={(e) =>
                                        handleFormInputChange(
                                          e,
                                          formIndex,
                                          copyIndex
                                        )
                                      }
                                      id={`isTaxable-${formIndex}-${copyIndex}`}
                                      className="border-b border-[grey] outline-none w-[180px]"
                                      value={formData.isTaxable}
                                      required
                                      disabled
                                    >
                                      <option value="">Select Option</option>
                                      <option value="true">Yes</option>
                                      <option value="false">No</option>
                                    </select>
                                  </div>
                                  <div className="form-group flex flex-col w-[180px]">
                                    <label
                                      htmlFor={`invoice-${formIndex}-${copyIndex}`}
                                    >
                                      Invoice
                                    </label>
                                    <input
                                      type="text"
                                      className="border-b border-[grey] outline-none"
                                      id={`invoice-${formIndex}-${copyIndex}`}
                                      name="invoice"
                                      onChange={(e) =>
                                        handleFormInputChange(
                                          e,
                                          formIndex,
                                          copyIndex
                                        )
                                      }
                                      value={formData.invoice}
                                      placeholder="Enter invoice"
                                      maxLength={100}
                                      disabled
                                      // required
                                    />
                                  </div>
                                  <div className="form-group flex flex-col w-[180px]">
                                    <label
                                      htmlFor={`PO-${formIndex}-${copyIndex}`}
                                    >
                                      P.O.
                                    </label>
                                    <input
                                      type="text"
                                      className="border-b border-[grey] outline-none"
                                      id={`PO-${formIndex}-${copyIndex}`}
                                      name="PO"
                                      onChange={(e) =>
                                        handleFormInputChange(
                                          e,
                                          formIndex,
                                          copyIndex
                                        )
                                      }
                                      value={formData.PO}
                                      placeholder="Enter PO"
                                      maxLength={100}
                                      disabled
                                      // required
                                    />
                                  </div>
                                </>
                              )}

                              {["F&G", "Other"].includes(formData.source) ? (
                                <div className="form-group flex flex-col">
                                  <label
                                    htmlFor={`totalPrice-${formIndex}-${copyIndex}`}
                                  >
                                    Total Price *
                                  </label>
                                  <input
                                    type="number"
                                    className="border-b border-[grey] outline-none"
                                    id={`totalPrice-${formIndex}-${copyIndex}`}
                                    name="totalPrice"
                                    placeholder="Total price goes here..."
                                    value={formData.totalPrice}
                                    readOnly
                                    min={0}
                                    step="any"
                                    required
                                  />
                                </div>
                              ) : (
                                <div className="form-group flex flex-col">
                                  <label
                                    htmlFor={`totalPrice-${formIndex}-${copyIndex}`}
                                  >
                                    Total Price *
                                  </label>
                                  <input
                                    type="number"
                                    className="border-b border-[grey] outline-none"
                                    id={`totalPrice-${formIndex}-${copyIndex}`}
                                    name="totalPrice"
                                    placeholder="Total price goes here..."
                                    value={formData.totalPrice}
                                    max={10000000}
                                    step="any"
                                    readOnly
                                    onChange={(e) =>
                                      handleFormInputChange(
                                        e,
                                        formIndex,
                                        copyIndex
                                      )
                                    }
                                    min={0}
                                    required
                                  />
                                </div>
                              )}

                              {formData.reference &&
                                formData.source === "F&G" && (
                                  <div className="form-group flex flex-col">
                                    <label
                                      htmlFor={`isTaxable-${formIndex}-${copyIndex}`}
                                    >
                                      Taxable
                                    </label>
                                    <input
                                      type="text"
                                      className="border-b border-[grey] outline-none"
                                      id={`isTaxable-${formIndex}-${copyIndex}`}
                                      name="isTaxable"
                                      onChange={(e) =>
                                        handleFormInputChange(
                                          e,
                                          formIndex,
                                          copyIndex
                                        )
                                      }
                                      value={formData.isTaxable ? "Yes" : "No"}
                                      placeholder="Enter isTaxable"
                                      disabled={true}
                                    />
                                  </div>
                                )}

                              {/* <button
                              type="button"
                              className="absolute top-3 right-5 bg-red-500 h-[30px] w-[30px] rounded-full"
                              onClick={() => deleteCopy(formIndex, copyIndex)}
                            >
                              <i className="fa fa-close text-white"></i>
                            </button> */}
                            </div>
                          ))}
                        <div className="text-center">
                          {/* <button
                          type="button"
                          title="Add Material"
                          className="bg-green-500 text-white h-[35px] w-[35px] rounded-full"
                          onClick={() => addCopy(formIndex)}
                        >
                          <i className="fa fa-plus"></i>
                        </button> */}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
              {/* <div className="card-footer">
                <button
                  className={`bg-[#00613e] text-white py-1 px-6 md:mr-3 mr-0`}
                  type="button"
                  data-toggle="modal"
                  data-target="#exampleModalCenter_saveAs"
                  data-dismiss="modal"
                >
                  Download
                </button>
              </div> */}
            </form>
            {/* <form action="" autoComplete="hidden">
              <input
                type="text"
                className="form-control"
                placeholder="Enter Staff Email"
                value={formData.email}
                onChange={handleInputChange}
                name="email"
                autoComplete="hidden"
                maxLength={40}
                required
              />
            </form> */}
          </div>
        </div>

        {/* Downloaded Copy */}
        <div className="" style={{ display: "none" }}>
          <div className="relative mb-20" id="content-to-pdf">
            <div className="p-3">
              <div className="flex flex-row gap-3 justify-between">
                <div className="flex flex-col w-1/3 md:w-[280px]">
                  <div className="p-0 capitalize">
                    {/* <h6 className="font-bold text-[13px]">Date</h6> */}
                    <p className="text-xs font-medium">
                      <span className="border-b border-black pb-[7px]">
                        PROJECT LOCATION
                      </span>
                    </p>
                  </div>
                  <div className="p-0 capitalize mt-1">
                    <p className="text-xs break-words capitalize">
                      {formData?.customerName?.toUpperCase()}
                    </p>
                  </div>

                  <div className="p-0 capitalize">
                    <p className="text-xs break-words capitalize">
                      {formData?.jobAddress?.toUpperCase()}
                    </p>
                  </div>

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
                    <img src={fng_logo} alt="F&G Logo" className="h-[140px]" />
                  </div>
                </div>
                <div className="flex flex-col w-1/3 md:w-[280px] text-end capitalize">
                  <div className="p-0">
                    <h6 className="font-bold text-[15px]">F&G INC</h6>
                    <pre
                      className="text-xs break-words p-0 pb-3 leading-4"
                      style={{ fontFamily: "Source Sans Pro" }}
                    >
                      {address}
                    </pre>
                  </div>
                  <div className="p-0">
                    <p className="text-xs break-words">{formData.bidCopyId}</p>
                  </div>
                  <div className="p-0">
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
            </div>

            <div className="w-full mt-1 py-1 text-[13px] overflow-x-scroll">
              {formData.forms.length > 0 || formData.forms.length > 0 ? (
                formData.forms.map((form, index) => (
                  <div key={index} className="mb-0">
                    <div className="px-0.5 mt-6">
                      <h6 className="font-semibold text-[13x] tracking-wide capitalize">
                        <span className="font-semibold text-[13px] tracking-wide capitalize">
                          <span className="border-b border-black pb-[7px]">
                            {form.jobName?.toUpperCase()} SERVICE
                          </span>
                        </span>
                        <div className="mt-1">
                          {form.description && (
                            <div className="font-normal text-xs capitalize ml-2">
                              {parse(form.description)}
                            </div>
                          )}
                        </div>
                      </h6>
                      {/* <h6 className="font-semibold text-[13px] tracking-wide capitalize flex border items-center">
                        <span className="font-semibold text-[13px] tracking-wide capitalize">
                          <span className="border-b border-black pb-[7px]">
                            {form.jobName?.toUpperCase()} SERVICE
                          </span>
                        </span>
                        {form.description && (
                          <span className="font-normal text-xs capitalize ml-2 flex">
                            : ( {parse(form.description)} )
                          </span>
                        )}
                      </h6> */}
                    </div>
                    <table className="w-full text-xs mt-6">
                      <thead className="">
                        <tr>
                          <th className="text-xs text-center">
                            <span className="relative -top-1.5">
                              DESCRIPTION
                            </span>
                          </th>
                          <th className="text-xs">
                            <span className="relative -top-1.5">SIZE</span>
                          </th>
                          <th className="text-xs">
                            <span className="relative -top-1.5">QUANTITY</span>
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
                        {form &&
                          form.copies &&
                          form.copies.length > 0 &&
                          form.copies.map((item, idx) => (
                            <tr key={idx}>
                              {/* <td className="text-xs">{item?.source}</td> */}
                              <td className="text-xs w-[400px] pr-2">
                                {item?.reference?.toUpperCase()}
                              </td>
                              <td className="text-xs">{item?.size}</td>
                              <td className="text-xs pl-4">
                                {item?.quantity
                                  ? item.quantity
                                  : ""}
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
                      </tbody>
                    </table>
                  </div>
                ))
              ) : (
                <p className="pb-2">No field copies available.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
