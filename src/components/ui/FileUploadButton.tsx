import React, { useState } from 'react';
import { Upload, CheckCircle } from 'lucide-react';

interface FileUploadButtonProps {
  customId: string;
}

const FileUploadButton: React.FC<FileUploadButtonProps> = ({ customId }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      setIsUploading(true);
      
      // Simulate upload process
      setTimeout(() => {
        const newFiles = Array.from(files).map(file => file.name);
        setUploadedFiles(prev => [...prev, ...newFiles]);
        setIsUploading(false);
      }, 1500);
    }
  };

  return (
    <div>
      <div className="flex items-center space-x-3">
        <label className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white transition-colors cursor-pointer ${
          isUploading 
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-blue-600 hover:bg-blue-700'
        }`}>
          <Upload className="w-4 h-4 mr-2" />
          {isUploading ? 'Uploading...' : 'Upload Content'}
          <input
            type="file"
            multiple
            className="hidden"
            onChange={handleFileUpload}
            disabled={isUploading}
            accept="image/*,video/*,audio/*"
          />
        </label>
        
        {uploadedFiles.length > 0 && (
          <div className="flex items-center text-green-600 text-sm">
            <CheckCircle className="w-4 h-4 mr-1" />
            {uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''} uploaded
          </div>
        )}
      </div>
      
      {uploadedFiles.length > 0 && (
        <div className="mt-3">
          <h4 className="text-xs font-medium text-gray-700 mb-2">Uploaded Files:</h4>
          <ul className="text-xs text-gray-600 space-y-1">
            {uploadedFiles.map((fileName, index) => (
              <li key={index} className="flex items-center">
                <CheckCircle className="w-3 h-3 mr-2 text-green-500" />
                {fileName}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FileUploadButton;