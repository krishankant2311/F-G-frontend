import React, { useEffect, useMemo, useRef, useState } from "react";
import Layout from "../../layout/Layout";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useTableContext } from "../../../context/TableContext";
import JoditEditor from "jodit-react";

export default function EditBidProjectForm() {
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
    customerType: "",
    billingType: "Bid",
    jobAddress: "",
    jobType: "",
    jobName: "",
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
  const [initialJobType, setInitialJobType] = useState("");
  const [initialForeman, setInitialForeman] = useState("");
  const [initialCrews, setInitialCrews] = useState([]);
  const [initialProjectManager, setInitialProjectManager] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [categories, setCategories] = useState([]);
  const [crews, setCrews] = useState([]);
  const [selectedCrews, setSelectedCrews] = useState([]);
  const [allCrews, setAllCrews] = useState([]);
  const [disableBtn, setDisableBtn] = useState(false);
  const [jobTypes, setJobTypes] = useState([]);
  const [projectManagers, setProjectManagers] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [forms, setForms] = useState([
    {
      source: "F&G",
      type: "",
      reference: "",
      measure: "",
      quantity: "",
      price: "",
      totalPrice: "",
      isTaxable: false,
      startDate: Date.now(),
      endDate: Date.now(),
    },
  ]);
  const { id, type } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [labors, setLabors] = useState([]);
  const pageNo = location.state.data;

  const { tableSize } = useTableContext();

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
        type: "Other",
        reference: "",
        measure: "",
        quantity: "",
        price: "",
        totalPrice: "",
        isTaxable: false,
      };
    }

    if (name === "type") {
      updatedForms[index] = {
        ...updatedForms[index],
        [name]: value,
        reference: "",
        measure: "",
        quantity: "",
        price: "",
        totalPrice: "",
        isTaxable: false,
      };
    }

    const updatedForm = { ...updatedForms[index], [name]: value };

    // Calculate total price if both price and quantity are filled
    if (name === "price" || name === "quantity") {
      const price = parseFloat(updatedForm.price) || 0;
      const quantity = parseFloat(updatedForm.quantity) || 0;
      updatedForm.totalPrice = price && quantity ? price * quantity : "";
    }

    updatedForms[index] = updatedForm;
    setForms(updatedForms);
  };

  function containsNumberOrSpecialChar(text) {
    // Regular expression to check for numbers (0-9) or special characters
    const regex = /[0-9!@#$%^&*(),.?":{}|<>]/;

    // Test the text against the regex
    return regex.test(text);
  }

  useEffect(() => {
    getProjectById();
    getCrewCategories();
    getCrews();
    // getLabors();
    getAllCrews();
    getJobTypes();
    getProjectManagers();
    getMaterials();
    // Set selected crews based on the project data
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const selected = allCrews.filter((crew) => {
      return formData.crew.includes(crew._id);
    });
    setSelectedCrews(selected);
  }, [allCrews, formData]);

  const getProjectById = async () => {
    try {
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
          projectManager: response.data.result.projectManager,
          credits: response.data.result?.credits || 0,
          billAddress: response?.data?.result?.billAddress || "",
          jobName: response?.data?.result?.jobName || "",
          isProjectTaxable: response?.data?.result?.isProjectTaxable,
          customerType: response.data.result?.customerType || "Normal",
          nonTaxCredits: response.data.result?.nonTaxCredits || 0,
          nonTaxDescription: response.data.result?.nonTaxDescription || "",
          taxCredits: response.data.result?.taxCredits || 0,
          taxDescription: response.data.result?.taxDescription || "",
        });
        setInitialJobType(response.data.result.jobType);
        setInitialForeman(response.data.result.foreman);
        setInitialCrews(response.data.result.crew);
        setInitialProjectManager(response.data.result.projectManager);
        setForms(response.data.result.officeFieldCopy);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response.message);
    }
  };

  // const handleCrewChange = (e) => {
  //   const selectedCrewId = e.target.value;
  //   const selectedCrew = allCrews.find((crew) => crew._id === selectedCrewId);

  //   if (selectedCrew && !selectedCrews.includes(selectedCrew)) {
  //     setSelectedCrews([...selectedCrews, selectedCrew]);
  //     setFormData({
  //       ...formData,
  //       crew: [...formData.crew, selectedCrewId],
  //     });
  //   }
  // };

  const handleCrewChange = (crewId) => {
    const selectedCrew = allCrews.find((crew) => crew._id === crewId);
    const isSelected = selectedCrews.some((crew) => crew._id === crewId);

    if (!isSelected && selectedCrew) {
      // Add crew if not already selected
      setSelectedCrews([...selectedCrews, selectedCrew]);
      setFormData({
        ...formData,
        crew: [...formData.crew, selectedCrew._id],
      });
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
      console.error("Error", error);
    }
  };

  const removeCrew = (crewId) => {
    setSelectedCrews(selectedCrews.filter((crew) => crew._id !== crewId));
    setFormData({
      ...formData,
      crew: formData.crew.filter((id) => id !== crewId),
    });
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
      console.error("Error", error);
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
      console.error("Error", error);
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
      console.error("Error", error);
    }
  };

  function isTenDigits(number) {
    // Convert the number to a string to handle cases where the input is numeric
    const numberStr = number.toString();
    return numberStr.length === 10;
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
      console.error("Error", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData?.customerName?.trim() === "") {
      toast.error("Please enter customer name.");
      return;
    }

    // if (!isTenDigits(formData.customerPhone)) {
    //   toast.error("Please enter 10 digit phone number.");
    //   return;
    // }

    if (formData?.jobAddress?.trim() === "") {
      toast.error("Please enter job address.");
      return;
    }

    // if (formData?.description?.trim() === "") {
    //   toast.error("Please enter description.");
    //   return;
    // }

    // if (formData.truckNo.trim() === "") {
    //   toast.error("Please enter truck number.");
    //   return;
    // }

    // let isValidPrice = forms.some((form) => {
    //   return (
    //     Number.parseFloat(form.price) * Number.parseFloat(form.quantity) !==
    //     Number.parseFloat(form.totalPrice)
    //   );
    // });

    // if (isValidPrice) {
    //   toast.error("Please ensure all field copies have valid prices.");
    //   return;
    // }

    try {
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
      };
      const formdata = new FormData();
      formdata.append("credits", formData.credits);
      formdata.append("customerName", formData.customerName);
      formdata.append("customerEmail", formData.customerEmail ?? "");
      formdata.append("customerPhone", formData.customerPhone);
      formdata.append("customerType", formData.customerType);
      formdata.append("billingType", formData.billingType);
      formdata.append("jobAddress", formData.jobAddress);
      formdata.append("jobType", formData.jobType);
      //   formdata.append("foreman", formData.foreman);
      formdata.append("description", formData.description);
      formdata.append("billAddress", formData.billAddress);
      formdata.append("jobName", formData.jobName);
      formdata.append("isProjectTaxable", formData.isProjectTaxable);
      formdata.append("nonTaxCredits", formData.nonTaxCredits);
      formdata.append("nonTaxDescription", formData.nonTaxDescription);
      formdata.append("taxCredits", formData.taxCredits);
      formdata.append("taxDescription", formData.taxDescription);

      //   formdata.append("crew", formData.crew);
      //   formdata.append("projectManager", formData.projectManager);
      //   formdata.append("truckNo", formData.truckNo);
      //   formdata.append("trailerNo", formData.trailerNo);
      // if(type == 1){
      //   formdata.append("forms", JSON.stringify(forms));
      // }
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
        // if(type == 0){
        //   navigate("/panel/office/all-projects");
        // }else{
        //   navigate(`/panel/office/bid-projects`);
        // }
        navigate(-1);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error("Error", error);
      toast.error(error.response.message);
    }
    setDisableBtn(false);
  };

  const [data, setData] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, settotalRecords] = useState(0);
  const [sortBy, setSortBy] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc");
  const [term, setTerm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getAllFieldCopies();
  }, [currentPage, sortBy, sortOrder]);

  const getAllFieldCopies = async () => {
    try {
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      setLoading(true);
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/project/get-office-field-copy/${id}?page=${currentPage}`,
        { headers: headers }
      );

      if (response.data.statusCode === 200) {
        setData(response.data.result.fieldCopies);
        setTotalPages(response.data.result.totalPages);
        settotalRecords(response.data.result.totalRecords);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error("Error", error);
    }
    setLoading(false);
  };

  // const handleFormInputChange = (e, index) => {
  //   const { name, value } = e.target;
  //   const updatedForms = [...forms];
  //   const updatedForm = { ...updatedForms[index], [name]: value };

  //   // Check if both price and quantity are present and valid
  //   if (name === "price" || name === "quantity") {
  //     const price = parseFloat(updatedForm.price) || 0;
  //     const quantity = parseFloat(updatedForm.quantity) || 0;

  //     if (price && quantity) {
  //       updatedForm.totalPrice = price * quantity;
  //     } else {
  //       updatedForm.totalPrice = "";
  //     }
  //   }

  //   updatedForms[index] = updatedForm;
  //   setForms(updatedForms);
  // };

  const addForm = () => {
    setForms([
      ...forms,
      {
        source: "F&G",
        type: "Material",
        reference: "",
        measure: "",
        quantity: "",
        price: "",
        totalPrice: "",
        isTaxable: "",
      },
    ]);
  };

  const handleMaterialChange = (e, index) => {
    const materialName = e.target.value;
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

  const handleLaborChange = (e, index) => {
    const jobName = e.target.value;
    const labor = labors.find((labor) => labor.jobName === jobName);
    const updatedForms = [...forms];
    updatedForms[index] = {
      ...updatedForms[index],
      reference: labor.jobName,
      measure: labor.measure,
      price: labor.price,
      isTaxable: labor.isTaxable,
      totalPrice:
        Number.parseFloat(labor.price) *
        Number.parseFloat(forms[index].quantity),
    };
    setForms(updatedForms);
  };

  const getLabors = async () => {
    try {
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/admin/get-labors-dpd`,
        { headers: headers }
      );
      if (response.data.statusCode === 200) {
        setLabors(response.data.result);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error("Error", error);
    }
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
      console.error("Error", error);
    }
  };

  const moveToEditForm = (fieldId) => {
    navigate(`/panel/office/project/field-copy/edit/${id}/${fieldId}`);
  };

  const viewProject = (id) => {
    navigate(`/panel/office/project/view/${id}`);
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const sortedData = () => {
    let sorted = [...data];
    if (sortBy) {
      sorted.sort((a, b) => {
        const aValue = a[sortBy];
        const bValue = b[sortBy];
        if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
        if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
    }
    return sorted;
  };

  const previousPage = () => {
    if (currentPage <= 1) {
      return;
    }
    setCurrentPage(currentPage - 1);
  };

  const nextPage = () => {
    if (currentPage >= totalPages) {
      return;
    }
    setCurrentPage(currentPage + 1);
  };

  const handleStatus = async (e, fieldId, status) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
      };
      const formdata = new FormData();
      formdata.append("status", status);
      setDisableBtn(true);
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/project/handle-field-copy/${id}/${fieldId}`,
        formdata,
        {
          headers: headers,
        }
      );
      if (response.data.statusCode === 200) {
        toast.success(response.data.message);
        getAllFieldCopies();
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response.message);
    }
    setDisableBtn(false);
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
                Edit Bid
              </h3>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="card-body">
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
                        checked={formData?.customerType === type}
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
                    title="Please enter only letters and spaces."
                    // pattern="[a-zA-Z\s]*"
                    required
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
                  />
                </div>
                <div className="form-group hidden">
                  <label htmlFor="billingType">Billing Type</label>
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
                        return (
                          item.status === "Active" ||
                          item._id === initialJobType
                        );
                      })
                      .map((item, index) => (
                        <option
                          key={index}
                          value={item._id}
                          className={
                            item.status === "Delete"
                              ? "text-[red]"
                              : "text-[black]"
                          }
                        >
                          {item.jobName}
                        </option>
                      ))}
                  </select>
                </div>
                {type == 0 && (
                  <div className="form-group">
                    <label htmlFor="foreman">Foreman</label>
                    <select
                      name="foreman"
                      onChange={handleInputChange}
                      id="foreman"
                      className="w-full border-[1px] p-2 rounded-sm border-[#d1d1d1] outline-none"
                      value={formData.foreman}
                      required
                    >
                      <option value="">Select Foreman</option>
                      {allCrews
                        .filter((item) => {
                          return (
                            (item.status === "Active" ||
                              item._id === initialForeman) &&
                            item._id !== formData.projectManager && // Filter out the selected Project Manager
                            !selectedCrews.some((crew) => crew._id === item._id)
                          );
                        })
                        .map((item, index) => (
                          <option
                            key={index}
                            value={item._id}
                            className={
                              item.status === "Delete"
                                ? "text-[red]"
                                : "text-[black]"
                            }
                          >
                            {item.crewName}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {/* <div className="form-group">
                  <label htmlFor="crew">Select Crews</label>
                  <select
                    name="crew"
                    onChange={handleCrewChange}
                    className="w-full border-[1px] p-2 rounded-sm border-[#d1d1d1] outline-none"
                    value=""
                  >
                    <option value="">Select crew</option>
                    {allCrews
                      .filter(
                        (crew) =>
                          !selectedCrews.includes(crew) &&
                          crew.status === "Active" || initialCrews.includes(crew._id) && !selectedCrews.includes(crew)
                      )
                      .map((item, index) => (
                        <option key={index} value={item._id} className={
                          item.status === "Delete"
                            ? "text-[red]"
                            : "text-[black]"
                        }>
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
                        crew.status === "Active" ? "bg-primary" : "bg-danger"
                      } bg-primary flex justify-center items-center rounded-full px-2 h-[32px] text-sm`}
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
                </div> */}
                {type == 0 && (
                  <div className="form-group">
                    <label htmlFor="crew">Select Crew *</label>
                    <div className="dropdown" ref={dropdownRef}>
                      {/* Custom dropdown */}
                      <button
                        className="w-full border-[1px] px-2 h-[40px] rounded-sm border-[#d1d1d1] outline-none text-start"
                        type="button"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      >
                        Select crew
                      </button>

                      {/* Dropdown content with checkboxes */}
                      {/* {isDropdownOpen && (
                      <div className="dropdown-content border-[1px] border-[#d1d1d1] bg-white max-h-[200px] overflow-auto">
                        {allCrews
                          .filter(
                            (crew) =>
                              (!selectedCrews.includes(crew) &&
                                crew.status === "Active") ||
                              (initialCrews.includes(crew._id) &&
                                !selectedCrews.includes(crew))
                          )
                          .map((crew, index) => (
                            <label
                              key={index}
                              className="flex items-center py-2 pl-3 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedCrews.some(
                                  (selectedCrew) =>
                                    selectedCrew._id === crew._id
                                )}
                                onChange={() => handleCrewChange(crew._id)}
                                className="mr-2 hidden"
                              />
                              <span
                                className={
                                  crew.status === "Delete"
                                    ? "text-red-500"
                                    : "text-black"
                                }
                              >
                                {crew.crewName}
                              </span>
                            </label>
                          ))}
                      </div>
                    )} */}
                      {isDropdownOpen && (
                        <div className="dropdown-content border-[1px] border-[#d1d1d1] bg-white max-h-[320px] overflow-auto">
                          {allCrews.filter(
                            (crew) =>
                              ((!selectedCrews.includes(crew) &&
                                crew.status === "Active") ||
                                (initialCrews.includes(crew._id) &&
                                  !selectedCrews.includes(crew))) &&
                              crew._id !== formData.foreman &&
                              crew._id !== formData.projectManager
                          ).length > 0 ? (
                            allCrews
                              .filter(
                                (crew) =>
                                  // (!selectedCrews.includes(crew) &&
                                  //   crew.status === "Active") ||
                                  // (initialCrews.includes(crew._id) &&
                                  //   !selectedCrews.includes(crew))
                                  ((!selectedCrews.includes(crew) &&
                                    crew.status === "Active") ||
                                    (initialCrews.includes(crew._id) &&
                                      !selectedCrews.includes(crew))) &&
                                  crew._id !== formData.foreman &&
                                  crew._id !== formData.projectManager
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
                                    onChange={() => handleCrewChange(crew._id)}
                                    className="mr-2 hidden"
                                  />
                                  <span
                                    className={
                                      crew.status === "Delete"
                                        ? "text-red-500"
                                        : "text-black"
                                    }
                                  >
                                    {crew.crewName}
                                  </span>
                                </label>
                              ))
                          ) : (
                            <div className="px-3 py-2 text-gray-500">
                              No more crews
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Display selected crews */}
                    <div className="selected-crews flex flex-wrap gap-3 mt-3">
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
                {/* <div className="form-group mt-3">
                  <label htmlFor="projectManager">Project Manager</label>
                  <select
                    name="projectManager"
                    onChange={handleInputChange}
                    className="w-full border-[1px] p-2 rounded-sm border-[#d1d1d1] outline-none"
                    value={formData.projectManager}
                    required
                  >
                    <option value="">Select Project Manager</option>
                    {allCrews
                      .filter((item) => {
                        return (
                          (item.status === "Active" ||
                          item._id === initialProjectManager) &&
                          item._id !== formData.foreman &&
                          !selectedCrews.some((crew) => crew._id === item._id)
                        );
                      })
                      .map((item, index) => (
                        <option
                          key={index}
                          value={item._id}
                          className={
                            item.status === "Delete"
                              ? "text-[red]"
                              : "text-[black]"
                          }
                        >
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
                      maxLength={50}
                      name="projectManager"
                    />
                  </div>
                )}
                <div className="form-group">
                  <label htmlFor="description">Description</label>
                  <JoditEditor
                    ref={editor}
                    config={config}
                    value={formData.description}
                    // config={config}
                    tabIndex={1} // tabIndex of textarea
                    onBlur={(newContent) => {
                      // console.log("New Content", newContent)
                      if (newContent.length > 500) {
                        // toast.error("Description cannot exceed 500 characters");
                        // return;
                      }else{
                        setFormData({
                          ...formData,
                          description: newContent,
                        });
                      }
                      
                    }} // preferred to use only this option to update the content for performance reasons
                    onChange={(newContent) => {
                      // console.log("New Content", newContent)
                      if (newContent.length > 500) {
                        // toast.error("Description cannot exceed 500 characters");
                        // return;
                      }else{
                        setFormData({
                          ...formData,
                          description: newContent,
                        });
                      }
                      
                    }}
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
                        maxLength={40}
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
                      />
                    </div>
                  </>
                )}
              </div>
              {/* {type == 1 && (
                <div className="card-body">
                  {forms.map((formData, index) => (
                    <div
                      key={index}
                      className="flex gap-x-16 justify-start flex-wrap mb-4 p-6 pt-8 shadow-md relative"
                    >
                      <div className="form-group flex flex-col">
                        <label htmlFor={`source-${index}`}>Source</label>
                        <select
                          name="source"
                          onChange={(e) => handleFormInputChange(e, index)}
                          id={`source-${index}`}
                          className="border-b border-[grey] outline-none w-[180px]"
                          value={formData.source}
                          required
                        >
                          <option value="">Select Source</option>
                          <option value="F&G">F&G</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                     

                      {formData.source === "F&G" && (
                        <>
                         <div className="form-group flex flex-col">
                        <label htmlFor={`type-${index}`}>Select Type</label>
                        <select
                          name="type"
                          onChange={(e) => handleFormInputChange(e, index)}
                          id={`type-${index}`}
                          className="border-b border-[grey] outline-none w-[180px]"
                          value={formData.type}
                          required
                        >
                          <option value="">Select Type</option>
                          <option value="Material">Material</option>
                          <option value="Labor">Labor</option>
                        </select>
                      </div>
                          <div className="form-group flex flex-col w-[180px]">
                            <label htmlFor={`reference-${index}`}>
                              {formData.type === "Material"
                                ? "Material Type"
                                : "Labor Type"}
                            </label>
                            <select
                              name="reference"
                              onChange={(e) =>
                                formData.type === "Material"
                                  ? handleMaterialChange(e, index)
                                  : handleLaborChange(e, index)
                              }
                              id={`reference-${index}`}
                              className="border-b border-[grey] outline-none"
                              value={formData.reference}
                              required
                            >
                              <option value="">Select One</option>
                              {formData.type === "Material"
                                ? materials.map((material) => (
                                    <option
                                      key={material._id}
                                      value={material.name}
                                    >
                                      {material.name}
                                    </option>
                                  ))
                                : labors.map((labor) => (
                                    <option
                                      key={labor._id}
                                      value={labor.jobName}
                                    >
                                      {labor.jobName}
                                    </option>
                                  ))}
                            </select>
                          </div>
                        </>
                      )}

                      {formData.source === "Other" && (
                        <>
                          <div className="form-group flex flex-col w-[180px]">
                            <label htmlFor={`reference-${index}`}>
                              {formData.type === "Material"
                                ? "Material Type"
                                : "Labor Type"}
                            </label>
                            <input
                              type="text"
                              className="border-b border-[grey] outline-none"
                              id={`reference-${index}`}
                              name="reference"
                              onChange={(e) => handleFormInputChange(e, index)}
                              value={formData.reference}
                              placeholder="Enter Name"
                              required
                            />
                          </div>
                        </>
                      )}

                      <div className="form-group flex flex-col">
                        <label htmlFor={`measure-${index}`}>Measure</label>
                        <input
                          type="text"
                          className="border-b border-[grey] outline-none"
                          id={`measure-${index}`}
                          name="measure"
                          onChange={(e) => handleFormInputChange(e, index)}
                          value={formData.measure}
                          placeholder="Enter measure"
                          readOnly={formData.source === "Other" ? false : true}
                          required
                        />
                      </div>

                      <div className="form-group flex flex-col">
                        <label htmlFor={`price-${index}`}>Price</label>
                        <input
                          type="number"
                          className="border-b border-[grey] outline-none"
                          id={`price-${index}`}
                          name="price"
                          onChange={(e) => handleFormInputChange(e, index)}
                          value={formData.price}
                          placeholder="Enter Price"
                          readOnly={formData.source === "Other" ? false : true}
                          min={0}
                          required
                        />
                      </div>

                      <div className="form-group flex flex-col">
                        <label htmlFor={`quantity-${index}`}>Quantity</label>
                        <input
                          type="number"
                          className="border-b border-[grey] outline-none"
                          id={`quantity-${index}`}
                          name="quantity"
                          onChange={(e) => handleFormInputChange(e, index)}
                          value={formData.quantity}
                          placeholder="Enter Quantity"
                          min={0}
                          required
                        />
                      </div>
                      <div className="form-group flex flex-col">
                        <label htmlFor={`totalPrice-${index}`}>
                          Total Price
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
                          required
                        />
                      </div>

                      <div className="form-group flex-col hidden">
                        <label htmlFor={`isTaxable-${index}`}>Taxable</label>
                        <input
                          type="checkbox"
                          className="border-b border-[grey] outline-none"
                          id={`isTaxable-${index}`}
                          name="isTaxable"
                          onChange={(e) => handleFormInputChange(e, index)}
                          value={formData.isTaxable}
                          checked={formData.isTaxable}
                          placeholder="Enter isTaxable"
                          disabled={true}
                        />
                      </div>

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
                      className="h-[40px] w-[40px] border-2 rounded-full"
                      onClick={addForm}
                    >
                      +
                    </button>
                  </div>
                </div>
              )} */}
              <div className="card-footer">
                <button
                  type="submit"
                  className="btn bg-[#00613e] text-white"
                  disabled={disableBtn}
                >
                  {disableBtn ? "Please wait..." : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}
