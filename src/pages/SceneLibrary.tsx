import React, { useState, useMemo } from 'react';
import { Plus, Search, Film, Edit, Eye, Trash2, UserPlus, TrendingUp, CheckCircle } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { useContentScenes } from '../hooks/useContentScenes';
import AddSceneModal from '../components/modals/AddSceneModal';
import AssignSceneModal from '../components/modals/AssignSceneModal';
import { Button } from '../components/ui/Button';
import { StaggerContainer } from '../components/ui/StaggerContainer';

const SceneLibrary: React.FC = () => {
  const { scenes, loading, error, fetchScenes, deleteScene, duplicateScene } = useContentScenes();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedScene, setSelectedScene] = useState<any>(null);
  const [editingScene, setEditingScene] = useState<any>(null);
  const [viewingScene, setViewingScene] = useState<any>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Filter scenes based on search query
  const filteredScenes = useMemo(() => {
    if (!searchQuery.trim()) return scenes;
    
    const query = searchQuery.toLowerCase();
    return scenes.filter(scene => 
      scene.title.toLowerCase().includes(query) ||
      scene.location?.toLowerCase().includes(query) ||
      scene.props?.toLowerCase().includes(query)
    );
  }, [scenes, searchQuery]);

  const handleDelete = async (sceneId: string) => {
    const { error } = await deleteScene(sceneId);
    if (error) {
      alert(`Error deleting scene: ${error}`);
    }
    setShowDeleteConfirm(null);
  };

  const handleDuplicate = async (sceneId: string) => {
    const { error } = await duplicateScene(sceneId);
    if (error) {
      alert(`Error duplicating scene: ${error}`);
    }
  };

  const handleView = (scene: any) => {
    setViewingScene(scene);
    setIsViewModalOpen(true);
  };

  const handleEdit = (scene: any) => {
    setEditingScene(scene);
    setIsAddModalOpen(true);
  };

  const handleAssign = (scene: any) => {
    setSelectedScene(scene);
    setIsAssignModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingScene(null);
    setIsAddModalOpen(true);
  };

  if (loading) {
    return (
      <Layout title="Scene Library">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading scenes...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Scene Library">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
          <p className="text-sm text-red-800 dark:text-red-400">Error loading scenes: {error}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Scene Library">
      <StaggerContainer className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Film className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Scene Library</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {scenes.length} scene template{scenes.length !== 1 ? 's' : ''} available
              </p>
            </div>
          </div>
          
          <Button onClick={handleAddNew}>
            <Plus className="w-4 h-4 mr-2" />
            Create Scene
          </Button>
        </div>

        {/* Search Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search scenes by title, location, or props..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Scenes Grid */}
        {filteredScenes.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Film className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {searchQuery ? 'No scenes found' : 'No scenes yet'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {searchQuery 
                ? 'Try adjusting your search terms'
                : 'Get started by creating your first scene template'}
            </p>
            {!searchQuery && (
              <Button onClick={handleAddNew}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Scene
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredScenes.map((scene) => {
              const instructions = Array.isArray(scene.instructions) ? scene.instructions : [];
              const completionRate = scene.assignments_count 
                ? Math.round((scene.completed_count || 0) / scene.assignments_count * 100)
                : 0;

              return (
                <div
                  key={scene.id}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md transition-all flex flex-col h-full"
                >
                  {/* Card Header - Clean & Neutral */}
                  <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white line-clamp-2 leading-snug">
                        {scene.title}
                      </h3>
                      {scene.is_default_for_new_clients && (
                        <span className="shrink-0 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-medium rounded-full">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                      <span className="inline-flex items-center gap-1">
                        <Film className="w-3.5 h-3.5" />
                        {instructions.length} step{instructions.length !== 1 ? 's' : ''}
                      </span>
                      <span>•</span>
                      <span>{scene.assignments_count || 0} assigned</span>
                    </div>
                  </div>

                  {/* Card Body - Fixed height content area */}
                  <div className="p-4 flex-1 flex flex-col">
                    {/* Location & Props - Fixed height with overflow handling */}
                    <div className="min-h-[52px] mb-3">
                      {(scene.location || scene.props) ? (
                        <div className="space-y-1 text-sm">
                          {scene.location && (
                            <p className="text-gray-600 dark:text-gray-400 line-clamp-1">
                              <span className="font-medium text-gray-700 dark:text-gray-300">Location:</span> {scene.location}
                            </p>
                          )}
                          {scene.props && (
                            <p className="text-gray-600 dark:text-gray-400 line-clamp-2">
                              <span className="font-medium text-gray-700 dark:text-gray-300">Props:</span> {scene.props}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                          No location or props specified
                        </p>
                      )}
                    </div>

                    {/* Stats - Compact inline display */}
                    <div className="flex items-center gap-4 py-3 border-t border-gray-100 dark:border-gray-700 mb-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                          <TrendingUp className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {scene.assignments_count || 0}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">assigned</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                          <CheckCircle className="w-3 h-3 text-green-600 dark:text-green-400" />
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {scene.completed_count || 0}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {scene.assignments_count > 0 ? `(${completionRate}%)` : 'done'}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons - Always at bottom */}
                    <div className="flex items-center gap-2 mt-auto">
                      <button
                        onClick={() => handleAssign(scene)}
                        className="flex-1 flex items-center justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                      >
                        <UserPlus className="w-4 h-4 mr-1.5" />
                        Assign
                      </button>
                      <button
                        onClick={() => handleView(scene)}
                        className="flex items-center justify-center w-10 h-10 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg transition-colors"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(scene)}
                        className="flex items-center justify-center w-10 h-10 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(scene.id)}
                        className="flex items-center justify-center w-10 h-10 border border-gray-200 dark:border-gray-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 dark:hover:border-red-800 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Delete Scene?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to delete this scene? This will also remove all assignments. This action cannot be undone.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(showDeleteConfirm)}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modals */}
        <AddSceneModal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingScene(null);
          }}
          onSuccess={fetchScenes}
          scene={editingScene}
        />

        <AddSceneModal
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setViewingScene(null);
          }}
          scene={viewingScene}
          viewOnly={true}
        />

        <AssignSceneModal
          isOpen={isAssignModalOpen}
          onClose={() => {
            setIsAssignModalOpen(false);
            setSelectedScene(null);
          }}
          scene={selectedScene}
        />
      </StaggerContainer>
    </Layout>
  );
};

export default SceneLibrary;

