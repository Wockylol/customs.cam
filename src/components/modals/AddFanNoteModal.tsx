import React, { useState } from 'react';
import { X, ImageIcon } from 'lucide-react';

interface AddFanNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  fanNames: string[];
  onSubmit: (fanName: string, content: string, image?: File) => Promise<{ error: string | null }>;
}

const AddFanNoteModal: React.FC<AddFanNoteModalProps> = ({ 
  isOpen, 
  onClose, 
  fanNames,
  onSubmit 
}) => {
  const [fanName, setFanName] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fanNameSuggestions, setFanNameSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFanNameChange = (value: string) => {
    setFanName(value);
    if (value.trim()) {
      const filtered = fanNames.filter(name => 
        name.toLowerCase().includes(value.toLowerCase())
      );
      setFanNameSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSelectFanName = (name: string) => {
    setFanName(name);
    setShowSuggestions(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImage(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    if (fanName.trim() && content.trim()) {
      const { error } = await onSubmit(fanName.trim(), content.trim(), image || undefined);
      
      if (error) {
        setError(error);
      } else {
        handleClose();
      }
    }
    setLoading(false);
  };

  const handleClose = () => {
    if (!loading) {
      setFanName('');
      setContent('');
      setImage(null);
      setImagePreview(null);
      setShowSuggestions(false);
      setError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75" 
          onClick={handleClose} 
        />

        <div className="inline-block w-full max-w-lg p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Add a Fan Note
            </h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              disabled={loading}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3 mb-4">
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Fan Name Input */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Fan Name
              </label>
              <input
                type="text"
                value={fanName}
                onChange={(e) => handleFanNameChange(e.target.value)}
                onFocus={() => fanName && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="Enter or search for a fan name..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400"
                disabled={loading}
                required
              />
              
              {/* Autocomplete Suggestions */}
              {showSuggestions && fanNameSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {fanNameSuggestions.map((name, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSelectFanName(name)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Note Content */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Note
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write a note about this fan..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 resize-none"
                disabled={loading}
                required
              />
            </div>
            
            {/* Image Preview */}
            {imagePreview && (
              <div className="relative inline-block">
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  className="max-h-40 rounded border border-gray-300 dark:border-gray-600"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  disabled={loading}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between items-center pt-2">
              <div>
                <input
                  type="file"
                  id="modal-fan-note-image"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  disabled={loading}
                />
                <label
                  htmlFor="modal-fan-note-image"
                  className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                >
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Add Screenshot
                </label>
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!fanName.trim() || !content.trim() || loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm transition-colors"
                >
                  {loading ? 'Posting...' : 'Post Fan Note'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddFanNoteModal;

