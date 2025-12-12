import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MessageSquare, Send, Phone, User, AlertCircle, CheckCircle, Search, X, Save, FileText, Trash2 } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { useClients } from '../hooks/useClients';
import { sendSMS } from '../lib/smsMessaging';
import ClientAvatar from '../components/ui/ClientAvatar';
import { useSMSTemplates } from '../hooks/useSMSTemplates';
import { StaggerContainer } from '../components/ui/StaggerContainer';

const SMSMessaging: React.FC = () => {
  const { clients, loading: clientsLoading } = useClients();
  const { templates, createTemplate, deleteTemplate, loading: templatesLoading } = useSMSTemplates();
  const [recipientMode, setRecipientMode] = useState<'client' | 'custom'>('client');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [customPhoneNumber, setCustomPhoneNumber] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [messageContent, setMessageContent] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Template management state
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [showTemplatesDropdown, setShowTemplatesDropdown] = useState(false);
  const templatesDropdownRef = useRef<HTMLDivElement>(null);

  // Variable management state
  const [showVariablesDropdown, setShowVariablesDropdown] = useState(false);
  const variablesDropdownRef = useRef<HTMLDivElement>(null);
  const messageTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Available variables
  const availableVariables = [
    { key: '{{username}}', label: 'Client Username', description: 'Inserts @username' },
    // Future variables can be added here:
    // { key: '{{first_name}}', label: 'First Name', description: 'Client\'s first name' },
  ];

  // Function to replace variables in message
  const replaceVariables = (content: string, client: any) => {
    if (!client) return content;
    
    let replacedContent = content;
    replacedContent = replacedContent.replace(/\{\{username\}\}/g, `@${client.username}`);
    // Add more replacements as needed
    
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
    
    // Set cursor position after the inserted variable
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  };

  // Filter clients that have phone numbers
  const clientsWithPhones = clients.filter(client => client.phone && client.phone.trim() !== '');

  // Filtered clients based on search query
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clientsWithPhones;
    
    const query = searchQuery.toLowerCase();
    return clientsWithPhones.filter(client => 
      client.username.toLowerCase().includes(query) ||
      (client.phone && client.phone.includes(query))
    );
  }, [clientsWithPhones, searchQuery]);

  const selectedClient = clientsWithPhones.find(c => c.id === selectedClientId);

  // Format phone number to E.164 format (add +1 if missing for US numbers)
  const formatPhoneNumber = (phone: string): string => {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // If it already starts with a country code (more than 10 digits or starts with 1)
    if (digits.length === 11 && digits.startsWith('1')) {
      return `+${digits}`;
    }
    
    // If it's a 10-digit US number, add +1
    if (digits.length === 10) {
      return `+1${digits}`;
    }
    
    // If it already has + at the start, return as is
    if (phone.startsWith('+')) {
      return phone;
    }
    
    // Otherwise, assume it needs +1
    return `+1${digits}`;
  };

  const handleSendSMS = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let phoneNumber = '';
    let recipientName = '';

    if (recipientMode === 'client') {
      if (!selectedClient || !messageContent.trim()) {
        setError('Please select a client and enter a message');
        return;
      }

      if (!selectedClient.phone) {
        setError('Selected client does not have a phone number');
        return;
      }

      phoneNumber = formatPhoneNumber(selectedClient.phone);
      recipientName = `@${selectedClient.username}`;
    } else {
      if (!customPhoneNumber.trim() || !messageContent.trim()) {
        setError('Please enter a phone number and message');
        return;
      }

      phoneNumber = formatPhoneNumber(customPhoneNumber);
      recipientName = phoneNumber;
    }

    setSending(true);
    setError(null);
    setSuccess(null);

    try {
      // Replace variables before sending
      const finalContent = recipientMode === 'client' && selectedClient
        ? replaceVariables(messageContent.trim(), selectedClient)
        : messageContent.trim();

      await sendSMS({
        phoneNumber,
        content: finalContent
      });

      setSuccess(`Message sent successfully to ${recipientName}`);
      setMessageContent('');
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      console.error('Failed to send SMS:', err);
      setError(err.message || 'Failed to send SMS message');
    } finally {
      setSending(false);
    }
  };

  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = clientsWithPhones.find(c => c.id === clientId);
    if (client) {
      setSearchQuery(`@${client.username}`);
    }
    setShowDropdown(false);
  };

  const handleClearSelection = () => {
    setSelectedClientId('');
    setSearchQuery('');
    setShowDropdown(false);
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
    // Replace variables if a client is selected
    const processedContent = recipientMode === 'client' && selectedClient
      ? replaceVariables(templateContent, selectedClient)
      : templateContent;
      
    setMessageContent(processedContent);
    setShowTemplatesDropdown(false);
    setSuccess('Template loaded' + (selectedClient ? ' with client info' : ''));
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
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const characterCount = messageContent.length;
  const maxCharacters = 1600; // SMS standard segment size
  const segmentCount = Math.ceil(characterCount / 160) || 1;

  if (clientsLoading) {
    return (
      <Layout title="SMS Messaging">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading clients...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="SMS Messaging">
      <StaggerContainer className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-lg bg-blue-500 bg-opacity-20">
              <MessageSquare className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SMS Messaging</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Send SMS messages to individual clients via Twilio
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
                  }}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    recipientMode === 'client'
                      ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                  disabled={sending}
                >
                  <User className="w-4 h-4 inline mr-2" />
                  Select Client
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRecipientMode('custom');
                    setSelectedClientId('');
                    setSearchQuery('');
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

              {/* Client Search */}
              {recipientMode === 'client' && (
                <div className="relative" ref={dropdownRef}>
                  <label htmlFor="client-search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Search Client *
                  </label>
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
                        if (!e.target.value) {
                          setSelectedClientId('');
                        }
                      }}
                      onFocus={() => setShowDropdown(true)}
                      className="w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Search by username or phone number..."
                      disabled={sending}
                      autoComplete="off"
                    />
                    {selectedClientId && (
                      <button
                        type="button"
                        onClick={handleClearSelection}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    )}
                  </div>

                  {/* Dropdown Results */}
                  {showDropdown && searchQuery && !selectedClientId && (
                    <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-auto">
                      {filteredClients.length > 0 ? (
                        filteredClients.map((client) => (
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
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                          No clients found matching "{searchQuery}"
                        </div>
                      )}
                    </div>
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

              {/* Selected Client Preview */}
              {recipientMode === 'client' && selectedClient && (
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center space-x-3">
                    <ClientAvatar
                      client={{ username: selectedClient.username, avatar_url: selectedClient.avatar_url }}
                      size="lg"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        @{selectedClient.username}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                        <Phone className="w-4 h-4 mr-1" />
                        {selectedClient.phone}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Will format as: {formatPhoneNumber(selectedClient.phone)}
                      </p>
                    </div>
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
                        
                        {recipientMode === 'client' && selectedClient && (
                          <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-200 dark:border-blue-700">
                            <p className="text-xs font-medium text-blue-800 dark:text-blue-300 mb-1">
                              Preview for @{selectedClient.username}:
                            </p>
                            <p className="text-xs text-blue-600 dark:text-blue-400">
                              {'{{'} username {'}}'}  → @{selectedClient.username}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Variable Preview */}
                  {recipientMode === 'client' && selectedClient && messageContent.includes('{{') && (
                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                      <AlertCircle className="w-3.5 h-3.5 mr-1" />
                      Variables will be replaced when sent
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
                    (recipientMode === 'client' && !selectedClientId) ||
                    (recipientMode === 'custom' && !customPhoneNumber.trim())
                  }
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {sending ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-2" />
                      Send SMS
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

