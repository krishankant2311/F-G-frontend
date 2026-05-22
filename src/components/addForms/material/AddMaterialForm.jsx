// import React, { useEffect, useMemo, useRef, useState } from "react";
// import Layout from "../../layout/Layout";
// import axios from "axios";
// import { ToastContainer, toast } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";
// import { useTableContext } from "../../../context/TableContext";
// import { useNavigate } from "react-router-dom";
// import JoditEditor from "jodit-react";

// export default function AddMaterialForm() {
//   const [formData, setFormData] = useState({
//     name: "",
//     description: "",
//     measure: "",
//     price: "",
//     isTaxable: true,
//   });
//   const [disableBtn, setDisableBtn] = useState(false);
//   const navigate = useNavigate();

//   const editor = useRef(null);
//   const config = useMemo(
//     () => ({
//       readonly: false,
//       placeholder: "",
//     }),
//     []
//   );

//   const { tableSize } = useTableContext();

//   useEffect(() => {
//     window.scrollTo(0, 0);
//   });

//   const handleInputChange = (e) => {
//     if (e.target.name === "name") {
//       const val = e.target.value;
//       // if(containsNumberOrSpecialChar(val)){
//       //   toast.error("Material Name cannot contain numbers or special characters.");
//       //   return;
//       // }
//     }

//     if (e.target.name === "measure") {
//       const val = e.target.value;
//       // if(containsNumberOrSpecialChar(val)){
//       //   toast.error("Measure cannot contain numbers or special characters.");
//       //   return;
//       // }
//     }

//     if (e.target.name === "price") {
//       const val = e.target.value;
//       if (val < 0) {
//         toast.error("Price cannot be negative.");
//         return;
//       }
//     }

//     setFormData({
//       ...formData,
//       [e.target.name]: e.target.value,
//     });
//   };

//   function containsNumberOrSpecialChar(text) {
//     // Regular expression to check for numbers (0-9) or special characters
//     const regex = /[0-9!@#$%^&*(),.?":{}|<>]/;

//     // Test the text against the regex
//     return regex.test(text);
//   }

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     try {
//       const token = localStorage.getItem("f&gadmintoken");
//       const headers = {
//         token: token,
//       };
//       setDisableBtn(true);
//       const formdata = new FormData();
//       formdata.append("name", formData.name);
//       formdata.append("description", formData.description);
//       formdata.append("measure", formData.measure);
//       formdata.append("price", formData.price);
//       formdata.append("isTaxable", formData.isTaxable);

//       const response = await axios.post(
//         `${process.env.REACT_APP_API_BASE_URL}/admin/add-material`,
//         formdata,
//         {
//           headers: headers,
//         }
//       );
//       if (response.data.statusCode === 201) {
//         toast.success(response.data.message);
//         navigate("/panel/admin/all-materials/1");
//       } else {
//         toast.error(response.data.message);
//       }
//     } catch (error) {
//       console.log(error);
//       toast.error(error.response.message);
//     }
//     // setFormData({
//     //   name: "",
//     //   description: "",
//     //   measure: "",
//     //   price: "",
//     // });
//     setDisableBtn(false);
//   };

//   return (
//     <Layout>
//       <div
//         className={`${tableSize === 250 ? "md:ml-[250px]" : "md:ml-[90px]"}`}
//       >
//         <ToastContainer />
//         <div className="lg:p-10 p-3">
//           <div className="card">
//             <div className="card-header bg-[#00613e] text-white">
//               <h3 className="card-title mt-1">
//                 <button
//                   onClick={() => {
//                     navigate(-1);
//                   }}
//                 >
//                   <i className="fa fa-arrow-left mr-2"></i>
//                 </button>{" "}
//                 Add New Material
//               </h3>
//             </div>
//             <form onSubmit={handleSubmit}>
//               <div className="card-body">
//                 <div className="form-group">
//                   <label htmlFor="exampleInputEmail1">Material Name *</label>
//                   <input
//                     type="text"
//                     className="form-control"
//                     id="exampleInputEmail1"
//                     placeholder="Enter Material Name"
//                     value={formData.name}
//                     onChange={handleInputChange}
//                     name="name"
//                     maxLength={100}
//                     autoComplete="off"
//                     required
//                   />
//                 </div>
//                 {/* <div className="form-group">
//                   <label htmlFor="exampleInputEmail1">Material Description</label>
//                   <input
//                     type="text"
//                     className="form-control"
//                     id="exampleInputEmail1"
//                     placeholder="Enter Description"
//                     value={formData.description}
//                     onChange={handleInputChange}
//                     name="description"
//                     required
//                   />
//                 </div> */}
//                 <div className="form-group">
//                   <label htmlFor="exampleInputEmail1">Measure *</label>
//                   <input
//                     type="text"
//                     className="form-control"
//                     id="exampleInputEmail1"
//                     placeholder="Enter Measure"
//                     value={formData.measure}
//                     onChange={handleInputChange}
//                     maxLength={100}
//                     autoComplete="off"
//                     name="measure"
//                     required
//                   />
//                 </div>
//                 <div className="form-group">
//                   <label htmlFor="exampleInputEmail1">Material Price *</label>
//                   <input
//                     type="number"
//                     className="form-control"
//                     id="exampleInputEmail1"
//                     placeholder="Enter Price"
//                     value={formData.price}
//                     onChange={handleInputChange}
//                     name="price"
//                     // min={0}
//                     step="any"
//                     required
//                   />
//                 </div>
//                 <div className="mt-4">
//                   <input
//                     type="checkbox"
//                     id="exampleInputEmail1"
//                     className="h-[15px] w-[15px] relative top-[2px]"
//                     placeholder="Enter Taxable or not"
//                     value={formData.isTaxable}
//                     checked={formData.isTaxable}
//                     onChange={() => {
//                       setFormData({
//                         ...formData,
//                         isTaxable: !formData.isTaxable,
//                       });
//                     }}
//                     name="isTaxable"
//                   />
//                   <label htmlFor="exampleInputEmail1" className="ml-2">
//                     Is Taxable
//                   </label>
//                 </div>

//                 <div className=" mt-16 pb-8">
//                   <label htmlFor="notes" className="text-center block">
//                     Notes
//                   </label>
//                   <div className="px-8 py-3">
//                     <JoditEditor
//                       ref={editor}
//                       value={formData.description}
//                       // config={config}
//                       tabIndex={1} // tabIndex of textarea
//                       onBlur={(newContent) => {
//                         setFormData({
//                           ...formData,
//                           description: newContent,
//                         });
//                       }} // preferred to use only this option to update the content for performance reasons
//                       onChange={(newContent) => {
//                         setFormData({
//                           ...formData,
//                           description: newContent,
//                         });
//                       }}
//                     />
//                   </div>
//                 </div>
//               </div>
//               <div className="card-footer">
//                 <button
//                   type="submit"
//                   disabled={disableBtn}
//                   className="btn bg-[#00613e] text-white"
//                 >
//                   {disableBtn ? "Loading..." : "Submit"}
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       </div>
//     </Layout>
//   );
// }


import React, { useEffect, useMemo, useRef, useState } from "react";
import Layout from "../../layout/Layout";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTableContext } from "../../../context/TableContext";
import { useNavigate } from "react-router-dom";
import JoditEditor from "jodit-react";
export default function AddMaterialForm() {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    cost: "",
    markUp: "",
    measure: "",
    price: "",
    isTaxable: true,
  });
  const [disableBtn, setDisableBtn] = useState(false);
  const navigate = useNavigate();
  const editor = useRef(null);
  const config = useMemo(
    () => ({
      readonly: false,
      placeholder: "",
    }),
    []
  );
  const { tableSize } = useTableContext();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const handleInputChange = (e) => {
    if (e.target.name === "name") {
      const val = e.target.value;
      // if(containsNumberOrSpecialChar(val)){
      //   toast.error("Material Name cannot contain numbers or special characters.");
      //   return;
      // }
    }
    if (e.target.name === "measure") {
      const val = e.target.value;
      // if(containsNumberOrSpecialChar(val)){
      //   toast.error("Measure cannot contain numbers or special characters.");
      //   return;
      // }
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
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("f&gadmintoken");
      const headers = {
        token: token,
      };
      setDisableBtn(true);
      const formdata = new FormData();
      const p = parseFloat(formData.price);
      let costVal = (formData.cost ?? "").trim();
      let markVal = (formData.markUp ?? "").trim();
      if ((!costVal || !markVal) && Number.isFinite(p) && p >= 0) {
        if (!costVal) costVal = (p / 2).toFixed(2);
        if (!markVal) markVal = "100";
      }
      formdata.append("name", formData.name);
      formdata.append("description", formData.description);
      formdata.append("measure", formData.measure);
      formdata.append("markup", markVal);
      formdata.append("cost", costVal);
      formdata.append("price", formData.price);
      formdata.append("isTaxable", formData.isTaxable);
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/admin/add-material`,
        formdata,
        {
          headers: headers,
        }
      );
      if (response.data.statusCode === 201) {
        toast.success(response.data.message);
        navigate("/panel/admin/all-materials/1");
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.response.message);
    }
    // setFormData({
    //   name: "",
    //   description: "",
    //   measure: "",
    //   price: "",
    // });
    setDisableBtn(false);
  };
  return (
    <Layout>
      <div
        className={`${tableSize === 250 ? "md:ml-[250px]" : "md:ml-[90px]"}`}
      >
        <ToastContainer />
        <div className="lg:p-10 p-3">
          <div className="card">
            <div className="card-header bg-[#00613E] text-white">
              <h3 className="card-title mt-1">
                <button
                  onClick={() => {
                    navigate(-1);
                  }}
                >
                  <i className="fa fa-arrow-left mr-2"></i>
                </button>{" "}
                Add New Material
              </h3>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="card-body">
                <div className="form-group">
                  <label htmlFor="exampleInputEmail1">Material Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    id="exampleInputEmail1"
                    placeholder="Enter Material Name"
                    value={formData.name}
                    onChange={handleInputChange}
                    name="name"
                    maxLength={100}
                    autoComplete="off"
                    required
                  />
                </div>
                {/* <div className="form-group">
                  <label htmlFor="exampleInputEmail1">Material Description</label>
                  <input
                    type="text"
                    className="form-control"
                    id="exampleInputEmail1"
                    placeholder="Enter Description"
                    value={formData.description}
                    onChange={handleInputChange}
                    name="description"
                    required
                  />
                </div> */}
                <div className="form-group">
                  <label htmlFor="exampleInputEmail1">Measure *</label>
                  <input
                    type="text"
                    className="form-control"
                    id="exampleInputEmail1"
                    placeholder="Enter Measure"
                    value={formData.measure}
                    onChange={handleInputChange}
                    maxLength={100}
                    autoComplete="off"
                    name="measure"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="material-cost">Cost</label>
                  <input
                    type="text"
                    className="form-control"
                    id="material-cost"
                    placeholder="Optional — leave blank to use 50% of price"
                    value={formData.cost}
                    onChange={handleInputChange}
                    name="cost"
                    autoComplete="off"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="material-markup">Markup (%)</label>
                  <input
                    type="text"
                    className="form-control"
                    id="material-markup"
                    placeholder="Optional — leave blank to use 100%"
                    value={formData.markUp}
                    onChange={handleInputChange}
                    name="markUp"
                    autoComplete="off"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="material-price">Material Price *</label>
                  <input
                    type="number"
                    className="form-control"
                    id="material-price"
                    placeholder="Enter price"
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
                <div className=" mt-16 pb-8">
                  <label htmlFor="notes" className="text-center block">
                    Notes
                  </label>
                  <div className="px-8 py-3">
                    <JoditEditor
                      ref={editor}
                      value={formData.description}
                      // config={config}
                      tabIndex={1} // tabIndex of textarea
                      onBlur={(newContent) => {
                        setFormData({
                          ...formData,
                          description: newContent,
                        });
                      }} // preferred to use only this option to update the content for performance reasons
                      onChange={(newContent) => {
                        setFormData({
                          ...formData,
                          description: newContent,
                        });
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="card-footer">
                <button
                  type="submit"
                  disabled={disableBtn}
                  className="btn bg-[#00613E] text-white"
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