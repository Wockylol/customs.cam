import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Send, 
  Sparkles, 
  CheckCircle,
  Heart,
  MessageCircle,
  Check,
  X
} from 'lucide-react';
import { useClients } from '../hooks/useClients';
import { useVibeCheck, VoiceAnalysis } from '../hooks/useVibeCheck';
import MobilePinLock from '../components/auth/MobilePinLock';

const VibeCheckPage: React.FC = () => {
  const { clientUsername } = useParams<{ clientUsername: string }>();
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState('');
  const [showAnalysis, setShowAnalysis] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Include inactive so we can look up resigned clients
  const { clients, loading: clientsLoading } = useClients({ includeInactive: true });
  const client = clients.find(c => c.username.toLowerCase() === clientUsername?.toLowerCase());
  
  const {
    messages,
    currentStep,
    totalSteps,
    status,
    analysis,
    loading,
    sendingMessage,
    waitingForFan,
    progress,
    startVibeCheck,
    sendCreatorMessage,
    canSendMessage
  } = useVibeCheck(client?.id);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Start the conversation when page loads if not already started
  useEffect(() => {
    if (!loading && client?.id && status === 'not_started') {
      startVibeCheck();
    }
  }, [loading, client?.id, status, startVibeCheck]);

  // Show analysis reveal when complete
  useEffect(() => {
    if (status === 'completed' && analysis) {
      setTimeout(() => setShowAnalysis(true), 500);
    }
  }, [status, analysis]);

  const handleSend = () => {
    if (!inputValue.trim() || !canSendMessage) return;
    sendCreatorMessage(inputValue);
    setInputValue('');
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleBack = () => {
    navigate(`/app/${clientUsername}`);
  };

  const handleDone = () => {
    navigate(`/app/${clientUsername}`);
  };

  if (clientsLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-400">Creator not found</p>
          <button 
            onClick={() => navigate('/')}
            className="mt-4 text-blue-400 hover:text-blue-300"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  // Analyzing state
  if (status === 'analyzing') {
    return (
      <MobilePinLock clientId={client.id} clientUsername={clientUsername || ''}>
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <div className="relative mb-8">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto animate-pulse">
                <Sparkles className="w-12 h-12 text-white" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Analyzing your vibe...</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              Creating your voice profile so your team can represent you perfectly
            </p>
            <div className="mt-6 flex justify-center gap-1">
              {[0, 1, 2].map(i => (
                <div 
                  key={i}
                  className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        </div>
      </MobilePinLock>
    );
  }

  // Analysis complete - show results
  if (status === 'completed' && showAnalysis && analysis) {
    return (
      <MobilePinLock clientId={client.id} clientUsername={clientUsername || ''}>
        <AnalysisReveal 
          analysis={analysis} 
          onDone={handleDone}
        />
      </MobilePinLock>
    );
  }

  return (
    <MobilePinLock clientId={client.id} clientUsername={clientUsername || ''}>
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0a0a0a]/95 backdrop-blur-lg border-b border-white/10">
          <div className="safe-area-pt" />
          <div className="flex items-center px-4 py-3">
            <button 
              onClick={handleBack}
              className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <div className="flex items-center flex-1 ml-2">
              {/* Fan Avatar */}
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center">
                  <Heart className="w-5 h-5 text-white" fill="white" />
                </div>
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0a0a0a]" />
              </div>
              
              <div className="ml-3">
                <h1 className="text-white font-semibold text-sm">Alex 💕</h1>
                <p className="text-green-400 text-xs">Online now</p>
              </div>
            </div>

            {/* Progress indicator */}
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    i < currentStep ? 'bg-blue-500' : 'bg-gray-700'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* Introduction message */}
          {messages.length === 0 && !waitingForFan && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-blue-400" />
              </div>
              <p className="text-gray-500 text-sm">Starting conversation...</p>
            </div>
          )}

          {/* Messages */}
          <div className="space-y-3">
            {messages.map((message, index) => (
              <MessageBubble 
                key={message.id}
                message={message}
                isLatest={index === messages.length - 1}
              />
            ))}
            
            {/* Typing indicator */}
            {waitingForFan && (
              <div className="flex justify-start">
                <div className="bg-[#1a1a1a] rounded-2xl rounded-bl-md px-4 py-3 max-w-[75%]">
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <div 
                        key={i}
                        className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="sticky bottom-0 bg-[#0a0a0a] border-t border-white/10">
          <div className="px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={canSendMessage ? "Type your reply..." : "Waiting..."}
                  disabled={!canSendMessage}
                  className="w-full bg-[#1a1a1a] text-white placeholder-gray-500 rounded-full px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <button
                onClick={handleSend}
                disabled={!canSendMessage || !inputValue.trim()}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                  canSendMessage && inputValue.trim()
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 active:scale-95'
                    : 'bg-gray-800 text-gray-600'
                }`}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="safe-area-pb" />
        </div>
      </div>
    </MobilePinLock>
  );
};

// Message Bubble Component
interface MessageBubbleProps {
  message: {
    id: string;
    role: 'fan' | 'creator';
    content: string;
    timestamp: Date;
  };
  isLatest: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isLatest }) => {
  const isFan = message.role === 'fan';
  
  return (
    <div 
      className={`flex ${isFan ? 'justify-start' : 'justify-end'} animate-fade-in-up`}
      style={{ animationDelay: isLatest ? '0s' : '0s' }}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
          isFan
            ? 'bg-[#1a1a1a] text-white rounded-bl-md'
            : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-md'
        }`}
      >
        <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
          {message.content}
        </p>
      </div>
    </div>
  );
};

// Analysis Reveal Component - Updated for new VoiceAnalysis structure
interface AnalysisRevealProps {
  analysis: VoiceAnalysis;
  onDone: () => void;
}

const AnalysisReveal: React.FC<AnalysisRevealProps> = ({ analysis, onDone }) => {
  const [showCards, setShowCards] = useState(false);
  const [autoRedirectTimer, setAutoRedirectTimer] = useState(5);

  useEffect(() => {
    setTimeout(() => setShowCards(true), 300);
    
    // Auto-redirect countdown
    const interval = setInterval(() => {
      setAutoRedirectTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onDone();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [onDone]);

  // Get quick highlights from the analysis
  const quickRules = analysis.chatterPlaybook?.quickRules?.slice(0, 3) || [];
  const doNots = analysis.chatterPlaybook?.doNot?.slice(0, 2) || [];

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Confetti effect */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full animate-confetti"
            style={{
              left: `${Math.random() * 100}%`,
              backgroundColor: ['#3b82f6', '#ec4899', '#8b5cf6', '#f59e0b', '#10b981'][i % 5],
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {/* Success icon */}
        <div className={`mb-6 transition-all duration-500 ${showCards ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
          <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/30">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
        </div>

        {/* Title */}
        <h1 className={`text-2xl font-bold text-white text-center mb-2 transition-all duration-500 delay-100 ${showCards ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          Vibe Check Complete! ✨
        </h1>
        <p className={`text-gray-400 text-center mb-6 transition-all duration-500 delay-150 ${showCards ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          Your team now has your voice profile
        </p>

        {/* Quick Rules Preview */}
        {quickRules.length > 0 && (
          <div className={`w-full max-w-sm bg-green-500/10 border border-green-500/20 rounded-2xl p-4 mb-3 transition-all duration-500 delay-200 ${showCards ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
            <p className="text-green-400 text-xs font-semibold uppercase tracking-wider mb-2">Your Style</p>
            <ul className="space-y-1.5">
              {quickRules.map((rule, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-white">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Do Not Preview */}
        {doNots.length > 0 && (
          <div className={`w-full max-w-sm bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-6 transition-all duration-500 delay-300 ${showCards ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
            <p className="text-red-400 text-xs font-semibold uppercase tracking-wider mb-2">Avoid</p>
            <ul className="space-y-1.5">
              {doNots.map((rule, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-white">
                  <X className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Writing Style Tags */}
        <div className={`w-full max-w-sm flex flex-wrap justify-center gap-2 mb-8 transition-all duration-500 delay-400 ${showCards ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
          {analysis.writingMechanics?.emoji?.frequency && (
            <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-medium">
              {analysis.writingMechanics.emoji.frequency} emojis
            </span>
          )}
          {analysis.writingMechanics?.messageStructure?.typicalLength && (
            <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs font-medium">
              {analysis.writingMechanics.messageStructure.typicalLength} messages
            </span>
          )}
          {analysis.writingMechanics?.formality?.pronouns && (
            <span className="px-3 py-1 bg-pink-500/20 text-pink-400 rounded-full text-xs font-medium">
              says "{analysis.writingMechanics.formality.pronouns}"
            </span>
          )}
        </div>

        {/* Done button */}
        <button
          onClick={onDone}
          className={`w-full max-w-sm bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 active:scale-[0.98] transition-all duration-500 delay-500 ${showCards ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}
        >
          Done
        </button>
        
        <p className={`text-gray-600 text-xs mt-3 transition-all duration-500 delay-600 ${showCards ? 'opacity-100' : 'opacity-0'}`}>
          Redirecting in {autoRedirectTimer}s...
        </p>
      </div>
    </div>
  );
};

// Add CSS animation for confetti
const style = document.createElement('style');
style.textContent = `
  @keyframes confetti {
    0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
    100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
  }
  .animate-confetti {
    animation: confetti 4s ease-in-out infinite;
  }
  @keyframes fade-in-up {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in-up {
    animation: fade-in-up 0.3s ease-out forwards;
  }
`;
if (!document.getElementById('vibe-check-styles')) {
  style.id = 'vibe-check-styles';
  document.head.appendChild(style);
}

export default VibeCheckPage;
