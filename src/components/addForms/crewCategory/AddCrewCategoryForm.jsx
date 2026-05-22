import React, { useState } from "react";
import Layout from "../../layout/Layout";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTableContext } from "../../../context/TableContext";
import { useNavigate } from "react-router-dom";

export default function AddCrewCategoryForm() {
  const [formData, setFormData] = useState({
    crewCategoryName: "",
  });
  const [disableBtn, setDisableBtn] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("f&gadmintoken");
      const headers = {
        token: token,
      };
      setDisableBtn(true);
      const formdata = new FormData();
      formdata.append("crewCategoryName", formData.crewCategoryName);

      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/admin/add-crew-category`,
        formdata,
        {
          headers: headers,
        }
      );
      if (response.data.statusCode === 201) {
        toast.success(response.data.message);
        navigate("/panel/admin/all-crew-categories/1");
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
          <div className="card card-primary">
            <div className="card-header">
              <h3 className="card-title mt-1"><button
                    onClick={() => {
                      navigate(-1);
                    }}
                  >
                    <i className="fa fa-arrow-left mr-2"></i>
                  </button>{" "}Add New Category</h3>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="card-body">
                <div className="form-group">
                  <label htmlFor="exampleInputEmail1">Category Name *</label>
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
