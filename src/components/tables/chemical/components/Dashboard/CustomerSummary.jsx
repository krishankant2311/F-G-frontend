// // components/Dashboard/CustomerSummary.jsx
// import React, { useState } from "react";
// import { DUMMY_DATA } from "./Treatment";
// import { useNavigate, useParams, useLocation } from "react-router-dom";
// import { useTableContext } from "../../../../../context/TableContext";
// import { ToastContainer, toast } from "react-toastify";
// import ViewTreatmentDetails from "./ViewCustomer";

// const CustomerSummary = ({ data }) => {
//   const navigate = useNavigate();
//   const { customerId } = useParams();
//   const location = useLocation();

//   const [disableBtn, setDisableBtn] = useState(false);
//   const [perPageRecords, setPerPageRecords] = useState(10);
//   const [term, setTerm] = useState("");
//   const [completeOpen, setCompleteOpen] = useState(false);
//   const [selectedItem, setSelectedItem] = useState(null);
//   const [viewOpen, setViewOpen] = useState(false);
//   const [viewData, setViewData] = useState(null);
//   const { tableSize } = useTableContext();
//   const statusParam = new URLSearchParams(location.search).get("status");

//   const customer = DUMMY_DATA.find((c) => c._id === customerId);

//   // Filter only completed treatments
//   const completedTreatments =
//     data?.treatments?.filter((t) => t.status === "Completed") || [];

//   // Calculate total
//   const totalAmount = completedTreatments.reduce(
//     (sum, t) => sum + parseFloat(t.price || 0),
//     0,
//   );
//   const treatments = customer.treatments.filter(
//     (t) => t.status === statusParam,
//   );
//   const renderActions = (status, t) => {
//     return (
//       <div className="flex justify-center gap-4">
//         {/* Complete */}

//         {/* Resume */}

//         {/* Delete */}

//         {/* View */}
//         {(status === "Paused" ||
//           status === "Completed" ||
//           status === "Overdue") && (
//           <button
//             title="View"
//             onClick={() => {
//               setViewData(t);
//               setViewOpen(true);
//             }}
//           >
//             <i className="fa fa-eye"></i>
//           </button>
//         )}
//       </div>
//     );
//   };

//   return (
//     <div className={`${tableSize === 250 ? "md:ml-[250px]" : "md:ml-[90px]"}`}>
//       <ToastContainer />
//       <div className="card">
//         {/* <h2 className="text-lg font-bold mb-3">
//           {customer.customerName} — {statusParam} Treatments
//         </h2> */}
//         <div className="px-4 py-3 flex justify-between items-end border-b">
//           {/* <h3 className="card-title">Bid Projects</h3> */}
//           <h3 className="text-lg font-bold text-center">
//             {" "}
//             {customer.customerName} — {statusParam} Treatments
//           </h3>
//           {/* <h2 className="text-lg font-bold mb-3">
//             {customer.customerName} — {statusParam} Treatments
//           </h2> */}
//           {/* <div className="text-end">
//             <input
//               type="text"
//               placeholder="Search"
//               className="border border-black px-2 outline-none py-1"
//               value={term}
//               onChange={(e) => setTerm(e.target.value)}
//             />
//           </div> */}
//           <div className="flex justify-end flex-wrap gap-2 w-auto">
//             <select
//               name="perPage"
//               id=""
//               value={perPageRecords}
//               onChange={(e) => {
//                 setPerPageRecords(e.target.value);
//               }}
//               className="w-[60px] border p-1 relative top-1 mr-2 outline-none cursor-pointer h-[34px]"
//             >
//               <option value={10}>10</option>
//               <option value={20}>20</option>
//               <option value={30}>30</option>
//               <option value={40}>40</option>
//               <option value={50}>50</option>
//             </select>
//             <input
//               type="text"
//               placeholder="Search"
//               className="border border-black px-2 outline-none py-1 relative top-1 mr-4 lg:mb-1 mb-0"
//               value={term}
//               onChange={(e) => setTerm(e.target.value)}
//             />
//             {/* <button
//               className={`btn bg-[#00613e] text-white text-sm relative top-1 ${
//                 disableBtn ? "disabled" : ""
//               }`}
//               onClick={() => {
//                 navigate("/panel/office/project/add/1");
//               }}
//             >
//               <i className="fa fa-plus mr-2"></i>
//               Create New Bid
//             </button> */}
//             <button
//               className={`btn bg-[#00613e] text-white text-sm relative top-1 ${
//                 disableBtn ? "disabled" : ""
//               }`}
//               onClick={() => {
//                 navigate(
//                   "/panel/office/chemical-maintenance/treatment?status=Completed",
//                 );
//               }}
//             >
//               <i className="fa fa-plus mr-2"></i>
//               TREATMENT COMPLETED
//             </button>

//             <button
//               className={`btn bg-[#00613e] text-white text-sm relative top-1 ${
//                 disableBtn ? "disabled" : ""
//               }`}
//               onClick={() => {
//                 // navigate("/panel/office/project/add/0");
//                 navigate(
//                   "/panel/office/chemical-maintenance/treatment?status=Overdue",
//                 );
//               }}
//             >
//               <i className="fa fa-plus mr-2"></i>
//               OVERDUE
//             </button>
//             <button
//               className={`btn bg-[#00613e] text-white text-sm relative top-1 ${
//                 disableBtn ? "disabled" : ""
//               }`}
//               onClick={() => {
//                 // navigate("/panel/office/project/add/0");
//                 navigate(
//                   "/panel/office/chemical-maintenance/treatment?status=Paused",
//                 );
//               }}
//             >
//               <i className="fa fa-plus mr-2"></i>
//               PAUSED
//             </button>
//             {statusParam === "Completed" && (
//               <button
//                 className="btn bg-[#00613e] text-white text-sm relative top-1 ml-2"
//                 onClick={() => {
//                   //  navigate(
//                   //   "/panel/office/chemical-maintenance/treatment/:customerId/customerSummary"
//                   //  )
//                   {
//                     navigate(
//                       `/panel/office/chemical-maintenance/treatment/${customerId}/customerSummary`,
//                     );
//                   }
//                 }}
//               >
//                 <i className="fa fa-file-alt mr-2"></i>
//                 Customer Summary
//               </button>
//             )}
//           </div>
//         </div>

//         <div className="card-body overflow-x-auto">
//           <table className="table table-bordered w-full text-center">
//             <thead>
//               <tr>
//                 <th>S.No</th>
//                 <th>Treatment</th>
//                 <th>Scheduled Date</th>
//                 <th>PRICE (PRE-TAX) [USD - $]</th>
//                 <th>Project Code</th>
//                 <th>Quantity</th>
//                 <th>Status</th>
//                 <th>Action</th>
//               </tr>
//             </thead>

//             <tbody>
//               {treatments.length ? (
//                 treatments.map((t, i) => (
//                   <tr key={i}>
//                     <td>{i + 1}</td>
//                     <td>{t.treatment}</td>
//                     <td>{t.scheduledDate}</td>
//                     <td>{t.price}</td>
//                     <td>{t.projectCode}</td>
//                     <td>{t.quantity}</td>
//                     <td>{t.status}</td>
//                     <td>{renderActions(t.status, t)}</td>
//                   </tr>
//                 ))
//               ) : (
//                 <tr>
//                   <td colSpan="5">No Treatments Found</td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
//         </div>
//       </div>

//       <ViewTreatmentDetails
//         show={viewOpen}
//         data={viewData}
//         onClose={() => setViewOpen(false)}
//       />
//     </div>
//   );
// };

// export default CustomerSummary;
// components/Dashboard/CustomerSummary.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useTableContext } from "../../../../../context/TableContext";
import { ToastContainer, toast } from "react-toastify";
import axios from "axios";
import ViewTreatmentDetails from "./ViewCustomer";
import EditCustomer from "./EditCustomer";
import { buildCustomerWithTreatments } from "./Treatment";

const CustomerSummary = () => {
  const navigate = useNavigate();
  const { customerId: paramCustomerId } = useParams();
  const location = useLocation();
  const { tableSize } = useTableContext();
  const [perPageRecords, setPerPageRecords] = useState(10);
  const [term, setTerm] = useState("");
  const [viewOpen, setViewOpen] = useState(false);
  const [viewData, setViewData] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [customer, setCustomer] = useState(() => location.state?.customer ?? null);
  const [loading, setLoading] = useState(!location.state?.customer && !!paramCustomerId);

  // When state is missing, fetch customer by customerId so page works (e.g. from Completed Treatments button)
  useEffect(() => {
    if (customer != null) return;
    if (!paramCustomerId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const token = localStorage.getItem("f&gstafftoken");
    if (!token) {
      setLoading(false);
      return;
    }
    axios
      .get(
        `${process.env.REACT_APP_API_BASE_URL}/chemical-maintenance/customers/${paramCustomerId}`,
        { headers: { token } }
      )
      .then((res) => {
        if (cancelled) return;
        if (res.data?.success && res.data?.data) {
          const built = buildCustomerWithTreatments(res.data.data);
          setCustomer(built);
        } else {
          setCustomer(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          toast.error("Failed to load customer");
          setCustomer(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [paramCustomerId, customer]);

  // Sync from location.state when it becomes available (e.g. after navigation with state)
  useEffect(() => {
    if (location.state?.customer) setCustomer(location.state.customer);
  }, [location.state?.customer]);

  if (loading) {
    return (
      <div className="p-6">
        <p>Loading...</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-4">
        <h2 className="text-lg font-semibold text-red-600">
          No Customer Found
        </h2>
        <button
          className="btn bg-[#00613e] text-white mt-3"
          onClick={() =>
            navigate("/panel/office/chemical-maintenance/treatment?status=Completed")
          }
        >
          Go Back
        </button>
      </div>
    );
  }

  // Only completed treatments
  const treatments = customer.treatments.filter(
    (t) => t.status === "Completed"
  );

  // Total amount calculation
  const totalAmount = treatments.reduce(
    (sum, t) => sum + parseFloat(t.price || 0),
    0
  );

  const formatDateForInput = (dateVal) => {
    if (!dateVal) return "";
    try {
      const d = typeof dateVal === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateVal)
        ? new Date(dateVal + "T12:00:00")
        : new Date(dateVal);
      if (isNaN(d.getTime())) return "";
      return d.toISOString().split("T")[0];
    } catch (e) {
      return "";
    }
  };

  const updateTreatment = async (item, updatedData) => {
    if (!item?._id) return false;
    const parts = item._id.split("-");
    if (parts.length < 3) return false;
    const index = parseInt(parts[parts.length - 1], 10);
    const type = parts[parts.length - 2];
    const treatmentCustomerId = parts.slice(0, -2).join("-");
    try {
      const token = localStorage.getItem("f&gstafftoken");
      if (!token) {
        toast.error("Token missing. Please login again.");
        return false;
      }
      const getRes = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/chemical-maintenance/customers/${treatmentCustomerId}`,
        { headers: { token } }
      );
      if (!getRes.data.success || !getRes.data.data) {
        toast.error("Customer not found");
        return false;
      }
      const cust = getRes.data.data;
      const newDateISO = updatedData.scheduledDate ? new Date(updatedData.scheduledDate).toISOString() : null;
      const newQuantity = parseFloat(updatedData.quantity) || 0;
      const newPrice = parseFloat(updatedData.price) || 0;
      const newProjectCode = updatedData.projectCode !== undefined && updatedData.projectCode !== null ? String(updatedData.projectCode).trim() : undefined;

      const payload = {
        customerName: cust.customerName,
        customerEmail: cust.customerEmail || "",
        customerPhone: cust.customerPhone || "",
        jobAddress: cust.jobAddress,
        isChemicalMaintenanceEnabled: !!cust.isChemicalMaintenanceEnabled,
        annualTreatments: (cust.annualTreatments || []).map((t, i) => {
          if (type === "annual" && i === index) {
            const updated = { ...t };
            if (newDateISO) updated.scheduleDate = newDateISO;
            updated.quantity = newQuantity;
            updated.price = newPrice;
            if (newProjectCode !== undefined) updated.projectCode = newProjectCode;
            if (t.unitCost && newQuantity > 0) updated.cost = t.unitCost * newQuantity;
            return updated;
          }
          return t;
        }),
        otherTreatments: (cust.otherTreatments || []).map((t, i) => {
          if (type === "other" && i === index) {
            const updated = { ...t };
            if (newDateISO) updated.date = newDateISO;
            updated.qty = newQuantity;
            updated.totalPricePerTank = newPrice;
            if (newProjectCode !== undefined) updated.projectCode = newProjectCode;
            if (t.unitCost && newQuantity > 0) updated.totalCostPerTank = t.unitCost * newQuantity;
            return updated;
          }
          return t;
        }),
      };

      const putRes = await axios.put(
        `${process.env.REACT_APP_API_BASE_URL}/chemical-maintenance/customers/${treatmentCustomerId}`,
        payload,
        { headers: { token, "Content-Type": "application/json" } }
      );
      if (!putRes.data.success) {
        toast.error(putRes.data.message || "Update failed");
        return false;
      }
      return true;
    } catch (err) {
      console.error("Update treatment error:", err);
      toast.error(err?.response?.data?.message || "Failed to update treatment");
      return false;
    }
  };

  const renderActions = (t) => (
    <div className="flex justify-center gap-4" onClick={(e) => e.stopPropagation()}>
      <button
        title="View"
        onClick={() => {
          setViewData(t);
          setViewOpen(true);
        }}
      >
        <i className="fa fa-eye"></i>
      </button>
      <button
        title="Edit"
        onClick={() => {
          setEditData({
            ...t,
            scheduledDate: formatDateForInput(t.scheduledDateRaw) || formatDateForInput(t.scheduledDate),
          });
          setEditModalOpen(true);
        }}
      >
        <i className="fa fa-edit"></i>
      </button>
    </div>
  );

  return (
    <div className={`${tableSize === 250 ? "md:ml-[250px]" : "md:ml-[90px]"}`}>
      <ToastContainer />

      <div className="card">
        {/* HEADER */}
        <div className="px-4 py-3 flex justify-between items-end border-b">
          <h3 className="text-lg font-bold">
            {customer.customerName} — Completed Treatments
          </h3>

          <div className="flex flex-wrap gap-2">
            <select
              value={perPageRecords}
              onChange={(e) => setPerPageRecords(e.target.value)}
              className="w-[60px] border p-1 h-[34px]"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={30}>30</option>
              <option value={40}>40</option>
              <option value={50}>50</option>
            </select>

            <input
              type="text"
              placeholder="Search"
              className="border px-2 py-1"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />

            <button
              className="btn bg-[#00613e] text-white"
              onClick={() =>
                navigate("/panel/office/chemical-maintenance/treatment?status=Completed")
              }
            >
              Back to Treatments
            </button>
          </div>
        </div>

        {/* TOP ACTION BUTTONS - match project theme */}
        <div className="px-4 pt-3 pb-1 flex gap-4">
          <button
            onClick={() => {
              const cid = customer._id || paramCustomerId;
              if (!cid) return;
              navigate(
                `/panel/office/chemical-maintenance/customers/${cid}/annual-program-schedule`
              );
            }}
            className="bg-[#00613e] text-white px-6 py-3"
          >
            Scheduled Application Dashboard
          </button>
          <button
            onClick={() => {
              const cid = customer._id || paramCustomerId;
              if (!cid) return;
              navigate(
                `/panel/office/chemical-maintenance/customers/${cid}/client-reconcile`
              );
            }}
            className="bg-[#00613e] text-white px-6 py-3"
          >
            USAGE AND BILLING SUMMARY
          </button>
        </div>

        {/* TOTAL */}
        <div className="px-4 py-2 font-semibold text-right text-green-700">
          Total Amount: ${totalAmount.toFixed(2)}
        </div>

        {/* TABLE */}
        <div className="card-body overflow-x-auto">
          <table className="table table-bordered w-full text-center">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Treatment</th>
                <th>Scheduled Date</th>
                <th>Price (USD)</th>
                <th>Project Code</th>
                <th>Quantity</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {treatments.length ? (
                treatments.map((t, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{t.treatment}</td>
                    <td>{t.scheduledDate}</td>
                    <td>{t.price}</td>
                    <td>{t.projectCode}</td>
                    <td>{t.quantity}</td>
                    <td>{t.status}</td>
                    <td>{renderActions(t)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8">No Treatments Found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* VIEW MODAL */}
      <ViewTreatmentDetails
        show={viewOpen}
        data={viewData}
        customer={customer}
        onClose={() => setViewOpen(false)}
      />

      {/* EDIT MODAL */}
      <EditCustomer
        show={editModalOpen}
        data={editData}
        onClose={() => {
          setEditModalOpen(false);
          setEditData(null);
        }}
        onSuccess={async (updatedData) => {
          if (updatedData && editData) {
            const ok = await updateTreatment(editData, updatedData);
            if (ok) {
              toast.success("Treatment updated successfully");
              setEditModalOpen(false);
              setEditData(null);
              try {
                const token = localStorage.getItem("f&gstafftoken");
                const res = await axios.get(
                  `${process.env.REACT_APP_API_BASE_URL}/chemical-maintenance/customers/${customer._id}`,
                  { headers: { token } }
                );
                if (res.data.success && res.data.data) {
                  const fresh = res.data.data;
                  const built = buildCustomerWithTreatments(fresh);
                  navigate(`/panel/office/chemical-maintenance/treatment/${customer._id}/customerSummary`, {
                    state: { customer: built },
                    replace: true,
                  });
                }
              } catch (err) {
                console.error("Refetch after edit failed:", err);
                navigate(0);
              }
            }
          } else {
            setEditModalOpen(false);
            setEditData(null);
          }
        }}
      />
    </div>
  );
};

export default CustomerSummary;
