import React from "react";

import Layout from "../../components/layout/Layout";
import StaffProjectTable from "../../components/tables/projects/StaffProjectTable";
import ClientReconcile from "../../components/tables/chemical/components/ManageCustomer/ClientReconcile";

const ManageCustomers = () => {
  return (
    <div>
      <Layout>
        <ClientReconcile />
      </Layout>
    </div>
  );
};

export default ManageCustomers;
