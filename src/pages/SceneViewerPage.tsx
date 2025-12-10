import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight, MapPin, Package, Upload, CheckCircle, Image as ImageIcon, Video, Eye } from 'lucide-react';
import { SceneInstruction } from '../types';
import { useSceneUploads } from '../hooks/useSceneUploads';
import { useSceneExamples } from '../hooks/useSceneExamples';
import { useContentScenes } from '../hooks/useContentScenes';
import { useClients } from '../hooks/useClients';
import SceneUploadModal from '../components/modals/SceneUploadModal';
import MobilePinLock from '../components/auth/MobilePinLock';

const SceneViewerPage: React.FC = () => {
  const { assignmentId, clientUsername } = useParams<{ assignmentId: string; clientUsername: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const assignment = location.state?.assignment;
  const scene = location.state?.scene;
  
  const { uploads } = useSceneUploads(assignmentId);
  const { examples, getDownloadUrl } = useSceneExamples(scene?.id);
  const { markSceneComplete } = useContentScenes();
  const { clients } = useClients();
  
  const client = clients.find((c) => c.username.toLowerCase() === clientUsername?.toLowerCase());
  
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [exampleUrls, setExampleUrls] = useState<{ [key: string]: string }>({});
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);

  const instructions: SceneInstruction[] = Array.isArray(scene?.instructions) 
    ? scene.instructions 
    : [];

  // Load example URLs
  useEffect(() => {
    const loadExampleUrls = async () => {
      if (examples.length > 0) {
        const urls: { [key: string]: string } = {};
        for (const example of examples) {
          const { url } = await getDownloadUrl(example.file_path);
          if (url) {
            urls[example.id] = url;
          }
        }
        setExampleUrls(urls);
      }
    };
    
    if (examples.length > 0) {
      loadExampleUrls();
    }
  }, [examples]);

  const getStepUploads = (stepIndex: number) => {
    return uploads.filter(upload => upload.step_index === stepIndex);
  };

  const completedSteps = instructions.filter((_, index) => 
    getStepUploads(index).length > 0
  ).length;

  const isCompleted = assignment?.status === 'completed';

  const handleUploadClick = (stepIndex: number) => {
    setSelectedStepIndex(stepIndex);
    setUploadModalOpen(true);
  };

  const handleMarkComplete = async () => {
    if (!assignmentId) return;
    const { error } = await markSceneComplete(assignmentId);
    if (!error) {
      // Navigate back after marking complete
      navigate(-1);
    }
  };

  // Calculate total slides
  const hasExamples = examples.length > 0;
  const totalSlides = 1 + (hasExamples ? 1 : 0) + instructions.length + 1;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && currentSlide < totalSlides - 1) {
      setCurrentSlide(prev => prev + 1);
    }
    if (isRightSwipe && currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }

    setTouchStart(0);
    setTouchEnd(0);
  };

  const goToNextSlide = () => {
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide(prev => prev + 1);
    }
  };

  const goToPrevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  const getSlideContent = () => {
    let slideIndex = 0;

    // Slide 0: Cover
    if (currentSlide === slideIndex) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6">
          <div className="w-full max-w-md space-y-4">
            {/* Icon and Title Card */}
            <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Video className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{scene?.title}</h1>
              {isCompleted && (
                <div className="inline-flex items-center mt-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Completed
                </div>
              )}
            </div>

            {/* Location & Props Card */}
            {(scene?.location || scene?.props) && (
              <div className="bg-white rounded-2xl shadow-lg p-5 space-y-3">
                {scene.location && (
                  <div className="flex items-start">
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                      <MapPin className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-xs text-gray-600 font-medium mb-0.5">Location</p>
                      <p className="text-gray-900 text-sm">{scene.location}</p>
                    </div>
                  </div>
                )}
                {scene.props && (
                  <div className="flex items-start">
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                      <Package className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-xs text-gray-600 font-medium mb-0.5">Props</p>
                      <p className="text-gray-900 text-sm">{scene.props}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Progress Card */}
            <div className="bg-white rounded-2xl shadow-lg p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-700 font-medium text-sm">Progress</span>
                <span className="text-gray-900 font-bold">{completedSteps} of {instructions.length}</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    isCompleted 
                      ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                      : 'bg-gradient-to-r from-orange-400 to-red-500'
                  }`}
                  style={{ width: `${instructions.length > 0 ? (completedSteps / instructions.length) * 100 : 0}%` }}
                />
              </div>
            </div>

            <p className="text-gray-500 text-sm text-center">Swipe to continue →</p>
          </div>
        </div>
      );
    }
    slideIndex++;

    // Slide 1: Example Media (if exists)
    if (hasExamples && currentSlide === slideIndex) {
      return (
        <div className="flex flex-col h-full p-6">
          <div className="mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
              <Eye className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-1">Example Media</h2>
            <p className="text-gray-600 text-sm text-center">Reference examples for this scene</p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3">
            {examples.map((example) => (
              <div key={example.id} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                {example.file_type.startsWith('image/') && exampleUrls[example.id] ? (
                  <img
                    src={exampleUrls[example.id]}
                    alt="Example media"
                    className="w-full h-56 object-cover"
                  />
                ) : example.file_type.startsWith('video/') && exampleUrls[example.id] ? (
                  <video
                    src={exampleUrls[example.id]}
                    controls
                    playsInline
                    className="w-full h-56 object-cover bg-black"
                  >
                    <source src={exampleUrls[example.id]} type={example.file_type} />
                  </video>
                ) : (
                  <div className="w-full h-56 bg-gray-100 flex items-center justify-center">
                    <ImageIcon className="w-12 h-12 text-gray-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }
    if (hasExamples) slideIndex++;

    // Instruction Slides
    const instructionIndex = currentSlide - slideIndex;
    if (instructionIndex >= 0 && instructionIndex < instructions.length) {
      const instruction = instructions[instructionIndex];
      const stepUploads = getStepUploads(instructionIndex);
      const hasUploads = stepUploads.length > 0;

      return (
        <div className="flex flex-col h-full p-6">
          <div className="mb-4">
            <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full text-white font-semibold mb-3 shadow-lg">
              {instruction.type === 'video' ? (
                <>
                  <Video className="w-5 h-5 mr-2" />
                  Video #{instruction.number}
                </>
              ) : (
                <>
                  <ImageIcon className="w-5 h-5 mr-2" />
                  Photo #{instruction.number}
                </>
              )}
              {instruction.duration && <span className="ml-2">• {instruction.duration}</span>}
            </div>
            <h2 className="text-xl font-bold text-gray-900 text-center">Step {instructionIndex + 1} of {instructions.length}</h2>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3">
            <div className="bg-white rounded-2xl shadow-lg p-5">
              <p className="text-gray-900 font-semibold whitespace-pre-wrap leading-relaxed">{instruction.description}</p>
            </div>

            {hasUploads ? (
              <div className="bg-white rounded-2xl shadow-lg p-5 border-2 border-green-400">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900">{stepUploads.length} file{stepUploads.length !== 1 ? 's' : ''} uploaded</span>
                    <p className="text-xs text-gray-600">Content ready</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {stepUploads.slice(0, 4).map((upload) => (
                    <div key={upload.id} className="bg-green-50 rounded-lg p-2 border border-green-200">
                      <p className="text-green-700 text-xs truncate">{upload.file_name}</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => handleUploadClick(instructionIndex)}
                  className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
                >
                  Manage Uploads
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleUploadClick(instructionIndex)}
                className="w-full py-4 bg-white rounded-2xl shadow-lg text-gray-900 font-semibold hover:shadow-xl transition-all flex items-center justify-center border-2 border-gray-200"
              >
                <Upload className="w-5 h-5 mr-2 text-orange-500" />
                Upload Content
              </button>
            )}
          </div>
        </div>
      );
    }
    slideIndex += instructions.length;

    // Final Slide: Completion
    if (currentSlide === slideIndex) {
      const allStepsComplete = completedSteps === instructions.length;
      
      return (
        <div className="flex flex-col items-center justify-center h-full p-6">
          <div className="bg-white rounded-3xl shadow-xl p-8 text-center w-full max-w-md">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg ${
              isCompleted 
                ? 'bg-gradient-to-br from-green-400 to-emerald-500'
                : allStepsComplete
                ? 'bg-gradient-to-br from-green-400 to-emerald-500'
                : 'bg-gradient-to-br from-orange-400 to-red-500'
            }`}>
              {isCompleted ? (
                <CheckCircle className="w-12 h-12 text-white" />
              ) : allStepsComplete ? (
                <CheckCircle className="w-12 h-12 text-white" />
              ) : (
                <Upload className="w-12 h-12 text-white" />
              )}
            </div>

            {isCompleted ? (
              <>
                <h2 className="text-3xl font-bold text-gray-900 mb-3">All Done!</h2>
                <p className="text-gray-600 mb-6">
                  You completed this scene on {new Date(assignment.completed_at).toLocaleDateString()}
                </p>
                <div className="py-3 px-6 bg-green-100 text-green-700 rounded-xl font-medium inline-block">
                  Scene Completed ✓
                </div>
              </>
            ) : allStepsComplete ? (
              <>
                <h2 className="text-3xl font-bold text-gray-900 mb-3">Ready to Submit?</h2>
                <p className="text-gray-600 mb-6">
                  You've uploaded content for all {instructions.length} steps!
                </p>
                <button
                  onClick={handleMarkComplete}
                  className="w-full px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold text-lg rounded-2xl hover:shadow-xl transition-all active:scale-95"
                >
                  Mark as Complete
                </button>
              </>
            ) : (
              <>
                <h2 className="text-3xl font-bold text-gray-900 mb-3">Mark This Scene Complete?</h2>
                <p className="text-gray-600 mb-6">
                  You've completed {completedSteps} of {instructions.length} steps
                </p>
                <div className="w-full mb-6">
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-400 to-red-500 transition-all duration-300"
                      style={{ width: `${(completedSteps / instructions.length) * 100}%` }}
                    />
                  </div>
                </div>
                <button
                  onClick={handleMarkComplete}
                  className="w-full px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold text-lg rounded-2xl hover:shadow-xl transition-all active:scale-95 mb-3"
                >
                  Mark as Complete
                </button>
                <p className="text-xs text-gray-500 mt-2">
                  This lets your team know you've finished working on this scene, even if some steps are incomplete.
                </p>
              </>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  if (!assignment || !scene) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50">
        <p className="text-gray-600">Scene not found</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <MobilePinLock clientId={client.id} clientUsername={clientUsername || ''}>
    <div className="fixed inset-0 bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 animate-slide-in-right">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 safe-top">
        <div className="flex items-center justify-between">
          {/* Progress Dots */}
          <div className="flex items-center space-x-2 flex-1 justify-center">
            {Array.from({ length: totalSlides }).map((_, index) => (
              <div
                key={index}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === currentSlide 
                    ? 'bg-gradient-to-r from-orange-400 to-red-500 w-8' 
                    : 'bg-gray-300 w-1.5'
                }`}
              />
            ))}
          </div>

          {/* Close Button */}
          <button
            onClick={() => navigate(-1)}
            className="bg-white shadow-lg text-gray-700 p-2 rounded-full hover:bg-gray-50 active:scale-95 transition-all ml-4"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Slide Container */}
      <div
        className="h-full w-full pt-16 pb-24"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {getSlideContent()}
      </div>

      {/* Bottom Navigation Bar */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-4 safe-bottom">
        <div className="flex items-center justify-between max-w-md mx-auto">
          {/* Left Arrow */}
          {currentSlide > 0 ? (
            <button
              onClick={goToPrevSlide}
              className="bg-white shadow-lg text-gray-700 p-3 rounded-full hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          ) : (
            <div className="w-12 h-12"></div>
          )}
          
          {/* Slide Counter */}
          <div className="bg-white shadow-lg text-gray-700 px-5 py-2.5 rounded-full text-sm font-medium">
            {currentSlide + 1} / {totalSlides}
          </div>

          {/* Right Arrow */}
          {currentSlide < totalSlides - 1 ? (
            <button
              onClick={goToNextSlide}
              className="bg-white shadow-lg text-gray-700 p-3 rounded-full hover:bg-gray-50 transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          ) : (
            <div className="w-12 h-12"></div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {selectedStepIndex !== null && (
        <SceneUploadModal
          isOpen={uploadModalOpen}
          onClose={() => {
            setUploadModalOpen(false);
            setSelectedStepIndex(null);
          }}
          assignment={assignment}
          scene={scene}
          stepIndex={selectedStepIndex}
        />
      )}
    </div>
    </MobilePinLock>
  );
};

export default SceneViewerPage;

