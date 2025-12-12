import React, { useState, useMemo, useEffect } from 'react';
import { Search, Film, User, Calendar, CheckCircle, Clock, Eye, Trash2, Download, Archive, Filter, Users, Video } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { useContentScenes } from '../hooks/useContentScenes';
import { useClients } from '../hooks/useClients';
import { supabase } from '../lib/supabase';
import SceneContentViewerModal from '../components/modals/SceneContentViewerModal';
import CustomSelect from '../components/ui/CustomSelect';

interface AssignmentWithDetails {
  id: string;
  client_id: string;
  scene_id: string;
  status: string;
  assigned_at: string;
  completed_at: string | null;
  notes: string | null;
  client?: {
    username: string;
    avatar_url: string | null;
  };
  scene?: {
    title: string;
    instructions: any[];
  };
  uploads_count?: number;
  total_steps?: number;
}

const SceneAssignments: React.FC = () => {
  const { scenes } = useContentScenes();
  const { clients } = useClients();
  const [assignments, setAssignments] = useState<AssignmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'archived'>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [sceneFilter, setSceneFilter] = useState<string>('all');
  const [assignmentToDelete, setAssignmentToDelete] = useState<string | null>(null);
  const [assignmentToArchive, setAssignmentToArchive] = useState<string | null>(null);
  const [viewingAssignment, setViewingAssignment] = useState<{
    id: string;
    clientName: string;
    sceneTitle: string;
  } | null>(null);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      setLoading(true);

      // Fetch all assignments with related data
      const { data: assignmentsData, error } = await supabase
        .from('client_scene_assignments')
        .select(`
          *,
          clients (username, avatar_url),
          content_scenes (title, instructions)
        `)
        .order('assigned_at', { ascending: false });

      if (error) throw error;

      // Fetch upload counts for each assignment
      const assignmentsWithCounts = await Promise.all(
        (assignmentsData || []).map(async (assignment) => {
          const { count } = await supabase
            .from('scene_content_uploads')
            .select('*', { count: 'exact', head: true })
            .eq('assignment_id', assignment.id);

          const scene = assignment.content_scenes as any;
          const totalSteps = scene?.instructions?.length || 0;

          return {
            ...assignment,
            client: assignment.clients as any,
            scene: scene,
            uploads_count: count || 0,
            total_steps: totalSteps
          };
        })
      );

      setAssignments(assignmentsWithCounts as AssignmentWithDetails[]);
    } catch (err: any) {
      console.error('Error fetching assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnassign = async () => {
    if (!assignmentToDelete) return;

    const { error } = await supabase
      .from('client_scene_assignments')
      .delete()
      .eq('id', assignmentToDelete);

    if (error) {
      alert(`Error removing assignment: ${error.message}`);
    } else {
      fetchAssignments();
    }
    
    setAssignmentToDelete(null);
  };

  const handleArchive = async () => {
    if (!assignmentToArchive) return;

    const { error } = await supabase
      .from('client_scene_assignments')
      .update({ 
        status: 'archived',
        archived_at: new Date().toISOString()
      })
      .eq('id', assignmentToArchive);

    if (error) {
      alert(`Error archiving assignment: ${error.message}`);
    } else {
      fetchAssignments();
    }
    
    setAssignmentToArchive(null);
  };

  // Filter assignments
  const filteredAssignments = useMemo(() => {
    return assignments.filter(assignment => {
      // Status filter
      if (statusFilter === 'all') {
        // When 'all' is selected, exclude archived assignments
        if (assignment.status === 'archived') {
          return false;
        }
      } else if (assignment.status !== statusFilter) {
        return false;
      }

      // Client filter
      if (clientFilter !== 'all' && assignment.client_id !== clientFilter) {
        return false;
      }

      // Scene filter
      if (sceneFilter !== 'all' && assignment.scene_id !== sceneFilter) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const clientName = assignment.client?.username?.toLowerCase() || '';
        const sceneTitle = assignment.scene?.title?.toLowerCase() || '';
        return clientName.includes(query) || sceneTitle.includes(query);
      }

      return true;
    });
  }, [assignments, statusFilter, clientFilter, sceneFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = assignments.length;
    const pending = assignments.filter(a => a.status === 'pending').length;
    const completed = assignments.filter(a => a.status === 'completed').length;
    const archived = assignments.filter(a => a.status === 'archived').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, pending, completed, archived, completionRate };
  }, [assignments]);

  const getProgressColor = (uploads: number, total: number) => {
    if (total === 0) return 'bg-gray-400';
    const percentage = (uploads / total) * 100;
    if (percentage === 0) return 'bg-gray-400';
    if (percentage < 50) return 'bg-red-500';
    if (percentage < 100) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <Layout title="Scene Assignments">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading assignments...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Scene Assignments">
      <div className="space-y-6">
        {/* Header with Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center">
              <Film className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Scene Assignments</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {stats.total} total • {stats.pending} pending • {stats.completed} completed • {stats.archived} archived
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Assignments</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <Film className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.pending}</p>
              </div>
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.completed}</p>
              </div>
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Completion Rate</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.completionRate}%</p>
              </div>
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Filters
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none z-10" />
              <input
                type="text"
                placeholder="Search client or scene..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md"
              />
            </div>

            {/* Status Filter */}
            <CustomSelect
              value={statusFilter}
              onChange={(value) => setStatusFilter(value as any)}
              icon={<Filter className="w-4 h-4" />}
              options={[
                { value: 'all', label: 'All Status' },
                { 
                  value: 'pending', 
                  label: 'Pending',
                  icon: <Clock className="w-4 h-4 text-orange-500" />
                },
                { 
                  value: 'completed', 
                  label: 'Completed',
                  icon: <CheckCircle className="w-4 h-4 text-green-500" />
                },
                { 
                  value: 'archived', 
                  label: 'Archived',
                  icon: <Archive className="w-4 h-4 text-gray-500" />
                }
              ]}
            />

            {/* Client Filter */}
            <CustomSelect
              value={clientFilter}
              onChange={setClientFilter}
              icon={<Users className="w-4 h-4" />}
              options={[
                { value: 'all', label: 'All Clients' },
                ...clients.map(client => ({
                  value: client.id,
                  label: client.username,
                  icon: <User className="w-4 h-4 text-purple-500" />
                }))
              ]}
            />

            {/* Scene Filter */}
            <CustomSelect
              value={sceneFilter}
              onChange={setSceneFilter}
              icon={<Video className="w-4 h-4" />}
              options={[
                { value: 'all', label: 'All Scenes' },
                ...scenes.map(scene => ({
                  value: scene.id,
                  label: scene.title,
                  icon: <Film className="w-4 h-4 text-red-500" />
                }))
              ]}
            />
          </div>
        </div>

        {/* Assignments Table */}
        {filteredAssignments.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 p-12 text-center">
            <Film className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              {searchQuery || statusFilter !== 'all' || clientFilter !== 'all' || sceneFilter !== 'all'
                ? 'No assignments match your filters'
                : 'No scene assignments yet'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Assign scenes to clients from the Scene Library
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Scene
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Progress
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Assigned
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredAssignments.map((assignment) => {
                    const progressPercent = assignment.total_steps > 0
                      ? Math.round((assignment.uploads_count! / assignment.total_steps) * 100)
                      : 0;

                    return (
                      <tr key={assignment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8">
                              {assignment.client?.avatar_url ? (
                                <img
                                  src={assignment.client.avatar_url}
                                  alt={assignment.client.username}
                                  className="h-8 w-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
                                  <User className="w-4 h-4 text-white" />
                                </div>
                              )}
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {assignment.client?.username || 'Unknown'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-900 dark:text-white font-medium">
                            {assignment.scene?.title || 'Unknown Scene'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {assignment.total_steps} steps
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <div className="flex-1">
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all ${getProgressColor(
                                    assignment.uploads_count!,
                                    assignment.total_steps
                                  )}`}
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </div>
                            </div>
                            <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                              {assignment.uploads_count}/{assignment.total_steps}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {assignment.status === 'completed' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Completed
                            </span>
                          ) : assignment.status === 'archived' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-400">
                              <Archive className="w-3 h-3 mr-1" />
                              Archived
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-400">
                              <Clock className="w-3 h-3 mr-1" />
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                            <Calendar className="w-4 h-4 mr-1" />
                            {new Date(assignment.assigned_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => setViewingAssignment({
                                id: assignment.id,
                                clientName: assignment.client?.username || 'Unknown',
                                sceneTitle: assignment.scene?.title || 'Unknown Scene'
                              })}
                              className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300"
                              title="View and download content"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <a
                              href={`/app/${assignment.client?.username}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                              title="View client dashboard"
                            >
                              <Eye className="w-4 h-4" />
                            </a>
                            {assignment.status !== 'archived' && (
                              <button
                                onClick={() => setAssignmentToArchive(assignment.id)}
                                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300"
                                title="Archive assignment"
                              >
                                <Archive className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => setAssignmentToDelete(assignment.id)}
                              className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                              title="Remove assignment"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Archive Confirmation Modal */}
        {assignmentToArchive && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Archive Assignment?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to archive this scene assignment? The assignment will be marked as archived and can be filtered separately.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setAssignmentToArchive(null)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleArchive}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Archive
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {assignmentToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Remove Assignment?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to remove this scene assignment? The client will no longer have access to this scene.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setAssignmentToDelete(null)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUnassign}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Scene Content Viewer Modal */}
        {viewingAssignment && (
          <SceneContentViewerModal
            isOpen={true}
            onClose={() => setViewingAssignment(null)}
            assignmentId={viewingAssignment.id}
            clientName={viewingAssignment.clientName}
            sceneTitle={viewingAssignment.sceneTitle}
          />
        )}
      </div>
    </Layout>
  );
};

export default SceneAssignments;

