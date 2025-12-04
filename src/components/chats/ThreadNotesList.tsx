import React, { useState } from 'react';
import { format } from 'date-fns';
import { FileText, MessageSquare, Search } from 'lucide-react';
import type { JSX } from 'react';

interface ThreadNote {
  id: string;
  thread_id: number;
  content: string;
  source_message: string;
  message_id?: string;
  created_at: string;
}

interface ThreadNotesListProps {
  notes: ThreadNote[];
  loading: boolean;
}

export function ThreadNotesList({ notes, loading }: ThreadNotesListProps): JSX.Element {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredNotes = notes.filter(note => 
    note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.source_message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-2 text-gray-500">Loading thread notes...</p>
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <FileText className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No thread notes yet</h3>
        <p className="mt-1 text-sm text-gray-500">
          Thread notes will appear here when they are extracted from client messages
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
          placeholder="Search notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {filteredNotes.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500">No notes found matching your search</p>
        </div>
      ) : (
        filteredNotes.map((note) => (
          <div key={note.id} className="bg-gray-50 rounded-lg p-4 border-l-4 border-primary border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">
                {format(new Date(note.created_at), 'MMM d, yyyy h:mm a')}
              </span>
            </div>
            <p className="text-gray-800 font-medium mb-3">{note.content}</p>
            <div className="bg-gray-100 p-3 rounded-md">
              <p className="text-xs text-gray-500 mb-1">Source Message:</p>
              <p className="text-sm text-gray-600">{note.source_message}</p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}