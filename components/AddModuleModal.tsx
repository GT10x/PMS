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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-primary-600 text-white px-6 py-4 rounded-t-lg">
          <h2 className="text-2xl font-bold">Add New Module</h2>
          <p className="text-primary-100 text-sm">Define a module for your School ERP</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Module Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Module Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Student Management, Attendance System"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of this module"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Status and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="planning">Planning</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          {/* Sub-functions Section */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Sub-functions</h3>

            {/* Added Sub-functions List */}
            {subFunctions.length > 0 && (
              <div className="mb-4 space-y-2">
                {subFunctions.map((sf, index) => (
                  <div key={index} className="flex items-start gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">{sf.name}</div>
                      {sf.description && (
                        <div className="text-sm text-gray-600 mt-1">{sf.description}</div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubFunction(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Sub-function Form */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="space-y-3">
                <input
                  type="text"
                  value={currentSubFunction.name}
                  onChange={(e) => setCurrentSubFunction({ ...currentSubFunction, name: e.target.value })}
                  placeholder="Sub-function name (e.g., Add Student, View Attendance)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <input
                  type="text"
                  value={currentSubFunction.description}
                  onChange={(e) => setCurrentSubFunction({ ...currentSubFunction, description: e.target.value })}
                  placeholder="Description (optional)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={handleAddSubFunction}
                  className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-sm font-medium"
                >
                  + Add Sub-function
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Module'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
