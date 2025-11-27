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
      title: '💭 Planning',
      gradient: 'from-slate-500 to-slate-600',
      lightBg: 'bg-slate-50/80',
      count: getModulesByStatus('planning').length
    },
    {
      key: 'in_progress',
      title: '🚀 In Progress',
      gradient: 'from-blue-500 to-cyan-500',
      lightBg: 'bg-blue-50/80',
      count: getModulesByStatus('in_progress').length
    },
    {
      key: 'review',
      title: '👀 Review',
      gradient: 'from-purple-500 to-pink-500',
      lightBg: 'bg-purple-50/80',
      count: getModulesByStatus('review').length
    },
    {
      key: 'completed',
      title: '✅ Completed',
      gradient: 'from-green-500 to-emerald-500',
      lightBg: 'bg-green-50/80',
      count: getModulesByStatus('completed').length
    },
  ]

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <header className="backdrop-blur-md bg-white/80 border-b border-gray-200/50 sticky top-0 z-10 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                  M
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    ERP Modules
                  </h1>
                  <p className="text-sm text-gray-500 mt-0.5">Plan and manage your School ERP modules</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 font-medium shadow-sm"
              >
                ← Dashboard
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-medium"
              >
                ✨ Add Module
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Kanban Board */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {statusColumns.map(column => (
            <div key={column.key} className="flex flex-col">
              {/* Column Header */}
              <div className={`bg-gradient-to-r ${column.gradient} rounded-2xl shadow-lg p-4 mb-4`}>
                <div className="flex justify-between items-center">
                  <h2 className="font-bold text-white text-lg">{column.title}</h2>
                  <div className="bg-white/30 backdrop-blur-sm px-3 py-1 rounded-full">
                    <span className="text-white font-bold text-sm">{column.count}</span>
                  </div>
                </div>
              </div>

              {/* Column Content */}
              <div className={`${column.lightBg} backdrop-blur-sm rounded-2xl p-3 min-h-[600px] space-y-3 border border-gray-200/50`}>
                {getModulesByStatus(column.key).map(module => (
                  <ModuleCard
                    key={module.id}
                    module={module}
                    onUpdate={loadModules}
                  />
                ))}
                {getModulesByStatus(column.key).length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                    <svg className="w-16 h-16 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <p className="text-sm font-medium">No modules yet</p>
                    <p className="text-xs mt-1">Drag or add new modules here</p>
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
