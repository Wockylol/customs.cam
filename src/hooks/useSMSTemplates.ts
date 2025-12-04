import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface SMSTemplate {
  id: string;
  user_id: string;
  name: string;
  content: string;
  is_global: boolean;
  created_at: string;
  updated_at: string;
}

export const useSMSTemplates = () => {
  const [templates, setTemplates] = useState<SMSTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('sms_templates')
        .select('*')
        .order('name');

      if (error) throw error;

      setTemplates(data || []);
    } catch (err: any) {
      console.error('Error fetching SMS templates:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = async (templateData: {
    name: string;
    content: string;
    is_global?: boolean;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('sms_templates')
        .insert([{
          user_id: user.id,
          name: templateData.name,
          content: templateData.content,
          is_global: templateData.is_global || false,
        }])
        .select()
        .single();

      if (error) throw error;

      setTemplates(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      return { data, error: null };
    } catch (err: any) {
      console.error('Error creating SMS template:', err);
      return { data: null, error: err.message };
    }
  };

  const updateTemplate = async (
    id: string,
    updates: Partial<Omit<SMSTemplate, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
  ) => {
    try {
      const { data, error } = await supabase
        .from('sms_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setTemplates(prev =>
        prev.map(t => t.id === id ? data : t).sort((a, b) => a.name.localeCompare(b.name))
      );
      return { data, error: null };
    } catch (err: any) {
      console.error('Error updating SMS template:', err);
      return { data: null, error: err.message };
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('sms_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTemplates(prev => prev.filter(t => t.id !== id));
      return { error: null };
    } catch (err: any) {
      console.error('Error deleting SMS template:', err);
      return { error: err.message };
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  return {
    templates,
    loading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    refetch: fetchTemplates,
  };
};

