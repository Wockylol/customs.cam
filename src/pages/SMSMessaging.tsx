import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MessageSquare, Send, Phone, User, AlertCircle, CheckCircle, Search, X, Save, FileText, Trash2, ArrowLeft, Plus, Inbox, Users, Loader2 } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { useClients } from '../hooks/useClients';
import { sendSMS } from '../lib/smsMessaging';
import ClientAvatar from '../components/ui/ClientAvatar';
import { useSMSTemplates } from '../hooks/useSMSTemplates';
import { useSMSConversations, useSMSMessages, SMSConversation } from '../hooks/useSMSConversations';
import { useAuth } from '../contexts/AuthContext';
import { StaggerContainer } from '../components/ui/StaggerContainer';

const EDT_TIMEZONE = 'America/New_York';

// Helper to format dates safely
function formatMessageTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: EDT_TIMEZONE,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(date);
    }
    
    return new Intl.DateTimeFormat('en-US', {
      timeZone: EDT_TIMEZONE,
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return '';
  }
}

function formatConversationTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();
    
    if (isToday) {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: EDT_TIMEZONE,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(date);
    }
    
    if (isYesterday) {
      return 'Yesterday';
    }
    
    return new Intl.DateTimeFormat('en-US', {
      timeZone: EDT_TIMEZONE,
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch {
    return '';
  }
}

const SMSMessaging: React.FC = () => {
  const { teamMember } = useAuth();
  const { clients, loading: clientsLoading } = useClients();
  const { templates, createTemplate, deleteTemplate, loading: templatesLoading } = useSMSTemplates();
  const { conversations, loading: conversationsLoading, refetch: refetchConversations } = useSMSConversations();
  
  // View state
  const [view, setView] = useState<'list' | 'compose' | 'thread'>('list');
  const [selectedConversation, setSelectedConversation] = useState<SMSConversation | null>(null);
  
  // Compose form state
  const [recipientMode, setRecipientMode] = useState<'client' | 'custom'>('client');
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [customPhoneNumber, setCustomPhoneNumber] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [messageContent, setMessageContent] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Bulk sending state
  interface SendResult {
    clientId: string;
    username: string;
    success: boolean;
    error?: string;
  }
  const [sendingProgress, setSendingProgress] = useState<{ current: number; total: number } | null>(null);
  const [sendResults, setSendResults] = useState<SendResult[]>([]);
  
  // Thread state
  const { messages, loading: messagesLoading, sending: threadSending, sendMessage } = useSMSMessages(
    selectedConversation?.id || null
  );
  const [threadMessageInput, setThreadMessageInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Template management state
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [showTemplatesDropdown, setShowTemplatesDropdown] = useState(false);
  const templatesDropdownRef = useRef<HTMLDivElement>(null);

  // Variable management state
  const [showVariablesDropdown, setShowVariablesDropdown] = useState(false);
  const variablesDropdownRef = useRef<HTMLDivElement>(null);
  const messageTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Conversation search
  const [conversationSearchQuery, setConversationSearchQuery] = useState('');

  // Available variables
  const availableVariables = [
    { key: '{{username}}', label: 'Client Username', description: 'Inserts @username' },
  ];

  // Function to replace variables in message
  const replaceVariables = (content: string, client: any) => {
    if (!client) return content;
    let replacedContent = content;
    replacedContent = replacedContent.replace(/\{\{username\}\}/g, `@${client.username}`);
    return replacedContent;
  };

  // Function to insert variable at cursor position
  const insertVariable = (variable: string) => {
    const textarea = messageTextareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newContent = messageContent.substring(0, start) + variable + messageContent.substring(end);
    
    setMessageContent(newContent);
    setShowVariablesDropdown(false);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  };

  // Filter clients that have phone numbers
  const clientsWithPhones = clients.filter(client => client.phone && client.phone.trim() !== '');

  // Filtered clients based on search query (exclude already selected)
  const filteredClients = useMemo(() => {
    let filtered = clientsWithPhones.filter(client => !selectedClientIds.includes(client.id));
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(client => 
        client.username.toLowerCase().includes(query) ||
        (client.phone && client.phone.includes(query))
      );
    }
    
    return filtered;
  }, [clientsWithPhones, searchQuery, selectedClientIds]);

  // Filtered conversations based on search
  const filteredConversations = useMemo(() => {
    if (!conversationSearchQuery.trim()) return conversations;
    
    const query = conversationSearchQuery.toLowerCase();
    return conversations.filter(convo => 
      convo.phone_number.includes(query) ||
      convo.client?.username?.toLowerCase().includes(query)
    );
  }, [conversations, conversationSearchQuery]);

  // Get selected clients objects
  const selectedClients = useMemo(() => {
    return clientsWithPhones.filter(c => selectedClientIds.includes(c.id));
  }, [clientsWithPhones, selectedClientIds]);

  // Format phone number to E.164 format
  const formatPhoneNumber = (phone: string): string => {
    const digits = phone.replace(/\D/g, '');
    
    if (digits.length === 11 && digits.startsWith('1')) {
      return `+${digits}`;
    }
    
    if (digits.length === 10) {
      return `+1${digits}`;
    }
    
    if (phone.startsWith('+')) {
      return phone;
    }
    
    return `+1${digits}`;
  };

  // Format phone for display
  const formatPhoneForDisplay = (phone: string): string => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('1')) {
      return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    }
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return phone;
  };

  const handleSendSMS = async (e: React.FormEvent) => {
    e.preventDefault();

    if (recipientMode === 'client') {
      // Multi-recipient sending
      if (selectedClients.length === 0 || !messageContent.trim()) {
        setError('Please select at least one client and enter a message');
        return;
      }

      // Validate all clients have phone numbers
      const clientsWithoutPhones = selectedClients.filter(c => !c.phone);
      if (clientsWithoutPhones.length > 0) {
        setError(`Some clients don't have phone numbers: ${clientsWithoutPhones.map(c => `@${c.username}`).join(', ')}`);
        return;
      }

      setSending(true);
      setError(null);
      setSuccess(null);
      setSendResults([]);
      setSendingProgress({ current: 0, total: selectedClients.length });

      const results: SendResult[] = [];

      for (let i = 0; i < selectedClients.length; i++) {
        const client = selectedClients[i];
        setSendingProgress({ current: i + 1, total: selectedClients.length });

        try {
          const phoneNumber = formatPhoneNumber(client.phone!);
          const finalContent = replaceVariables(messageContent.trim(), client);

          await sendSMS({
            phoneNumber,
            content: finalContent,
            sentBy: teamMember?.id,
          });

          results.push({
            clientId: client.id,
            username: client.username,
            success: true,
          });
        } catch (err: any) {
          console.error(`Failed to send SMS to @${client.username}:`, err);
          results.push({
            clientId: client.id,
            username: client.username,
            success: false,
            error: err.message || 'Failed to send',
          });
        }

        // Small delay between sends to avoid rate limiting
        if (i < selectedClients.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      setSendResults(results);
      setSendingProgress(null);
      setSending(false);

      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      if (failCount === 0) {
        setSuccess(`Messages sent successfully to ${successCount} recipient${successCount !== 1 ? 's' : ''}`);
        setMessageContent('');
        setSelectedClientIds([]);
      } else if (successCount === 0) {
        setError(`Failed to send messages to all ${failCount} recipient${failCount !== 1 ? 's' : ''}`);
      } else {
        setSuccess(`Sent to ${successCount}, failed for ${failCount} recipient${failCount !== 1 ? 's' : ''}`);
      }

      refetchConversations();
      setTimeout(() => setSuccess(null), 8000);
    } else {
      // Single custom number sending
      if (!customPhoneNumber.trim() || !messageContent.trim()) {
        setError('Please enter a phone number and message');
        return;
      }

      const phoneNumber = formatPhoneNumber(customPhoneNumber);

      setSending(true);
      setError(null);
      setSuccess(null);

      try {
        await sendSMS({
          phoneNumber,
          content: messageContent.trim(),
          sentBy: teamMember?.id,
        });

        setSuccess(`Message sent successfully to ${phoneNumber}`);
        setMessageContent('');
        refetchConversations();
        
        setTimeout(() => setSuccess(null), 5000);
      } catch (err: any) {
        console.error('Failed to send SMS:', err);
        setError(err.message || 'Failed to send SMS message');
      } finally {
        setSending(false);
      }
    }
  };

  const handleSendThreadMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedConversation || !threadMessageInput.trim()) return;

    const result = await sendMessage(
      selectedConversation.phone_number,
      threadMessageInput.trim(),
      teamMember?.id
    );

    if (result.success) {
      setThreadMessageInput('');
    } else {
      setError(result.error || 'Failed to send message');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleSelectClient = (clientId: string) => {
    if (!selectedClientIds.includes(clientId)) {
      setSelectedClientIds(prev => [...prev, clientId]);
    }
    setSearchQuery('');
    setShowDropdown(false);
  };

  const handleRemoveClient = (clientId: string) => {
    setSelectedClientIds(prev => prev.filter(id => id !== clientId));
  };

  const handleClearAllClients = () => {
    setSelectedClientIds([]);
    setSearchQuery('');
    setShowDropdown(false);
    setSendResults([]);
  };

  const handleSelectConversation = (convo: SMSConversation) => {
    setSelectedConversation(convo);
    setView('thread');
  };

  const handleBackToList = () => {
    setSelectedConversation(null);
    setView('list');
    setThreadMessageInput('');
  };

  const handleNewMessage = () => {
    setView('compose');
    setSelectedConversation(null);
    setMessageContent('');
    setSelectedClientIds([]);
    setSearchQuery('');
    setCustomPhoneNumber('');
    setError(null);
    setSuccess(null);
    setSendResults([]);
    setSendingProgress(null);
  };

  // Template handlers
  const handleSaveTemplate = async () => {
    if (!templateName.trim() || !messageContent.trim()) {
      setError('Please enter a template name and message');
      return;
    }

    const { error: saveError } = await createTemplate({
      name: templateName.trim(),
      content: messageContent.trim(),
    });

    if (saveError) {
      setError(`Failed to save template: ${saveError}`);
    } else {
      setSuccess('Template saved successfully');
      setTemplateName('');
      setShowSaveTemplateModal(false);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const handleLoadTemplate = (templateContent: string) => {
    // Don't replace variables when loading - they'll be replaced per-recipient on send
    setMessageContent(templateContent);
    setShowTemplatesDropdown(false);
    setSuccess('Template loaded (variables will be personalized for each recipient)');
    setTimeout(() => setSuccess(null), 2000);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      const { error: deleteError } = await deleteTemplate(templateId);
      if (deleteError) {
        setError(`Failed to delete template: ${deleteError}`);
      } else {
        setSuccess('Template deleted successfully');
        setTimeout(() => setSuccess(null), 3000);
      }
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    if (view === 'thread' && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, view]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
      if (templatesDropdownRef.current && !templatesDropdownRef.current.contains(event.target as Node)) {
        setShowTemplatesDropdown(false);
      }
      if (variablesDropdownRef.current && !variablesDropdownRef.current.contains(event.target as Node)) {
        setShowVariablesDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const characterCount = messageContent.length;
  const maxCharacters = 1600;
  const segmentCount = Math.ceil(characterCount / 160) || 1;

  if (clientsLoading || conversationsLoading) {
    return (
      <Layout title="SMS Messaging">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Conversation List View
  if (view === 'list') {
    return (
      <Layout title="SMS Messaging">
        <StaggerContainer className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-700 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-lg bg-blue-500 bg-opacity-20">
                  <MessageSquare className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="ml-4">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SMS Messaging</h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Two-way SMS conversations via Twilio
                  </p>
                </div>
              </div>
              <button
                onClick={handleNewMessage}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Message
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={conversationSearchQuery}
              onChange={(e) => setConversationSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Search conversations by phone or client..."
            />
          </div>

          {/* Conversation List */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center">
                <Inbox className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {conversations.length === 0 ? 'No conversations yet' : 'No matching conversations'}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {conversations.length === 0
                    ? 'Start a new conversation by clicking "New Message"'
                    : 'Try a different search term'}
                </p>
                {conversations.length === 0 && (
                  <button
                    onClick={handleNewMessage}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Message
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredConversations.map((convo) => (
                  <button
                    key={convo.id}
                    onClick={() => handleSelectConversation(convo)}
                    className="w-full flex items-center p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
                  >
                    {convo.client ? (
                      <ClientAvatar
                        client={{ username: convo.client.username, avatar_url: convo.client.avatar_url }}
                        size="md"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                        <Phone className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      </div>
                    )}
                    <div className="ml-3 flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {convo.client ? `@${convo.client.username}` : formatPhoneForDisplay(convo.phone_number)}
                        </p>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 flex-shrink-0">
                          {formatConversationTime(convo.last_message_at)}
                        </span>
                      </div>
                      {convo.client && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatPhoneForDisplay(convo.phone_number)}
                        </p>
                      )}
                      {convo.latest_message && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">
                          {convo.latest_message.direction === 'outbound' && (
                            <span className="text-gray-400 dark:text-gray-500">You: </span>
                          )}
                          {convo.latest_message.body}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </StaggerContainer>
      </Layout>
    );
  }

  // Thread View
  if (view === 'thread' && selectedConversation) {
    return (
      <Layout title="SMS Messaging">
        <div className="max-w-4xl mx-auto h-[calc(100vh-180px)] flex flex-col">
          {/* Thread Header */}
          <div className="bg-white dark:bg-gray-800 rounded-t-lg border border-gray-200 dark:border-gray-700 p-4 flex items-center">
            <button
              onClick={handleBackToList}
              className="mr-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            {selectedConversation.client ? (
              <ClientAvatar
                client={{ username: selectedConversation.client.username, avatar_url: selectedConversation.client.avatar_url }}
                size="md"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                <Phone className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </div>
            )}
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {selectedConversation.client
                  ? `@${selectedConversation.client.username}`
                  : formatPhoneForDisplay(selectedConversation.phone_number)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatPhoneForDisplay(selectedConversation.phone_number)}
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 border-x border-gray-200 dark:border-gray-700 p-4 space-y-4">
            {messagesLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No messages yet. Send a message to start the conversation.
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                      msg.direction === 'outbound'
                        ? 'bg-blue-600 text-white rounded-br-md'
                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-bl-md'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
                    <div className={`flex items-center justify-end mt-1 space-x-1 ${
                      msg.direction === 'outbound' ? 'text-blue-100' : 'text-gray-400'
                    }`}>
                      <span className="text-xs">{formatMessageTime(msg.created_at)}</span>
                      {msg.direction === 'outbound' && (
                        <span className="text-xs">
                          {msg.status === 'delivered' ? '✓✓' : msg.status === 'sent' ? '✓' : ''}
                        </span>
                      )}
                    </div>
                    {msg.sent_by_team_member && (
                      <p className={`text-xs mt-1 ${
                        msg.direction === 'outbound' ? 'text-blue-200' : 'text-gray-400'
                      }`}>
                        Sent by {msg.sent_by_team_member.full_name}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border-x border-gray-200 dark:border-gray-700 px-4 py-2">
              <div className="flex items-center text-red-600 dark:text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 mr-2" />
                {error}
              </div>
            </div>
          )}

          {/* Message Input */}
          <form
            onSubmit={handleSendThreadMessage}
            className="bg-white dark:bg-gray-800 rounded-b-lg border border-gray-200 dark:border-gray-700 p-4"
          >
            <div className="flex items-end space-x-3">
              <div className="flex-1">
                <textarea
                  value={threadMessageInput}
                  onChange={(e) => setThreadMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendThreadMessage(e);
                    }
                  }}
                  rows={1}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                  placeholder="Type a message..."
                  disabled={threadSending}
                />
              </div>
              <button
                type="submit"
                disabled={threadSending || !threadMessageInput.trim()}
                className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {threadSending ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          </form>
        </div>
      </Layout>
    );
  }

  // Compose View
  return (
    <Layout title="SMS Messaging">
      <StaggerContainer className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-700 p-6">
          <div className="flex items-center">
            <button
              onClick={handleBackToList}
              className="mr-3 p-2 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-lg bg-blue-500 bg-opacity-20">
              <MessageSquare className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New SMS Message</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Send a new SMS message via Twilio
              </p>
            </div>
          </div>
        </div>

        {/* Info if no clients have phones */}
        {clientsWithPhones.length === 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">No clients with phone numbers</h3>
                <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                  Add phone numbers to client profiles to select from your client list, or use "Custom Number" to send to any phone number.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main SMS Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="p-6">
            <form onSubmit={handleSendSMS} className="space-y-6">
              {/* Success Message */}
              {success && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
                  <div className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-800 dark:text-green-300">{success}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-red-800 dark:text-red-300">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Recipient Mode Toggle */}
              <div className="flex space-x-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    setRecipientMode('client');
                    setCustomPhoneNumber('');
                    setSendResults([]);
                  }}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    recipientMode === 'client'
                      ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                  disabled={sending}
                >
                  <Users className="w-4 h-4 inline mr-2" />
                  Select Clients
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRecipientMode('custom');
                    setSelectedClientIds([]);
                    setSearchQuery('');
                    setSendResults([]);
                  }}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    recipientMode === 'custom'
                      ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                  disabled={sending}
                >
                  <Phone className="w-4 h-4 inline mr-2" />
                  Custom Number
                </button>
              </div>

              {/* Client Search - Multi-select */}
              {recipientMode === 'client' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label htmlFor="client-search" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Select Recipients *
                    </label>
                    {selectedClientIds.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearAllClients}
                        className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                        disabled={sending}
                      >
                        Clear all ({selectedClientIds.length})
                      </button>
                    )}
                  </div>

                  {/* Selected Clients Chips */}
                  {selectedClients.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                      {selectedClients.map((client) => {
                        const result = sendResults.find(r => r.clientId === client.id);
                        return (
                          <div
                            key={client.id}
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors ${
                              result
                                ? result.success
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-700'
                                  : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-700'
                                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
                            }`}
                          >
                            <ClientAvatar
                              client={{ username: client.username, avatar_url: client.avatar_url }}
                              size="xs"
                            />
                            <span className="font-medium">@{client.username}</span>
                            {result && (
                              result.success ? (
                                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" title={result.error} />
                              )
                            )}
                            {!sending && !result && (
                              <button
                                type="button"
                                onClick={() => handleRemoveClient(client.id)}
                                className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5 transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Search Input */}
                  <div className="relative" ref={dropdownRef}>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="client-search"
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setShowDropdown(true);
                        }}
                        onFocus={() => setShowDropdown(true)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder={selectedClientIds.length > 0 ? "Add more recipients..." : "Search by username or phone number..."}
                        disabled={sending}
                        autoComplete="off"
                      />
                    </div>

                    {/* Dropdown Results */}
                    {showDropdown && (
                      <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-auto">
                        {filteredClients.length > 0 ? (
                          filteredClients.slice(0, 10).map((client) => (
                            <button
                              key={client.id}
                              type="button"
                              onClick={() => handleSelectClient(client.id)}
                              className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-left"
                            >
                              <ClientAvatar
                                client={{ username: client.username, avatar_url: client.avatar_url }}
                                size="md"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  @{client.username}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {client.phone}
                                </p>
                              </div>
                              <Plus className="w-4 h-4 text-gray-400" />
                            </button>
                          ))
                        ) : searchQuery ? (
                          <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                            No clients found matching "{searchQuery}"
                          </div>
                        ) : selectedClientIds.length === clientsWithPhones.length ? (
                          <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                            All clients have been selected
                          </div>
                        ) : (
                          <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                            Type to search for clients...
                          </div>
                        )}
                        {filteredClients.length > 10 && (
                          <div className="px-4 py-2 text-xs text-gray-400 dark:text-gray-500 border-t border-gray-200 dark:border-gray-600">
                            Showing first 10 results. Type to narrow down.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Recipient count info */}
                  {selectedClientIds.length > 0 && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <Users className="w-4 h-4 inline mr-1" />
                      {selectedClientIds.length} recipient{selectedClientIds.length !== 1 ? 's' : ''} selected
                      {messageContent.includes('{{') && (
                        <span className="text-blue-600 dark:text-blue-400 ml-2">
                          • Variables will be personalized for each
                        </span>
                      )}
                    </p>
                  )}
                </div>
              )}

              {/* Custom Phone Number Input */}
              {recipientMode === 'custom' && (
                <div>
                  <label htmlFor="custom-phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Phone Number *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="custom-phone"
                      type="tel"
                      value={customPhoneNumber}
                      onChange={(e) => setCustomPhoneNumber(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="e.g., 5551234567 or +15551234567"
                      disabled={sending}
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Enter 10-digit US number (e.g., 5551234567) or E.164 format (e.g., +15551234567). 
                    US country code (+1) will be added automatically if missing.
                  </p>
                  {customPhoneNumber && (
                    <div className="mt-2 text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Will send to: </span>
                      <span className="font-mono font-medium text-gray-900 dark:text-white">
                        {formatPhoneNumber(customPhoneNumber)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Sending Progress */}
              {sendingProgress && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-300 flex items-center">
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending messages...
                    </span>
                    <span className="text-sm text-blue-600 dark:text-blue-400">
                      {sendingProgress.current} / {sendingProgress.total}
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                    <div
                      className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(sendingProgress.current / sendingProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Message Content */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Message *
                  </label>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {characterCount} / {maxCharacters} characters
                    {characterCount > 160 && (
                      <span className="ml-2">
                        ({segmentCount} SMS segment{segmentCount > 1 ? 's' : ''})
                      </span>
                    )}
                  </div>
                </div>
                <textarea
                  ref={messageTextareaRef}
                  id="message"
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  rows={6}
                  maxLength={maxCharacters}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                  placeholder="Type your message here... Use {{username}} for client username"
                  disabled={sending}
                  required
                />

                {/* Variable Insertion */}
                <div className="flex items-center justify-between mt-2">
                  <div className="relative" ref={variablesDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setShowVariablesDropdown(!showVariablesDropdown)}
                      className="flex items-center px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      disabled={sending}
                    >
                      <User className="w-3.5 h-3.5 mr-1.5" />
                      Insert Variable
                    </button>
                    
                    {/* Variables Dropdown */}
                    {showVariablesDropdown && (
                      <div className="absolute z-10 mt-1 w-64 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg">
                        {availableVariables.map((variable) => (
                          <button
                            key={variable.key}
                            type="button"
                            onClick={() => insertVariable(variable.key)}
                            className="w-full flex flex-col items-start px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-600 border-b border-gray-200 dark:border-gray-600 last:border-b-0 text-left"
                          >
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {variable.label}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {variable.key}
                            </span>
                            <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                              {variable.description}
                            </span>
                          </button>
                        ))}
                        
                        {recipientMode === 'client' && selectedClients.length > 0 && (
                          <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-200 dark:border-blue-700">
                            <p className="text-xs font-medium text-blue-800 dark:text-blue-300 mb-1">
                              Preview for first recipient (@{selectedClients[0].username}):
                            </p>
                            <p className="text-xs text-blue-600 dark:text-blue-400">
                              {'{{'} username {'}}'}  → @{selectedClients[0].username}
                            </p>
                            {selectedClients.length > 1 && (
                              <p className="text-xs text-blue-500 dark:text-blue-500 mt-1 italic">
                                Will be personalized for each of {selectedClients.length} recipients
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Variable Preview */}
                  {recipientMode === 'client' && selectedClients.length > 0 && messageContent.includes('{{') && (
                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                      <AlertCircle className="w-3.5 h-3.5 mr-1" />
                      Variables will be personalized for each recipient
                    </div>
                  )}
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Messages longer than 160 characters will be sent as multiple SMS segments.
                </p>

                {/* Template Actions */}
                <div className="flex items-center space-x-2 mt-3">
                  {/* Load Template Button */}
                  <div className="relative flex-1" ref={templatesDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setShowTemplatesDropdown(!showTemplatesDropdown)}
                      className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                      disabled={sending || templatesLoading}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Load Template
                      {templates.length > 0 && (
                        <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full">
                          {templates.length}
                        </span>
                      )}
                    </button>

                    {/* Templates Dropdown */}
                    {showTemplatesDropdown && (
                      <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-auto">
                        {templates.length > 0 ? (
                          templates.map((template) => (
                            <div
                              key={template.id}
                              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-600 border-b border-gray-200 dark:border-gray-600 last:border-b-0"
                            >
                              <button
                                type="button"
                                onClick={() => handleLoadTemplate(template.content)}
                                className="flex-1 text-left"
                              >
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {template.name}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {template.content.substring(0, 50)}
                                  {template.content.length > 50 ? '...' : ''}
                                </p>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteTemplate(template.id)}
                                className="ml-2 p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                title="Delete template"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                            No templates saved yet
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Save Template Button */}
                  <button
                    type="button"
                    onClick={() => setShowSaveTemplateModal(true)}
                    disabled={!messageContent.trim() || sending}
                    className="flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Save as template"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Template
                  </button>
                </div>
              </div>

              {/* Send Button */}
              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={
                    sending || 
                    !messageContent.trim() || 
                    (recipientMode === 'client' && selectedClientIds.length === 0) ||
                    (recipientMode === 'custom' && !customPhoneNumber.trim())
                  }
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-2" />
                      {recipientMode === 'client' && selectedClientIds.length > 1
                        ? `Send to ${selectedClientIds.length} Recipients`
                        : 'Send SMS'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Save Template Modal */}
        {showSaveTemplateModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <div 
                className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" 
                onClick={() => setShowSaveTemplateModal(false)}
              />

              <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Save Message as Template
                  </h3>
                  <button
                    onClick={() => {
                      setShowSaveTemplateModal(false);
                      setTemplateName('');
                    }}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="template-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Template Name *
                    </label>
                    <input
                      id="template-name"
                      type="text"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="e.g., Welcome Message"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Message Preview
                    </label>
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 max-h-40 overflow-y-auto">
                      <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                        {messageContent}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      onClick={() => {
                        setShowSaveTemplateModal(false);
                        setTemplateName('');
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveTemplate}
                      disabled={!templateName.trim()}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Save Template
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </StaggerContainer>
    </Layout>
  );
};

export default SMSMessaging;
