import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Video, CheckCircle, ChevronRight } from 'lucide-react';
import { SceneInstruction } from '../../types';
import { useSceneUploads } from '../../hooks/useSceneUploads';
import { useSceneExamples } from '../../hooks/useSceneExamples';

interface MobileSceneCardProps {
  assignment: any;
  scene: any;
  onUploadClick: (stepIndex: number) => void;
  onMarkComplete: () => void;
}

const MobileSceneCard: React.FC<MobileSceneCardProps> = ({
  assignment,
  scene,
  onUploadClick,
  onMarkComplete
}) => {
  const navigate = useNavigate();
  const { clientUsername } = useParams<{ clientUsername: string }>();
  const { uploads } = useSceneUploads(assignment.id);
  const { examples } = useSceneExamples(scene?.id);

  const handleCardClick = () => {
    // Navigate to the scene viewer page with assignment and scene data
    navigate(`/app/${clientUsername}/scene/${assignment.id}`, {
      state: { assignment, scene }
    });
  };

  const instructions: SceneInstruction[] = Array.isArray(scene?.instructions) 
    ? scene.instructions 
    : [];

  const getStepUploads = (stepIndex: number) => {
    return uploads.filter(upload => upload.step_index === stepIndex);
  };

  const completedSteps = instructions.filter((_, index) => 
    getStepUploads(index).length > 0
  ).length;

  const progressPercent = instructions.length > 0 
    ? Math.round((completedSteps / instructions.length) * 100)
    : 0;

  const isCompleted = assignment.status === 'completed';

  return (
    <>
      {/* Simplified Card - Tap to Open Scene Viewer Page */}
      <button
        onClick={handleCardClick}
        className="group ios-card rounded-2xl overflow-hidden w-full p-4 flex items-start space-x-3 transition-all duration-300 transform hover:scale-102 active:scale-98 card-hover-lift"
      >
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-lg transition-transform duration-300 hover:rotate-6">
          <Video className="w-6 h-6 text-white transition-transform duration-200" />
        </div>

        <div className="flex-1 min-w-0 text-left">
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            {scene?.title || 'Untitled Scene'}
          </h3>
          
          {/* Progress */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400 transition-all duration-200">
                {completedSteps} of {instructions.length} steps
              </span>
              <span className={`font-semibold transition-all duration-300 ${
                isCompleted ? 'text-green-600' : 'text-orange-600'
              }`}>
                {progressPercent}%
              </span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ease-out ${
                  isCompleted 
                    ? 'bg-gradient-to-r from-green-400 to-emerald-500' 
                    : 'bg-gradient-to-r from-orange-400 to-red-500'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Status Badge */}
          {isCompleted && (
            <div className="flex items-center mt-2 animate-fade-in-scale">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 transition-all duration-200">
                <CheckCircle className="w-3 h-3 mr-1 transition-transform duration-200" />
                Completed
              </span>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 flex items-center">
          <span className="text-xs text-gray-500 dark:text-gray-400 mr-2 transition-opacity duration-200">Tap to view</span>
          <ChevronRight className="w-5 h-5 text-orange-500 transition-transform duration-300 group-hover:translate-x-1" />
        </div>
      </button>
    </>
  );
};

export default MobileSceneCard;
