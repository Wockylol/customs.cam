import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface ClientWithBirthday {
  id: string;
  username: string;
  avatar_url: string | null;
  date_of_birth: string;
  days_until_birthday: number;
}

export const useUpcomingBirthdays = (daysAhead: number = 15) => {
  const { teamMember } = useAuth();
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<ClientWithBirthday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUpcomingBirthdays = useCallback(async () => {
    // Don't fetch until we have tenant context
    if (!teamMember?.tenant_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch all clients filtered by tenant with their questionnaire and personal info
      const { data, error } = await supabase
        .from('clients')
        .select(`
          id,
          username,
          avatar_url,
          client_questionnaire (
            public_birthday
          ),
          client_personal_info (
            date_of_birth
          )
        `)
        .eq('tenant_id', teamMember.tenant_id)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching birthday data:', error);
        throw error;
      }

      if (!data) {
        setUpcomingBirthdays([]);
        return;
      }

      // Filter out clients without birthday info
      // Prioritize public_birthday from questionnaire, fall back to date_of_birth from personal_info
      const clientsWithBirthdays = data.filter((client: any) => {
        const hasPublicBirthday = client.client_questionnaire?.public_birthday;
        const hasPersonalBirthday = client.client_personal_info?.date_of_birth;
        return hasPublicBirthday || hasPersonalBirthday;
      });

      // Calculate days until birthday and filter
      const today = new Date();
      // Normalize to start of day to avoid time-of-day issues
      today.setHours(0, 0, 0, 0);
      const currentYear = today.getFullYear();
      
      const upcomingBirthdaysList = clientsWithBirthdays
        .map((client: any) => {
          // Prioritize public_birthday from questionnaire, fall back to date_of_birth from personal_info
          const dobString = client.client_questionnaire?.public_birthday 
            || client.client_personal_info?.date_of_birth;
          
          if (!dobString) {
            return null;
          }
          
          // Parse as UTC to avoid timezone issues - append Z to force UTC interpretation
          const dob = new Date(dobString + 'T00:00:00Z');
          
          // Get month and day from the date of birth using UTC methods
          const birthMonth = dob.getUTCMonth();
          const birthDay = dob.getUTCDate();
          
          // Create birthday date for this year at midnight
          let birthdayThisYear = new Date(currentYear, birthMonth, birthDay, 0, 0, 0, 0);
          
          // If birthday already passed this year, use next year
          if (birthdayThisYear < today) {
            birthdayThisYear = new Date(currentYear + 1, birthMonth, birthDay, 0, 0, 0, 0);
          }
          
          // Calculate days until birthday
          const timeDiff = birthdayThisYear.getTime() - today.getTime();
          const daysUntil = Math.round(timeDiff / (1000 * 3600 * 24));
          
          return {
            id: client.id,
            username: client.username,
            avatar_url: client.avatar_url,
            date_of_birth: dobString,
            days_until_birthday: daysUntil
          };
        })
        .filter((client: ClientWithBirthday | null): client is ClientWithBirthday => 
          client !== null && client.days_until_birthday >= 0 && client.days_until_birthday <= daysAhead
        )
        .sort((a: ClientWithBirthday, b: ClientWithBirthday) => 
          a.days_until_birthday - b.days_until_birthday
        );

      setUpcomingBirthdays(upcomingBirthdaysList);
    } catch (err: any) {
      console.error('Error fetching upcoming birthdays:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [teamMember?.tenant_id, daysAhead]);

  useEffect(() => {
    fetchUpcomingBirthdays();
  }, [fetchUpcomingBirthdays]);

  return {
    upcomingBirthdays,
    loading,
    error,
    fetchUpcomingBirthdays
  };
};

