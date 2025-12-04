import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, MapPin, Package, Upload, CheckCircle, Image as ImageIcon, Video, Eye } from 'lucide-react';
import { SceneInstruction } from '../../types';
import { useSceneUploads } from '../../hooks/useSceneUploads';
import { useSceneExamples } from '../../hooks/useSceneExamples';

interface SwipeableSceneViewerProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: any;
  scene: any;
  onUploadClick: (stepIndex: number) => void;
  onMarkComplete: () => void;
}

const SwipeableSceneViewer: React.FC<SwipeableSceneViewerProps> = ({
  isOpen,
  onClose,
  assignment,
  scene,
  onUploadClick,
  onMarkComplete
}) => {
  const { uploads } = useSceneUploads(assignment?.id);
  const { examples, getDownloadUrl } = useSceneExamples(scene?.id);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [exampleUrls, setExampleUrls] = useState<{ [key: string]: string }>({});
  const containerRef = useRef<HTMLDivElement>(null);

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
    
    if (isOpen && examples.length > 0) {
      loadExampleUrls();
    }
  }, [isOpen, examples]);

  // Reset to first slide when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentSlide(0);
    }
  }, [isOpen]);

  const getStepUploads = (stepIndex: number) => {
    return uploads.filter(upload => upload.step_index === stepIndex);
  };

  const completedSteps = instructions.filter((_, index) => 
    getStepUploads(index).length > 0
  ).length;

  const isCompleted = assignment?.status === 'completed';

  // Calculate total slides
  const hasExamples = examples.length > 0;
  const totalSlides = 1 + (hasExamples ? 1 : 0) + instructions.length + 1; // Cover + Examples + Instructions + Completion

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

  if (!isOpen) return null;

  const getSlideContent = () => {
    let slideIndex = 0;

    // Slide 0: Cover
    if (currentSlide === slideIndex) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-gradient-to-br from-orange-400 to-red-500">
          <div className="mb-8">
            <div className="w-20 h-20 bg-white bg-opacity-20 backdrop-blur-sm rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Video className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">{scene.title}</h1>
          </div>

          {(scene.location || scene.props) && (
            <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-2xl p-6 mb-8 w-full max-w-md">
              {scene.location && (
                <div className="flex items-start mb-4 last:mb-0">
                  <MapPin className="w-5 h-5 text-white mr-3 mt-0.5 flex-shrink-0" />
                  <div className="text-left">
                    <p className="text-xs text-white text-opacity-80 font-medium mb-1">Location</p>
                    <p className="text-white">{scene.location}</p>
                  </div>
                </div>
              )}
              {scene.props && (
                <div className="flex items-start">
                  <Package className="w-5 h-5 text-white mr-3 mt-0.5 flex-shrink-0" />
                  <div className="text-left">
                    <p className="text-xs text-white text-opacity-80 font-medium mb-1">Props</p>
                    <p className="text-white">{scene.props}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-3">
              <span className="text-white text-opacity-90 font-medium">Progress</span>
              <span className="text-white font-bold">{completedSteps} of {instructions.length}</span>
            </div>
            <div className="h-3 bg-white bg-opacity-20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-300"
                style={{ width: `${instructions.length > 0 ? (completedSteps / instructions.length) * 100 : 0}%` }}
              />
            </div>
          </div>

          {isCompleted && (
            <div className="mt-6 flex items-center text-white">
              <CheckCircle className="w-5 h-5 mr-2" />
              <span className="font-medium">Completed</span>
            </div>
          )}

          <p className="text-white text-opacity-80 text-sm mt-8">Swipe to continue →</p>
        </div>
      );
    }
    slideIndex++;

    // Slide 1: Example Media (if exists)
    if (hasExamples && currentSlide === slideIndex) {
      return (
        <div className="flex flex-col h-full bg-gradient-to-br from-purple-500 to-indigo-600">
          <div className="p-6 text-center">
            <Eye className="w-8 h-8 text-white mx-auto mb-3" />
            <h2 className="text-2xl font-bold text-white mb-2">Example Media</h2>
            <p className="text-white text-opacity-90 text-sm">Reference examples for this scene</p>
          </div>

          <div className="flex-1 overflow-y-auto p-6 pt-0">
            <div className="grid grid-cols-1 gap-4">
              {examples.map((example) => (
                <div key={example.id} className="bg-white bg-opacity-10 backdrop-blur-md rounded-2xl overflow-hidden">
                  {example.file_type.startsWith('image/') && exampleUrls[example.id] ? (
                    <img
                      src={exampleUrls[example.id]}
                      alt={example.file_name}
                      className="w-full h-64 object-cover"
                    />
                  ) : example.file_type.startsWith('video/') && exampleUrls[example.id] ? (
                    <video
                      src={exampleUrls[example.id]}
                      controls
                      playsInline
                      className="w-full h-64 object-cover bg-black"
                    >
                      <source src={exampleUrls[example.id]} type={example.file_type} />
                    </video>
                  ) : (
                    <div className="w-full h-64 bg-white bg-opacity-5 flex items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-white text-opacity-50" />
                    </div>
                  )}
                  <div className="p-3">
                    <p className="text-white text-sm truncate">{example.file_name}</p>
                  </div>
                </div>
              ))}
            </div>
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
        <div className="flex flex-col h-full bg-gradient-to-br from-blue-500 to-cyan-500">
          <div className="p-6 text-center">
            <div className="inline-flex items-center px-4 py-2 bg-white bg-opacity-20 backdrop-blur-sm rounded-full text-white font-semibold mb-4">
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
            <h2 className="text-xl font-bold text-white mb-2">Step {instructionIndex + 1} of {instructions.length}</h2>
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-6">
            <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-2xl p-6 mb-4">
              <p className="text-white whitespace-pre-wrap leading-relaxed">{instruction.description}</p>
            </div>

            {hasUploads ? (
              <div className="bg-green-500 bg-opacity-20 backdrop-blur-md rounded-2xl p-6 border-2 border-green-400">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center text-white">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    <span className="font-semibold">{stepUploads.length} file{stepUploads.length !== 1 ? 's' : ''} uploaded</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {stepUploads.slice(0, 4).map((upload) => (
                    <div key={upload.id} className="bg-white bg-opacity-20 rounded-lg p-2">
                      <p className="text-white text-xs truncate">{upload.file_name}</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => onUploadClick(instructionIndex)}
                  className="w-full py-3 bg-white text-green-600 font-semibold rounded-xl hover:bg-opacity-90 transition-all"
                >
                  Manage Uploads
                </button>
              </div>
            ) : (
              <button
                onClick={() => onUploadClick(instructionIndex)}
                className="w-full py-4 bg-white bg-opacity-20 backdrop-blur-md text-white font-semibold rounded-2xl hover:bg-opacity-30 transition-all border-2 border-white border-opacity-30 flex items-center justify-center"
              >
                <Upload className="w-5 h-5 mr-2" />
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
        <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-gradient-to-br from-emerald-400 to-teal-500">
          <div className="w-24 h-24 bg-white bg-opacity-20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-6">
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
              <h2 className="text-3xl font-bold text-white mb-3">All Done!</h2>
              <p className="text-white text-opacity-90 mb-8">
                You completed this scene on {new Date(assignment.completed_at).toLocaleDateString()}
              </p>
            </>
          ) : allStepsComplete ? (
            <>
              <h2 className="text-3xl font-bold text-white mb-3">Ready to Submit?</h2>
              <p className="text-white text-opacity-90 mb-8">
                You've uploaded content for all {instructions.length} steps!
              </p>
              <button
                onClick={onMarkComplete}
                className="px-8 py-4 bg-white text-emerald-600 font-bold text-lg rounded-2xl hover:scale-105 transition-transform shadow-lg"
              >
                Mark as Complete
              </button>
            </>
          ) : (
            <>
              <h2 className="text-3xl font-bold text-white mb-3">Keep Going!</h2>
              <p className="text-white text-opacity-90 mb-4">
                You've completed {completedSteps} of {instructions.length} steps
              </p>
              <div className="w-full max-w-xs">
                <div className="h-3 bg-white bg-opacity-20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-300"
                    style={{ width: `${(completedSteps / instructions.length) * 100}%` }}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4">
        <div className="flex items-center justify-between">
          {/* Progress Dots */}
          <div className="flex items-center space-x-2 flex-1 justify-center">
            {Array.from({ length: totalSlides }).map((_, index) => (
              <div
                key={index}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === currentSlide 
                    ? 'bg-white w-8' 
                    : 'bg-white bg-opacity-30 w-1.5'
                }`}
              />
            ))}
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="bg-white bg-opacity-20 backdrop-blur-sm text-white p-2 rounded-full hover:bg-opacity-30 transition-colors ml-4"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Slide Container */}
      <div
        ref={containerRef}
        className="h-full w-full pt-16"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {getSlideContent()}
      </div>

      {/* Navigation Arrows */}
      {currentSlide > 0 && (
        <button
          onClick={goToPrevSlide}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-20 backdrop-blur-sm text-white p-3 rounded-full hover:bg-opacity-30 transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}
      {currentSlide < totalSlides - 1 && (
        <button
          onClick={goToNextSlide}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-20 backdrop-blur-sm text-white p-3 rounded-full hover:bg-opacity-30 transition-colors"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Slide Counter */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white bg-opacity-20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium">
        {currentSlide + 1} / {totalSlides}
      </div>
    </div>
  );
};

export default SwipeableSceneViewer;

