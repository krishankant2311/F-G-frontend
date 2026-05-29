import axios from "axios";
import React, { useEffect, useState } from "react";
import { useTableContext } from "../../../context/TableContext";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import parse from "html-react-parser";
import AddChemical from "./components/AddChemical";
import EditChemical from "./components/EditChemical";
import DeleteChemicalMix from "./components/DeleteChemical";
import SyncChemicalsFromMixes from "./components/SyncChemicalsFromMixes";

const DELETE_ERROR_TOAST_ID = "delete-chemical-error";

export default function ChemicalTable() {
  // const { pageNo } = useParams();
  const [data, setData] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalRecords, settotalRecords] = useState(0);
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  // const navigate = useNavigate("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [disableBtn, setDisableBtn] = useState(false);
  const [deletedId, setDeletedId] = useState("");
  const [perPageRecords, setPerPageRecords] = useState(10);
  const [showAddChemical, setShowAddChemical] = useState(false);
  const [showSyncFromMixes, setShowSyncFromMixes] = useState(false);
  const [showEditChemical, setShowEditChemical] = useState(false);
  const [editData, setEditData] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletedName, setDeletedName] = useState(""); // optional, to display chemical name
  const [term, setTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const { tableSize } = useTableContext();

  useEffect(() => {
    getAllChemical();
  }, [currentPage, sortBy, sortOrder, perPageRecords, debouncedTerm]);

  useEffect(() => {
    const delay = setTimeout(() => {
      setDebouncedTerm(term);
      setCurrentPage(1);
    }, 500);

    return () => clearTimeout(delay);
  }, [term]);

  const getAllChemical = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem("f&gstafftoken");

      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/chemical-maintenance/get-all-chemical`,
        {
          headers: {
            token: token,
          },
          params: {
            page: currentPage,
            limit: perPageRecords,
            search: debouncedTerm || "",
            sortby: sortBy || "createdAt",
            sortorder: sortOrder === "asc" ? 1 : -1,
          },
        },
      );
      console.log(response);

      if (response.data.statusCode === 200) {
        const { chemicals, totalPages, totalRecords } = response.data.result;

        const updatedData = chemicals.map((item, index) => ({
          ...item,
          serialNo: (currentPage - 1) * perPageRecords + index + 1,
        }));
        console.log(updatedData);

        setData(updatedData);
        setTotalPages(totalPages);
        settotalRecords(totalRecords);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch chemicals");
    } finally {
      setLoading(false);
    }
  };

  // FIXED: Edit function with proper state management
  const moveToEditForm = (item) => {
    console.log("Edit clicked for:", item); // Debug log
    setEditData(item);
    setShowEditChemical(true);
    // Make sure Add modal is closed
    setShowAddChemical(false);
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

  // const sortedData = () => {
  //   let sorted = [...data];
  //   if (sortBy) {
  //     sorted.sort((a, b) => {
  //       const aValue = a[sortBy];
  //       const bValue = b[sortBy];
  //       if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
  //       if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
  //       return 0;
  //     });
  //   }
  //   return sorted;
  // };

  const handleDeleteChemical = async (id) => {
    if (isDeleting) return;

    try {
      setIsDeleting(true);
      const token = localStorage.getItem("f&gstafftoken");
      const res = await axios.delete(
        `${process.env.REACT_APP_API_BASE_URL}/chemical-maintenance/delete-chemical/${id}`,
        {
          headers: {
            token,
          },
        },
      );

      if (res.data.success) {
        toast.success("Chemical deleted successfully");
        // Refresh list from server
        getAllChemical();
      } else {
        toast.error(res.data.message || "Failed to delete chemical", {
          toastId: DELETE_ERROR_TOAST_ID,
        });
      }
    } catch (error) {
      console.error(error);
      const status = error.response?.status;
      const message = error.response?.data?.message;

      // If already deleted, silently ignore instead of showing an error toast
      if (status === 404 && message === "Chemical not found") {
        return;
      }

      toast.error(message || "Failed to delete chemical", {
        toastId: DELETE_ERROR_TOAST_ID,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // FIXED: Close handlers with proper cleanup
  const handleCloseAdd = () => {
    setShowAddChemical(false);
  };

  const handleCloseEdit = () => {
    setShowEditChemical(false);
    setEditData(null); // Clear edit data when closing
  };

  return (
    <div className={`${tableSize === 250 ? "md:ml-[250px]" : "md:ml-[90px]"}`}>
      <ToastContainer />
      <div className="card">
        <div className="px-4 py-3 flex justify-between items-end border-b">
          <div className="flex justify-center flex-grow">
            <h3 className="text-lg font-bold">CHEMICALS </h3>
          </div>
          <div className="flex justify-end flex-wrap gap-2 w-auto">
            <select
              name="perPage"
              id=""
              value={perPageRecords}
              // onChange={(e) => {
              //   setPerPageRecords(e.target.value);
              // }}
              onChange={(e) => {
                setPerPageRecords(Number(e.target.value)); // ✅ Number
                setCurrentPage(1); // page bhi reset
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
            <button
              type="button"
              className="btn btn-outline-secondary text-sm relative top-1"
              onClick={() => {
                setShowEditChemical(false);
                setShowAddChemical(false);
                setShowSyncFromMixes(true);
              }}
            >
              <i className="fa fa-download mr-2" />
              Import from Mixes
            </button>
            <button
              className={`btn bg-[#00613e] text-white text-sm relative top-1 ${
                disableBtn ? "disabled" : ""
              }`}
              onClick={() => {
                setShowEditChemical(false); // Make sure edit is closed
                setShowAddChemical(true);
              }}
            >
              <i className="fa fa-plus mr-2"></i>
              Add Chemical
            </button>
          </div>
        </div>
        <div className="card-body overflow-x-auto">
          <table className="table table-bordered table-striped text-center">
            <thead>
              <tr>
                <th onClick={() => handleSort("serialNo")}>S. No.</th>
                <th onClick={() => handleSort("chemicalName")}>
                  Chemical Name{" "}
                  <i
                    className={`${
                      sortOrder === "asc" && sortBy === "chemicalName"
                        ? "fa fa-sort-amount-asc"
                        : "fa fa-sort-amount-desc"
                    } ml-2`}
                  ></i>
                </th>
                <th onClick={() => handleSort("measure")}>
                  Measure{" "}
                  <i
                    className={`${
                      sortOrder === "asc" && sortBy === "measure"
                        ? "fa fa-sort-amount-asc"
                        : "fa fa-sort-amount-desc"
                    } ml-2`}
                  ></i>
                </th>
                <th onClick={() => handleSort("price")}>
                  Price{" "}
                  <i
                    className={`${
                      sortOrder === "asc" && sortBy === "price"
                        ? "fa fa-sort-amount-asc"
                        : "fa fa-sort-amount-desc"
                    } ml-2`}
                  ></i>
                </th>
                <th onClick={() => handleSort("cost")}>
                  Cost{" "}
                  <i
                    className={`${
                      sortOrder === "asc" && sortBy === "cost"
                        ? "fa fa-sort-amount-asc"
                        : "fa fa-sort-amount-desc"
                    } ml-2`}
                  ></i>
                </th>
                <th onClick={() => handleSort("isTaxable")}>
                  Is Taxable{" "}
                  <i
                    className={`${
                      sortOrder === "asc" && sortBy === "isTaxable"
                        ? "fa fa-sort-amount-asc"
                        : "fa fa-sort-amount-desc"
                    } ml-2`}
                  ></i>
                </th>
                {/* <th onClick={() => handleSort("status")}>
                  Status{" "}
                  <i
                    className={`${
                      sortOrder === "asc" && sortBy === "status"
                        ? "fa fa-sort-amount-asc"
                        : "fa fa-sort-amount-desc"
                    } ml-2`}
                  ></i>
                </th> */}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {!loading ? (
                data.length > 0 ? (
                  data.map((item, index) => {
                    return (
                      <tr key={index}>
                        <td>{item.serialNo}</td>
                        <td>{item.chemicalName}</td>
                        <td className="">
                          {item.measure ? item.measure : "-"}
                        </td>
                        <td>{item.price}</td>
                        <td>{item.cost ?? "-"}</td>
                        <td>
                          {item.isTaxable ? (
                            <span className=" font-semibold">Yes</span>
                          ) : (
                            <span className="font-semibold">No</span>
                          )}
                        </td>
                        {/* <td>
                          {item.status === "Active"
                            ? "Not Started"
                            : item.status}
                        </td> */}
                        <td className="flex justify-center gap-4">
                          <button
                            onClick={() => moveToEditForm(item)}
                            title="Edit Chemical"
                            type="button"
                          >
                            <i className="fa fa-edit"></i>
                          </button>
                          {item.status === "Active" ||
                          item.status === "Ongoing" ||
                          item.status === "Completed" ? (
                            // <button
                            //   type="button"
                            //   className=""
                            //   data-toggle="modal"
                            //   data-target="#exampleModalCenter"
                            //   onClick={() => {
                            //     setDeletedId(item._id);
                            //   }}
                            // >
                            //   <i className="fa fa-trash"></i>
                            // </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeletedId(item._id);
                                setDeletedName(item.chemicalName); // show name in modal
                                setShowDeleteModal(true);
                              }}
                              title="Delete Chemical"
                            >
                              <i className="fa fa-trash"></i>
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="text-center" colSpan="8">
                      No Data Available
                    </td>
                  </tr>
                )
              ) : (
                <tr>
                  <td className="text-center" colSpan="8">
                    Loading ...
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <th>S. No.</th>
                <th>Chemical Name</th>
                <th>Measure </th>
                <th> Price</th>
                <th>Cost</th>
                <th>Taxable</th>
                {/* <th>Status</th> */}
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
                className="bg-[#00613e] text-white px-2 py-1"
                onClick={previousPage}
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => {
                return (
                  <button
                    className={`border-x px-[10px] py-1 ${
                      currentPage === i + 1 ? "bg-[#00613e] text-white" : ""
                    }`}
                    key={i}
                    // onClick={() => {
                    //   navigate(`/panel/office/bid-projects/${i + 1}`);
                    // }}
                    onClick={() => setCurrentPage(i + 1)}
                  >
                    {i + 1}
                  </button>
                );
              })}
              <button
                className="bg-[#00613e] text-white px-2 py-1"
                onClick={nextPage}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Chemical Modal */}
      <AddChemical
        show={showAddChemical}
        onClose={handleCloseAdd}
        onSuccess={getAllChemical}
      />

      <SyncChemicalsFromMixes
        show={showSyncFromMixes}
        onClose={() => setShowSyncFromMixes(false)}
        onSuccess={getAllChemical}
      />

      {/* Edit Chemical Modal */}
      <EditChemical
        show={showEditChemical}
        onClose={handleCloseEdit}
        data={editData}
        onSuccess={getAllChemical}
      />
      {showDeleteModal && (
        <DeleteChemicalMix
          mixName={deletedName}
          onClose={() => setShowDeleteModal(false)}
          isDeleting={isDeleting}
          onConfirm={async () => {
            await handleDeleteChemical(deletedId);
            setShowDeleteModal(false);
          }}
        />
      )}
    </div>
  );
}
