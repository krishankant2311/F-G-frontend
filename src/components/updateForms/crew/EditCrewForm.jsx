import React, { useEffect, useState } from "react";
import Layout from "../../layout/Layout";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useTableContext } from "../../../context/TableContext";

export default function EditCrewForm() {
  const [formData, setFormData] = useState({
    crewName: "",
  });
  const [data, setData] = useState([]);
  const [disableBtn, setDisableBtn] = useState(false);
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
    getCrewById();
    // getlabours();
  }, []);

  // const getlabours = async () => {
  //   try {
  //     const token = localStorage.getItem("f&gadmintoken");
  //     const headers = {
  //       token: token,
  //       "Content-Type": "application/json",
  //     };
  //     const response = await axios.get(
  //       `${process.env.REACT_APP_API_BASE_URL}/admin/get-labors-dpd`,
  //       { headers: headers }
  //     );

  //     if (response.data.statusCode === 200) {
  //       setData(response.data.result);
  //     }else{
  //       toast.error(response.data.message);
  //     }
  //   } catch (error) {
  //     console.log("Error", error);
  //   }
  // };

  const getCrewById = async () => {
    try {
      const token = localStorage.getItem("f&gadmintoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/admin/get-crew/${id}`,
        { headers: headers }
      );
      if (response.data.statusCode === 200) {
        setFormData({
          crewName: response.data.result.crewName,
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
      formdata.append("crewName", formData.crewName);
      formdata.append("labor", formData.labor);
      setDisableBtn(true);
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/admin/edit-crew/${id}`,
        formdata,
        {
          headers: headers,
        }
      );
      if (response.data.statusCode === 200) {
        toast.success(response.data.message);
        navigate(`/panel/admin/all-crews/${pageNo}`);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.response.message);
    }
    // setFormData({
    //     crewName: "",
    //     crewCategory: "",
    //     rating : "",
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
                  </button>{" "}Edit Crew</h3>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="card-body">
                <div className="form-group">
                  <label htmlFor="exampleInputEmail1">Crew Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    id="exampleInputEmail1"
                    placeholder="Enter Crew Name"
                    value={formData.crewName}
                    onChange={handleInputChange}
                    name="crewName"
                    maxLength={50}
                    autoComplete="off"
                    required
                  />
                </div>
                {/* <div className="form-group">
                  <label htmlFor="exampleInputEmail1">Select Labor</label>
                  <select
                    name="labor"
                    onChange={handleInputChange}
                    id=""
                    className="w-full border-[1px] p-2 rounded-sm border-[#d1d1d1] outline-none"
                    required
                    value={formData.labor}
                  >
                    <option value="">Select Labor</option>
                    {
                        data.filter((item) => {
                          return item.status === "Active"
                        }).map((item, index) => (
                          <option key={index} value={item._id}>
                            {item.jobName}
                          </option>
                        ))
                    }
                  </select>
                </div> */}
                {/* <div className="form-group">
                  <label htmlFor="exampleInputEmail1"> Status</label>
                  <select
                    name="status"
                    onChange={handleInputChange}
                    id=""
                    className="w-full border-[1px] p-2 rounded-sm border-[#d1d1d1] outline-none"
                    required
                    value={formData.status}
                  >
                    <option value="">Select Status</option>
                    <option value="Active">Active</option>
                    <option value="Delete">Delete</option>
                  </select>
                </div> */}
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
