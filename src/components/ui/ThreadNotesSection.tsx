import React, { useState } from 'react';
import { MessageSquare, FileText, Search, Calendar, Hash, ChevronDown, ChevronUp } from 'lucide-react';

interface ThreadNote {
  id: string;
  thread_id: number;
  content: string;
  source_message: string;
  message_id?: string;
  created_at: string;
  thread?: {
    id: number;
    group_id: string;
    name: string | null;
  };
}

interface ThreadNotesSectionProps {
  threadNotes: ThreadNote[];
  loading: boolean;
  error: string | null;
  clientUsername: string;
}

const ThreadNotesSection: React.FC<ThreadNotesSectionProps> = ({ 
  threadNotes, 
  loading, 
  error, 
  clientUsername 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [showAllNotes, setShowAllNotes] = useState(false);

  const filteredNotes = threadNotes.filter(note =>
    note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.source_message.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (note.thread?.name && note.thread.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const displayedNotes = showAllNotes ? filteredNotes : filteredNotes.slice(0, 5);

  const toggleNoteExpansion = (noteId: string) => {
    const newExpanded = new Set(expandedNotes);
    if (newExpanded.has(noteId)) {
      newExpanded.delete(noteId);
    } else {
      newExpanded.add(noteId);
    }
    setExpandedNotes(newExpanded);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
              <MessageSquare className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Chat Notes</h2>
              <p className="text-gray-600 text-sm">AI-extracted insights from conversations</p>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading chat notes...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
              <MessageSquare className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Chat Notes</h2>
              <p className="text-gray-600 text-sm">AI-extracted insights from conversations</p>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">Error loading chat notes: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
              <MessageSquare className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Chat Notes</h2>
              <p className="text-gray-600 text-sm">AI-extracted insights from @{clientUsername}'s conversations</p>
            </div>
          </div>
          
          {threadNotes.length > 0 && (
            <div className="text-sm text-gray-500">
              {threadNotes.length} note{threadNotes.length !== 1 ? 's' : ''} found
            </div>
          )}
        </div>
      </div>
      
      <div className="p-6">
        {threadNotes.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No chat notes yet</h3>
            <p className="text-gray-600">
              Chat notes will appear here when AI extracts insights from @{clientUsername}'s conversations.
            </p>
          </div>
        ) : (
          <>
            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search chat notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Notes List */}
            <div className="space-y-4">
              {displayedNotes.map((note) => {
                const isExpanded = expandedNotes.has(note.id);
                const shouldTruncate = note.source_message.length > 200;
                
                return (
                  <div key={note.id} className="bg-gray-50 rounded-lg p-4 border border-gray-100 hover:shadow-sm transition-shadow">
                    {/* Note Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center">
                        <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                          <Hash className="w-3 h-3 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {note.thread?.name || `Thread #${note.thread_id}`}
                          </div>
                          <div className="flex items-center text-xs text-gray-500">
                            <Calendar className="w-3 h-3 mr-1" />
                            {formatDate(note.created_at)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Note Content */}
                    <div className="mb-3">
                      <p className="text-gray-800 font-medium leading-relaxed">
                        {note.content}
                      </p>
                    </div>

                    {/* Source Message */}
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Source Message
                        </span>
                        {shouldTruncate && (
                          <button
                            onClick={() => toggleNoteExpansion(note.id)}
                            className="flex items-center text-xs text-blue-600 hover:text-blue-800"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="w-3 h-3 mr-1" />
                                Show Less
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-3 h-3 mr-1" />
                                Show More
                              </>
                            )}
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {isExpanded || !shouldTruncate 
                          ? note.source_message 
                          : truncateText(note.source_message, 200)
                        }
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Show More/Less Button */}
            {filteredNotes.length > 5 && (
              <div className="mt-6 text-center">
                <button
                  onClick={() => setShowAllNotes(!showAllNotes)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {showAllNotes ? (
                    <>
                      <ChevronUp className="w-4 h-4 mr-2" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4 mr-2" />
                      Show All {filteredNotes.length} Notes
                    </>
                  )}
                </button>
              </div>
            )}

            {/* No Results */}
            {searchTerm && filteredNotes.length === 0 && (
              <div className="text-center py-8">
                <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No matching notes</h3>
                <p className="text-gray-600">
                  No chat notes match "{searchTerm}". Try adjusting your search.
                </p>
                <button
                  onClick={() => setSearchTerm('')}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Clear Search
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ThreadNotesSection;