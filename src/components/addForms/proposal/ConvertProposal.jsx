import React, { useEffect, useMemo, useRef, useState } from "react";
import Layout from "../../layout/Layout";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTableContext } from "../../../context/TableContext";
import { Link, useNavigate, useParams } from "react-router-dom";
import JoditEditor from "jodit-react";

export default function ConvertProposal() {
  const [formData, setFormData] = useState([
    {
      customerType: "",
      jobAddress: "",
      billAddress: "",
      billingName: "",
      jobType: "",
      jobName: "",
      foreman: "",
      crew: [],
      projectManager: "",
      truckNo: "",
      trailerNo: "",
      nonTaxCredits: 0,
      nonTaxDescription: "",
      taxCredits: 0,
      taxDescription: "",
      isProjectTaxable: false,
      bidedCopy: [],
    },
  ]);
  const [customer, setCustomer] = useState({
    customerName: "",
    customerId: "",
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
  const { tableSize } = useTableContext();
  const [customers, setCustomers] = useState([]);
  const [isNewAddress, setIsNewAddress] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  // const [selectedCustomerName, setSelectedCustomerName] = useState("");
  // const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [fieldJobType, setFieldJobType] = useState("");
  const [adminTax, setAdminTax] = useState(0);
  const [selectedCrews, setSelectedCrews] = useState([]);
  const [customerJobAddress, setCustomerJobAddress] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [allCrews, setAllCrews] = useState([]);
  const [jobTypes, setJobTypes] = useState([]);
  const dropdownRef = useRef(null); // Reference to dropdown
  const editor = useRef(null);
  const config = useMemo(
    () => ({
      readonly: false,
      placeholder: "",
    }),
    []
  );

  const { id } = useParams();

  // Drop down logic
  const [dropdownCustomerVisibility, setDropdownCustomerVisibility] =
    useState(false); // Track dropdown visibility
  const [searchTermCustomer, setSearchTermCustomer] = useState(""); // Track search term for filtering
  const dropdownRefCustomer = useRef(null);

  const [dropdownVisibility, setDropdownVisibility] = useState(
    forms.map(() => false) // Initialize visibility for each form
  );
  const [searchTerm, setSearchTerm] = useState(""); // Track search term for filtering
  const dropdownRefs = useRef([]);

  useEffect(() => {
    getProposalCopies();
    getCustomers();
    getJobTypes();
    getMaterials();
    getAllCrews();
    window.scrollTo(0, 0);
  }, []);

  const getProposalCopies = async () => {
    try {
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/proposal/get-copies/${id}`,
        { headers: headers }
      );


      if (response.data.statusCode === 200) {
        setFormData(response.data.result);
        if (response.data.result.length > 0) {
          const customerId = response.data.result[0]?.customerId;
          setSelectedCustomer(customerId);
        }
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.log("Error", error);
    }
  };

  useEffect(() => {
    // Find the selected customer details
    const customer = customers.find((c) => c._id === selectedCustomer);
    if (customer) {
      let customerPhone = "";
      if (customer?.customerPhone) {
        customerPhone = customer?.customerPhone?.replace(/\s/g, "");
        customerPhone = Number.parseInt(customerPhone);
      }

      setCustomerJobAddress(customer.jobAddress || []);
    }
  }, [selectedCustomer, customers]);

  const handleCustomerChange = (customer) => {
    const customerId = customer._id;
    setSelectedCustomer(customerId);

    // Close the dropdown after selection
    setDropdownCustomerVisibility(false);

    // Reset the form data and job address if no customer is selected
    if (!customerId) {
      setCustomer({
        customerName: "",
        customerEmail: "",
        customerPhone: "",
      });
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

      setCustomer({
        customerName: selectedCustomer.customerName,
        customerEmail: selectedCustomer?.customerEmail,
        customerPhone,
      });

      setCustomerJobAddress(selectedCustomer.jobAddress || []);
    }
  };

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

  //   useEffect(() => {
  //     const handleOutsideClick = (event) => {
  //       // Check if the clicked element is not inside any of the dropdowns
  //       if (
  //         dropdownRefs.current.every((ref) => ref && !ref.contains(event.target))
  //       ) {
  //         setDropdownVisibility(forms.map(() => false)); // Close all dropdowns
  //       }
  //     };

  //     document.addEventListener("mousedown", handleOutsideClick);

  //     return () => {
  //       document.removeEventListener("mousedown", handleOutsideClick);
  //     };
  //   }, [forms]);

  const handleInputChange = (formIndex, e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prevData) =>
      prevData.map((form, index) =>
        index === formIndex
          ? {
              ...form,
              [name]: type === "checkbox" ? checked : value,
            }
          : form
      )
    );
  };

  const handleSearchChangeCustomer = (e) => {
    setSearchTermCustomer(e.target.value);
  };

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

  const handleCrewChange = (crew, formIndex) => {
    const isSelected = selectedCrews.some(
      (selectedCrew) => selectedCrew._id === crew._id
    );

    const updatedSelectedCrews = isSelected
      ? selectedCrews.filter((selectedCrew) => selectedCrew._id !== crew._id)
      : [...selectedCrews, crew];

    setSelectedCrews(updatedSelectedCrews);

    // Update formData at specific index
    setFormData((prevFormData) => {
      const updatedFormData = [...prevFormData];
      const currentForm = updatedFormData[formIndex];

      updatedFormData[formIndex] = {
        ...currentForm,
        crew: isSelected
          ? currentForm.crew.filter((id) => id !== crew._id)
          : [...currentForm.crew, crew._id],
      };

      return updatedFormData;
    });
  };

  const removeCrew = (crewId) => {
    setSelectedCrews(selectedCrews.filter((crew) => crew._id !== crewId));
    setFormData({
      ...formData,
      crew: formData.crew.filter((id) => id !== crewId),
    });
  };

  // Toggle dropdown visibility
  const toggleDropdownVisibilityCustomer = () => {
    setDropdownCustomerVisibility(!dropdownCustomerVisibility);
    if (!dropdownCustomerVisibility) {
      setSearchTermCustomer(""); // Reset search term when opening the dropdown
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

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleMaterialChange = (e, index) => {
    // const materialName = e.target.value;
    const materialName = e;
    const material = materials.find(
      (material) => material.name === materialName
    );
    const updatedForms = [...forms];
    updatedForms[index] = {
      ...updatedForms[index],
      reference: material.name,
      measure: material.measure,
      price: material.price,
      isTaxable: material.isTaxable,
      totalPrice:
        Number.parseFloat(material.price) *
        Number.parseFloat(forms[index].quantity),
    };
    setForms(updatedForms);
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

  // const deleteForm = (index) => {
  //   const updatedForms = forms.filter((_, i) => i !== index);
  //   setForms(updatedForms);
  // };

  const addForm = () => {
    setForms([
      ...forms,
      {
        source: "F&G",
        type: fieldJobType,
        vendorName: "",
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

  // Add a new job type form
  const handleAddForm = () => {
    setFormData({
      ...formData,
      forms: [
        ...formData.forms,
        {
          jobType: "",
          description: "",
          copies: {
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
        },
      ],
    });
  };

  // Remove a form
  const handleRemoveForm = (index) => {
    const updatedForms = formData.forms.filter((_, i) => i !== index);
    setFormData({ ...formData, forms: updatedForms });
  };

  // Handle jobType & description change for a specific form
  const handleFormChange = (index, field, value) => {
    const updatedForms = [...formData.forms];
    updatedForms[index][field] = value;
    setFormData({ ...formData, forms: updatedForms });
  };

  const handleFormInputChange = (e, formIndex, copyIndex) => {
    const { name, value } = e.target;
    setFormData((prevState) => {
      const updatedForms = [...prevState.forms];
      updatedForms[formIndex].copies[copyIndex] = {
        ...updatedForms[formIndex].copies[copyIndex],
        [name]: value,
      };
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
          copies: {
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

  const handleRadioChange = (formIndex, e) => {
    const { value } = e.target;
    setFormData((prevFormData) =>
      prevFormData.map((item, index) =>
        index === formIndex ? { ...item, customerType: value } : item
      )
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
      };
      setDisableBtn(true);
      const formdata = new FormData();
      formdata.append("forms", JSON.stringify(formData));

      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/proposal/convert-to-proposal/${id}`,
        formdata,
        {
          headers: headers,
        }
      );
      // console.log("Server Response", response);
      if (response.data.statusCode === 200) {
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
                Convert Proposal
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
                    value={formData[0].customerName}
                    onChange={handleInputChange}
                    name="customerName"
                    required
                    readOnly
                  />
                </div>

                <div className="mt-10">
                  {formData.map((formData, formIndex) => {
                    return (
                      <div className="border rounded-lg p-6 mt-10">
                        <div className="form-group">
                          <label htmlFor={`jobType-${formIndex}`}>
                            Job Type *
                          </label>
                          <select
                            name="jobType"
                            id={`jobType-${formIndex}`}
                            className="w-full border-[1px] p-2 rounded-sm border-[#d1d1d1] outline-none"
                            value={formData.jobType}
                            onChange={(e) => handleInputChange(formIndex, e)}
                            required
                            disabled
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

                        <div
                          onClick={() => {
                            navigate(
                              `/panel/office/proposal-entries/${formData.proposalId}/${formData._id}`,
                            );
                          }}
                          className="text-[green] tracking-wide font-medium underline cursor-pointer"
                        >
                          <span >
                            View Entries
                          </span>
                        </div>

                        <div className="form-group mt-4">
                          <label>Customer Type *</label>
                          <div className="flex gap-x-10 mb-3 mt-1">
                            {["Normal", "Commercial", "Exempt"].map((type) => (
                              <div
                                key={type}
                                className="flex items-center gap-x-3"
                              >
                                <input
                                  type="radio"
                                  id={`${type}-${formIndex}`}
                                  name={`customerType-${formIndex}`} // unique per form group
                                  value={type}
                                  checked={formData.customerType === type}
                                  onChange={(e) =>
                                    handleRadioChange(formIndex, e)
                                  }
                                  className="h-[20px] w-[20px] cursor-pointer"
                                />
                                <label
                                  htmlFor={`${type}-${formIndex}`}
                                  className="text-normal font-medium cursor-default mb-1"
                                >
                                  {type}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="form-group">
                          <label htmlFor={`projectCode-${formIndex}`}>
                            Project Code *
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            id={`projectCode-${formIndex}`}
                            placeholder="Enter Project Code"
                            value={formData.projectCode}
                            onChange={(e) => handleInputChange(formIndex, e)}
                            name="projectCode"
                            maxLength={14}
                            autoComplete="off"
                            required
                          />
                        </div>

                        {selectedCustomer ? (
                          <div className="form-group">
                            <div className="flex justify-between items-end">
                              <label
                                htmlFor="jobAddress"
                                className="relative top-1"
                              >
                                Job Address *
                              </label>
                              <button
                                type="button"
                                className={`${
                                  isNewAddress
                                    ? "bg-danger"
                                    : "bg-[#00613e] text-white"
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
                                onChange={(e) =>
                                  handleInputChange(formIndex, e)
                                }
                                name="jobAddress"
                                maxLength={150}
                                required
                              />
                            ) : (
                              <select
                                name="jobAddress"
                                onChange={(e) =>
                                  handleInputChange(formIndex, e)
                                }
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
                              onChange={(e) => handleInputChange(formIndex, e)}
                              name="jobAddress"
                              maxLength={70}
                              required
                            />
                          </div>
                        )}

                        <div className="form-group">
                          <label htmlFor={`billingName-${formIndex}`}>
                            Billing Name
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            id={`billingName-${formIndex}`}
                            placeholder="Enter bill name"
                            value={formData.billingName}
                            onChange={(e) => handleInputChange(formIndex, e)}
                            name="billingName"
                            maxLength={70}
                            autoComplete="off"
                            // required
                          />
                        </div>
                        
                        <div className="form-group">
                          <label htmlFor={`billAddress-${formIndex}`}>
                            Billing Address
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            id={`billAddress-${formIndex}`}
                            placeholder="Enter bill Address"
                            value={formData.billAddress}
                            onChange={(e) => handleInputChange(formIndex, e)}
                            name="billAddress"
                            maxLength={70}
                            autoComplete="off"
                            // required
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor={`jobName-${formIndex}`}>
                            Job Name
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            id={`jobName-${formIndex}`}
                            placeholder="Enter Job Name"
                            value={formData.jobName}
                            onChange={(e) => handleInputChange(formIndex, e)}
                            name="jobName"
                            maxLength={100}
                            autoComplete="off"
                            // required
                          />
                        </div>

                        <div className="form-group">
                          <label htmlFor={`foreman-${formIndex}`}>
                            Foreman
                          </label>
                          <select
                            name="foreman"
                            onChange={(e) => handleInputChange(formIndex, e)}
                            id={`foreman-${formIndex}`}
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
                        </div>

                        <div className="form-group mb-4" key={formIndex}>
                          <label htmlFor={`crew-${formIndex}`}>
                            Select Crew *
                          </label>

                          <div className="dropdown" ref={dropdownRef}>
                            <button
                              className="w-full border-[1px] px-2 h-[40px] rounded-sm border-[#d1d1d1] outline-none text-start"
                              type="button"
                              onClick={() =>
                                setIsDropdownOpen((prev) =>
                                  prev === formIndex ? null : formIndex
                                )
                              }
                            >
                              Select crew
                            </button>

                            {isDropdownOpen === formIndex && (
                              <div className="dropdown-content border-[1px] border-[#d1d1d1] bg-white max-h-[320px] overflow-auto z-10 relative">
                                {allCrews.filter(
                                  (crew) =>
                                    crew.status === "Active" &&
                                    !formData.crew.includes(crew._id) && // 👈 remove already selected
                                    crew._id !== formData.foreman &&
                                    crew._id !== formData.projectManager
                                ).length > 0 ? (
                                  allCrews
                                    .filter(
                                      (crew) =>
                                        crew.status === "Active" &&
                                        !formData.crew.includes(crew._id) && // 👈 this line is the key
                                        crew._id !== formData.foreman &&
                                        crew._id !== formData.projectManager
                                    )
                                    .map((crew, index) => (
                                      <label
                                        key={index}
                                        className="flex items-center px-3 h-[34px] cursor-pointer text-[15px] hover:bg-[#e8e7e7]"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={formData.crew.includes(
                                            crew._id
                                          )}
                                          onChange={() =>
                                            handleCrewChange(crew, formIndex)
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

                          {/* Selected Crews Display */}
                          <div className="flex flex-wrap gap-3 mt-2">
                            {allCrews
                              .filter((crew) =>
                                formData.crew.includes(crew._id)
                              )
                              .map((crew, index) => (
                                <div
                                  key={index}
                                  className="bg-[#00613e] text-white flex justify-center items-center rounded-full px-2 h-[32px] text-sm"
                                >
                                  {crew.crewName}
                                  <button
                                    type="button"
                                    className="text-white rounded-full ml-2 my-1 text-xs"
                                    onClick={() =>
                                      handleCrewChange(crew, formIndex)
                                    }
                                  >
                                    <i className="fa fa-close"></i>
                                  </button>
                                </div>
                              ))}
                          </div>
                        </div>

                        <div className="form-group mt-3">
                          <label htmlFor={`projectManager-${formIndex}`}>
                            Project Manager
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            id={`projectManager-${formIndex}`}
                            placeholder="Enter Project Manager"
                            value={formData.projectManager}
                            onChange={(e) => handleInputChange(formIndex, e)}
                            maxLength={50}
                            name="projectManager"
                            // required
                          />
                        </div>
                        <div className="form-group mt-3">
                          <label htmlFor={`truckNo-${formIndex}`}>
                            Truck No
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            id={`truckNo-${formIndex}`}
                            placeholder="Enter Truck No"
                            value={formData.truckNo}
                            onChange={(e) => handleInputChange(formIndex, e)}
                            name="truckNo"
                            maxLength={40}
                            // required
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor={`trailerNo-${formIndex}`}>
                            Trailer No
                          </label>
                          <input
                            type="number"
                            className="form-control"
                            id={`trailerNo-${formIndex}`}
                            placeholder="Enter Trailer No"
                            value={formData.trailerNo}
                            onChange={(e) => handleInputChange(formIndex, e)}
                            name="trailerNo"
                            // required
                          />
                        </div>

                        <div className="flex gap-10 justify-between">
                          <div className="form-group w-full">
                            <label htmlFor={`nonTaxCredits-${formIndex}`}>
                              Non-Taxable Credits
                            </label>
                            <input
                              type="number"
                              className="form-control"
                              id={`nonTaxCredits-${formIndex}`}
                              placeholder="Enter Non Tax Credits"
                              value={formData.nonTaxCredits}
                              onChange={(e) => handleInputChange(formIndex, e)}
                              name="nonTaxCredits"
                              min={0}
                              max={10000000}
                              step="any"
                              required
                            />
                          </div>
                          <div className="form-group w-full">
                            <label htmlFor={`nonTaxDescription-${formIndex}`}>
                              Description
                            </label>
                            <input
                              type="text"
                              className="form-control"
                              id={`nonTaxDescription-${formIndex}`}
                              placeholder="Enter Description"
                              value={formData.nonTaxDescription}
                              onChange={(e) => handleInputChange(formIndex, e)}
                              name="nonTaxDescription"
                              maxLength={200}
                              // required
                            />
                          </div>
                        </div>
                        <div className="flex gap-10 justify-between">
                          <div className="form-group w-full">
                            <label htmlFor={`taxCredits-${formIndex}`}>
                              Taxable Credits
                            </label>
                            <input
                              type="number"
                              className="form-control"
                              id={`taxCredits-${formIndex}`}
                              placeholder="Enter Non Tax Credits"
                              value={formData.taxCredits}
                              onChange={(e) => handleInputChange(formIndex, e)}
                              name="taxCredits"
                              step="any"
                              min={0}
                              max={10000000}
                              required
                            />
                          </div>
                          <div className="form-group w-full">
                            <label htmlFor={`taxDescription-${formIndex}`}>
                              Description
                            </label>
                            <input
                              type="text"
                              className="form-control"
                              id={`taxDescription-${formIndex}`}
                              placeholder="Enter Description"
                              value={formData.taxDescription}
                              onChange={(e) => handleInputChange(formIndex, e)}
                              name="taxDescription"
                              maxLength={200}
                              // required
                            />
                          </div>
                        </div>
                      <div className="flex justify-start gap-4 mt-4">
  <input
    type="checkbox"
    className="h-[20px] w-[20px] cursor-pointer"
    id={`isProjectTaxable-${formIndex}`}
    checked={formData.isProjectTaxable}
    onChange={(e) => handleInputChange(formIndex, e)}
    name="isProjectTaxable"
  />
  <label
    htmlFor="isProjectTaxable"
    className="cursor-pointer"
  >
    Is Taxable
  </label>
</div>
{(formData.customerType === "Commercial" || 
  formData.customerType === "Exempt" || 
  !formData.isProjectTaxable) && (
  <div className="mt-3 p-3 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700">
    <p className="font-semibold">
      ⚠️ No Sales Tax - This project is marked as{" "}
      {formData.customerType === "Commercial" && "Commercial"}
      {formData.customerType === "Exempt" && "Tax Exempt"}
      {!formData.isProjectTaxable && formData.customerType === "Normal" && "Non-Taxable"}
    </p>
  </div>
)}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="card-footer">
                <button
                  type="submit"
                  disabled={disableBtn}
                  className="btn bg-[#00613e] text-white"
                >
                  {disableBtn ? "Loading..." : "Convert To Project"}
                </button>
              </div>
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
      </div>
    </Layout>
  );
}
