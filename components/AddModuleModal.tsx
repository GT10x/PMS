'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://loihxoyrutbzmqscdknk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvaWh4b3lydXRiem1xc2Nka25rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyMzg5NDMsImV4cCI6MjA3OTgxNDk0M30.OFJs18sZSBO5WNj_Ghl56W0z0QE4etNbcBgVHgIAqZw'
)

type AddModuleModalProps = {
  onClose: () => void
  onSuccess: () => void
}

export default function AddModuleModal({ onClose, onSuccess }: AddModuleModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'planning',
    priority: 'medium'
  })
  const [subFunctions, setSubFunctions] = useState<Array<{ name: string, description: string }>>([])
  const [currentSubFunction, setCurrentSubFunction] = useState({ name: '', description: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAddSubFunction = () => {
    if (!currentSubFunction.name.trim()) return

    setSubFunctions([...subFunctions, currentSubFunction])
    setCurrentSubFunction({ name: '', description: '' })
  }

  const handleRemoveSubFunction = (index: number) => {
    setSubFunctions(subFunctions.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Create module
      const { data: moduleData, error: moduleError } = await supabase
        .from('modules')
        .insert({
          name: formData.name,
          description: formData.description,
          status: formData.status,
          priority: formData.priority,
          created_by: user.id
        })
        .select()
        .single()

      if (moduleError) throw moduleError

      // Add sub-functions if any
      if (subFunctions.length > 0 && moduleData) {
        const subFunctionsData = subFunctions.map(sf => ({
          module_id: moduleData.id,
          name: sf.name,
          description: sf.description,
          created_by: user.id
        }))

        const { error: subFunctionsError } = await supabase
          .from('sub_functions')
          .insert(subFunctionsData)

        if (subFunctionsError) throw subFunctionsError
      }

      onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden" style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
        {/* Header */}
        <div className="bg-white px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Add New Module</h2>
              <p className="text-sm text-gray-500 mt-0.5">Define a module for your School ERP</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                {error}
              </div>
            )}

            {/* Module Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Module Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Student Management, Attendance System"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 transition text-sm text-gray-900"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this module..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 transition text-sm text-gray-900 resize-none"
              />
            </div>

            {/* Status and Priority */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 transition text-sm text-gray-900"
                >
                  <option value="planning">Planning</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 transition text-sm text-gray-900"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            {/* Sub-functions Section */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-medium text-gray-900">Sub-functions</h3>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                  {subFunctions.length}
                </span>
              </div>

              {/* Added Sub-functions List */}
              {subFunctions.length > 0 && (
                <div className="mb-3 space-y-2">
                  {subFunctions.map((sf, index) => (
                    <div key={index} className="flex items-start gap-2 bg-gray-50 p-3 rounded border border-gray-200">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{sf.name}</div>
                        {sf.description && (
                          <div className="text-xs text-gray-600 mt-0.5">{sf.description}</div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSubFunction(index)}
                        className="text-gray-400 hover:text-red-500 transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Sub-function Form */}
              <div className="bg-gray-50 p-3 rounded border border-gray-200">
                <div className="space-y-2">
                  <input
                    type="text"
                    value={currentSubFunction.name}
                    onChange={(e) => setCurrentSubFunction({ ...currentSubFunction, name: e.target.value })}
                    placeholder="Sub-function name (e.g., Add Student, View Attendance)"
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    value={currentSubFunction.description}
                    onChange={(e) => setCurrentSubFunction({ ...currentSubFunction, description: e.target.value })}
                    placeholder="Description (optional)"
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddSubFunction}
                    className="w-full flex items-center justify-center gap-1 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition text-sm font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Add Sub-function</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </span>
              ) : (
                'Create Module'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
