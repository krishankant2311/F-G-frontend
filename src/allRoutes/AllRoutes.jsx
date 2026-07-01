// import React from "react";
// import { Navigate, Route, Routes } from "react-router-dom";
// import Dashboard from "../pages/dashboard/Dashboard";
// import AdminLogin from "../auth/login/AdminLogin";
// import ChangePassword from "../auth/changePassword/ChangePassword";
// import PrivateComponent from "../components/privateComponent/PrivateComponent";
// import AllStaffs from "../pages/staffManagement/AllStaffs";
// import AddStaffForm from "../components/addForms/staff/AddStaffForm";
// import EditStaffForm from "../components/updateForms/staff/EditStaffForm";
// import AllJobTypes from "../pages/jobTypeManagement/AllJobTypes";
// import AddJobTypeForm from "../components/addForms/jobType/AddJobTypeForm";
// import EditJobTypeForm from "../components/updateForms/jobType/EditJobTypeForm";
// import AllMaterials from "../pages/materialManagement/AllMaterials";
// import AddMaterialForm from "../components/addForms/material/AddMaterialForm";
// import EditMaterialForm from "../components/updateForms/material/EditMaterialForm";
// import AllCrewCategory from "../pages/crewCategoryManagement/AllCrewCategory";
// import AddCrewCategoryForm from "../components/addForms/crewCategory/AddCrewCategoryForm";
// import EditCrewCategoryForm from "../components/updateForms/crewCategory/EditCrewCategoryForm";
// import AllCrew from "../pages/crewManagement/AllCrew";
// import AddCrewForm from "../components/addForms/crew/AddCrewForm";
// import EditCrewForm from "../components/updateForms/crew/EditCrewForm";
// import ForgotPassword from "../auth/forgotPassword/ForgotPassword";
// import ResetPassword from "../auth/resetPassword/ResetPassword";
// import StaffLogin from "../auth/login/StaffLogin";
// import StaffForgotPassword from "../auth/forgotPassword/StaffForgotPassword";
// import StaffResetPassword from "../auth/resetPassword/StaffResetPassword";
// import StaffChangePassword from "../auth/changePassword/StaffChangePassword";
// import StaffDashboard from "../pages/dashboard/StaffDashboard";
// import StaffProjects from "../pages/projects/StaffProjects";
// import StaffFieldCopy from "../pages/fieldCopy/StaffFieldCopy";
// import StaffPrivateComponent from "../components/privateComponent/StaffPrivateComponent";
// import StaffAddProjectForm from "../components/addForms/projects/StaffAddProjectForm";
// import EditStaffProjectForm from "../components/updateForms/projects/EditStaffProjectForm";
// import ViewStaffProject from "../components/views/ViewStaffProject";
// import AddFieldCopyForm from "../components/addForms/fieldCopy/AddFieldCopyForm";
// import UpdateFieldCopyForm from "../components/updateForms/fieldCopy/UpdateFieldCopyForm";
// import OfficeFieldCopyView from "../components/views/OfficeFieldCopyView";
// import ViewFieldCopyByDate from "../components/views/ViewFieldCopyByDate";
// import StaffBidsProject from "../pages/projects/StaffBidsProject";
// import CustomerFieldCopyView from "../components/views/CustomerFieldCopyView";
// import EditCustomerFieldCopy from "../components/updateForms/fieldCopy/EditCustomerFieldCopy";
// import AddTaxForm from "../components/addForms/taxManagement/AddTaxForm";
// import AddAddressForm from "../components/addForms/FGAddress/AddAddressForm";
// import ActiveStaffs from "../pages/staffManagement/ActiveStaffs";
// import BlockedStaffs from "../pages/staffManagement/BlockedStaffs";
// import AllLabor from "../pages/labourManagement/AllLabor";
// import AddLaborForm from "../components/addForms/labor/AddLaborForm";
// import EditLaborForm from "../components/updateForms/labor/EditLaborForm";
// import EditBidedFieldCopy from "../components/updateForms/fieldCopy/EditBidedFieldCopy";
// import ViewBidedFieldCopy from "../components/views/ViewBidedFieldCopy";
// import CrewWithoutCategoryTable from "../components/tables/crew/CrewWithoutCategoryTable";
// import CrewWithoutCategory from "../pages/crewManagement/CrewWithoutCategory";
// import EditCrewWithoutCategoryForm from "../components/updateForms/crew/EditCrewWithoutCategoryForm";
// import CustomerManagement from "../pages/customerManagement/CustomerManagement";
// import CustomerAddForm from "../components/addForms/customer/CustomerAddForm";
// import EditCustomerForm from "../components/updateForms/customer/EditCustomerForm";
// import OfficeFieldCopyBidView from "../components/views/OfficeFieldCopyBidView";
// import StaffCompletedProjects from "../pages/projects/StaffCompletedProjects";
// import StaffAddBidForm from "../components/addForms/projects/StaffAddBidForm";
// import CustomerProjectTable from "../components/tables/compiledProjects/AllCustomersOfficeTable";
// import CustomerProjects from "../pages/compiledProjects/CustomerProjects";
// import CustomerCompiledProjectsView from "../components/views/CustomerCompiledProjectsView";
// import AllCustomersOffice from "../pages/compiledProjects/AllCustomersOffice";
// import AddDraftCopyForm from "../components/addForms/draftCopy/AddDraftCopyForm";
// import ViewDraftCopyByDate from "../components/views/ViewDraftCopyByDate";
// import EditDraftCopyForm from "../components/updateForms/draftCopy/EditDraftCopyForm";
// import ViewCustomerCopyList from "../components/views/ViewCustomerCopyList";
// import EditBidProjectForm from "../components/updateForms/projects/EditBidProjectForm";
// import ViewBidProject from "../components/views/ViewBidProject";
// import StaffBilledProjects from "../pages/projects/StaffBilledProjects";
// import StaffDeletedProjects from "../pages/projects/StaffDeletedProjects";
// import ProposalTable from "../components/tables/proposal/ProposalTable";
// import AddNewProposal from "../components/addForms/proposal/AddNewProposal";
// import AllProposals from "../pages/proposals/AllProposals";
// import EditProposal from "../components/updateForms/proposal/EditProposal";
// import ProposalView from "../components/views/ProposalView";
// import ConvertProposal from "../components/addForms/proposal/ConvertProposal";
// import ProposalEntries from "../components/views/ProposalEntries";
// import AllClosedProposals from "../pages/proposals/AllClosedProposals";

// export default function AllRoutes() {
//   return (
//     <div>
//       <Routes>
//         <Route path="/panel/admin/login" element={<AdminLogin />} />
//         <Route path="/panel/admin/forgot-password" element={<ForgotPassword />} />
//         <Route path="/panel/admin/reset-password" element={<ResetPassword />} />

//         <Route path="/panel" element={<Navigate to='/panel/office/login' />} />
//         <Route path="/panel/office/login" element={<StaffLogin />} />
//         <Route path="/panel/office/forgot-password" element={<StaffForgotPassword />} />
//         <Route path="/panel/office/reset-password" element={<StaffResetPassword />} />

//         <Route path="/" element={<Navigate to="/panel/office/login" />}></Route>


//         <Route element={<PrivateComponent />}>
//           <Route path="/panel/admin/change-password" element={<ChangePassword />} />
       
//           {/* Dashboard */}
//           <Route path="/panel/admin/" element={<Dashboard />} />
//           <Route path="/panel/admin/dashboard" element={<Dashboard />} />

//           {/* Staff Management */}
//           <Route path="/panel/admin/all-staffs/:pageNo" element={<AllStaffs />} />
//           <Route path="/panel/admin/all-active-staffs/:pageNo" element={<ActiveStaffs />} />
//           <Route path="/panel/admin/all-blocked-staffs/:pageNo" element={<BlockedStaffs />} />
//           <Route path="/panel/admin/staff/add" element={<AddStaffForm />} />
//           <Route path="/panel/admin/staff/edit/:id" element={<EditStaffForm />} />

//           {/* Customer Management */}
//           <Route path="/panel/admin/all-customers/:pageNo" element={<CustomerManagement />} />
//           <Route path="/panel/admin/customer/add" element={<CustomerAddForm />} />
//           <Route path="/panel/admin/customer/edit/:id" element={<EditCustomerForm />} />

//           {/* Job Types Management */}
//           <Route path="/panel/admin/all-job-types/:pageNo" element={<AllJobTypes />} />
//           <Route path="/panel/admin/job-type/add" element={<AddJobTypeForm />} />
//           <Route path="/panel/admin/job-type/edit/:id" element={<EditJobTypeForm />} />

//           {/* Material Management */}
//           <Route path="/panel/admin/all-materials/:pageNo" element={<AllMaterials />} />
//           <Route path="/panel/admin/material/add" element={<AddMaterialForm />} />
//           <Route path="/panel/admin/material/edit/:id" element={<EditMaterialForm />} />

//           {/* Crew Category Management */}
//           <Route path="/panel/admin/all-crew-categories/:pageNo" element={<AllCrewCategory />} />
//           <Route path="/panel/admin/crew-category/add" element={<AddCrewCategoryForm />} />
//           <Route path="/panel/admin/crew-category/edit/:id" element={<EditCrewCategoryForm />} />

//           {/* Labor Management */}
//           <Route path="/panel/admin/all-labors/:pageNo" element={<AllLabor />} />
//           <Route path="/panel/admin/labor/add" element={<AddLaborForm />} />
//           <Route path="/panel/admin/labor/edit/:id" element={<EditLaborForm />} />

//           {/* Crew Management */}
//           <Route path="/panel/admin/all-crews/:pageNo" element={<AllCrew />} />
//           <Route path="/panel/admin/crews-without-category/:pageNo" element={<CrewWithoutCategory />} />
//           <Route path="/panel/admin/crew/add" element={<AddCrewForm />} />
//           <Route path="/panel/admin/crew/edit/:id" element={<EditCrewForm />} />
//           <Route path="/panel/admin/crew-without-category/edit/:id" element={<EditCrewWithoutCategoryForm />} />

//           {/* Tax Management */}
//           <Route path="/panel/admin/tax/edit" element={<AddTaxForm />} />

//           {/* Address Management */}
//           <Route path="/panel/admin/address/edit" element={<AddAddressForm />} />
//         </Route>

//         <Route element={<StaffPrivateComponent />}>
//         <Route path="/panel/office/change-password" element={<StaffChangePassword />} />

//           {/* Dashboard */}
//           <Route path="/panel/office/dashboard" element={<StaffDashboard />} />

//           {/* Project Management */}
//           <Route path="/panel/office/all-projects/:pageNo" element={<StaffProjects />} />
//           <Route path="/panel/office/completed-projects/:pageNo" element={<StaffCompletedProjects />} />
//           <Route path="/panel/office/billed-projects/:pageNo" element={<StaffBilledProjects />} />
//           <Route path="/panel/office/deleted-projects/:pageNo" element={<StaffDeletedProjects />} />
//           <Route path="/panel/office/bid-projects/:pageNo" element={<StaffBidsProject />} />
//           <Route path="/panel/office/project/add/0" element={<StaffAddProjectForm />} />
//           <Route path="/panel/office/project/add/1" element={<StaffAddBidForm />} />
//           <Route path="/panel/office/project/edit/:id/:type" element={<EditStaffProjectForm />} />
//           <Route path="/panel/office/project/view/:id/:type" element={<ViewStaffProject />} />
//           <Route path="/panel/office/project/edit-bid/:id/:type" element={<EditBidProjectForm />} />
//           <Route path="/panel/office/project/view-bid/:id/:type" element={<ViewBidProject />} />

//           {/* Proposals */}
//           <Route path="/panel/office/all-proposals/:pageNo" element={<AllProposals />} />
//           <Route path="/panel/office/all-closed-proposals/:pageNo" element={<AllClosedProposals />} />
//           <Route path="/panel/office/add-proposal" element={<AddNewProposal />} />
//           <Route path="/panel/office/edit-proposal/:id" element={<EditProposal />} />
//           <Route path="/panel/office/view-proposal/:id" element={<ProposalView />} />
//           <Route path="/panel/office/convert-proposal/:id" element={<ConvertProposal />} />
//           <Route path="/panel/office/proposal-entries/:id/:projectId" element={<ProposalEntries />} />

//           {/* Field Copy */}
//           <Route path="/panel/office/project/field-copy/add/:id" element={<AddFieldCopyForm />} />
//           <Route path="/panel/office/project/field-copy/edit/:id/:fieldId" element={<UpdateFieldCopyForm />} />
//           <Route path="/panel/office/project/field-copy/view/:id" element={<ViewStaffProject />} />
//           <Route path="/panel/office/project/field-copy/:id" element={<StaffFieldCopy />} />
//           <Route path="/panel/office/project/field-copy/office/:id" element={<OfficeFieldCopyView />} />
//           <Route path="/panel/office/project/field-copy/office-with-bid/:id" element={<OfficeFieldCopyBidView />} />
//           <Route path="/panel/office/project/customer-copy-lists/:id" element={<ViewCustomerCopyList />} />
//           <Route path="/panel/office/project/field-copy/customer/:id/:entryDate/:index" element={<CustomerFieldCopyView />} />
//           <Route path="/panel/office/project/field-copy/bided/:id" element={<ViewBidedFieldCopy />} />
//           <Route path="/panel/office/project/field-copy/customer/edit/:id" element={<EditCustomerFieldCopy />} />
//           <Route path="/panel/office/project/field-copy/bided/edit/:id" element={<EditBidedFieldCopy />} />
//           <Route path="/panel/office/project/field-copy/date" element={<ViewFieldCopyByDate />} />

//           {/* Draft Copy */}
//           <Route path="/panel/office/project/draft-copy/add/:id" element={<AddDraftCopyForm />} />
//           <Route path="/panel/office/project/draft-copy/date" element={<ViewDraftCopyByDate />} />
//           <Route path="/panel/office/project/draft-copy/edit/:id/:date" element={<EditDraftCopyForm />} />

//           {/* Compiled Projects */}
//           <Route path="/panel/office/all-customers/:pageNo" element={<AllCustomersOffice />} />
//           <Route path="/panel/office/all-customer-projects/:customerId/:pageNo" element={<CustomerProjects />} />
//           <Route path="/panel/office/customer/compiled-projects" element={<CustomerCompiledProjectsView />} />

//         </Route>
//       </Routes>
//     </div>
//   );
// }


import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Dashboard from "../pages/dashboard/Dashboard";
import AdminLogin from "../auth/login/AdminLogin";
import ChangePassword from "../auth/changePassword/ChangePassword";
import PrivateComponent from "../components/privateComponent/PrivateComponent";
import AllStaffs from "../pages/staffManagement/AllStaffs";
import AddStaffForm from "../components/addForms/staff/AddStaffForm";
import EditStaffForm from "../components/updateForms/staff/EditStaffForm";
import AllJobTypes from "../pages/jobTypeManagement/AllJobTypes";
import AddJobTypeForm from "../components/addForms/jobType/AddJobTypeForm";
import EditJobTypeForm from "../components/updateForms/jobType/EditJobTypeForm";
import AllMaterials from "../pages/materialManagement/AllMaterials";
import AddMaterialForm from "../components/addForms/material/AddMaterialForm";
import EditMaterialForm from "../components/updateForms/material/EditMaterialForm";
import AllCrewCategory from "../pages/crewCategoryManagement/AllCrewCategory";
import AddCrewCategoryForm from "../components/addForms/crewCategory/AddCrewCategoryForm";
import EditCrewCategoryForm from "../components/updateForms/crewCategory/EditCrewCategoryForm";
import AllCrew from "../pages/crewManagement/AllCrew";
import AddCrewForm from "../components/addForms/crew/AddCrewForm";
import EditCrewForm from "../components/updateForms/crew/EditCrewForm";
import ForgotPassword from "../auth/forgotPassword/ForgotPassword";
import ResetPassword from "../auth/resetPassword/ResetPassword";
import StaffLogin from "../auth/login/StaffLogin";
import StaffForgotPassword from "../auth/forgotPassword/StaffForgotPassword";
import StaffResetPassword from "../auth/resetPassword/StaffResetPassword";
import StaffChangePassword from "../auth/changePassword/StaffChangePassword";
import StaffDashboard from "../pages/dashboard/StaffDashboard";
import StaffProjects from "../pages/projects/StaffProjects";
import StaffFieldCopy from "../pages/fieldCopy/StaffFieldCopy";
import StaffPrivateComponent from "../components/privateComponent/StaffPrivateComponent";
import StaffAddProjectForm from "../components/addForms/projects/StaffAddProjectForm";
import EditStaffProjectForm from "../components/updateForms/projects/EditStaffProjectForm";
import ViewStaffProject from "../components/views/ViewStaffProject";
import AddFieldCopyForm from "../components/addForms/fieldCopy/AddFieldCopyForm";
import UpdateFieldCopyForm from "../components/updateForms/fieldCopy/UpdateFieldCopyForm";
import OfficeFieldCopyView from "../components/views/OfficeFieldCopyView";
import ViewFieldCopyByDate from "../components/views/ViewFieldCopyByDate";
import StaffBidsProject from "../pages/projects/StaffBidsProject";
import CustomerFieldCopyView from "../components/views/CustomerFieldCopyView";
import EditCustomerFieldCopy from "../components/updateForms/fieldCopy/EditCustomerFieldCopy";
import AddTaxForm from "../components/addForms/taxManagement/AddTaxForm";
import AddAddressForm from "../components/addForms/FGAddress/AddAddressForm";
import ActiveStaffs from "../pages/staffManagement/ActiveStaffs";
import BlockedStaffs from "../pages/staffManagement/BlockedStaffs";
import AllLabor from "../pages/labourManagement/AllLabor";
import AddLaborForm from "../components/addForms/labor/AddLaborForm";
import EditLaborForm from "../components/updateForms/labor/EditLaborForm";
import EditBidedFieldCopy from "../components/updateForms/fieldCopy/EditBidedFieldCopy";
import ViewBidedFieldCopy from "../components/views/ViewBidedFieldCopy";
import CrewWithoutCategoryTable from "../components/tables/crew/CrewWithoutCategoryTable";
import CrewWithoutCategory from "../pages/crewManagement/CrewWithoutCategory";
import EditCrewWithoutCategoryForm from "../components/updateForms/crew/EditCrewWithoutCategoryForm";
import CustomerManagement from "../pages/customerManagement/CustomerManagement";
import CustomerAddForm from "../components/addForms/customer/CustomerAddForm";
import EditCustomerForm from "../components/updateForms/customer/EditCustomerForm";
import OfficeFieldCopyBidView from "../components/views/OfficeFieldCopyBidView";
import StaffCompletedProjects from "../pages/projects/StaffCompletedProjects";
import StaffAddBidForm from "../components/addForms/projects/StaffAddBidForm";
import CustomerProjectTable from "../components/tables/compiledProjects/AllCustomersOfficeTable";
import CustomerProjects from "../pages/compiledProjects/CustomerProjects";
import CustomerCompiledProjectsView from "../components/views/CustomerCompiledProjectsView";
import AllCustomersOffice from "../pages/compiledProjects/AllCustomersOffice";
import AddDraftCopyForm from "../components/addForms/draftCopy/AddDraftCopyForm";
import ViewDraftCopyByDate from "../components/views/ViewDraftCopyByDate";
import EditDraftCopyForm from "../components/updateForms/draftCopy/EditDraftCopyForm";
import ViewCustomerCopyList from "../components/views/ViewCustomerCopyList";
import EditBidProjectForm from "../components/updateForms/projects/EditBidProjectForm";
import ViewBidProject from "../components/views/ViewBidProject";
import StaffBilledProjects from "../pages/projects/StaffBilledProjects";
import StaffDeletedProjects from "../pages/projects/StaffDeletedProjects";
import ProposalTable from "../components/tables/proposal/ProposalTable";
import AddNewProposal from "../components/addForms/proposal/AddNewProposal";
import AllProposals from "../pages/proposals/AllProposals";
import EditProposal from "../components/updateForms/proposal/EditProposal";
import ProposalView from "../components/views/ProposalView";
import ConvertProposal from "../components/addForms/proposal/ConvertProposal";
import ProposalEntries from "../components/views/ProposalEntries";
import AllClosedProposals from "../pages/proposals/AllClosedProposals";

import ChemicalDashboard from "../pages/chemicalMaintenance/Dashboard";
import ChemicalAddNewCustomer from "../pages/chemicalMaintenance/AddNewCustomer";
import ManageCustomers from "../pages/chemicalMaintenance/ManageCustomers";
import Chemicals from "../pages/chemicalMaintenance/Chemicals";
import ChemicalMixes from "../pages/chemicalMaintenance/ChemicalMixes";
import AddNewMix from "../pages/chemicalMaintenance/Add-New-Mix";
import Treatment from "../pages/chemicalMaintenance/Treatment";
import TreatmentList from "../pages/chemicalMaintenance/TreatmentList";
import CustomerSummary from "../pages/chemicalMaintenance/CustomerSummary";
import AnnualProgram from "../pages/chemicalMaintenance/AnnualProgram";
import AnnualProgramSchedule from "../pages/chemicalMaintenance/AnnualProgramSchedule";
import ClientReconcile from "../pages/chemicalMaintenance/ClientReconcile";
import OtherTreatments from "../pages/chemicalMaintenance/OtherTreatments";
import ArchivedPlans from "../pages/chemicalMaintenance/ArchivedPlans";

export default function AllRoutes() {
  return (
    <div>
      <Routes>
        <Route path="/panel/admin/login" element={<AdminLogin />} />
        <Route path="/panel/admin/forgot-password" element={<ForgotPassword />} />
        <Route path="/panel/admin/reset-password" element={<ResetPassword />} />

        <Route path="/panel" element={<Navigate to='/panel/office/login' />} />
        <Route path="/panel/office/login" element={<StaffLogin />} />
        <Route path="/panel/office/forgot-password" element={<StaffForgotPassword />} />
        <Route path="/panel/office/reset-password" element={<StaffResetPassword />} />

        <Route path="/" element={<Navigate to="/panel/office/login" />}></Route>

        <Route element={<PrivateComponent />}>
          <Route path="/panel/admin/change-password" element={<ChangePassword />} />

          {/* Dashboard */}
          <Route path="/panel/admin/" element={<Dashboard />} />
          <Route path="/panel/admin/dashboard" element={<Dashboard />} />

          {/* Staff Management */}
          <Route path="/panel/admin/all-staffs/:pageNo" element={<AllStaffs />} />
          <Route path="/panel/admin/all-active-staffs/:pageNo" element={<ActiveStaffs />} />
          <Route path="/panel/admin/all-blocked-staffs/:pageNo" element={<BlockedStaffs />} />
          <Route path="/panel/admin/staff/add" element={<AddStaffForm />} />
          <Route path="/panel/admin/staff/edit/:id" element={<EditStaffForm />} />

          {/* Customer Management */}
          <Route path="/panel/admin/all-customers/:pageNo" element={<CustomerManagement />} />
          <Route path="/panel/admin/customer/add" element={<CustomerAddForm />} />
          <Route path="/panel/admin/customer/edit/:id" element={<EditCustomerForm />} />

          {/* Job Types Management */}
          <Route path="/panel/admin/all-job-types/:pageNo" element={<AllJobTypes />} />
          <Route path="/panel/admin/job-type/add" element={<AddJobTypeForm />} />
          <Route path="/panel/admin/job-type/edit/:id" element={<EditJobTypeForm />} />

          {/* Material Management */}
          <Route path="/panel/admin/all-materials/:pageNo" element={<AllMaterials />} />
          <Route path="/panel/admin/material/add" element={<AddMaterialForm />} />
          <Route path="/panel/admin/material/edit/:id" element={<EditMaterialForm />} />

          {/* Crew Category Management */}
          <Route path="/panel/admin/all-crew-categories/:pageNo" element={<AllCrewCategory />} />
          <Route path="/panel/admin/crew-category/add" element={<AddCrewCategoryForm />} />
          <Route path="/panel/admin/crew-category/edit/:id" element={<EditCrewCategoryForm />} />

          {/* Labor Management */}
          <Route path="/panel/admin/all-labors/:pageNo" element={<AllLabor />} />
          <Route path="/panel/admin/labor/add" element={<AddLaborForm />} />
          <Route path="/panel/admin/labor/edit/:id" element={<EditLaborForm />} />

          {/* Crew Management */}
          <Route path="/panel/admin/all-crews/:pageNo" element={<AllCrew />} />
          <Route path="/panel/admin/crews-without-category/:pageNo" element={<CrewWithoutCategory />} />
          <Route path="/panel/admin/crew/add" element={<AddCrewForm />} />
          <Route path="/panel/admin/crew/edit/:id" element={<EditCrewForm />} />
          <Route path="/panel/admin/crew-without-category/edit/:id" element={<EditCrewWithoutCategoryForm />} />

          {/* Tax Management */}
          <Route path="/panel/admin/tax/edit" element={<AddTaxForm />} />

          {/* Address Management */}
          <Route path="/panel/admin/address/edit" element={<AddAddressForm />} />
        </Route>

        <Route element={<StaffPrivateComponent />}>
          <Route path="/panel/office/change-password" element={<StaffChangePassword />} />

          {/* Dashboard */}
          <Route path="/panel/office/dashboard" element={<StaffDashboard />} />

          {/* Project Management */}
          <Route path="/panel/office/all-projects/:pageNo" element={<StaffProjects />} />
          <Route path="/panel/office/completed-projects/:pageNo" element={<StaffCompletedProjects />} />
          <Route path="/panel/office/billed-projects/:pageNo" element={<StaffBilledProjects />} />
          <Route path="/panel/office/deleted-projects/:pageNo" element={<StaffDeletedProjects />} />
          <Route path="/panel/office/bid-projects/:pageNo" element={<StaffBidsProject />} />
          <Route path="/panel/office/project/add/0" element={<StaffAddProjectForm />} />
          <Route path="/panel/office/project/add/1" element={<StaffAddBidForm />} />
          <Route path="/panel/office/project/edit/:id/:type" element={<EditStaffProjectForm />} />
          <Route path="/panel/office/project/view/:id/:type" element={<ViewStaffProject />} />
          <Route path="/panel/office/project/edit-bid/:id/:type" element={<EditBidProjectForm />} />
          <Route path="/panel/office/project/view-bid/:id/:type" element={<ViewBidProject />} />

          {/* Proposals */}
          <Route path="/panel/office/all-proposals/:pageNo" element={<AllProposals />} />
          <Route path="/panel/office/all-closed-proposals/:pageNo" element={<AllClosedProposals />} />
          <Route path="/panel/office/add-proposal" element={<AddNewProposal />} />
          <Route path="/panel/office/edit-proposal/:id" element={<EditProposal />} />
          <Route path="/panel/office/view-proposal/:id" element={<ProposalView />} />
          <Route path="/panel/office/convert-proposal/:id" element={<ConvertProposal />} />
          <Route path="/panel/office/proposal-entries/:id/:projectId" element={<ProposalEntries />} />

          {/* Field Copy */}
          <Route path="/panel/office/project/field-copy/add/:id" element={<AddFieldCopyForm />} />
          <Route path="/panel/office/project/field-copy/edit/:id/:fieldId" element={<UpdateFieldCopyForm />} />
          <Route path="/panel/office/project/field-copy/view/:id" element={<ViewStaffProject />} />
          <Route path="/panel/office/project/field-copy/:id" element={<StaffFieldCopy />} />
          <Route path="/panel/office/project/field-copy/office/:id" element={<OfficeFieldCopyView />} />
          <Route path="/panel/office/project/field-copy/office-with-bid/:id" element={<OfficeFieldCopyBidView />} />
          <Route path="/panel/office/project/customer-copy-lists/:id" element={<ViewCustomerCopyList />} />
          <Route path="/panel/office/project/field-copy/customer/:id/:entryDate/:index" element={<CustomerFieldCopyView />} />
          <Route path="/panel/office/project/field-copy/bided/:id" element={<ViewBidedFieldCopy />} />
          <Route path="/panel/office/project/field-copy/customer/edit/:id/:entryDate/:index" element={<EditCustomerFieldCopy />} />
          <Route path="/panel/office/project/field-copy/customer/edit/:id" element={<EditCustomerFieldCopy />} />
          <Route path="/panel/office/project/field-copy/bided/edit/:id" element={<EditBidedFieldCopy />} />
          <Route path="/panel/office/project/field-copy/date" element={<ViewFieldCopyByDate />} />

          {/* Draft Copy */}
          <Route path="/panel/office/project/draft-copy/add/:id" element={<AddDraftCopyForm />} />
          <Route path="/panel/office/project/draft-copy/date" element={<ViewDraftCopyByDate />} />
          <Route path="/panel/office/project/draft-copy/edit/:id/:date" element={<EditDraftCopyForm />} />

          {/* Compiled Projects */}
          <Route path="/panel/office/all-customers/:pageNo" element={<AllCustomersOffice />} />
          <Route path="/panel/office/all-customer-projects/:customerId/:pageNo" element={<CustomerProjects />} />
          <Route path="/panel/office/customer/compiled-projects" element={<CustomerCompiledProjectsView />} />

          {/* Chemical Maintenance */}
          <Route path="/panel/office/chemical-maintenance/dashboard" element={<ChemicalDashboard />} />
          <Route path="/panel/office/chemical-maintenance/add-new-customer" element={<ChemicalAddNewCustomer />} />
          <Route path="/panel/office/chemical-maintenance/manage-customer" element={<ManageCustomers />} />
          <Route path="/panel/office/chemical-maintenance/archived-plans" element={<ArchivedPlans />} />
          <Route path="/panel/office/chemical-maintenance/add-chemicals" element={<Chemicals />} />
          <Route path="/panel/office/chemical-maintenance/other-treatments" element={<OtherTreatments />} />
          <Route path="/panel/office/chemical-maintenance/chemicals-mixs" element={<ChemicalMixes />} />
          <Route path="/panel/office/chemical-maintenance/add-New-mixs" element={<AddNewMix />} />
          <Route path="/panel/office/chemical-maintenance/treatment" element={<Treatment />} />
          <Route path="/panel/office/chemical-maintenance/treatment/:customerId" element={<TreatmentList />} />
          <Route path="/panel/office/chemical-maintenance/treatment/:customerId/customerSummary" element={<CustomerSummary />} />
          <Route path="/panel/office/chemical-maintenance/customers/:customerId/annual-program" element={<AnnualProgram />} />
          <Route path="/panel/office/chemical-maintenance/customers/:customerId/annual-program-schedule" element={<AnnualProgramSchedule />} />
          <Route path="/panel/office/chemical-maintenance/customers/:customerId/client-reconcile" element={<ClientReconcile />} />

        </Route>
      </Routes>
    </div>
  );
}
