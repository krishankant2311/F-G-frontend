import React from "react";
import Layout from "../../components/layout/Layout";
import ClosedProposalTable from "../../components/tables/proposal/ClosedProposalTable";

export default function AllClosedProposals() {
  return (
    <div className="">
      <Layout>
        <ClosedProposalTable />
      </Layout>
    </div>
  );
}
