import React, { useEffect, useState } from "react";
import Layout from "../../layout/Layout";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useTableContext } from "../../../context/TableContext";

export default function EditCrewCategoryForm() {
  const [formData, setFormData] = useState({
    crewCategoryName: "",
    status : ""
  });
  const [disableBtn,setDisableBtn] = useState(false);
  const {id}  = useParams();
  const navigate = useNavigate()

  const location = useLocation();
  const pageNo = location.state.data;

  const {tableSize} = useTableContext();

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  useEffect(()=>{
    getCrewCategoryById();
  },[]);

  const getCrewCategoryById = async () => {
    try {
      const token = localStorage.getItem("f&gadmintoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/admin/get-crew-category/${id}`,
        { headers: headers }
      );
      if (response.data.statusCode === 200) {
        setFormData(response.data.result);
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
      const token = localStorage.getItem("f&gadmintoken");
      const headers = {
        token: token,
      };
      const formdata = new FormData();
      formdata.append("crewCategoryName", formData.crewCategoryName);
      formdata.append("status", formData.status);
      setDisableBtn(true);
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/admin/edit-crew-category/${id}`,
        formdata,
        {
          headers: headers,
        }
      );
      if (response.data.statusCode === 200) {
        toast.success(response.data.message);
        navigate(`/panel/admin/all-crew-categories/${pageNo}`)
      }else{
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error(error.response.message);
    }
    // setFormData({
    //     crewCategoryName: "",
    //     status : ""
    //   });
    setDisableBtn(false);
  };

  return (
    <Layout>
        <ToastContainer />
        <div className={`${tableSize === 250 ? "md:ml-[250px]" : "md:ml-[90px]"}`}>
        <div className="lg:p-10 p-3">
          <div className="card card-primary">
            <div className="card-header">
              <h3 className="card-title">Edit Crew Category</h3>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="card-body">
                <div className="form-group">
                  <label htmlFor="exampleInputEmail1">Category Name</label>
                  <input
                    type="text"
                    className="form-control"
                    id="exampleInputEmail1"
                    placeholder="Enter Category Name"
                    value={formData.crewCategoryName}
                    onChange={handleInputChange}
                    name="crewCategoryName"
                    required
                  />
                </div>
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
                <button type="submit" disabled={disableBtn} className="btn btn-primary">
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
