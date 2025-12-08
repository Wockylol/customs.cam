import React, { useState } from 'react';
import { X, Settings, User, Search, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';
import { motion } from 'framer-motion';

interface Model {
  id: string;
  username: string;
}

interface Contact {
  phone: string;
  name: string;
}

interface ThreadSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  models: Model[];
  onAssignModel: (modelId: string) => void;
  editingContact: Contact | null;
  onEditContact: (contact: Contact | null) => void;
  onSaveContact: () => void;
  threadParticipants: string[];
  contactMap: Record<string, string>;
  onDeleteThread: () => void;
}

const ThreadSettings: React.FC<ThreadSettingsProps> = ({
  isOpen,
  onClose,
  models,
  onAssignModel,
  editingContact,
  onEditContact,
  onSaveContact,
  threadParticipants,
  contactMap,
  onDeleteThread
}: ThreadSettingsProps) => {
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!isOpen) return null;

  const handleDeleteClick = () => {
    onDeleteThread();
    setShowDeleteConfirm(false);
    onClose();
  };

  // Filter models based on search query
  const filteredModels = models.filter(model =>
    model.username.toLowerCase().includes(modelSearchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center">
            <Settings className="h-5 w-5 text-primary mr-2" />
            <h2 className="text-lg font-medium text-gray-900">Thread Settings</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {/* Assign Model Section */}
          <div className="mb-8">
            <h3 className="text-md font-medium text-gray-900 mb-4">Assign to Model</h3>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={modelSearchQuery}
                onChange={(e) => setModelSearchQuery(e.target.value)}
                placeholder="Search models..."
                className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
              {filteredModels.length === 0 ? (
                <div className="col-span-2 text-center py-4 text-gray-500">
                  No models found
                </div>
              ) : (
                filteredModels.map((model) => (
                  <div
                    key={model.id}
                    onClick={() => onAssignModel(model.id)}
                    className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer flex items-center"
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-medium text-gray-900">@{model.username}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Manage Contacts Section */}
          <div>
            <h3 className="text-md font-medium text-gray-900 mb-4">Manage Contacts</h3>
            <div className="space-y-4">
              {threadParticipants.map((phone) => (
                <div key={phone} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{contactMap[phone] || 'Unnamed'}</p>
                    <p className="text-xs text-gray-500">{phone}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEditContact({ phone, name: contactMap[phone] || '' })}
                  >
                    Edit
                  </Button>
                </div>
              ))}

              {/* Edit Contact Form */}
              {editingContact && (
                <div className="mt-4 p-4 border rounded-lg bg-gray-50">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Edit Contact</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Phone Number
                      </label>
                      <input
                        type="text"
                        value={editingContact.phone}
                        disabled
                        className="block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        value={editingContact.name}
                        onChange={(e) => onEditContact({ ...editingContact, name: e.target.value })}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditContact(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={onSaveContact}
                        disabled={!editingContact.name.trim()}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Delete Thread Section */}
          <div className="mt-8 pt-6 border-t border-red-200">
            <h3 className="text-md font-medium text-gray-900 mb-2 flex items-center">
              <Trash2 className="h-4 w-4 text-red-500 mr-2" />
              Danger Zone
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Deleting this thread will permanently remove all messages and cannot be undone.
            </p>
            
            {!showDeleteConfirm ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Thread
              </Button>
            ) : (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start mb-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-900">Are you absolutely sure?</p>
                    <p className="text-xs text-red-700 mt-1">
                      This action cannot be undone. All messages in this thread will be permanently deleted.
                    </p>
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="text-gray-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleDeleteClick}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Yes, Delete Thread
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ThreadSettings;
export { ThreadSettings };