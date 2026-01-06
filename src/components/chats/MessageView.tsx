import React, { useRef, useEffect, useState } from 'react';
import { RefreshCw, MessageSquare, Clock, Send, Search, ChevronUp, ChevronDown, X, Image as ImageIcon, FileText, StickyNote, Settings } from 'lucide-react';

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

function safeFormatDateInTimeZone(dateString: string | null | undefined, opts: Intl.DateTimeFormatOptions): string {
  if (!dateString) return 'Unknown';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    return new Intl.DateTimeFormat('en-US', { timeZone: EDT_TIMEZONE, ...opts }).format(date);
  } catch {
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
    return <div className="text-xs text-slate-400 animate-pulse">Loading...</div>;
  }

  return isImage ? (
    <img
      src={attachment.url}
      alt="attachment"
      className="max-h-40 max-w-xs rounded-lg cursor-pointer border border-slate-200 hover:border-slate-300 transition-all duration-200 shadow-sm hover:shadow-md"
      onClick={() => onClick(attachment.url)}
    />
  ) : (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 underline decoration-blue-300 hover:decoration-blue-500 transition-colors"
    >
      <FileText className="w-4 h-4" />
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
    const files = Array.from(e.dataTransfer.files).filter((file: File) => file.type.startsWith('image/'));
    if (files.length > 0) onImagesSelected(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter((file: File) => file.type.startsWith('image/'));
    if (files.length > 0) onImagesSelected(files);
    if (e.target) e.target.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      onImagesSelected(files);
    }
  };

  const highlightSearchTerm = (text: string, searchTerm: string) => {
    if (!searchTerm || !text) return text;
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, index) => 
      regex.test(part) ? (
        <span key={index} className="bg-amber-200 text-amber-900 font-medium px-0.5 rounded">{part}</span>
      ) : part
    );
  };

  const getDisplayName = (phone: string) => contactMap[phone] || phone;

  useEffect(() => {
    if (scrollToBottom && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    if (thread && messages.length > 0) {
      const timer = setTimeout(() => {
        import('../../lib/supabase').then(({ supabase }) => {
          supabase.rpc('mark_thread_as_read', { thread_id_param: thread.id })
            .then(({ error }: { error: any }) => {
              if (error) console.error('Error auto-marking thread as read:', error);
            });
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [messages, scrollToBottom]);

  // Empty state when no thread selected
  if (!thread) {
    return (
      <div className="flex-1 bg-gradient-to-br from-slate-50 via-slate-100 to-blue-50 flex items-center justify-center">
        <div className="text-center px-6">
          <div className="w-20 h-20 bg-white rounded-3xl shadow-lg flex items-center justify-center mx-auto mb-6 animate-float">
            <MessageSquare className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No thread selected</h3>
          <p className="text-sm text-slate-500 max-w-xs">
            Select a thread from the list to view messages
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-100 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 flex-shrink-0">
        <div className="px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-slate-800 truncate">
                  {thread.name || `Thread #${thread.id}`}
                </h2>
              </div>
              {thread.participants && thread.participants.length > 0 && (
                <p className="mt-1 text-xs text-slate-500 truncate">
                  {thread.participants.map((p) => getDisplayName(p)).join(', ')}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={() => setShowSearchBar(!showSearchBar)}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  showSearchBar 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                }`}
                title="Search messages"
              >
                <Search className="w-4 h-4" />
              </button>
              <button
                onClick={onShowNotes}
                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all duration-200"
                title="Notes"
              >
                <StickyNote className="w-4 h-4" />
              </button>
              <button
                onClick={onShowSettings}
                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all duration-200"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
              <div className="h-5 w-px bg-slate-200 mx-1"></div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                <span>Created {safeFormatDateInTimeZone(thread.created_at, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        {showSearchBar && (
          <div className="px-5 pb-4 border-t border-slate-100 pt-3 bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={messageSearchQuery}
                  onChange={(e: any) => onMessageSearch(e.target.value)}
                  onKeyPress={(e: any) => { if (e.key === 'Enter') onMessageSearchSubmit(); }}
                  placeholder="Search messages..."
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                  autoFocus
                />
              </div>
              
              {searchResultsLoaded && messageSearchResults.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500 bg-slate-200 px-2 py-1 rounded-md">
                    {currentSearchIndex + 1}/{messageSearchResults.length}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => onNavigateSearchResult('prev')}
                      disabled={messageSearchResults.length <= 1}
                      className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-md transition-colors disabled:opacity-40"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onNavigateSearchResult('next')}
                      disabled={messageSearchResults.length <= 1}
                      className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-md transition-colors disabled:opacity-40"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
              
              {isSearching && <RefreshCw className="w-4 h-4 text-slate-400 animate-spin" />}
              
              <button
                onClick={() => { setShowSearchBar(false); onClearMessageSearch(); }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {searchResultsLoaded && messageSearchResults.length === 0 && messageSearchQuery && (
              <p className="mt-2 text-xs text-slate-500">
                No messages found for "{messageSearchQuery}"
              </p>
            )}
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4" id="chat-message-container">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-12 h-12 border-3 border-slate-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>
            <p className="text-sm text-slate-500">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center bg-white rounded-2xl shadow-sm p-8 max-w-sm">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-base font-semibold text-slate-700 mb-1">No messages yet</h3>
              <p className="text-sm text-slate-500">Start the conversation by sending a message below</p>
            </div>
          </div>
        ) : (
          <div className="space-y-1 max-w-4xl mx-auto">
            {/* Load More Button */}
            {hasMoreMessages && (
              <div className="flex justify-center mb-6">
                <button
                  onClick={onLoadMoreMessages}
                  disabled={loading}
                  className="px-4 py-2 text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-full shadow-sm transition-all duration-200 disabled:opacity-60"
                >
                  {loading ? 'Loading...' : `Load older messages`}
                </button>
              </div>
            )}

            {messages.map((message, index, allMessages) => {
              const isOutbound = 
                message.direction === 'outbound' || 
                message.sender_phone_number === '+17865853120' ||
                message.sender_phone_number === 'team' ||
                message.sender_name === 'System';
              
              const getMessageSenderName = () => {
                if (message.sent_by_team_member_id && message.sent_by_team_member?.full_name) {
                  return message.sent_by_team_member.full_name;
                }
                if (message.sender_phone_number === 'team' || message.sent_by_team_member_id) {
                  return message.sender_name || 'Team Member';
                }
                return getDisplayName(message.sender_phone_number);
              };

              const showDateDivider = index === 0 || 
                (message.created_at && allMessages[index - 1].created_at &&
                 safeFormatDateInTimeZone(message.created_at, { month: 'numeric', day: 'numeric', year: 'numeric' }) !== 
                 safeFormatDateInTimeZone(allMessages[index - 1].created_at, { month: 'numeric', day: 'numeric', year: 'numeric' }));

              const formattedTime = safeFormatDateInTimeZone(message.created_at, {
                hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short'
              });

              return (
                <div key={message.id}>
                  {/* Date Divider */}
                  {showDateDivider && (
                    <div className="flex items-center justify-center my-6">
                      <div className="bg-white shadow-sm border border-slate-200 rounded-full px-4 py-1.5">
                        <span className="text-xs font-medium text-slate-600">
                          {safeFormatDateInTimeZone(message.created_at, { month: 'long', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div className={`flex mb-3 ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                    <div
                      data-message-id={message.message_id}
                      className={`relative max-w-[75%] rounded-2xl px-4 py-3 shadow-sm transition-all duration-200 message-bubble ${
                        isOutbound
                          ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-md'
                          : 'bg-white text-slate-800 border border-slate-200 rounded-bl-md'
                      }`}
                    >
                      <div className={`flex items-center gap-2 mb-1 ${isOutbound ? 'justify-between' : 'justify-between'}`}>
                        <span className={`text-xs font-semibold ${isOutbound ? 'text-white/90' : 'text-slate-700'}`}>
                          {getMessageSenderName()}
                        </span>
                        <span className={`text-[10px] ${isOutbound ? 'text-white/70' : 'text-slate-400'}`}>
                          {formattedTime}
                        </span>
                      </div>
                      <p className={`text-sm whitespace-pre-wrap break-words leading-relaxed ${isOutbound ? 'text-white' : 'text-slate-700'}`}>
                        {messageSearchQuery && searchResultsLoaded 
                          ? highlightSearchTerm(message.text || message.speech_text || '', messageSearchQuery)
                          : (message.text || message.speech_text || '')
                        }
                      </p>
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {message.attachments.map((attachment) => (
                            <AttachmentPreview key={attachment.id} attachment={attachment} onClick={setLightboxImage} />
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

      {/* Message Input Area */}
      <div 
        className="bg-white border-t border-slate-200 p-4 flex-shrink-0"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag overlay */}
        {isDragging && (
          <div className="absolute inset-4 bg-blue-50/95 border-2 border-dashed border-blue-400 rounded-2xl z-10 flex items-center justify-center backdrop-blur-sm">
            <div className="text-center">
              <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <ImageIcon className="w-7 h-7 text-blue-600" />
              </div>
              <p className="text-blue-700 font-semibold">Drop images here</p>
              <p className="text-blue-600 text-xs mt-1">Up to 3 images</p>
            </div>
          </div>
        )}

        {/* Selected Images Preview */}
        {selectedImages.length > 0 && (
          <div className="mb-4 bg-slate-50 rounded-xl p-3 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-600">
                Attached ({selectedImages.length}/3)
              </span>
              {uploadingImages && (
                <span className="text-xs text-blue-600 flex items-center gap-1.5">
                  <RefreshCw className="w-3 h-3 animate-spin" />
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
                    className="w-16 h-16 object-cover rounded-lg border border-slate-200 shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => onRemoveImage(index)}
                    disabled={uploadingImages}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 disabled:opacity-50 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={onSendMessage} className="flex items-end gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={sendingMessage || uploadingImages || selectedImages.length >= 3}
            className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Add images"
          >
            <ImageIcon className="w-5 h-5" />
          </button>

          <div className="flex-1 relative">
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
              className="w-full px-4 py-3 bg-slate-100 border-0 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:bg-white transition-all duration-200 resize-none"
              disabled={sendingMessage || uploadingImages}
              rows={2}
            />
          </div>

          <button
            type="submit"
            disabled={sendingMessage || uploadingImages || (!messageInput.trim() && selectedImages.length === 0)}
            className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {sendingMessage || uploadingImages ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      </div>

      {/* Lightbox */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in"
          onClick={() => setLightboxImage(null)}
        >
          <img 
            src={lightboxImage} 
            alt="Full size" 
            className="max-h-[90vh] max-w-[90vw] rounded-lg shadow-2xl animate-scale-fade-in" 
          />
          <button
            className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 text-white rounded-full backdrop-blur-sm transition-colors"
            onClick={(e: any) => { e.stopPropagation(); setLightboxImage(null); }}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
