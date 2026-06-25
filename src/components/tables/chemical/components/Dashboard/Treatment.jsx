import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import { useTableContext } from "../../../../../context/TableContext";
import "react-toastify/dist/ReactToastify.css";

const formatDisplayDate = (dateVal) => {
  if (!dateVal) return "-";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return "-";
  const day = d.getDate();
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
};

const isPastDate = (dateVal) => {
  if (!dateVal) return false;
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d < today;
};

const computeStatus = (status, dateVal) => {
  const s = (status || "Scheduled").trim();
  if (s === "Scheduled" && isPastDate(dateVal)) return "Overdue";
  return s;
};

function buildTreatmentsForCustomer(customer) {
  const treatments = [];
  (customer.annualTreatments || []).forEach((t) => {
    const hasDate = t.scheduleDate != null && !isNaN(new Date(t.scheduleDate).getTime());
    const hasQty = (t.quantity ?? 0) > 0;
    if (!hasDate || !hasQty) return;
    treatments.push({
      scheduledDate: formatDisplayDate(t.scheduleDate),
      treatment: t.name || "-",
      quantity: t.quantity ?? "-",
      status: computeStatus(t.status, t.scheduleDate),
      price: t.price != null ? String(t.price) : "-",
      projectCode: "-",
    });
  });
  (customer.otherTreatments || []).forEach((t) => {
    const hasDate = t.date != null && !isNaN(new Date(t.date).getTime());
    const hasQty = (t.qty ?? 0) > 0;
    if (!hasDate || !hasQty) return;
    treatments.push({
      scheduledDate: formatDisplayDate(t.date),
      treatment: t.treatment || "-",
      quantity: t.qty ?? "-",
      status: computeStatus(t.status, t.date),
      price:
        t.totalPricePerTank != null
          ? String(
              (
                Number(t.qty || 0) * Number(t.totalPricePerTank)
              ).toFixed(2)
            )
          : "-",
      projectCode: "-",
    });
  });
  return treatments;
}

// API customer(s) -> [{ _id, customerName, treatments }] (same shape as dashboard; only treatments with date + qty > 0)
export function buildCustomersWithTreatments(customers) {
  if (!Array.isArray(customers)) return [];
  return customers.map((customer) => ({
    _id: customer._id,
    customerName: customer.customerName || "-",
    treatments: buildTreatmentsForCustomer(customer),
  })).filter((c) => c.treatments.length > 0);
}

// Single customer from API -> { _id, customerName, treatments } for TreatmentList
export function buildCustomerWithTreatments(customer) {
  if (!customer) return null;
  const customerId = customer._id;
  const treatments = [];
  
  const customerName = customer.customerName || "-";

  (customer.annualTreatments || []).forEach((t, index) => {
    const hasDate = t.scheduleDate != null && !isNaN(new Date(t.scheduleDate).getTime());
    const hasQty = (t.quantity ?? 0) > 0;
    if (!hasDate || !hasQty) return;
    treatments.push({
      _id: `${customerId}-annual-${index}`,
      customerId,
      customerName,
      scheduledDate: formatDisplayDate(t.scheduleDate),
      scheduledDateRaw: t.scheduleDate,
      treatment: t.name || "-",
      quantity: t.quantity ?? "-",
      status: computeStatus(t.status, t.scheduleDate),
      price: t.price != null ? String(t.price) : "-",
      projectCode: t.projectCode ?? "",
      type: "annual",
      originalIndex: index,
    });
  });
  
  (customer.otherTreatments || []).forEach((t, index) => {
    const hasDate = t.date != null && !isNaN(new Date(t.date).getTime());
    const hasQty = (t.qty ?? 0) > 0;
    if (!hasDate || !hasQty) return;
    treatments.push({
      _id: `${customerId}-other-${index}`,
      customerId,
      customerName,
      scheduledDate: formatDisplayDate(t.date),
      scheduledDateRaw: t.date,
      treatment: t.treatment || "-",
      quantity: t.qty ?? "-",
      status: computeStatus(t.status, t.date),
      price:
        t.totalPricePerTank != null
          ? String(
              (
                Number(t.qty || 0) * Number(t.totalPricePerTank)
              ).toFixed(2)
            )
          : "-",
      projectCode: t.projectCode ?? "",
      type: "other",
      originalIndex: index,
    });
  });
  
  return { _id: customerId, customerName: customer.customerName || "-", treatments };
}

export default function ChemicalDashboardTable() {
  const { pageNo } = useParams();
  const navigate = useNavigate();
  const { tableSize } = useTableContext();
  const location = useLocation();
  const statusParam = new URLSearchParams(location.search).get("status");

  const [dashboardData, setDashboardData] = useState([]);
  const [data, setData] = useState([]);
  const [filteredCount, setFilteredCount] = useState(0);
  const [term, setTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(Number(pageNo) || 1);
  const [perPageRecords, setPerPageRecords] = useState(10);
  const [disableBtn, setDisableBtn] = useState(false);
  const [loading, setLoading] = useState(true);

  const getHeading = () => {
    if (!statusParam) return "Scheduled Application Dashboard";
    if (statusParam === "Completed") return "CUSTOMER TREATMENT COMPLETED LIST";
    if (statusParam === "Overdue") return "CUSTOMER OVERDUE TREATMENTS LIST";
    if (statusParam === "Paused") return "CUSTOMER TREATMENT PAUSED LISTS";
    return "Scheduled Application Dashboard";
  };

  // Same API as dashboard – fetch customers and build customers-with-treatments
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("f&gstafftoken");
        if (!token) {
          setDashboardData([]);
          setLoading(false);
          return;
        }
        const response = await axios.get(
          `${process.env.REACT_APP_API_BASE_URL}/chemical-maintenance/customers`,
          { headers: { token } }
        );
        if (response.data.success && response.data.data) {
          const built = buildCustomersWithTreatments(response.data.data);
          setDashboardData(built);
        } else {
          setDashboardData([]);
        }
      } catch (error) {
        console.error("Error fetching treatment data:", error);
        toast.error("Failed to load data");
        setDashboardData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    let filtered = [...dashboardData];

    if (statusParam) {
      filtered = filtered.filter((customer) =>
        customer.treatments.some((t) => t.status === statusParam),
      );
    }

    if (term) {
      filtered = filtered.filter((c) =>
        (c.customerName || "").toLowerCase().includes(term.toLowerCase()),
      );
    }

    setFilteredCount(filtered.length);

    const start = (currentPage - 1) * perPageRecords;
    const paginated = filtered.slice(start, start + perPageRecords);

    setData(
      paginated.map((item, index) => ({
        ...item,
        serialNo: start + index + 1,
      })),
    );
  }, [dashboardData, term, currentPage, perPageRecords, statusParam]);

  const totalPages = Math.ceil(filteredCount / perPageRecords);

  return (
    <div className={`${tableSize === 250 ? "md:ml-[250px]" : "md:ml-[90px]"}`}>
      <ToastContainer />

      <div className="card">
        {/* <div className="px-4 py-3 flex justify-between items-end border-b">
          <h3 className="text-lg font-bold">{getHeading()}</h3>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search"
              className="border px-2 py-1"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />

            {["Completed", "Overdue", "Paused"].map((s) => (
              <button
                key={s}
                className="btn bg-[#00613e] text-white text-sm"
                onClick={() =>
                  navigate(
                    `/panel/office/chemical-maintenance/treatment?status=${s}`
                  )
                }
              >
                {s.toUpperCase()}
              </button>
            ))}
          </div>
        </div> */}
        <div className="px-4 py-3 flex justify-between items-end border-b">
          {/* <h3 className="card-title">Bid Projects</h3> */}
          <h3 className="text-lg font-bold text-center">{getHeading()}</h3>

          {/* <div className="text-end">
            <input
              type="text"
              placeholder="Search"
              className="border border-black px-2 outline-none py-1"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
          </div> */}
          <div className="flex justify-end flex-wrap gap-2 w-auto">
            <select
              name="perPage"
              id=""
              value={perPageRecords}
              onChange={(e) => {
                setPerPageRecords(e.target.value);
              }}
              className="w-[60px] border p-1 relative top-1 mr-2 outline-none cursor-pointer h-[34px]"
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
              className="border border-black px-2 outline-none py-1 relative top-1 mr-4 lg:mb-1 mb-0"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
            {/* <button
              className={`btn bg-[#00613e] text-white text-sm relative top-1 ${
                disableBtn ? "disabled" : ""
              }`}
              onClick={() => {
                navigate("/panel/office/project/add/1");
              }}
            >
              <i className="fa fa-plus mr-2"></i>
              Create New Bid
            </button> */}
            <button
              className={`btn bg-[#00613e] text-white text-sm relative top-1 ${
                disableBtn ? "disabled" : ""
              }`}
              onClick={() => {
                navigate(
                  "/panel/office/chemical-maintenance/treatment?status=Completed",
                );
              }}
            >
              <i className="fa fa-plus mr-2"></i>
              TREATMENT COMPLETED
            </button>

            <button
              className={`btn bg-[#00613e] text-white text-sm relative top-1 ${
                disableBtn ? "disabled" : ""
              }`}
              onClick={() => {
                // navigate("/panel/office/project/add/0");
                navigate(
                  "/panel/office/chemical-maintenance/treatment?status=Overdue",
                );
              }}
            >
              <i className="fa fa-plus mr-2"></i>
              OVERDUE
            </button>
            <button
              className={`btn bg-[#00613e] text-white text-sm relative top-1 ${
                disableBtn ? "disabled" : ""
              }`}
              onClick={() => {
                // navigate("/panel/office/project/add/0");
                navigate(
                  "/panel/office/chemical-maintenance/treatment?status=Paused",
                );
              }}
            >
              <i className="fa fa-plus mr-2"></i>
              PAUSED
            </button>
          </div>
        </div>

        <div className="card-body overflow-x-auto">
          <table className="table table-bordered table-striped text-center">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Customer Name</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" className="text-center py-4">
                    Loading...
                  </td>
                </tr>
              ) : data.length ? (
                data.map((c) => (
                  <tr key={c._id}>
                    <td>{c.serialNo}</td>
                    <td>{c.customerName}</td>
                    <td>{statusParam}</td>
                    <td>
                      <button
                        onClick={() =>
                          navigate(
                            `/panel/office/chemical-maintenance/treatment/${c._id}?status=${statusParam}`,
                          )
                        }
                      >
                        <i className="fa fa-eye text-blue-600" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4">No Data Available</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex justify-end mt-4">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                className={`px-3 py-1 border ${
                  currentPage === i + 1 ? "bg-[#00613e] text-white" : ""
                }`}
                onClick={() => setCurrentPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
