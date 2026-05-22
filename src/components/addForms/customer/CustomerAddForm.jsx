import React, { useEffect, useState } from "react";
import Layout from "../../layout/Layout";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTableContext } from "../../../context/TableContext";
import { useNavigate } from "react-router-dom";

export default function CustomerAddForm() {
  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    jobAddress: [],
  });
  const [address, setAddress] = useState("");
  const [disableBtn, setDisableBtn] = useState(false);
  const navigate = useNavigate();
  const { tableSize } = useTableContext();

  useEffect(() => {
    window.scrollTo(0, 0);
  },[]);

  const handleInputChange = (e) => {
    if (e.target.name === "customerName") {
      const val = e.target.value;
      // if (containsNumberOrSpecialChar(val)) {
      //   toast.error(
      //     "Customer Name cannot contain numbers or special characters."
      //   );
      //   return;
      // }
    }

    if (e.target.name === "customerPhone") {
      // const inputValue = e.target.value;
      // console.log("Inputted value", inputValue);
      // if (inputValue.includes("e") || inputValue.includes("E")) {
      //   return;
      // }
      if (e.target.value.toString().length > 10) {
        toast.error("Phone number should not exceed 10 digits");
        return;
      }
    }

    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  function containsNumberOrSpecialChar(text) {
    // Regular expression to check for numbers (0-9) or special characters
    const regex = /[0-9!@#$%^&*(),.?":{}|<>]/;

    // Test the text against the regex
    return regex.test(text);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (formData.customerName.trim() === "") {
        toast.error("Please enter customer name");
        return;
      }
      if (formData.jobAddress.length === 0) {
        toast.error("Please enter job address");
        return;
      }
      const token = localStorage.getItem("f&gadmintoken");
      const headers = {
        token: token,
      };
      setDisableBtn(true);
      const formdata = new FormData();
      formdata.append("customerName", formData.customerName);
      formdata.append("customerEmail", formData.customerEmail);
      formdata.append("customerPhone", formData.customerPhone);
      formdata.append("jobAddress", JSON.stringify(formData.jobAddress));

      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/customer/add-customer`,
        formdata,
        {
          headers: headers,
        }
      );
      if (response.data.statusCode === 201) {
        toast.success(response.data.message);
        navigate("/panel/admin/all-customers/1");
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.response.message);
    }
    // setFormData({
    //     staffName: "",
    //     email: "",
    //     password: "",
    //   });
    setDisableBtn(false);
  };

  const handleAddressChange = () => {
    const value = address;
    if (value === "") {
      toast.error("Please enter some value in job address");
      return;
    }
    if (
      formData.jobAddress.some(
        (address) => address.toLowerCase() === value.toLowerCase()
      )
    ) {
      toast.error("Address already exists");
      return;
    }
    setFormData((prevData) => ({
      ...prevData,
      jobAddress: [...prevData.jobAddress, value],
    }));
    setAddress("");
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
              <h3 className="card-title mt-1"><button
                    onClick={() => {
                      navigate(-1);
                    }}
                  >
                    <i className="fa fa-arrow-left mr-2"></i>
                  </button>{" "}Add New Customer</h3>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="card-body">
                <div className="form-group">
                  <label htmlFor="exampleInputEmail1">Customer Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    id="exampleInputEmail1"
                    placeholder="Enter Customer Name"
                    value={formData.customerName}
                    onChange={handleInputChange}
                    name="customerName"
                    title="Please enter only letters and spaces."
                    // pattern="[a-zA-Z\s]*"
                    maxLength={50}
                    autoComplete="off"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="exampleInputEmail1">Customer Email</label>
                  <input
                    type="email"
                    className="form-control"
                    id="exampleInputEmail1"
                    placeholder="Enter Customer Email"
                    value={formData.customerEmail}
                    onChange={handleInputChange}
                    name="customerEmail"
                    maxLength={40}
                    autoComplete="off"
                    // required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="exampleInputEmail1">Customer Phone</label>
                  <input
                    type="number"
                    className="form-control"
                    id="exampleInputEmail1"
                    placeholder="Enter Customer Phone"
                    value={formData.customerPhone}
                    onChange={handleInputChange}
                    name="customerPhone"
                    autoComplete="off"
                    maxLength={10}
                    onKeyDown={(e) => {
                      if (e.key === "e" || e.key === "E" || e.key === "+" || e.key === "-") {
                        e.preventDefault(); // Prevent "e", "+", or "-" from being entered
                      }
                    }}
                    step={1}
                    // required
                  />
                </div>

                {/* Job address */}

                <div className="">
                  <label htmlFor="exampleInputEmail1">Job Address *</label>
                  <div className="flex justify-between">
                    <input
                      type="text"
                      className="form-control"
                      id="exampleInputEmail1"
                      placeholder="Enter Job Address"
                      value={address}
                      onChange={(e) => {
                        setAddress(e.target.value);
                      }}
                      autoComplete="off"
                      maxLength={60}
                      name="address"
                      // required
                    />
                    <button
                      type="button"
                      className="bg-[#00613e] text-white px-8 py-1"
                      onClick={handleAddressChange}
                    >
                      Add
                    </button>
                  </div>
                </div>

                <div className="mt-10">
                  {formData.jobAddress.map((address, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between mt-2"
                    >
                      <div className="flex items-center">
                        <i className="fa fa-circle text-[10px] mr-2"></i>{" "}
                        <p className="">{address}</p>
                      </div>
                      <div className="w-[40px]">
                        <button
                          type="button"
                          className="ml-2 bg-red-500 h-[35px] w-[35px] rounded-full text-white"
                          onClick={() => {
                            setFormData((prevData) => ({
                              ...prevData,
                              jobAddress: prevData.jobAddress.filter(
                                (item, i) => i !== index
                              ),
                            }));
                          }}
                        >
                          <i className="fa fa-trash"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card-footer">
                <button
                  type="submit"
                  disabled={disableBtn}
                  className="btn bg-[#00613e] text-white"
                >
                  {disableBtn ? "Loading..." : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}
