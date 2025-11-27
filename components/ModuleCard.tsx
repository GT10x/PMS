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

  const priorityColors = {
    low: 'bg-gray-100 text-gray-700',
    medium: 'bg-blue-100 text-blue-700',
    high: 'bg-orange-100 text-orange-700',
    critical: 'bg-red-100 text-red-700'
  }

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 border border-gray-200">
      {/* Module Header */}
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-gray-800 text-lg">{module.name}</h3>
          <span className={`text-xs px-2 py-1 rounded-full ${priorityColors[module.priority as keyof typeof priorityColors]}`}>
            {module.priority}
          </span>
        </div>

        {module.description && (
          <p className="text-sm text-gray-600 mb-3">{module.description}</p>
        )}

        {/* Sub-functions Toggle */}
        <button
          onClick={() => setShowSubFunctions(!showSubFunctions)}
          className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
        >
          {showSubFunctions ? '▼' : '▶'} Sub-functions ({subFunctions.length})
        </button>
      </div>

      {/* Sub-functions List */}
      {showSubFunctions && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="space-y-2 mb-3">
            {subFunctions.map(sf => (
              <div
                key={sf.id}
                className="flex items-start gap-2 text-sm p-2 bg-white rounded border border-gray-200"
              >
                <input
                  type="checkbox"
                  checked={sf.status === 'completed'}
                  onChange={() => toggleSubFunctionStatus(sf.id, sf.status)}
                  className="mt-1 h-4 w-4 text-primary-600 rounded cursor-pointer"
                />
                <div className="flex-1">
                  <div className={`font-medium ${sf.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                    {sf.name}
                  </div>
                  {sf.description && (
                    <div className="text-xs text-gray-500 mt-1">{sf.description}</div>
                  )}
                </div>
                {sf.status === 'in_progress' && (
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                    In Progress
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Add Sub-function Button */}
          {!showAddSubFunction && (
            <button
              onClick={() => setShowAddSubFunction(true)}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium w-full text-left"
            >
              + Add Sub-function
            </button>
          )}

          {/* Add Sub-function Form */}
          {showAddSubFunction && (
            <div className="space-y-2 bg-white p-3 rounded border border-primary-200">
              <input
                type="text"
                placeholder="Sub-function name"
                value={newSubFunction.name}
                onChange={(e) => setNewSubFunction({ ...newSubFunction, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={newSubFunction.description}
                onChange={(e) => setNewSubFunction({ ...newSubFunction, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddSubFunction}
                  className="flex-1 px-3 py-1.5 bg-primary-600 text-white rounded text-sm hover:bg-primary-700"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setShowAddSubFunction(false)
                    setNewSubFunction({ name: '', description: '' })
                  }}
                  className="flex-1 px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
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
