import React, { useEffect, useState } from "react";
import Layout from "../../layout/Layout";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTableContext } from "../../../context/TableContext";
import { useNavigate } from "react-router-dom";

export default function AddTaxForm() {
  const [formData, setFormData] = useState({
    taxPercent: "",
  });
  const [disableBtn, setDisableBtn] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e) => {

    if(e.target.name === "taxPercent"){
      if(e.target.value > 100 || e.target.value < 0){
        toast.error("Tax percentage should be between 0 and 100");
        return;
      }
    }

    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  useEffect(() => {
    getTaxPercentage();
    window.scrollTo(0, 0);
  }, []);

  const getTaxPercentage = async () => {
    try {

      const token = localStorage.getItem("f&gadmintoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/admin/get-tax-percent`,
        { headers: headers }
      );
      if (response.data.statusCode === 200) {
        setFormData({
          taxPercent: response.data.result.taxPercent,
        });
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response.message);
    }
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
      formdata.append("taxPercent", formData.taxPercent);

      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/admin/edit-tax-percent`,
        formdata,
        {
          headers: headers,
        }
      );
      if (response.data.statusCode === 200) {
        toast.success(response.data.message);
        // navigate("/panel/admin/all-crew-categories");
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.response.message);
    }
    // setFormData({
    //     taxPercent: "",
    // });
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
              <h3 className="card-title mt-1">Update Tax</h3>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="card-body">
                <div className="form-group">
                  <label htmlFor="exampleInputEmail1">Enter Tax *</label>
                  <input
                    type="number"
                    className="form-control"
                    id="exampleInputEmail1"
                    placeholder="Enter Tax (in %)"
                    value={formData.taxPercent}
                    onChange={handleInputChange}
                    name="taxPercent"
                    required
                  />
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
