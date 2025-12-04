import React, { useRef, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface SoundNotifierProps {
  enabled: boolean;
  onToggle: () => void;
  triggerSound: boolean;
  onSoundPlayed: () => void;
}

const SoundNotifier: React.FC<SoundNotifierProps> = ({ 
  enabled, 
  onToggle, 
  triggerSound, 
  onSoundPlayed 
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create audio element with the provided notification sound
    const audio = new Audio('https://fqfhjnpfrogjgyuniuhx.supabase.co/storage/v1/object/public/media/audio/alert.mp3');
    audio.volume = 0.7; // Set volume to 70%
    audio.preload = 'auto';
    audioRef.current = audio;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (triggerSound && enabled && audioRef.current) {
      console.log('🔊 Playing notification sound...');
      
      // Reset audio to beginning and play
      audioRef.current.currentTime = 0;
      audioRef.current.play()
        .then(() => {
          console.log('✅ Sound played successfully');
          onSoundPlayed();
        })
        .catch((error) => {
          console.error('❌ Error playing sound:', error);
          onSoundPlayed(); // Still call callback to reset trigger
        });
    }
  }, [triggerSound, enabled, onSoundPlayed]);

  return (
    <button
      onClick={onToggle}
      className={`p-2 rounded-lg transition-colors ${
        enabled 
          ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' 
          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
      }`}
      title={enabled ? 'Sound notifications enabled' : 'Sound notifications disabled'}
    >
      {enabled ? (
        <Volume2 className="w-5 h-5" />
      ) : (
        <VolumeX className="w-5 h-5" />
      )}
    </button>
  );
};

export default SoundNotifier;