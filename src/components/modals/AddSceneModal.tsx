import React, { useState, useEffect } from 'react';
import { X, Trash2, GripVertical, Video, Image as ImageIcon, Upload, FileText, ClipboardPaste } from 'lucide-react';
import { useContentScenes } from '../../hooks/useContentScenes';
import { useSceneExamples } from '../../hooks/useSceneExamples';
import { SceneInstruction } from '../../types';
import { Button } from '../ui/Button';

interface AddSceneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  scene?: any; // For editing existing scene
  viewOnly?: boolean; // For read-only view mode
}

const AddSceneModal: React.FC<AddSceneModalProps> = ({ isOpen, onClose, onSuccess, scene, viewOnly = false }) => {
  const { createScene, updateScene } = useContentScenes();
  const { examples, uploadExamples, deleteExample } = useSceneExamples(scene?.id);
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [props, setProps] = useState('');
  const [instructions, setInstructions] = useState<SceneInstruction[]>([]);
  const [isTemplate, setIsTemplate] = useState(true);
  const [isDefaultForNewClients, setIsDefaultForNewClients] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [exampleFiles, setExampleFiles] = useState<File[]>([]);
  const [examplePreviews, setExamplePreviews] = useState<{ [key: string]: string }>({});
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pastedCSV, setPastedCSV] = useState('');

  useEffect(() => {
    if (scene) {
      setTitle(scene.title || '');
      setLocation(scene.location || '');
      setProps(scene.props || '');
      const parsedInstructions = Array.isArray(scene.instructions) 
        ? scene.instructions 
        : [];
      setInstructions(parsedInstructions);
      setIsTemplate(scene.is_template ?? true);
      setIsDefaultForNewClients(scene.is_default_for_new_clients ?? false);
    } else {
      resetForm();
    }
  }, [scene, isOpen]);

  const resetForm = () => {
    setTitle('');
    setLocation('');
    setProps('');
    setInstructions([]);
    setIsTemplate(true);
    setIsDefaultForNewClients(false);
    setExampleFiles([]);
    setExamplePreviews({});
  };

  const handleExampleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setExampleFiles(prev => [...prev, ...newFiles]);
      
      // Generate previews for images
      newFiles.forEach((file) => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setExamplePreviews(prev => ({
              ...prev,
              [file.name]: reader.result as string
            }));
          };
          reader.readAsDataURL(file);
        }
      });
    }
  };

  const removeExampleFile = (fileName: string) => {
    setExampleFiles(prev => prev.filter(f => f.name !== fileName));
    setExamplePreviews(prev => {
      const newPreviews = { ...prev };
      delete newPreviews[fileName];
      return newPreviews;
    });
  };

  const handleDeleteExample = async (exampleId: string, filePath: string) => {
    if (!confirm('Delete this example media?')) return;
    const { error } = await deleteExample(exampleId, filePath);
    if (error) {
      alert(`Error deleting example: ${error}`);
    }
  };

  const parseCSV = (csvText: string): { title: string; location: string; props: string; instructions: SceneInstruction[]; exampleMediaUrls?: string[] } | null => {
    try {
      const lines = csvText.trim().split('\n');
      if (lines.length < 1) {
        alert('CSV content is empty');
        return null;
      }

      // Check if first line looks like a header or data
      const firstLine = lines[0].toLowerCase();
      const hasHeader = firstLine.includes('title') && firstLine.includes('instructions');
      
      let headers: string[];
      let dataStartIndex: number;
      
      if (hasHeader) {
        // Has header row
        if (lines.length < 2) {
          alert('CSV file must have at least a header row and one data row');
          return null;
        }
        headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
        dataStartIndex = 1;
      } else {
        // No header, assume standard order: Title,Location,Props,Instructions,ExampleMedia
        headers = ['title', 'location', 'props', 'instructions', 'examplemedia'];
        dataStartIndex = 0;
      }

      const titleIdx = headers.indexOf('title');
      const locationIdx = headers.indexOf('location');
      const propsIdx = headers.indexOf('props');
      const instructionsIdx = headers.indexOf('instructions');
      const exampleMediaIdx = headers.indexOf('examplemedia');

      if (titleIdx === -1 || instructionsIdx === -1) {
        alert('CSV must have "Title" and "Instructions" columns in header, or paste data in order: Title,Location,Props,Instructions,ExampleMedia');
        return null;
      }

      // Parse data rows - handle multi-line fields by combining lines within quotes
      let dataText = lines.slice(dataStartIndex).join('\n');
      const values: string[] = [];
      let currentValue = '';
      let insideQuotes = false;

      // Handle CSV with quotes properly, including multi-line fields
      for (let i = 0; i < dataText.length; i++) {
        const char = dataText[i];
        if (char === '"') {
          insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
          values.push(currentValue.trim());
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      values.push(currentValue.trim()); // Push last value

      const title = values[titleIdx] || '';
      const location = locationIdx !== -1 ? (values[locationIdx] || '') : '';
      const props = propsIdx !== -1 ? (values[propsIdx] || '') : '';
      const instructionsStr = values[instructionsIdx] || '';
      const exampleMediaStr = exampleMediaIdx !== -1 ? (values[exampleMediaIdx] || '') : '';

      // Parse example media URLs (format: "url1|url2|url3")
      const exampleMediaUrls = exampleMediaStr
        .split('|')
        .map(url => url.trim())
        .filter(url => url.length > 0 && (url.startsWith('http://') || url.startsWith('https://')));

      // Parse instructions (format: "Type #Number (Duration) Description|Type #Number Description|...")
      const instructionParts = instructionsStr.split('|').map(s => s.trim()).filter(Boolean);
      const parsedInstructions: SceneInstruction[] = [];

      for (const part of instructionParts) {
        // Match pattern: "Video #1 (0:15-0:20) Description" or "Photo #1 Description"
        const videoMatch = part.match(/^(Video|video)\s*#?(\d+)\s*\(([^)]+)\)\s*(.+)$/);
        const photoMatch = part.match(/^(Photo|photo)\s*#?(\d+)\s*(.+)$/);

        if (videoMatch) {
          parsedInstructions.push({
            type: 'video',
            number: parseInt(videoMatch[2]),
            duration: videoMatch[3].trim(),
            description: videoMatch[4].trim()
          });
        } else if (photoMatch) {
          parsedInstructions.push({
            type: 'photo',
            number: parseInt(photoMatch[2]),
            description: photoMatch[3].trim()
          });
        }
      }

      if (parsedInstructions.length === 0) {
        alert('No valid instructions found. Format: "Video #1 (0:15-0:20) Description|Photo #1 Description"');
        return null;
      }

      return { 
        title, 
        location, 
        props, 
        instructions: parsedInstructions,
        exampleMediaUrls: exampleMediaUrls.length > 0 ? exampleMediaUrls : undefined
      };
    } catch (error) {
      console.error('CSV parsing error:', error);
      alert('Error parsing CSV file. Please check the format.');
      return null;
    }
  };

  const downloadFileFromUrl = async (url: string): Promise<File | null> => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const urlParts = url.split('/');
      const fileName = urlParts[urlParts.length - 1].split('?')[0] || `example_${Date.now()}`;
      
      // Ensure file has an extension
      const hasExtension = fileName.includes('.');
      let finalFileName = fileName;
      if (!hasExtension) {
        // Try to get extension from content type
        const contentType = response.headers.get('content-type');
        if (contentType?.startsWith('image/')) {
          finalFileName = `${fileName}.${contentType.split('/')[1]}`;
        } else if (contentType?.startsWith('video/')) {
          finalFileName = `${fileName}.${contentType.split('/')[1]}`;
        }
      }
      
      return new File([blob], finalFileName, { type: blob.type });
    } catch (error) {
      console.error('Error downloading file from URL:', url, error);
      return null;
    }
  };

  const processCSVImport = async (csvText: string) => {
    const parsed = parseCSV(csvText);
    
    if (parsed) {
      setTitle(parsed.title);
      setLocation(parsed.location);
      setProps(parsed.props);
      setInstructions(parsed.instructions);
      
      // Download example media from URLs if provided
      if (parsed.exampleMediaUrls && parsed.exampleMediaUrls.length > 0) {
        setSaving(true);
        alert(`CSV imported! Downloading ${parsed.exampleMediaUrls.length} example media file(s)...`);
        
        const downloadedFiles: File[] = [];
        for (const url of parsed.exampleMediaUrls) {
          const downloadedFile = await downloadFileFromUrl(url);
          if (downloadedFile) {
            downloadedFiles.push(downloadedFile);
          } else {
            console.warn(`Failed to download: ${url}`);
          }
        }
        
        if (downloadedFiles.length > 0) {
          // Add downloaded files to example files
          setExampleFiles(prev => [...prev, ...downloadedFiles]);
          
          // Generate previews for images
          downloadedFiles.forEach((downloadedFile) => {
            if (downloadedFile.type.startsWith('image/')) {
              const reader = new FileReader();
              reader.onloadend = () => {
                setExamplePreviews(prev => ({
                  ...prev,
                  [downloadedFile.name]: reader.result as string
                }));
              };
              reader.readAsDataURL(downloadedFile);
            }
          });
          
          alert(`CSV imported successfully! Downloaded ${downloadedFiles.length} of ${parsed.exampleMediaUrls.length} example media files. Review and click Save.`);
        } else {
          alert('CSV imported but failed to download example media. You can add them manually.');
        }
        setSaving(false);
      } else {
        alert('CSV imported successfully! Review the fields and click Save.');
      }
    }
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const csvText = event.target?.result as string;
      await processCSVImport(csvText);
    };
    reader.readAsText(file);
    
    // Reset input so the same file can be imported again
    e.target.value = '';
  };

  const handlePasteCSV = async () => {
    if (!pastedCSV.trim()) {
      alert('Please paste CSV content first');
      return;
    }
    
    await processCSVImport(pastedCSV);
    setShowPasteModal(false);
    setPastedCSV('');
  };

  const addInstruction = (type: 'video' | 'photo') => {
    const newInstruction: SceneInstruction = {
      type,
      number: instructions.filter(i => i.type === type).length + 1,
      duration: type === 'video' ? '0:15-0:20' : undefined,
      description: ''
    };
    setInstructions([...instructions, newInstruction]);
  };

  const removeInstruction = (index: number) => {
    const newInstructions = instructions.filter((_, i) => i !== index);
    // Renumber instructions of the same type
    renumberInstructions(newInstructions);
  };

  const updateInstruction = (index: number, field: keyof SceneInstruction, value: any) => {
    const newInstructions = [...instructions];
    newInstructions[index] = {
      ...newInstructions[index],
      [field]: value
    };
    setInstructions(newInstructions);
  };

  const renumberInstructions = (instructionList: SceneInstruction[]) => {
    const videoCount: { [key: number]: number } = {};
    const photoCount: { [key: number]: number } = {};
    
    const renumbered = instructionList.map((instruction, index) => {
      if (instruction.type === 'video') {
        const count = Object.keys(videoCount).length + 1;
        videoCount[index] = count;
        return { ...instruction, number: count };
      } else {
        const count = Object.keys(photoCount).length + 1;
        photoCount[index] = count;
        return { ...instruction, number: count };
      }
    });
    
    setInstructions(renumbered);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newInstructions = [...instructions];
    const draggedItem = newInstructions[draggedIndex];
    newInstructions.splice(draggedIndex, 1);
    newInstructions.splice(index, 0, draggedItem);
    
    setDraggedIndex(index);
    renumberInstructions(newInstructions);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      alert('Please enter a scene title');
      return;
    }

    if (instructions.length === 0) {
      alert('Please add at least one instruction');
      return;
    }

    setSaving(true);

    const sceneData = {
      title: title.trim(),
      location: location.trim() || undefined,
      props: props.trim() || undefined,
      instructions,
      is_template: isTemplate,
      is_default_for_new_clients: isDefaultForNewClients
    };

    let result;
    if (scene) {
      result = await updateScene(scene.id, sceneData);
    } else {
      result = await createScene(sceneData);
    }

    setSaving(false);

    if (result.error) {
      alert(`Error ${scene ? 'updating' : 'creating'} scene: ${result.error}`);
    } else {
      // Upload example files if any
      if (exampleFiles.length > 0 && result.data) {
        const sceneId = (result.data as any).id;
        if (sceneId) {
          setSaving(true);
          const { error: uploadError } = await uploadExamples(sceneId, exampleFiles);
          setSaving(false);
          
          if (uploadError) {
            alert(`Scene ${scene ? 'updated' : 'created'} but error uploading examples: ${uploadError}`);
          }
        }
      }
      
      // Refresh the scene list
      if (onSuccess) {
        await onSuccess();
      }
      
      onClose();
      resetForm();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bottom-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {viewOnly ? 'View Scene' : scene ? 'Edit Scene' : 'Create New Scene'}
            </h2>
            {!scene && !viewOnly && (
              <>
                <label className="cursor-pointer">
                  <span className="flex items-center px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm rounded-lg transition-colors">
                    <FileText className="w-4 h-4 mr-1" />
                    Import CSV
                  </span>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCSVImport}
                    className="hidden"
                  />
                </label>
                <button
                  onClick={() => setShowPasteModal(true)}
                  className="flex items-center px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors"
                >
                  <ClipboardPaste className="w-4 h-4 mr-1" />
                  Paste CSV
                </button>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Scene Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                placeholder="e.g., Bedroom Fantasy Scene"
                required
                disabled={viewOnly}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                  placeholder="e.g., Bedroom, Living room"
                  disabled={viewOnly}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Props
                </label>
                <input
                  type="text"
                  value={props}
                  onChange={(e) => setProps(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                  placeholder="e.g., Toy, lingerie, candles"
                  disabled={viewOnly}
                />
              </div>
            </div>
          </div>

          {/* Example Media Upload */}
          <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Example Media (optional)
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Scene-level reference shown before instructions
                </p>
              </div>
              {!viewOnly && (
                <label className="cursor-pointer">
                  <span className="flex items-center px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white text-sm rounded-lg transition-colors">
                    <Upload className="w-4 h-4 mr-1" />
                    Add Examples
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleExampleFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Upload example images or videos showing the overall scene aesthetic (lighting, setup, positioning). Shown to clients before step-by-step instructions as general reference.
            </p>

            {/* Existing Examples (when editing) */}
            {scene && examples.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Existing Examples</p>
                <div className="grid grid-cols-3 gap-2">
                  {examples.map((example) => (
                    <div key={example.id} className="relative group">
                      {example.file_type.startsWith('image/') ? (
                        <img
                          src={`${example.file_path}`}
                          alt={example.file_name}
                          className="w-full h-24 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                        />
                      ) : (
                        <div className="w-full h-24 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 flex items-center justify-center">
                          <Video className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                      {!viewOnly && (
                        <button
                          type="button"
                          onClick={() => handleDeleteExample(example.id, example.file_path)}
                          className="absolute top-1 right-1 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New Example Files */}
            {exampleFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  New Examples ({exampleFiles.length})
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {exampleFiles.map((file) => (
                    <div key={file.name} className="relative group">
                      {examplePreviews[file.name] ? (
                        <img
                          src={examplePreviews[file.name]}
                          alt={file.name}
                          className="w-full h-24 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                        />
                      ) : (
                        <div className="w-full h-24 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 flex items-center justify-center">
                          {file.type.startsWith('video/') ? (
                            <Video className="w-8 h-8 text-gray-400" />
                          ) : (
                            <ImageIcon className="w-8 h-8 text-gray-400" />
                          )}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeExampleFile(file.name)}
                        className="absolute top-1 right-1 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">
                        {file.name}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Instructions Builder */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Instructions *
              </label>
              {!viewOnly && (
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => addInstruction('video')}
                    className="flex items-center px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors"
                  >
                    <Video className="w-4 h-4 mr-1" />
                    Add Video
                  </button>
                  <button
                    type="button"
                    onClick={() => addInstruction('photo')}
                    className="flex items-center px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white text-sm rounded-lg transition-colors"
                  >
                    <ImageIcon className="w-4 h-4 mr-1" />
                    Add Photo
                  </button>
                </div>
              )}
            </div>

            {instructions.length === 0 ? (
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  No instructions yet. Add videos and photos to build your scene.
                </p>
                <div className="flex justify-center space-x-2">
                  <button
                    type="button"
                    onClick={() => addInstruction('video')}
                    className="flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                  >
                    <Video className="w-4 h-4 mr-2" />
                    Add Video Step
                  </button>
                  <button
                    type="button"
                    onClick={() => addInstruction('photo')}
                    className="flex items-center px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
                  >
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Add Photo Step
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {instructions.map((instruction, index) => (
                  <div
                    key={index}
                    draggable={!viewOnly}
                    onDragStart={() => !viewOnly && handleDragStart(index)}
                    onDragOver={(e) => !viewOnly && handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-4 ${
                      draggedIndex === index ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      {!viewOnly && (
                        <button
                          type="button"
                          className="mt-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-move"
                        >
                          <GripVertical className="w-5 h-5" />
                        </button>
                      )}

                      <div className="flex-1 space-y-3">
                        <div className="flex items-center space-x-3">
                          <span className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            instruction.type === 'video'
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                              : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                          }`}>
                            {instruction.type === 'video' ? (
                              <Video className="w-4 h-4 mr-1" />
                            ) : (
                              <ImageIcon className="w-4 h-4 mr-1" />
                            )}
                            {instruction.type === 'video' ? 'Video' : 'Photo'} #{instruction.number}
                          </span>

                          {instruction.type === 'video' && (
                            <input
                              type="text"
                              value={instruction.duration || ''}
                              onChange={(e) => updateInstruction(index, 'duration', e.target.value)}
                              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm w-32 disabled:opacity-60 disabled:cursor-not-allowed"
                              placeholder="0:15-0:20"
                              disabled={viewOnly}
                            />
                          )}
                        </div>

                        <textarea
                          value={instruction.description}
                          onChange={(e) => updateInstruction(index, 'description', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                          placeholder="Describe what the client should do in this step..."
                          rows={3}
                          required
                          disabled={viewOnly}
                        />
                      </div>

                      {!viewOnly && (
                        <button
                          type="button"
                          onClick={() => removeInstruction(index)}
                          className="mt-2 text-red-500 hover:text-red-700 dark:hover:text-red-400"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Settings */}
          {!viewOnly && (
            <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isTemplate}
                  onChange={(e) => setIsTemplate(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Save as reusable template
                </span>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDefaultForNewClients}
                  onChange={(e) => setIsDefaultForNewClients(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Auto-assign to new clients (future feature)
                </span>
              </label>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            {viewOnly ? (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : scene ? 'Update Scene' : 'Create Scene'}
                </Button>
              </>
            )}
          </div>
        </form>
      </div>

      {/* Paste CSV Modal */}
      {showPasteModal && (
        <div className="fixed top-0 left-0 right-0 bottom-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Paste CSV Content
              </h3>
              <button
                onClick={() => {
                  setShowPasteModal(false);
                  setPastedCSV('');
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Paste your CSV content below. Header row is optional. Expected format: Title, Location, Props, Instructions, ExampleMedia
              </p>
              <textarea
                value={pastedCSV}
                onChange={(e) => setPastedCSV(e.target.value)}
                placeholder="With header:&#10;Title,Location,Props,Instructions,ExampleMedia&#10;&quot;Scene Title&quot;,Bedroom,&quot;Toy|Candles&quot;,&quot;Video #1 (0:15-0:20) Desc|Photo #1 Desc&quot;,&#10;&#10;Without header (order matters):&#10;&quot;Scene Title&quot;,Bedroom,&quot;Toy|Candles&quot;,&quot;Video #1 (0:15-0:20) Desc|Photo #1 Desc&quot;,"
                className="w-full h-64 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowPasteModal(false);
                    setPastedCSV('');
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <Button onClick={handlePasteCSV}>
                  Import from Paste
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddSceneModal;

