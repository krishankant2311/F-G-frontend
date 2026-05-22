import React, { useEffect } from "react";
import Layout from "../layout/Layout";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useLocation, useNavigate } from "react-router-dom";
import { useTableContext } from "../../context/TableContext";

export default function ViewDraftCopyByDate() {
  const { tableSize } = useTableContext();
  const location = useLocation();
  const data = location.state.data;
  const navigate = useNavigate();

  // console.log(data);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <Layout>
      <ToastContainer />
      <div
        className={`${tableSize === 250 ? "md:ml-[250px]" : "md:ml-[90px]"}`}
      >
        <div className="lg:p-10 p-3">
          <div className="card">
            <div className="card-header bg-[#00613e] text-white">
              <h3 className="card-title mt-1">
                <button
                  onClick={() => {
                    navigate(-1);
                  }}
                >
                  <i className="fa fa-arrow-left mr-2"></i>
                </button>{" "}
                View Draft Copy
              </h3>
            </div>
            <div className="p-6">
              <div className="mb-2 flex justify-between">
                <div className="">
                  <h4 className=" font-bold">{data && data.date}</h4>
                </div>
                {/* <div className="flex gap-6 flex-row">
                  <div className="">
                    <h4 className=" font-bold">Start Time</h4>
                    <p className=" font-medium">{data && data.startTime}</p>
                  </div>
                  <div className="">
                    <h4 className=" font-bold">End Time</h4>
                    <p className=" font-medium">{data && data.endTime}</p>
                  </div>
                  <div className="">
                    <h4 className=" font-bold">Total Man Hours</h4>
                    <p className=" font-medium">{data && data.totalManHours}</p>
                  </div>
                </div> */}
              </div>
              <hr />
              <div className="">
                <ul className="mt-6">
                  {data &&
                    data.copies &&
                    data.copies.map((outerCopy) =>
                      outerCopy.copies
                        .filter((item) => item.source === "F&G")
                        .map((copy) => (
                          <li key={copy._id} className="w-full flex gap-6 mt-2">
                            <div className="md:w-[20%] w-full">
                              <h6 className=" font-semibold">Source Used</h6>
                              <p>{copy.source}</p>
                            </div>
                            <div className="md:w-[30%] w-full">
                              <h6 className=" font-bold">Name</h6>
                              <p>{copy.reference}</p>
                            </div>
                            <div className="md:w-[10%] w-full">
                              <h6 className=" font-bold">Measure</h6>
                              <p>{copy.measure}</p>
                            </div>
                            <div className="md:w-[10%] w-full">
                              <h6 className=" font-bold">Quantity</h6>
                              <p>{copy.quantity}</p>
                            </div>
                            <div className="md:w-[10%] w-full">
                              <h6 className=" font-bold">Total Price</h6>
                              <p>
                                <b>$</b>{" "}
                                {copy.totalPrice?.toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                }) || 0}
                              </p>
                            </div>
                          </li>
                        ))
                    )}
                  {data &&
                    data.copies &&
                    data.copies.map((outerCopy) =>
                      outerCopy.copies
                        .filter((item) => item.source === "Other")
                        .map((copy) => (
                          <li key={copy._id} className="w-full flex gap-6 mt-2">
                            <div className="md:w-[20%] w-full">
                              <h6 className=" font-semibold">Source Used</h6>
                              <p>{copy.source}</p>
                            </div>
                            <div className="md:w-[30%] w-full">
                              <h6 className=" font-bold">Name</h6>
                              <p>{copy.reference}</p>
                            </div>
                            <div className="md:w-[10%] w-full">
                              <h6 className=" font-bold">Measure</h6>
                              <p>{copy.measure}</p>
                            </div>
                            <div className="md:w-[10%] w-full">
                              <h6 className=" font-bold">Quantity</h6>
                              <p>{copy.quantity}</p>
                            </div>
                            {copy.invoice && (
                              <div className="md:w-[10%] w-full">
                                <h6 className=" font-bold">Invoice</h6>
                                <p>{copy.invoice}</p>
                              </div>
                            )}
                            {copy.PO && (
                              <div className="md:w-[10%] w-full">
                                <h6 className=" font-bold">PO</h6>
                                <p>{copy.PO}</p>
                              </div>
                            )}
                            <div className="md:w-[10%] w-full">
                              <h6 className=" font-bold">Total Price</h6>
                              <p>
                                <b>$</b>{" "}
                                {copy.totalPrice?.toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                }) || 0}
                              </p>
                            </div>
                          </li>
                        ))
                    )}

                  {/* Lump Sum */}
                  {data &&
                    data.copies &&
                    data.copies.map((outerCopy) =>
                      outerCopy.copies
                        .filter((item) => item.source.includes("Lump Sum"))
                        .map((copy) => (
                          <li key={copy._id} className="w-full flex gap-6 mt-2">
                            <div className="md:w-[20%] w-full">
                              <h6 className=" font-semibold">Source Used</h6>
                              <p>{copy.source}</p>
                            </div>
                            {false && (
                              <div className="md:w-[30%] w-full">
                                <h6 className=" font-bold">Vendor Name</h6>
                                <p>{copy.vendorName}</p>
                              </div>
                            )}
                            <div className="md:w-[30%] w-full">
                              <h6 className=" font-bold">Description</h6>
                              <p>{copy.reference}</p>
                            </div>
                            <div className="md:w-[10%] w-full">
                              <h6 className=" font-bold">Total Price</h6>
                              <p>
                                <b>$</b>{" "}
                                {copy.totalPrice?.toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </p>
                            </div>
                          </li>
                        ))
                    )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
