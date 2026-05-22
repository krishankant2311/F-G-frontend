import React, { useEffect, useMemo, useRef, useState } from "react";
import Layout from "../../layout/Layout";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTableContext } from "../../../context/TableContext";
import { useNavigate } from "react-router-dom";
import JoditEditor from "jodit-react";

export default function AddNewProposal() {
  const [formData, setFormData] = useState({
    customerName: "",
    customerId: "",
    customerEmail: "",
    customerPhone: "",
    forms: [
      {
        jobType: "",
        jobAddress: "",
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
  console.log("formdatawdwxcxsxsx", formData.forms[0].jobAddress);

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
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [materials, setMaterials] = useState([]);
  const [jobTypes, setJobTypes] = useState([]);
  const [jobAddress, setJobAddress] = useState([]);
  const editor = useRef(null);
  const config = useMemo(
    () => ({
      readonly: false,
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
    getMaterials();
    window.scrollTo(0, 0);
  }, []);

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
    ? `${selectedCustomerData.customerName} (${selectedCustomerData.jobAddress?.length
      ? selectedCustomerData.jobAddress.join(", ")
      : "No job addresses"
    })`
    : "";
  // Handle search term change
  const handleSearchChangeCustomer = (e) => {
    setSearchTermCustomer(e.target.value);
  };

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

  const toggleDropdownVisibilityCustomer = () => {
    setDropdownCustomerVisibility(!dropdownCustomerVisibility);
    if (!dropdownCustomerVisibility) {
      setSearchTermCustomer(""); // Reset search term when opening the dropdown
    }
  };

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
        customerId: customerId,
        customerName: selectedCustomer.customerName,
        customerEmail: selectedCustomer?.customerEmail,
        customerPhone,
      });
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
        console.log("response", response.data.result);

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
      const updatedCopy = {
        ...updatedForms[formIndex].copies[copyIndex],
        [name]: value,
      };

      console.log("Update", updatedCopy);

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
        // Set Equipment Lump Sum as non-taxable by default, others as taxable
        updatedCopy.isTaxable = value === "Equipment Lump Sum" || "Equipment Fees" ? false : true; 
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
          jobAddress: "",
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

  const convertToBidedSchema = (formData) => {
    return formData.forms.map((form) => {
      // console.log("rvcjdfcf")
      const groupedTypes = {};

      form.copies.forEach((copy) => {
        const typeKey = copy.type || "Unknown";

        if (!groupedTypes[typeKey]) {
          // Find job type from jobTypes array
          const matchedJobType = jobTypes.find(
            (jt) => jt.jobName.toLowerCase().trim() === typeKey.toLowerCase().trim()
          );
          groupedTypes[typeKey] = {
            jobType: typeKey,
            jobAddress: "", // this is the copy's type
            totalCost: 0,
            isLaborTaxable: matchedJobType?.isTaxable || false, // from jobTypes DB
            copies: [],
          };
        }

        // // If any copy in this group is taxable and source is "Labor", mark true
        // if (copy.source === "Labor" && copy.isTaxable) {
        //   groupedTypes[typeKey].isLaborTaxable = true;
        // }

        groupedTypes[typeKey].copies.push({
          ...copy,
          quantity: copy.quantity || 0,
          totalCost: copy.totalCost || 0,
          totalPrice: copy.totalPrice || 0,
        });
      });

      return {
        jobType: form.jobType,
        jobAddress: form.jobAddress,
        description: form.description,
        copies: Object.values(groupedTypes),
      };
    });
  };



  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log("FormData", formData);
      const bidedSchemaData = convertToBidedSchema(formData);
      console.log("Bided Schema", bidedSchemaData);
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
      formdata.append("forms", JSON.stringify(bidedSchemaData));

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
                Add New Bid
              </h3>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="card-body">
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

                <div className="text-end mt-2">
                  <button
                    className={`btn bg-[#00613e] text-white text-sm relative top-1 ${disableBtn ? "disabled" : ""
                      }`}
                    onClick={handleAddJobType}
                    type="button"
                    disabled={disableBtn}
                  >
                    <i className="fa fa-plus mr-2"></i>
                    Add Job Type
                  </button>
                </div>

                {/* Bottom Section */}
                {formData.forms.map((form, formIndex) => (
                  <div
                    key={formIndex}
                    className="mt-4 p-3 border border-gray-300 rounded"
                  >
                    <div className="text-end">
                      <button
                        type="button"
                        className="btn bg-red-500 text-white mt-2"
                        onClick={() => handleRemoveForm(formIndex)}
                      >
                        <i className="fa fa-close text-white"></i>
                      </button>
                    </div>
                    <div className="form-group">
                      <label htmlFor={`jobType-${formIndex}`}>Job Type *</label>
                      <select
                        name="jobType"
                        id={`jobType-${formIndex}`}
                        className="w-full border-[1px] p-2 rounded-sm border-[#d1d1d1] outline-none"
                        value={form.jobType}
                        onChange={(e) =>
                          handleFormChange(formIndex, "jobType", e.target.value)
                        }
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
                      <label className="mt-2" htmlFor={`jobType-${formIndex}`}>Job Address *</label>
                      <input
                        name="jobAddress"
                        id={`jobAddress-${formIndex}`}
                        className="w-full border-[1px] p-2 rounded-sm border-[#d1d1d1] outline-none"
                        value={form.jobAddress}
                        onChange={(e) =>
                          handleFormChange(formIndex, "jobAddress", e.target.value)
                        }
                        required
                      >

                      </input>
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
                          handleFormChange(formIndex, "description", newContent)
                        }
                        onChange={(newContent) =>
                          handleFormChange(formIndex, "description", newContent)
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
                                  handleFormInputChange(e, formIndex, copyIndex)
                                }
                                id={`source-${formIndex}-${copyIndex}`}
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
                                      onClick={() =>
                                        toggleDropdownVisibility(
                                          `${formIndex}-${copyIndex}`
                                        )
                                      }
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
                                              .includes(searchTerm.toLowerCase())
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
                                  // disabled
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
                                <div className="form-group flex flex-col">
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
                                    required
                                  >
                                    <option value="">Select</option>
                                    <option value="Lump Sum">Lump Sum (Sales Tax Paid on Materials)</option>
                                    <option value="Drainage Lump Sum">
                                      Drainage Lump Sum (Sales Tax Paid on
                                      Materials)
                                    </option>
                                    <option value="Electrical Lump Sum">
                                      Electrical Lump Sum (Sales Tax Paid on
                                      Materials)
                                    </option>
                                    <option value="Equipment Lump Sum">
                                      Equipment Lump Sum (Sales Tax Paid on Materials)
                                    </option>
                                    <option value="Equipment Fees">
                                      Equipment Fees (Rental, Heavy Haul, Etc.)                                       </option>
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
                                      formData.source === "Other" ? false : true
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
                                  // readOnly
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

                            <button
                              type="button"
                              className="absolute top-3 right-5 bg-red-500 h-[30px] w-[30px] rounded-full"
                              onClick={() => deleteCopy(formIndex, copyIndex)}
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
                          onClick={() => addCopy(formIndex)}
                        >
                          <i className="fa fa-plus"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="card-footer">
                <button
                  type="submit"
                  disabled={disableBtn}
                  className="btn bg-[#00613e] text-white"
                >
                  {disableBtn ? "Loading..." : "Save Proposal"}
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
