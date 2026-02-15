'use client';

import { useState } from 'react';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface TagManagerProps {
  allTags: Tag[];
  selectedTagIds: string[];
  onTagsChange: (tagIds: string[]) => void;
  onCreateTag: (name: string, color: string) => Promise<Tag | null>;
}

const TAG_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export default function TagManager({ allTags, selectedTagIds, onTagsChange, onCreateTag }: TagManagerProps) {
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#3b82f6');
  const [creating, setCreating] = useState(false);

  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onTagsChange(selectedTagIds.filter(id => id !== tagId));
    } else {
      onTagsChange([...selectedTagIds, tagId]);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const tag = await onCreateTag(newName.trim(), newColor);
    if (tag) {
      onTagsChange([...selectedTagIds, tag.id]);
      setNewName('');
      setShowNew(false);
    }
    setCreating(false);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {allTags.map(tag => (
          <button
            key={tag.id}
            onClick={() => toggleTag(tag.id)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              selectedTagIds.includes(tag.id)
                ? 'ring-2 ring-offset-1 ring-gray-400 dark:ring-gray-500'
                : 'opacity-60 hover:opacity-100'
            }`}
            style={{ backgroundColor: tag.color + '20', color: tag.color, borderColor: tag.color }}
          >
            {selectedTagIds.includes(tag.id) && <i className="fas fa-check mr-1 text-[10px]"></i>}
            {tag.name}
          </button>
        ))}
        <button
          onClick={() => setShowNew(!showNew)}
          className="px-3 py-1 rounded-full text-xs font-medium border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 hover:border-indigo-400 hover:text-indigo-500 transition-colors"
        >
          <i className="fas fa-plus mr-1"></i> New Tag
        </button>
      </div>

      {showNew && (
        <div className="flex items-center gap-2 mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Tag name..."
            className="flex-1 px-3 py-1.5 text-sm border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
          />
          <div className="flex gap-1">
            {TAG_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className={`w-6 h-6 rounded-full ${newColor === c ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <button
            onClick={handleCreate}
            disabled={creating || !newName.trim()}
            className="px-3 py-1.5 bg-indigo-500 text-white text-sm rounded-lg hover:bg-indigo-600 disabled:opacity-50"
          >
            {creating ? '...' : 'Add'}
          </button>
        </div>
      )}
    </div>
  );
}
