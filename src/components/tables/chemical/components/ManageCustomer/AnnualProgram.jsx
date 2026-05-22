import React from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";

import { useTableContext } from "../../../../../context/TableContext";

const CustomerAnnualProgram = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();

  const { tableSize } = useTableContext();

  const { customerName, customerId, treatments, otherTreatments } = state || {};

  // 🔹 later API se fetch hoga
  // const customer = {
  //   _id: id,
  //   customerName: "Swan, Mike",
  //   treatments: [
  //     { treatment: "ROOT DRENCH", quantity: 0, price: 0 },
  //     { treatment: "FUNGAL TREATMENT", quantity: 1, price: 45.83 },
  //     { treatment: "HERBICIDE", quantity: 0.25, price: 3.13 },
  //   ],
  // };
  if (!state) {
    return (
      <div className="p-6">
        <p className="text-red-600">No customer data found.</p>
        <button onClick={() => navigate(-1)} className="mt-3 border px-4 py-1">
          Go Back
        </button>
      </div>
    );
  }

  // Ensure treatments is an array
  const treatmentsList = Array.isArray(treatments) ? treatments : [];
  const otherTreatmentsList = Array.isArray(otherTreatments) ? otherTreatments : [];

  // Calculate annual treatments cost and price totals
  const annualCostTotal = treatmentsList.reduce(
    (sum, t) => sum + Number(t.cost || 0),
    0,
  );

  const annualPriceTotal = treatmentsList.reduce(
    (sum, t) => sum + Number(t.price || 0),
    0,
  );

  // Calculate other treatments cost and price totals
  // If mixData is available, use totalCostPerTank and totalPricePerTank
  const otherCostTotal = otherTreatmentsList.reduce((sum, ot) => {
    const qty = Number(ot.qty || 0);
    const costPerTank = Number(ot.totalCostPerTank || 0);
    return sum + (qty * costPerTank);
  }, 0);

  const otherPriceTotal = otherTreatmentsList.reduce((sum, ot) => {
    const qty = Number(ot.qty || 0);
    const pricePerTank = Number(ot.totalPricePerTank || 0);
    return sum + (qty * pricePerTank);
  }, 0);

  // Combined totals
  const costTotal = annualCostTotal + otherCostTotal;
  const priceTotal = annualPriceTotal + otherPriceTotal;

  // const monthlyTotal = customer.treatments.reduce((sum, t) => sum + t.price, 0);

  return (
    <div className={`${tableSize === 250 ? "md:ml-[250px]" : "md:ml-[90px]"}`}>
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">CUSTOMER ANNUAL PROGRAM</h2>
          <button onClick={() => navigate(-1)} className="border px-4 py-1">
            Back
          </button>
        </div>

        {/* Top Buttons */}
        <div className="flex gap-4 mb-4">
          <button
            onClick={() =>
              navigate(
                `/panel/office/chemical-maintenance/customers/${customerId}/annual-program`,
                { state },
              )
            }
            className="bg-[#00613e] text-white px-6 py-3"
          >
            ANNUAL PROGRAM
          </button>

          <button
            className="bg-[#00613e] text-white px-6 py-3"
            onClick={() =>
              navigate(
                `/panel/office/chemical-maintenance/customers/${customerId}/annual-program-schedule`,
                { state },
              )
            }
          >
            ANNUAL PROGRAM SCHEDULE
          </button>
          <button className="bg-[#00613e] text-white px-6 py-3"
           onClick={() =>
              navigate(`/panel/office/chemical-maintenance/customers/${customerId}/client-reconcile`, { state })
            }>
            USAGE AND BILLING SUMMARY
          </button>
        </div>

        {/* Customer Info */}
        <div className="mb-4 font-semibold">
          <p>CUSTOMER NAME: {customerName}</p>
          <p>CUSTOMER ID: {customerId}</p>
        </div>
        {/* Table */}
        <table className="w-full border text-center">
          <thead className="bg-[#00613e] text-white">
            <tr>
              <th className="border p-2">Sr. No.</th>
              <th className="border p-2">ANNUAL TREATMENT PROGRAM</th>
              <th className="border p-2">QUANTITY</th>
              <th className="border p-2">TOTAL MONTHLY ADDITIONAL COST</th>
            </tr>
          </thead>
          <tbody>
            {/* Annual Treatments */}
            {treatmentsList.length > 0 ? (
              treatmentsList.map((t, i) => (
                <tr key={`annual-${i}`} className="even:bg-gray-100">
                  <td className="border p-2">{i + 1}</td>
                  <td className="border p-2">{t.treatment || t.name || "-"}</td>
                  <td className="border p-2">{t.quantity || 0}</td>
                  <td className="border p-2">$ {t.cost || 0}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="border p-2 text-center">
                  No annual treatments found
                </td>
              </tr>
            )}

            {/* Other Treatments */}
            {otherTreatmentsList.length > 0 && (
              <>
                {otherTreatmentsList.map((ot, i) => {
                  const qty = Number(ot.qty || 0);
                  const costPerTank = Number(ot.totalCostPerTank || 0);
                  const pricePerTank = Number(ot.totalPricePerTank || 0);
                  const cost = qty * costPerTank;

                  return (
                    <tr key={`other-${i}`} className="even:bg-gray-100">
                      <td className="border p-2">{treatmentsList.length + i + 1}</td>
                      <td className="border p-2">{ot.treatment || ot.mixName || "-"}</td>
                      <td className="border p-2">{qty}</td>
                      <td className="border p-2">$ {cost.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </>
            )}

            {treatmentsList.length === 0 && otherTreatmentsList.length === 0 && (
              <tr>
                <td colSpan="4" className="border p-2 text-center">
                  No treatments found
                </td>
              </tr>
            )}

            <tr className="font-bold">
              <td colSpan="3" className="border p-2 text-right">
                MONTHLY TREATMENT & PREVENTION COST
              </td>
              <td className="border p-2">$ {costTotal.toFixed(2)}</td>
            </tr>

            <tr className="bg-yellow-300 font-bold">
              <td colSpan="3" className="border p-2 text-right">
                MONTHLY PRICE (LABOR + PROGRAM)
              </td>
              <td className="border p-2">$ {priceTotal.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CustomerAnnualProgram;
