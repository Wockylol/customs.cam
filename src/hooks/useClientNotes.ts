import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface ClientNote {
  id: string;
  client_id: string;
  author_id: string | null;
  author_name: string;
  content: string;
  image_url: string | null;
  is_pinned: boolean;
  pinned_at: string | null;
  pinned_by: string | null;
  created_at: string;
  updated_at: string;
  reply_count?: number;
}

export interface ClientNoteReply {
  id: string;
  note_id: string;
  author_id: string | null;
  author_name: string;
  content: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export const useClientNotes = (clientId: string | undefined) => {
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [replies, setReplies] = useState<Record<string, ClientNoteReply[]>>({});
  const [loading, setLoading] = useState(true);
  const { teamMember } = useAuth();

  const fetchNotes = async () => {
    if (!clientId) return;
    
    setLoading(true);
    
    try {
      // Fetch notes with reply counts
      const { data: notesData, error: notesError } = await supabase
        .from('client_notes_with_counts')
        .select('*')
        .eq('client_id', clientId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (notesError) throw notesError;
      
      setNotes(notesData || []);
      
      // Fetch all replies for these notes
      if (notesData && notesData.length > 0) {
        const noteIds = notesData.map(note => note.id);
        
        const { data: repliesData, error: repliesError } = await supabase
          .from('client_note_replies')
          .select('*')
          .in('note_id', noteIds)
          .order('created_at', { ascending: true });
        
        if (repliesError) throw repliesError;
        
        // Group replies by note_id
        const repliesByNote: Record<string, ClientNoteReply[]> = {};
        repliesData?.forEach(reply => {
          if (!repliesByNote[reply.note_id]) {
            repliesByNote[reply.note_id] = [];
          }
          repliesByNote[reply.note_id].push(reply);
        });
        
        setReplies(repliesByNote);
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!clientId) return;

    // Subscribe to notes changes
    const notesChannel = supabase
      .channel(`client_notes:${clientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'client_notes',
          filter: `client_id=eq.${clientId}`
        },
        () => {
          fetchNotes();
        }
      )
      .subscribe();

    // Subscribe to replies changes
    const repliesChannel = supabase
      .channel(`client_note_replies:${clientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'client_note_replies'
        },
        () => {
          fetchNotes();
        }
      )
      .subscribe();

    return () => {
      notesChannel.unsubscribe();
      repliesChannel.unsubscribe();
    };
  };

  const uploadImage = async (file: File): Promise<{ url: string | null; error: string | null }> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('note-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('note-images')
        .getPublicUrl(filePath);

      return { url: publicUrl, error: null };
    } catch (error: any) {
      console.error('Error uploading image:', error);
      return { url: null, error: error.message || 'Failed to upload image' };
    }
  };

  const createNote = async (content: string, imageFile?: File) => {
    if (!clientId || !teamMember) {
      return { error: 'Missing required data' };
    }

    try {
      let imageUrl: string | null = null;

      // Upload image if provided
      if (imageFile) {
        const { url, error: uploadError } = await uploadImage(imageFile);
        if (uploadError) throw new Error(uploadError);
        imageUrl = url;
      }

      const { data, error } = await supabase
        .from('client_notes')
        .insert({
          client_id: clientId,
          author_id: teamMember.id,
          author_name: teamMember.full_name,
          content: content.trim(),
          image_url: imageUrl
        })
        .select()
        .single();

      if (error) throw error;

      await fetchNotes();
      return { data, error: null };
    } catch (error: any) {
      console.error('Error creating note:', error);
      return { error: error.message || 'Failed to create note' };
    }
  };

  const createReply = async (noteId: string, content: string, imageFile?: File) => {
    if (!teamMember) {
      return { error: 'Not authenticated' };
    }

    try {
      let imageUrl: string | null = null;

      // Upload image if provided
      if (imageFile) {
        const { url, error: uploadError } = await uploadImage(imageFile);
        if (uploadError) throw new Error(uploadError);
        imageUrl = url;
      }

      const { data, error } = await supabase
        .from('client_note_replies')
        .insert({
          note_id: noteId,
          author_id: teamMember.id,
          author_name: teamMember.full_name,
          content: content.trim(),
          image_url: imageUrl
        })
        .select()
        .single();

      if (error) throw error;

      await fetchNotes();
      return { data, error: null };
    } catch (error: any) {
      console.error('Error creating reply:', error);
      return { error: error.message || 'Failed to create reply' };
    }
  };

  const togglePin = async (noteId: string) => {
    if (!teamMember) {
      return { error: 'Not authenticated' };
    }

    try {
      const { data, error } = await supabase.rpc('toggle_note_pin', {
        p_note_id: noteId,
        p_team_member_id: teamMember.id
      });

      if (error) throw error;

      await fetchNotes();
      return { data, error: null };
    } catch (error: any) {
      console.error('Error toggling pin:', error);
      return { error: error.message || 'Failed to toggle pin' };
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from('client_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      await fetchNotes();
      return { error: null };
    } catch (error: any) {
      console.error('Error deleting note:', error);
      return { error: error.message || 'Failed to delete note' };
    }
  };

  const deleteReply = async (replyId: string) => {
    try {
      const { error } = await supabase
        .from('client_note_replies')
        .delete()
        .eq('id', replyId);

      if (error) throw error;

      await fetchNotes();
      return { error: null };
    } catch (error: any) {
      console.error('Error deleting reply:', error);
      return { error: error.message || 'Failed to delete reply' };
    }
  };

  const updateNote = async (noteId: string, content: string) => {
    try {
      const { error } = await supabase
        .from('client_notes')
        .update({ content: content.trim() })
        .eq('id', noteId);

      if (error) throw error;

      await fetchNotes();
      return { error: null };
    } catch (error: any) {
      console.error('Error updating note:', error);
      return { error: error.message || 'Failed to update note' };
    }
  };

  const updateReply = async (replyId: string, content: string) => {
    try {
      const { error } = await supabase
        .from('client_note_replies')
        .update({ content: content.trim() })
        .eq('id', replyId);

      if (error) throw error;

      await fetchNotes();
      return { error: null };
    } catch (error: any) {
      console.error('Error updating reply:', error);
      return { error: error.message || 'Failed to update reply' };
    }
  };

  useEffect(() => {
    if (clientId) {
      fetchNotes();
      const cleanup = setupRealtimeSubscription();
      return cleanup;
    }
  }, [clientId]);

  return {
    notes,
    replies,
    loading,
    createNote,
    createReply,
    togglePin,
    deleteNote,
    deleteReply,
    updateNote,
    updateReply,
    refetch: fetchNotes
  };
};

