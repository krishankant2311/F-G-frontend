import React from 'react'
import Layout from '../../components/layout/Layout'
import AllStaffsTable from '../../components/tables/staff/AllStaffsTable'
import ActiveStaffsTable from '../../components/tables/staff/ActiveStaffsTable'

export default function ActiveStaffs() {

  return (
    <div>
        <Layout>
            <ActiveStaffsTable />
        </Layout>
    </div>
  )
}
