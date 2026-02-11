'use client';

// Notes Manager - free-form notes with cards, rich content (text, todos, images)
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus,
  Trash2,
  ArrowLeft,
  Loader2,
  Check,
  X,
  ImagePlus,
  ListChecks,
  Type,
  MoreVertical,
  StickyNote,
  Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { NoteData, NoteBlock } from '@/types';

// ─── Helper: generate unique block id ────────────────────────────────
function blockId() {
  return `b_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Note Editor ─────────────────────────────────────────────────────
function NoteEditor({
  note,
  onBack,
  onUpdate,
  onDelete,
}: {
  note: NoteData;
  onBack: () => void;
  onUpdate: (note: NoteData) => void;
  onDelete: (id: string) => void;
}) {
  const [title, setTitle] = useState(note.title);
  const [blocks, setBlocks] = useState<NoteBlock[]>(() => {
    try {
      return JSON.parse(note.content);
    } catch {
      return [];
    }
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Auto-save with debounce
  const triggerAutoSave = useCallback(
    (newTitle: string, newBlocks: NoteBlock[]) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        setIsSaving(true);
        try {
          const res = await fetch(`/api/user-notes/${note.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: newTitle,
              content: JSON.stringify(newBlocks),
            }),
          });
          const data = await res.json();
          if (data.success) {
            onUpdate(data.data);
          }
        } catch (err) {
          console.error('Failed to save note:', err);
        } finally {
          setIsSaving(false);
        }
      }, 600);
    },
    [note.id, onUpdate]
  );

  // Update title
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    triggerAutoSave(newTitle, blocks);
  };

  // Update blocks
  const updateBlocks = (newBlocks: NoteBlock[]) => {
    setBlocks(newBlocks);
    triggerAutoSave(title, newBlocks);
  };

  // Add a text block
  const addTextBlock = () => {
    updateBlocks([...blocks, { id: blockId(), type: 'text', content: '' }]);
  };

  // Add a todo block
  const addTodoBlock = () => {
    updateBlocks([
      ...blocks,
      { id: blockId(), type: 'todo', content: '', completed: false },
    ]);
  };

  // Add image block via file picker
  const addImageBlock = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        updateBlocks([
          ...blocks,
          { id: blockId(), type: 'image', content: dataUrl },
        ]);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  // Update a block's content
  const updateBlockContent = (id: string, content: string) => {
    updateBlocks(
      blocks.map((b) => (b.id === id ? { ...b, content } : b))
    );
  };

  // Toggle todo completion
  const toggleTodoBlock = (id: string) => {
    updateBlocks(
      blocks.map((b) =>
        b.id === id ? { ...b, completed: !b.completed } : b
      )
    );
  };

  // Delete a block
  const deleteBlock = (id: string) => {
    updateBlocks(blocks.filter((b) => b.id !== id));
  };

  // Handle delete note
  const handleDeleteNote = async () => {
    try {
      await fetch(`/api/user-notes/${note.id}`, { method: 'DELETE' });
      onDelete(note.id);
      onBack();
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [editingTitle]);

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">All Notes</span>
        </button>

        <div className="flex items-center gap-2">
          {isSaving && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Loader2 className="w-3 h-3 animate-spin" /> Saving...
            </span>
          )}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
            title="Delete note"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 flex items-center justify-between gap-3">
          <span className="text-sm text-red-700 dark:text-red-300">
            Delete this note permanently?
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={handleDeleteNote}
            >
              Delete
            </Button>
          </div>
        </div>
      )}

      {/* Title */}
      <div className="mb-6">
        {editingTitle ? (
          <input
            ref={titleInputRef}
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            onBlur={() => setEditingTitle(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setEditingTitle(false);
            }}
            className="w-full text-2xl sm:text-3xl font-bold bg-transparent border-b-2 border-primary-400 dark:border-primary-500 outline-none text-gray-900 dark:text-white pb-1"
            placeholder="Note title..."
          />
        ) : (
          <button
            onClick={() => setEditingTitle(true)}
            className="group flex items-center gap-2 w-full text-left"
          >
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              {title || 'Untitled'}
            </h1>
            <Pencil className="w-4 h-4 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        )}
      </div>

      {/* Content blocks */}
      <div className="flex-1 space-y-3 pb-24">
        {blocks.length === 0 && (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">
            <Type className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm">
              Start adding content using the buttons below
            </p>
          </div>
        )}

        {blocks.map((block) => (
          <div key={block.id} className="group relative">
            {/* Delete block button */}
            <button
              onClick={() => deleteBlock(block.id)}
              className="absolute -right-2 -top-2 z-10 p-1 bg-white dark:bg-gray-800 rounded-full shadow border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>

            {block.type === 'text' && (
              <textarea
                value={block.content}
                onChange={(e) =>
                  updateBlockContent(block.id, e.target.value)
                }
                placeholder="Write something..."
                className="w-full min-h-[80px] p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-y focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 dark:focus:border-primary-600 transition-all text-sm leading-relaxed"
                style={{
                  height: 'auto',
                  minHeight: `${Math.max(80, (block.content.split('\n').length + 1) * 24)}px`,
                }}
              />
            )}

            {block.type === 'todo' && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => toggleTodoBlock(block.id)}
                  className={cn(
                    'flex-shrink-0 w-5 h-5 mt-0.5 rounded-md border-2 flex items-center justify-center transition-all',
                    block.completed
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'border-gray-300 dark:border-gray-600 hover:border-primary-500'
                  )}
                >
                  {block.completed && <Check className="w-3 h-3" />}
                </button>
                <input
                  value={block.content}
                  onChange={(e) =>
                    updateBlockContent(block.id, e.target.value)
                  }
                  placeholder="To-do item..."
                  className={cn(
                    'flex-1 bg-transparent outline-none text-sm',
                    block.completed
                      ? 'line-through text-gray-400 dark:text-gray-500'
                      : 'text-gray-900 dark:text-white'
                  )}
                />
              </div>
            )}

            {block.type === 'image' && (
              <div className="rounded-xl overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <img
                  src={block.content}
                  alt="Note image"
                  className="w-full max-h-96 object-contain"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Floating action bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20">
        <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
          <button
            onClick={addTextBlock}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
            title="Add text"
          >
            <Type className="w-4 h-4" />
            <span className="hidden sm:inline">Text</span>
          </button>
          <button
            onClick={addTodoBlock}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
            title="Add to-do"
          >
            <ListChecks className="w-4 h-4" />
            <span className="hidden sm:inline">To-Do</span>
          </button>
          <button
            onClick={addImageBlock}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
            title="Add image"
          >
            <ImagePlus className="w-4 h-4" />
            <span className="hidden sm:inline">Image</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Create Note Dialog ──────────────────────────────────────────────
function CreateNoteDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (title: string) => void;
}) {
  const [title, setTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) onCreate(title.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Create New Note
        </h2>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Give your note a title..."
            className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 dark:focus:border-primary-600 outline-none text-sm"
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim()}>
              Create
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Notes Manager ──────────────────────────────────────────────
export function NotesManager() {
  const [notes, setNotes] = useState<NoteData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Load notes
  const loadNotes = useCallback(async () => {
    try {
      const res = await fetch('/api/user-notes');
      const data = await res.json();
      if (data.success) setNotes(data.data);
    } catch (err) {
      console.error('Failed to load notes:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // Create note
  const handleCreate = async (title: string) => {
    setShowCreate(false);
    try {
      const res = await fetch('/api/user-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content: '[]' }),
      });
      const data = await res.json();
      if (data.success) {
        setNotes((prev) => [...prev, data.data]);
        setActiveNoteId(data.data.id); // Open the new note immediately
      }
    } catch (err) {
      console.error('Failed to create note:', err);
    }
  };

  // Update note in state
  const handleUpdate = (updatedNote: NoteData) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === updatedNote.id ? updatedNote : n))
    );
  };

  // Delete note
  const handleDelete = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (activeNoteId === id) setActiveNoteId(null);
  };

  // Delete from card grid (via menu)
  const handleDeleteFromGrid = async (id: string) => {
    setOpenMenuId(null);
    try {
      await fetch(`/api/user-notes/${id}`, { method: 'DELETE' });
      handleDelete(id);
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    if (!openMenuId) return;
    const handleClick = () => setOpenMenuId(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [openMenuId]);

  // If a note is open, show the editor
  const activeNote = notes.find((n) => n.id === activeNoteId);
  if (activeNote) {
    return (
      <NoteEditor
        key={activeNote.id}
        note={activeNote}
        onBack={() => setActiveNoteId(null)}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />
    );
  }

  // ─── Card Grid View ─────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            Notes
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {notes.length} {notes.length === 1 ? 'note' : 'notes'}
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Note</span>
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && notes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500">
          <StickyNote className="w-12 h-12 mb-4 opacity-40" />
          <p className="text-lg font-medium mb-1">No notes yet</p>
          <p className="text-sm mb-4">Create your first note to get started</p>
          <Button
            variant="ghost"
            onClick={() => setShowCreate(true)}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Note
          </Button>
        </div>
      )}

      {/* Cards Grid */}
      {!isLoading && notes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map((note) => {
            let blocks: NoteBlock[] = [];
            try {
              blocks = JSON.parse(note.content);
            } catch {}

            // Preview: first text block content or todo items
            const textPreview = blocks
              .filter((b) => b.type === 'text' && b.content)
              .map((b) => b.content)
              .join(' ')
              .slice(0, 120);
            const todoCount = blocks.filter((b) => b.type === 'todo').length;
            const todoDone = blocks.filter(
              (b) => b.type === 'todo' && b.completed
            ).length;
            const hasImage = blocks.some((b) => b.type === 'image');

            return (
              <button
                key={note.id}
                onClick={() => setActiveNoteId(note.id)}
                className={cn(
                  'group relative text-left w-full p-5 rounded-2xl',
                  'bg-white dark:bg-gray-800',
                  'border border-gray-100 dark:border-gray-700',
                  'shadow-sm hover:shadow-lg transition-all duration-200',
                  'hover:border-primary-200 dark:hover:border-primary-800',
                  'hover:-translate-y-0.5'
                )}
              >
                {/* Menu button */}
                <div
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(openMenuId === note.id ? null : note.id);
                    }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {openMenuId === note.id && (
                    <div className="absolute right-0 top-8 w-36 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-20 overflow-hidden">
                      <button
                        onClick={() => handleDeleteFromGrid(note.id)}
                        className="w-full px-4 py-2.5 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                {/* Card content */}
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2 pr-8 line-clamp-1">
                  {note.title}
                </h3>

                {textPreview && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3 mb-3">
                    {textPreview}
                  </p>
                )}

                {/* Metadata */}
                <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500 mt-auto">
                  {todoCount > 0 && (
                    <span className="flex items-center gap-1">
                      <ListChecks className="w-3.5 h-3.5" />
                      {todoDone}/{todoCount}
                    </span>
                  )}
                  {hasImage && (
                    <span className="flex items-center gap-1">
                      <ImagePlus className="w-3.5 h-3.5" />
                      Image
                    </span>
                  )}
                  <span className="ml-auto">
                    {new Date(note.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Create dialog */}
      {showCreate && (
        <CreateNoteDialog
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}
