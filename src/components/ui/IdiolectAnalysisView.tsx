import React, { useState } from 'react';
import { 
  Sparkles, 
  MessageCircle, 
  Heart, 
  Zap, 
  Star, 
  Copy, 
  Check,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Clock
} from 'lucide-react';
import { IdiolectAnalysisData } from '../../hooks/useIdiolectAnalysis';

interface IdiolectAnalysisViewProps {
  analysis: IdiolectAnalysisData | null;
  loading: boolean;
  clientUsername: string;
}

const IdiolectAnalysisView: React.FC<IdiolectAnalysisViewProps> = ({ 
  analysis, 
  loading,
  clientUsername 
}) => {
  const [showTranscript, setShowTranscript] = useState(false);
  const [copiedGuidelines, setCopiedGuidelines] = useState(false);

  const handleCopyGuidelines = async () => {
    if (analysis?.chatter_guidelines) {
      await navigator.clipboard.writeText(analysis.chatter_guidelines);
      setCopiedGuidelines(true);
      setTimeout(() => setCopiedGuidelines(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">Loading analysis...</p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <MessageCircle className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No Vibe Check Yet
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm max-w-md mx-auto">
          @{clientUsername} hasn't completed their Vibe Check simulation yet. 
          Once they do, their communication style analysis will appear here.
        </p>
      </div>
    );
  }

  if (analysis.status !== 'completed') {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8 text-amber-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Vibe Check In Progress
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm max-w-md mx-auto">
          @{clientUsername} has started their Vibe Check but hasn't finished yet.
          They're {Math.round((analysis.current_step / 8) * 100)}% complete.
        </p>
        <div className="mt-4 w-48 h-2 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto overflow-hidden">
          <div 
            className="h-full bg-amber-500 rounded-full transition-all"
            style={{ width: `${(analysis.current_step / 8) * 100}%` }}
          />
        </div>
      </div>
    );
  }

  // Helper functions
  const getTraitLabel = (value: number, lowLabel: string, highLabel: string) => {
    if (value < -30) return { label: lowLabel, intensity: 'Strong' };
    if (value < 0) return { label: lowLabel, intensity: 'Slight' };
    if (value > 30) return { label: highLabel, intensity: 'Strong' };
    if (value > 0) return { label: highLabel, intensity: 'Slight' };
    return { label: 'Balanced', intensity: '' };
  };

  const getTraitColor = (value: number) => {
    if (Math.abs(value) > 50) return 'text-purple-600 dark:text-purple-400';
    if (Math.abs(value) > 20) return 'text-blue-600 dark:text-blue-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const traits = [
    {
      icon: <Zap className="w-5 h-5" />,
      name: 'Energy',
      value: analysis.trait_dominant_submissive,
      ...getTraitLabel(analysis.trait_dominant_submissive, 'Submissive', 'Dominant'),
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: <Sparkles className="w-5 h-5" />,
      name: 'Tone',
      value: analysis.trait_playful_serious,
      ...getTraitLabel(analysis.trait_playful_serious, 'Serious', 'Playful'),
      color: 'from-amber-500 to-orange-500'
    },
    {
      icon: <Star className="w-5 h-5" />,
      name: 'Confidence',
      value: analysis.trait_confident_shy,
      ...getTraitLabel(analysis.trait_confident_shy, 'Reserved', 'Confident'),
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: <Heart className="w-5 h-5" />,
      name: 'Warmth',
      value: analysis.trait_warmth_level,
      label: analysis.trait_warmth_level > 60 ? 'Very Warm' : analysis.trait_warmth_level > 40 ? 'Warm' : 'Reserved',
      intensity: analysis.trait_warmth_level > 70 ? 'High' : '',
      color: 'from-rose-500 to-red-500'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Voice Profile</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Completed {analysis.completed_at ? new Date(analysis.completed_at).toLocaleDateString() : 'recently'}
            </p>
          </div>
        </div>
      </div>

      {/* Personality Traits Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {traits.map((trait, index) => (
          <div 
            key={index}
            className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
          >
            <div className={`w-10 h-10 bg-gradient-to-br ${trait.color} rounded-xl flex items-center justify-center mb-3`}>
              {React.cloneElement(trait.icon, { className: 'w-5 h-5 text-white' })}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              {trait.name}
            </p>
            <p className={`font-semibold ${getTraitColor(trait.value)}`}>
              {trait.intensity && <span className="text-xs font-normal mr-1">{trait.intensity}</span>}
              {trait.label}
            </p>
          </div>
        ))}
      </div>

      {/* Communication Style */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Communication Style</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Response Length</p>
            <p className="font-medium text-gray-900 dark:text-white capitalize">
              {analysis.avg_response_length || 'Unknown'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Emoji Usage</p>
            <p className="font-medium text-gray-900 dark:text-white capitalize">
              {analysis.emoji_usage || 'Unknown'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Capitalization</p>
            <p className="font-medium text-gray-900 dark:text-white capitalize">
              {analysis.capitalization_style || 'Unknown'}
            </p>
          </div>
          {analysis.punctuation_style && (
            <div className="col-span-2 md:col-span-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Punctuation Style</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {analysis.punctuation_style}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Signature Patterns */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Signature Patterns</h4>
        <div className="space-y-4">
          {analysis.greetings?.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Greetings</p>
              <div className="flex flex-wrap gap-2">
                {analysis.greetings.map((phrase, i) => (
                  <span key={i} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm">
                    "{phrase}"
                  </span>
                ))}
              </div>
            </div>
          )}
          {analysis.pet_names?.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Pet Names / Terms of Endearment</p>
              <div className="flex flex-wrap gap-2">
                {analysis.pet_names.map((phrase, i) => (
                  <span key={i} className="px-3 py-1 bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 rounded-full text-sm">
                    "{phrase}"
                  </span>
                ))}
              </div>
            </div>
          )}
          {analysis.closings?.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Sign-offs</p>
              <div className="flex flex-wrap gap-2">
                {analysis.closings.map((phrase, i) => (
                  <span key={i} className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm">
                    "{phrase}"
                  </span>
                ))}
              </div>
            </div>
          )}
          {analysis.unique_phrases?.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Unique Expressions</p>
              <div className="flex flex-wrap gap-2">
                {analysis.unique_phrases.map((phrase, i) => (
                  <span key={i} className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full text-sm">
                    "{phrase}"
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Flirtation Approach */}
      {analysis.flirtation_approach && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Flirtation Approach</h4>
          <p className="text-gray-700 dark:text-gray-300">{analysis.flirtation_approach}</p>
        </div>
      )}

      {/* Love Languages */}
      {analysis.love_language_indicators?.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Love Language Indicators</h4>
          <div className="flex flex-wrap gap-2">
            {analysis.love_language_indicators.map((lang, i) => (
              <span key={i} className="px-3 py-1.5 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 rounded-lg text-sm font-medium">
                {lang}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Chatter Guidelines */}
      {analysis.chatter_guidelines && (
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-5 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-blue-500" />
              Chatter Guidelines
            </h4>
            <button
              onClick={handleCopyGuidelines}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-600"
            >
              {copiedGuidelines ? (
                <>
                  <Check className="w-4 h-4 text-green-500" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy
                </>
              )}
            </button>
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 overflow-auto max-h-96">
              {analysis.chatter_guidelines}
            </pre>
          </div>
        </div>
      )}

      {/* Conversation Transcript */}
      {analysis.conversation_transcript?.length > 0 && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
          >
            <span className="font-medium text-gray-900 dark:text-white">
              View Vibe Check Transcript
            </span>
            {showTranscript ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </button>
          
          {showTranscript && (
            <div className="p-4 space-y-3 max-h-96 overflow-y-auto bg-white dark:bg-gray-900">
              {analysis.conversation_transcript.map((msg: any, index: number) => (
                <div 
                  key={index}
                  className={`flex ${msg.role === 'creator' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    msg.role === 'creator'
                      ? 'bg-blue-500 text-white rounded-br-sm'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-sm'
                  }`}>
                    <p className="text-sm">{msg.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default IdiolectAnalysisView;

