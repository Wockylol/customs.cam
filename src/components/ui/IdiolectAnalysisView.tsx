import React, { useState } from 'react';
import { 
  Check, 
  X, 
  Copy, 
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Clock,
  Sparkles,
  MessageCircle
} from 'lucide-react';
import { IdiolectAnalysisData, VoiceAnalysis } from '../../hooks/useIdiolectAnalysis';

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
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedItem(id);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">Loading voice profile...</p>
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
          @{clientUsername} hasn't completed their Vibe Check yet. 
          Once they do, their voice profile will appear here.
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
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          {Math.round((analysis.current_step / 8) * 100)}% complete
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

  const voice = analysis.voice_analysis;
  
  if (!voice) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Analysis Pending
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Voice analysis is still processing. Please refresh in a moment.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Voice Profile</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Completed {analysis.completed_at ? new Date(analysis.completed_at).toLocaleDateString() : 'recently'}
          </p>
        </div>
        {voice.chatterPlaybook?.confidence && (
          <span className={`ml-auto px-2 py-1 rounded text-xs font-medium ${
            voice.chatterPlaybook.confidence === 'high' 
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : voice.chatterPlaybook.confidence === 'medium'
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          }`}>
            {voice.chatterPlaybook.confidence} confidence
          </span>
        )}
      </div>

      {/* Quick Rules - DO THIS */}
      <RulesCard
        title="✓ DO THIS"
        items={voice.chatterPlaybook?.quickRules || []}
        variant="success"
      />

      {/* Don't Do - AVOID THIS */}
      <RulesCard
        title="✗ AVOID THIS"
        items={[
          ...(voice.chatterPlaybook?.doNot || []),
          ...(voice.neverDoes?.behaviors || [])
        ]}
        variant="danger"
      />

      {/* Copy These Phrases */}
      {voice.chatterPlaybook?.copyTheseExactly && voice.chatterPlaybook.copyTheseExactly.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
            <Copy className="w-4 h-4" />
            Copy These Phrases
          </h4>
          <div className="flex flex-wrap gap-2">
            {voice.chatterPlaybook.copyTheseExactly.map((phrase, i) => (
              <button
                key={i}
                onClick={() => copyToClipboard(phrase, `phrase-${i}`)}
                className="group px-3 py-1.5 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded-lg text-sm text-gray-900 dark:text-white hover:border-blue-400 transition-colors flex items-center gap-2"
              >
                "{phrase}"
                {copiedItem === `phrase-${i}` ? (
                  <Check className="w-3 h-3 text-green-500" />
                ) : (
                  <Copy className="w-3 h-3 text-gray-400 group-hover:text-blue-500" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Writing Style Quick Reference */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Writing Style</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <StyleItem 
            label="Capitalization" 
            value={voice.writingMechanics?.capitalization?.sentenceStart || 'unknown'} 
          />
          <StyleItem 
            label="Periods" 
            value={voice.writingMechanics?.punctuation?.periods || 'unknown'} 
          />
          <StyleItem 
            label="Emojis" 
            value={voice.writingMechanics?.emoji?.frequency || 'unknown'} 
          />
          <StyleItem 
            label="Text Speak" 
            value={voice.writingMechanics?.abbreviations?.textSpeak || 'unknown'} 
          />
          <StyleItem 
            label="You/U" 
            value={voice.writingMechanics?.formality?.pronouns || 'unknown'} 
          />
          <StyleItem 
            label="Message Length" 
            value={voice.writingMechanics?.messageStructure?.typicalLength || 'unknown'} 
          />
        </div>
      </div>

      {/* Signature Phrases */}
      {voice.signaturePatterns && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Signature Phrases</h4>
          <div className="space-y-3">
            <PhraseRow label="Greetings" items={voice.signaturePatterns.greetings} />
            <PhraseRow label="Pet Names" items={voice.signaturePatterns.petNames} />
            <PhraseRow label="Closings" items={voice.signaturePatterns.closings} />
            <PhraseRow label="Filler Words" items={voice.signaturePatterns.fillerWords} />
          </div>
        </div>
      )}

      {/* How to Reply */}
      {voice.chatterPlaybook?.replyTemplates && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-4">How to Reply</h4>
          <div className="space-y-3">
            <ReplyGuide label="Small Talk" guide={voice.chatterPlaybook.replyTemplates.smallTalk} />
            <ReplyGuide label="Compliments" guide={voice.chatterPlaybook.replyTemplates.compliment} />
            <ReplyGuide label="Custom Requests" guide={voice.chatterPlaybook.replyTemplates.customRequest} />
            <ReplyGuide label="Boundaries" guide={voice.chatterPlaybook.replyTemplates.boundary} />
          </div>
        </div>
      )}

      {/* Voice Modes */}
      {voice.voiceModes && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Tone by Situation</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <VoiceModeCard label="Casual Chat" mode={voice.voiceModes.casualChat} />
            <VoiceModeCard label="Flirting" mode={voice.voiceModes.flirting} />
            <VoiceModeCard label="Custom Requests" mode={voice.voiceModes.customRequests} />
            <VoiceModeCard label="Compliments" mode={voice.voiceModes.complimentResponse} />
          </div>
        </div>
      )}

      {/* Emoji Details (if they use emojis) */}
      {voice.writingMechanics?.emoji?.frequency !== 'none' && voice.writingMechanics?.emoji?.favorites?.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Emoji Usage</h4>
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Position: </span>
              <span className="text-gray-900 dark:text-white font-medium">{voice.writingMechanics.emoji.position}</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Style: </span>
              <span className="text-gray-900 dark:text-white font-medium">{voice.writingMechanics.emoji.style}</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Favorites: </span>
              <span className="text-gray-900 dark:text-white font-medium">{voice.writingMechanics.emoji.favorites.join(' ')}</span>
            </div>
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
              View Original Conversation
            </span>
            {showTranscript ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </button>
          
          {showTranscript && (
            <div className="p-4 space-y-3 max-h-80 overflow-y-auto bg-white dark:bg-gray-900">
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

// Sub-components

const RulesCard: React.FC<{
  title: string;
  items: string[];
  variant: 'success' | 'danger';
}> = ({ title, items, variant }) => {
  if (!items || items.length === 0) return null;
  
  const colors = variant === 'success' 
    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100'
    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100';
  
  const iconColors = variant === 'success' ? 'text-green-600' : 'text-red-600';
  
  return (
    <div className={`rounded-xl p-4 border ${colors}`}>
      <h4 className="font-bold text-base mb-3">{title}</h4>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            {variant === 'success' ? (
              <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${iconColors}`} />
            ) : (
              <X className={`w-4 h-4 mt-0.5 flex-shrink-0 ${iconColors}`} />
            )}
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const StyleItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider mb-1">{label}</p>
    <p className="text-gray-900 dark:text-white font-medium capitalize">{value}</p>
  </div>
);

const PhraseRow: React.FC<{ label: string; items?: string[] }> = ({ label, items }) => {
  if (!items || items.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-gray-500 dark:text-gray-400 text-sm w-24 flex-shrink-0">{label}:</span>
      {items.map((item, i) => (
        <span key={i} className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-sm text-gray-900 dark:text-white">
          {item}
        </span>
      ))}
    </div>
  );
};

const ReplyGuide: React.FC<{ label: string; guide?: string }> = ({ label, guide }) => {
  if (!guide) return null;
  return (
    <div className="flex items-start gap-3">
      <span className="text-gray-500 dark:text-gray-400 text-sm w-32 flex-shrink-0 pt-0.5">{label}:</span>
      <span className="text-gray-900 dark:text-white text-sm">{guide}</span>
    </div>
  );
};

const VoiceModeCard: React.FC<{ label: string; mode?: { tone: string; example: string } }> = ({ label, mode }) => {
  if (!mode) return null;
  return (
    <div className="bg-white dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm text-gray-900 dark:text-white font-medium mb-2">{mode.tone}</p>
      <p className="text-xs text-gray-500 dark:text-gray-300 italic">Example: "{mode.example}"</p>
    </div>
  );
};

export default IdiolectAnalysisView;
