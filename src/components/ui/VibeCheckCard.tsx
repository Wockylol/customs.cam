import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, CheckCircle, MessageCircle, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface VibeCheckCardProps {
  clientId: string;
  clientUsername: string;
}

type VibeCheckStatus = 'not_started' | 'in_progress' | 'completed';

const VibeCheckCard: React.FC<VibeCheckCardProps> = ({ clientId, clientUsername }) => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<VibeCheckStatus>('not_started');
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    loadStatus();
  }, [clientId]);

  const loadStatus = async () => {
    if (!clientId) return;
    
    try {
      const { data, error } = await supabase
        .from('client_idiolect_analysis')
        .select('status, current_step')
        .eq('client_id', clientId)
        .maybeSingle();

      if (!error && data) {
        setStatus(data.status as VibeCheckStatus);
        setProgress((data.current_step / 8) * 100);
      }
    } catch (err) {
      console.error('Error loading vibe check status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = () => {
    navigate(`/app/${clientUsername}/vibe-check`);
  };

  // Don't show the card if already completed
  if (loading) {
    return null;
  }

  // Completed state - show a subtle confirmation
  if (status === 'completed') {
    return (
      <div className="stagger-item" style={{ animationDelay: '0.05s' }}>
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-2xl border border-emerald-500/20">
          <div className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-emerald-700 font-semibold text-sm">Vibe Check Complete</p>
              <p className="text-emerald-600/70 text-xs">Your team has your style locked in ✨</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // In progress state
  if (status === 'in_progress') {
    return (
      <div className="stagger-item" style={{ animationDelay: '0.05s' }}>
        <button
          onClick={handleClick}
          className="w-full text-left relative overflow-hidden bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl shadow-xl shadow-orange-500/25 hover:shadow-orange-500/40 active:scale-[0.98] transition-all duration-200"
        >
          {/* Animated background pattern */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl transform translate-x-8 -translate-y-8" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-yellow-300/30 rounded-full blur-xl transform -translate-x-6 translate-y-6" />
          </div>
          
          <div className="relative p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">Continue Vibe Check</h3>
                  <p className="text-white/80 text-sm">Pick up where you left off</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-white/70 mt-1" />
            </div>
            
            {/* Progress bar */}
            <div className="bg-white/20 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-white h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-white/70 text-xs mt-2">{Math.round(progress)}% complete</p>
          </div>
        </button>
      </div>
    );
  }

  // Not started state - main CTA
  return (
    <div className="stagger-item" style={{ animationDelay: '0.05s' }}>
      <button
        onClick={handleClick}
        className="w-full text-left relative overflow-hidden bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 rounded-2xl shadow-xl shadow-purple-500/30 hover:shadow-purple-500/50 active:scale-[0.98] transition-all duration-200"
      >
        {/* Animated sparkle effects */}
        <div className="absolute inset-0">
          <div className="absolute top-3 right-4 w-2 h-2 bg-white rounded-full animate-pulse" />
          <div className="absolute top-8 right-12 w-1.5 h-1.5 bg-white/70 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
          <div className="absolute bottom-6 right-8 w-1 h-1 bg-white/50 rounded-full animate-pulse" style={{ animationDelay: '0.6s' }} />
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl transform translate-x-10 -translate-y-10" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-pink-400/20 rounded-full blur-2xl transform -translate-x-8 translate-y-8" />
        </div>
        
        <div className="relative p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-white font-bold text-lg">Vibe Check</h3>
                  <span className="px-2 py-0.5 bg-white/20 rounded-full text-white text-[10px] font-semibold uppercase tracking-wider">
                    New
                  </span>
                </div>
                <p className="text-white/80 text-sm leading-snug">
                  Chat with a fan so we can learn your style
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/70 mt-2" />
          </div>
          
          {/* Features */}
          <div className="flex gap-3 mt-4">
            <div className="flex items-center gap-1.5 text-white/70 text-xs">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
              <span>2 min</span>
            </div>
            <div className="flex items-center gap-1.5 text-white/70 text-xs">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
              <span>AI-powered</span>
            </div>
            <div className="flex items-center gap-1.5 text-white/70 text-xs">
              <div className="w-1.5 h-1.5 bg-pink-400 rounded-full" />
              <span>Fun chat</span>
            </div>
          </div>
        </div>
      </button>
    </div>
  );
};

export default VibeCheckCard;

