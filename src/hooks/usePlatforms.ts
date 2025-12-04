import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

type Platform = Database['public']['Tables']['platforms']['Row'];
type PlatformInsert = Database['public']['Tables']['platforms']['Insert'];

export const usePlatforms = () => {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlatforms = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('platforms')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        throw error;
      }

      setPlatforms(data || []);
    } catch (err: any) {
      console.error('Error fetching platforms:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addPlatform = async (platformData: {
    name: string;
    slug: string;
    description?: string;
    color?: string;
    icon?: string;
  }) => {
    try {
      const insertData: PlatformInsert = {
        name: platformData.name,
        slug: platformData.slug,
        description: platformData.description || null,
        color: platformData.color || '#6366f1',
        icon: platformData.icon || null,
        is_active: true
      };

      const { data, error } = await supabase
        .from('platforms')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      setPlatforms(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      return { data, error: null };
    } catch (err: any) {
      console.error('Error adding platform:', err);
      return { data: null, error: err.message };
    }
  };

  useEffect(() => {
    fetchPlatforms();
  }, []);

  return {
    platforms,
    loading,
    error,
    fetchPlatforms,
    addPlatform
  };
};