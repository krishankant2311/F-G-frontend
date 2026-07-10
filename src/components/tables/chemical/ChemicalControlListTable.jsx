import axios from "axios";
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTableContext } from "../../../context/TableContext";
import {
  buildChemicalCustomerNavState,
  formatControlListMoney,
  summarizeChemicalCustomer,
} from "../../../utils/chemicalCustomerSummary";

export default function ChemicalControlListTable() {
  const { tableSize } = useTableContext();
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    document.title = "Chemical Customer Summary";
    return () => {
      document.title = "";
    };
  }, []);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("f&gstafftoken");
        if (!token) {
          toast.error("Token missing. Please login again.");
          return;
        }

        const response = await axios.get(
          `${process.env.REACT_APP_API_BASE_URL}/chemical-maintenance/customers`,
          { headers: { token } }
        );

        if (response.data.success) {
          const list = Array.isArray(response.data.data)
            ? response.data.data
            : response.data.data?.customers || [];
          setCustomers(list);
        } else {
          toast.error(response.data.message || "Failed to load customers");
        }
      } catch (error) {
        console.error("Chemical control list fetch error:", error);
        toast.error(
          error.response?.data?.message || "Failed to load chemical customers"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  const rows = useMemo(() => {
    const summarized = customers.map(summarizeChemicalCustomer);
    const term = searchTerm.trim().toLowerCase();
    const filtered = term
      ? summarized.filter((row) =>
          row.customerName.toLowerCase().includes(term)
        )
      : summarized;

    return filtered.sort((a, b) =>
      a.customerName.localeCompare(b.customerName, undefined, {
        sensitivity: "base",
      })
    );
  }, [customers, searchTerm]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => ({
          annualAmount: acc.annualAmount + row.annualAmount,
          usedToDate: acc.usedToDate + row.usedToDate,
          remainingAmount: acc.remainingAmount + row.remainingAmount,
        }),
        { annualAmount: 0, usedToDate: 0, remainingAmount: 0 }
      ),
    [rows]
  );

  return (
    <div className={`${tableSize === 250 ? "md:ml-[250px]" : "md:ml-[90px]"}`}>
      <ToastContainer />
      <div className="card">
        <div className="px-4 py-3 flex justify-between items-end border-b">
          <div className="flex justify-center flex-grow">
            <h3 className="text-lg font-bold">CHEMICAL CUSTOMER SUMMARY</h3>
          </div>
          <div className="flex justify-end flex-wrap gap-2 w-auto">
            <input
              type="text"
              placeholder="Search"
              className="border border-black px-2 outline-none py-1 relative top-1 mr-4 lg:mb-1 mb-0"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="card-body overflow-x-auto">
          {loading ? (
            <p className="p-4 mb-0">Loading...</p>
          ) : rows.length === 0 ? (
            <p className="p-4 mb-0">No customers found.</p>
          ) : (
            <table className="table table-bordered table-striped text-center">
              <thead>
                <tr>
                  <th>S. No.</th>
                  <th>Customer Name</th>
                  <th>Annual Amount ($)</th>
                  <th>Used to Date ($)</th>
                  <th>Remaining Amount ($)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const customer = customers.find(
                    (c) => c._id === row.customerId
                  );
                  const navState = customer
                    ? buildChemicalCustomerNavState(customer)
                    : {
                        customerName: row.customerName,
                        customerId: row.customerId,
                      };

                  return (
                    <tr key={row.customerId}>
                      <td>{index + 1}</td>
                      <td className="text-left">
                        <Link
                          to={`/panel/office/chemical-maintenance/customers/${row.customerId}/client-reconcile`}
                          state={navState}
                        >
                          {row.customerName}
                        </Link>
                      </td>
                      <td>$ {formatControlListMoney(row.annualAmount)}</td>
                      <td>$ {formatControlListMoney(row.usedToDate)}</td>
                      <td
                        className={
                          row.isNegativeBalance || row.isLowBalance
                            ? "text-red-600 font-semibold"
                            : ""
                        }
                      >
                        $ {formatControlListMoney(row.remainingAmount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="font-bold bg-gray-100">
                  <td colSpan={2} className="text-left">
                    TOTAL
                  </td>
                  <td>$ {formatControlListMoney(totals.annualAmount)}</td>
                  <td>$ {formatControlListMoney(totals.usedToDate)}</td>
                  <td>$ {formatControlListMoney(totals.remainingAmount)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
