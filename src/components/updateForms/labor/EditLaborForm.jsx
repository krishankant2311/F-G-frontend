import React, { useEffect, useState } from "react";
import Layout from "../../layout/Layout";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useTableContext } from "../../../context/TableContext";

export default function EditLaborForm() {
  const [formData, setFormData] = useState({
    jobType: "",
    price: "",
    isTaxable: "",
    jobName: "",
  });
  const [disableBtn, setDisableBtn] = useState(false);
  const [jobTypes, setJobTypes] = useState([]);
  const { id } = useParams();
  const navigate = useNavigate();

  const location = useLocation();
  const pageNo = location.state.data;

  const { tableSize } = useTableContext();

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  useEffect(() => {
    getLaborById();
    getJobTypes();
  }, []);

  const getLaborById = async () => {
    try {
      const token = localStorage.getItem("f&gadmintoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/admin/get-labor/${id}`,
        { headers: headers }
      );
      if (response.data.statusCode === 200) {
        setFormData(response.data.result);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error(error);
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
      const token = localStorage.getItem("f&gadmintoken");
      const headers = {
        token: token,
      };
      const formdata = new FormData();
      formdata.append("jobTypeId", formData.jobType);
      formdata.append("price", formData.price);
      formdata.append("isTaxable", formData.isTaxable);
      setDisableBtn(true);
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/admin/edit-labor/${id}`,
        formdata,
        {
          headers: headers,
        }
      );
      if (response.data.statusCode === 200) {
        toast.success(response.data.message);
        navigate(`/panel/admin/all-labors/${pageNo}`);
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
          <div className="card card-primary">
            <div className="card-header">
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
                  <label htmlFor="crewCategory">Job Type *</label>
                  <select
                    name="jobType"
                    onChange={handleInputChange}
                    id="jobType"
                    className="w-full border-[1px] p-2 rounded-sm border-[#d1d1d1] outline-none"
                    value={formData.jobType}
                    required
                    disabled={
                      formData.jobName === "Project Manager" ||
                      formData.jobName === "Foreman"
                    }
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
                  className="btn btn-primary"
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
