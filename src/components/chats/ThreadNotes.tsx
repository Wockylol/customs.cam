import React, { useState } from 'react';
import { X, FileText, Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

interface ThreadNote {
  id: string;
  thread_id: number;
  content: string;
  source_message: string;
  message_id?: string;
  created_at: string;
}

interface ThreadNotesProps {
  isOpen: boolean;
  onClose: () => void;
  notes: ThreadNote[];
  onEvaluate: () => void;
  evaluating: boolean;
  evaluationProgress?: {
    current: number;
    total: number;
    processed: number;
    notesCreated: number;
  } | null;
}

export function ThreadNotes({ isOpen, onClose, notes, onEvaluate, evaluating, evaluationProgress }: ThreadNotesProps) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  if (!isOpen) return null;

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
            <FileText className="h-5 w-5 text-primary mr-2" />
            <h2 className="text-lg font-medium text-gray-900">Thread Notes</h2>
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
          <div className="mb-6">
            <Button
              onClick={() => setShowConfirmModal(true)}
              disabled={evaluating}
              className="w-full flex items-center justify-center"
            >
              {evaluating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Evaluating Messages...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Evaluate New Messages
                </>
              )}
            </Button>
            
            {/* Progress Bar */}
            {evaluating && evaluationProgress && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-900">
                    Processing Batch {evaluationProgress.current} of {evaluationProgress.total}
                  </span>
                  <span className="text-sm text-blue-700">
                    {evaluationProgress.notesCreated} notes created
                  </span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(evaluationProgress.current / evaluationProgress.total) * 100}%` }}
                  ></div>
                </div>
                <div className="mt-2 text-xs text-blue-600">
                  Processed {evaluationProgress.processed} messages so far...
                </div>
              </div>
            )}
          </div>

          {notes.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No notes yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Click "Evaluate New Messages" to extract notes from client messages
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {notes.map((note) => (
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
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg max-w-md w-full p-6"
            >
              <h3 className="text-lg font-medium text-gray-900 mb-4">Evaluate New Messages</h3>
              <p className="text-gray-600 mb-6">
                This will scan any new client messages for useful guidelines or feedback. Proceed?
              </p>
              <div className="flex justify-end space-x-3">
                <Button
                  variant="ghost"
                  onClick={() => setShowConfirmModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    setShowConfirmModal(false);
                    onEvaluate();
                  }}
                >
                  Confirm
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}