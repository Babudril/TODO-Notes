import React, { useState, useMemo, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Plus, Search, Loader2 } from 'lucide-react';
import { Note, NoteType } from './Note';
import { getNotes } from '../utils/api';

interface MainPageProps {
  username: string;
  accessToken: string;
  onNoteClick: (note: NoteType) => void;
  onCreateNote: () => void;
  onAvatarClick: () => void;
  onNotesUpdate: (notes: NoteType[]) => void;
}

export function MainPage({ username, accessToken, onNoteClick, onCreateNote, onAvatarClick, onNotesUpdate }: MainPageProps) {
  const [notes, setNotes] = useState<NoteType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'time' | 'tags'>('time');

  // Fetch notes function
  const fetchNotes = async () => {
    try {
      console.log('MainPage: Starting to fetch notes...');
      setLoading(true);
      const { notes: fetchedNotes } = await getNotes(accessToken);
      console.log('MainPage: Received notes from API:', fetchedNotes);
      console.log('MainPage: Number of notes:', fetchedNotes?.length || 0);
      
      // Filter out any null or invalid notes
      const validNotes = (fetchedNotes || []).filter(note => 
        note && 
        typeof note === 'object' && 
        note.id && 
        note.title && 
        note.deadline
      );
      console.log('MainPage: Valid notes after filtering:', validNotes.length);
      console.log('MainPage: Valid notes:', validNotes);
      
      setNotes(validNotes);
      onNotesUpdate(validNotes);
      setError('');
    } catch (err) {
      console.error('MainPage: Error fetching notes:', err);
      setError('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  // Fetch notes on component mount
  useEffect(() => {
    fetchNotes();
  }, [accessToken]);

  // Get upcoming note (closest deadline that hasn't passed)
  const upcomingNote = useMemo(() => {
    if (!notes || notes.length === 0) return undefined;
    const futureNotes = notes.filter(note => 
      note && note.deadline && new Date(note.deadline) >= new Date()
    );
    if (futureNotes.length === 0) return undefined;
    return futureNotes.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())[0];
  }, [notes]);

  // Filter and sort notes
  const filteredAndSortedNotes = useMemo(() => {
    if (!notes || notes.length === 0) return [];
    
    let filtered = notes.filter(note => {
      // Ensure note is valid (text can be empty string)
      if (!note || !note.title || !note.tags) return false;
      
      const searchLower = searchQuery.toLowerCase();
      return (
        note.title.toLowerCase().includes(searchLower) ||
        (note.text && note.text.toLowerCase().includes(searchLower)) ||
        note.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    });

    // Remove the upcoming note from the main list to avoid duplication
    if (upcomingNote) {
      filtered = filtered.filter(note => note && note.id !== upcomingNote.id);
    }

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.title.localeCompare(b.title);
        case 'time':
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        case 'tags':
          const aTagsStr = (a.tags || []).join('').toLowerCase();
          const bTagsStr = (b.tags || []).join('').toLowerCase();
          return aTagsStr.localeCompare(bTagsStr);
        default:
          return 0;
      }
    });
  }, [notes, searchQuery, sortBy, upcomingNote]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b-2 p-4">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <h1>My Notes</h1>
          <Avatar className="cursor-pointer border-2" onClick={onAvatarClick}>
            <AvatarFallback>
              {username.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      <div className="p-4 max-w-md mx-auto space-y-4">
        {/* Upcoming Note */}
        {upcomingNote && (
          <div className="space-y-2">
            <h2>Upcoming</h2>
            <Note 
              note={upcomingNote} 
              onClick={() => onNoteClick(upcomingNote)} 
              isUpcoming={true}
            />
          </div>
        )}

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-2"
          />
        </div>

        {/* Sort Options */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Sort by:</span>
          <Select value={sortBy} onValueChange={(value: 'name' | 'time' | 'tags') => setSortBy(value)}>
            <SelectTrigger className="w-32 border-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="time">Time</SelectItem>
              <SelectItem value="tags">Tags</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* All Notes */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2>All Notes</h2>
            <span className="text-muted-foreground">
              {filteredAndSortedNotes.length} notes
            </span>
          </div>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">
              {error}
            </div>
          ) : filteredAndSortedNotes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'No notes found' : 'No notes yet'}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAndSortedNotes.map((note) => (
                <Note key={note.id} note={note} onClick={() => onNoteClick(note)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Button */}
      <Button
        onClick={onCreateNote}
        size="icon"
        className="fixed bottom-6 right-4 w-14 h-14 rounded-full shadow-lg"
      >
        <Plus className="w-6 h-6" />
      </Button>
    </div>
  );
}