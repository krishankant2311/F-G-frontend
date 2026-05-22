import React from 'react'
import Layout from '../../components/layout/Layout'
import JobTypesTable from '../../components/tables/jobTypes/JobTypesTable'

export default function AllJobTypes() {

  return (
    <div>
        <Layout>
            <JobTypesTable />
        </Layout>
    </div>
  )
}
