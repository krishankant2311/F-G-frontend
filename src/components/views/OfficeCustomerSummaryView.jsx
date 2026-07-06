import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTableContext } from "../../context/TableContext";
import {
  downloadCustomerSummaryCsv,
  formatProjectDate,
  formatSummaryDescription,
  formatSummaryMoney,
  loadRecentCustomerSearches,
  saveRecentCustomerSearch,
  summarizeLatestCustomerCopyBoth,
} from "../../utils/customerSummaryPricing";

const STATUS_FILTERS = ["ONGOING", "COMPLETED", "BILLED"];
const FILTER_BUTTONS = [...STATUS_FILTERS, "COST"];

function resolveJobAddress(customer, projects = []) {
  if (projects[0]?.jobAddress) return projects[0].jobAddress;
  const addr = customer?.jobAddress;
  if (Array.isArray(addr) && addr.length) return addr[0];
  if (typeof addr === "string") return addr;
  return "-";
}

function FilterButton({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-5 py-1.5 text-sm font-bold rounded-md border-2 transition-colors ${
        active
          ? "bg-[#00613e] text-white border-[#00613e]"
          : "bg-white text-[#00613e] border-[#00613e]"
      }`}
    >
      {label}
    </button>
  );
}

function CustomerSummaryBlock({ customer, onRemove }) {
  const exportModalId = `customerSummaryExportModal_${customer._id}`;
  const [statusFilters, setStatusFilters] = useState({
    ONGOING: true,
    COMPLETED: false,
    BILLED: false,
  });
  const [costMode, setCostMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [exportDocumentName, setExportDocumentName] = useState("");

  const activeStatusTabs = useMemo(
    () => STATUS_FILTERS.filter((tab) => statusFilters[tab]),
    [statusFilters]
  );

  const fetchProjects = useCallback(async () => {
    if (!customer?._id || !activeStatusTabs.length) {
      setProjects([]);
      return;
    }
    try {
      setLoading(true);
      const token = localStorage.getItem("f&gstafftoken");
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/customer/customer-projects/${customer._id}`,
        {
          headers: { token, "Content-Type": "application/json" },
          params: {
            page: 1,
            limit: 500,
            statusTabs: activeStatusTabs.join(","),
          },
        }
      );
      if (response.data.statusCode === 200) {
        setProjects(response.data.result?.projects || []);
      } else {
        toast.error(response.data.message || "Failed to load projects");
        setProjects([]);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to load projects");
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [customer?._id, activeStatusTabs]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const toggleFilter = (tab) => {
    if (tab === "COST") {
      setCostMode((prev) => !prev);
      return;
    }
    setStatusFilters((prev) => {
      const next = { ...prev, [tab]: !prev[tab] };
      const anySelected = STATUS_FILTERS.some((key) => next[key]);
      if (!anySelected) return prev;
      return next;
    });
  };

  const isFilterActive = (tab) =>
    tab === "COST" ? costMode : Boolean(statusFilters[tab]);

  const rows = useMemo(
    () =>
      projects.map((project) => {
        const pricing = summarizeLatestCustomerCopyBoth(project);
        return {
          id: project._id,
          projectCode: project.projectCode || "-",
          description: formatSummaryDescription(project.description),
          ...pricing,
          startDate: formatProjectDate(project.projectStartDate),
          startDateRaw: project.projectStartDate,
          completionDate: formatProjectDate(project.projectCompletedDate),
          completionDateRaw: project.projectCompletedDate,
          isBid: String(project.billingType || "").toLowerCase() === "bid" ? "Yes" : "No",
        };
      }),
    [projects]
  );

  const columnCount = costMode ? 15 : 10;

  const defaultExportDocumentName = `${customer.customerName || "customer"}-summary`;

  const openExportModal = () => {
    if (!rows.length) {
      toast.info("No project rows to export.");
      return;
    }
    setExportDocumentName(defaultExportDocumentName);
  };

  const handleDownloadCsv = () => {
    if (!rows.length) {
      toast.info("No project rows to export.");
      return;
    }
    const ok = downloadCustomerSummaryCsv(customer.customerName, rows, {
      costMode,
      fileName: exportDocumentName.trim() || defaultExportDocumentName,
    });
    if (ok) toast.success("CSV downloaded.");
  };

  return (
    <div className="mb-10">
      <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
        <div className="text-sm space-y-0.5">
          <div>
            <span className="font-semibold">Customer Name:</span> {customer.customerName}
          </div>
          <div>
            <span className="font-semibold">Job Address:</span>{" "}
            {resolveJobAddress(customer, projects)}
          </div>
          <div>
            <span className="font-semibold">Email:</span>{" "}
            {customer.customerEmail || "-"}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {FILTER_BUTTONS.map((tab) => (
            <FilterButton
              key={tab}
              label={tab}
              active={isFilterActive(tab)}
              onClick={() => toggleFilter(tab)}
            />
          ))}
          <button
            type="button"
            className="ml-1 text-red-600 text-lg leading-none px-1"
            onClick={() => onRemove(customer._id)}
            title="Remove from summary"
          >
            ×
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border border-black">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-center">
              <th className="border border-black p-2 font-bold">PROJECT</th>
              <th className="border border-black p-2 font-bold min-w-[280px]">
                DESCRIPTION
              </th>
              {costMode && (
                <th className="border border-black p-2 font-bold">MATERIAL COST</th>
              )}
              <th className="border border-black p-2 font-bold">MATERIAL PRICE</th>
              {costMode && (
                <th className="border border-black p-2 font-bold">LABOR COST</th>
              )}
              <th className="border border-black p-2 font-bold">LABOR PRICE</th>
              {costMode && (
                <th className="border border-black p-2 font-bold">CONTRACT LABOR COST</th>
              )}
              <th className="border border-black p-2 font-bold">CONTRACT LABOR PRICE</th>
              {costMode && (
                <th className="border border-black p-2 font-bold">LUMP SUM COST</th>
              )}
              <th className="border border-black p-2 font-bold">LUMP SUM PRICE</th>
              {costMode && (
                <th className="border border-black p-2 font-bold">TOTAL COST</th>
              )}
              <th className="border border-black p-2 font-bold">TOTAL PRICE</th>
              <th className="border border-black p-2 font-bold">START DATE</th>
              <th className="border border-black p-2 font-bold">COMPLETION DATE</th>
              <th className="border border-black p-2 font-bold">BID</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columnCount} className="border border-black p-4 text-center">
                  Loading projects...
                </td>
              </tr>
            ) : rows.length ? (
              rows.map((row) => (
                <tr key={row.id} className="text-center">
                  <td className="border border-black p-2">{row.projectCode}</td>
                  <td className="border border-black p-2 text-left">{row.description}</td>
                  {costMode && (
                    <td className="border border-black p-2">
                      {formatSummaryMoney(row.materialCost)}
                    </td>
                  )}
                  <td className="border border-black p-2">
                    {formatSummaryMoney(row.materialPrice)}
                  </td>
                  {costMode && (
                    <td className="border border-black p-2">
                      {formatSummaryMoney(row.laborCost)}
                    </td>
                  )}
                  <td className="border border-black p-2">
                    {formatSummaryMoney(row.laborPrice)}
                  </td>
                  {costMode && (
                    <td className="border border-black p-2">
                      {formatSummaryMoney(row.contractLaborCost)}
                    </td>
                  )}
                  <td className="border border-black p-2">
                    {formatSummaryMoney(row.contractLaborPrice)}
                  </td>
                  {costMode && (
                    <td className="border border-black p-2">
                      {formatSummaryMoney(row.lumpSumCost)}
                    </td>
                  )}
                  <td className="border border-black p-2">
                    {formatSummaryMoney(row.lumpSumPrice)}
                  </td>
                  {costMode && (
                    <td className="border border-black p-2">
                      {formatSummaryMoney(row.totalCost)}
                    </td>
                  )}
                  <td className="border border-black p-2">
                    {formatSummaryMoney(row.totalPrice)}
                  </td>
                  <td className="border border-black p-2">{row.startDate}</td>
                  <td className="border border-black p-2">{row.completionDate}</td>
                  <td className="border border-black p-2">{row.isBid}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columnCount} className="border border-black p-4 text-center text-gray-500">
                  No projects found for selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end mt-3">
        <button
          type="button"
          onClick={openExportModal}
          disabled={loading || !rows.length}
          data-toggle="modal"
          data-target={`#${exportModalId}`}
          className="px-6 py-2 text-sm font-bold text-white bg-[#1e3a8a] rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          EXPORT
        </button>
      </div>

      <div
        className="modal fade"
        id={exportModalId}
        tabIndex={-1}
        role="dialog"
        aria-labelledby={`${exportModalId}Title`}
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id={`${exportModalId}Title`}>
                Export Customer Summary
              </h5>
              <button
                type="button"
                className="close"
                data-dismiss="modal"
                aria-label="Close"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group mb-0">
                <label htmlFor={`${exportModalId}-documentName`}>Document Name</label>
                <input
                  type="text"
                  className="form-control"
                  id={`${exportModalId}-documentName`}
                  placeholder="Enter document name"
                  value={exportDocumentName}
                  onChange={(e) => setExportDocumentName(e.target.value)}
                  maxLength={200}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                data-dismiss="modal"
              >
                Close
              </button>
              <button
                type="button"
                className="btn bg-[#00613e] text-white"
                data-dismiss="modal"
                onClick={handleDownloadCsv}
              >
                Download as CSV
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OfficeCustomerSummaryView() {
  const { tableSize } = useTableContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [recentSearches, setRecentSearches] = useState(loadRecentCustomerSearches());
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [searching, setSearching] = useState(false);

  const dropdownItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const recent = recentSearches.map((r) => ({
      ...r,
      isRecent: true,
      label: r.customerName,
      subLabel: r.searchedAt
        ? `Searched on ${new Date(r.searchedAt).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}`
        : "",
    }));
    if (!term) return recent;
    const fromSearch = searchResults.map((c) => ({
      ...c,
      isRecent: false,
      label: c.customerName,
      subLabel: c.customerEmail || "",
    }));
    const seen = new Set();
    return [...fromSearch, ...recent].filter((item) => {
      if (seen.has(item._id)) return false;
      seen.add(item._id);
      return item.label?.toLowerCase().includes(term);
    });
  }, [searchTerm, searchResults, recentSearches]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return undefined;
    }
    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        const token = localStorage.getItem("f&gstafftoken");
        const formdata = new FormData();
        formdata.append("term", searchTerm.trim());
        const response = await axios.post(
          `${process.env.REACT_APP_API_BASE_URL}/customer/search-customer-for-projects?page=1&limit=20`,
          formdata,
          { headers: { token } }
        );
        if (response.data.statusCode === 200) {
          setSearchResults(response.data.result?.customers || []);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const toggleCustomer = (customer) => {
    if (!customer?._id) return;
    saveRecentCustomerSearch(customer);
    setRecentSearches(loadRecentCustomerSearches());

    setSelectedIds((prev) => {
      const exists = prev.includes(customer._id);
      if (exists) {
        setSelectedCustomers((list) => list.filter((c) => c._id !== customer._id));
        return prev.filter((id) => id !== customer._id);
      }
      setSelectedCustomers((list) => [...list, customer]);
      return [...prev, customer._id];
    });
  };

  const removeCustomer = (customerId) => {
    setSelectedIds((prev) => prev.filter((id) => id !== customerId));
    setSelectedCustomers((list) => list.filter((c) => c._id !== customerId));
  };

  return (
    <div className={`${tableSize === 250 ? "md:ml-[250px]" : "md:ml-[90px]"}`}>
      <ToastContainer />
      <div className="p-4 lg:p-8">
        <h1 className="text-red-600 text-2xl font-semibold mb-6">Customer Summary</h1>

        <div className="relative max-w-3xl mb-8">
          <div className="flex items-center border rounded px-3 py-2 bg-white shadow-sm">
            <i className="fa fa-search text-gray-400 mr-2" />
            <input
              type="text"
              className="flex-1 outline-none"
              placeholder="Search customer..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
            />
            {searching && (
              <span className="text-xs text-gray-400 ml-2">Searching...</span>
            )}
          </div>

          {showDropdown && dropdownItems.length > 0 && (
            <div className="absolute z-20 left-0 right-0 mt-1 bg-white border rounded shadow-lg max-h-72 overflow-y-auto">
              <div className="px-3 py-2 text-xs font-bold text-gray-500 border-b">
                {searchTerm.trim() ? "SEARCH RESULTS" : "RECENT SEARCHES"}
              </div>
              {dropdownItems.map((item) => (
                <label
                  key={item._id}
                  className="flex items-start gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={selectedIds.includes(item._id)}
                    onChange={() => toggleCustomer(item)}
                  />
                  <div>
                    <div className="font-medium">{item.label}</div>
                    {item.subLabel && (
                      <div className="text-xs text-gray-500">{item.subLabel}</div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {showDropdown && (
          <button
            type="button"
            className="fixed inset-0 z-10 cursor-default"
            aria-label="Close search dropdown"
            onClick={() => setShowDropdown(false)}
          />
        )}

        {selectedCustomers.length === 0 ? (
          <p className="text-gray-500 text-sm">
            Search and select a customer to view their project summary below.
          </p>
        ) : (
          selectedCustomers.map((customer) => (
            <CustomerSummaryBlock
              key={customer._id}
              customer={customer}
              onRemove={removeCustomer}
            />
          ))
        )}
      </div>
    </div>
  );
}
