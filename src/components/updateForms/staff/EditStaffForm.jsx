import React, { useEffect, useState } from "react";
import Layout from "../../layout/Layout";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useTableContext } from "../../../context/TableContext";

export default function EditStaffForm() {
  const [formData, setFormData] = useState({
    staffName: "",
    email: "",
    // password: "",
    status : ""
  });
  const [disableBtn,setDisableBtn] = useState(false);
  const staffId  = useParams();
  const navigate = useNavigate()
  const location = useLocation();
  const pageNo = location.state.data

  const {tableSize} = useTableContext();

  const handleInputChange = (e) => {

    if(e.target.name === "staffName"){
      const val = e.target.value;
      // if(containsNumberOrSpecialChar(val)){
      //   toast.error("Staff Name cannot contain numbers or special characters.");
      //   return;
      // }
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

  useEffect(()=>{
    getStaffById();
  },[]);

  const getStaffById = async () => {
    try {
      const token = localStorage.getItem("f&gadmintoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/admin/get-staff/${staffId.id}`,
        { headers: headers }
      );
      if (response.data.statusCode === 200) {
        setFormData({
          staffName: response.data.result.staffName,
          email: response.data.result.email,
          status: response.data.result.status,
        });
      }else{
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if(formData.staffName.trim() === '') {
        toast.error("Please enter staff name");
        return;
      }
      const token = localStorage.getItem("f&gadmintoken");
      const headers = {
        token: token,
      };
      const formdata = new FormData();
      formdata.append("staffName", formData.staffName);
      formdata.append("email", formData.email);
      // formdata.append("password", formData.password);
      formdata.append("status", formData.status);
      setDisableBtn(true);
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/admin/edit-staff/${staffId.id}`,
        formdata,
        {
          headers: headers,
        }
      );
      if (response.data.statusCode === 200) {
        toast.success(response.data.message);
        navigate(`/panel/admin/all-staffs/${pageNo}`)
      }else{
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
        <ToastContainer />
        <div className={`${tableSize === 250 ? "md:ml-[250px]" : "md:ml-[90px]"}`}>
        <div className="lg:p-10 p-3">
          <div className="card">
            <div className="card-header bg-[#00613e] text-white">
              <h3 className="card-title mt-1"><button
                    onClick={() => {
                      navigate(-1);
                    }}
                  >
                    <i className="fa fa-arrow-left mr-2"></i>
                  </button>{" "}Edit Staff</h3>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="card-body">
                <div className="form-group">
                  <label htmlFor="exampleInputEmail1">Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    id="exampleInputEmail1"
                    placeholder="Enter Staff Name"
                    value={formData.staffName}
                    onChange={handleInputChange}
                    name="staffName"
                    title="Please enter only letters and spaces."
                    // pattern="[a-zA-Z\s]*" 
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="exampleInputEmail1">Email *</label>
                  <input
                    type="email"
                    className="form-control"
                    id="exampleInputEmail1"
                    placeholder="Enter Staff email"
                    value={formData.email}
                    onChange={handleInputChange}
                    name="email"
                    required
                  />
                </div>
                {/* <div className="form-group">
                  <label htmlFor="exampleInputEmail1">Password</label>
                  <input
                    type="password"
                    className="form-control"
                    id="exampleInputEmail1"
                    placeholder="Enter Password"
                    value={formData.password}
                    onChange={handleInputChange}
                    name="password"
                    required
                  />
                </div> */}
                {/* <div className="form-group">
                  <label htmlFor="exampleInputEmail1">Staff Status</label>
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
                    <option value="Inactive">Inactive</option>
                    <option value="Block">Block</option>
                    <option value="Delete">Delete</option>
                  </select>
                </div> */}
              </div>
              <div className="card-footer">
                <button type="submit" disabled={disableBtn} className="btn bg-[#00613e] text-white">
                  {
                    disableBtn ? "Loading..." : "Submit"
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
    </div>
      </Layout>
  );
}
