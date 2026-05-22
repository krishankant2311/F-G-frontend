import React from 'react'
import Layout from '../../components/layout/Layout'
import AllStaffsTable from '../../components/tables/staff/AllStaffsTable'
import BlockedStaffsTable from '../../components/tables/staff/BlockedStaffsTable'

export default function BlockedStaffs() {

  return (
    <div>
        <Layout>
            <BlockedStaffsTable />
        </Layout>
    </div>
  )
}
