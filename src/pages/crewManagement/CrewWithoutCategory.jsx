import React from 'react'
import Layout from '../../components/layout/Layout'
import CrewCategoryTable from '../../components/tables/crewCategory/CrewCategoryTable'
import CrewTable from '../../components/tables/crew/CrewTable'
import CrewWithoutCategoryTable from '../../components/tables/crew/CrewWithoutCategoryTable'

export default function CrewWithoutCategory() {

  return (
    <div>
        <Layout>
            <CrewWithoutCategoryTable />
        </Layout>
    </div>
  )
}
