'use client';

// Add task modal component
import { useState } from 'react';
import { Modal, Button, Input } from '@/components/ui';
import { EmojiPicker } from '@/components/ui/emoji-picker';
import { CreateTaskInput } from '@/types';

// Preset colors for tasks
const PRESET_COLORS = [
  '#0ea5e9', // Primary blue
  '#22c55e', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
];

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (task: CreateTaskInput) => Promise<void>;
}

export function AddTaskModal({ isOpen, onClose, onAdd }: AddTaskModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [emoji, setEmoji] = useState<string | undefined>(undefined);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Task name is required');
      return;
    }

    setIsLoading(true);

    try {
      await onAdd({
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        emoji,
      });
      
      // Reset form and close
      setName('');
      setDescription('');
      setColor(PRESET_COLORS[0]);
      setEmoji(undefined);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setColor(PRESET_COLORS[0]);
    setEmoji(undefined);
    setError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add New Task">
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        <Input
          label="Task Name"
          placeholder="e.g., Exercise, Read, Meditate"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />

        <Input
          label="Description (optional)"
          placeholder="Add some details..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <EmojiPicker value={emoji} onChange={setEmoji} />

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Color
          </label>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((presetColor) => (
              <button
                key={presetColor}
                type="button"
                onClick={() => setColor(presetColor)}
                className={`w-8 h-8 rounded-lg transition-all ${
                  color === presetColor
                    ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-gray-500 dark:ring-offset-gray-800 scale-110'
                    : 'hover:scale-105'
                }`}
                style={{ backgroundColor: presetColor }}
                aria-label={`Select color ${presetColor}`}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1"
            isLoading={isLoading}
          >
            Add Task
          </Button>
        </div>
      </form>
    </Modal>
  );
}
