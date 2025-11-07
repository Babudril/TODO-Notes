import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Clock } from 'lucide-react';

export interface NoteType {
  id: string;
  title: string;
  text: string;
  tags: string[];
  deadline: string;
  createdAt: string;
}

interface NoteProps {
  note: NoteType;
  onClick: () => void;
  isUpcoming?: boolean;
}

export function Note({ note, onClick, isUpcoming = false }: NoteProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days > 0) return `In ${days} days`;
    return `${Math.abs(days)} days ago`;
  };

  const isOverdue = new Date(note.deadline) < new Date();

  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md border-2 ${
        isUpcoming ? 'bg-primary/5 border-primary/20' : ''
      } ${isOverdue ? 'border-destructive/30' : ''}`}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="flex-1 leading-tight">{note.title}</CardTitle>
            {isUpcoming && (
              <Badge variant="secondary" className="shrink-0">
                Upcoming
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-muted-foreground line-clamp-2">{note.text}</p>
        
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4" />
          <span className={isOverdue ? 'text-destructive' : 'text-muted-foreground'}>
            {formatDate(note.deadline)}
          </span>
        </div>

        {note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {note.tags.map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                #{tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}