import React from "react";

import Layout from "../../components/layout/Layout";
import StaffProjectTable from "../../components/tables/projects/StaffProjectTable";
import AnnualProgramSchedule from "../../components/tables/chemical/components/ManageCustomer/AnnualProgramSchedule";

const ManageCustomers = () => {
  return (
    <div>
      <Layout>
        <AnnualProgramSchedule />
      </Layout>
    </div>
  );
};

export default ManageCustomers;
