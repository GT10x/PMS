'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://loihxoyrutbzmqscdknk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvaWh4b3lydXRiem1xc2Nka25rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyMzg5NDMsImV4cCI6MjA3OTgxNDk0M30.OFJs18sZSBO5WNj_Ghl56W0z0QE4etNbcBgVHgIAqZw'
)

type Module = {
  id: string
  name: string
  description: string
  status: string
  priority: string
}

type SubFunction = {
  id: string
  name: string
  description: string
  status: string
}

export default function ModuleCard({ module, onUpdate }: { module: Module, onUpdate: () => void }) {
  const [subFunctions, setSubFunctions] = useState<SubFunction[]>([])
  const [showSubFunctions, setShowSubFunctions] = useState(false)
  const [showAddSubFunction, setShowAddSubFunction] = useState(false)
  const [newSubFunction, setNewSubFunction] = useState({ name: '', description: '' })

  useEffect(() => {
    if (showSubFunctions) {
      loadSubFunctions()
    }
  }, [showSubFunctions])

  async function loadSubFunctions() {
    const { data } = await supabase
      .from('sub_functions')
      .select('*')
      .eq('module_id', module.id)
      .order('created_at', { ascending: true })

    if (data) {
      setSubFunctions(data)
    }
  }

  async function handleAddSubFunction() {
    if (!newSubFunction.name) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('sub_functions').insert({
      module_id: module.id,
      name: newSubFunction.name,
      description: newSubFunction.description,
      created_by: user.id
    })

    if (!error) {
      setNewSubFunction({ name: '', description: '' })
      setShowAddSubFunction(false)
      loadSubFunctions()
    }
  }

  async function toggleSubFunctionStatus(subFunctionId: string, currentStatus: string) {
    const newStatus = currentStatus === 'completed' ? 'pending' :
                     currentStatus === 'pending' ? 'in_progress' : 'completed'

    await supabase
      .from('sub_functions')
      .update({ status: newStatus })
      .eq('id', subFunctionId)

    loadSubFunctions()
  }

  const priorityConfig = {
    low: {
      bg: 'bg-gray-100',
      text: 'text-gray-700',
      border: 'border-gray-200',
      dot: 'bg-gray-400'
    },
    medium: {
      bg: 'bg-blue-100',
      text: 'text-blue-700',
      border: 'border-blue-200',
      dot: 'bg-blue-500'
    },
    high: {
      bg: 'bg-orange-100',
      text: 'text-orange-700',
      border: 'border-orange-200',
      dot: 'bg-orange-500'
    },
    critical: {
      bg: 'bg-red-100',
      text: 'text-red-700',
      border: 'border-red-200',
      dot: 'bg-red-500'
    }
  }

  const priority = priorityConfig[module.priority as keyof typeof priorityConfig] || priorityConfig.medium
  const completedCount = subFunctions.filter(sf => sf.status === 'completed').length
  const totalCount = subFunctions.length

  return (
    <div className="group bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-indigo-200 overflow-hidden transform hover:-translate-y-1">
      {/* Module Header */}
      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <h3 className="font-bold text-gray-900 text-lg leading-tight pr-2 group-hover:text-indigo-600 transition-colors">
            {module.name}
          </h3>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${priority.border} ${priority.bg}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${priority.dot}`}></div>
            <span className={`text-xs font-semibold ${priority.text} uppercase tracking-wide`}>
              {module.priority}
            </span>
          </div>
        </div>

        {module.description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">{module.description}</p>
        )}

        {/* Progress Bar (if sub-functions exist) */}
        {totalCount > 0 && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
              <span className="font-medium">Progress</span>
              <span className="font-semibold">{completedCount}/{totalCount}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Sub-functions Toggle */}
        <button
          onClick={() => setShowSubFunctions(!showSubFunctions)}
          className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-semibold group/btn transition-colors"
        >
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${showSubFunctions ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span>Sub-functions ({subFunctions.length})</span>
        </button>
      </div>

      {/* Sub-functions List */}
      {showSubFunctions && (
        <div className="border-t border-gray-100 bg-gradient-to-br from-gray-50 to-white p-5 pt-4">
          <div className="space-y-2.5 mb-4">
            {subFunctions.map(sf => (
              <div
                key={sf.id}
                className="group/item flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all duration-200"
              >
                <input
                  type="checkbox"
                  checked={sf.status === 'completed'}
                  onChange={() => toggleSubFunctionStatus(sf.id, sf.status)}
                  className="mt-0.5 h-5 w-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 focus:ring-2 cursor-pointer transition-all"
                />
                <div className="flex-1 min-w-0">
                  <div className={`font-medium text-sm ${sf.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                    {sf.name}
                  </div>
                  {sf.description && (
                    <div className="text-xs text-gray-500 mt-1 leading-relaxed">{sf.description}</div>
                  )}
                </div>
                {sf.status === 'in_progress' && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-50 border border-amber-200">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
                    <span className="text-xs text-amber-700 font-semibold">In Progress</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add Sub-function Button */}
          {!showAddSubFunction && (
            <button
              onClick={() => setShowAddSubFunction(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border-2 border-dashed border-gray-300 text-gray-600 rounded-lg hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-200 font-medium text-sm group/add"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Sub-function</span>
            </button>
          )}

          {/* Add Sub-function Form */}
          {showAddSubFunction && (
            <div className="space-y-3 bg-indigo-50 p-4 rounded-xl border-2 border-indigo-200 animate-in fade-in duration-200">
              <input
                type="text"
                placeholder="Sub-function name"
                value={newSubFunction.name}
                onChange={(e) => setNewSubFunction({ ...newSubFunction, name: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                autoFocus
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={newSubFunction.description}
                onChange={(e) => setNewSubFunction({ ...newSubFunction, description: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddSubFunction}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-sm font-semibold hover:from-indigo-700 hover:to-purple-700 shadow-md hover:shadow-lg transition-all duration-200"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setShowAddSubFunction(false)
                    setNewSubFunction({ name: '', description: '' })
                  }}
                  className="flex-1 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
