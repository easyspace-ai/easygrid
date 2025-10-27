import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import RealtimeTable from './components/RealtimeTable'
import { LuckDBProvider } from './context/LuckDBContext'

function App() {
  return (
    <LuckDBProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <nav className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                <div className="flex items-center">
                  <h1 className="text-xl font-semibold text-gray-900">
                    EasyGrid SDK 实时协作演示
                  </h1>
                </div>
                <div className="flex items-center space-x-4">
                  <Link
                    to="/"
                    className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    表格视图
                  </Link>
                  <Link
                    to="/demo"
                    className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    演示页面
                  </Link>
                </div>
              </div>
            </div>
          </nav>

          <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <Routes>
              <Route path="/" element={<RealtimeTable />} />
              <Route path="/demo" element={<RealtimeTable />} />
            </Routes>
          </main>
        </div>
      </Router>
    </LuckDBProvider>
  )
}

export default App
