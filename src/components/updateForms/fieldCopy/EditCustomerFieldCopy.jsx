import React, { useEffect, useRef, useState } from "react";
import Layout from "../../layout/Layout";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate, useParams } from "react-router-dom";
import { useTableContext } from "../../../context/TableContext";
import parse from "html-react-parser";
import {
  applyReferenceVendorToForm,
  ensureFgCostFromPrice,
  normalizeFgEditableUnitValue,
  recalcFgFieldCopyLineTotals,
  syncFgCostPriceOnUserEdit,
  getMaterialNameInputValue,
  hydrateOtherFieldCopyFromApi,
  materialNameBaseForEdit,
  otherFieldCopyCostDisplayValue,
  recalcLaborGenerateCustomerLine,
  recalcOtherFieldCopyLine,
  toPersistedCopy,
} from "../../../utils/materialReference";
import {
  extractMaterialRows,
  replaceMaterialRowsInForms,
} from "../../../utils/customerCopyMaterialMerge";
import CustomerSalesOrderPreviewModal from "./CustomerSalesOrderPreviewModal";

export default function EditCustomerFieldCopy() {
  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    billingType: "",
    jobAddress: "",
    jobType: "",
    crewCategory: "",
    description: "",
    crew: [],
    truckNo: "",
    trailerNo: "",
    projectStartDate: "",
  });
  const [forms, setForms] = useState([
    {
      source: "F&G",
      type: "",
      vendorName: "",
      referenceBase: "",
      markup: 100,
      markUp: 100,
      reference: "",
      measure: "",
      quantity: "",
      price: "",
      totalCost: 0,
      totalPrice: 0,
      invoice: "",
      PO: "",
      isTaxable: true,
      startDate: Date.now(),
      endDate: Date.now(),
    },
  ]);
  const [materials, setMaterials] = useState([]);
  const [disableBtn, setDisableBtn] = useState(false);
  const [jobTypes, setJobTypes] = useState([]);
  const [jobType, setJobType] = useState("");
  const [laborData, setLaborData] = useState([]);
  const [adminTax, setAdminTax] = useState(0);
  const [address, setAddress] = useState("");
  const [showSalesOrderPreview, setShowSalesOrderPreview] = useState(false);
  const { id } = useParams();
  const navigate = useNavigate();

  const { tableSize } = useTableContext();

  useEffect(() => {
    getProjectById();
    getJobTypeById();
    getCustomerFieldCopyData();
    getMaterials();
    getTaxPercentage();
    getJobTypes();
    getFGAddress();
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    getJobTypeById();
  }, [formData]);

  const getProjectById = async () => {
    try {
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/project/get-project/${id}`,
        { headers: headers }
      );
      if (response.data.statusCode === 200) {
        if (!response.data.result.isProjectStarted) {
          navigate(-1);
        }
        // console.log("Project Info", response.data.result);
        setFormData(response.data.result);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response.message);
    }
  };

  const getCustomerFieldCopyData = async () => {
    try {
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/project/get-office-field-copy/${id}`,
        { headers: headers }
      );
      if (response.data.statusCode === 200) {
        const resultedCopies = [
          ...response.data.result.officeFieldCopies,
          ...response.data.result.officeDraftCopies,
        ];
        let compiledForms = compileMaterials(resultedCopies || []);
        compiledForms = compiledForms.map((form) => {
          form.intialReference = form.reference;
          form.initialJobType = form.type;
          form.referenceBase = materialNameBaseForEdit(
            String(form.reference || ""),
            form.vendorName
          );
          const cost = parseFloat(form.cost) || 0;
          const price = parseFloat(form.price) || 0;
          const totalPrice = parseFloat(form.totalPrice) || 0;
          // Autofill markup - F&G/Other: cost & price se | Lump Sum/Labor: cost & totalPrice se
          if (form.source === "F&G") {
            Object.assign(form, ensureFgCostFromPrice(form));
            const fgCost = parseFloat(form.cost) || 0;
            const fgPrice = parseFloat(form.price) || 0;
            if (fgCost > 0 && fgPrice > 0) {
              const autoMarkup = ((fgPrice - fgCost) / fgCost) * 100;
              form.markup = Math.round(autoMarkup * 100) / 100;
              form.markUp = form.markup;
            }
          } else if (form.source === "Other") {
            if (cost > 0 && price > 0) {
              const autoMarkup = ((price - cost) / cost) * 100;
              form.markup = Math.round(autoMarkup * 100) / 100;
              form.markUp = form.markup;
            }
          } else if (form.source === "Lump Sum" && cost > 0 && totalPrice > 0) {
            const autoMarkup = ((totalPrice - cost) / cost) * 100;
            form.markup = Math.round(autoMarkup * 100) / 100;
            form.markUp = form.markup;
          }
          if (form.source === "Other") {
            return hydrateOtherFieldCopyFromApi(form);
          }
          if (form.source === "Labor") {
            return recalcLaborGenerateCustomerLine(form);
          }
          return form;
        });

        setForms(compiledForms);
        const resultedLabors = [
          ...response.data.result.laborData,
          ...response.data.result.laborDraftData,
        ];
        const laborData = resultedLabors.filter(
          (labor) => labor.totalPrice !== 0
        );
        setLaborData(laborData || []);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response.message);
    }
  };

  const compileMaterials = (forms) => {
    const compiled = {};

    forms.forEach((form) => {
      const { reference, measure, quantity, price, totalPrice, type } = form;
      // Use both reference and measure as the key
      const key = `${reference}-${type}-${measure}-${price}`;

      if (compiled[key]) {
        compiled[key].quantity += parseFloat(quantity);
        compiled[key].totalPrice += parseFloat(totalPrice);
      } else {
        compiled[key] = {
          ...form,
          quantity: parseFloat(quantity),
          totalPrice: parseFloat(totalPrice),
        };
      }
    });

    return Object.values(compiled);
  };

  const compileFormData = (forms) => {
    const compiled = {};
  
    forms.forEach((form) => {
      const row =
        form.source === "Labor"
          ? recalcLaborGenerateCustomerLine(form)
          : form;
      const persisted = toPersistedCopy(row);
      const {
        reference,
        measure,
        quantity,
        price,
        totalPrice,
        type,
        cost,
        markUp,
        markup
      } = persisted;
  
      // 🔥 NORMALIZE MARKUP
      const finalMarkUp =
        markUp !== undefined && markUp !== null && markUp !== ""
          ? Number(markUp)
          : Number(markup) || 0;
  
      const finalCost = Number(cost) || 0;
  
      const key = `${type}-${reference}`;
  
      if (compiled[key]) {
        compiled[key].quantity += Number(quantity) || 0;
        compiled[key].totalPrice += Number(totalPrice) || 0;
      } else {
        compiled[key] = {
          ...persisted,
          quantity: Number(quantity) || 0,
          totalPrice: Number(totalPrice) || 0,
          cost: finalCost,
          markUp: finalMarkUp,   // ✅ only ONE key going forward
        };
      }
    });
  
    return Object.values(compiled);
  };

  /** Green Generate Customer Copy only — keep F&G vs Other rows separate. */
  const compileFormDataPreserveSource = (forms) => {
    const compiled = {};

    forms.forEach((form) => {
      const row =
        form.source === "Labor"
          ? recalcLaborGenerateCustomerLine(form)
          : form;
      const persisted = toPersistedCopy(row);
      const {
        reference,
        quantity,
        totalPrice,
        type,
        cost,
        markUp,
        markup,
        source,
      } = persisted;

      const finalMarkUp =
        markUp !== undefined && markUp !== null && markUp !== ""
          ? Number(markUp)
          : Number(markup) || 0;

      const finalCost = Number(cost) || 0;
      const key = `${source}-${type}-${reference}`;

      if (compiled[key]) {
        compiled[key].quantity += Number(quantity) || 0;
        compiled[key].totalPrice += Number(totalPrice) || 0;
      } else {
        compiled[key] = {
          ...persisted,
          quantity: Number(quantity) || 0,
          totalPrice: Number(totalPrice) || 0,
          cost: finalCost,
          markUp: finalMarkUp,
        };
      }
    });

    return Object.values(compiled);
  };
  //   const groupedData = compiledData.reduce((acc, item) => {
  //     const { type, ...copyData } = item;

  //     // Find the existing jobType group in the accumulator (array)
  //     const existingGroup = acc.find((group) => group.jobType === type);

  //     // Find the labor data for this jobType
  //     const laborInfo = laborData.find((labor) => labor.jobType === type);

  //     // Get labor cost and taxable status, default to 0 and false if not found
  //     const totalCost = laborInfo ? laborInfo.totalPrice : 0;
  //     const isLaborTaxable = laborInfo ? laborInfo.isLaborTaxable : false;

  //     if (existingGroup) {
  //       // Add the current item's totalLaborCost to the jobType level totalLaborCost
  //       existingGroup.totalCost = totalCost;

  //       // If any labor data under the same jobType is taxable, mark jobType as taxable
  //       if (isLaborTaxable) {
  //         existingGroup.isLaborTaxable = true;
  //       }

  //       // Push the copy (other details) into the copies array under the same jobType
  //       existingGroup.copies.push({
  //         ...copyData,
  //         type,
  //       });
  //     } else {
  //       // If the jobType does not exist in the array, create a new entry
  //       acc.push({
  //         jobType: type, // Set the jobType
  //         totalCost: totalCost, // Initialize totalLaborCost
  //         isLaborTaxable: isLaborTaxable, // Set isLaborTaxable
  //         copies: [{ ...copyData, type }], // Initialize the copies array with the first copy
  //       });
  //     }

  //     return acc;
  //   }, []); // Start with an empty array to accumulate the groups

  //   return groupedData;
  // };

  const groupByType = (compiledData, laborData) => {
    const groupedData = compiledData.reduce((acc, item) => {
      const { type, ...copyData } = item;

      // Find the existing group in the accumulator by jobType
      let existingGroup = acc.find((group) => group.jobType === type);

      // Find the corresponding labor information for the current type
      const laborInfo = laborData.find((labor) => labor.jobType === type);

      // Get labor cost and taxable status, default to 0 and false if not found
      const laborCost = laborInfo ? laborInfo.totalPrice : 0;
      const isLaborTaxable = laborInfo ? laborInfo.isLaborTaxable : false;

      if (existingGroup) {
        // Set the labor cost only once, not for every copy
        if (existingGroup.totalCost === 0) {
          existingGroup.totalCost = laborCost;
        }

        // If any labor is taxable, set the group as taxable
        if (isLaborTaxable) {
          existingGroup.isLaborTaxable = true;
        }

        // Add the current item's details to the copies array
        existingGroup.copies.push({ ...copyData, type });
      } else {
        // Create a new entry if the jobType does not exist in the accumulator
        acc.push({
          jobType: type,
          totalCost: laborCost, // Set the labor cost once
          isLaborTaxable: isLaborTaxable,
          copies: [{ ...copyData, type }],
        });
      }

      return acc;
    }, []); // Start with an empty array to accumulate the groups

    // Add any labor data that doesn't exist in compiledData
    laborData.forEach((labor) => {
      const { jobType, totalPrice, isLaborTaxable } = labor;

      // Check if this labor jobType already exists in groupedData
      if (!groupedData.find((group) => group.jobType === jobType)) {
        groupedData.push({
          jobType,
          totalCost: totalPrice,
          isLaborTaxable,
          copies: [], // No corresponding compiledData, so copies are empty
        });
      }
    });

    return groupedData;
  };

  // const groupByType = (compiledData, laborData) => {
  //   const groupedData = compiledData.reduce((acc, item) => {
  //     const { type, ...copyData } = item;

  //     // Find the existing group in the accumulator by jobType
  //     let existingGroup = acc.find((group) => group.jobType === type);

  //     // Find the corresponding labor information for the current type
  //     const laborInfo = laborData.find((labor) => labor.jobType === type);

  //     // Get labor cost and taxable status, default to 0 and false if not found
  //     const laborCost = laborInfo ? laborInfo.totalPrice : 0;
  //     const isLaborTaxable = laborInfo ? laborInfo.isLaborTaxable : false;

  //     if (existingGroup) {
  //       // Update the totalCost by adding labor cost (if available)
  //       existingGroup.totalCost += laborCost;

  //       // If any labor is taxable, set the group as taxable
  //       if (isLaborTaxable) {
  //         existingGroup.isLaborTaxable = true;
  //       }

  //       // Add the current item's details to the copies array
  //       existingGroup.copies.push({ ...copyData, type });
  //     } else {
  //       // Create a new entry if the jobType does not exist in the accumulator
  //       acc.push({
  //         jobType: type,
  //         totalCost: laborCost,
  //         isLaborTaxable: isLaborTaxable,
  //         copies: [{ ...copyData, type }],
  //       });
  //     }

  //     return acc;
  //   }, []); // Start with an empty array to accumulate the groups

  //   // Add any labor data that doesn't exist in compiledData
  //   laborData.forEach((labor) => {
  //     const { jobType, totalPrice, isLaborTaxable } = labor;

  //     // Check if this labor jobType already exists in groupedData
  //     if (!groupedData.find((group) => group.jobType === jobType)) {
  //       groupedData.push({
  //         jobType,
  //         totalCost: totalPrice,
  //         isLaborTaxable,
  //         copies: [], // No corresponding compiledData, so copies are empty
  //       });
  //     }
  //   });

  //   return groupedData;
  // };

  const getJobTypeById = async () => {
    try {
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      if (!formData.jobType) {
        return;
      }
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/project/get-job-type/${formData.jobType}`,
        { headers: headers }
      );
      if (response.data.statusCode === 200) {
        setJobType(response.data.result.jobName);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response.message);
    }
  };

  // const handleInputChange = (e, index) => {
  //   const { name, value } = e.target;
  //   const updatedForms = [...forms];

  //   if (name === "source") {
  //     updatedForms[index] = {
  //       ...updatedForms[index],
  //       [name]: value,
  //       type: value.includes("Lump Sum") ? value : "",
  //       reference: "",
  //       measure: "",
  //       quantity: "",
  //       price: "",
  //       totalPrice: "",
  //       isTaxable: true,
  //     };
  //   }

  //   if (name === "type") {
  //     updatedForms[index] = {
  //       ...updatedForms[index],
  //       [name]: value,
  //       reference: "",
  //       measure: "",
  //       quantity: "",
  //       price: "",
  //       totalPrice: "",
  //       isTaxable: value === "Equipment Fees" ? false : true,
  //     };
  //   }

  //   const updatedForm = { ...updatedForms[index], [name]: value };

  //   // if(name === "vendorName"){
  //   //   if(containsNumberOrSpecialChar(e.target.value)){
  //   //     toast.error("Vendor name cannot contain numbers or special characters.");
  //   //     return;
  //   //   }
  //   // }

  //   // if(name === "reference"){
  //   //   if(containsNumberOrSpecialChar(e.target.value)){
  //   //     toast.error("Material name cannot contain numbers or special characters.");
  //   //     return;
  //   //   }
  //   // }

  //   // if(name === "measure"){
  //   //   if(containsNumberOrSpecialChar(e.target.value)){
  //   //     toast.error("Measure cannot contain numbers or special characters.");
  //   //     return;
  //   //   }
  //   // }

  //   // Calculate total price if both price and quantity are filled
  //   if (name === "price" || name === "quantity") {
  //     const price = parseFloat(updatedForm.price) || 0;
  //     const quantity = parseFloat(updatedForm.quantity) || 0;
  //     if (updatedForm.source === "Other") {
  //       updatedForm.totalCost = price && quantity ? price * quantity : "";
  //       const isTax = updatedForm.isTaxable === "true" || updatedForm.isTaxable === true ? true : false;
  //       const markup = parseFloat(updatedForm.markup) || 0;

  //       if (false) {
  //         const intermediatePrice =
  //           updatedForm.totalCost + (markup * updatedForm.totalCost) / 100;
  //         updatedForm.totalPrice =
  //           intermediatePrice + (adminTax * intermediatePrice) / 100;
  //       } else {
  //         updatedForm.totalPrice =
  //           updatedForm.totalCost +
  //           (updatedForm.markup * updatedForm.totalCost) / 100;
  //       }
  //     } else {
  //       updatedForm.totalPrice = price && quantity ? price * quantity : "";
  //       updatedForm.totalCost = price && quantity ? price * quantity : "";
  //     }
  //   }

  //   if (name === "markup") {
  //     const isTax = updatedForm.isTaxable === "true" || updatedForm.isTaxable === true ? true : false;
  //     const markup = parseFloat(updatedForm.markup) || 0;
  //     if (false) {
  //       const intermediatePrice =
  //         updatedForm.totalCost + (markup * updatedForm.totalCost) / 100;
  //       updatedForm.totalPrice =
  //         intermediatePrice + (adminTax * intermediatePrice) / 100;
  //     } else {
  //       updatedForm.totalPrice =
  //         updatedForm.totalCost + (markup * updatedForm.totalCost) / 100;
  //     }
  //   }

  //   if (name === "isTaxable") {
  //     const isTax = updatedForm.isTaxable === "true" || updatedForm.isTaxable === true ? true : false;
  //     const markup = parseFloat(updatedForm.markup) || 0;

  //     if (false) {
  //       const intermediatePrice =
  //         updatedForm.totalCost + (markup * updatedForm.totalCost) / 100;
  //       updatedForm.totalPrice =
  //         intermediatePrice + (adminTax * intermediatePrice) / 100;
  //     } else {
  //       const intermediatePrice =
  //         updatedForm.totalCost + (markup * updatedForm.totalCost) / 100;
  //       updatedForm.totalPrice =
  //         intermediatePrice + (0 * intermediatePrice) / 100;
  //     }
  //     updatedForm.isTaxable = updatedForm.isTaxable === "true" || updatedForm.isTaxable === true ? true : false;
  //   }

  //   updatedForms[index] = updatedForm;
  //   setForms(updatedForms);
  // };

  const handleInputChange = (e, index) => {
    const { name, value } = e.target;
    const updatedForms = [...forms];

    if (name === "source") {
      const fgDefaultMarkup = 100;
      updatedForms[index] = {
        ...updatedForms[index],
        [name]: value,
        type: value.includes("Lump Sum") ? value : "",
        reference: "",
        referenceBase: "",
        measure: "",
        quantity: "",
        cost: "",
        markup:
          value === "F&G"
            ? fgDefaultMarkup
            : updatedForms[index].markup ?? updatedForms[index].markUp ?? 0,
        markUp:
          value === "F&G"
            ? fgDefaultMarkup
            : updatedForms[index].markUp ?? updatedForms[index].markup ?? 0,
        price: "",
        totalPrice: "",
        isTaxable: true,
      };
    }

    if (name === "type") {
      updatedForms[index] = {
        ...updatedForms[index],
        [name]: value,
        reference: "",
        referenceBase: "",
        measure: "",
        quantity: "",
        price: "",
        cost: "",
        markup: updatedForms[index].markup ?? updatedForms[index].markUp ?? 0,
        totalPrice: "",
        isTaxable: value === "Equipment Fees" ? false : true,
      };
    }

    const updatedForm = { ...updatedForms[index], [name]: value };

    if (updatedForm.source === "F&G" && name === "cost") {
      updatedForm.cost = normalizeFgEditableUnitValue(value);
    }
    if (updatedForm.source === "F&G" && name === "price") {
      updatedForm.price = normalizeFgEditableUnitValue(value);
    }

    // Lump Sum: cost + markup → totalPrice; edit totalPrice → markup adjusts
    if (updatedForm.source === "Lump Sum") {
      const cost = parseFloat(updatedForm.cost) || 0;
      updatedForm.totalCost = cost;

      if (name === "cost") {
        if (value === "" || value === null || value === undefined) {
          updatedForm.totalPrice = "";
        } else {
          const c = parseFloat(value);
          if (!Number.isNaN(c) && c >= 0) {
            const markupPct =
              parseFloat(updatedForm.markUp ?? updatedForm.markup) || 0;
            updatedForm.totalCost = c;
            updatedForm.totalPrice =
              c > 0
                ? Math.round((c + (c * markupPct) / 100) * 100) / 100
                : "";
          }
        }
      } else if (name === "totalPrice") {
        if (value === "" || value === null || value === undefined) {
          updatedForm.cost = "";
          updatedForm.totalCost = "";
        } else {
          const tp = parseFloat(value);
          if (!Number.isNaN(tp) && tp >= 0) {
            const c = parseFloat(updatedForm.cost) || 0;
            if (c > 0) {
              const markup = tp > 0 ? ((tp - c) / c) * 100 : 0;
              updatedForm.markup = Math.round(markup * 100) / 100;
              updatedForm.markUp = updatedForm.markup;
            } else if (tp > 0) {
              const markupPct =
                parseFloat(updatedForm.markUp ?? updatedForm.markup);
              const useMarkup =
                Number.isFinite(markupPct) && markupPct >= 0
                  ? markupPct
                  : 100;
              const derivedCost =
                Math.round((tp / (1 + useMarkup / 100)) * 10000) / 10000;
              updatedForm.cost = derivedCost;
              updatedForm.totalCost = derivedCost;
              updatedForm.markup = useMarkup;
              updatedForm.markUp = useMarkup;
            }
          }
        }
      }
    } else if (updatedForm.source === "Labor") {
      Object.assign(
        updatedForm,
        recalcLaborGenerateCustomerLine(updatedForm)
      );
    }

    if (name === "cost" && updatedForm.source === "Other") {
      Object.assign(
        updatedForm,
        recalcOtherFieldCopyLine(updatedForm, "cost")
      );
    }

    // Calculate total price if both price and quantity are filled
    if (name === "price" || name === "quantity") {
      const price = parseFloat(updatedForm.price) || 0;
      const quantity = parseFloat(updatedForm.quantity) || 0;

      if (updatedForm.source === "Other") {
        Object.assign(
          updatedForm,
          recalcOtherFieldCopyLine(
            updatedForm,
            name === "quantity" ? "preserve" : "price"
          )
        );
      } else if (updatedForm.source === "F&G") {
        if (name === "price") {
          Object.assign(updatedForm, syncFgCostPriceOnUserEdit(updatedForm, "price"));
        } else {
          Object.assign(updatedForm, recalcFgFieldCopyLineTotals(updatedForm));
        }
      } else {
        updatedForm.totalPrice = price && quantity ? price * quantity : "";
        updatedForm.totalCost = price && quantity ? price * quantity : "";
      }
    }

    // Autofill markup when cost changes (F&G only) - cost/price se markup auto calculate
    if (name === "cost" && updatedForm.source === "F&G") {
      Object.assign(updatedForm, syncFgCostPriceOnUserEdit(updatedForm, "cost"));
    }

    if (name === "markup" || name === "markUp") {
      const markupVal = parseFloat(updatedForm.markUp ?? updatedForm.markup) || 0;
      updatedForm.markup = markupVal;
      updatedForm.markUp = markupVal;

      if (updatedForm.source === "Other") {
        Object.assign(
          updatedForm,
          recalcOtherFieldCopyLine(updatedForm, "preserve")
        );
      } else if (updatedForm.source === "Labor") {
        Object.assign(
          updatedForm,
          recalcLaborGenerateCustomerLine(updatedForm)
        );
      } else if (updatedForm.source === "Lump Sum") {
        const cost = parseFloat(updatedForm.cost) || 0;
        updatedForm.totalCost = cost;
        updatedForm.totalPrice =
          cost > 0
            ? Math.round((cost + (cost * markupVal) / 100) * 100) / 100
            : "";
      } else if (false) {
        const intermediatePrice =
          updatedForm.totalCost + (markupVal * updatedForm.totalCost) / 100;
        updatedForm.totalPrice =
          intermediatePrice + (adminTax * intermediatePrice) / 100;
      } else {
        updatedForm.totalPrice =
          updatedForm.totalCost +
          (markupVal * updatedForm.totalCost) / 100;
      }
    }

    if (name === "isTaxable") {
      if (updatedForm.source === "Other") {
        Object.assign(
          updatedForm,
          recalcOtherFieldCopyLine(updatedForm, "preserve")
        );
      } else if (updatedForm.source === "Labor") {
        Object.assign(
          updatedForm,
          recalcLaborGenerateCustomerLine(updatedForm)
        );
      } else {
        const markup = parseFloat(updatedForm.markup) || 0;
        const intermediatePrice =
          updatedForm.totalCost + (markup * updatedForm.totalCost) / 100;
        updatedForm.totalPrice = intermediatePrice;
      }

      updatedForm.isTaxable =
        updatedForm.isTaxable === "true" || updatedForm.isTaxable === true
          ? true
          : false;
    }

    if (name === "reference") {
      updatedForm.referenceBase = value;
    }

    updatedForms[index] = applyReferenceVendorToForm(updatedForm);
    setForms(updatedForms);
  };

  const handleMaterialChange = (e, index) => {
    const materialName = e;
    // const materialName = e.target.value;
    const material = materials.find(
      (material) => material.name === materialName
    );
    const updatedForms = [...forms];
    const rawMatMarkup = material.markUp;
    const numMarkup = Number.parseFloat(rawMatMarkup);
    const resolvedMarkup =
      rawMatMarkup === null ||
      rawMatMarkup === undefined ||
      rawMatMarkup === "" ||
      Number.isNaN(numMarkup) ||
      numMarkup === 0
        ? 100
        : numMarkup;

    let row = {
      ...updatedForms[index],
      referenceBase: material.name,
      reference: material.name,
      measure: material.measure,
      price: material.price,
      cost: material.cost,
      markUp: resolvedMarkup,
      markup: resolvedMarkup,
      isTaxable: material.isTaxable,
      totalPrice:
        Number.parseFloat(material.price) *
        Number.parseFloat(forms[index].quantity),
    };
    if (updatedForms[index].source === "F&G") {
      row = ensureFgCostFromPrice(row);
      const qty = Number.parseFloat(forms[index].quantity) || 0;
      const unitPrice = Number.parseFloat(row.price) || 0;
      const unitCost = Number.parseFloat(row.cost) || 0;
      if (qty > 0) {
        row.totalPrice = unitPrice > 0 ? unitPrice * qty : row.totalPrice;
        row.totalCost = unitCost > 0 ? unitCost * qty : "";
      }
      if (unitCost > 0 && unitPrice > 0) {
        row.markup = Math.round(((unitPrice - unitCost) / unitCost) * 10000) / 100;
        row.markUp = row.markup;
      }
    }
    updatedForms[index] = applyReferenceVendorToForm(row);
    setForms(updatedForms);
  };

  function containsNumberOrSpecialChar(text) {
    // Regular expression to check for numbers (0-9) or special characters
    const regex = /[0-9!@#$%^&*(),.?":{}|<>]/;

    // Test the text against the regex
    return regex.test(text);
  }

  const deleteForm = (index) => {
    const updatedForms = forms.filter((_, i) => i !== index);
    setForms(updatedForms);
  };

  const addForm = () => {
    setForms([
      ...forms,
      {
        source: "F&G",
        type: "",
        vendorName: "",
        referenceBase: "",
        markup: 100,
        markUp: 100,
        reference: "",
        measure: "",
        quantity: "",
        price: "",
        PO: "",
        invoice: "",
        totalPrice: "",
        isTaxable: "",
      },
    ]);
  };

  const getTaxPercentage = async () => {
    try {
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/staff/get-tax-percent`,
        { headers: headers }
      );
      if (response.data.statusCode === 200) {
        setAdminTax(response.data.result.taxPercent);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response.message);
    }
  };

  // Function to handle price updates
  const handlePriceChange = (jobType, value) => {
    const updatedLaborData = laborData.map((labor) => {
      if (labor.jobType === jobType) {
        return { ...labor, totalPrice: parseFloat(value) || 0 }; // Ensure a number
      }
      return labor;
    });
    setLaborData(updatedLaborData);
  };

  const getJobTypes = async () => {
    try {
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/admin/get-job-types-dpd`,
        { headers: headers }
      );

      if (response.data.statusCode === 200) {
        setJobTypes(response.data.result);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.log("Error", error);
    }
  };

  const getMaterials = async () => {
    try {
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/project/get-materials-dpd`,
        { headers: headers }
      );

      if (response.data.statusCode === 200) {
        setMaterials(response.data.result);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.log("Error", error);
    }
  };

  const getFGAddress = async () => {
    try {
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/admin/get-fg-address`,
        { headers: headers }
      );
      if (response.data.statusCode === 200) {
        setAddress(response.data.result);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response.message);
    }
  };

  function formatDate(dateString) {
    dateString = Number.parseInt(dateString);
    const options = { day: "2-digit", month: "long", year: "numeric" };
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", options); // Use 'en-GB' to get the desired format
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    await runGenerateCustomerCopy(forms, compileFormDataPreserveSource);
  };

  const runGenerateCustomerCopy = async (
    sourceForms,
    compileFn = compileFormData
  ) => {
    const updatedForms = compileFn(sourceForms);
    const groupedForms = groupByType(updatedForms, laborData);
    try {
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
      };
      setDisableBtn(true);

      const formdata = new FormData();

      if (groupedForms.length === 0) {
        toast.error("Please add some data.");
        return false;
      }

      formdata.append("forms", JSON.stringify(groupedForms));

      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/project/generate-customer-copy/${id}`,
        formdata,
        {
          headers: headers,
        }
      );

      if (response.data.statusCode === 201) {
        toast.success(response.data.message);
        navigate(-1);
        return true;
      } else {
        toast.error(response.data.message);
        return false;
      }
    } catch (error) {
      toast.error(error.response.message);
      return false;
    } finally {
      setDisableBtn(false);
    }
  };

  const [dropdownVisibility, setDropdownVisibility] = useState(
    forms.map(() => false) // Initialize visibility for each form
  );
  const [searchTerm, setSearchTerm] = useState(""); // Track search term for filtering
  const dropdownRefs = useRef([]);

  const toggleDropdownVisibility = (index) => {
    const updatedVisibility = [...dropdownVisibility];

    // Reset all dropdowns to false except the one being toggled
    updatedVisibility.forEach((_, i) => {
      if (i !== index) updatedVisibility[i] = false;
    });

    // Toggle the current dropdown
    updatedVisibility[index] = !updatedVisibility[index];

    setDropdownVisibility(updatedVisibility);

    // Reset search term when opening a new dropdown
    if (updatedVisibility[index]) {
      setSearchTerm("");
    }
  };

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (showSalesOrderPreview) return;
      // Check if the clicked element is not inside any of the dropdowns
      if (
        dropdownRefs.current.every((ref) => ref && !ref.contains(event.target))
      ) {
        setDropdownVisibility(forms.map(() => false)); // Close all dropdowns
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [forms, showSalesOrderPreview]);

  // Handle search term change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleGenerateMergeCopy = async (previewMaterialRows) => {
    const mergedForms = replaceMaterialRowsInForms(forms, previewMaterialRows);
    const ok = await runGenerateCustomerCopy(mergedForms);
    if (ok) {
      setShowSalesOrderPreview(false);
    }
  };

  return (
    <Layout>
      <ToastContainer />
      <div
        className={`${tableSize === 250 ? "md:ml-[250px]" : "md:ml-[90px]"}`}
      >
        <div className="lg:p-10 p-3">
          <div className="card">
            <div className="card-header bg-[#00613e] text-white">
              <h3 className="card-title"><button
                onClick={() => {
                  navigate(-1);
                }}
              >
                <i className="fa fa-arrow-left mr-2"></i>
              </button>{" "}Generate Customer Copy </h3>
            </div>
            <div className="mt-6 p-6 " id="">
              <div className="flex flex-col md:flex-row gap-6 justify-around">
                <div className="flex flex-col w-[300px]">
                  <div className="p-2">
                    <h6 className="font-bold text-[17px]">Date</h6>
                    <p>
                      {formData?.projectStartDate
                        ? formatDate(formData.projectStartDate)
                        : ""}
                    </p>
                  </div>
                  <div className="p-2">
                    <h6 className="font-bold text-[17px]">Customer Name</h6>
                    <p className=" break-words">{formData?.customerName}</p>
                  </div>
                  {formData && formData.jobAddress && (
                    <div className="p-2">
                      <h6 className="font-bold text-[17px]">Job Address</h6>
                      <p className=" break-words">{formData?.jobAddress}</p>
                    </div>
                  )}
                  {formData && formData.customerEmail && (
                    <div className="p-2">
                      <h6 className="font-bold text-[17px]">Email</h6>
                      <p className=" break-words">{formData?.customerEmail}</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col w-[300px]">
                  <div className="p-2">
                    <h6 className="font-bold text-[17px]">Project Code</h6>
                    <p className=" break-words">{formData.projectCode}</p>
                  </div>
                  <div className="p-2">
                    <h6 className="font-bold text-[17px]">Job Type</h6>
                    <p className=" break-words">{jobType}</p>
                  </div>
                  {
                    formData.description && <div className="p-2">
                      <h6 className="font-bold text-[17px]">
                        Description of work
                      </h6>
                      <p className=" break-words">
                        {parse(formData.description)}
                      </p>
                    </div>
                  }

                </div>
                <div className="flex flex-col w-[300px]">
                  <div className="p-2">
                    <h6 className="font-bold text-[17px]">F&G INC</h6>
                    <pre
                      className="text-base break-words p-0 pb-3"
                      style={{ fontFamily: "Source Sans Pro" }}
                    >
                      {address}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-10">
              <form onSubmit={handleSubmit}>
                <div className="card-body">
                  {forms.map((formData, index) => (
                    <div
                      key={index}
                      className="flex gap-x-16 justify-start flex-wrap mb-4 p-6 pt-8 shadow-md relative"
                    >
                      <div className="form-group flex flex-col">
                        <label htmlFor={`source-${index}`}>Source *</label>
                        <select
                          name="source"
                          onChange={(e) => handleInputChange(e, index)}
                          id={`source-${index}`}
                          className="border-b border-[grey] outline-none w-[180px]"
                          value={formData.source}
                          required
                        >
                          {/* <option value="">Select Source</option> */}
                          <option value="F&G">F&G</option>
                          <option value="Other">Other</option>
                          <option value="Lump Sum">Lump Sum</option>
                          <option value="Labor">Labor</option>
                          {/* <option value="Drainage Lump Sum">Drainage Lump Sum</option>
                        <option value="Electrical Lump Sum">Electrical Lump Sum</option>
                        <option value="Hardscape Lump Sum">Hardscape Lump Sum</option>
                        <option value="Irrigation Lump Sum">Irrigation Lump Sum</option>
                        <option value="Landscape Lump Sum">Landscape Lump Sum</option>
                        <option value="Mosquito Lump Sum">Mosquito Lump Sum</option>
                        <option value="Plumbing Lump Sum">Plumbing Lump Sum</option>
                        <option value="Pool Lump Sum">Pool Lump Sum</option> */}
                        </select>
                      </div>

                      {formData.source === "F&G" && (
                        <>
                          <div className="form-group flex flex-col">
                            <label htmlFor={`type-${index}`}>
                              Material Type *
                            </label>
                            <select
                              name="type"
                              onChange={(e) => handleInputChange(e, index)}
                              id={`type-${index}`}
                              className="border-b border-[grey] outline-none w-[180px]"
                              value={formData.type}
                              required
                            // disabled
                            >
                              <option value="">Select</option>
                              {jobTypes
                                .filter((item) => {
                                  return (
                                    item.status === "Active" ||
                                    item.jobName === formData.initialJobType
                                  );
                                })
                                .map((item, index) => (
                                  <option
                                    key={index}
                                    value={item.jobName}
                                    className={
                                      item.status === "Delete"
                                        ? "text-[red]"
                                        : "text-[black]"
                                    }
                                  >
                                    {item.jobName}
                                  </option>
                                ))}
                            </select>
                          </div>
                          {/* <div className="form-group flex flex-col w-[180px]">
                            <label htmlFor={`reference-${index}`}>
                              Material Name
                            </label>
                            <select
                              name="reference"
                              onChange={(e) => handleMaterialChange(e, index)}
                              id={`reference-${index}`}
                              className="border-b border-[grey] outline-none"
                              value={getMaterialNameInputValue(formData)}
                              required
                            >
                              <option value="">Select One</option>
                              {materials
                                .filter((item) => {
                                  return (
                                    item.status === "Active" ||
                                    item.name === formData.intialReference
                                  );
                                })
                                .map((material) => (
                                  <option
                                    key={material?._id}
                                    value={material.name}
                                    className={
                                      material.status === "Delete"
                                        ? "text-[red]"
                                        : "text-[black]"
                                    }
                                  >
                                    {material.name}
                                  </option>
                                ))}
                            </select>
                          </div> */}
                          <div
                            className="form-group flex flex-col w-[180px] relative cursor-pointer"
                            key={index}
                            ref={(el) => (dropdownRefs.current[index] = el)} // Assign ref to each dropdown
                          >
                            <label htmlFor={`reference-${index}`}>
                              Material Name *
                            </label>
                            <div className="relative cursor-pointer">
                              <div
                                className=""
                                onClick={() => toggleDropdownVisibility(index)}
                              >
                                <input
                                  type="text"
                                  id={`materialName-${index}`}
                                  name={`materialName-${index}`}
                                  className="border-b border-[grey] outline-none w-[180px] pr-3 cursor-pointer"
                                  value={getMaterialNameInputValue(formData)}
                                  placeholder="Select Material Name"
                                  readOnly
                                  onClick={() =>
                                    toggleDropdownVisibility(index)
                                  } // Toggle dropdown
                                  required
                                />
                                <span className="absolute right-0 cursor-pointer">
                                  <i className="fa fa-caret-down"></i>
                                </span>
                              </div>

                              {dropdownVisibility[index] && (
                                <div className="h-[400px] w-[200px] scrollbar-content overflow-y-auto absolute top-[100%] bg-[white] shadow-md mt-1 z-10">
                                  {/* Search Input */}
                                  <input
                                    type="text"
                                    className="w-full px-2 py-1 border-b"
                                    placeholder="Search material..."
                                    value={searchTerm}
                                    onChange={handleSearchChange}
                                  />
                                  {/* Filtered and Searched Materials */}
                                  {materials
                                    .filter(
                                      (item) =>
                                        item.status === "Active" &&
                                        item.name
                                          .toLowerCase()
                                          .includes(searchTerm.toLowerCase())
                                    )
                                    .map((material) => (
                                      <div
                                        key={material?._id}
                                        onClick={() => {
                                          handleMaterialChange(
                                            material.name,
                                            index
                                          );
                                          toggleDropdownVisibility(index); // Close dropdown
                                        }}
                                        className="text-sm hover:bg-[#e3e3e3] cursor-pointer p-2"
                                      >
                                        {material.name}
                                      </div>
                                    ))}

                                  {/* No Results Found */}
                                  {materials.filter(
                                    (item) =>
                                      item.status === "Active" &&
                                      item.name
                                        .toLowerCase()
                                        .includes(searchTerm.toLowerCase())
                                  ).length === 0 && (
                                      <div className="p-2 text-gray-500 text-center text-sm">
                                        No materials found
                                      </div>
                                    )}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="form-group flex flex-col">
                            <label htmlFor={`cost-fg-edit-${index}`}>Cost *</label>
                            <input
                              type="number"
                              className="border-b border-[grey] outline-none w-[180px]"
                              id={`cost-fg-edit-${index}`}
                              name="cost"
                              onChange={(e) => handleInputChange(e, index)}
                              value={formData.cost}
                              placeholder="Enter Cost"
                              min={0}
                              max={10000000}
                              step="any"
                            />
                          </div>
                          <div className="form-group flex flex-col">
                            <label htmlFor={`measure-${index}`}>Markup *</label>
                            <input
                              type="text"
                              className="border-b border-[grey] outline-none"
                              id={`markup-fg-edit-${index}`}
                              name="markup"
                              onChange={(e) => handleInputChange(e, index)}
                              value={
                                formData.markup ?? formData.markUp ?? ""
                              }
                              placeholder="%"
                            />
                          </div>
                        </>
                      )}

                      {formData.source === "Other" && (
                        <>
                          <div className="form-group flex flex-col">
                            <label htmlFor={`type-${index}`}>
                              Material Type *
                            </label>
                            <select
                              name="type"
                              onChange={(e) => handleInputChange(e, index)}
                              id={`type-${index}`}
                              className="border-b border-[grey] outline-none w-[180px]"
                              value={formData.type}
                              required
                            // disabled
                            >
                              <option value="">Select</option>
                              {jobTypes
                                .filter((item) => {
                                  return (
                                    item.status === "Active" ||
                                    item.jobName === formData.initialJobType
                                  );
                                })
                                .map((item, index) => (
                                  <option
                                    key={index}
                                    value={item.jobName}
                                    className={
                                      item.status === "Delete"
                                        ? "text-[red]"
                                        : "text-[black]"
                                    }
                                  >
                                    {item.jobName}
                                  </option>
                                ))}
                            </select>
                          </div>
                          <div className="form-group flex flex-col w-[180px]">
                            <label htmlFor={`vendorName-${index}`}>
                              Vendor Name
                            </label>
                            <input
                              type="text"
                              className="border-b border-[grey] outline-none"
                              id={`vendorName-${index}`}
                              name="vendorName"
                              onChange={(e) => handleInputChange(e, index)}
                              value={formData.vendorName}
                              placeholder="Enter Vendor Name"
                            // required
                            />
                          </div>
                          <div className="form-group flex flex-col w-[180px]">
                            <label htmlFor={`reference-${index}`}>
                              Material Name *
                            </label>
                            <input
                              type="text"
                              className="border-b border-[grey] outline-none"
                              id={`reference-${index}`}
                              name="reference"
                              onChange={(e) => handleInputChange(e, index)}
                              value={getMaterialNameInputValue(formData)}
                              placeholder="Enter Name"
                              maxLength={100}
                              required
                            />
                          </div>
                        </>
                      )}

                      {formData.source === "Labor" && (
                        <>
                          <div className="form-group flex flex-col">
                            <label htmlFor={`type-${index}`}>Job Type *</label>
                            <select
                              name="type"
                              onChange={(e) => handleInputChange(e, index)}
                              id={`type-${index}`}
                              className="border-b border-[grey] outline-none w-[180px]"
                              value={formData.type}
                              required
                            // disabled
                            >
                              <option value="">Select</option>
                              {/* <option value={fieldJobType}>{fieldJobType}</option> */}
                              {jobTypes
                                .filter((item) => {
                                  return item.status === "Active";
                                })
                                .map((item, index) => (
                                  <option key={index} value={item.jobName}>
                                    {item.jobName}
                                  </option>
                                ))}
                            </select>
                          </div>
                          <div className="form-group flex flex-col w-[180px]">
                            <label htmlFor={`vendorName-${index}`}>
                              Vendor Name
                            </label>
                            <input
                              type="text"
                              className="border-b border-[grey] outline-none"
                              id={`vendorName-${index}`}
                              name="vendorName"
                              onChange={(e) => handleInputChange(e, index)}
                              value={formData.vendorName}
                              placeholder="Enter Vendor Name"
                              maxLength={50}
                            // required
                            />
                          </div>
                          <div className="form-group flex flex-col w-[180px]">
                            <label htmlFor={`reference-${index}`}>
                              Description *
                            </label>
                            <input
                              type="text"
                              className="border-b border-[grey] outline-none"
                              id={`reference-${index}`}
                              name="reference"
                              onChange={(e) => handleInputChange(e, index)}
                              value={getMaterialNameInputValue(formData)}
                              maxLength={100}
                              placeholder="Enter Description"
                              required
                            />
                          </div>
                          <div className="form-group flex flex-col">
                            <label htmlFor={`source-${index}`}>Taxable *</label>
                            <select
                              name="isTaxable"
                              onChange={(e) => handleInputChange(e, index)}
                              id={`isTaxable-${index}`}
                              className="border-b border-[grey] outline-none w-[180px]"
                              value={formData.isTaxable}
                              required
                            >
                              <option value="">Select Option</option>
                              <option value="true">Yes</option>
                              <option value="false">No</option>
                            </select>
                          </div>
                          <div className="form-group flex flex-col">
                            <label htmlFor={`measure-${index}`}>Cost *</label>
                            <input
                              type="text"
                              className="border-b border-[grey] outline-none"
                              id={`measure-${index}`}
                              name="cost"
                              onChange={(e) => handleInputChange(e, index)}
                              value={formData.cost}
                              placeholder="Enter Cost "
                            // readOnly={
                            //   formData.source === "Other" ? false : true
                            // }
                            // required
                            />
                          </div>
                          <div className="form-group flex flex-col">
                            <label htmlFor={`measure-${index}`}>Markup *</label>
                            <input
                              type="text"
                              className="border-b border-[grey] outline-none"
                              id={`measure-${index}`}
                              name="markUp"
                              onChange={(e) => handleInputChange(e, index)}
                              value={formData.markUp}
                              placeholder="Enter markUp"
                            // readOnly={
                            //   formData.source === "Other" ? false : true
                            // }
                            // required
                            />
                          </div>
                        </>
                      )}

                      {formData.source.includes("Lump Sum") && (
                        <>
                          <div className="form-group flex flex-col hidden">
                            <label htmlFor={`type-${index}`}>
                              Material Type
                            </label>
                            <select
                              name="type"
                              id={`type-${index}`}
                              className="border-b border-[grey] outline-none w-[180px]"
                              value="Lump Sum"
                              required
                            >
                              <option value="">Select</option>
                              <option value="Lump Sum">
                                Lump Sum (Sales Tax Paid on Materials)
                              </option>
                            </select>
                          </div>
                          <div className="form-group flex flex-col">
                            <label htmlFor={`type-${index}`}>
                              Lump Sum Type
                            </label>
                            <select
                              name="type"
                              id={`type-${index}`}
                              className="border-b border-[grey] outline-none w-[180px]"
                              value={formData.type}
                              onChange={(e) => handleInputChange(e, index)}
                              required
                            >
                              <option value="">Select</option>
                              <option value="Lump Sum">Lump Sum (Sales Tax Paid on Materials)</option>
                              <option value="Drainage Lump Sum">
                                Drainage Lump Sum (Sales Tax Paid on Materials)
                              </option>
                              <option value="Electrical Lump Sum">
                                Electrical Lump Sum (Sales Tax Paid on
                                Materials)
                              </option>
                              <option value="Hardscape Lump Sum">
                                Hardscape Lump Sum (Sales Tax Paid on Materials)
                              </option>
                              <option value="Equipment Fees">
                                Equipment Fees (Rental, Heavy Haul, Etc.)
                              </option>
                              <option value="Irrigation Lump Sum">
                                Irrigation Lump Sum (Sales Tax Paid on
                                Materials)
                              </option>
                              <option value="Landscape Lump Sum">
                                Landscape Lump Sum (Sales Tax Paid on Materials)
                              </option>
                              <option value="Equipment Lump Sum">
                                Equipment Lump Sum (Sales Tax Paid on Materials)
                              </option>
                              <option value="Mosquito Lump Sum">
                                Mosquito Lump Sum (Sales Tax Paid on Materials)
                              </option>
                              <option value="Plumbing Lump Sum">
                                Plumbing Lump Sum (Sales Tax Paid on Materials)
                              </option>
                              <option value="Pool Lump Sum">
                                Pool Lump Sum (Sales Tax Paid on Materials)
                              </option>
                            </select>
                          </div>
                          <div className="form-group flex flex-col w-[180px]">
                            <label htmlFor={`vendorName-${index}`}>
                              Vendor Name
                            </label>
                            <input
                              type="text"
                              className="border-b border-[grey] outline-none"
                              id={`vendorName-${index}`}
                              name="vendorName"
                              onChange={(e) => handleInputChange(e, index)}
                              maxLength={50}
                              value={formData.vendorName}
                              placeholder="Enter Vendor Name"
                            // required
                            />
                          </div>
                          <div className="form-group flex flex-col w-[180px]">
                            <label htmlFor={`reference-${index}`}>
                              Description *
                            </label>
                            <input
                              type="text"
                              className="border-b border-[grey] outline-none"
                              id={`reference-${index}`}
                              name="reference"
                              onChange={(e) => handleInputChange(e, index)}
                              value={getMaterialNameInputValue(formData)}
                              maxLength={100}
                              placeholder="Enter Description"
                              required
                            />
                          </div>
                          <div className="form-group flex flex-col">
                            <label htmlFor={`source-${index}`}>Taxable *</label>
                            <select
                              name="isTaxable"
                              onChange={(e) => handleInputChange(e, index)}
                              id={`isTaxable-${index}`}
                              className="border-b border-[grey] outline-none w-[180px]"
                              value={formData.isTaxable}
                              required
                            >
                              <option value="">Select Option</option>
                              <option value="true">Yes</option>
                              <option value="false">No</option>
                            </select>
                          </div>
                          <div className="form-group flex flex-col">
                            <label htmlFor={`measure-${index}`}>Cost *</label>
                            <input
                              type="text"
                              className="border-b border-[grey] outline-none"
                              id={`measure-${index}`}
                              name="cost"
                              onChange={(e) => handleInputChange(e, index)}
                              value={formData.cost}
                              placeholder="Enter Cost "
                            // readOnly={
                            //   formData.source === "Other" ? false : true
                            // }
                            // required
                            />
                          </div>
                          <div className="form-group flex flex-col">
                            <label htmlFor={`measure-${index}`}>Markup *</label>
                            <input
                              type="text"
                              className="border-b border-[grey] outline-none"
                              id={`measure-${index}`}
                              name="markUp"
                              onChange={(e) => handleInputChange(e, index)}
                              value={formData.markUp}
                              placeholder="Enter markUp"
                            // readOnly={
                            //   formData.source === "Other" ? false : true
                            // }
                            // required
                            />
                          </div>
                        </>
                      )}

                      {formData.source === "F&G" && (
                        <>
                          <div className="form-group flex flex-col">
                            <label htmlFor={`measure-${index}`}>
                              Measure *
                            </label>
                            <input
                              type="text"
                              className="border-b border-[grey] outline-none"
                              id={`measure-${index}`}
                              name="measure"
                              onChange={(e) => handleInputChange(e, index)}
                              value={formData.measure}
                              placeholder="Enter measure"
                              readOnly={
                                formData.source === "Other" ? false : true
                              }
                              required
                            />
                          </div>

                          <div className="form-group flex flex-col">
                            <label htmlFor={`quantity-${index}`}>
                              Quantity *
                            </label>
                            <input
                              type="number"
                              className="border-b border-[grey] outline-none w-[180px]"
                              id={`quantity-${index}`}
                              name="quantity"
                              onChange={(e) => handleInputChange(e, index)}
                              onWheel={(e) => e.currentTarget.blur()}
                              value={formData.quantity}
                              placeholder="Enter Quantity"
                              min={0}
                              max={10000000}
                              step="any"
                              required
                            />
                          </div>

                          <div className="form-group flex flex-col">
                            <label htmlFor={`price-${index}`}>Price *</label>
                            <input
                              type="number"
                              className="border-b border-[grey] outline-none"
                              id={`price-${index}`}
                              name="price"
                              onChange={(e) => handleInputChange(e, index)}
                              value={formData.price}
                              placeholder="Enter Price"
                              min={0}
                              max={10000000}
                              step="any"
                              required
                            />
                          </div>
                        </>
                      )}

                      {formData.source === "Other" && (
                        <>
                          <div className="form-group flex flex-col">
                            <label htmlFor={`measure-${index}`}>
                              Measure *
                            </label>
                            <input
                              type="text"
                              className="border-b border-[grey] outline-none"
                              id={`measure-${index}`}
                              name="measure"
                              onChange={(e) => handleInputChange(e, index)}
                              value={formData.measure}
                              placeholder="Enter measure"
                              readOnly={false}
                              required
                            />
                          </div>

                          <div className="form-group flex flex-col">
                            <label htmlFor={`quantity-${index}`}>
                              Quantity *
                            </label>
                            <input
                              type="number"
                              className="border-b border-[grey] outline-none w-[180px]"
                              id={`quantity-${index}`}
                              name="quantity"
                              onChange={(e) => handleInputChange(e, index)}
                              value={formData.quantity}
                              placeholder="Enter Quantity"
                              min={0}
                              max={10000000}
                              step="any"
                              required
                            />
                          </div>
                        </>
                      )}

                      {formData.source === "Other" && (
                        <>
                          <div className="form-group flex flex-col">
                            <label htmlFor={`totalCost-${index}`}>
                              Cost *
                            </label>
                            <input
                              type="number"
                              className="border-b border-[grey] outline-none w-[180px]"
                              id={`cost-other-${index}`}
                              name="cost"
                              placeholder="Enter Cost"
                              onChange={(e) => handleInputChange(e, index)}
                              value={otherFieldCopyCostDisplayValue(formData.cost)}
                              min={0}
                              max={10000000}
                              step="any"
                              required
                            />
                          </div>
                          <div className="form-group flex flex-col">
                            <label htmlFor={`markup-${index}`}>Mark up</label>
                            <input
                              type="number"
                              className="border-b border-[grey] outline-none w-[180px]"
                              id={`markup-${index}`}
                              name="markup"
                              placeholder="Enter percent"
                              onChange={(e) => handleInputChange(e, index)}
                              value={formData?.markup}
                              min={0}
                              max={100}
                              required
                            />
                          </div>
                          <div className="form-group flex flex-col">
                            <label htmlFor={`price-${index}`}>Price *</label>
                            <input
                              type="number"
                              className="border-b border-[grey] outline-none"
                              id={`price-${index}`}
                              name="price"
                              onChange={(e) => handleInputChange(e, index)}
                              value={formData.price}
                              placeholder="Enter Price"
                              min={0}
                              max={10000000}
                              step="any"
                              required
                            />
                          </div>
                          <div className="form-group flex flex-col">
                            <label htmlFor={`totalPrice-other-customer-${index}`}>
                              Total Price *
                            </label>
                            <input
                              type="number"
                              className="border-b border-[grey] outline-none"
                              id={`totalPrice-other-customer-${index}`}
                              name="totalPrice"
                              placeholder="Total price goes here..."
                              value={formData.totalPrice}
                              readOnly
                              min={0}
                              step="any"
                            // required
                            />
                          </div>
                          <div className="form-group flex flex-col">
                            <label htmlFor={`source-${index}`}>Taxable</label>
                            <select
                              name="isTaxable"
                              onChange={(e) => handleInputChange(e, index)}
                              id={`isTaxable-${index}`}
                              className="border-b border-[grey] outline-none w-[180px]"
                              value={formData.isTaxable}
                              required
                            >
                              <option value="">Select Option</option>
                              <option value="true">Yes</option>
                              <option value="false">No</option>
                            </select>
                          </div>
                          <div className="form-group flex flex-col w-[180px]">
                            <label htmlFor={`invoice-${index}`}>Invoice</label>
                            <input
                              type="text"
                              className="border-b border-[grey] outline-none"
                              id={`invoice-${index}`}
                              name="invoice"
                              onChange={(e) => handleInputChange(e, index)}
                              value={formData.invoice}
                              placeholder="Enter invoice"
                            // required
                            />
                          </div>
                          <div className="form-group flex flex-col w-[180px]">
                            <label htmlFor={`PO-${index}`}>P.O.</label>
                            <input
                              type="text"
                              className="border-b border-[grey] outline-none"
                              id={`PO-${index}`}
                              name="PO"
                              onChange={(e) => handleInputChange(e, index)}
                              value={formData.PO}
                              placeholder="Enter PO"
                            // required
                            />
                          </div>
                        </>
                      )}

                      {formData.source === "F&G" ? (
                        <div className="form-group flex flex-col">
                          <label htmlFor={`totalPrice-${index}`}>
                            Total Price *
                          </label>
                          <input
                            type="number"
                            className="border-b border-[grey] outline-none"
                            id={`totalPrice-${index}`}
                            name="totalPrice"
                            placeholder="Total price goes here..."
                            value={formData.totalPrice}
                            readOnly
                            min={0}
                            step="any"
                          // required
                          />
                        </div>
                      ) : formData.source === "Other" ? null : (
                        <div className="form-group flex flex-col">
                          <label htmlFor={`totalPrice-${index}`}>
                            Total Price *
                          </label>
                          <input
                            type="number"
                            className="border-b border-[grey] outline-none"
                            id={`totalPrice-${index}`}
                            name="totalPrice"
                            placeholder="Enter total price"
                            value={formData.totalPrice}
                            max={10000000}
                            step="any"
                            readOnly={formData.source === "Labor"}
                            onChange={(e) => handleInputChange(e, index)}
                            min={0}
                          // required
                          />
                        </div>
                      )}

                      {/* <div className="form-group flex flex-col">
                        <label htmlFor={`totalPrice-${index}`}>
                          Total Price
                        </label>
                        <input
                          type="number"
                          className="border-b border-[grey] outline-none"
                          id={`totalPrice-${index}`}
                          name="totalPrice"
                          placeholder="Total price goes here..."
                          value={formData.totalPrice}
                          readOnly
                          min={0}
                          required
                        />
                      </div> */}

                      {formData.reference && formData.source === "F&G" && (
                        <div className="form-group flex flex-col">
                          <label htmlFor={`isTaxable-${index}`}>Taxable</label>
                          <input
                            type="text"
                            className="border-b border-[grey] outline-none"
                            id={`isTaxable-${index}`}
                            name="isTaxable"
                            onChange={(e) => handleInputChange(e, index)}
                            value={formData.isTaxable ? "Yes" : "No"}
                            placeholder="Enter isTaxable"
                            disabled={true}
                          />
                        </div>
                      )}

                      <button
                        type="button"
                        className="absolute top-3 right-5 bg-red-500 h-[30px] w-[30px] rounded-full"
                        onClick={() => deleteForm(index)}
                      >
                        <i className="fa fa-close text-white"></i>
                      </button>
                    </div>
                  ))}
                  <div className="text-center">
                    <button
                      type="button"
                      className="bg-green-500 text-white h-[35px] w-[35px] rounded-full"
                      onClick={addForm}
                    >
                      <i className="fa fa-plus"></i>
                    </button>
                  </div>

                  {/* Compiled data by Job Type */}
                  <div className="mt-10">
                    {laborData
                      // .filter((labor) => labor.totalPrice !== 0)
                      .map((labor) => {
                        return (
                          <div className="flex justify-between mt-1">
                            <span>
                              <b>{labor.jobType} Labor</b>
                            </span>
                            <input
                              type="number"
                              value={labor.totalPrice}
                              className="outline-none border-2 pl-2 border-[grey] rounded-sm"
                              placeholder="Enter Price"
                              min={0}
                              max={10000000}
                              step="any"
                              onChange={(e) =>
                                handlePriceChange(labor.jobType, e.target.value)
                              } // Update price on change
                            />
                          </div>
                        );
                      })}
                  </div>
                </div>
                <div className="card-footer flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    className="btn bg-[#1e3a8a] text-white"
                    onClick={() => setShowSalesOrderPreview(true)}
                  >
                    Merge Duplicate Materials
                  </button>
                  <button
                    type="submit"
                    className="btn bg-[#00613e] text-white"
                    disabled={disableBtn}
                  >
                    {disableBtn ? "Please wait..." : "Generate Customer Copy"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
      <CustomerSalesOrderPreviewModal
        show={showSalesOrderPreview}
        materialRows={extractMaterialRows(forms)}
        onClose={() => setShowSalesOrderPreview(false)}
        onGenerateMergeCopy={handleGenerateMergeCopy}
        isGenerating={disableBtn}
      />
    </Layout>
  );
}
