import React, { useEffect, useState } from "react";
import Layout from "../../layout/Layout";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useTableContext } from "../../../context/TableContext";
import { resolveJobTypeCostForSave } from "../../../utils/materialPricingDisplay";

export default function EditJobTypeForm() {
  const [formData, setFormData] = useState({
    jobName: "",
    cost: "",
    price: 0,
    isTaxable: false,
  });
  const [disableBtn, setDisableBtn] = useState(false);
  const { id } = useParams();
  const navigate = useNavigate();

  const location = useLocation();
  const pageNo = location.state.data;

  const { tableSize } = useTableContext();

  const handleInputChange = (e) => {

    if(e.target.name === "jobName"){
      const val = e.target.value;
      if(containsNumberOrSpecialChar(val)){
        toast.error("Job Name cannot contain numbers or special characters.");
        return;
      }
    }

    if (e.target.name === "price") {
      const val = e.target.value;
      if (val < 0) {
        toast.error("Price cannot be negative.");
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

  useEffect(() => {
    getJobTypeById();
  }, []);

  const getJobTypeById = async () => {
    try {
      const token = localStorage.getItem("f&gadmintoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/admin/get-job-type/${id}`,
        { headers: headers }
      );
      if (response.data.statusCode === 200) {
        const row = response.data.result || {};
        setFormData({
          ...row,
          cost: row.cost ?? "",
        });
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("f&gadmintoken");
      const headers = {
        token: token,
      };
      const formdata = new FormData();
      const costVal = resolveJobTypeCostForSave(formData.price, formData.cost);
      formdata.append("jobName", formData.jobName);
      formdata.append("cost", costVal);
      formdata.append("price", formData.price);
      formdata.append("isTaxable", formData.isTaxable);
      setDisableBtn(true);
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/admin/edit-job-type/${id}`,
        formdata,
        {
          headers: headers,
        }
      );
      if (response.data.statusCode === 200) {
        toast.success(response.data.message);
        navigate(`/panel/admin/all-job-types/${pageNo}`);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.response.message);
    }
    // setFormData({
    //     jobName: "",
    //     status : ""
    //   });
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
              <h3 className="card-title mt-1"><button
                    onClick={() => {
                      navigate(-1);
                    }}
                  >
                    <i className="fa fa-arrow-left mr-2"></i>
                  </button>{" "}Edit Job Type</h3>
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
                  <label htmlFor="job-type-cost">Cost</label>
                  <input
                    type="text"
                    className="form-control"
                    id="job-type-cost"
                    placeholder="Optional — leave blank to use 50% of price"
                    value={formData.cost}
                    onChange={handleInputChange}
                    name="cost"
                    autoComplete="off"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="job-type-price">Price *</label>
                  <input
                    type="number"
                    className="form-control"
                    id="job-type-price"
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
