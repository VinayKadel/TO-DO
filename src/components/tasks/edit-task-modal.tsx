'use client';

// Edit task modal component
import { useState, useEffect } from 'react';
import { Modal, Button, Input } from '@/components/ui';
import { Task, UpdateTaskInput } from '@/types';
import { Trash2 } from 'lucide-react';

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

interface EditTaskModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (taskId: string, data: UpdateTaskInput) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
}

export function EditTaskModal({ task, isOpen, onClose, onUpdate, onDelete }: EditTaskModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Populate form when task changes
  useEffect(() => {
    if (task) {
      setName(task.name);
      setDescription(task.description || '');
      setColor(task.color);
    }
  }, [task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;
    
    setError('');

    if (!name.trim()) {
      setError('Task name is required');
      return;
    }

    setIsLoading(true);

    try {
      await onUpdate(task.id, {
        name: name.trim(),
        description: description.trim() || null,
        color,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    
    setIsDeleting(true);
    try {
      await onDelete(task.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleClose = () => {
    setError('');
    setShowDeleteConfirm(false);
    onClose();
  };

  if (!task) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Edit Task">
      {showDeleteConfirm ? (
        <div className="p-6 space-y-4">
          <p className="text-gray-700">
            Are you sure you want to delete <strong>&quot;{task.name}&quot;</strong>? 
            This will remove all completion history for this task.
          </p>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              className="flex-1"
              onClick={handleDelete}
              isLoading={isDeleting}
            >
              Delete
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
                      ? 'ring-2 ring-offset-2 ring-gray-400 scale-110'
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
              variant="ghost"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
            <div className="flex-1" />
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isLoading}
            >
              Save
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
