import * as React from 'react'
import { EasyGridPro } from '@easygrid/grid'

export default function App() {
  return (
    <div className="h-screen p-4 flex flex-col">
      <h1>EasyGrid Demo</h1>
      <EasyGridPro
        height="auto"
        server={import.meta.env.VITE_LUCKDB_SERVER_URL || import.meta.env.VITE_API_URL}
        tableId={import.meta.env.VITE_TABLE_ID}
      />
    </div>
  )
}

