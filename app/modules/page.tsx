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
    { key: 'planning', title: 'Planning', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
    { key: 'in_progress', title: 'In Progress', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' },
    { key: 'review', title: 'Review', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
    { key: 'completed', title: 'Completed', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
  ]

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-primary-600">ERP Modules</h1>
              <p className="text-sm text-gray-600 mt-1">Plan and manage your School ERP modules</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                ← Dashboard
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                + Add Module
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Kanban Board */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statusColumns.map(column => (
            <div key={column.key} className="flex flex-col">
              {/* Column Header */}
              <div className={`${column.bgColor} ${column.borderColor} border-2 rounded-t-lg px-4 py-3`}>
                <div className="flex justify-between items-center">
                  <h2 className="font-semibold text-gray-800">{column.title}</h2>
                  <span className="bg-white px-2 py-1 rounded-full text-xs font-medium text-gray-600">
                    {getModulesByStatus(column.key).length}
                  </span>
                </div>
              </div>

              {/* Column Content */}
              <div className={`${column.bgColor} ${column.borderColor} border-2 border-t-0 rounded-b-lg p-4 min-h-[500px] space-y-3`}>
                {getModulesByStatus(column.key).map(module => (
                  <ModuleCard
                    key={module.id}
                    module={module}
                    onUpdate={loadModules}
                  />
                ))}
                {getModulesByStatus(column.key).length === 0 && (
                  <div className="text-center text-gray-400 py-8 text-sm">
                    No modules yet
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
