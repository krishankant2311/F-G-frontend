import React, { useEffect, useMemo, useRef, useState } from "react";
import Layout from "../../layout/Layout";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTableContext } from "../../../context/TableContext";
import { useNavigate, useParams } from "react-router-dom";
import "../../../styles/scrollbar.css";
import JoditEditor from "jodit-react";
import {
  applyReferenceVendorToForm,
  getMaterialNameInputValue,
  toPersistedCopy,
} from "../../../utils/materialReference";

export default function StaffAddBidForm() {
  const editor = useRef(null);
  const config = useMemo(
    () => ({
      readonly: false,
      placeholder: "",
    }),
    []
  );
  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    customerType: "Normal",
    billingType: "Bid",
    jobAddress: "",
    jobType: "",
    foreman: "",
    description: "",
    crew: [],
    projectManager: "",
    truckNo: "",
    trailerNo: "",
    credits: 0,
    nonTaxCredits: 0,
    nonTaxDescription: "",
    taxCredits: 0,
    taxDescription: "",
    billAddress: "",
    jobName: "",
    isProjectTaxable: false,
  });
  const [forms, setForms] = useState([
    {
      source: "F&G",
      type: "",
      vendorName: "",
      referenceBase: "",
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
  const [laborForms, setLaborForms] = useState([
    {
      laborCount: 1,
      totalManHours: 1,
      type: "",
      perHourCost: 1,
      totalLaborCost: 0,
    },
  ]);
  const [isNewAddress, setIsNewAddress] = useState(false);
  const [isLabor, setIsLabor] = useState(true);
  const [disableBtn, setDisableBtn] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [fieldJobType, setFieldJobType] = useState("");
  const [fieldJobCost, setFieldJobCost] = useState(0);
  const [totalLabors, setTotalLabors] = useState(0);
  const [totalManHours, setTotalManHours] = useState(0);
  const [allCrews, setAllCrews] = useState([]);
  const [jobTypes, setJobTypes] = useState([]);
  const [selectedCrews, setSelectedCrews] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [materials, setMaterials] = useState([]);
  const [adminTax, setAdminTax] = useState(0);
  const [duration, setDuration] = useState(0);
  const [customers, setCustomers] = useState([]);
  const [customerJobAddress, setCustomerJobAddress] = useState([]);
  const type = 1;
  const dropdownRef = useRef(null); // Reference to dropdown
  const navigate = useNavigate();

  const { tableSize } = useTableContext();

  useEffect(() => {
    getCustomers();
    getTaxPercentage();
    getAllCrews();
    getMaterials();
    getJobTypes();
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (formData.foreman && formData.crew.length > 0) {
      setTotalLabors(formData.crew.length + 1);
    }
  }, [formData.foreman, formData.crew]);

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

  const handleFormInputChange = (e, index) => {
    const { name, value } = e.target;
    const updatedForms = [...forms];

    if (name === "source") {
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
        totalPrice: "",
        isTaxable: true,
      };
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
        totalPrice: "",
        isTaxable: true,
      };
    }

    const updatedForm = { ...updatedForms[index], [name]: value };

    // if (name === "vendorName") {
    //   if (containsNumberOrSpecialChar(e.target.value)) {
    //     toast.error(
    //       "Vendor name cannot contain numbers or special characters."
    //     );
    //     return;
    //   }
    // }

    // if (name === "reference") {
    //   if (containsNumberOrSpecialChar(e.target.value)) {
    //     toast.error(
    //       "Material name cannot contain numbers or special characters."
    //     );
    //     return;
    //   }
    // }

    // if (name === "measure") {
    //   if (containsNumberOrSpecialChar(e.target.value)) {
    //     toast.error("Measure cannot contain numbers or special characters.");
    //     return;
    //   }
    // }

    // Calculate total price if both price and quantity are filled
    if (name === "price" || name === "quantity") {
      const price = parseFloat(updatedForm.price) || 0;
      const quantity = parseFloat(updatedForm.quantity) || 0;
      if (updatedForm.source === "Other") {
        updatedForm.totalCost = price && quantity ? price * quantity : "";
        const isTax =
          updatedForm.isTaxable === "true" || updatedForm.isTaxable === true
            ? true
            : false;
        const markup = parseFloat(updatedForm.markup) || 0;

        if (false) {
          const intermediatePrice =
            updatedForm.totalCost + (markup * updatedForm.totalCost) / 100;
          updatedForm.totalPrice =
            intermediatePrice + (adminTax * intermediatePrice) / 100;
        } else {
          updatedForm.totalPrice =
            updatedForm.totalCost +
            (updatedForm.markup * updatedForm.totalCost) / 100;
        }
      } else {
        updatedForm.totalPrice = price && quantity ? price * quantity : "";
        updatedForm.totalCost = price && quantity ? price * quantity : "";
      }
    }

    if (name === "markup") {
      const isTax =
        updatedForm.isTaxable === "true" || updatedForm.isTaxable === true
          ? true
          : false;
      const markup = parseFloat(updatedForm.markup) || 0;
      if (false) {
        const intermediatePrice =
          updatedForm.totalCost + (markup * updatedForm.totalCost) / 100;
        updatedForm.totalPrice =
          intermediatePrice + (adminTax * intermediatePrice) / 100;
      } else {
        updatedForm.totalPrice =
          updatedForm.totalCost + (markup * updatedForm.totalCost) / 100;
      }
    }

    if (name === "isTaxable") {
      const isTax =
        updatedForm.isTaxable === "true" || updatedForm.isTaxable === true
          ? true
          : false;
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

  const handleLaborFormInputChange = (e, index) => {
    const { name, value } = e.target;
    const updatedForms = [...laborForms];

    const updatedForm = { ...updatedForms[index], [name]: value };

    if (name === "type") {
      // const val = e.target.value;
      updatedForm.type = value;
      // updatedForm.perHourCost = jobTypes.find(
      //   (job) => job.jobName === val
      // ).price;

      // const laborCount = 1;
      // const totalManHours = parseFloat(updatedForm.totalManHours) || 0;
      // const totalManHours = 1;
      // const perHourCost = parseFloat(updatedForm.perHourCost) || 0;
      // const perHourCost = 1;

      // updatedForm.totalLaborCost = laborCount * totalManHours * perHourCost;
      updatedForm.totalLaborCost = 0;
    }

    if (name === "totalLaborCost") {
      const amount = Number.parseFloat(value);
      if (amount < 0) {
        toast.error("Total labor cost cannot be negative.");
        updatedForm.totalLaborCost = 0;
        return;
      }
      updatedForm.totalLaborCost = amount;
    }

    // if (name === "laborCount") {
    //   updatedForm.laborCount = parseFloat(e.target.value);
    // }

    // if (name === "totalManHours") {
    //   updatedForm.totalManHours = parseFloat(e.target.value);
    // }

    // if (
    //   name === "laborCount" ||
    //   name === "totalManHours" ||
    //   name === "perHourCost"
    // ) {
    //   const laborCount = 1;
    //   const totalManHours = parseFloat(updatedForm.totalManHours) || 0;
    //   const perHourCost = parseFloat(updatedForm.perHourCost) || 0;

    //   updatedForm.totalLaborCost = laborCount * totalManHours * perHourCost;
    // }

    updatedForms[index] = updatedForm;
    setLaborForms(updatedForms);
  };

  // const handleCustomerChange = (e) => {
  //   // const customerId = e.target.value;
  //   const customerId = e;
  //   setSelectedCustomer(customerId);

  //   if (customerId === "") {
  //     setFormData({
  //       customerName: "",
  //       customerEmail: "",
  //       customerPhone: "",
  //     });
  //     setCustomerJobAddress([]);
  //     return;
  //   }

  //   const customer = customers.filter((c) => c._id === customerId);

  //   setFormData({
  //     ...formData,
  //     customerName: customer[0]?.customerName,
  //     customerEmail: customer[0]?.customerEmail,
  //     customerPhone: customer[0]?.customerPhone,
  //   });

  //   setCustomerJobAddress(customer[0]?.jobAddress);
  // };

  const handleCustomerChange = (customer) => {
    const customerId = customer._id;
    setSelectedCustomer(customerId);

    // Close the dropdown after selection
    setDropdownCustomerVisibility(false);

    // Reset the form data and job address if no customer is selected
    if (!customerId) {
      setFormData({
        customerName: "",
        customerEmail: "",
        customerPhone: "",
      });
      setCustomerJobAddress([]);
      return;
    }

    // Find the selected customer details
    const selectedCustomer = customers.find((c) => c._id === customerId);

    // If customer found, update the form data and customer job address
    if (selectedCustomer) {
      let customerPhone = "";
      if (selectedCustomer?.customerPhone) {
        customerPhone = selectedCustomer?.customerPhone?.replace(/\s/g, "");
        customerPhone = Number.parseInt(customerPhone);
      }

      setFormData({
        ...formData,
        customerName: selectedCustomer.customerName,
        customerEmail: selectedCustomer.customerEmail,
        customerPhone,
      });

      setCustomerJobAddress(selectedCustomer.jobAddress || []);
    }
  };

  function containsNumberOrSpecialChar(text) {
    // Regular expression to check for numbers (0-9) or special characters
    const regex = /[0-9!@#$%^&*(),.?":{}|<>]/;

    // Test the text against the regex
    return regex.test(text);
  }

  const addLaborForm = () => {
    setLaborForms((prevForms) => [
      ...prevForms,
      {
        laborCount: 1,
        totalManHours: 1,
        type: "",
        perHourCost: 1,
        totalLaborCost: 0,
      },
    ]);
  };

  const deleteLaborForm = (index) => {
    const updatedLaborForms = laborForms.filter((_, i) => i !== index);
    setLaborForms(updatedLaborForms);
  };

  const addForm = () => {
    setForms([
      ...forms,
      {
        source: "F&G",
        type: fieldJobType,
        vendorName: "",
        referenceBase: "",
        markup: 0,
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

  const handleMaterialChange = (e, index) => {
    // const materialName = e.target.value;
    const materialName = e;
    const material = materials.find(
      (material) => material.name === materialName
    );
    const updatedForms = [...forms];
    const row = {
      ...updatedForms[index],
      referenceBase: material.name,
      reference: material.name,
      measure: material.measure,
      price: material.price,
      isTaxable: material.isTaxable,
      totalPrice:
        Number.parseFloat(material.price) *
        Number.parseFloat(forms[index].quantity),
    };
    updatedForms[index] = applyReferenceVendorToForm(row);
    setForms(updatedForms);
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
        // console.log("Error in tax", response.data);
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response.message);
    }
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

  const deleteForm = (index) => {
    const updatedForms = forms.filter((_, i) => i !== index);
    setForms(updatedForms);
  };

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

  const removeCrew = (crewId) => {
    setSelectedCrews(selectedCrews.filter((crew) => crew._id !== crewId));
    setFormData({
      ...formData,
      crew: formData.crew.filter((id) => id !== crewId),
    });
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

  function isTenDigits(number) {
    // Convert the number to a string to handle cases where the input is numeric
    const numberStr = number.toString();

    return numberStr.length === 10;
  }

  const groupAndMergeForms = (forms, laborForms) => {
    // Step 1: Merge laborForms with the same type by summing their values
    const mergedLaborForms = laborForms.reduce((acc, labor) => {
      if (!acc[labor.type]) {
        acc[labor.type] = { ...labor };
      } else {
        acc[labor.type].laborCount += labor.laborCount;
        acc[labor.type].totalManHours += labor.totalManHours;
        acc[labor.type].totalLaborCost += labor.totalLaborCost;
      }
      return acc;
    }, {});

    // Step 2: Map labor forms by type for quick lookups
    const laborMap = new Map(Object.entries(mergedLaborForms));

    // Step 3: Group forms by type
    const formGroups = forms.reduce((acc, form) => {
      const { type } = form;
      if (!acc[type]) acc[type] = [];
      acc[type].push(form);
      return acc;
    }, {});

    const result = [];

    // Step 4: Create merged result from form groups and labor forms
    for (const [type, formGroup] of Object.entries(formGroups)) {
      const labor = laborMap.get(type);

      result.push({
        jobType: type,
        totalCost: labor ? labor.totalLaborCost : 0, // Use labor cost if available, otherwise 0
        isLaborTaxable: labor ? true : formGroup[0].isTaxable,
        copies: formGroup,
      });

      laborMap.delete(type); // Remove from map after processing
    }

    // Step 5: Add remaining labor forms not present in `forms`
    laborMap.forEach((labor, type) => {
      const findJob = jobTypes.find((job) => job.jobName === type);

      result.push({
        jobType: type,
        totalCost: labor.totalLaborCost,
        isLaborTaxable: findJob.isTaxable,
        copies: [],
      });
    });

    return result;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData?.customerName?.trim() === "") {
      toast.error("Please enter customer name.");
      return;
    }

    // if (formData.customerPhone && !isTenDigits(formData.customerPhone)) {
    //   toast.error("Please enter 10 digit phone number.");
    //   return;
    // }

    if (formData?.jobAddress?.trim() === "") {
      toast.error("Please enter job address.");
      return;
    }

    let resultedForms = [];

    if (type == 1) {
      if (forms.length === 0) {
        toast.error("Please add at least one material.");
        return;
      }

      if (laborForms.length === 0) {
        toast.error("Please add at least one labor.");
        return;
      }

      let isValidPrice = forms.some((form) => {
        return (
          Number.parseFloat(form.price) * Number.parseFloat(form.quantity) !==
            Number.parseFloat(form.totalPrice) && form.source === "F&G"
        );
      });

      if (isValidPrice && type == 1) {
        toast.error("Please ensure all field copies have valid prices.");
        return;
      }

      resultedForms = groupAndMergeForms(forms.map((f) => toPersistedCopy(f)), laborForms);
    }

    const selectedType = selectedCustomer === "" ? 0 : 1;

    try {
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
      };
      setDisableBtn(true);
      const formdata = new FormData();
      formdata.append("credits", formData.credits);
      formdata.append("isProjectTaxable", formData.isProjectTaxable);
      formdata.append("customerName", formData.customerName);
      formdata.append("customerEmail", formData.customerEmail);
      formdata.append("customerPhone", formData.customerPhone);
      formdata.append("customerType", formData.customerType);
      formdata.append("billingType", formData.billingType);
      formdata.append("jobAddress", formData.jobAddress);
      // if(formData?.billAddress){
      formdata.append("billAddress", formData.billAddress);
      // }
      formdata.append("jobType", formData.jobType);
      formdata.append("foreman", formData.foreman);
      formdata.append("description", formData.description);
      formdata.append("crew", formData.crew);
      formdata.append("projectManager", formData.projectManager);
      formdata.append("truckNo", formData.truckNo);
      formdata.append("trailerNo", formData.trailerNo);
      formdata.append("jobName", formData.jobName);
      formdata.append("selectedType", selectedType);
      formdata.append("customerId", selectedCustomer);
      formdata.append("nonTaxCredits", formData.nonTaxCredits);
      formdata.append("nonTaxDescription", formData.nonTaxDescription);
      formdata.append("taxCredits", formData.taxCredits);
      formdata.append("taxDescription", formData.taxDescription);

      if (type == 1) {
        formdata.append("forms", JSON.stringify(resultedForms));
      }

      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/project/add-bid`,
        formdata,
        {
          headers: headers,
        }
      );

      if (response.data.statusCode === 201) {
        toast.success(response.data.message);
        navigate(
          `/panel/office/${type == 1 ? "bid-projects" : "all-projects"}/1`
        );
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.log("Error", error);
      toast.error(error.response.message);
    }
    setDisableBtn(false);
  };

  // Drop down logic
  const [dropdownCustomerVisibility, setDropdownCustomerVisibility] =
    useState(false); // Track dropdown visibility
  const [searchTermCustomer, setSearchTermCustomer] = useState(""); // Track search term for filtering
  const dropdownRefCustomer = useRef(null);

  // Toggle dropdown visibility
  const toggleDropdownVisibilityCustomer = () => {
    setDropdownCustomerVisibility(!dropdownCustomerVisibility);
    if (!dropdownCustomerVisibility) {
      setSearchTermCustomer(""); // Reset search term when opening the dropdown
    }
  };

  // Handle search term change
  const handleSearchChangeCustomer = (e) => {
    setSearchTermCustomer(e.target.value);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        dropdownRefCustomer.current &&
        !dropdownRefCustomer.current.contains(event.target) &&
        dropdownCustomerVisibility
      ) {
        setDropdownCustomerVisibility(false); // Close dropdown
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [dropdownCustomerVisibility]);

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
                {type == 1 ? "Create New Bid" : "Add New Project"}
              </h3>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="card-body">
                {/* <div className="form-group">
                  <label htmlFor="billingType">Select Customer</label>
                  <select
                    name="selectedCustomer"
                    onChange={handleCustomerChange}
                    id="selectedCustomer"
                    className="w-full border-[1px] p-2 rounded-sm border-[#d1d1d1] outline-none"
                    value={selectedCustomer}
                  >
                    <option value="">Select Customer</option>
                    {customers.map((customer) => {
                      return (
                        <option key={customer._id} value={customer._id}>
                          {customer.customerName}
                          {"  "}({customer.customerEmail})
                        </option>
                      );
                    })}
                  </select>
                </div> */}
                <div className="form-group relative">
                  <label htmlFor="billingType">Select Customer </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="selectedCustomer"
                      name="selectedCustomer"
                      className="w-full border-[1px] p-2 rounded-sm border-[#d1d1d1] outline-none cursor-pointer"
                      placeholder="Select Customer"
                      value={selectedCustomerName} // Display selected customer's name
                      onClick={toggleDropdownVisibilityCustomer} // Toggle dropdown visibility on click
                      readOnly
                    />
                    {dropdownCustomerVisibility && (
                      <div
                        ref={dropdownRefCustomer}
                        className="absolute top-[100%] w-full mt-1 bg-white border border-gray-300 shadow-lg rounded-sm z-10 h-[250px] overflow-y-auto scrollbar-content"
                      >
                        {/* Search Input */}
                        <input
                          type="text"
                          className="w-full px-2 py-1.5 border-b outline-none"
                          placeholder="Search customer..."
                          value={searchTermCustomer}
                          onChange={handleSearchChangeCustomer}
                        />
                        {/* Filtered Customer List */}
                        {filteredCustomers.length > 0 ? (
                          filteredCustomers.map((customer) => (
                            <div
                              key={customer._id}
                              onClick={() => handleCustomerChange(customer)} // Handle selection and close dropdown
                              className="p-2 cursor-pointer hover:bg-gray-200"
                            >
                              {customer.customerName} (
                              {customer.jobAddress.join(" ,")})
                            </div>
                          ))
                        ) : (
                          <div className="p-2 text-gray-500 text-center text-sm">
                            No customers found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <label htmlFor="customerType">Customer Type *</label>
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
                        defaultChecked={type === "Normal"} // Set default checked for "Normal"
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
                  <label htmlFor="customerName">Customer Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    id="customerName"
                    placeholder="Enter Customer Name"
                    value={formData.customerName}
                    onChange={handleInputChange}
                    name="customerName"
                    required
                    maxLength={50}
                    disabled={selectedCustomer !== ""}
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
                    // required
                    maxLength={40}
                    disabled={selectedCustomer !== ""}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="customerPhone">Customer Phone</label>
                  <input
                    type="number"
                    className="form-control"
                    id="customerPhone"
                    placeholder="Enter Customer Phone"
                    value={formData.customerPhone}
                    onChange={handleInputChange}
                    name="customerPhone"
                    min={0}
                    onKeyDown={(e) => {
                      if (
                        e.key === "e" ||
                        e.key === "E" ||
                        e.key === "+" ||
                        e.key === "-"
                      ) {
                        e.preventDefault(); // Prevent "e", "+", or "-" from being entered
                      }
                    }}
                    // required
                    disabled={selectedCustomer !== ""}
                  />
                </div>
                {selectedCustomer ? (
                  <div className="form-group">
                    <div className="flex justify-between items-end">
                      <label htmlFor="jobAddress" className="relative top-1">
                        Job Address *
                      </label>
                      <button
                        type="button"
                        className={`${
                          isNewAddress ? "bg-danger" : "bg-success"
                        } text-sm px-4 py-1 rounded-sm`}
                        onClick={() => {
                          setIsNewAddress(!isNewAddress);
                          setFormData((prevData) => ({
                            ...prevData,
                            jobAddress: "",
                          }));
                        }}
                      >
                        <i
                          className={`${
                            isNewAddress ? "fa fa-minus" : "fa fa-plus"
                          }`}
                        ></i>
                      </button>
                    </div>
                    {isNewAddress ? (
                      <input
                        type="text"
                        className="form-control mt-2"
                        id="jobAddress"
                        placeholder="Enter Job Address"
                        value={formData.jobAddress}
                        onChange={handleInputChange}
                        name="jobAddress"
                        maxLength={100}
                        autoComplete="off"
                        required
                      />
                    ) : (
                      <select
                        name="jobAddress"
                        onChange={handleInputChange}
                        id="jobAddress"
                        className="w-full border-[1px] p-2 rounded-sm border-[#d1d1d1] outline-none mt-2"
                        value={formData.jobAddress}
                        required
                      >
                        <option value="">Select Job Address</option>
                        {customerJobAddress.map((address, index) => {
                          return (
                            <option key={index} value={address}>
                              {address}
                            </option>
                          );
                        })}
                      </select>
                    )}
                  </div>
                ) : (
                  <div className="form-group">
                    <label htmlFor="jobAddress">Job Address *</label>
                    <input
                      type="text"
                      className="form-control"
                      id="jobAddress"
                      placeholder="Enter Job Address"
                      value={formData.jobAddress}
                      onChange={handleInputChange}
                      name="jobAddress"
                      maxLength={70}
                      autoComplete="off"
                      required
                    />
                  </div>
                )}
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
                    // required
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
                    // required
                  />
                </div>
                <div className="form-group hidden">
                  <label htmlFor="billingType">Billing Type *</label>
                  <select
                    name="billingType"
                    onChange={handleInputChange}
                    id="billingType"
                    className="w-full border-[1px] p-2 rounded-sm border-[#d1d1d1] outline-none"
                    value={formData.billingType}
                    required
                  >
                    <option value="">Select Billing Type</option>
                    {type == 1 ? (
                      <option value="Bid">Bid</option>
                    ) : (
                      <option value="No Bid">No Bid</option>
                    )}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="jobType">Job Type *</label>
                  <select
                    name="jobType"
                    onChange={handleInputChange}
                    id="jobType"
                    className="w-full border-[1px] p-2 rounded-sm border-[#d1d1d1] outline-none"
                    value={formData.jobType}
                    required
                  >
                    <option value="">Select Job Type</option>
                    {jobTypes
                      .filter((item) => {
                        return item.status === "Active";
                      })
                      .map((item, index) => (
                        <option key={index} value={item._id}>
                          {item.jobName}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="form-group hidden">
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
                          !selectedCrews.some((crew) => crew._id === item._id)
                        ); // Filter out selected Crews
                      })
                      .map((item, index) => (
                        <option key={index} value={item._id}>
                          {item.crewName}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="form-group hidden">
                  <label htmlFor="crew">Select Crew *</label>
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
                </div>

                <div className=" flex-wrap gap-3 hidden">
                  {selectedCrews.map((crew, index) => (
                    <div
                      key={index}
                      className="selected-crew bg-primary flex justify-center items-center rounded-full px-2 h-[32px] text-sm"
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

                {/* <div className="form-group mt-3">
                  <label htmlFor="projectManager">Project Manager</label>
                  <select
                    name="projectManager"
                    id="projectManager"
                    onChange={handleInputChange}
                    className="w-full border-[1px] p-2 rounded-sm border-[#d1d1d1] outline-none"
                    value={formData.projectManager}
                    required
                  >
                    <option value="">Select Project Manager</option>
                    {allCrews
                      .filter((item) => {
                        return (
                          item.status === "Active" &&
                          item._id !== formData.foreman &&
                          !selectedCrews.some((crew) => crew._id === item._id)
                        );
                      })
                      .map((item, index) => (
                        <option key={index} value={item._id}>
                          {item.crewName}
                        </option>
                      ))}
                  </select>
                </div> */}

                <div className="form-group mt-3 hidden">
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
                    autoComplete="off"
                    // required
                  />
                </div>

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
                      maxLength={150}
                      // required
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
                      maxLength={150}
                      // required
                    />
                  </div>
                </div>

                <div className="form-group mt-3">
                  <label htmlFor="description">Project Scope</label>
                  {/* <textarea
                    className="form-control"
                    id="description"
                    rows="4"
                    placeholder="Enter Description"
                    value={formData.description}
                    onChange={handleInputChange}
                    name="description"
                    required
                    maxLength={200}
                  ></textarea> */}
                  <JoditEditor
                    ref={editor}
                    // config={config}
                    value={formData.description}
                    // config={config}
                    tabIndex={1} // tabIndex of textarea
                    onBlur={(newContent) => {
                      // if (newContent.length > 500) {
                      //   // toast.error("Description cannot exceed 500 characters");
                      //   return;
                      // }
                      setFormData({
                        ...formData,
                        description: newContent,
                      });
                    }} // preferred to use only this option to update the content for performance reasons
                    onChange={(newContent) => {
                      // if (newContent.length > 500) {
                      //   // toast.error("Description cannot exceed 500 characters");
                      //   return;
                      // }
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
                    className="h-[20px] w-[20px] cursor-pointer"
                    id="isProjectTaxable"
                    checked={formData.isProjectTaxable}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        isProjectTaxable: e.target.checked, // Update the state based on `checked`
                      })
                    }
                    name="isProjectTaxable"
                  />
                  <label htmlFor="isProjectTaxable" className="cursor-pointer">
                    Is Taxable
                  </label>
                </div>

                <div className="form-group mt-3 hidden">
                  <label htmlFor="truckNo">Truck No</label>
                  <input
                    type="text"
                    className="form-control"
                    id="truckNo"
                    placeholder="Enter Truck No"
                    value={formData.truckNo}
                    onChange={handleInputChange}
                    name="truckNo"
                    maxLength={40}
                    // required
                  />
                </div>
              </div>
              {type == 1 && (
                <>
                  <div className="card-body">
                    {forms.map((formData, index) => (
                      <div
                        key={index}
                        className="flex gap-x-16 justify-start flex-wrap mb-4 p-6 pt-8 shadow-md relative"
                      >
                        <div className="form-group flex flex-col">
                          <label htmlFor={`source-${index}`}>Source *</label>
                          <select
                            name="source"
                            onChange={(e) => handleFormInputChange(e, index)}
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
                            {/* <option value="Drainage Lump Sum">Drainage Lump Sum</option>
                        <option value="Electrical Lump Sum">Electrical Lump Sum</option>
                        <option value="Hardscape Lump Sum">Hardscape Lump Sum</option>
                        <option value="Irrigation Lump Sum">Irrigation Lump Sum</option>
                        <option value="Landscape Lump Sum">Landscape Lump Sum</option>
                        <option value="Mosquito Lump Sum">Mosquito Lump Sum</option>
                        <option value="Plumbing Lump Sum">Plumbing Lump Sum</option>
                        <option value="Pool Lump Sum">Pool Lump Sum</option> */}
                          </select>
                        </div>

                        {formData.source === "F&G" && (
                          <>
                            {/* <div className="form-group flex flex-col w-[180px]">
                              <label htmlFor={`reference-${index}`}>
                                Material Name
                              </label>
                              <select
                                name="reference"
                                onChange={(e) => handleMaterialChange(e, index)}
                                id={`reference-${index}`}
                                className="border-b border-[grey] outline-none"
                                value={getMaterialNameInputValue(formData)}
                                required
                              >
                                <option value="">Select One</option>
                                {materials
                                  .filter((item) => {
                                    return item.status === "Active";
                                  })
                                  .map((material) => (
                                    <option
                                      key={material?._id}
                                      value={material.name}
                                    >
                                      {material.name}
                                    </option>
                                  ))}
                              </select>
                            </div> */}
                            <div className="form-group flex flex-col">
                              <label htmlFor={`type-${index}`}>
                                Material Type *
                              </label>
                              <select
                                name="type"
                                onChange={(e) =>
                                  handleFormInputChange(e, index)
                                }
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
                            <div
                              className="form-group flex flex-col w-[180px] relative cursor-pointer"
                              key={index}
                              ref={(el) => (dropdownRefs.current[index] = el)} // Assign ref to each dropdown
                            >
                              <label htmlFor={`reference-${index}`}>
                                Material Name *
                              </label>
                              <div className="relative cursor-pointer">
                                <div
                                  className=""
                                  onClick={() =>
                                    toggleDropdownVisibility(index)
                                  }
                                >
                                  <input
                                    type="text"
                                    id={`materialName-${index}`}
                                    name={`materialName-${index}`}
                                    className="border-b border-[grey] outline-none w-[180px] text-sm pr-3 placeholder:text-base cursor-pointer"
                                    value={getMaterialNameInputValue(formData)}
                                    placeholder="Select Material Name"
                                    readOnly
                                    // onClick={() =>
                                    //   toggleDropdownVisibility(index)
                                    // } // Toggle dropdown
                                    required
                                  />
                                  <span className="absolute right-0 cursor-pointer">
                                    <i className="fa fa-caret-down"></i>
                                  </span>
                                </div>

                                {dropdownVisibility[index] && (
                                  <div className="h-[400px] w-[200px] scrollbar-content overflow-y-auto absolute top-[100%] bg-[white] shadow-md mt-1 z-10">
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
                                onChange={(e) =>
                                  handleFormInputChange(e, index)
                                }
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
                                onChange={(e) =>
                                  handleFormInputChange(e, index)
                                }
                                maxLength={50}
                                value={formData.vendorName}
                                placeholder="Enter Vendor Name"
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
                                onChange={(e) =>
                                  handleFormInputChange(e, index)
                                }
                                value={getMaterialNameInputValue(formData)}
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
                              <label htmlFor={`type-${index}`}>
                                Job Type *
                              </label>
                              <select
                                name="type"
                                onChange={(e) =>
                                  handleFormInputChange(e, index)
                                }
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
                                onChange={(e) =>
                                  handleFormInputChange(e, index)
                                }
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
                                onChange={(e) =>
                                  handleFormInputChange(e, index)
                                }
                                value={getMaterialNameInputValue(formData)}
                                maxLength={100}
                                placeholder="Enter Description"
                                required
                              />
                            </div>
                            <div className="form-group flex flex-col">
                              <label htmlFor={`source-${index}`}>
                                Taxable *
                              </label>
                              <select
                                name="isTaxable"
                                onChange={(e) =>
                                  handleFormInputChange(e, index)
                                }
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
                          </>
                        )}

                        {formData.source.includes("Lump Sum") && (
                          <>
                            <div className="form-group flex flex-col hidden">
                              <label htmlFor={`type-${index}`}>
                                Material Type
                              </label>
                              <select
                                name="type"
                                id={`type-${index}`}
                                className="border-b border-[grey] outline-none w-[180px]"
                                value="Lump Sum"
                                required
                              >
                                <option value="">Select</option>
                                <option value="Lump Sum">Lump Sum</option>
                              </select>
                            </div>
                            <div className="form-group flex flex-col">
                              <label htmlFor={`type-${index}`}>
                                Lump Sum Type
                              </label>
                              <select
                                name="type"
                                id={`type-${index}`}
                                className="border-b border-[grey] outline-none w-[180px]"
                                value={formData.type}
                                onChange={(e) =>
                                  handleFormInputChange(e, index)
                                }
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
                                onChange={(e) =>
                                  handleFormInputChange(e, index)
                                }
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
                                onChange={(e) =>
                                  handleFormInputChange(e, index)
                                }
                                value={getMaterialNameInputValue(formData)}
                                maxLength={100}
                                placeholder="Enter Description"
                                required
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
                              <label htmlFor={`source-${index}`}>
                                Taxable *
                              </label>
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
                          </>
                        )}

                        {["F&G", "Other"].includes(formData.source) && (
                          <>
                            <div className="form-group flex flex-col">
                              <label htmlFor={`measure-${index}`}>
                                Measure *
                              </label>
                              <input
                                type="text"
                                className="border-b border-[grey] outline-none"
                                id={`measure-${index}`}
                                name="measure"
                                onChange={(e) =>
                                  handleFormInputChange(e, index)
                                }
                                value={formData.measure}
                                placeholder="Enter measure"
                                readOnly={
                                  formData.source === "Other" ? false : true
                                }
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
                                onChange={(e) =>
                                  handleFormInputChange(e, index)
                                }
                                value={formData.quantity}
                                placeholder="Enter Quantity"
                                step="any"
                                min={0}
                                max={10000000}
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
                                onChange={(e) =>
                                  handleFormInputChange(e, index)
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
                              />
                            </div>
                          </>
                        )}

                        {formData.source === "Other" && (
                          <>
                            <div className="form-group flex flex-col">
                              <label htmlFor={`totalCost-${index}`}>
                                Total Cost *
                              </label>
                              <input
                                type="number"
                                className="border-b border-[grey] outline-none"
                                id={`totalCost-${index}`}
                                name="totalCost"
                                placeholder="Total cost goes here ..."
                                onChange={(e) =>
                                  handleFormInputChange(e, index)
                                }
                                value={formData.totalCost}
                                min={0}
                                required
                                readOnly
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
                                onChange={(e) =>
                                  handleFormInputChange(e, index)
                                }
                                value={formData?.markup}
                                min={0}
                                max={100}
                                required
                              />
                            </div>
                            <div className="form-group flex flex-col">
                              <label htmlFor={`source-${index}`}>Taxable</label>
                              <select
                                name="isTaxable"
                                onChange={(e) =>
                                  handleFormInputChange(e, index)
                                }
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
                              <label htmlFor={`invoice-${index}`}>
                                Invoice
                              </label>
                              <input
                                type="text"
                                className="border-b border-[grey] outline-none"
                                id={`invoice-${index}`}
                                name="invoice"
                                onChange={(e) =>
                                  handleFormInputChange(e, index)
                                }
                                value={formData.invoice}
                                placeholder="Enter invoice"
                                maxLength={100}
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
                                onChange={(e) =>
                                  handleFormInputChange(e, index)
                                }
                                value={formData.PO}
                                placeholder="Enter PO"
                                maxLength={100}
                                // required
                              />
                            </div>
                          </>
                        )}

                        {["F&G", "Other"].includes(formData.source) ? (
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
                              readOnly
                              min={0}
                              step="any"
                              required
                            />
                          </div>
                        ) : (
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
                              onChange={(e) => handleFormInputChange(e, index)}
                              min={0}
                              required
                            />
                          </div>
                        )}

                        {formData.reference && formData.source === "F&G" && (
                          <div className="form-group flex flex-col">
                            <label htmlFor={`isTaxable-${index}`}>
                              Taxable
                            </label>
                            <input
                              type="text"
                              className="border-b border-[grey] outline-none"
                              id={`isTaxable-${index}`}
                              name="isTaxable"
                              onChange={(e) => handleFormInputChange(e, index)}
                              value={formData.isTaxable ? "Yes" : "No"}
                              placeholder="Enter isTaxable"
                              disabled={true}
                            />
                          </div>
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
                        title="Add Material"
                        className="bg-green-500 text-white h-[35px] w-[35px] rounded-full"
                        onClick={addForm}
                      >
                        <i className="fa fa-plus"></i>
                      </button>
                    </div>
                  </div>
                  {/* Labor logic */}
                  <div className="p-6">
                    {laborForms.length > 0 &&
                      laborForms.map((formData, index) => {
                        return (
                          <div className="flex flex-wrap justify-between gap-x-6 mt-4 shadow-md p-4 relative">
                            <button
                              type="button"
                              className="absolute top-3 right-3 bg-red-500 h-[30px] w-[30px] rounded-full"
                              onClick={() => deleteLaborForm(index)}
                            >
                              <i className="fa fa-close text-white"></i>
                            </button>
                            <div className="form-group flex flex-col w-[180px] hidden">
                              <label htmlFor={`laborCount-${index}`}>
                                Labor Count
                              </label>
                              <input
                                type="number"
                                className="border-b border-[grey] outline-none"
                                id={`laborCount-${index}`}
                                name="laborCount"
                                onChange={(e) =>
                                  handleLaborFormInputChange(e, index)
                                }
                                value={formData.laborCount}
                                placeholder="Enter Labor Count"
                                min={0}
                                max={10000000}
                                required
                              />
                            </div>

                            <div className="form-group flex flex-col w-[180px] hidden">
                              <label htmlFor={`totalManHours-${index}`}>
                                Total Man Hours
                              </label>
                              <input
                                type="number"
                                className="border-b border-[grey] outline-none"
                                id={`totalManHours-${index}`}
                                name="totalManHours"
                                onChange={(e) =>
                                  handleLaborFormInputChange(e, index)
                                }
                                value={formData.totalManHours}
                                placeholder="Enter Man Hours"
                                min={0}
                                max={10000000}
                                required
                              />
                            </div>

                            <div className="form-group flex flex-col w-[180px]">
                              <label htmlFor={`type-${index}`}>
                                Job Type *
                              </label>
                              <select
                                name="type"
                                onChange={(e) =>
                                  handleLaborFormInputChange(e, index)
                                }
                                id={`type-${index}`}
                                className="border-b border-[grey] outline-none"
                                value={formData.type}
                                required
                              >
                                <option value="">Select One</option>
                                {jobTypes
                                  .filter((item) => {
                                    return item.status === "Active";
                                  })
                                  .map((job) => (
                                    <option key={job?._id} value={job.jobName}>
                                      {job.jobName}
                                    </option>
                                  ))}
                              </select>
                            </div>

                            <div className="form-group flex flex-col w-[180px] hidden">
                              <label htmlFor={`perHourCost-${index}`}>
                                Per Hour Cost
                              </label>
                              <input
                                type="number"
                                className="border-b border-[grey] outline-none"
                                id={`perHourCost-${index}`}
                                name="perHourCost"
                                onChange={(e) =>
                                  handleLaborFormInputChange(e, index)
                                }
                                value={formData.perHourCost}
                                placeholder="Enter Per Hour Cost"
                                required
                                min={0}
                                readOnly
                              />
                            </div>

                            <div className="form-group flex flex-col w-[180px] mr-8">
                              <label htmlFor={`totalLaborCost-${index}`}>
                                Total Labor Cost *
                              </label>
                              <input
                                type="number"
                                className="border-b border-[grey] outline-none"
                                id={`totalLaborCost-${index}`}
                                name="totalLaborCost"
                                onChange={(e) =>
                                  handleLaborFormInputChange(e, index)
                                }
                                value={formData.totalLaborCost}
                                placeholder="Total cost goes here..."
                                min={0}
                                max={10000000}
                                step="any"
                                // readOnly
                                required
                              />
                            </div>
                          </div>
                        );
                      })}
                    <div className="text-center mt-8">
                      <button
                        type="button"
                        title="Add Labor"
                        className="bg-green-500 text-white h-[35px] w-[35px] rounded-full"
                        onClick={addLaborForm}
                      >
                        <i className="fa fa-plus"></i>
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div className="card-footer">
                <button
                  type="submit"
                  className="btn bg-[#00613e] text-white"
                  disabled={disableBtn}
                >
                  {disableBtn
                    ? "Please wait..."
                    : type == 1
                    ? "Create Bid"
                    : "Add Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}
