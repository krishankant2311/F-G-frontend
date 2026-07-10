import React, { useEffect, useRef, useState } from "react";
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

export default function ViewBidProject() {
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
    credits: 0,
    nonTaxCredits: 0,
    nonTaxDescription: "",
    taxCredits: 0,
    taxDescription: "",
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
  const { id, type } = useParams();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const [materialData, setMaterialData] = useState([]);
  const [laborData, setLaborData] = useState([]);
  const [fieldLaborData, SetFieldLaborData] = useState([]);
  const [laborTotal, setLaborTotal] = useState(0);
  const [materialsTotal, setMaterialsTotal] = useState(0);
  const [taxPercent, setTaxPercent] = useState(0);
  const [address, setAddress] = useState("");
  const [taxableAmount, setTaxableAmount] = useState(0);
  const [documentName, setDocumentName] = useState("");
  const [dateInput, setDateInput] = useState("");
  const [materialLaborData, setMaterialLaborData] = useState([]);

  const { tableSize } = useTableContext();

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
    getFGAddress();
    getBidedFieldCopyData();
    getTaxPercentage();
    window.scrollTo(0, 0);
    // Set selected crews based on the project data
  }, []);

  useEffect(() => {
    const selected = allCrews.filter((crew) => {
      return formData.crew.includes(crew._id);
    });
    setSelectedCrews(selected);
  }, [allCrews, formData]);

  const getTotalManHours = (startTime, endTime, totalLabors) => {
    const startHours = startTime.split(":")[0];
    const endHours = endTime.split(":")[0];
    let resultedHours = Math.abs(
      Number.parseInt(startHours) - Number.parseInt(endHours)
    );

    const startMinutes = startTime.split(":")[1];
    const endMinutes = endTime.split(":")[1];

    if (startMinutes > endMinutes) {
      resultedHours -= 1;
    } else if (startMinutes < endMinutes) {
      resultedHours += 1;
    }

    return totalLabors * resultedHours;
  };

  const getProjectById = async () => {
    try {
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
          credits: response.data.result?.credits || 0,
          projectCompletedDate: response.data.result?.projectCompletedDate,
          officeCopyId: response.data.result?.officeCopyId || "",
          bidCopyId: response.data.result?.bidCopyId || "",
          billAddress: response.data.result?.billAddress || "",
          jobName: response?.data?.result?.jobName || "",
          isProjectTaxable: response.data?.result?.isProjectTaxable,
          customerType: response.data?.result?.customerType || "Normal",
          nonTaxCredits: response.data.result?.nonTaxCredits || 0,
          nonTaxDescription: response.data.result?.nonTaxDescription || "",
          taxCredits: response.data.result?.taxCredits || 0,
          taxDescription: response.data.result?.taxDescription || "",
        });
        setProjectCode(response.data.result.projectCode);
        let doc_name = response?.data?.result?.customerName?.toUpperCase() || "";

        const date = formatDateToYYYYMMDD(response.data.result?.createdAt);
        setDateInput(date);

        // Create doc_name like customer name = last name + "_" + firstName
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
    setLoadingBtn(true);
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
        // setFieldCopiesArray(response.data.result.bidedCopiesData || []);
        // const summarizedData = summarizeFieldCopies(
        //   response.data.result.bidedCopiesData
        // );
        // setCategorizedFieldCopies([
        //   { category: "Field Copies", items: summarizedData },
        // ]);
        // console.log("Bided Copies", response.data.result?.bidedCopiesData);
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
                dataType: item.dataType,
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
            dataType: labor.dataType,
          };
        });
        const sortedData = moveLaborToBottom(
          response.data.result?.bidedCopiesData
        );
        setFieldCopies(sortedData || []);
        setMaterialData(resultedMaterials || []);
        SetFieldLaborData(laborData);
        let resultedLabors = [...laborData, ...fieldLabors];
        setLaborData(categorizeLabor(resultedLabors));
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
          totalPrice: 0,
          isLaborTaxable: item.isLaborTaxable,
          type: item.type,
          dataType: item.dataType,
        };
      }
      // Sum up the totalPrice for the current jobType and tax status combination
      result[key].totalPrice += item.totalPrice;
      return result;
    }, {});

    // Convert the result object to an array format
    return Object.values(categorizedData);
  }

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

      if (type == 1) {
        // if (!formData.foreman) {
        //   toast.error("Please select a foreman.");
        //   return;
        // }
        if (formData.crew.length === 0) {
          toast.error("Please select at least one crew member.");
          return;
        }
      }

      formdata.append("crew", formData.crew);
      // formdata.append("foreman", formData.foreman);
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

  const [jobType, setJobType] = useState("");

  useEffect(() => {
    getJobTypeById();
  }, [formData]);

  function moveLaborToBottom(data) {
    return data.sort((a, b) => {
      if (a.source === "Labor" && b.source !== "Labor") return 1;
      if (a.source !== "Labor" && b.source === "Labor") return -1;
      return 0;
    });
  }

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

  // console.log("Labor Data", laborData);

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

  const [categorizedFieldCopies, setCategorizedFieldCopies] = useState([]);

  // console.log("Categorized Fields", categorizedFieldCopies);

  const [categorizedBidFieldCopies, setCategorizedBidFieldCopies] = useState(
    []
  );

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
      if (
        summary[key].source.includes("Lump Sum") ||
        summary[key].source.includes("Labor")
      ) {
        summary[key].totalPrice = Number.parseFloat(summary[key].totalPrice);
      } else {
        summary[key].totalPrice = Number.parseFloat(summary[key].totalPrice);
      }
    });

    return Object.values(summary);
  };

  // useEffect(() => {
  //   const summarizedData = summarizeFieldCopies(fieldCopiesArray);
  //   setCategorizedFieldCopies([
  //     { category: "Field Copies", items: summarizedData },
  //   ]);
  //   if (bidedCopy.length > 0) {
  //     const summarizedBidedData = summarizeFieldCopies(bidedCopy);
  //     setCategorizedBidFieldCopies([
  //       { category: "Field Copies", items: summarizedBidedData },
  //     ]);
  //   }
  // }, [fieldCopies, bidedCopy]);

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
        // console.log("LL", Number.parseFloat(labor.totalPrice));
        taxAmount = taxAmount + Number.parseFloat(labor.totalPrice);
        // console.log("Labor taxable", labor, taxAmount);
      }
    }

    // console.log("Categorized field copies", laborData, taxAmount);
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

  function formatDateToYYYYMMDD(isoDate) {
    const dateObj = new Date(isoDate);
    return `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1)
      .toString()
      .padStart(2, "0")}-${dateObj.getDate().toString().padStart(2, "0")}`;
  }

  const deleteDraftCopy = async (date) => {
    try {
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
      };
      const formdata = new FormData();
      setDisableBtn(true);
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/project/delete-draft-copy/${id}/${date}`,
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
    }else if (jobType.toLowerCase() === "reimbursement total") {
      return "";
    } else if (jobType.includes("Lump Sum")) {
      return "";
    } else {
      return "MATERIAL";
    }
  };

  function formatAddress(address) {
    return address.replace(/(\d+)/, "\n$1");
  }

  return (
    <>
      <Layout>
        <ToastContainer />

        <div
          className={`${tableSize === 250 ? "md:ml-[250px]" : "md:ml-[90px]"}`}
        >
          <div className="lg:p-10 p-3">
            <div className="card">
              <div className="card-header bg-[#00613e] text-white">
                <h3 className="card-title relative top-2">
                  {" "}
                  <button
                    onClick={() => {
                      navigate(-1);
                    }}
                  >
                    <i className="fa fa-arrow-left mr-2"></i>
                  </button>{" "}
                  View Bid
                </h3>
                {loadingBtn && formData.status === "Active" && (
                  <div className=" text-end">
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
                {loadingBtn &&
                  ["Delete", "Ongoing"].includes(formData?.status) && (
                    <div className="">
                      <div className=" text-end">
                        <button
                          className="text-blue bg-white px-3 py-1 text-sm"
                          onClick={markAsCompleted}
                        >
                          Mark as Completed
                        </button>
                        <button
                          className="text-blue bg-white px-3 py-1 text-sm ml-2 md:mt-0 mt-2"
                          onClick={downloadPdf}
                        >
                          Download Field Copy
                        </button>
                      </div>
                    </div>
                  )}
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
                        <label htmlFor="customerEmail">Project Code *</label>
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
                          {/* <div className="form-group">
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
                          </div> */}
                          <div className="form-group">
                            <label htmlFor="crew">Select Crew *</label>
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
                                <div className="dropdown-content border-[1px] border-[#d1d1d1] bg-white max-h-[200px] overflow-auto">
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
                                className="selected-crew bg-[#00613e] text-white flex justify-center items-center rounded-full px-2 h-[32px] text-sm"
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
                          readOnly={true}
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
                  {type == 0 && (
                    <>
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
                                ? "bg-primary"
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
                    </>
                  )}
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
                  {type == 0 && (
                    <div className="form-group mt-3">
                      <label htmlFor="projectManager">Project Manager</label>
                      <input
                        type="text"
                        className="form-control"
                        id="projectManager"
                        placeholder="Enter Project Manager"
                        value={formData.projectManager}
                        onChange={handleInputChange}
                        name="projectManager"
                        maxLength={50}
                        required
                        readOnly
                      />
                    </div>
                  )}

                  {/* Credits */}
                  {/* <div className="form-group">
                    <label htmlFor="credits">Credits *</label>
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

                  <div className="form-group">
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

                  {type == 0 && (
                    <>
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
                    </>
                  )}
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

              {type == 1 &&
              ["Active", "Ongoing", "Completed", "Billed"].includes(
                formData.status
              ) ? (
                <>
                  <div className="">
                    <div className="bg-[#00613e] text-white p-3 py-2 mt-10 flex justify-between items-center">
                      <div className="">
                        <h3 className="">Costing</h3>
                      </div>
                      <div className="">
                        <button
                          className="text-blue bg-white px-3 py-1 text-sm"
                          type="button"
                          onClick={() => {
                            navigate(
                              `/panel/office/project/field-copy/bided/edit/${id}`
                            );
                          }}
                        >
                          Edit Bid
                        </button>
                      </div>
                    </div>
                    <div className="card-body">
                      <div className="w-full mt-6 text-[15px]">
                        {categorizedFieldCopies.length > 0 ? (
                          categorizedFieldCopies.map((group, index) => (
                            <div key={index} className="mb-8">
                              <table className="w-full table table-striped">
                                <thead>
                                  <tr>
                                    <th>Source</th>
                                    <th>Description</th>
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
                                      <td className="w-[400px] pr-2">
                                        {item?.reference?.toUpperCase()}
                                      </td>
                                      <td>{item?.size}</td>
                                      <td>
                                        {item?.quantity
                                          ? item.quantity
                                          : ""}
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
                                          <td colSpan={4}></td>
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
                                  <tr>
                                    <td colSpan="3" className="font-bold">
                                      SUBTOTAL:
                                    </td>
                                    <td>
                                      {/* {group.items.reduce(
                                        (acc, item) => acc + item.quantity,
                                        0
                                      )} */}
                                    </td>
                                    <td>
                                      {/* {group.items
                                        .reduce(
                                          (acc, item) => acc + item.price,
                                          0
                                        )
                                        .toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })} */}
                                    </td>
                                    <td>
                                      {(
                                        group.items.reduce(
                                          (acc, item) => acc + item.totalPrice,
                                          0
                                        ) + laborTotal
                                      ).toLocaleString("en-US", {
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
                        )}
                      </div>
                      <div className="text-[15px]">
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
                      <div className="w-full mb-10 mt-6 text-[15px] flex justify-end flex-col md:flex-row gap-4 ">
                        <button
                          className={`bg-[#00613e] text-white py-1 px-6 ${
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
                          title={
                            (formData &&
                              formData.taxCredits > taxableAmount &&
                              formData.isProjectTaxable) ||
                            materialsTotal + laborTotal <
                              formData.taxCredits + formData.nonTaxCredits
                              ? "Please ensure the credits are less than the taxable amount/ sub total amount."
                              : ""
                          }
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
                          ["Ongoing", "Completed"].includes(
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
                                    <h4 className=" font-bold w-[160px]">
                                      {formatDateToString(copy.entryDate)}
                                    </h4>
                                    <button
                                      title="Click to view"
                                      onClick={() => {
                                        navigate(
                                          "/panel/office/project/field-copy/date",
                                          {
                                            state: {
                                              data: {
                                                copies: copy.fieldCopies,
                                                totalManHours: getTotalManHours(
                                                  copy.startTime,
                                                  copy.endTime,
                                                  copy.laborCount
                                                ),
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
                                    <hr />
                                  </div>
                                  {copy?.draftCopies?.length > 0 && (
                                    <div
                                      key={copy.entryDate}
                                      className="field-copy-group mt-2 flex gap-10 ml-3"
                                    >
                                      <h4 className=" font-bold w-[160px]">
                                        {formatDateToString(copy.entryDate)}
                                      </h4>
                                      <button
                                        title="Click to view"
                                        onClick={() => {
                                          navigate(
                                            "/panel/office/project/field-copy/date",
                                            {
                                              state: {
                                                data: {
                                                  copies: copy.draftCopies,
                                                  totalManHours:
                                                    getTotalManHours(
                                                      copy.startTime,
                                                      copy.endTime,
                                                      copy.laborCount
                                                    ),
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
                                  <h4 className=" font-bold w-[160px]">
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
                                      title="Click to edit"
                                      onClick={() => {
                                        deleteDraftCopy(copy.entryDate);
                                      }}
                                      className="ml-3"
                                    >
                                      <i className="fa fa-trash"></i>
                                    </button>
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
            <div className="" style={{ display: "none" }}>
              <div className="relative mb-20" id="content-to-pdf">
                <div className="p-3">
                  {/* Project data */}
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
                        {/* <h6 className="font-bold text-[13px]">Job Address</h6> */}
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
          <h6 className="font-bold text-[13px]">Job Address</h6>
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
                          className="text-xs break-words p-0 pb-3 leading-4"
                          style={{ fontFamily: "Source Sans Pro" }}
                        >
                          {address}
                        </pre>
                      </div>
                      <div className="p-0">
                        <p className="text-xs break-words">
                          {formData.bidCopyId}
                        </p>
                      </div>
                      <div className="p-0">
                        {/* <h6 className="font-bold text-[13px]">Project Code</h6> */}
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
                  <div className="px-0.5 mt-6">
                    <h6 className="font-semibold text-[13x] tracking-wide capitalize">
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
                    <p className="text-xs break-words mt-1">
                      {parse(formData.description)}
                    </p>
                  </div>

                  {/* Compiled Material */}
                  <div className="w-full mt-3 py-1 text-[13px] overflow-x-scroll">
                    {categorizedFieldCopies.length > 0 ||
                    laborData.length > 0 ? (
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
                      PROPOSAL SUMMARY
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
                                {item.jobType?.toUpperCase()}{" "}
                                {item.source === "Labor"
                                  ? "LABOR"
                                  : handleInvoiceJobType(item.jobType)}
                              </b>
                              {/* <b>
                                  {["Labor", "Lump Sum", "Other"].includes(
                                    material.source
                                  )
                                    ? material.isTaxable
                                      ? "RT"
                                      : "RNT"
                                    : "RT"}
                                </b> */}
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
                </div>

                {/* Invoice Summary */}
                <div className="w-full mt-5 text-[13px] bg-[whitesmoke] px-3 py-2">
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
                    <div className="flex justify-between my-1.5">
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
          </div>
        </div>
      </Layout>
    </>
  );
}
