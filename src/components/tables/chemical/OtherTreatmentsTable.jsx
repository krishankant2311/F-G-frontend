import axios from "axios";
import React, { useEffect, useRef, useState } from "react";
import { useTableContext } from "../../../context/TableContext";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AddOtherTreatment from "./components/AddOtherTreatment";
import EditOtherTreatment from "./components/EditOtherTreatment";
import DeleteOtherTreatment from "./components/DeleteOtherTreatment";
import {
  formatProgramTypeLabel,
  formatCatalogTreatmentDisplayName,
  mergeDefaultAndCustomTreatments,
} from "../../../utils/otherTreatmentDefaults";
import {
  deleteCustomLocalTreatment,
  getCustomLocalTreatments,
} from "../../../utils/otherTreatmentLocalStore";

const DELETE_ERROR_TOAST_ID = "delete-other-treatment-error";

const formatMoney = (val) => {
  const n = Number(val);
  if (!Number.isFinite(n)) return "-";
  return `$${n.toFixed(2)}`;
};

const SortIcon = ({ column, sortBy, sortOrder }) => (
  <i
    className={`${
      sortOrder === "asc" && sortBy === column
        ? "fa fa-sort-amount-asc"
        : "fa fa-sort-amount-desc"
    } ml-2`}
  />
);

export default function OtherTreatmentsTable() {
  const [data, setData] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [sortBy, setSortBy] = useState("sortOrder");
  const [sortOrder, setSortOrder] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [deletedId, setDeletedId] = useState("");
  const [perPageRecords, setPerPageRecords] = useState(50);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editData, setEditData] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletedName, setDeletedName] = useState("");
  const [term, setTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [usingLocalDefaults, setUsingLocalDefaults] = useState(false);
  const autoSeedAttemptedRef = useRef(false);

  const { tableSize } = useTableContext();

  useEffect(() => {
    fetchTreatments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, sortBy, sortOrder, perPageRecords, debouncedTerm]);

  useEffect(() => {
    const delay = setTimeout(() => {
      setDebouncedTerm(term);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(delay);
  }, [term]);

  const applyLocalView = () => {
    const merged = mergeDefaultAndCustomTreatments(
      getCustomLocalTreatments(),
      debouncedTerm
    );
    const start = (currentPage - 1) * perPageRecords;
    const pageRows = merged.slice(start, start + perPageRecords).map((item, i) => ({
      ...item,
      serialNo: start + i + 1,
    }));
    setData(pageRows);
    setTotalRecords(merged.length);
    setTotalPages(Math.max(1, Math.ceil(merged.length / perPageRecords)));
    setUsingLocalDefaults(true);
  };

  const seedDefaultsRequest = async () => {
    const token = localStorage.getItem("f&gstafftoken");
    if (!token) return { ok: false };

    const res = await axios.post(
      `${process.env.REACT_APP_API_BASE_URL}/chemical-maintenance/seed-other-treatments`,
      {},
      { headers: { token } }
    );
    return { ok: !!res.data.success, data: res.data };
  };

  const fetchTreatments = async ({ skipAutoSeed = false } = {}) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("f&gstafftoken");
      if (!token) {
        applyLocalView();
        return;
      }

      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/chemical-maintenance/get-all-other-treatment`,
        {
          headers: { token },
          params: {
            page: currentPage,
            limit: perPageRecords,
            search: debouncedTerm || "",
            sortby: sortBy || "sortOrder",
            sortorder: sortOrder === "asc" ? 1 : -1,
          },
        }
      );

      if (response.data.statusCode === 200) {
        const { treatments, totalPages: tp, totalRecords: tr } =
          response.data.result || {};

        if (
          tr === 0 &&
          !debouncedTerm &&
          !skipAutoSeed &&
          !autoSeedAttemptedRef.current
        ) {
          autoSeedAttemptedRef.current = true;
          try {
            const seeded = await seedDefaultsRequest();
            if (seeded.ok) {
              return fetchTreatments({ skipAutoSeed: true });
            }
          } catch (seedError) {
            console.error("Auto-seed failed:", seedError);
          }
        }

        if (tr === 0 && !debouncedTerm) {
          applyLocalView();
          return;
        }

        setUsingLocalDefaults(false);
        const updatedData = (treatments || []).map((item, index) => ({
          ...item,
          serialNo: (currentPage - 1) * perPageRecords + index + 1,
        }));
        setData(updatedData);
        setTotalPages(tp || 1);
        setTotalRecords(tr || 0);
      } else if (!debouncedTerm) {
        applyLocalView();
      } else {
        toast.error(response.data.message || "Failed to fetch treatments");
      }
    } catch (error) {
      console.error(error);
      if (!debouncedTerm) {
        applyLocalView();
      } else {
        toast.error("Failed to fetch treatments");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSeedDefaults = async () => {
    if (isSeeding) return false;
    try {
      setIsSeeding(true);
      const seeded = await seedDefaultsRequest();
      if (seeded.ok) {
        const { created = 0, updated = 0, skipped = 0 } = seeded.data?.data || {};
        toast.success(
          `Defaults loaded (${created} new, ${updated} restored, ${skipped} already present)`
        );
        autoSeedAttemptedRef.current = true;
        setUsingLocalDefaults(false);
        await fetchTreatments({ skipAutoSeed: true });
        return true;
      }
      toast.error(seeded.data?.message || "Failed to load defaults");
      return false;
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to load default treatments"
      );
      return false;
    } finally {
      setIsSeeding(false);
    }
  };

  const moveToEditForm = (item) => {
    setEditData(item);
    setShowEdit(true);
    setShowAdd(false);
  };

  const handleEditClick = async (item) => {
    if (item._isLocalDefault) {
      const saved = await handleSeedDefaults();
      if (!saved) return;
      const token = localStorage.getItem("f&gstafftoken");
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_BASE_URL}/chemical-maintenance/get-all-other-treatment`,
          {
            headers: { token },
            params: {
              page: 1,
              limit: 500,
              search: item.treatmentName,
              sortby: "sortOrder",
              sortorder: 1,
            },
          }
        );
        const match = (res.data.result?.treatments || []).find(
          (t) =>
            String(t.treatmentName).trim().toUpperCase() ===
            String(item.treatmentName).trim().toUpperCase()
        );
        if (match) {
          moveToEditForm(match);
          return;
        }
      } catch (error) {
        console.error(error);
      }
      toast.error("Could not open treatment for editing");
      return;
    }
    moveToEditForm(item);
  };

  const handleDeleteClick = async (item) => {
    if (item._isLocalDefault) {
      toast.info("Default annual treatments cannot be deleted.");
      return;
    }
    if (item._isLocalOnly) {
      deleteCustomLocalTreatment(item._id);
      toast.success("Treatment deleted");
      applyLocalView();
      return;
    }
    setDeletedId(item._id);
    setDeletedName(item.treatmentName);
    setShowDeleteModal(true);
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const previousPage = () => {
    if (currentPage <= 1) return;
    setCurrentPage((p) => p - 1);
  };

  const nextPage = () => {
    if (currentPage >= totalPages) return;
    setCurrentPage((p) => p + 1);
  };

  const confirmDelete = async () => {
    if (isDeleting) return;
    try {
      setIsDeleting(true);
      const token = localStorage.getItem("f&gstafftoken");
      const res = await axios.delete(
        `${process.env.REACT_APP_API_BASE_URL}/chemical-maintenance/delete-other-treatment/${deletedId}`,
        { headers: { token } }
      );
      if (res.data.success) {
        toast.success("Treatment deleted successfully");
        setShowDeleteModal(false);
        fetchTreatments();
      } else {
        toast.error(res.data.message || "Failed to delete", {
          toastId: DELETE_ERROR_TOAST_ID,
        });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete", {
        toastId: DELETE_ERROR_TOAST_ID,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={`${tableSize === 250 ? "md:ml-[250px]" : "md:ml-[90px]"}`}>
      <ToastContainer />
      <div className="card">
        <div className="px-4 py-3 flex justify-between items-end border-b">
          <div className="flex justify-center flex-grow">
            <h3 className="text-lg font-bold">OTHER TREATMENTS</h3>
          </div>
          <div className="flex justify-end flex-wrap gap-2 w-auto">
            <select
              value={perPageRecords}
              onChange={(e) => {
                setPerPageRecords(Number(e.target.value));
                setCurrentPage(1);
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
            {usingLocalDefaults && (
              <button
                type="button"
                className="btn btn-outline-secondary text-sm relative top-1"
                onClick={handleSeedDefaults}
                disabled={isSeeding}
              >
                <i className="fa fa-download mr-2" />
                {isSeeding ? "Saving..." : "Load Landscaping Defaults"}
              </button>
            )}
            <button
              type="button"
              className="btn bg-[#00613e] text-white text-sm relative top-1"
              onClick={() => {
                setShowEdit(false);
                setShowAdd(true);
              }}
            >
              <i className="fa fa-plus mr-2" />
              Add Treatment
            </button>
          </div>
        </div>

        <div className="card-body overflow-x-auto">
          <table className="table table-bordered table-striped text-center">
            <thead>
              <tr>
                <th onClick={() => handleSort("sortOrder")}>
                  S. No. <SortIcon column="sortOrder" sortBy={sortBy} sortOrder={sortOrder} />
                </th>
                <th onClick={() => handleSort("treatmentName")} className="text-left">
                  Treatment Name{" "}
                  <SortIcon column="treatmentName" sortBy={sortBy} sortOrder={sortOrder} />
                </th>
                <th onClick={() => handleSort("programType")}>
                  Program{" "}
                  <SortIcon column="programType" sortBy={sortBy} sortOrder={sortOrder} />
                </th>
                <th onClick={() => handleSort("cost")}>
                  Cost <SortIcon column="cost" sortBy={sortBy} sortOrder={sortOrder} />
                </th>
                <th onClick={() => handleSort("price")}>
                  Price <SortIcon column="price" sortBy={sortBy} sortOrder={sortOrder} />
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {!loading ? (
                data.length > 0 ? (
                  data.map((item) => (
                    <tr key={item._id}>
                      <td>{item.serialNo}</td>
                      <td className="text-left">
                        {formatCatalogTreatmentDisplayName(item)}
                      </td>
                      <td>{formatProgramTypeLabel(item.programType)}</td>
                      <td>{formatMoney(item.cost)}</td>
                      <td>{formatMoney(item.price)}</td>
                      <td className="flex justify-center gap-4">
                        <button
                          type="button"
                          onClick={() => handleEditClick(item)}
                          title="Edit Treatment"
                        >
                          <i className="fa fa-edit" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(item)}
                          title="Delete Treatment"
                        >
                          <i className="fa fa-trash" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="text-center" colSpan={6}>
                      No Data Available
                    </td>
                  </tr>
                )
              ) : (
                <tr>
                  <td className="text-center" colSpan={6}>
                    Loading ...
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <th>S. No.</th>
                <th className="text-left">Treatment Name</th>
                <th>Program</th>
                <th>Cost</th>
                <th>Price</th>
                <th>Actions</th>
              </tr>
            </tfoot>
          </table>

          <div className="flex lg:flex-row flex-col lg:items-end items-center justify-between px-1 mt-6">
            <div>
              <p>
                Showing{" "}
                {totalRecords === 0
                  ? 0
                  : perPageRecords * currentPage - (perPageRecords - 1)}{" "}
                to{" "}
                {currentPage * perPageRecords > totalRecords
                  ? totalRecords
                  : currentPage * perPageRecords}{" "}
                of {totalRecords} entries
              </p>
            </div>
            <div className="flex justify-end mt-2">
              <button
                type="button"
                className="bg-[#00613e] text-white px-2 py-1"
                onClick={previousPage}
                disabled={currentPage <= 1}
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  type="button"
                  key={i}
                  className={`border-x px-[10px] py-1 ${
                    currentPage === i + 1 ? "bg-[#00613e] text-white" : ""
                  }`}
                  onClick={() => setCurrentPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
              <button
                type="button"
                className="bg-[#00613e] text-white px-2 py-1"
                onClick={nextPage}
                disabled={currentPage >= totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      <AddOtherTreatment
        show={showAdd}
        onClose={() => setShowAdd(false)}
        onSuccess={() => fetchTreatments({ skipAutoSeed: true })}
      />
      <EditOtherTreatment
        show={showEdit}
        onClose={() => {
          setShowEdit(false);
          setEditData(null);
        }}
        data={editData}
        onSuccess={() => fetchTreatments({ skipAutoSeed: true })}
      />
      {showDeleteModal && (
        <DeleteOtherTreatment
          treatmentName={deletedName}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={confirmDelete}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}
