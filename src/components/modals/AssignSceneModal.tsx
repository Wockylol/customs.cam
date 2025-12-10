import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, CheckCircle, Film, User } from 'lucide-react';
import { useContentScenes } from '../../hooks/useContentScenes';
import { useClients } from '../../hooks/useClients';
import { Button } from '../ui/Button';
import ClientAvatar from '../ui/ClientAvatar';

interface AssignSceneModalProps {
  isOpen: boolean;
  onClose: () => void;
  scene?: any; // When assigning from scene library
  client?: any; // When assigning from client profile
}

const AssignSceneModal: React.FC<AssignSceneModalProps> = ({
  isOpen,
  onClose,
  scene,
  client
}) => {
  const { scenes, assignScene, fetchClientScenes } = useContentScenes();
  const { clients } = useClients();
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [selectedSceneIds, setSelectedSceneIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [notes, setNotes] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [clientAssignments, setClientAssignments] = useState<{ [sceneId: string]: string[] }>({});

  const mode = scene ? 'scene-to-clients' : 'client-to-scenes';

  useEffect(() => {
    if (isOpen) {
      setSelectedClientIds([]);
      setSelectedSceneIds([]);
      setSearchQuery('');
      setNotes('');

      // If we're in client-to-scenes mode, fetch which scenes are already assigned to this client
      if (client) {
        fetchClientAssignmentsForClient(client.id);
      }
    }
  }, [isOpen, scene, client]);

  const fetchClientAssignmentsForClient = async (clientId: string) => {
    const { data } = await fetchClientScenes(clientId);
    const assignedSceneIds = data.map((assignment: any) => assignment.scene_id);
    
    // Create a map of scene IDs to already assigned
    const assignmentMap: { [sceneId: string]: string[] } = {};
    assignedSceneIds.forEach((sceneId: string) => {
      assignmentMap[sceneId] = [clientId];
    });
    setClientAssignments(assignmentMap);
  };

  const toggleClientSelection = (clientId: string) => {
    setSelectedClientIds(prev =>
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const toggleSceneSelection = (sceneId: string) => {
    setSelectedSceneIds(prev =>
      prev.includes(sceneId)
        ? prev.filter(id => id !== sceneId)
        : [...prev, sceneId]
    );
  };

  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients;
    
    const query = searchQuery.toLowerCase();
    return clients.filter(client =>
      client.username.toLowerCase().includes(query)
    );
  }, [clients, searchQuery]);

  const filteredScenes = useMemo(() => {
    if (!searchQuery.trim()) return scenes;
    
    const query = searchQuery.toLowerCase();
    return scenes.filter(scene =>
      scene.title.toLowerCase().includes(query) ||
      scene.location?.toLowerCase().includes(query)
    );
  }, [scenes, searchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'scene-to-clients') {
      if (selectedClientIds.length === 0) {
        alert('Please select at least one client');
        return;
      }

      setAssigning(true);
      const { error } = await assignScene(scene.id, selectedClientIds, notes);
      setAssigning(false);

      if (error) {
        alert(`Error assigning scene: ${error}`);
      } else {
        onClose();
      }
    } else {
      if (selectedSceneIds.length === 0) {
        alert('Please select at least one scene');
        return;
      }

      setAssigning(true);
      
      // Assign each selected scene to the client
      const promises = selectedSceneIds.map(sceneId =>
        assignScene(sceneId, [client.id], notes)
      );
      
      const results = await Promise.all(promises);
      const errors = results.filter(r => r.error).map(r => r.error);
      
      setAssigning(false);

      if (errors.length > 0) {
        alert(`Error assigning scenes: ${errors.join(', ')}`);
      } else {
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {mode === 'scene-to-clients' ? 'Assign Scene to Clients' : 'Assign Scenes to Client'}
            </h2>
            {mode === 'scene-to-clients' && scene && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Scene: <span className="font-medium">{scene.title}</span>
              </p>
            )}
            {mode === 'client-to-scenes' && client && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Client: <span className="font-medium">@{client.username}</span>
              </p>
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
        <form onSubmit={handleSubmit} className="flex flex-col h-[calc(90vh-200px)]">
          {/* Search Bar */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={mode === 'scene-to-clients' ? 'Search clients...' : 'Search scenes...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Selection List */}
          <div className="flex-1 overflow-y-auto p-6">
            {mode === 'scene-to-clients' ? (
              <div className="space-y-2">
                {filteredClients.length === 0 ? (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                    No clients found
                  </p>
                ) : (
                  filteredClients.map(client => (
                    <label
                      key={client.id}
                      className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedClientIds.includes(client.id)
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                      onClick={() => toggleClientSelection(client.id)}
                    >
                      <ClientAvatar client={client} size="sm" />
                      <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white">
                        @{client.username}
                      </span>
                      {selectedClientIds.includes(client.id) && (
                        <CheckCircle className="w-5 h-5 text-blue-500" />
                      )}
                    </label>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredScenes.length === 0 ? (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                    No scenes found
                  </p>
                ) : (
                  filteredScenes.map(scene => {
                    const instructions = Array.isArray(scene.instructions) ? scene.instructions : [];
                    const isAlreadyAssigned = clientAssignments[scene.id]?.includes(client.id);
                    
                    return (
                      <label
                        key={scene.id}
                        className={`flex items-start space-x-3 p-4 rounded-lg border transition-colors ${
                          selectedSceneIds.includes(scene.id)
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 cursor-pointer'
                            : isAlreadyAssigned
                            ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 opacity-60 cursor-not-allowed'
                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer'
                        }`}
                        onClick={() => !isAlreadyAssigned && toggleSceneSelection(scene.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <Film className="w-4 h-4 text-orange-500 flex-shrink-0" />
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                              {scene.title}
                            </h3>
                            {isAlreadyAssigned && (
                              <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full whitespace-nowrap">
                                Already assigned
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-3 text-xs text-gray-600 dark:text-gray-400">
                            <span>{instructions.length} steps</span>
                            {scene.location && (
                              <>
                                <span>•</span>
                                <span>{scene.location}</span>
                              </>
                            )}
                          </div>
                        </div>
                        {selectedSceneIds.includes(scene.id) && (
                          <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0" />
                        )}
                      </label>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="p-6 border-t border-gray-200 dark:border-gray-700">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Add any special instructions or notes..."
              rows={2}
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {mode === 'scene-to-clients' ? (
                <>Selected: {selectedClientIds.length} client{selectedClientIds.length !== 1 ? 's' : ''}</>
              ) : (
                <>Selected: {selectedSceneIds.length} scene{selectedSceneIds.length !== 1 ? 's' : ''}</>
              )}
            </p>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <Button type="submit" disabled={assigning}>
                {assigning ? 'Assigning...' : 'Assign'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignSceneModal;

