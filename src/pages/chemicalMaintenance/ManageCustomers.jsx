import React from "react";

import Layout from "../../components/layout/Layout";
import StaffProjectTable from "../../components/tables/projects/StaffProjectTable";
import ManageCustomersTable from "../../components/tables/chemical/ManageCustomersTable";

const ManageCustomers = () => {
  return (
    <div>
      <Layout>
        <ManageCustomersTable />
      </Layout>
    </div>
  );
};

export default ManageCustomers;
