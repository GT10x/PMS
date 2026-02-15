'use client';

import { useState } from 'react';

interface ReminderFormProps {
  onSave: (data: { reminder_date: string; cadence: string; note: string }) => Promise<void>;
  onCancel: () => void;
  initial?: { reminder_date?: string; cadence?: string; note?: string };
}

export default function ReminderForm({ onSave, onCancel, initial }: ReminderFormProps) {
  const [date, setDate] = useState(initial?.reminder_date || '');
  const [cadence, setCadence] = useState(initial?.cadence || 'once');
  const [note, setNote] = useState(initial?.note || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!date) { alert('Please select a date'); return; }
    setSaving(true);
    await onSave({ reminder_date: date, cadence, note });
    setSaving(false);
  };

  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Reminder Date *</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Repeat</label>
          <select value={cadence} onChange={e => setCadence(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white text-sm">
            <option value="once">Once</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Note</label>
        <input type="text" value={note} onChange={e => setNote(e.target.value)}
          placeholder="e.g. Follow up on proposal" className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white text-sm" />
      </div>
      <div className="flex gap-2">
        <button onClick={handleSubmit} disabled={saving}
          className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 text-sm">
          {saving ? 'Saving...' : 'Save Reminder'}
        </button>
        <button onClick={onCancel} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm">
          Cancel
        </button>
      </div>
    </div>
  );
}
