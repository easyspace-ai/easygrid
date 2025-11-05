import * as React from 'react'
import { EasyGrid } from '@easygrid/grid'

export default function App() {
  return (
    <div className="h-screen min-h-0 p-4 flex flex-col">
      <h1>EasyGrid Demo</h1>
      <div className="flex-1 min-h-0 flex flex-col">
        <EasyGrid
        height="auto"
        serverUrl={import.meta.env.VITE_LUCKDB_SERVER_URL || import.meta.env.VITE_API_URL}
        tableId={import.meta.env.VITE_TABLE_ID}
        />
      </div>
    </div>
  )
}

