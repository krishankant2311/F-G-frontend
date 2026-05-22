import React, { useEffect, useState } from "react";
import Layout from "../../layout/Layout";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTableContext } from "../../../context/TableContext";
import { useNavigate } from "react-router-dom";

export default function AddJobTypeForm() {
  const [formData, setFormData] = useState({
    jobName: "",
    price: 0,
    isTaxable: false,
  });
  const [disableBtn, setDisableBtn] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  })

  const handleInputChange = (e) => {

    if(e.target.name === "jobName") {
      const val = e.target.value;
      if(containsNumberOrSpecialChar(val)){
        toast.error("Job Name cannot contain numbers or special characters.");
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
      const token = localStorage.getItem("f&gadmintoken");
      const headers = {
        token: token,
      };
      setDisableBtn(true);
      const formdata = new FormData();
      formdata.append("jobName", formData.jobName);
      formdata.append("price", formData.price);
      formdata.append("isTaxable", formData.isTaxable);

      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/admin/add-job-type`,
        formdata,
        {
          headers: headers,
        }
      );
      if (response.data.statusCode === 201) {
        toast.success(response.data.message);
        navigate("/panel/admin/all-job-types/1");
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.response.message);
    }
    // setFormData({
    //     jobName: "",
    //   });
    setDisableBtn(false);
  };

  const { tableSize } = useTableContext();

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
                  </button>{" "}Add New Job Type</h3>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="card-body">
                <div className="form-group">
                  <label htmlFor="exampleInputEmail1">Job Name</label>
                  <input
                    type="text"
                    className="form-control"
                    id="exampleInputEmail1"
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
                  <label htmlFor="exampleInputEmail1">Price *</label>
                  <input
                    type="number"
                    className="form-control"
                    id="exampleInputEmail1"
                    placeholder="Enter Price"
                    value={formData.price}
                    onChange={handleInputChange}
                    name="price"
                    min={0}
                    step="any"
                    required
                  />
                </div>
                <div className="mt-4">
                  <input
                    type="checkbox"
                    id="exampleInputEmail1"
                    className="h-[15px] w-[15px] relative top-[2px]"
                    placeholder="Enter Taxable or not"
                    value={formData.isTaxable}
                    checked={formData.isTaxable}
                    onChange={() => {
                      setFormData({
                        ...formData,
                        isTaxable: !formData.isTaxable,
                      });
                    }}
                    name="isTaxable"
                  />
                  <label htmlFor="exampleInputEmail1" className="ml-2">
                    Is Taxable
                  </label>
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
