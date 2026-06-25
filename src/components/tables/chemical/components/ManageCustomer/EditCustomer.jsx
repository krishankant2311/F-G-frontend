import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { useTableContext } from "../../../../../context/TableContext";

const EDIT_CUSTOMER_TOAST_ID = "manage-edit-customer-toast";

const CUSTOMER_TYPE_PREPAID = "CHEMICAL PREPAID NON BILL";
const CUSTOMER_TYPE_BILLABLE = "CHEMICAL BILLABLE";

const EditCustomerModal = ({ show, onClose, customer, onSuccess }) => {
  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    jobAddress: "",
    contractTotal: "",
    billingType: "Bid",
    customerType: CUSTOMER_TYPE_PREPAID,
    isChemicalMaintenanceEnabled: false,
  });
  const [loading, setLoading] = useState(false);
  const saveLockRef = useRef(false);
  const navigate = useNavigate();
  const { tableSize } = useTableContext();

  useEffect(() => {
    if (customer) {
      const ct =
        customer.customerType === CUSTOMER_TYPE_BILLABLE
          ? CUSTOMER_TYPE_BILLABLE
          : customer.isChemicalMaintenanceEnabled
          ? CUSTOMER_TYPE_BILLABLE
          : CUSTOMER_TYPE_PREPAID;
      setFormData({
        customerName: customer.customerName || "",
        customerEmail: customer.customerEmail || "",
        customerPhone: customer.customerPhone || "",
        jobAddress: customer.jobAddress || "",
        contractTotal:
          customer.contractTotal !== undefined && customer.contractTotal !== null
            ? String(customer.contractTotal)
            : "",
        billingType: customer.billingType || "Bid",
        customerType: customer.customerType || ct,
        isChemicalMaintenanceEnabled: customer.isChemicalMaintenanceEnabled ?? (ct === CUSTOMER_TYPE_BILLABLE),
      });
    }
  }, [customer]);

  if (!show || !customer) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSave = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (saveLockRef.current || loading) return;
    saveLockRef.current = true;

    const nameTrim = (formData.customerName || "").trim();
    const jobTrim = (formData.jobAddress || "").trim();
    const emailTrim = (formData.customerEmail || "").trim();
    const phoneTrim = (formData.customerPhone || "").trim();
    const contractTotalNum = Number(formData.contractTotal);
    const normalizedContractTotal = Number.isFinite(contractTotalNum)
      ? Math.round((contractTotalNum + Number.EPSILON) * 100) / 100
      : 0;

    if (!nameTrim) {
      toast.error("Customer name is required", { toastId: EDIT_CUSTOMER_TOAST_ID });
      saveLockRef.current = false;
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("f&gstafftoken");
      if (!token) {
        toast.error("Token missing. Please login again.", { toastId: EDIT_CUSTOMER_TOAST_ID });
        saveLockRef.current = false;
        setLoading(false);
        return;
      }

      const payload = {
        customerName: nameTrim,
        customerEmail: emailTrim,
        customerPhone: phoneTrim,
        jobAddress: jobTrim,
        contractTotal:
          formData.contractTotal === "" || formData.contractTotal === null || !Number.isFinite(contractTotalNum)
            ? 0
            : normalizedContractTotal,
        billingType: formData.billingType || "Bid",
        customerType: formData.customerType || CUSTOMER_TYPE_PREPAID,
        isChemicalMaintenanceEnabled: formData.customerType === CUSTOMER_TYPE_BILLABLE,
      };
      const response = await axios.put(
        `${process.env.REACT_APP_API_BASE_URL}/chemical-maintenance/customers/${customer._id}`,
        payload,
        {
          headers: {
            token,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        toast.success(response.data.message || "Customer updated successfully", { toastId: EDIT_CUSTOMER_TOAST_ID });
        if (onSuccess) {
          onSuccess();
        }
        onClose();
      } else {
        toast.error(response.data.message || "Failed to update customer", { toastId: EDIT_CUSTOMER_TOAST_ID });
      }
    } catch (error) {
      console.error("Error updating customer:", error);
      toast.error(
        error.response?.data?.message || error.message || "Something went wrong",
        { toastId: EDIT_CUSTOMER_TOAST_ID }
      );
    } finally {
      saveLockRef.current = false;
      setLoading(false);
    }
  };

  const passState = {
    customerName: customer.customerName,
    customerId: customer._id,
    contractTotal: customer.contractTotal ?? 0,
    isChemicalMaintenanceEnabled: !!customer.isChemicalMaintenanceEnabled,
    treatments: (customer.annualTreatments || []).map((at) => ({
      treatment: at.name,
      quantity: at.quantity || 0,
      cost: at.cost || 0,
      price: at.price || 0,
    })),
    annualTreatments: customer.annualTreatments || [],
    otherTreatments: customer.otherTreatments || [],
  };

  return (
    <div
      className="fixed top-0 bottom-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
      style={{
        // Keep modal centered in the content area (exclude the left sidebar)
        left: tableSize === 250 ? 250 : 90,
        right: 0,
        paddingLeft: 12,
        paddingRight: 12,
      }}
    >
      <div className="bg-white rounded-lg shadow-xl w-[900px] max-w-full max-h-[90vh] overflow-y-auto">
        {/* Header: Customer name only (like project theme) */}
        <div className="px-6 pt-6 pb-2">
          <h1 className="text-2xl font-bold text-black">
            {(formData.customerName || customer.customerName || "").toUpperCase()}
          </h1>
        </div>

        <div className="flex gap-8 px-6 pb-6">
          {/* LEFT: Form */}
          <div className="flex-1 space-y-4">
            {/* Customer Type */}
            <div>
              <label className="block font-semibold text-black mb-1">Customer Type</label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="customerType"
                    value={CUSTOMER_TYPE_PREPAID}
                    checked={formData.customerType === CUSTOMER_TYPE_PREPAID}
                    onChange={handleChange}
                    className="text-[#00613e]"
                  />
                  <span className="font-medium">{CUSTOMER_TYPE_PREPAID}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="customerType"
                    value={CUSTOMER_TYPE_BILLABLE}
                    checked={formData.customerType === CUSTOMER_TYPE_BILLABLE}
                    onChange={handleChange}
                    className="text-[#00613e]"
                  />
                  <span className="font-medium">{CUSTOMER_TYPE_BILLABLE}</span>
                </label>
              </div>
            </div>

            {/* Customer Name */}
            <div>
              <label className="block font-semibold text-black mb-1">Customer Name</label>
              <input
                type="text"
                name="customerName"
                value={formData.customerName}
                onChange={handleChange}
                className="w-full border border-gray-300 bg-gray-50 px-3 py-2 rounded"
              />
            </div>

            {/* Customer Email */}
            <div>
              <label className="block font-semibold text-black mb-1">Customer Email</label>
              <input
                type="email"
                name="customerEmail"
                value={formData.customerEmail}
                onChange={handleChange}
                className="w-full border border-gray-300 bg-gray-50 px-3 py-2 rounded"
              />
            </div>

            {/* Customer Phone */}
            <div>
              <label className="block font-semibold text-black mb-1">Customer Phone</label>
              <input
                type="text"
                name="customerPhone"
                value={formData.customerPhone}
                onChange={handleChange}
                className="w-full border border-gray-300 bg-gray-50 px-3 py-2 rounded"
              />
            </div>

            {/* Billing Type */}
            <div>
              <label className="block font-semibold text-black mb-1">Billing Type</label>
              <input
                type="text"
                name="billingType"
                value={formData.billingType}
                onChange={handleChange}
                className="w-full border border-gray-300 bg-gray-50 px-3 py-2 rounded"
              />
            </div>

            {/* Contract Total */}
            <div>
              <label className="block font-semibold text-black mb-1">Contract Total</label>
              <input
                type="number"
                name="contractTotal"
                value={formData.contractTotal}
                onChange={handleChange}
                onWheel={(e) => e.currentTarget.blur()}
                className="w-full border border-gray-300 bg-gray-50 px-3 py-2 rounded"
                min="0"
                step="0.01"
              />
            </div>

            {/* Job Address */}
            <div>
              <label className="block font-semibold text-black mb-1">Job Address</label>
              <input
                type="text"
                name="jobAddress"
                value={formData.jobAddress}
                onChange={handleChange}
                className="w-full border border-gray-300 bg-gray-50 px-3 py-2 rounded"
              />
            </div>
          </div>

          {/* RIGHT: Action buttons (project theme #00613e) */}
          <div className="w-[280px] flex flex-col gap-3 flex-shrink-0">
            <button
              type="button"
              className="w-full bg-[#00613e] text-white py-3 px-4 font-bold uppercase text-sm tracking-wide rounded"
              onClick={() => {
                onClose();
                navigate(
                  `/panel/office/chemical-maintenance/customers/${customer._id}/annual-program-schedule`,
                  { state: passState }
                );
              }}
            >
              Customer Planning Dashboard
            </button>
            <button
              type="button"
              className="w-full bg-[#00613e] text-white py-3 px-4 font-bold uppercase text-sm tracking-wide rounded"
              onClick={() => {
                onClose();
                navigate(
                  `/panel/office/chemical-maintenance/treatment/${customer._id}/customerSummary`,
                  { state: { customerId: customer._id, customerName: customer.customerName } }
                );
              }}
            >
              Completed Treatments
            </button>
            <button
              type="button"
              className="w-full bg-[#00613e] text-white py-3 px-4 font-bold uppercase text-sm tracking-wide rounded"
              onClick={() => {
                onClose();
                navigate(
                  `/panel/office/chemical-maintenance/customers/${customer._id}/client-reconcile`,
                  { state: passState }
                );
              }}
            >
              Usage and Billing Summary
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSave();
            }}
            disabled={loading}
            className="px-4 py-2 bg-[#00613e] text-white rounded disabled:opacity-50 hover:opacity-90"
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditCustomerModal;
