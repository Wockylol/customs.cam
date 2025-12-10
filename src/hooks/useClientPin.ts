import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { errorLogger } from '../lib/errorLogger';

// Simple hash function for PIN (in production, consider using a proper crypto library)
const hashPin = (pin: string): string => {
  // Simple hash - in production you'd want to use bcrypt or similar
  // For now, we'll use a basic hash with salt
  const salt = 'client_pin_salt_2024';
  let hash = 0;
  const str = pin + salt;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
};

export const useClientPin = (clientId: string | undefined) => {
  const [hasPin, setHasPin] = useState<boolean>(false);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [lockedUntil, setLockedUntil] = useState<Date | null>(null);
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  const checkPinExists = useCallback(async () => {
    if (!clientId) {
      setLoading(false);
      return;
    }

    try {
      // Add timeout to database query
      const queryPromise = supabase
        .from('client_pins')
        .select('id, failed_attempts, locked_until')
        .eq('client_id', clientId)
        .maybeSingle(); // Use maybeSingle() instead of single() to handle no rows gracefully

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Database query timeout')), 8000);
      });

      const { data, error } = await Promise.race([
        queryPromise,
        timeoutPromise
      ]) as { data: any; error: any };

      if (error) {
        errorLogger.log('pin_check_error', 'Error checking PIN', error);
        setLoading(false);
        return;
      }

      // data will be null if no PIN exists, which is fine for first-time setup
      setHasPin(!!data);
      setFailedAttempts(data?.failed_attempts || 0);
      
      if (data?.locked_until) {
        const lockTime = new Date(data.locked_until);
        if (lockTime > new Date()) {
          setIsLocked(true);
          setLockedUntil(lockTime);
        } else {
          setIsLocked(false);
          setLockedUntil(null);
        }
      }
    } catch (err) {
      errorLogger.log('pin_check_error', 'Error in checkPinExists', err);
      // On error, default to no PIN to allow access
      setHasPin(false);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    if (!clientId) {
      setLoading(false);
      return;
    }

    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.warn('PIN check timed out after 10 seconds, defaulting to unlocked state');
      setLoading(false);
      setHasPin(false); // Default to no PIN if check times out
    }, 10000); // 10 second timeout

    checkPinExists().finally(() => {
      clearTimeout(timeoutId);
    });

    return () => {
      clearTimeout(timeoutId);
    };
  }, [clientId, checkPinExists]);

  const createPin = async (pin: string): Promise<{ error: string | null }> => {
    if (!clientId) {
      return { error: 'Client ID is required' };
    }

    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return { error: 'PIN must be exactly 4 digits' };
    }

    try {
      const pinHash = hashPin(pin);

      const { error } = await supabase
        .from('client_pins')
        .insert({
          client_id: clientId,
          pin_hash: pinHash,
        });

      if (error) {
        console.error('Error creating PIN:', error);
        return { error: 'Failed to create PIN' };
      }

      // Update client pin_enabled flag (informational only - don't fail if it errors)
      try {
        await supabase
          .from('clients')
          .update({ pin_enabled: true })
          .eq('id', clientId);
      } catch (updateError) {
        console.warn('Could not update pin_enabled flag:', updateError);
        // Continue anyway - this is just informational
      }

      setHasPin(true);
      return { error: null };
    } catch (err) {
      console.error('Error in createPin:', err);
      return { error: 'An unexpected error occurred' };
    }
  };

  const verifyPin = async (pin: string): Promise<{ success: boolean; error: string | null }> => {
    if (!clientId) {
      return { success: false, error: 'Client ID is required' };
    }

    // Check if locked
    const { data: lockCheck } = await supabase
      .rpc('is_pin_locked', { p_client_id: clientId });

    if (lockCheck) {
      return { 
        success: false, 
        error: 'Too many failed attempts. Please try again later.' 
      };
    }

    try {
      const pinHash = hashPin(pin);

      const { data, error } = await supabase
        .from('client_pins')
        .select('pin_hash')
        .eq('client_id', clientId)
        .maybeSingle();

      if (error) {
        console.error('Error verifying PIN:', error);
        return { success: false, error: 'Failed to verify PIN' };
      }

      if (!data) {
        return { success: false, error: 'PIN not found' };
      }

      if (data.pin_hash === pinHash) {
        // Correct PIN - reset failed attempts
        try {
          await supabase.rpc('reset_pin_failed_attempts', { p_client_id: clientId });
          setFailedAttempts(0);
          setIsLocked(false);
          setLockedUntil(null);
        } catch (resetError) {
          console.warn('Failed to reset attempts counter:', resetError);
          // Still allow login even if reset fails
        }
        return { success: true, error: null };
      } else {
        // Incorrect PIN - increment failed attempts
        try {
          const { data: attemptData, error: attemptError } = await supabase
            .rpc('increment_pin_failed_attempts', { p_client_id: clientId })
            .single();

          if (attemptError) {
            console.error('Error incrementing failed attempts:', attemptError);
            // Still show error to user even if counter fails
            return { success: false, error: 'Incorrect PIN' };
          }

          if (attemptData) {
            setFailedAttempts(attemptData.failed_attempts);
            
            if (attemptData.locked_until) {
              setIsLocked(true);
              setLockedUntil(new Date(attemptData.locked_until));
              return { 
                success: false, 
                error: 'Too many failed attempts. Account locked for 15 minutes.' 
              };
            }

            const remaining = Math.max(0, 5 - attemptData.failed_attempts);
            return { 
              success: false, 
              error: remaining > 0 
                ? `Incorrect PIN. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`
                : 'Incorrect PIN.'
            };
          }

          return { success: false, error: 'Incorrect PIN' };
        } catch (incrementError) {
          console.error('Exception incrementing failed attempts:', incrementError);
          // Still show error to user even if counter fails
          return { success: false, error: 'Incorrect PIN' };
        }
      }
    } catch (err) {
      console.error('Error in verifyPin:', err);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const updatePin = async (oldPin: string, newPin: string): Promise<{ error: string | null }> => {
    if (!clientId) {
      return { error: 'Client ID is required' };
    }

    // First verify the old PIN
    const { success } = await verifyPin(oldPin);
    if (!success) {
      return { error: 'Current PIN is incorrect' };
    }

    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      return { error: 'New PIN must be exactly 4 digits' };
    }

    try {
      const newPinHash = hashPin(newPin);

      const { error } = await supabase
        .from('client_pins')
        .update({ pin_hash: newPinHash })
        .eq('client_id', clientId);

      if (error) {
        console.error('Error updating PIN:', error);
        return { error: 'Failed to update PIN' };
      }

      return { error: null };
    } catch (err) {
      console.error('Error in updatePin:', err);
      return { error: 'An unexpected error occurred' };
    }
  };

  const resetPin = async (): Promise<{ error: string | null }> => {
    if (!clientId) {
      return { error: 'Client ID is required' };
    }

    try {
      const { error } = await supabase
        .from('client_pins')
        .delete()
        .eq('client_id', clientId);

      if (error) {
        console.error('Error resetting PIN:', error);
        return { error: 'Failed to reset PIN' };
      }

      // Update client pin_enabled flag (informational only - don't fail if it errors)
      try {
        await supabase
          .from('clients')
          .update({ pin_enabled: false })
          .eq('id', clientId);
      } catch (updateError) {
        console.warn('Could not update pin_enabled flag:', updateError);
        // Continue anyway - this is just informational
      }

      setHasPin(false);
      setFailedAttempts(0);
      setIsLocked(false);
      setLockedUntil(null);
      
      return { error: null };
    } catch (err) {
      console.error('Error in resetPin:', err);
      return { error: 'An unexpected error occurred' };
    }
  };

  return {
    hasPin,
    isLocked,
    lockedUntil,
    failedAttempts,
    loading,
    createPin,
    verifyPin,
    updatePin,
    resetPin,
    checkPinExists,
  };
};

