import React, { useEffect, useState } from "react";
import Layout from "../../layout/Layout";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTableContext } from "../../../context/TableContext";
import { useNavigate } from "react-router-dom";

export default function AddCrewForm() {
  const [formData, setFormData] = useState({
    crewName: "",
  });
  const [disableBtn, setDisableBtn] = useState(false);
  const navigate = useNavigate();

  useEffect(()=>{
    window.scrollTo(0,0);
  })

  const handleInputChange = (e) => {

    if(e.target.name === "rating"){
      let val = Number.parseFloat(e.target.value);
      if(val < 0){
        toast.error("Rating should be a positive number");
        return;
      }
    }

    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    // return;
    try {
      const token = localStorage.getItem("f&gadmintoken");
      const headers = {
        token: token,
      };
      setDisableBtn(true);
      const formdata = new FormData();
      formdata.append("crewName", formData.crewName);

      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/admin/add-crew`,
        formdata,
        {
          headers: headers,
        }
      );
      if (response.data.statusCode === 201) {
        toast.success(response.data.message);
        navigate("/panel/admin/all-crews/1");
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.response.message);
    }
    
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
                  </button>{" "}Add New Crew</h3>
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
                  <label htmlFor="exampleInputEmail1">Rate</label>
                  <input
                    type="number"
                    className="form-control"
                    id="exampleInputEmail1"
                    placeholder="Enter Rate"
                    value={formData.rating}
                    onChange={handleInputChange}
                    name="rating"
                    required
                  />
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
