import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { X, Trash2 } from 'lucide-react';
import { NoteType } from './Note';
import { createNote, updateNote, deleteNote } from '../utils/api';

interface NoteEditorProps {
  note?: NoteType;
  accessToken: string;
  onSave: () => void;
  onCancel: () => void;
}

export function NoteEditor({ note, accessToken, onSave, onCancel }: NoteEditorProps) {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [deadline, setDeadline] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setText(note.text);
      setTags(note.tags);
      setDeadline(note.deadline.split('T')[0]); // Format for date input
    }
  }, [note]);

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase();
      if (!tags.includes(newTag)) {
        setTags([...tags, newTag]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (!deadline) {
      setError('Deadline is required');
      return;
    }

    setLoading(true);
    setError('');

    const deadlineDate = new Date(deadline);
    deadlineDate.setHours(23, 59, 59, 999); // Set to end of day

    const noteData = {
      title: title.trim(),
      text: text.trim() || '',
      tags: tags || [],
      deadline: deadlineDate.toISOString()
    };

    console.log('Saving note:', noteData);

    try {
      if (note) {
        console.log('Updating existing note:', note.id);
        await updateNote(accessToken, note.id, noteData);
      } else {
        console.log('Creating new note');
        await createNote(accessToken, noteData);
      }
      console.log('Note saved successfully');
      onSave();
    } catch (err) {
      console.error('Error saving note:', err);
      setError(err instanceof Error ? err.message : 'Failed to save note');
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!note) return;

    if (!confirm('Are you sure you want to delete this note?')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      await deleteNote(accessToken, note.id);
      onSave();
    } catch (err) {
      console.error('Error deleting note:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete note');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <Card className="max-w-md mx-auto border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{note ? 'Edit Note' : 'Create Note'}</CardTitle>
            {note && (
              <Button
                variant="destructive"
                size="icon"
                onClick={handleDelete}
                className="h-8 w-8"
                disabled={loading}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="border-2"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="text">Text</Label>
              <Textarea
                id="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="border-2 min-h-[100px]"
                placeholder="Enter your note content..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline *</Label>
              <Input
                id="deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="border-2"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="Type a tag and press Enter"
                className="border-2"
              />
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary" 
                      className="flex items-center gap-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors active:scale-95"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        removeTag(tag);
                      }}
                    >
                      #{tag}
                      <X className="w-3 h-3" />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="text-destructive text-center p-2 bg-destructive/10 rounded-md border">
                {error}
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? 'Saving...' : 'OK'}
              </Button>
              <Button type="button" variant="outline" onClick={onCancel} className="flex-1" disabled={loading}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}