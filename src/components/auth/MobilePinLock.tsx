import React, { useState, useEffect } from 'react';
import { Lock, Check, X, Shield, Loader2, Clock } from 'lucide-react';
import { useClientPin } from '../../hooks/useClientPin';

interface MobilePinLockProps {
  clientId: string;
  clientUsername: string;
  children: React.ReactNode;
}

const MobilePinLock: React.FC<MobilePinLockProps> = ({ clientId, children }) => {
  const { hasPin, isLocked, lockedUntil, loading, createPin, verifyPin } = useClientPin(clientId);
  
  // Check unlock state IMMEDIATELY (synchronously) to prevent flash on route navigation
  const getInitialUnlockState = () => {
    try {
      const stored = sessionStorage.getItem(`pin_unlocked_${clientId}`);
      const timestamp = sessionStorage.getItem(`pin_unlocked_${clientId}_timestamp`);
      
      if (stored === 'true' && timestamp) {
        const unlockTime = parseInt(timestamp, 10);
        const now = Date.now();
        const thirtyMinutes = 30 * 60 * 1000;
        
        if (now - unlockTime < thirtyMinutes) {
          // Update timestamp to extend the session
          sessionStorage.setItem(`pin_unlocked_${clientId}_timestamp`, now.toString());
          return true;
        }
      }
    } catch (e) {
      console.error('Error checking unlock state:', e);
    }
    return false;
  };
  
  const initiallyUnlocked = getInitialUnlockState();
  
  const [isUnlocked, setIsUnlocked] = useState(initiallyUnlocked);
  const [showContent, setShowContent] = useState(initiallyUnlocked);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [shake, setShake] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  // Re-check unlock state when clientId changes (for client switching)
  useEffect(() => {
    const newUnlockState = getInitialUnlockState();
    
    if (newUnlockState !== isUnlocked) {
      setIsUnlocked(newUnlockState);
      setShowContent(newUnlockState);
    }
    
    // Reset form state when switching clients
    setPin('');
    setConfirmPin('');
    setIsConfirming(false);
    setError('');
    setSuccess(false);
    setShake(false);
  }, [clientId]);

  useEffect(() => {
    if (isLocked && lockedUntil) {
      const updateTimer = () => {
        const now = new Date().getTime();
        const lockTime = new Date(lockedUntil).getTime();
        const difference = lockTime - now;

        if (difference <= 0) {
          setTimeRemaining('');
          window.location.reload(); // Reload to reset lock state
        } else {
          const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((difference % (1000 * 60)) / 1000);
          setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        }
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [isLocked, lockedUntil]);

  // Periodically check if unlock state has expired
  useEffect(() => {
    if (isUnlocked) {
      const checkExpiration = () => {
        try {
          const timestamp = sessionStorage.getItem(`pin_unlocked_${clientId}_timestamp`);
          if (timestamp) {
            const unlockTime = parseInt(timestamp, 10);
            const now = Date.now();
            const thirtyMinutes = 30 * 60 * 1000;
            
            if (now - unlockTime >= thirtyMinutes) {
              // Session expired - clear storage and re-lock
              sessionStorage.removeItem(`pin_unlocked_${clientId}`);
              sessionStorage.removeItem(`pin_unlocked_${clientId}_timestamp`);
              setIsUnlocked(false);
              setShowContent(false);
            }
          }
        } catch (e) {
          console.error('Failed to check expiration:', e);
        }
      };

      // Check every minute
      const interval = setInterval(checkExpiration, 60000);
      return () => clearInterval(interval);
    }
  }, [isUnlocked, clientId]);

  const handleNumberPress = async (num: string) => {
    if (success || isLocked) return;
    
    setError('');
    
    if (hasPin) {
      // Entering PIN to unlock
      if (pin.length < 4) {
        const newPin = pin + num;
        setPin(newPin);
        
        if (newPin.length === 4) {
          // Verify PIN with database
          setTimeout(async () => {
            const result = await verifyPin(newPin);
            if (result.success) {
              setSuccess(true);
              // Store unlock state in sessionStorage with timestamp
              try {
                sessionStorage.setItem(`pin_unlocked_${clientId}`, 'true');
                sessionStorage.setItem(`pin_unlocked_${clientId}_timestamp`, Date.now().toString());
              } catch (e) {
                console.error('Failed to store unlock state:', e);
              }
              setTimeout(() => {
                setShowContent(true);
                setTimeout(() => setIsUnlocked(true), 100);
              }, 800);
            } else {
              setError(result.error || 'Incorrect PIN');
              setShake(true);
              setTimeout(() => {
                setPin('');
                setShake(false);
              }, 500);
            }
          }, 100);
        }
      }
    } else {
      // Creating new PIN
      if (!isConfirming) {
        if (pin.length < 4) {
          setPin(pin + num);
          
          if (pin.length === 3) {
            // Move to confirmation after slight delay
            setTimeout(() => {
              setIsConfirming(true);
            }, 300);
          }
        }
      } else {
        if (confirmPin.length < 4) {
          const newConfirmPin = confirmPin + num;
          setConfirmPin(newConfirmPin);
          
          if (newConfirmPin.length === 4) {
            // Verify both PINs match and save to database
            setTimeout(async () => {
              if (pin === newConfirmPin) {
                const result = await createPin(pin);
                if (!result.error) {
                  setSuccess(true);
                  // Store unlock state in sessionStorage with timestamp
                  try {
                    sessionStorage.setItem(`pin_unlocked_${clientId}`, 'true');
                    sessionStorage.setItem(`pin_unlocked_${clientId}_timestamp`, Date.now().toString());
                  } catch (e) {
                    console.error('Failed to store unlock state:', e);
                  }
                  setTimeout(() => {
                    setShowContent(true);
                    setTimeout(() => setIsUnlocked(true), 100);
                  }, 800);
                } else {
                  setError(result.error);
                  setShake(true);
                  setTimeout(() => {
                    setPin('');
                    setConfirmPin('');
                    setIsConfirming(false);
                    setShake(false);
                  }, 800);
                }
              } else {
                setError('PINs do not match');
                setShake(true);
                setTimeout(() => {
                  setPin('');
                  setConfirmPin('');
                  setIsConfirming(false);
                  setShake(false);
                }, 800);
              }
            }, 100);
          }
        }
      }
    }
  };

  const handleDelete = () => {
    if (success) return;
    
    setError('');
    
    if (hasPin) {
      setPin(pin.slice(0, -1));
    } else {
      if (isConfirming) {
        if (confirmPin.length > 0) {
          setConfirmPin(confirmPin.slice(0, -1));
        } else {
          setIsConfirming(false);
        }
      } else {
        setPin(pin.slice(0, -1));
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-white bg-opacity-20 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg mb-4 mx-auto">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          </div>
          <p className="text-white font-medium">Loading security...</p>
        </div>
      </div>
    );
  }

  // Show content with fade-in animation once unlocked
  if (showContent) {
    return (
      <>
        {/* Overlay to prevent flash during transition */}
        {!isUnlocked && (
          <div className="fixed inset-0 bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 z-50 animate-fade-out" />
        )}
        
        {/* Content with fade-in */}
        <div className={isUnlocked ? 'animate-fade-in-fast' : 'opacity-0'}>
          {children}
        </div>
      </>
    );
  }

  const currentPin = isConfirming ? confirmPin : pin;
  const pinLength = currentPin.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-white opacity-10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-32 right-10 w-40 h-40 bg-white opacity-10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-white opacity-10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-sm animate-fade-in">
        {/* Logo/Icon Section */}
        <div className="text-center mb-12">
          <div className={`w-20 h-20 bg-white bg-opacity-20 backdrop-blur-sm rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-2xl transition-transform duration-300 ${
            success ? 'scale-110' : shake ? 'animate-shake' : ''
          }`}>
            {success ? (
              <Check className="w-10 h-10 text-white animate-scale-in" />
            ) : isLocked ? (
              <Clock className="w-10 h-10 text-white" />
            ) : (
              <Lock className="w-10 h-10 text-white" />
            )}
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {success 
              ? 'Welcome!' 
              : isLocked 
                ? 'Account Locked' 
                : hasPin 
                  ? 'Enter PIN' 
                  : isConfirming 
                    ? 'Confirm PIN' 
                    : 'Create PIN'}
          </h1>
          <p className="text-pink-100 text-sm">
            {success 
              ? 'Access granted' 
              : isLocked
                ? `Too many failed attempts. Try again in ${timeRemaining}`
                : hasPin 
                  ? 'Enter your 4-digit PIN to continue' 
                  : isConfirming 
                    ? 'Re-enter your PIN to confirm' 
                    : 'Create a 4-digit PIN to secure your dashboard'}
          </p>
        </div>

        {/* PIN Dots Display */}
        <div className={`flex justify-center gap-4 mb-8 transition-all duration-300 ${shake ? 'animate-shake' : ''}`}>
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                index < pinLength
                  ? success
                    ? 'bg-green-400 scale-110 shadow-lg shadow-green-400/50'
                    : 'bg-white scale-110 shadow-lg shadow-white/50'
                  : 'bg-white bg-opacity-20 backdrop-blur-sm'
              }`}
            >
              {index < pinLength && (
                <div className={`w-4 h-4 rounded-full transition-all duration-300 ${
                  success ? 'bg-white' : 'bg-purple-500'
                } animate-scale-in`}></div>
              )}
            </div>
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-500 bg-opacity-20 backdrop-blur-sm border border-red-300 rounded-2xl p-4 flex items-center gap-3 animate-fade-in">
            <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
              <X className="w-5 h-5 text-white" />
            </div>
            <p className="text-white text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Number Pad */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleNumberPress(num.toString())}
              disabled={success || isLocked}
              className={`h-16 bg-white bg-opacity-20 backdrop-blur-sm rounded-2xl text-white text-2xl font-bold 
                hover:bg-opacity-30 active:scale-95 transition-all duration-200 shadow-lg
                disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
                hover:shadow-xl active:shadow-sm`}
            >
              {num}
            </button>
          ))}
          
          {/* Empty space for layout */}
          <div></div>
          
          {/* Zero */}
          <button
            onClick={() => handleNumberPress('0')}
            disabled={success || isLocked}
            className={`h-16 bg-white bg-opacity-20 backdrop-blur-sm rounded-2xl text-white text-2xl font-bold 
              hover:bg-opacity-30 active:scale-95 transition-all duration-200 shadow-lg
              disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
              hover:shadow-xl active:shadow-sm`}
          >
            0
          </button>
          
          {/* Delete */}
          <button
            onClick={handleDelete}
            disabled={success || isLocked || (pinLength === 0 && !isConfirming)}
            className={`h-16 bg-white bg-opacity-20 backdrop-blur-sm rounded-2xl text-white
              hover:bg-opacity-30 active:scale-95 transition-all duration-200 shadow-lg
              disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100
              hover:shadow-xl active:shadow-sm flex items-center justify-center`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
            </svg>
          </button>
        </div>

        {/* Security Badge */}
        <div className="flex items-center justify-center gap-2 text-white text-sm opacity-70">
          <Shield className="w-4 h-4" />
          <span>Secured with PIN protection</span>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in-fast {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes fade-out {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }

        @keyframes scale-in {
          from {
            transform: scale(0);
          }
          to {
            transform: scale(1);
          }
        }

        @keyframes shake {
          0%, 100% {
            transform: translateX(0);
          }
          25% {
            transform: translateX(-10px);
          }
          75% {
            transform: translateX(10px);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }

        .animate-fade-in-fast {
          animation: fade-in-fast 0.3s ease-out;
        }

        .animate-fade-out {
          animation: fade-out 0.3s ease-out forwards;
          pointer-events: none;
        }

        .animate-scale-in {
          animation: scale-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default MobilePinLock;

