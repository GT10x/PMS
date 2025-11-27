'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import AddModuleModal from '@/components/AddModuleModal'
import ModuleCard from '@/components/ModuleCard'

const supabase = createClient(
  'https://loihxoyrutbzmqscdknk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvaWh4b3lydXRiem1xc2Nka25rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyMzg5NDMsImV4cCI6MjA3OTgxNDk0M30.OFJs18sZSBO5WNj_Ghl56W0z0QE4etNbcBgVHgIAqZw'
)

type Module = {
  id: string
  name: string
  description: string
  status: 'planning' | 'in_progress' | 'review' | 'completed'
  priority: 'low' | 'medium' | 'high' | 'critical'
  created_at: string
}

export default function ModulesPage() {
  const [user, setUser] = useState<any>(null)
  const [modules, setModules] = useState<Module[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkUserAndLoadModules()
  }, [])

  async function checkUserAndLoadModules() {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    setUser(user)
    await loadModules()
    setLoading(false)
  }

  async function loadModules() {
    const { data, error } = await supabase
      .from('modules')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading modules:', error)
    } else {
      setModules(data || [])
    }
  }

  const getModulesByStatus = (status: string) => {
    return modules.filter(m => m.status === status)
  }

  const statusColumns = [
    {
      key: 'planning',
      title: 'Planning',
      count: getModulesByStatus('planning').length
    },
    {
      key: 'in_progress',
      title: 'In Progress',
      count: getModulesByStatus('in_progress').length
    },
    {
      key: 'review',
      title: 'Review',
      count: getModulesByStatus('review').length
    },
    {
      key: 'completed',
      title: 'Completed',
      count: getModulesByStatus('completed').length
    },
  ]

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f9fa]">
        <div className="text-sm text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa]" style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">ERP Modules</h1>
              <p className="text-sm text-gray-500 mt-0.5">Manage your School ERP modules</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
              >
                Dashboard
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
              >
                + Add Module
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Kanban Board */}
      <main className="mx-auto max-w-7xl px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statusColumns.map(column => (
            <div key={column.key} className="flex flex-col">
              {/* Column Header */}
              <div className="bg-white rounded-lg border border-gray-200 p-3 mb-3" style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.06)' }}>
                <div className="flex justify-between items-center">
                  <h2 className="font-semibold text-gray-900 text-sm">{column.title}</h2>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{column.count}</span>
                </div>
              </div>

              {/* Column Content */}
              <div className="space-y-2.5 min-h-[500px]">
                {getModulesByStatus(column.key).map(module => (
                  <ModuleCard
                    key={module.id}
                    module={module}
                    onUpdate={loadModules}
                  />
                ))}
                {getModulesByStatus(column.key).length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <svg className="w-12 h-12 mb-2 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <p className="text-xs">No modules</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Add Module Modal */}
      {showAddModal && (
        <AddModuleModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false)
            loadModules()
          }}
        />
      )}
    </div>
  )
}
