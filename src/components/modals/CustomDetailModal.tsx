import React from 'react';
import { X, Calendar, DollarSign, Clock, MessageCircle, FileText, User, CheckCircle, Mail, Hash, AlertCircle, Download, Paperclip, Loader2, Edit, Save, XCircle, MessageSquare, Trash2, AlertTriangle } from 'lucide-react';
import { Database } from '../../lib/database.types';
import StatusBadge from '../ui/StatusBadge';
import FileUploadButton from '../ui/FileUploadButton';
import ImageModal from './ImageModal';
import { useContentUploads } from '../../hooks/useContentUploads';
import { useCustomRequests } from '../../hooks/useCustomRequests';
import { useCustomNotes } from '../../hooks/useCustomNotes';
import { useAuth } from '../../contexts/AuthContext';
import { useTenantRoles } from '../../hooks/useTenantRoles';

type CustomRequest = Database['public']['Tables']['custom_requests']['Row'];

interface CustomDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  custom: CustomRequest | null;
  onMarkComplete?: (customId: string) => void;
  showMarkComplete?: boolean;
  onUpdate?: () => void;
}

const CustomDetailModal: React.FC<CustomDetailModalProps> = ({ 
  isOpen, 
  onClose, 
  custom, 
  onMarkComplete, 
  onUpdate
}) => {
  const { uploads, loading: uploadsLoading, downloadFile, downloadAllFiles } = useContentUploads(custom?.id);
  const { customRequests, updateCustomRequest, markAsCompleted, denyByTeam } = useCustomRequests();
  const { notes, loading: notesLoading, addNote, updateNote, deleteNote } = useCustomNotes(custom?.id);
  const { teamMember } = useAuth();
  const { getMemberRoleDisplay } = useTenantRoles();
  const [downloadingFile, setDownloadingFile] = React.useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editLoading, setEditLoading] = React.useState(false);
  const [editError, setEditError] = React.useState<string | null>(null);
  const [markingComplete, setMarkingComplete] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const [editFormData, setEditFormData] = React.useState({
    fan_name: '',
    fan_email: '',
    description: '',
    proposed_amount: '',
    amount_paid: '',
    length_duration: '',
    notes: '',
    chat_link: '',
    fan_lifetime_spend: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    estimated_delivery_date: '',
    date_due: ''
  });
  const [showNotes, setShowNotes] = React.useState(false);
  const [newNoteContent, setNewNoteContent] = React.useState('');
  const [addingNote, setAddingNote] = React.useState(false);
  const [editingNoteId, setEditingNoteId] = React.useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = React.useState('');
  const [selectedImage, setSelectedImage] = React.useState<{
    src: string;
    alt: string;
    fileName: string;
    upload: any;
  } | null>(null);

  // Get the most up-to-date custom data from the hook
  const currentCustom = React.useMemo(() => {
    if (!custom) return null;
    return customRequests.find(c => c.id === custom.id) || custom;
  }, [custom, customRequests]);

  // Initialize edit form when custom changes
  React.useEffect(() => {
    if (currentCustom) {
      setEditFormData({
        fan_name: currentCustom.fan_name || '',
        fan_email: currentCustom.fan_email || '',
        description: currentCustom.description || '',
        proposed_amount: currentCustom.proposed_amount?.toString() || '',
        amount_paid: currentCustom.amount_paid?.toString() || '',
        length_duration: currentCustom.length_duration || '',
        notes: currentCustom.notes || '',
        chat_link: currentCustom.chat_link || '',
        fan_lifetime_spend: currentCustom.fan_lifetime_spend?.toString() || '',
        priority: currentCustom.priority || 'medium',
        estimated_delivery_date: currentCustom.estimated_delivery_date || '',
        date_due: currentCustom.date_due || ''
      });
    }
  }, [currentCustom]);

  const handleAddNote = async () => {
    if (!currentCustom || !newNoteContent.trim()) return;
    
    setAddingNote(true);
    const { error } = await addNote(currentCustom.id, newNoteContent);
    
    if (!error) {
      setNewNoteContent('');
    }
    setAddingNote(false);
  };

  const handleEditNote = (noteId: string, content: string) => {
    setEditingNoteId(noteId);
    setEditingNoteContent(content);
  };

  const handleSaveNoteEdit = async () => {
    if (!editingNoteId || !editingNoteContent.trim()) return;
    
    const { error } = await updateNote(editingNoteId, editingNoteContent);
    
    if (!error) {
      setEditingNoteId(null);
      setEditingNoteContent('');
    }
  };

  const handleCancelNoteEdit = () => {
    setEditingNoteId(null);
    setEditingNoteContent('');
  };

  const handleDeleteNote = async (noteId: string) => {
    if (confirm('Are you sure you want to delete this note?')) {
      await deleteNote(noteId);
    }
  };

  const formatNoteDate = (dateString: string) => {
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

  if (!isOpen || !currentCustom) return null;

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '$0.00';
    return `$${amount.toFixed(2)}`;
  };

  const handleMarkComplete = async () => {
    if (!currentCustom || !markAsCompleted) return;
    
    setMarkingComplete(true);
    const { error } = await markAsCompleted(currentCustom.id);
    
    if (!error) {
      // Trigger parent component refresh if callback provided
      if (onUpdate) {
        onUpdate();
      }
      // Also call the onMarkComplete callback if provided (for backwards compatibility)
      if (onMarkComplete) {
        onMarkComplete(currentCustom.id);
      }
      onClose(); // Close modal after marking complete
    } else {
      alert(`Failed to mark as complete: ${error}`);
    }
    setMarkingComplete(false);
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
    setDeleteError(null);
  };

  const handleDeleteConfirm = async () => {
    if (!currentCustom || !denyByTeam) return;
    
    setDeleting(true);
    setDeleteError(null);
    const { error } = await denyByTeam(currentCustom.id);
    
    if (!error) {
      // Trigger parent component refresh if callback provided
      if (onUpdate) {
        onUpdate();
      }
      setShowDeleteConfirm(false);
      onClose(); // Close modal after deleting
    } else {
      setDeleteError(error);
    }
    setDeleting(false);
  };

  const handleDeleteCancel = () => {
    if (!deleting) {
      setShowDeleteConfirm(false);
      setDeleteError(null);
    }
  };

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    setEditError(null);
    if (!isEditing && currentCustom) {
      // Reset form data when entering edit mode
      setEditFormData({
        fan_name: currentCustom.fan_name || '',
        fan_email: currentCustom.fan_email || '',
        description: currentCustom.description || '',
        proposed_amount: currentCustom.proposed_amount?.toString() || '',
        amount_paid: currentCustom.amount_paid?.toString() || '',
        length_duration: currentCustom.length_duration || '',
        notes: currentCustom.notes || '',
        chat_link: currentCustom.chat_link || '',
        fan_lifetime_spend: currentCustom.fan_lifetime_spend?.toString() || '',
        priority: currentCustom.priority || 'medium',
        estimated_delivery_date: currentCustom.estimated_delivery_date || '',
        date_due: currentCustom.date_due || ''
      });
    }
  };

  const handleSaveEdit = async () => {
    if (!currentCustom || !updateCustomRequest) return;
    
    setEditLoading(true);
    setEditError(null);
    
    try {
      const updateData = {
        fan_name: editFormData.fan_name.trim(),
        fan_email: editFormData.fan_email.trim() || null,
        description: editFormData.description.trim(),
        proposed_amount: parseFloat(editFormData.proposed_amount) || 0,
        amount_paid: parseFloat(editFormData.amount_paid) || null,
        length_duration: editFormData.length_duration.trim() || null,
        notes: editFormData.notes.trim() || null,
        chat_link: editFormData.chat_link.trim() || null,
        fan_lifetime_spend: parseFloat(editFormData.fan_lifetime_spend) || null,
        priority: editFormData.priority,
        estimated_delivery_date: editFormData.estimated_delivery_date || null,
        date_due: editFormData.date_due || null
      };

      const { error } = await updateCustomRequest(currentCustom.id, updateData);
      
      if (error) {
        setEditError(error);
      } else {
        setIsEditing(false);
        // Trigger parent component refresh if callback provided
        if (onUpdate) {
          onUpdate();
        }
      }
    } catch (err: any) {
      setEditError(err.message || 'Failed to update custom request');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDownloadFile = async (upload: any) => {
    setDownloadingFile(upload.id);
    const { error } = await downloadFile(upload.file_path, upload.file_name);
    if (error) {
      console.error('Download error:', error);
      // Could add error toast here if needed
    }
    setDownloadingFile(null);
  };

  const handleDownloadAll = async () => {
    setDownloadingAll(true);
    const { error } = await downloadAllFiles();
    if (error) {
      console.error('Download all error:', error);
      // Could add error toast here if needed
    }
    setDownloadingAll(false);
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.startsWith('video/')) return '🎥';
    if (fileType.startsWith('audio/')) return '🎵';
    return '📄';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleImageClick = (upload: any) => {
    const imageSrc = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/custom-content/${upload.file_path}`;
    setSelectedImage({
      src: imageSrc,
      alt: upload.file_name,
      fileName: upload.file_name,
      upload: upload
    });
  };

  const handleCloseImageModal = () => {
    setSelectedImage(null);
  };

  const handleDownloadFromImageModal = () => {
    if (selectedImage?.upload) {
      handleDownloadFile(selectedImage.upload);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />

        <div className="inline-block w-full max-w-2xl p-0 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          {/* Header */}
          <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 px-6 py-4 text-white">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <FileText className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Custom Request Details</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="bg-white bg-opacity-25 px-3 py-1 rounded-full">
                        <span className="text-white text-sm font-bold">
                          {(currentCustom as any).clients?.username || 'Unknown'}
                        </span>
                      </div>
                      <span className="text-blue-100 text-xs">•</span>
                      <span className="text-blue-100 text-xs">
                        Request from {isEditing ? editFormData.fan_name : currentCustom.fan_name}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleEditToggle}
                  className="text-white hover:text-gray-200 transition-colors p-2 hover:bg-white hover:bg-opacity-10 rounded-lg"
                  disabled={editLoading}
                >
                  {isEditing ? (
                    <XCircle className="w-5 h-5" />
                  ) : (
                    <Edit className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="text-white hover:text-gray-200 transition-colors p-2 hover:bg-white hover:bg-opacity-10 rounded-lg"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            {/* Status and Amount in Header */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-white border-opacity-20">
              <div className="bg-white bg-opacity-20 rounded-lg px-3 py-1">
                <StatusBadge status={currentCustom.status as 'pending' | 'pending_team_approval' | 'pending_client_approval' | 'in_progress' | 'completed' | 'delivered' | 'cancelled'} />
              </div>
              <div className="text-right">
                {isEditing ? (
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <DollarSign className="w-4 h-4 text-white mr-1" />
                      <input
                        type="number"
                        value={editFormData.proposed_amount}
                        onChange={(e) => setEditFormData({ ...editFormData, proposed_amount: e.target.value })}
                        className="w-20 px-2 py-1 text-sm bg-white bg-opacity-20 border border-white border-opacity-30 rounded text-white placeholder-blue-100 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
                        placeholder="0"
                        step="0.01"
                      />
                    </div>
                    <div className="flex items-center">
                      <span className="text-blue-100 text-xs mr-2">Paid:</span>
                      <input
                        type="number"
                        value={editFormData.amount_paid}
                        onChange={(e) => setEditFormData({ ...editFormData, amount_paid: e.target.value })}
                        className="w-20 px-2 py-1 text-xs bg-white bg-opacity-20 border border-white border-opacity-30 rounded text-white placeholder-blue-100 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
                        placeholder="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center text-white font-bold text-xl">
                      <DollarSign className="w-5 h-5 mr-1" />
                      {formatCurrency(currentCustom.proposed_amount)}
                    </div>
                    {currentCustom.amount_paid && (
                      <div className="text-blue-100 text-xs mt-1">
                        Paid: {formatCurrency(currentCustom.amount_paid)}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Edit Error */}
            {editError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{editError}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Fan Information Card */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                <h4 className="text-base font-semibold text-gray-900">Fan Information</h4>
              </div>
              {isEditing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Name *</label>
                    <input
                      type="text"
                      value={editFormData.fan_name}
                      onChange={(e) => setEditFormData({ ...editFormData, fan_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</label>
                    <input
                      type="email"
                      value={editFormData.fan_email}
                      onChange={(e) => setEditFormData({ ...editFormData, fan_email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Lifetime Spend ($)</label>
                    <input
                      type="number"
                      value={editFormData.fan_lifetime_spend}
                      onChange={(e) => setEditFormData({ ...editFormData, fan_lifetime_spend: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Priority</label>
                    <select
                      value={editFormData.priority}
                      onChange={(e) => setEditFormData({ ...editFormData, priority: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Name</label>
                    <p className="text-base font-medium text-gray-900">{currentCustom.fan_name}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Lifetime Spend</label>
                    <p className="text-base font-medium text-purple-600">
                      {currentCustom.fan_lifetime_spend ? `$${currentCustom.fan_lifetime_spend.toFixed(2)}` : 'Not specified'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Date Submitted</label>
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                      <p className="text-sm text-gray-900">{formatDate(currentCustom.date_submitted)}</p>
                    </div>
                  </div>
                  <div className="space-y-1 md:col-start-1">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Submitted By</label>
                    <p className="text-sm text-gray-900">{(currentCustom as any).team_members?.full_name || 'System'}</p>
                  </div>
                  {currentCustom.fan_email && (
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</label>
                      <div className="flex items-center">
                        <Mail className="w-4 h-4 text-gray-400 mr-2" />
                        <p className="text-sm text-gray-900">{currentCustom.fan_email}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {(currentCustom.chat_link || isEditing) && (
                <div className="pt-3 border-t border-gray-200">
                  {isEditing ? (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Chat Link</label>
                      <input
                        type="url"
                        value={editFormData.chat_link}
                        onChange={(e) => setEditFormData({ ...editFormData, chat_link: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="https://..."
                      />
                    </div>
                  ) : currentCustom.chat_link ? (
                    <a 
                      href={currentCustom.chat_link} 
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Open Chat
                    </a>
                  ) : null}
                </div>
              )}
            </div>

            {/* Description Card */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                  <FileText className="w-4 h-4 text-purple-600" />
                </div>
                <h4 className="text-base font-semibold text-gray-900">Description</h4>
              </div>
              {isEditing ? (
                <textarea
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                  required
                />
              ) : (
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <p className="text-gray-800 leading-relaxed text-sm">{currentCustom.description}</p>
                </div>
              )}
            </div>

            {/* Request Details Grid */}
            {isEditing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Length/Duration</label>
                  <input
                    type="text"
                    value={editFormData.length_duration}
                    onChange={(e) => setEditFormData({ ...editFormData, length_duration: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g. 10 min, 20 photos"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Estimated Delivery</label>
                  <input
                    type="date"
                    value={editFormData.estimated_delivery_date}
                    onChange={(e) => setEditFormData({ ...editFormData, estimated_delivery_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Due Date</label>
                  <input
                    type="date"
                    value={editFormData.date_due}
                    onChange={(e) => setEditFormData({ ...editFormData, date_due: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Team Approval Information */}
                {currentCustom.team_approved_by && (currentCustom as any).team_approved_member && (
                  <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">Approved By</label>
                    <p className="text-sm font-semibold text-gray-900">{(currentCustom as any).team_approved_member.full_name}</p>
                    {currentCustom.team_approved_at && (
                      <p className="text-xs text-gray-500 mt-1">{formatDate(currentCustom.team_approved_at)}</p>
                    )}
                  </div>
                )}

                {currentCustom.length_duration && (
                  <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                      <Clock className="w-5 h-5 text-orange-600" />
                    </div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">Length/Duration</label>
                    <p className="text-sm font-semibold text-gray-900">{currentCustom.length_duration}</p>
                  </div>
                )}

                {currentCustom.estimated_delivery_date && (
                  <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                      <Calendar className="w-5 h-5 text-blue-600" />
                    </div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">Estimated Delivery</label>
                    <p className="text-sm font-semibold text-gray-900">{formatDate(currentCustom.estimated_delivery_date)}</p>
                  </div>
                )}

                {currentCustom.date_due && (
                  <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    </div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">Due Date</label>
                    <p className="text-sm font-semibold text-gray-900">{formatDate(currentCustom.date_due)}</p>
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            {(currentCustom.notes || isEditing) && (
              <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                <div className="flex items-center mb-3">
                  <div className="w-6 h-6 bg-amber-100 rounded-lg flex items-center justify-center mr-3">
                    <Hash className="w-4 h-4 text-amber-600" />
                  </div>
                  <h4 className="text-base font-semibold text-amber-900">Notes</h4>
                </div>
                {isEditing ? (
                  <textarea
                    value={editFormData.notes}
                    onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-amber-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    rows={3}
                    placeholder="Add any notes or special instructions..."
                  />
                ) : (
                  <p className="text-amber-800 leading-relaxed text-sm">{currentCustom.notes}</p>
                )}
              </div>
            )}

            {/* Save/Cancel Buttons for Edit Mode */}
            {isEditing && (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Edit className="w-5 h-5 text-blue-600 mr-2" />
                    <span className="font-medium text-blue-900">Editing Custom Request</span>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleEditToggle}
                      className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                      disabled={editLoading}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      className="px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      disabled={editLoading || !editFormData.fan_name.trim() || !editFormData.description.trim()}
                    >
                      {editLoading ? (
                        <div className="flex items-center">
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </div>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Threaded Notes Section */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <MessageSquare className="w-4 h-4 text-blue-600" />
                    </div>
                    <h4 className="text-base font-semibold text-gray-900">Team Notes</h4>
                  </div>
                  <button
                    onClick={() => setShowNotes(!showNotes)}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {showNotes ? 'Hide Notes' : `Show Notes (${notes.length})`}
                  </button>
                </div>
              </div>
              
              {showNotes && (
                <div className="p-4">
                  {/* Add New Note */}
                  <div className="mb-6">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-gray-600" />
                      </div>
                      <div className="flex-1">
                        <textarea
                          value={newNoteContent}
                          onChange={(e) => setNewNoteContent(e.target.value)}
                          placeholder="Add a note about this custom request..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                          rows={3}
                          disabled={addingNote}
                        />
                        <div className="flex justify-end mt-2">
                          <button
                            onClick={handleAddNote}
                            disabled={addingNote || !newNoteContent.trim()}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                          >
                            {addingNote ? (
                              <div className="flex items-center">
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Adding...
                              </div>
                            ) : (
                              'Add Note'
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Notes Thread */}
                  {notesLoading ? (
                    <div className="text-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Loading notes...</p>
                    </div>
                  ) : notes.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No notes yet</h3>
                      <p className="text-gray-600">Start the conversation by adding the first note above.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {notes.map((note) => (
                        <div key={note.id} className="flex items-start space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="flex-1 bg-gray-50 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-gray-900 text-sm">
                                  {note.team_member?.full_name || 'Unknown User'}
                                </span>
                                {(() => {
                                  const roleDisplay = note.team_member 
                                    ? getMemberRoleDisplay(note.team_member) 
                                    : { name: 'Unknown', color: '#6B7280' };
                                  return (
                                    <span 
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                                      style={{ 
                                        backgroundColor: `${roleDisplay.color}20`,
                                        color: roleDisplay.color,
                                      }}
                                    >
                                      <span 
                                        className="w-1.5 h-1.5 rounded-full" 
                                        style={{ backgroundColor: roleDisplay.color }}
                                      />
                                      {roleDisplay.name}
                                    </span>
                                  );
                                })()}
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-xs text-gray-500">
                                  {formatNoteDate(note.created_at)}
                                </span>
                                {note.created_by === teamMember?.id && (
                                  <div className="flex space-x-1">
                                    <button
                                      onClick={() => handleEditNote(note.id, note.content)}
                                      className="text-gray-400 hover:text-blue-600 p-1 rounded"
                                      title="Edit note"
                                    >
                                      <Edit className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteNote(note.id)}
                                      className="text-gray-400 hover:text-red-600 p-1 rounded"
                                      title="Delete note"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {editingNoteId === note.id ? (
                              <div className="space-y-2">
                                <textarea
                                  value={editingNoteContent}
                                  onChange={(e) => setEditingNoteContent(e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                  rows={3}
                                />
                                <div className="flex justify-end space-x-2">
                                  <button
                                    onClick={handleCancelNoteEdit}
                                    className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={handleSaveNoteEdit}
                                    disabled={!editingNoteContent.trim()}
                                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    Save
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
                                {note.content}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Client Attachments Section */}
            {uploads && uploads.length > 0 && (
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                      <Paperclip className="w-4 h-4 text-green-600" />
                    </div>
                    <h4 className="text-base font-semibold text-gray-900">
                      {uploads.filter(u => u.uploaded_by === 'client').length > 0 ? 'Client Attachments' : 'Reference Images'}
                    </h4>
                  </div>
                  <button
                    onClick={handleDownloadAll}
                    disabled={downloadingAll || uploads.length === 0}
                    className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {downloadingAll ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Download All
                      </>
                    )}
                  </button>
                </div>
                
                <div className="space-y-3">
                  {uploads.map((upload) => (
                    <div key={upload.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-center flex-1 min-w-0">
                        {upload.file_type.startsWith('image/') ? (
                          <div className="w-12 h-12 mr-3 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                            <img
                              src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/custom-content/${upload.file_path}`}
                              alt={upload.file_name}
                              className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => handleImageClick(upload)}
                              title="Click to view full size"
                            />
                          </div>
                        ) : (
                          <span className="text-lg mr-3">{getFileIcon(upload.file_type)}</span>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {upload.file_name}
                          </p>
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <span>{formatFileSize(upload.file_size)}</span>
                            <span>•</span>
                            <span>{new Date(upload.upload_date).toLocaleDateString()}</span>
                            <span>•</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              upload.uploaded_by === 'team' 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {upload.uploaded_by === 'team' ? 'Team Upload' : 'Client Upload'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDownloadFile(upload)}
                        disabled={downloadingFile === upload.id}
                        className="ml-3 inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {downloadingFile === upload.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
                
                {uploadsLoading && (
                  <div className="text-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400 mx-auto" />
                    <p className="text-sm text-gray-500 mt-2">Loading attachments...</p>
                  </div>
                )}
              </div>
            )}

            {/* File Upload Section */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h4 className="text-base font-semibold text-gray-900 mb-3">Content Upload</h4>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
                <FileUploadButton customId={currentCustom.id} />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-t border-gray-200">
            <div className="flex items-center space-x-3">
              {currentCustom.status !== 'completed' && (
                <button
                  onClick={handleMarkComplete}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isEditing || markingComplete || deleting}
                >
                  {markingComplete ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Marking Complete...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark as Complete
                    </>
                  )}
                </button>
              )}
              <button
                onClick={handleDeleteClick}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isEditing || markingComplete || deleting}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Request
              </button>
            </div>
            <div>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                disabled={editLoading || markingComplete || deleting}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      <ImageModal
        isOpen={selectedImage !== null}
        onClose={handleCloseImageModal}
        imageSrc={selectedImage?.src || ''}
        imageAlt={selectedImage?.alt || ''}
        fileName={selectedImage?.fileName}
        onDownload={selectedImage ? handleDownloadFromImageModal : undefined}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={handleDeleteCancel} />

            <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Delete Custom Request
                  </h3>
                </div>
                <button
                  onClick={handleDeleteCancel}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={deleting}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-6">
                {deleteError && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                    <div className="flex">
                      <AlertCircle className="h-5 w-5 text-red-400" />
                      <div className="ml-3">
                        <p className="text-sm text-red-800">{deleteError}</p>
                      </div>
                    </div>
                  </div>
                )}

                <p className="text-gray-700 mb-4">
                  Are you sure you want to delete the custom request from <strong>{currentCustom.fan_name}</strong>? 
                </p>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <div className="flex">
                    <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                    <div className="ml-3">
                      <p className="text-sm text-yellow-800">
                        <strong>Warning:</strong> This action cannot be undone. All associated files, notes, and data will be permanently deleted.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleDeleteCancel}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={deleting}
                >
                  {deleting ? (
                    <div className="flex items-center">
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </div>
                  ) : (
                    'Delete Request'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomDetailModal;