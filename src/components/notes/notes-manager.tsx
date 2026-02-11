'use client';

// Notes Manager - free-form notes like Google Keep / Apple Notes
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
  MoreVertical,
  StickyNote,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { NoteData, NoteBlock } from '@/types';

// ─── Helper: generate unique block id ────────────────────────────────
function blockId() {
  return `b_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Note Editor (seamless, single-page) ─────────────────────────────
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
      const parsed = JSON.parse(note.content);
      // Ensure there's always at least one text block to type in
      if (!parsed.length) return [{ id: blockId(), type: 'text' as const, content: '' }];
      return parsed;
    } catch {
      return [{ id: blockId(), type: 'text' as const, content: '' }];
    }
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blockRefs = useRef<Map<string, HTMLTextAreaElement | HTMLInputElement>>(new Map());
  const focusBlockRef = useRef<string | null>(null);

  // Auto-save
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
          if (data.success) onUpdate(data.data);
        } catch (err) {
          console.error('Failed to save note:', err);
        } finally {
          setIsSaving(false);
        }
      }, 600);
    },
    [note.id, onUpdate]
  );

  const updateBlocks = useCallback((newBlocks: NoteBlock[]) => {
    setBlocks(newBlocks);
    triggerAutoSave(title, newBlocks);
  }, [title, triggerAutoSave]);

  // Focus newly created block
  useEffect(() => {
    if (focusBlockRef.current) {
      const el = blockRefs.current.get(focusBlockRef.current);
      if (el) {
        el.focus();
        focusBlockRef.current = null;
      }
    }
  });

  // Title change
  const handleTitleChange = (val: string) => {
    setTitle(val);
    triggerAutoSave(val, blocks);
  };

  // Insert a checklist item after a given block index (or at the end)
  const insertTodoAfter = (index: number) => {
    const newBlock: NoteBlock = { id: blockId(), type: 'todo', content: '', completed: false };
    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, newBlock);
    focusBlockRef.current = newBlock.id;
    updateBlocks(newBlocks);
  };

  // Insert image after a given block index (or at end)
  const insertImageAfter = (index: number) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const newBlock: NoteBlock = { id: blockId(), type: 'image', content: reader.result as string };
        const newBlocks = [...blocks];
        newBlocks.splice(index + 1, 0, newBlock);
        updateBlocks(newBlocks);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  // Add checklist at the end
  const addTodoAtEnd = () => insertTodoAfter(blocks.length - 1);
  // Add image at the end
  const addImageAtEnd = () => insertImageAfter(blocks.length - 1);

  // Update a block's content
  const updateBlockContent = (id: string, content: string) => {
    updateBlocks(blocks.map((b) => (b.id === id ? { ...b, content } : b)));
  };

  // Toggle todo
  const toggleTodo = (id: string) => {
    updateBlocks(blocks.map((b) => (b.id === id ? { ...b, completed: !b.completed } : b)));
  };

  // Merge adjacent text blocks into one
  const mergeAdjacentTextBlocks = (blocksList: NoteBlock[]): NoteBlock[] => {
    const merged: NoteBlock[] = [];
    for (const block of blocksList) {
      const prev = merged[merged.length - 1];
      if (prev && prev.type === 'text' && block.type === 'text') {
        // Merge into previous text block
        prev.content = prev.content
          ? block.content
            ? prev.content + '\n' + block.content
            : prev.content
          : block.content;
      } else {
        merged.push({ ...block });
      }
    }
    return merged;
  };

  // Delete a block (keep at least one text block, merge adjacent text blocks)
  const deleteBlock = (id: string) => {
    let newBlocks = blocks.filter((b) => b.id !== id);
    newBlocks = mergeAdjacentTextBlocks(newBlocks);
    if (newBlocks.length === 0) {
      newBlocks.push({ id: blockId(), type: 'text', content: '' });
    }
    updateBlocks(newBlocks);
  };

  // Handle Enter in a todo → create next todo
  const handleTodoKeyDown = (e: React.KeyboardEvent, index: number, block: NoteBlock) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (block.content.trim() === '') {
        // Empty todo + Enter → remove it and merge surrounding text blocks
        let newBlocks = blocks.filter((b) => b.id !== block.id);
        newBlocks = mergeAdjacentTextBlocks(newBlocks);
        if (newBlocks.length === 0) newBlocks.push({ id: blockId(), type: 'text', content: '' });
        // Focus the text block that now occupies this position
        const focusIdx = Math.min(index, newBlocks.length - 1);
        if (newBlocks[focusIdx]?.type === 'text') focusBlockRef.current = newBlocks[focusIdx].id;
        updateBlocks(newBlocks);
      } else {
        insertTodoAfter(index);
      }
    }
    if (e.key === 'Backspace' && block.content === '') {
      e.preventDefault();
      let newBlocks = blocks.filter((b) => b.id !== block.id);
      newBlocks = mergeAdjacentTextBlocks(newBlocks);
      if (newBlocks.length === 0) newBlocks.push({ id: blockId(), type: 'text', content: '' });
      if (index > 0) focusBlockRef.current = newBlocks[Math.min(index - 1, newBlocks.length - 1)].id;
      updateBlocks(newBlocks);
    }
  };

  // Auto-resize textarea
  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  };

  // Delete note
  const handleDeleteNote = async () => {
    try {
      await fetch(`/api/user-notes/${note.id}`, { method: 'DELETE' });
      onDelete(note.id);
      onBack();
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-10 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur-sm pb-3">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">All Notes</span>
          </button>

          <div className="flex items-center gap-1">
            {isSaving && (
              <span className="flex items-center gap-1 text-xs text-gray-400 mr-2 animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin" /> Saving
              </span>
            )}
            {/* Inline toolbar */}
            <button
              onClick={addTodoAtEnd}
              className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
              title="Add checklist"
            >
              <ListChecks className="w-4 h-4" />
            </button>
            <button
              onClick={addImageAtEnd}
              className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
              title="Add image"
            >
              <ImagePlus className="w-4 h-4" />
            </button>
            <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-all duration-200 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
              title="Delete note"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 flex items-center justify-between gap-3">
          <span className="text-sm text-red-700 dark:text-red-300">Delete this note permanently?</span>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button size="sm" variant="danger" onClick={handleDeleteNote}>Delete</Button>
          </div>
        </div>
      )}

      {/* Seamless note body */}
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 sm:p-8 overflow-y-auto">
        {/* Title */}
        <input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Title"
          className="w-full text-xl sm:text-2xl font-bold bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 mb-4"
        />

        {/* Divider */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-4" />

        {/* Blocks flow seamlessly */}
        <div className="space-y-1">
          {blocks.map((block, index) => (
            <div key={block.id} className="group relative">
              {/* Text block */}
              {block.type === 'text' && (
                <textarea
                  ref={(el) => { if (el) blockRefs.current.set(block.id, el); }}
                  value={block.content}
                  onChange={(e) => {
                    updateBlockContent(block.id, e.target.value);
                    autoResize(e.target);
                  }}
                  onFocus={(e) => autoResize(e.target)}
                  placeholder={index === 0 && blocks.length === 1 ? 'Start typing your note...' : ''}
                  className="w-full bg-transparent outline-none text-sm text-gray-700 dark:text-gray-200 placeholder-gray-300 dark:placeholder-gray-600 resize-none leading-relaxed overflow-hidden"
                  rows={1}
                  style={{ minHeight: '24px' }}
                />
              )}

              {/* Todo / checklist item */}
              {block.type === 'todo' && (
                <div className="flex items-start gap-2 py-0.5">
                  <button
                    onClick={() => toggleTodo(block.id)}
                    className={cn(
                      'flex-shrink-0 w-[18px] h-[18px] mt-[3px] rounded border-2 flex items-center justify-center transition-all',
                      block.completed
                        ? 'bg-primary-500 border-primary-500 text-white'
                        : 'border-gray-300 dark:border-gray-500 hover:border-primary-400'
                    )}
                  >
                    {block.completed && <Check className="w-3 h-3" />}
                  </button>
                  <input
                    ref={(el) => { if (el) blockRefs.current.set(block.id, el); }}
                    value={block.content}
                    onChange={(e) => updateBlockContent(block.id, e.target.value)}
                    onKeyDown={(e) => handleTodoKeyDown(e, index, block)}
                    placeholder="To-do..."
                    className={cn(
                      'flex-1 bg-transparent outline-none text-sm leading-relaxed',
                      block.completed
                        ? 'line-through text-gray-400 dark:text-gray-500'
                        : 'text-gray-700 dark:text-gray-200'
                    )}
                  />
                  <button
                    onClick={() => deleteBlock(block.id)}
                    className="flex-shrink-0 p-0.5 text-gray-300 dark:text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Image */}
              {block.type === 'image' && (
                <div className="relative my-2 rounded-xl overflow-hidden">
                  <img
                    src={block.content}
                    alt=""
                    className="w-full max-h-80 object-contain rounded-xl bg-gray-50 dark:bg-gray-900"
                  />
                  <button
                    onClick={() => deleteBlock(block.id)}
                    className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
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
