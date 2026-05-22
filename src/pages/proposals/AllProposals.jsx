import React from "react";
import Layout from "../../components/layout/Layout";
import ProposalTable from "../../components/tables/proposal/ProposalTable";

export default function AllProposals() {
  return (
    <div className="">
      <Layout>
        <ProposalTable />
      </Layout>
    </div>
  );
}
