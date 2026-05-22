import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useTableContext } from "../../../../../context/TableContext";
import axios from "axios";
import { toast } from "react-toastify";
import { buildCustomerWithTreatments } from "../Dashboard/Treatment";

const money2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const CustomerClientReconcile = () => {
  const { customerId: paramCustomerId } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();
  const { tableSize } = useTableContext();

  const [customerData, setCustomerData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Get customerId from state or URL params
  const customerId = state?.customerId || paramCustomerId;

  // Fetch customer data from API
  useEffect(() => {
    const fetchCustomerData = async () => {
      try {
        const token = localStorage.getItem("f&gstafftoken");
        if (!token) {
          toast.error("Authentication token not found");
          setLoading(false);
          return;
        }

        const res = await axios.get(
          `${process.env.REACT_APP_API_BASE_URL}/chemical-maintenance/customers/${customerId}`,
          { headers: { token } }
        );

        if (res.data.success) {
          setCustomerData(res.data.data);
        } else {
          toast.error("Failed to fetch customer data");
        }
      } catch (error) {
        console.error("Fetch customer data error:", error);
        toast.error(error.response?.data?.message || "Failed to load customer data");
      } finally {
        setLoading(false);
      }
    };

    if (customerId) {
      fetchCustomerData();
    } else {
      setLoading(false);
    }
  }, [customerId]);

  // Page title = Usage and Billing Summary (same as button that opens this page)
  useEffect(() => {
    document.title = "Usage and Billing Summary";
    return () => { document.title = ""; };
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <p>Loading...</p>
      </div>
    );
  }

  if (!customerData && !state) {
    return (
      <div className="p-6">
        <p className="text-red-600">No reconcile data found.</p>
        <button onClick={() => navigate(-1)} className="mt-3 border px-4 py-1">
          Go Back
        </button>
      </div>
    );
  }

  // Use API data if available, otherwise fallback to state
  const customerName = customerData?.customerName || state?.customerName || "";
  const annualTreatments = customerData?.annualTreatments || state?.annualTreatments || [];
  const otherTreatments = customerData?.otherTreatments || state?.otherTreatments || [];

  // ANNUAL PROGRAM TREATMENT (12 MONTHS) = sum of all SCHEDULED treatments (Schedule page PROGRAM TOTAL)
  const scheduledAnnualAmount = annualTreatments
    .filter((at) => at.scheduleDate)
    .reduce((sum, at) => sum + Number(at.price || 0), 0);

  const scheduledOtherAmount = otherTreatments
    .filter((ot) => ot.date)
    .reduce((sum, ot) => {
      const qty = Number(ot.qty || 0);
      const pricePerTank = Number(ot.totalPricePerTank || 0);
      return sum + (qty * pricePerTank);
    }, 0);

  const annualProgramTotal = scheduledAnnualAmount + scheduledOtherAmount;

  // UP TO DATE CHEMICAL MATERIALS USED = only treatments whose status is "Completed"
  const completedAnnualAmount = annualTreatments
    .filter((at) => (at.status || "").toString().trim().toLowerCase() === "completed")
    .reduce((sum, at) => sum + Number(at.price || 0), 0);

  const completedOtherAmount = otherTreatments
    .filter((ot) => (ot.status || "").toString().trim().toLowerCase() === "completed")
    .reduce((sum, ot) => {
      const qty = Number(ot.qty || 0);
      const pricePerTank = Number(ot.totalPricePerTank || 0);
      return sum + (qty * pricePerTank);
    }, 0);

  const usedAmount = completedAnnualAmount + completedOtherAmount;

  const contractTotalRaw = customerData?.contractTotal ?? state?.contractTotal;
  const contractTotalAmount =
    contractTotalRaw === undefined || contractTotalRaw === null || contractTotalRaw === ""
      ? 0
      : money2(contractTotalRaw);

  // CONTRACT TOTAL − MATERIALS USED when contract is set (>0); else legacy: PROGRAM − MATERIALS
  const remainingAmount =
    contractTotalAmount > 0
      ? money2(contractTotalAmount - money2(usedAmount))
      : money2(money2(annualProgramTotal) - money2(usedAmount));

  const isLowBalance = remainingAmount < 50;

  const isOverProgramVersusContract =
    contractTotalAmount > 0 &&
    money2(annualProgramTotal) > contractTotalAmount;

  return (
    <div
      className={`${
        tableSize === 250 ? "md:ml-[250px]" : "md:ml-[90px]"
      }`}
    >
      <div className="p-6">
        {/* Header */}
        {/* <h2 className="text-2xl font-bold mb-4">
          USAGE AND BILLING SUMMARY
        </h2> */}
         <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">USAGE AND BILLING SUMMARY</h2>
          <button onClick={() => navigate(-1)} className="border px-4 py-1">
            Back
          </button>
        </div>
        

        {/* Two buttons: side by side, same size & theme as Planning Dashboard */}
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => {
              const navState = customerData
                ? {
                    customerName: customerData.customerName,
                    customerId: customerData._id,
                    contractTotal: customerData.contractTotal ?? 0,
                    treatments: customerData.annualTreatments || [],
                    annualTreatments: customerData.annualTreatments || [],
                    otherTreatments: customerData.otherTreatments || [],
                  }
                : state;
              navigate(
                `/panel/office/chemical-maintenance/customers/${customerId || customerData?._id}/annual-program-schedule`,
                { state: navState },
              );
            }}
            className="bg-[#00613e] text-white px-6 py-3"
          >
            Scheduled Application Dashboard
          </button>
          <button
            onClick={() => {
              const cid = customerId || customerData?._id;
              const customerForSummary = customerData
                ? buildCustomerWithTreatments(customerData)
                : buildCustomerWithTreatments({
                    _id: state?.customerId || paramCustomerId,
                    customerName: state?.customerName || "",
                    annualTreatments: state?.annualTreatments || [],
                    otherTreatments: state?.otherTreatments || [],
                  });
              if (!customerForSummary) {
                toast.error("Customer data not available for Completed Treatments");
                return;
              }
              navigate(
                `/panel/office/chemical-maintenance/treatment/${cid}/customerSummary`,
                { state: { customer: customerForSummary } },
              );
            }}
            className="bg-[#00613e] text-white px-6 py-3"
          >
            COMPLETED TREATMENTS
          </button>
        </div>

        {/* Customer Info */}
        <div className="mb-4 font-semibold">
          <p>CUSTOMER NAME: {customerName}</p>
          <p>CUSTOMER ID: {customerId || customerData?._id}</p>
        </div>

        {/* Reconcile Table */}
        <table className="w-full border text-center">
          <thead className="bg-[#00613e] text-white">
            <tr>
              <th className="border p-2">S. No.</th>
              <th className="border p-2">ITEM</th>
              <th className="border p-2">AMOUNT [USD - $]</th>
            </tr>
          </thead>

          <tbody>
            <tr className="even:bg-gray-100">
              <td className="border p-2">1</td>
              <td className="border p-2">CONTRACT TOTAL</td>
              <td className="border p-2">$ {contractTotalAmount.toFixed(2)}</td>
            </tr>

            <tr>
              <td className="border p-2">2</td>
              <td className="border p-2">
                ANNUAL PROGRAM TREATMENT (12 MONTHS)
              </td>
              <td className="border p-2">
                $ {money2(annualProgramTotal).toFixed(2)}
              </td>
            </tr>

            <tr className="even:bg-gray-100">
              <td className="border p-2">3</td>
              <td className="border p-2">
                UP TO DATE CHEMICAL MATERIALS USED
              </td>
              <td className="border p-2">
                $ {money2(usedAmount).toFixed(2)}
              </td>
            </tr>

            <tr className="font-bold bg-gray-100">
              <td className="border p-2">4</td>
              <td className="border p-2">
                REMAINING ANNUAL BALANCE AMOUNT
              </td>
              <td className={`border p-2 ${isLowBalance ? "text-red-600" : ""}`}>
                $ {money2(remainingAmount).toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>

        {isOverProgramVersusContract && (
          <div className="mt-4 p-3 border border-amber-300 bg-amber-50 text-amber-900 font-semibold">
            {`Program scheduled total exceeds contract total ($${money2(
              annualProgramTotal
            ).toFixed(2)} scheduled vs $${contractTotalAmount.toFixed(2)} contract).`}
          </div>
        )}

        {isLowBalance && (
          <div className="mt-4 p-3 border border-red-300 bg-red-50 text-red-700 font-semibold">
            Customer Balance Warning: Annual Remaining Balance is under $50.
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerClientReconcile;
