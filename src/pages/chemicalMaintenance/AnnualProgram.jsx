import React from "react";

import Layout from "../../components/layout/Layout";
import StaffProjectTable from "../../components/tables/projects/StaffProjectTable";
import AnnualProgram from "../../components/tables/chemical/components/ManageCustomer/AnnualProgram";

const ManageCustomers = () => {
  return (
    <div>
      <Layout>
        <AnnualProgram />
      </Layout>
    </div>
  );
};

export default ManageCustomers;
