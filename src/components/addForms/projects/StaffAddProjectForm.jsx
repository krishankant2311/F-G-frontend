import React, { useEffect, useMemo, useRef, useState } from "react";
import Layout from "../../layout/Layout";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTableContext } from "../../../context/TableContext";
import { useNavigate, useParams } from "react-router-dom";
import "../../../styles/scrollbar.css";
import JoditEditor from "jodit-react";

export default function StaffAddProjectForm() {
  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    customerType: "Normal",
    billingType: "No Bid",
    billAddress: "",
    billingName : "",
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
    jobName: "",
    isProjectTaxable: false,
  });
  const editor = useRef(null);
  const config = useMemo(
    () => ({
      readonly: false,
      placeholder: "",
      events: {
        afterInit: (editor) => {
          editor.events.on("change", () => {
            let text = editor.getEditorValue();
            if (text.length > 100) {
              text = text.substring(0, 100); // Limit to 100 characters
              editor.setEditorValue(text); // Force content update
              // alert("Character limit reached!");
            }
          });
        },
      },
    }),
    []
  );
  const [isNewAddress, setIsNewAddress] = useState(false);
  const [disableBtn, setDisableBtn] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [allCrews, setAllCrews] = useState([]);
  const [jobTypes, setJobTypes] = useState([]);
  const [selectedCrews, setSelectedCrews] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [customerJobAddress, setCustomerJobAddress] = useState([]);
  const dropdownRef = useRef(null); // Reference to dropdown
  const navigate = useNavigate();

  const { tableSize } = useTableContext();

  useEffect(() => {
    getCustomers();
    getAllCrews();
    getJobTypes();
    window.scrollTo(0, 0);
  }, []);

  // useEffect(() => {
  //   if (editor.current) {
  //     const editorInstance = editor.current;

  //     editorInstance.events.on("beforeEnter", (e) => {
  //       let text = editorInstance.getEditorValue();
  //       if (text.length >= 100) {
  //         e.preventDefault(); // Block input beyond 100 characters
  //         toast.error("Character limit reached!");
  //         return false;
  //       }
  //     });

  //     editorInstance.events.on("beforeCommand", (command) => {
  //       let text = editorInstance.getEditorValue();
  //       if (text.length >= 100 && command === "insertHTML") {
  //         toast.error("Character limit reached!");
  //         return false; // Prevent inserting extra text
  //       }
  //     });
  //   }
  // }, []);

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

  // const handleCustomerChange = (e) => {
  //   const customerId = e.target.value;
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
        customerEmail: selectedCustomer?.customerEmail,
        customerPhone,
      });

      setCustomerJobAddress(selectedCustomer.jobAddress || []);
    }
  };

  // console.log("Formdata", formData);

  function containsNumberOrSpecialChar(text) {
    // Regular expression to check for numbers (0-9) or special characters
    const regex = /[0-9!@#$%^&*(),.?":{}|<>]/;

    // Test the text against the regex
    return regex.test(text);
  }

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData?.customerName?.trim() === "") {
      toast.error("Please enter customer name.");
      return;
    }

    if (formData.customerPhone && !isTenDigits(formData.customerPhone)) {
      toast.error("Please enter 10 digit phone number.");
      return;
    }

    if (formData?.jobAddress?.trim() === "") {
      toast.error("Please enter job address.");
      return;
    }

    // if (formData?.description?.trim() === "") {
    //   toast.error("Please enter description.");
    //   return;
    // }

    if (selectedCrews?.length === 0) {
      toast.error("Please select at least one crew.");
      return;
    }

    // if (formData.truckNo.trim() === "") {
    //   toast.error("Please enter truck number.");
    //   return;
    // }

    const selectedType = selectedCustomer === "" ? 0 : 1;

    // return;
    try {
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
      };
      setDisableBtn(true);
      const formdata = new FormData();
      formdata.append("credits", formData.credits);
      formdata.append("customerName", formData.customerName);
      formdata.append("customerEmail", formData.customerEmail);
      formdata.append("customerPhone", formData.customerPhone);
      formdata.append("customerType", formData.customerType);
      formdata.append("billingType", formData.billingType);
      formdata.append("jobAddress", formData.jobAddress);
      // if(formData?.billAddress){
      formdata.append("billAddress", formData.billAddress);
      formdata.append("billingName", formData.billingName);
      // }
      formdata.append("jobType", formData.jobType);
      formdata.append("foreman", formData.foreman);
      formdata.append("description", formData.description);
      formdata.append("crew", formData.crew);
      formdata.append("projectManager", formData.projectManager);
      formdata.append("truckNo", formData.truckNo);
      formdata.append("jobName", formData.jobName);
      formdata.append("trailerNo", formData.trailerNo);
      formdata.append("selectedType", selectedType);
      formdata.append("customerId", selectedCustomer);
      formdata.append("isProjectTaxable", formData.isProjectTaxable);
      formdata.append("nonTaxCredits", formData.nonTaxCredits);
      formdata.append("nonTaxDescription", formData.nonTaxDescription);
      formdata.append("taxCredits", formData.taxCredits);
      formdata.append("taxDescription", formData.taxDescription);

      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/project/add-project`,
        formdata,
        {
          headers: headers,
        }
      );

      if (response.data.statusCode === 201) {
        toast.success(response.data.message);
        localStorage.removeItem("lastViewedCode");
        navigate(`/panel/office/all-projects/1`);
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

  // // Find the selected customer's name based on the selected customerId
  // const selectedCustomerName =
  //   (customers.find((customer) => customer._id === selectedCustomer)
  //     ?.customerName + " (" +
  //     customers
  //       .find((customer) => customer._id === selectedCustomer)
  //       ?.jobAddress.join(", ") + " )") || "";

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

  // console.log("FormData", formData)

  const stripHtml = (html) => {
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent || div.innerText || "";
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
                {" "}
                <button
                  onClick={() => {
                    navigate(-1);
                  }}
                >
                  <i className="fa fa-arrow-left mr-2"></i>
                </button>{" "}
                {"Add New Project"}
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
                  <label htmlFor="billingType">Select Customer</label>
                  <div className="relative">
                    <input
                      type="text"
                      id="selectedCustomer"
                      name="selectedCustomer"
                      className="w-full border-[1px] p-2 rounded-sm border-[#d1d1d1] outline-none cursor-pointer text-[16px] pl-2"
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
                              className="p-2 cursor-pointer hover:bg-gray-200 text-sm"
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

                <>
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
                </>

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
                    autoComplete="off"
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
                    maxLength={50}
                    autoComplete="off"
                    // required
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
                          isNewAddress ? "bg-danger" : "bg-[#00613e] text-white"
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
                        maxLength={150}
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
                      required
                    />
                  </div>
                )}
                <div className="form-group">
                  <label htmlFor="billAddress">Billing Name</label>
                  <input
                    type="text"
                    className="form-control"
                    id="billingName"
                    placeholder="Enter bill name"
                    value={formData.billingName}
                    onChange={handleInputChange}
                    name="billingName"
                    maxLength={70}
                    autoComplete="off"
                    // required
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
                    maxLength={50}
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
                    <option value="No Bid">No Bid</option>
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
                <div className="form-group">
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
                <div className="form-group">
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
                <div className="form-group mt-3">
                  <label htmlFor="projectManager">Project Manager</label>
                  <input
                    type="text"
                    className="form-control"
                    id="projectManager"
                    placeholder="Enter Project Manager"
                    value={formData.projectManager}
                    onChange={handleInputChange}
                    maxLength={50}
                    name="projectManager"
                    // required
                  />
                </div>
                <div className="form-group mt-3">
                  <label htmlFor="description">Description</label>

                  <JoditEditor
                    ref={editor}
                    config={config}
                    value={formData.description}
                    tabIndex={1}
                    onBlur={(newContent) => {
                      // const plainText = stripHtml(newContent);
                      // if (plainText.length > 50) {
                      //   toast.error("Description cannot exceed 50 characters");
                      //   return;
                      // }
                      setFormData({
                        ...formData,
                        description: newContent,
                      });
                    }}
                    onChange={(newContent) => {
                      // const plainText = stripHtml(newContent);
                      // if (plainText.length > 50) {
                      //   toast.error("Description cannot exceed 50 characters");
                      //   return;
                      // }
                      setFormData({
                        ...formData,
                        description: newContent,
                      });
                    }}
                  />
                </div>

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
                    maxLength={40}
                    // required
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
              </div>

              <div className="card-footer">
                <button
                  type="submit"
                  className="btn bg-[#00613e] text-white"
                  disabled={disableBtn}
                >
                  {disableBtn ? "Please wait..." : "Add Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}
