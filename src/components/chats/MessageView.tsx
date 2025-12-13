import React, { useRef, useEffect, useState } from 'react';
import { RefreshCw, MessageSquare, Clock, User, Send, Search, ChevronUp, ChevronDown, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '../ui/Button';

interface Message {
  id: number;
  message_id: string;
  thread_id: number;
  message_type: string;
  direction: string;
  text: string | null;
  sender_phone_number: string;
  sender_name: string;
  reaction?: string;
  reaction_event?: string;
  speech_text?: string;
  speech_metadata?: any;
  created_at: string;
  sent_by_team_member_id?: string;
  sent_by_team_member?: {
    full_name: string;
  };
  attachments?: {
    id: number;
    url: string;
  }[];
}

interface Thread {
  id: number;
  group_id: string;
  name: string | null;
  client_id: string | null;
  participants: string[];
  created_at: string;
  updated_at: string;
  last_read_at?: string;
}

interface MessageViewProps {
  thread: Thread | null;
  messages: Message[];
  loading: boolean;
  contactMap: Record<string, string>;
  messageInput: string;
  sendingMessage: boolean;
  onMessageInputChange: (value: string) => void;
  onSendMessage: (e: React.FormEvent) => void;
  onShowNotes: () => void;
  onShowSettings: () => void;
  scrollToBottom: boolean;
  hasMoreMessages: boolean;
  onLoadMoreMessages: () => void;
  messagesPage?: number;
  pageSize?: number;
  messageSearchQuery: string;
  messageSearchResults: Message[];
  currentSearchIndex: number;
  isSearching: boolean;
  searchResultsLoaded: boolean;
  onMessageSearch: (query: string) => void;
  onMessageSearchSubmit: () => void;
  onNavigateSearchResult: (direction: 'next' | 'prev') => void;
  onClearMessageSearch: () => void;
  selectedImages: File[];
  onImagesSelected: (files: File[]) => void;
  onRemoveImage: (index: number) => void;
  uploadingImages: boolean;
}

const EDT_TIMEZONE = 'America/New_York';

// Safe date formatting helper that validates dates before formatting
function safeFormatDateInTimeZone(dateString: string | null | undefined, opts: Intl.DateTimeFormatOptions): string {
  if (!dateString) {
    return 'Unknown';
  }
  
  try {
    // Try to parse the date string
    const date = new Date(dateString);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    // Format the valid date
    return new Intl.DateTimeFormat('en-US', { timeZone: EDT_TIMEZONE, ...opts }).format(date);
  } catch (error) {
    console.error('Error formatting date:', dateString, error);
    return 'Invalid date';
  }
}

function AttachmentPreview({ attachment, onClick }: { attachment: { id: number; url: string }, onClick: (url: string) => void }) {
  const [isImage, setIsImage] = useState<boolean | null>(null);
  useEffect(() => {
    if (/\.(jpg|jpeg|png|gif|webp)$/i.test(attachment.url)) {
      setIsImage(true);
    } else {
      const img = new window.Image();
      img.onload = () => setIsImage(true);
      img.onerror = () => setIsImage(false);
      img.src = attachment.url;
    }
  }, [attachment.url]);
  if (isImage === null) {
    return <div className="text-xs text-gray-400">Loading...</div>;
  }
  return isImage ? (
    <img
      src={attachment.url}
      alt="attachment"
      className="max-h-32 max-w-xs rounded cursor-pointer border border-gray-300"
      onClick={() => onClick(attachment.url)}
    />
  ) : (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm underline"
    >
      View Attachment
    </a>
  );
}

export function MessageView({
  thread,
  messages,
  loading,
  contactMap,
  messageInput,
  sendingMessage,
  onMessageInputChange,
  onSendMessage,
  onShowNotes,
  onShowSettings,
  scrollToBottom,
  hasMoreMessages,
  onLoadMoreMessages,
  messagesPage = 0,
  pageSize = 50,
  messageSearchQuery,
  messageSearchResults,
  currentSearchIndex,
  isSearching,
  searchResultsLoaded,
  onMessageSearch,
  onMessageSearchSubmit,
  onNavigateSearchResult,
  onClearMessageSearch,
  selectedImages,
  onImagesSelected,
  onRemoveImage,
  uploadingImages
}: MessageViewProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter((file: File) => 
      file.type.startsWith('image/')
    );
    
    if (files.length > 0) {
      onImagesSelected(files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter((file: File) => 
      file.type.startsWith('image/')
    );
    
    if (files.length > 0) {
      onImagesSelected(files);
    }
    
    // Reset input so the same file can be selected again
    if (e.target) {
      e.target.value = '';
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          files.push(file);
        }
      }
    }

    if (files.length > 0) {
      e.preventDefault(); // Prevent pasting image as text/data URL
      onImagesSelected(files);
    }
  };

  // Function to highlight search terms in text
  const highlightSearchTerm = (text: string, searchTerm: string) => {
    if (!searchTerm || !text) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <span key={index} className="bg-yellow-200 font-semibold">
          {part}
        </span>
      ) : part
    );
  };

  // Helper function to get display name from contact map
  const getDisplayName = (phone: string) => {
    return contactMap[phone] || phone;
  };

  // Auto-scroll to bottom when messages change or a new message is added
  useEffect(() => {
    if (scrollToBottom && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    
    // Auto-mark thread as read when viewing messages
    if (thread && messages.length > 0) {
      // Mark as read after a short delay to ensure user is actually viewing
      const timer = setTimeout(() => {
        // Call the database function to mark as read
        import('../../lib/supabase').then(({ supabase }) => {
          supabase.rpc('mark_thread_as_read', { thread_id_param: thread.id })
            .then(({ error }: { error: any }) => {
              if (error) {
                console.error('Error auto-marking thread as read:', error);
              } else {
                console.log('Thread auto-marked as read after viewing messages');
              }
            });
        });
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [messages, scrollToBottom]);

  if (!thread) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No thread selected</h3>
          <p className="mt-1 text-sm text-gray-500">
            Select a thread from the list to view messages
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 flex flex-col h-full overflow-hidden">
      <div className="p-4 bg-white border-b shadow-sm flex-shrink-0">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-semibold text-gray-900">
                {thread.name || `Thread #${thread.id}`}
              </h2>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSearchBar(!showSearchBar)}
                  className="flex items-center"
                >
                  <Search className="h-4 w-4 mr-1" />
                  <span>Search</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onShowNotes}
                  className="flex items-center"
                >
                  <span>Notes</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onShowSettings}
                  className="flex items-center"
                >
                  <span>Settings</span>
                </Button>
              </div>
            </div>
            {thread.participants && thread.participants.length > 0 && (
              <div className="mt-2 flex items-center text-sm text-gray-600">
                <User className="h-4 w-4 mr-2 text-gray-400" />
                <span>
                  {thread.participants
                    .map((p) => getDisplayName(p))
                    .join(', ')}
                </span>
              </div>
            )}
          </div>
          <div className="text-sm text-gray-500 flex items-center">
            <Clock className="h-4 w-4 mr-1" />
            Created{' '}
            {thread.created_at
              ? safeFormatDateInTimeZone(thread.created_at, { month: 'short', day: 'numeric', year: 'numeric' })
              : 'Unknown'}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      {showSearchBar && (
        <div className="bg-white border-b px-4 py-3 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <div className="flex-1 flex items-center space-x-2">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={messageSearchQuery}
                onChange={(e: any) => onMessageSearch(e.target.value)}
                onKeyPress={(e: any) => {
                  if (e.key === 'Enter') {
                    onMessageSearchSubmit();
                  }
                }}
                placeholder="Search messages... (Press Enter to search)"
                className="flex-1 border-0 focus:ring-0 text-sm"
                autoFocus
              />
            </div>
            
            {searchResultsLoaded && messageSearchResults.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">
                  {currentSearchIndex + 1} of {messageSearchResults.length}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigateSearchResult('prev')}
                  disabled={messageSearchResults.length <= 1}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigateSearchResult('next')}
                  disabled={messageSearchResults.length <= 1}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            )}
            
            {isSearching && (
              <div className="flex items-center">
                <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
              </div>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowSearchBar(false);
                onClearMessageSearch();
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {searchResultsLoaded && messageSearchResults.length === 0 && messageSearchQuery && (
            <div className="mt-2 text-sm text-gray-500">
              No messages found for "{messageSearchQuery}"
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 bg-gray-100" id="chat-message-container">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin">
              <RefreshCw className="h-8 w-8 text-primary" />
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center bg-white p-6 rounded-lg shadow-sm">
              <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No messages yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Start the conversation by sending a message
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {hasMoreMessages && (
              <div className="flex flex-col items-center mb-4 space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onLoadMoreMessages}
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Load more messages'}
                </Button>
                <div className="text-xs text-gray-500">
                  Loaded {messages.length} messages{hasMoreMessages ? ' (more available)' : ' (all messages loaded)'}
                </div>
              </div>
            )}
            {messages.map((message, index, allMessages) => {
              // Determine if message is outbound (sent by admin or system)
              const isOutbound = 
                message.direction === 'outbound' || 
                message.sender_phone_number === '+17865853120' ||
                message.sender_phone_number === 'team' ||
                message.sender_name === 'System';
              
             // Get display name for the message sender
             const getMessageSenderName = () => {
               // For team messages, use the team member's full name if available
               if (message.sent_by_team_member_id && message.sent_by_team_member?.full_name) {
                 return message.sent_by_team_member.full_name;
               }
               // Fallback to sender_name for team messages
               if (message.sender_phone_number === 'team' || message.sent_by_team_member_id) {
                 return message.sender_name || 'Team Member';
               }
               // For client messages, use contact map
               return getDisplayName(message.sender_phone_number);
             };

              // Check if this is a new day compared to previous message
              const showDateDivider = index === 0 || 
                (message.created_at && allMessages[index - 1].created_at &&
                 safeFormatDateInTimeZone(message.created_at, { month: 'numeric', day: 'numeric', year: 'numeric' }) !== 
                 safeFormatDateInTimeZone(allMessages[index - 1].created_at, { month: 'numeric', day: 'numeric', year: 'numeric' }));

              // Format time for display
              const formattedTime = safeFormatDateInTimeZone(message.created_at, {
                hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short'
              });

              return (
                <div key={message.id} className="flex flex-col">
                  {/* Show date divider if first message or different day */}
                  {showDateDivider && (
                    <div className="flex items-center justify-center my-4">
                      <div className="bg-gray-300 rounded-full px-3 py-1 text-xs text-gray-700 font-medium shadow-sm">
                        {message.created_at
                          ? safeFormatDateInTimeZone(message.created_at, { month: 'long', day: 'numeric', year: 'numeric' })
                          : 'Unknown date'}
                      </div>
                    </div>
                  )}

                  {/* Message bubble */}
                  <div 
                    className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      data-message-id={message.message_id}
                      className={`max-w-[70%] rounded-lg p-3 shadow-sm transition-all duration-200 ${
                        isOutbound
                          ? 'bg-primary text-white'
                          : 'bg-white text-gray-900'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">
                         {getMessageSenderName()}
                        </span>
                        <span className="text-xs opacity-75 ml-2">
                          {formattedTime}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap break-words">
                        {messageSearchQuery && searchResultsLoaded ? 
                          highlightSearchTerm(message.text || message.speech_text || '', messageSearchQuery) :
                          (message.text || message.speech_text || '')
                        }
                      </p>
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {message.attachments.map((attachment) => (
                            <div key={attachment.id}>
                              <AttachmentPreview attachment={attachment} onClick={setLightboxImage} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message Input */}
      <div 
        className="p-4 bg-white border-t relative flex-shrink-0"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag and drop overlay */}
        {isDragging && (
          <div className="absolute inset-0 bg-blue-50 bg-opacity-90 border-2 border-dashed border-blue-400 rounded-lg z-10 flex items-center justify-center">
            <div className="text-center">
              <ImageIcon className="w-12 h-12 text-blue-500 mx-auto mb-2" />
              <p className="text-blue-600 font-medium">Drop images here</p>
              <p className="text-blue-500 text-sm">Up to 3 images</p>
            </div>
          </div>
        )}

        {/* Image previews */}
        {selectedImages.length > 0 && (
          <div className="mb-3 bg-gray-50 rounded-lg p-3 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Selected Images ({selectedImages.length}/3)
              </span>
              {uploadingImages && (
                <span className="text-xs text-blue-600 flex items-center">
                  <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                  Uploading...
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedImages.map((file, index) => (
                <div key={index} className="relative group">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="w-20 h-20 object-cover rounded border border-gray-300"
                  />
                  <button
                    type="button"
                    onClick={() => onRemoveImage(index)}
                    disabled={uploadingImages}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs p-1 rounded-b truncate">
                    {file.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={onSendMessage} className="flex space-x-2">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {/* Image upload button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={sendingMessage || uploadingImages || selectedImages.length >= 3}
            className="flex items-center justify-center px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Add images (max 3)"
          >
            <ImageIcon className="h-5 w-5" />
          </button>

          <textarea
            value={messageInput}
            onChange={(e: any) => onMessageInputChange(e.target.value)}
            onKeyDown={(e: any) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSendMessage(e);
              }
            }}
            onPaste={handlePaste}
            placeholder="Type a message... (Shift+Enter for new line, Ctrl+V to paste images)"
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary resize-none"
            disabled={sendingMessage || uploadingImages}
            rows={3}
          />
          <Button
            type="submit"
            disabled={sendingMessage || uploadingImages || (!messageInput.trim() && selectedImages.length === 0)}
            className="flex items-center"
          >
            {sendingMessage || uploadingImages ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send
              </>
            )}
          </Button>
        </form>
      </div>

      {/* Lightbox for full-screen image */}
      {lightboxImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80" onClick={() => setLightboxImage(null)}>
          <img src={lightboxImage} alt="Full size" className="max-h-[90vh] max-w-[90vw] rounded shadow-lg" />
          <button
            className="absolute top-4 right-4 text-white text-3xl font-bold bg-black bg-opacity-50 rounded-full px-3 py-1"
            onClick={(e: any) => { e.stopPropagation(); setLightboxImage(null); }}
            aria-label="Close"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}