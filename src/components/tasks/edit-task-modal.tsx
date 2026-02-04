'use client';

// Edit task modal component
import { useState, useEffect } from 'react';
import { Modal, Button, Input } from '@/components/ui';
import { EmojiPicker } from '@/components/ui/emoji-picker';
import { Task, UpdateTaskInput } from '@/types';
import { Trash2, CheckCircle2, RotateCcw } from 'lucide-react';

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
  const [emoji, setEmoji] = useState<string | undefined>(undefined);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);

  // Populate form when task changes
  useEffect(() => {
    if (task) {
      setName(task.name);
      setDescription(task.description || '');
      setColor(task.color);
      setEmoji(task.emoji || undefined);
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
        description: description.trim() || undefined,
        color,
        emoji,
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

  const handleMarkComplete = async () => {
    if (!task) return;
    
    setIsCompleting(true);
    try {
      await onUpdate(task.id, { isCompleted: true });
      setShowCompleteConfirm(false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark as completed');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleReactivate = async () => {
    if (!task) return;
    
    setIsCompleting(true);
    try {
      await onUpdate(task.id, { isCompleted: false });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reactivate habit');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleClose = () => {
    setError('');
    setShowDeleteConfirm(false);
    setShowCompleteConfirm(false);
    onClose();
  };

  if (!task) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Edit Task">
      {showDeleteConfirm ? (
        <div className="p-6 space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
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
      ) : showCompleteConfirm ? (
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3 text-green-600 dark:text-green-400">
            <CheckCircle2 className="w-8 h-8" />
            <h3 className="text-lg font-semibold">Mark Habit as Completed?</h3>
          </div>
          <p className="text-gray-700 dark:text-gray-300">
            Marking <strong>&quot;{task.name}&quot;</strong> as completed means you&apos;ve achieved your habit goal!
            All future dates will show as completed with a strikethrough.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            You can reactivate this habit later if needed.
          </p>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setShowCompleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              onClick={handleMarkComplete}
              isLoading={isCompleting}
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Complete Habit
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Completed status banner */}
          {task.isCompleted && (
            <div className="p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-medium">Habit Completed!</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReactivate}
                isLoading={isCompleting}
                className="text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/50"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Reactivate
              </Button>
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
              variant="ghost"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
            {!task.isCompleted && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowCompleteConfirm(true)}
                className="text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30"
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Complete
              </Button>
            )}
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
