import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Video, CheckCircle2, ChevronRight, Play } from 'lucide-react';
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

  // Get color scheme based on completion
  const getColorScheme = () => {
    if (isCompleted) {
      return {
        gradient: 'from-emerald-500 to-teal-500',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        text: 'text-emerald-600',
        progress: 'from-emerald-400 to-teal-500',
        glow: 'shadow-emerald-500/20'
      };
    }
    return {
      gradient: 'from-violet-500 to-fuchsia-500',
      bg: 'bg-violet-50',
      border: 'border-violet-200',
      text: 'text-violet-600',
      progress: 'from-violet-400 to-fuchsia-500',
      glow: 'shadow-violet-500/20'
    };
  };

  const colors = getColorScheme();

  return (
    <button
      onClick={handleCardClick}
      className="w-full text-left group"
    >
      <div className={`
        relative overflow-hidden
        bg-white rounded-[28px]
        border border-gray-100
        shadow-lg ${colors.glow}
        transition-all duration-300 ease-out
        hover:shadow-xl hover:scale-[1.01]
        active:scale-[0.98]
      `}>
        {/* Top accent bar */}
        <div className={`h-1.5 bg-gradient-to-r ${colors.gradient}`} />
        
        <div className="p-5">
          {/* Header Row */}
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className={`
              w-14 h-14 rounded-2xl flex-shrink-0
              bg-gradient-to-br ${colors.gradient}
              flex items-center justify-center
              shadow-lg ${colors.glow}
              transition-transform duration-300
              group-hover:scale-105 group-hover:rotate-3
            `}>
              <Video className="w-6 h-6 text-white" />
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Status Badge */}
              <div className="mb-2">
                {isCompleted ? (
                  <div className={`
                    inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                    ${colors.bg} ${colors.border} border
                  `}>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${colors.text}`} />
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${colors.text}`}>
                      Completed
                    </span>
                  </div>
                ) : (
                  <div className={`
                    inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                    ${colors.bg} ${colors.border} border
                  `}>
                    <div className={`w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse`} />
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${colors.text}`}>
                      In Progress
                    </span>
                  </div>
                )}
              </div>
              
              {/* Title */}
              <h3 className="text-[17px] font-bold text-gray-900 leading-snug mb-3">
                {scene?.title || 'Untitled Scene'}
              </h3>
              
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-gray-500 font-medium">
                    {completedSteps} of {instructions.length} steps done
                  </span>
                  <span className={`text-[13px] font-bold ${colors.text}`}>
                    {progressPercent}%
                  </span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${colors.progress} transition-all duration-500 ease-out`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
            
            {/* Arrow */}
            <div className="flex-shrink-0 self-center">
              <div className={`
                w-10 h-10 rounded-xl
                bg-gray-50 group-hover:bg-gradient-to-br group-hover:${colors.gradient}
                flex items-center justify-center
                transition-all duration-300
              `}>
                <ChevronRight className={`
                  w-5 h-5 text-gray-400 
                  group-hover:text-white group-hover:translate-x-0.5
                  transition-all duration-300
                `} />
              </div>
            </div>
          </div>
          
          {/* Footer CTA */}
          <div className={`
            mt-4 pt-4 border-t border-gray-100
            flex items-center justify-between
          `}>
            <span className="text-[13px] text-gray-400 font-medium">
              Tap to view all steps
            </span>
            <div className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-full
              ${colors.bg} ${colors.border} border
              transition-all duration-200
              group-hover:shadow-sm
            `}>
              <Play className={`w-3.5 h-3.5 ${colors.text}`} fill="currentColor" />
              <span className={`text-[12px] font-bold ${colors.text}`}>
                {isCompleted ? 'Review' : 'Continue'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
};

export default MobileSceneCard;
