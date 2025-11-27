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
    low: { bg: 'bg-gray-100', text: 'text-gray-700' },
    medium: { bg: 'bg-blue-100', text: 'text-blue-700' },
    high: { bg: 'bg-orange-100', text: 'text-orange-700' },
    critical: { bg: 'bg-red-100', text: 'text-red-700' }
  }

  const priority = priorityConfig[module.priority as keyof typeof priorityConfig] || priorityConfig.medium
  const completedCount = subFunctions.filter(sf => sf.status === 'completed').length
  const totalCount = subFunctions.length

  return (
    <div className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
      {/* Module Header */}
      <div className="p-3">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-gray-900 text-sm leading-tight pr-2">
            {module.name}
          </h3>
          <span className={`text-xs px-2 py-0.5 rounded ${priority.bg} ${priority.text}`}>
            {module.priority}
          </span>
        </div>

        {module.description && (
          <p className="text-xs text-gray-600 mb-2 line-clamp-2">{module.description}</p>
        )}

        {/* Progress Bar */}
        {totalCount > 0 && (
          <div className="mb-2">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{completedCount}/{totalCount} completed</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Sub-functions Toggle */}
        <button
          onClick={() => setShowSubFunctions(!showSubFunctions)}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          <svg
            className={`w-3 h-3 transition-transform ${showSubFunctions ? 'rotate-90' : ''}`}
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
        <div className="border-t border-gray-200 bg-gray-50 p-3 pt-2">
          <div className="space-y-2 mb-2">
            {subFunctions.map(sf => (
              <div
                key={sf.id}
                className="flex items-start gap-2 p-2 bg-white rounded border border-gray-200"
              >
                <input
                  type="checkbox"
                  checked={sf.status === 'completed'}
                  onChange={() => toggleSubFunctionStatus(sf.id, sf.status)}
                  className="mt-0.5 h-4 w-4 text-blue-600 rounded border-gray-300 cursor-pointer"
                />
                <div className="flex-1 min-w-0">
                  <div className={`text-xs ${sf.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                    {sf.name}
                  </div>
                  {sf.description && (
                    <div className="text-xs text-gray-500 mt-0.5">{sf.description}</div>
                  )}
                </div>
                {sf.status === 'in_progress' && (
                  <span className="text-xs text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">In Progress</span>
                )}
              </div>
            ))}
          </div>

          {/* Add Sub-function Button */}
          {!showAddSubFunction && (
            <button
              onClick={() => setShowAddSubFunction(true)}
              className="w-full flex items-center justify-center gap-1 px-3 py-2 bg-white border border-dashed border-gray-300 text-gray-600 rounded hover:border-gray-400 hover:text-gray-700 transition text-xs font-medium"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Sub-function</span>
            </button>
          )}

          {/* Add Sub-function Form */}
          {showAddSubFunction && (
            <div className="space-y-2 bg-white p-2 rounded border border-gray-200">
              <input
                type="text"
                placeholder="Sub-function name"
                value={newSubFunction.name}
                onChange={(e) => setNewSubFunction({ ...newSubFunction, name: e.target.value })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={newSubFunction.description}
                onChange={(e) => setNewSubFunction({ ...newSubFunction, description: e.target.value })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <div className="flex gap-1">
                <button
                  onClick={handleAddSubFunction}
                  className="flex-1 px-2 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setShowAddSubFunction(false)
                    setNewSubFunction({ name: '', description: '' })
                  }}
                  className="flex-1 px-2 py-1.5 bg-white border border-gray-300 text-gray-700 rounded text-xs font-medium hover:bg-gray-50 transition"
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
