import React, { useEffect, useRef, useMemo, useState } from "react";
import Layout from "../../layout/Layout";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTableContext } from "../../../context/TableContext";
import { useNavigate, useParams } from "react-router-dom";
import Select from "react-select";
import "../../../styles/scrollbar.css";
import "../../../styles/scrollbar.css";
import JoditEditor from "jodit-react";
import {
  applyReferenceVendorToForm,
  ensureFgCostFromPrice,
  getMaterialNameInputValue,
  otherFieldCopyCostDisplayValue,
  recalcOtherFieldCopyLine,
  toPersistedCopy,
} from "../../../utils/materialReference";

export default function AddFieldCopyForm() {
  const [forms, setForms] = useState([
    {
      source: "F&G",
      type: "",
      vendorName: "",
      referenceBase: "",
      markup: 100,
      markUp: 100,
      cost: 0,
      reference: "",
      measure: "",
      quantity: "",
      price: "",
      totalCost: 0,
      totalPrice: 0,
      invoice: "",
      PO: "",
      isTaxable: false,
      startTime: "",
      endTime: "",
      startDate: Date.now(),
      endDate: Date.now(),
    },
  ]);
  const [formData, setFormData] = useState({
    crew: [],
  });
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [jobTypes, setJobTypes] = useState([]);
  const [fieldJobType, setFieldJobType] = useState("");
  const [fieldJobCost, setFieldJobCost] = useState(0);
  const [totalLabors, setTotalLabors] = useState(0);
  const [materials, setMaterials] = useState([]);
  const [adminTax, setAdminTax] = useState(0);
  const [allCrews, setAllCrews] = useState([]);
  const [disableBtn, setDisableBtn] = useState(false);
  const [totalManHours, setTotalManHours] = useState(0);
  const [selectedCrews, setSelectedCrews] = useState([]);
  const [isLabor, setIsLabor] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [entryDate, setEntryDate] = useState("");
  const [note, setNote] = useState("");
  const navigate = useNavigate();
  const { id } = useParams();
  const dropdownRef = useRef(null); // Reference to dropdown

  const editor = useRef(null);
  const config = useMemo(
    () => ({
      readonly: false,
      placeholder: "",
    }),
    []
  );

  // const [selectedOption, setSelectedOption] = useState(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".relative")) {
        setDropdownVisibility(forms.map(() => false)); // Close all dropdowns
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [forms]);

  useEffect(() => {
    getProjectById();
    getMaterials();
    getJobTypes();
    getAllCrews();
    getTaxPercentage();
    window.scrollTo(0, 0);
  }, []);

  const handleCrewChange = (crew) => {
    const isSelected = selectedCrews.some(
      (selectedCrew) => selectedCrew._id === crew._id
    );

    if (isSelected) {
      // Remove crew if already selected
      const crews = selectedCrews?.filter(
        (selectedCrew) => selectedCrew._id !== crew._id
      );
      setSelectedCrews(crews);
      setFormData({
        ...formData,
        crew: formData.crew?.filter((crewId) => crewId !== crew._id),
      });
      const manHours = getTotalManHours(startTime, endTime, crews.length);
      setTotalLabors(crews.length || 0);
      setTotalManHours(manHours);
    } else {
      // Add crew if not selected
      setSelectedCrews([...selectedCrews, crew]);
      setFormData({
        ...formData,
        crew: [...formData.crew, crew._id],
      });
      const manHours = getTotalManHours(
        startTime,
        endTime,
        [...selectedCrews, crew].length
      );
      setTotalLabors([...selectedCrews, crew].length || 0);
      setTotalManHours(manHours);
    }
  };

  const removeCrew = (crewId) => {
    const crews = selectedCrews.filter((crew) => crew._id !== crewId);
    setSelectedCrews(crews);
    setFormData({
      ...formData,
      crew: formData.crew.filter((id) => id !== crewId),
    });
    const manHours = getTotalManHours(startTime, endTime, crews.length);
    setTotalLabors(crews.length || 0);
    setTotalManHours(manHours);
  };

  const { tableSize } = useTableContext();

  const handleJobTypeChange = (e) => {
    setFieldJobType(e.target.value);
    // const updatedForms = forms.map((formData) => ({
    //   ...formData,
    //   type: e.target.value,
    // }));
    // setForms(updatedForms);
    const jobTypePrice =
      Number.parseFloat(
        jobTypes.find((type) => type.jobName === e.target.value)?.price
      ) || 0;
    setFieldJobCost(jobTypePrice);
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
        const activeCrews = response.data.result.map;
        setAllCrews(response.data.result);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.log("Error", error);
    }
  };

  const handleInputChange = (e, index) => {
    const { name, value } = e.target;
    const updatedForms = [...forms];

    if (name === "source") {
      const fgDefaultMarkup = 100;
      updatedForms[index] = {
        ...updatedForms[index],
        [name]: value,
        type: value.includes("Lump Sum")
          ? value
          : value.includes("Other")
            ? fieldJobType
            : "",
        reference: "",
        referenceBase: "",
        measure: "",
        quantity: "",
        price: "",
        cost: "",
        markup:
          value === "F&G"
            ? fgDefaultMarkup
            : updatedForms[index].markup ?? updatedForms[index].markUp ?? 0,
        markUp:
          value === "F&G"
            ? fgDefaultMarkup
            : updatedForms[index].markUp ?? updatedForms[index].markup ?? 0,
        totalPrice: "",
        totalCost: "",
        isTaxable: true,
      };
      if (value === "Other") {
        updatedForms[index] = recalcOtherFieldCopyLine(updatedForms[index]);
      }
    }

    if (name === "type") {
      updatedForms[index] = {
        ...updatedForms[index],
        [name]: value,
        reference: "",
        referenceBase: "",
        measure: "",
        quantity: "",
        price: "",
        cost: "",
        markup: updatedForms[index].markup ?? updatedForms[index].markUp ?? 0,
        totalPrice: "",
        isTaxable: value === "Equipment Fees" ? false : true,
        // updatedCopy.isTaxable = value === "Equipment Lump Sum" || "Equipment Fees" ? false : true; 

      };
    }

    const updatedForm = { ...updatedForms[index], [name]: value };

    if (name === "markup" || name === "markUp") {
      const mVal = parseFloat(value);
      const normalized =
        value === "" || Number.isNaN(mVal) ? "" : mVal;
      updatedForm.markup = normalized;
      updatedForm.markUp = normalized;
    }

    if (name === "cost" || name === "totalCost") {
      if (updatedForm.source === "Other") {
        updatedForm.cost =
          value === "" ? "" : parseFloat(value) || 0;
      } else if (name === "cost") {
        updatedForm.cost = parseFloat(value) || 0;
      }
    }

    // if(name === "vendorName"){
    //   if(containsNumberOrSpecialChar(e.target.value)){
    //     toast.error("Vendor name cannot contain numbers or special characters.");
    //     return;
    //   }
    // }

    // if(name === "reference"){
    //   if(containsNumberOrSpecialChar(e.target.value)){
    //     toast.error("Material name cannot contain numbers or special characters.");
    //     return;
    //   }
    // }

    // if(name === "measure"){
    //   if(containsNumberOrSpecialChar(e.target.value)){
    //     toast.error("Measure cannot contain numbers or special characters.");
    //     return;
    //   }
    // }
    // ✅ AUTO CALCULATION FOR LUMP SUM & LABOR
  if (
    updatedForm.source === "Lump Sum" ||
    updatedForm.source === "Labor"
  ) {
    const cost = parseFloat(updatedForm.cost) || 0;
    const markupPercent = parseFloat(updatedForm.markUp) || 0;

    updatedForm.totalCost = cost;
    updatedForm.totalPrice = cost + (cost * markupPercent) / 100;
  }

    // Calculate total price if both price and quantity are filled
    if (name === "price" || name === "quantity") {
      const price = parseFloat(updatedForm.price) || 0;
      const quantity = parseFloat(updatedForm.quantity) || 0;
      if (updatedForm.source === "Other") {
        Object.assign(
          updatedForm,
          recalcOtherFieldCopyLine(updatedForm)
        );
      } else {
        if (updatedForm.source === "F&G") {
          Object.assign(updatedForm, ensureFgCostFromPrice(updatedForm));
        }
        updatedForm.totalPrice = price && quantity ? price * quantity : "";
        updatedForm.totalCost = price && quantity ? price * quantity : "";
      }
    }

    if (name === "markup" || name === "markUp") {
      const isTax =
        updatedForm.isTaxable === "true" || updatedForm.isTaxable === true
          ? true
          : false;
      const markup =
        parseFloat(updatedForm.markup ?? updatedForm.markUp) || 0;
      if (updatedForm.source === "Other") {
        Object.assign(
          updatedForm,
          recalcOtherFieldCopyLine(updatedForm)
        );
      } else {
        let costBase;
        if (updatedForm.source === "F&G") {
          costBase =
            parseFloat(updatedForm.totalCost) ||
            parseFloat(updatedForm.cost) ||
            0;
          updatedForm.totalCost = costBase;
        } else {
          costBase = parseFloat(updatedForm.totalCost) || 0;
        }
        if (false) {
          const intermediatePrice =
            costBase + (markup * costBase) / 100;
          updatedForm.totalPrice =
            intermediatePrice + (adminTax * intermediatePrice) / 100;
        } else {
          updatedForm.totalPrice = costBase + (markup * costBase) / 100;
        }
      }
    }

    if (name === "isTaxable") {
      if (updatedForm.source === "Other") {
        Object.assign(
          updatedForm,
          recalcOtherFieldCopyLine(updatedForm)
        );
      } else {
        const markup = parseFloat(updatedForm.markup) || 0;

        if (false) {
          const intermediatePrice =
            updatedForm.totalCost + (markup * updatedForm.totalCost) / 100;
          updatedForm.totalPrice =
            intermediatePrice + (adminTax * intermediatePrice) / 100;
        } else {
          const intermediatePrice =
            updatedForm.totalCost + (markup * updatedForm.totalCost) / 100;
          updatedForm.totalPrice =
            intermediatePrice + (0 * intermediatePrice) / 100;
        }
      }
      updatedForm.isTaxable =
        updatedForm.isTaxable === "true" || updatedForm.isTaxable === true
          ? true
          : false;
    }

    if (name === "reference") {
      updatedForm.referenceBase = value;
    }

    updatedForms[index] = applyReferenceVendorToForm(updatedForm);
    setForms(updatedForms);
  };

  const handleMaterialChange = (e, index) => {
    // const materialName = e.target.value;
    const materialName = e;
    // console.log("Material Name", index, materialName);
    const material = materials.find(
      (material) => material.name === materialName
    );
    const updatedForms = [...forms];
    const rawMatMarkup = material.markUp;
    const numMarkup = Number.parseFloat(rawMatMarkup);
    const resolvedMarkup =
      rawMatMarkup === null ||
      rawMatMarkup === undefined ||
      rawMatMarkup === "" ||
      Number.isNaN(numMarkup) ||
      numMarkup === 0
        ? 100
        : numMarkup;

    let row = {
      ...updatedForms[index],
      referenceBase: material.name,
      reference: material.name,
      measure: material.measure,
      price: material.price,
      cost: material.cost,
      markUp: resolvedMarkup,
      markup: resolvedMarkup,
      isTaxable: material.isTaxable,
      totalPrice:
        Number.parseFloat(material.price) *
        Number.parseFloat(forms[index].quantity),
    };
    if (updatedForms[index].source === "F&G") {
      row = ensureFgCostFromPrice(row);
    }
    updatedForms[index] = applyReferenceVendorToForm(row);
    setForms(updatedForms);

    // Close the dropdown for the current form
    const updatedVisibility = [...dropdownVisibility];
    updatedVisibility[index] = false;
    setDropdownVisibility(updatedVisibility);
  };

  const [dropdownVisibility, setDropdownVisibility] = useState(
    forms.map(() => false) // Initialize visibility for each form
  );
  const [searchTerm, setSearchTerm] = useState(""); // Track search term for filtering
  const dropdownRefs = useRef([]);

  const toggleDropdownVisibility = (index) => {
    const updatedVisibility = [...dropdownVisibility];

    // Reset all dropdowns to false except the one being toggled
    updatedVisibility.forEach((_, i) => {
      if (i !== index) updatedVisibility[i] = false;
    });

    // Toggle the current dropdown
    updatedVisibility[index] = !updatedVisibility[index];

    setDropdownVisibility(updatedVisibility);

    // Reset search term when opening a new dropdown
    if (updatedVisibility[index]) {
      setSearchTerm("");
    }
  };

  useEffect(() => {
    const handleOutsideClick = (event) => {
      // Check if the clicked element is not inside any of the dropdowns
      if (
        dropdownRefs.current.every((ref) => ref && !ref.contains(event.target))
      ) {
        setDropdownVisibility(forms.map(() => false)); // Close all dropdowns
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [forms]); // No need to include dropdownVisibility in the dependency array

  // Handle search term change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  function containsNumberOrSpecialChar(text) {
    // Regular expression to check for numbers (0-9) or special characters
    const regex = /[0-9!@#$%^&*(),.?":{}|<>]/;

    // Test the text against the regex
    return regex.test(text);
  }

  const getTotalManHours = (startTime, endTime, totalPerson = 0) => {
    const startParts = startTime.split(":");
    const endParts = endTime.split(":");

    const startHours = Number.parseInt(startParts[0], 10);
    const startMinutes = Number.parseInt(startParts[1], 10);
    const endHours = Number.parseInt(endParts[0], 10);
    const endMinutes = Number.parseInt(endParts[1], 10);

    // Calculate total minutes for both times
    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;

    // Calculate the difference in minutes
    let differenceInMinutes = endTotalMinutes - startTotalMinutes;

    // Ensure we have a non-negative difference
    if (differenceInMinutes < 0) {
      console.warn("End time is earlier than start time.");
      return 0; // or handle the case as needed
    }

    // Convert minutes back to hours
    const resultedHours = differenceInMinutes / 60;

    // Return the total man-hours
    return totalPerson * resultedHours;
  };

  const handleTimeChange = (e) => {
    const name = e.target.name;
    const value = e.target.value;

    let manHours = 0;
    if (name === "startTime") {
      // start time should not be greater than end time
      // if (value >= endTime) {
      //   toast.error("Start time should not be greater than end time.");
      //   return;
      // }
      manHours = getTotalManHours(value, endTime, totalLabors);
      setStartTime(value);
    }
    if (name === "endTime") {
      // end time should not be less than start time
      // if (value <= startTime) {
      //   toast.error("End time should not be less than start time.");
      //   return;
      // }
      manHours = getTotalManHours(startTime, value, totalLabors);
      setEndTime(value);
    }

    setTotalManHours(manHours || 0);
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
        setAdminTax(response.data.result.taxPercent);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response.message);
    }
  };

  const getProjectById = async () => {
    try {
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/project/get-field-copy-timing/${id}`,
        { headers: headers }
      );
      if (response.data.statusCode === 200) {
        if (!response.data.result.isProjectStarted) {
          navigate(-1);
        }
        setStartTime(response.data.result.startTime);
        setEndTime(response.data.result.endTime);
        setTotalManHours(0);
        // setTotalLabors(response.data.result.totalLabors);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response.message);
    }
  };

  const addForm = () => {
    setForms([
      ...forms,
      {
        source: "F&G",
        type: "",
        vendorName: "",
        referenceBase: "",
        markup: 100,
        markUp: 100,
        cost: 0,
        reference: "",
        measure: "",
        quantity: "",
        price: "",
        PO: "",
        invoice: "",
        totalPrice: "",
        isTaxable: true,
      },
    ]);
  };

  const deleteForm = (index) => {
    const updatedForms = forms.filter((_, i) => i !== index);
    setForms(updatedForms);
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

  // const mergeLaborAndMaterial = (resultedForm) => {
  //   console.log("Handle Material",resultedForm);
  //   const isLaborExistInMaterial = resultedForm.some((form) => {
  //     console.log("Form Materials",form)
  //     console.log(form.jobType,fieldJobType,form.jobType === fieldJobType);
  //     return form.jobType === fieldJobType
  //   });
  //   if(isLaborExistInMaterial){
  //     resultedForm = resultedForm.map((form) => {
  //       if(form.jobType === fieldJobType){
  //         form.totalCost = totalManHours * fieldJobCost;
  //         form.isLaborTaxable = fieldJobTaxable;
  //       }
  //       return form;
  //     })
  //   }else{
  //     resultedForm = [...resultedForm, {
  //       jobType : fieldJobType,
  //       isLaborTaxable : fieldJobTaxable,
  //       totalCost : totalManHours * fieldJobCost,
  //       copies : [],
  //     }]
  //   }

  //   return resultedForm;
  // }

  const compileFormData = (forms) => {
    const compiled = {};

    forms.forEach((form) => {
      const persisted = toPersistedCopy(form);
      const { reference, measure, quantity, price, totalPrice, type, cost, markup, markUp, totalCost } = persisted;
      // Use both reference and measure as the key
      const key = `${type}-${reference}`;

      if (compiled[key]) {
        compiled[key].quantity += parseFloat(quantity);
        compiled[key].totalPrice += parseFloat(totalPrice);
        compiled[key].totalCost += parseFloat(totalCost || cost || 0);
        compiled[key].startTime = startTime;
        compiled[key].endTime = endTime;
        // Preserve cost and markup from the first item (same item should have same cost/markup)
        if (!compiled[key].cost && (cost || cost === 0)) {
          compiled[key].cost = parseFloat(cost);
        }
        if ((!compiled[key].markup && !compiled[key].markUp) && (markup || markUp || markup === 0 || markUp === 0)) {
          compiled[key].markup = parseFloat(markup || markUp || 0);
          compiled[key].markUp = parseFloat(markUp || markup || 0);
        }
      } else {
        compiled[key] = {
          ...persisted,
          quantity: parseFloat(quantity),
          totalPrice: parseFloat(totalPrice),
          totalCost: parseFloat(totalCost || cost || 0),
          cost: parseFloat(cost || 0),
          markup: parseFloat(markup || markUp || 0),
          markUp: parseFloat(markUp || markup || 0),
          startTime: startTime,
          endTime: endTime,
        };
      }
    });

    return Object.values(compiled);
  };

  const groupByType = (compiledData, laborData) => {
    const groupedData = compiledData.reduce((acc, item) => {
      const { type, ...copyData } = item;

      // Find the existing group in the accumulator by jobType
      let existingGroup = acc.find((group) => group.jobType === type);

      // Find the corresponding labor information for the current type
      const laborInfo = jobTypes.find((labor) => labor.jobName === type);

      // Get labor cost and taxable status, default to 0 and false if not found
      const laborCost = 0;
      const isLaborTaxable = laborInfo ? laborInfo.isTaxable : false;

      if (existingGroup) {
        // Set the labor cost only once, not for every copy
        if (existingGroup.totalCost === 0) {
          existingGroup.totalCost = laborCost;
        }

        // If any labor is taxable, set the group as taxable
        if (isLaborTaxable) {
          existingGroup.isLaborTaxable = true;
        }

        // Add the current item's details to the copies array
        existingGroup.copies.push({ ...copyData, type });
      } else {
        // Create a new entry if the jobType does not exist in the accumulator
        acc.push({
          jobType: type,
          totalCost: laborCost, // Set the labor cost once
          isLaborTaxable: isLaborTaxable,
          manHours: 0,
          jobTypeCost: laborInfo ? laborInfo.price : 0,
          startTime: startTime,
          endTime: endTime,
          copies: [{ ...copyData, type }],
        });
      }

      return acc;
    }, []); // Start with an empty array to accumulate the groups

    // Add any labor data that doesn't exist in compiledData
    laborData.forEach((labor) => {
      const { jobType, totalPrice, isLaborTaxable } = labor;

      // Check if this labor jobType already exists in groupedData
      if (!groupedData.find((group) => group.jobType === jobType)) {
        groupedData.push({
          jobType,
          totalCost: totalPrice || 0,
          isLaborTaxable,
          manHours: 0,
          startTime: startTime,
          endTime: endTime,
          jobTypeCost: fieldJobCost,
          copies: [], // No corresponding compiledData, so copies are empty
        });
      }
    });

    return groupedData;
  };

  // const groupByType = (compiledData, laborData) => {
  //   const {jobName, totalPrice, isLaborTaxable} = laborData;
  //   const groupedData = compiledData.reduce((acc, item) => {
  //     const { type, ...copyData } = item;

  //     // Find the existing group in the accumulator by jobType
  //     let existingGroup = acc.find((group) => group.jobType === type);

  //     // Find the corresponding labor information for the current type
  //     // const laborInfo = laborData.find((labor) => labor.jobName === type);

  //     // // Get labor cost and taxable status, default to 0 and false if not found
  //     // const laborCost = laborInfo ? totalManHours * fieldJobCost : 0;
  //     // const isLaborTaxable = laborInfo ? laborInfo.isTaxable : false;

  //     if (existingGroup) {
  //       // Set the labor cost only once, not for every copy
  //       if (existingGroup.totalCost === 0) {
  //         existingGroup.totalCost = totalPrice;
  //       }

  //       // If any labor is taxable, set the group as taxable
  //       if (isLaborTaxable) {
  //         existingGroup.isLaborTaxable = true;
  //       }

  //       // Add the current item's details to the copies array
  //       existingGroup.copies.push({ ...copyData, type });
  //     } else {
  //       // Create a new entry if the jobType does not exist in the accumulator
  //       acc.push({
  //         jobType: type,
  //         totalCost: totalPrice, // Set the labor cost once
  //         isLaborTaxable: isLaborTaxable,
  //         copies: [{ ...copyData, type }],
  //       });
  //     }

  //     return acc;
  //   }, []); // Start with an empty array to accumulate the groups

  //   // Add any labor data that doesn't exist in compiledData
  //   // laborData.forEach((labor) => {
  //   //   const { jobType, totalPrice, isLaborTaxable } = labor;

  //   //   // Check if this labor jobType already exists in groupedData
  //   //   if (!groupedData.find((group) => group.jobType === jobType)) {
  //   //     groupedData.push({
  //   //       jobType,
  //   //       totalCost: totalPrice,
  //   //       isLaborTaxable,
  //   //       copies: [], // No corresponding compiledData, so copies are empty
  //   //     });
  //   //   }
  //   // });

  //   // Check if this labor jobType already exists in groupedData
  //   if (!groupedData.find((group) => group.jobType === jobName)) {
  //     groupedData.push({
  //       jobType : jobName,
  //       totalCost: totalPrice,
  //       isLaborTaxable,
  //       copies: [], // No corresponding compiledData, so copies are empty
  //     });
  //   }

  //   return groupedData;
  // };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const compiledForms = compileFormData(forms);
    // Find the corresponding labor information for the current type
    const laborInfo = jobTypes.find((labor) => labor.jobName === fieldJobType);
    // const groupedForms = groupByType(compiledForms, {
    //   jobName: fieldJobType,
    //   totalPrice: totalManHours * fieldJobCost,
    //   isLaborTaxable: laborInfo.isTaxable,
    // });
    const groupedForms = groupByType(compiledForms, []);
    // Debug: Check if cost field is present in groupedForms
    console.log("Grouped Forms:", groupedForms);
    if (groupedForms.length > 0 && groupedForms[0].copies && groupedForms[0].copies.length > 0) {
      console.log("First copy item:", groupedForms[0].copies[0]);
      console.log("Cost in first copy:", groupedForms[0].copies[0].cost);
      console.log("Markup in first copy:", groupedForms[0].copies[0].markup, groupedForms[0].copies[0].markUp);
    }
    // return;
    try {
      let isValidPrice = forms.some((form) => {
        return (
          Number.parseFloat(form.price) * Number.parseFloat(form.quantity) !==
          Number.parseFloat(form.totalPrice) && form.source === "F&G"
        );
      });

      if (isValidPrice) {
        toast.error("Please ensure all field copies have valid prices.");
        return;
      }
      if (forms.length === 0 && !isLabor) {
        toast.error("Please add some data.");
        return;
      }

      if (isLabor && totalLabors === 0) {
        toast.error("Please select the labors");
        return;
      }

      if (isLabor && fieldJobType === "") {
        toast.error("Please select the Job Type");
        return;
      }

      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
      };

      const totalLaborCost = totalManHours * fieldJobCost;
      // console.log("Forms", forms)
      // return
      setDisableBtn(true);

      const formdata = new FormData();
      formdata.append("entryDate", entryDate);
      formdata.append("startTime", startTime);
      formdata.append("endTime", endTime);
      formdata.append("jobType", fieldJobType);
      formdata.append("forms", JSON.stringify(groupedForms));
      formdata.append("totalLaborCost", totalLaborCost);
      formdata.append("isLabor", isLabor);
      formdata.append("laborCount", totalLabors);
      formdata.append("crew", JSON.stringify(selectedCrews));
      formdata.append("note", note);
      formdata.append("totalManHours", totalManHours);

      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/project/add-field-copy/${id}`,
        formdata,
        {
          headers: headers,
        }
      );

      if (response.data.statusCode === 201) {
        toast.success(response.data.message);
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

  return (
    <Layout>
      <div
        className={`${tableSize === 250 ? "md:ml-[250px]" : "md:ml-[90px]"}`}
      >
        <ToastContainer />
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
                Add Field Copy
              </h3>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="card-body">
                <div className="flex justify-end gap-4 mr-2">
                  <div className="form-group flex flex-col">
                    <label htmlFor="project">Date *</label>
                    <input
                      type="date"
                      id="entryDate"
                      name="entryDate"
                      className="border-[1px] border-[black] outline-none w-[140px] p-1 text-sm rounded-[2px]"
                      value={entryDate}
                      onChange={(e) => {
                        setEntryDate(e.target.value);
                      }}
                      // max={new Date().toISOString().split("T")[0]} // Set max to today's date
                      required
                    />
                  </div>
                  <div className="">
                    <label htmlFor="jobType">Job Type *</label>
                    <br />
                    <select
                      name="fieldJobType"
                      onChange={handleJobTypeChange}
                      id="fieldJobType"
                      className="w-[150px] border-[1px] p-1 rounded-sm border-[black] outline-none"
                      value={fieldJobType}
                    // required
                    >
                      <option value="">Select Job Type</option>
                      {jobTypes
                        .filter((item) => {
                          return item.status === "Active";
                        })
                        .map((item, index) => (
                          <option key={index} value={item.jobName}>
                            {item.jobName}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="form-group flex flex-col">
                    <label htmlFor="project">Start Time *</label>
                    <input
                      type="time"
                      id="startTime"
                      name="startTime"
                      className="border-[1px] border-[black] outline-none w-[100px] p-1 text-sm rounded-[2px]"
                      value={startTime}
                      onChange={handleTimeChange}
                    // required
                    />
                  </div>
                  <div className="form-group flex flex-col">
                    <label htmlFor="project">End Time *</label>
                    <input
                      type="time"
                      id="endTime"
                      name="endTime"
                      className="border-[1px] border-[black] outline-none w-[100px] p-1 text-sm rounded-[2px]"
                      value={endTime}
                      min={startTime}
                      onChange={handleTimeChange}
                    // required
                    />
                  </div>
                  <div className="form-group flex flex-col">
                    <label htmlFor="project">Total Man Hours *</label>
                    <p>
                      {totalManHours?.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>

                {forms.map((formData, index) => (
                  <div
                    key={index}
                    className="flex gap-x-16 justify-start flex-wrap mb-4 p-6 pt-8 shadow-md relative"
                  >
                    <div className="form-group flex flex-col">
                      <label htmlFor={`source-${index}`}>Source *</label>
                      <select
                        name="source"
                        onChange={(e) => handleInputChange(e, index)}
                        id={`source-${index}`}
                        className="border-b border-[grey] outline-none w-[180px]"
                        value={formData.source}
                        required
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
                        <div className="form-group flex flex-col">
                          <label htmlFor={`type-${index}`}>
                            Material Type *
                          </label>
                          <select
                            name="type"
                            onChange={(e) => handleInputChange(e, index)}
                            id={`type-${index}`}
                            className="border-b border-[grey] outline-none w-[180px]"
                            value={formData.type}
                            required
                          // disabled
                          >
                            <option value="">Select</option>
                            {/* <option value={fieldJobType}>{fieldJobType}</option> */}
                            {jobTypes
                              .filter((item) => {
                                return item.status === "Active";
                              })
                              .map((item, index) => (
                                <option key={index} value={item.jobName}>
                                  {item.jobName}
                                </option>
                              ))}
                          </select>
                        </div>
                        <div
                          className="form-group flex flex-col w-[180px] relative cursor-pointer"
                          key={index}
                          ref={(el) => (dropdownRefs.current[index] = el)} // Assign ref to each dropdown
                        >
                          <label htmlFor={`reference-${index}`}>
                            Material Name *
                          </label>
                          <div className="relative">
                            <div
                              className=""
                              onClick={() => toggleDropdownVisibility(index)}
                            >
                              <input
                                type="text"
                                id={`materialName-${index}`}
                                name={`materialName-${index}`}
                                className="border-b border-[grey] outline-none w-[180px] text-base pr-3 cursor-pointer"
                                value={getMaterialNameInputValue(formData)}
                                readOnly
                                placeholder="Select Material Name"
                                required
                              />
                              <span className="absolute right-0 cursor-pointer">
                                <i className="fa fa-caret-down"></i>
                              </span>
                            </div>

                            {dropdownVisibility[index] && (
                              <div className="max-h-[400px] w-[200px] scrollbar-content overflow-y-auto absolute top-[100%] bg-[white] shadow-md mt-1 z-10">
                                {/* Search Input */}
                                <input
                                  type="text"
                                  className="w-full px-2 py-1 border-b"
                                  placeholder="Search material..."
                                  value={searchTerm}
                                  onChange={handleSearchChange}
                                />
                                {/* Filtered and Searched Materials */}
                                {materials
                                  .filter(
                                    (item) =>
                                      item.status === "Active" &&
                                      item.name
                                        .toLowerCase()
                                        .includes(searchTerm.toLowerCase())
                                  )
                                  .map((material) => (
                                    <div
                                      key={material?._id}
                                      onClick={() => {
                                        handleMaterialChange(
                                          material.name,
                                          index
                                        );
                                        toggleDropdownVisibility(index); // Close dropdown
                                      }}
                                      className="text-sm hover:bg-[#e3e3e3] cursor-pointer p-2"
                                    >
                                      {material.name}
                                    </div>
                                  ))}

                                {/* No Results Found */}
                                {materials.filter(
                                  (item) =>
                                    item.status === "Active" &&
                                    item.name
                                      .toLowerCase()
                                      .includes(searchTerm.toLowerCase())
                                ).length === 0 && (
                                    <div className="p-2 text-gray-500 text-center text-sm">
                                      No materials found
                                    </div>
                                  )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="form-group flex flex-col">
                          <label htmlFor={`measure-fg-${index}`}>
                            Measure *
                          </label>
                          <input
                            type="text"
                            className="border-b border-[grey] outline-none w-[180px]"
                            id={`measure-fg-${index}`}
                            name="measure"
                            onChange={(e) => handleInputChange(e, index)}
                            value={formData.measure}
                            placeholder="Enter measure"
                            readOnly
                            required
                          />
                        </div>
                        <div className="form-group flex flex-col">
                          <label htmlFor={`quantity-fg-${index}`}>
                            Quantity *
                          </label>
                          <input
                            type="number"
                            className="border-b border-[grey] outline-none w-[180px]"
                            id={`quantity-fg-${index}`}
                            name="quantity"
                            onChange={(e) => handleInputChange(e, index)}
                            value={formData.quantity}
                            placeholder="Enter Quantity"
                            min={0}
                            max={10000000}
                            step="any"
                            required
                          />
                        </div>
                        <div className="form-group flex flex-col">
                          <label htmlFor={`cost-fg-${index}`}>Cost *</label>
                          <input
                            type="text"
                            className="border-b border-[grey] outline-none w-[180px]"
                            id={`cost-fg-${index}`}
                            name="cost"
                            onChange={(e) => handleInputChange(e, index)}
                            value={formData.cost}
                            placeholder="Enter Cost "
                            readOnly
                          />
                        </div>
                        <div className="form-group flex flex-col">
                          <label htmlFor={`markup-fg-${index}`}>
                            Markup *
                          </label>
                          <input
                            type="text"
                            className="border-b border-[grey] outline-none w-[180px]"
                            id={`markup-fg-${index}`}
                            name="markup"
                            onChange={(e) => handleInputChange(e, index)}
                            value={
                              formData.markup ?? formData.markUp ?? ""
                            }
                            placeholder="%"
                          />
                        </div>
                        <div className="flex flex-nowrap items-end gap-x-16 shrink-0">
                          <div className="form-group flex flex-col">
                            <label htmlFor={`price-fg-${index}`}>
                              Price *
                            </label>
                            <input
                              type="number"
                              className="border-b border-[grey] outline-none w-[180px]"
                              id={`price-fg-${index}`}
                              name="price"
                              onChange={(e) => handleInputChange(e, index)}
                              value={formData.price}
                              placeholder="Enter Price"
                              min={0}
                              max={10000000}
                              step="any"
                              required
                            />
                          </div>
                          <div className="form-group flex flex-col">
                            <label htmlFor={`totalPrice-fg-${index}`}>
                              Total Price *
                            </label>
                            <input
                              type="number"
                              className="border-b border-[grey] outline-none w-[180px]"
                              id={`totalPrice-fg-${index}`}
                              name="totalPrice"
                              placeholder="Total price goes here..."
                              value={formData.totalPrice}
                              readOnly
                              min={0}
                              step="any"
                              required
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {formData.source === "Other" && (
                      <>
                        <div className="form-group flex flex-col">
                          <label htmlFor={`type-${index}`}>
                            Material Type *
                          </label>
                          <select
                            name="type"
                            onChange={(e) => handleInputChange(e, index)}
                            id={`type-${index}`}
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
                                <option key={index} value={item.jobName}>
                                  {item.jobName}
                                </option>
                              ))}
                          </select>
                        </div>
                        <div className="form-group flex flex-col w-[180px]">
                          <label htmlFor={`vendorName-${index}`}>
                            Vendor Name
                          </label>
                          <input
                            type="text"
                            className="border-b border-[grey] outline-none"
                            id={`vendorName-${index}`}
                            name="vendorName"
                            onChange={(e) => handleInputChange(e, index)}
                            value={formData.vendorName}
                            placeholder="Enter Vendor Name"
                            maxLength={50}
                          // required
                          />
                        </div>
                        <div className="form-group flex flex-col w-[180px]">
                          <label htmlFor={`reference-${index}`}>
                            Material Name *
                          </label>
                          <input
                            type="text"
                            className="border-b border-[grey] outline-none"
                            id={`reference-${index}`}
                            name="reference"
                            onChange={(e) => handleInputChange(e, index)}
                            value={getMaterialNameInputValue(formData)}
                            placeholder="Enter Name"
                            maxLength={100}
                            required
                          />
                        </div>
                      </>
                    )}

                    {formData.source === "Labor" && (
                      <>
                        <div className="form-group flex flex-col">
                          <label htmlFor={`type-${index}`}>Job Type *</label>
                          <select
                            name="type"
                            onChange={(e) => handleInputChange(e, index)}
                            id={`type-${index}`}
                            className="border-b border-[grey] outline-none w-[180px]"
                            value={formData.type}
                            required
                          // disabled
                          >
                            <option value="">Select</option>
                            {/* <option value={fieldJobType}>{fieldJobType}</option> */}
                            {jobTypes
                              .filter((item) => {
                                return item.status === "Active";
                              })
                              .map((item, index) => (
                                <option key={index} value={item.jobName}>
                                  {item.jobName}
                                </option>
                              ))}
                          </select>
                        </div>
                        <div className="form-group flex flex-col w-[180px]">
                          <label htmlFor={`vendorName-${index}`}>
                            Vendor Name
                          </label>
                          <input
                            type="text"
                            className="border-b border-[grey] outline-none"
                            id={`vendorName-${index}`}
                            name="vendorName"
                            onChange={(e) => handleInputChange(e, index)}
                            value={formData.vendorName}
                            placeholder="Enter Vendor Name"
                            maxLength={50}
                          // required
                          />
                        </div>
                        <div className="form-group flex flex-col w-[180px]">
                          <label htmlFor={`reference-${index}`}>
                            Description *
                          </label>
                          <input
                            type="text"
                            className="border-b border-[grey] outline-none"
                            id={`reference-${index}`}
                            name="reference"
                            onChange={(e) => handleInputChange(e, index)}
                            value={getMaterialNameInputValue(formData)}
                            maxLength={100}
                            placeholder="Enter Description"
                            required
                          />
                        </div>
                        <div className="form-group flex flex-col">
                          <label htmlFor={`source-${index}`}>Taxable *</label>
                          <select
                            name="isTaxable"
                            onChange={(e) => handleInputChange(e, index)}
                            id={`isTaxable-${index}`}
                            className="border-b border-[grey] outline-none w-[180px]"
                            value={formData.isTaxable}
                            required
                          >
                            <option value="">Select Option</option>
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                          </select>
                        </div>
                        <div className="form-group flex flex-col">
                          <label htmlFor={`measure-${index}`}>Cost *</label>
                          <input
                            type="text"
                            className="border-b border-[grey] outline-none"
                            id={`measure-${index}`}
                            name="cost"
                            onChange={(e) => handleInputChange(e, index)}
                            value={formData.cost}
                            placeholder="Enter Cost "
                            // readOnly={
                            //   formData.source === "Other" ? false : true
                            // }
                            // required
                          />
                        </div>
                         <div className="form-group flex flex-col">
                          <label htmlFor={`measure-${index}`}>MarkUp *</label>
                          <input
                            type="text"
                            className="border-b border-[grey] outline-none"
                            id={`measure-${index}`}
                            name="markUp"
                            onChange={(e) => handleInputChange(e, index)}
                            value={formData.markUp}
                            placeholder="Enter markUp"
                            // readOnly={
                            //   formData.source === "Other" ? false : true
                            // }
                            // required
                          />
                        </div>
                      </>
                    )}

                    {formData.source.includes("Lump Sum") && (
                      <>
                        <div className="form-group flex flex-col hidden">
                          <label htmlFor={`type-${index}`}>Material Type</label>
                          <select
                            name="type"
                            id={`type-${index}`}
                            className="border-b border-[grey] outline-none w-[180px]"
                            value="Lump Sum"
                            required
                          >
                            <option value="">Select</option>
                            <option value="Lump Sum">
                              Lump Sum (Sales Tax Paid on Materials)
                            </option>
                          </select>
                        </div>
                        <div className="form-group flex flex-col">
                          <label htmlFor={`type-${index}`}>Lump Sum Type</label>
                          <select
                            name="type"
                            id={`type-${index}`}
                            className="border-b border-[grey] outline-none w-[180px]"
                            value={formData.type}
                            onChange={(e) => handleInputChange(e, index)}
                            required
                          >
                            <option value="">Select</option>
                            <option value="Lump Sum">Lump Sum</option>
                            <option value="Drainage Lump Sum">
                              Drainage Lump Sum (Sales Tax Paid on Materials)
                            </option>
                            <option value="Electrical Lump Sum">
                              Electrical Lump Sum (Sales Tax Paid on Materials)
                            </option>
                            <option value="Hardscape Lump Sum">
                              Hardscape Lump Sum (Sales Tax Paid on Materials)
                            </option>
                            <option value="Equipment Fees">
                              Equipment Fees (Rental, Heavy Haul, Etc.)
                            </option>
                            <option value="Irrigation Lump Sum">
                              Irrigation Lump Sum (Sales Tax Paid on Materials)
                            </option>
                            <option value="Landscape Lump Sum">
                              Landscape Lump Sum (Sales Tax Paid on Materials)
                            </option>
                            <option value="Equipment Lump Sum">
                              Equipment Lump Sum (Sales Tax Paid on Materials)
                            </option>
                            <option value="Mosquito Lump Sum">
                              Mosquito Lump Sum (Sales Tax Paid on Materials)
                            </option>
                            <option value="Plumbing Lump Sum">
                              Plumbing Lump Sum (Sales Tax Paid on Materials)
                            </option>
                            <option value="Pool Lump Sum">
                              Pool Lump Sum (Sales Tax Paid on Materials)
                            </option>
                          </select>
                        </div>
                        <div className="form-group flex flex-col w-[180px]">
                          <label htmlFor={`vendorName-${index}`}>
                            Vendor Name
                          </label>
                          <input
                            type="text"
                            className="border-b border-[grey] outline-none"
                            id={`vendorName-${index}`}
                            name="vendorName"
                            onChange={(e) => handleInputChange(e, index)}
                            maxLength={50}
                            value={formData.vendorName}
                            placeholder="Enter Vendor Name"
                          // required
                          />
                        </div>
                        <div className="form-group flex flex-col w-[180px]">
                          <label htmlFor={`reference-${index}`}>
                            Description *
                          </label>
                          <input
                            type="text"
                            className="border-b border-[grey] outline-none"
                            id={`reference-${index}`}
                            name="reference"
                            onChange={(e) => handleInputChange(e, index)}
                            value={getMaterialNameInputValue(formData)}
                            maxLength={100}
                            placeholder="Enter Description"
                            required
                          />
                        </div>
                        <div className="form-group flex flex-col">
                          <label htmlFor={`source-${index}`}>Taxable *</label>
                          <select
                            name="isTaxable"
                            onChange={(e) => handleInputChange(e, index)}
                            id={`isTaxable-${index}`}
                            className="border-b border-[grey] outline-none w-[180px]"
                            value={formData.isTaxable}
                            required
                          >
                            <option value="">Select Option</option>
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                          </select>
                        </div>
                        <div className="form-group flex flex-col">
                          <label htmlFor={`measure-${index}`}>Cost *</label>
                          <input
                            type="text"
                            className="border-b border-[grey] outline-none"
                            id={`measure-${index}`}
                            name="cost"
                            onChange={(e) => handleInputChange(e, index)}
                            value={formData.cost}
                            placeholder="Enter Cost "
                            // readOnly={
                            //   formData.source === "Other" ? false : true
                            // }
                            // required
                          />
                        </div>
                         <div className="form-group flex flex-col">
                          <label htmlFor={`measure-${index}`}>MarkUp *</label>
                          <input
                            type="text"
                            className="border-b border-[grey] outline-none"
                            id={`measure-${index}`}
                            name="markUp"
                            onChange={(e) => handleInputChange(e, index)}
                            value={formData.markUp}
                            placeholder="Enter markUp"
                            // readOnly={
                            //   formData.source === "Other" ? false : true
                            // }
                            // required
                          />
                        </div>
                      </>
                    )}

                    {formData.source === "Other" && (
                      <>
                        <div className="form-group flex flex-col">
                          <label htmlFor={`measure-${index}`}>Measure *</label>
                          <input
                            type="text"
                            className="border-b border-[grey] outline-none"
                            id={`measure-${index}`}
                            name="measure"
                            onChange={(e) => handleInputChange(e, index)}
                            value={formData.measure}
                            placeholder="Enter measure"
                            readOnly={false}
                            required
                          />
                        </div>

                        <div className="form-group flex flex-col">
                          <label htmlFor={`quantity-${index}`}>
                            Quantity *
                          </label>
                          <input
                            type="number"
                            className="border-b border-[grey] outline-none w-[180px]"
                            id={`quantity-${index}`}
                            name="quantity"
                            onChange={(e) => handleInputChange(e, index)}
                            value={formData.quantity}
                            placeholder="Enter Quantity"
                            min={0}
                            max={10000000}
                            step="any"
                            required
                          />
                        </div>
                      </>
                    )}

                    {formData.source === "Other" && (
                      <>
                        <div className="form-group flex flex-col">
                          <label htmlFor={`cost-other-${index}`}>
                            Cost *
                          </label>
                          <input
                            type="text"
                            className="border-b border-[grey] outline-none bg-gray-50"
                            id={`cost-other-${index}`}
                            key={`cost-other-${index}-${formData.source}`}
                            name="cost"
                            placeholder="Enter Cost"
                            onChange={(e) => handleInputChange(e, index)}
                            value={otherFieldCopyCostDisplayValue(formData.cost)}
                            readOnly
                            required
                          />
                        </div>
                        <div className="form-group flex flex-col">
                          <label htmlFor={`markup-${index}`}>Mark up</label>
                          <input
                            type="number"
                            className="border-b border-[grey] outline-none w-[180px]"
                            id={`markup-${index}`}
                            name="markup"
                            placeholder="Enter percent"
                            onChange={(e) => handleInputChange(e, index)}
                            value={formData?.markup}
                            min={0}
                            max={100}
                            required
                          />
                        </div>
                        <div className="form-group flex flex-col">
                          <label htmlFor={`price-${index}`}>Price *</label>
                          <input
                            type="number"
                            className="border-b border-[grey] outline-none"
                            id={`price-${index}`}
                            name="price"
                            onChange={(e) => handleInputChange(e, index)}
                            value={formData.price}
                            placeholder="Enter Price"
                            min={0}
                            max={10000000}
                            step="any"
                            required
                          />
                        </div>
                        <div className="form-group flex flex-col">
                          <label htmlFor={`totalPrice-other-${index}`}>
                            Total Price *
                          </label>
                          <input
                            type="number"
                            className="border-b border-[grey] outline-none w-[180px]"
                            id={`totalPrice-other-${index}`}
                            name="totalPrice"
                            placeholder="Total price goes here..."
                            value={formData.totalPrice}
                            readOnly
                            min={0}
                            step="any"
                            required
                          />
                        </div>
                        <div className="form-group flex flex-col">
                          <label htmlFor={`source-${index}`}>Taxable *</label>
                          <select
                            name="isTaxable"
                            onChange={(e) => handleInputChange(e, index)}
                            id={`isTaxable-${index}`}
                            className="border-b border-[grey] outline-none w-[180px]"
                            value={formData.isTaxable}
                            required
                          >
                            <option value="">Select Option</option>
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                          </select>
                        </div>
                        <div className="form-group flex flex-col w-[180px]">
                          <label htmlFor={`invoice-${index}`}>Invoice</label>
                          <input
                            type="text"
                            className="border-b border-[grey] outline-none"
                            id={`invoice-${index}`}
                            name="invoice"
                            onChange={(e) => handleInputChange(e, index)}
                            value={formData.invoice}
                            placeholder="Enter invoice"
                          // required
                          />
                        </div>
                        <div className="form-group flex flex-col w-[180px]">
                          <label htmlFor={`PO-${index}`}>P.O.</label>
                          <input
                            type="text"
                            className="border-b border-[grey] outline-none"
                            id={`PO-${index}`}
                            name="PO"
                            onChange={(e) => handleInputChange(e, index)}
                            value={formData.PO}
                            placeholder="Enter PO"
                          // required
                          />
                        </div>
                      </>
                    )}

                    {formData.source === "Other" ? null : formData.source === "F&G" ? null : (
                      <div className="form-group flex flex-col">
                        <label htmlFor={`totalPrice-${index}`}>
                          Total Price *
                        </label>
                        <input
                          type="number"
                          className="border-b border-[grey] outline-none"
                          id={`totalPrice-${index}`}
                          name="totalPrice"
                          placeholder="Total price goes here..."
                          value={formData.totalPrice}
                          max={10000000}
                          step="any"
                          // readOnly
                          onChange={(e) => handleInputChange(e, index)}
                          min={0}
                          required
                        />
                      </div>
                    )}

                    {formData.reference && formData.source === "F&G" && (
                      <div className="form-group flex flex-col">
                        <label htmlFor={`isTaxable-${index}`}>Taxable</label>
                        <input
                          type="text"
                          className="border-b border-[grey] outline-none"
                          id={`isTaxable-${index}`}
                          name="isTaxable"
                          onChange={(e) => handleInputChange(e, index)}
                          value={formData.isTaxable ? "Yes" : "No"}
                          placeholder="Enter isTaxable"
                          disabled={true}
                        />
                      </div>
                    )}

                    {(formData.source === "Labor" ||
                      formData.source.includes("Lump Sum")) && (
                      <>
                        <div className="form-group flex flex-col w-[180px]">
                          <label htmlFor={`invoice-${index}`}>Invoice</label>
                          <input
                            type="text"
                            className="border-b border-[grey] outline-none"
                            id={`invoice-${index}`}
                            name="invoice"
                            onChange={(e) => handleInputChange(e, index)}
                            value={formData.invoice}
                            placeholder="Enter invoice"
                          />
                        </div>
                        <div className="form-group flex flex-col w-[180px]">
                          <label htmlFor={`PO-${index}`}>P.O.</label>
                          <input
                            type="text"
                            className="border-b border-[grey] outline-none"
                            id={`PO-${index}`}
                            name="PO"
                            onChange={(e) => handleInputChange(e, index)}
                            value={formData.PO}
                            placeholder="Enter PO"
                          />
                        </div>
                      </>
                    )}

                    <button
                      type="button"
                      className="absolute top-3 right-5 bg-red-500 h-[30px] w-[30px] rounded-full"
                      onClick={() => deleteForm(index)}
                    >
                      <i className="fa fa-close text-white"></i>
                    </button>
                  </div>
                ))}

                <div className="text-center">
                  <button
                    type="button"
                    onClick={addForm}
                    className="bg-green-500 text-white h-[35px] w-[35px] rounded-full"
                  >
                    <i className="fa fa-plus"></i>
                  </button>
                </div>
              </div>

              {isLabor && (
                <>
                  <div className="form-group p-10">
                    <label htmlFor="crew">Select Crew </label>
                    <div className="dropdown" ref={dropdownRef}>
                      {/* Custom dropdown */}
                      <button
                        className="w-full border-[1px] px-2 h-[40px] rounded-sm border-[#d1d1d1] outline-none text-start"
                        type="button"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)} // Toggle dropdown
                      >
                        Select crew
                      </button>

                      {/* Dropdown content with checkboxes */}
                      {isDropdownOpen && (
                        <div className="dropdown-content border-[1px] border-[#d1d1d1] bg-white max-h-[320px] overflow-auto">
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
                                    onChange={() => handleCrewChange(crew)}
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
                    <div className="flex flex-wrap gap-3 mt-6">
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
                  <div className="my-10 flex">
                    <table className="w-[100%] text-center">
                      <thead>
                        <tr>
                          <th>Labor Count</th>
                          <th>Total Man Hours</th>
                          <th>Per Hour Cost</th>
                          <th>Total Cost</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>{totalLabors ? parseFloat(totalLabors) : 0}</td>
                          <td>
                            {totalManHours
                              ? parseFloat(totalManHours)?.toLocaleString(
                                "en-US",
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                }
                              )
                              : 0}
                          </td>
                          <td>
                            {fieldJobCost
                              ? parseFloat(fieldJobCost)?.toLocaleString(
                                "en-US",
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                }
                              )
                              : 0}
                          </td>
                          <td>
                            {(totalManHours * fieldJobCost)?.toLocaleString(
                              "en-US",
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }
                            )}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="bg-red-500 h-[25px] w-[25px] rounded-full"
                              onClick={() => setIsLabor(!isLabor)}
                            >
                              <i className="fa fa-close text-white"></i>
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              <div className=" mt-16 pb-8">
                <label htmlFor="notes" className="text-center block">
                  Notes
                </label>
                <div className="px-8 py-3">

                  <JoditEditor
                    ref={editor}
                    value={note}
                    // config={config}
                    tabIndex={1} // tabIndex of textarea
                    onBlur={(newContent) => {
                      setNote(newContent);
                    }} // preferred to use only this option to update the content for performance reasons
                    onChange={(newContent) => {
                      setNote(newContent);
                    }}
                  />
                </div>
              </div>

              <div className="card-footer">
                <button
                  type="submit"
                  className="btn bg-[#00613e] text-white"
                  disabled={disableBtn}
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}
