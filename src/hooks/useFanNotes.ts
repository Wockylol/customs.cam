import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface FanNote {
  id: string;
  client_id: string;
  fan_name: string;
  content: string;
  image_url: string | null;
  author_id: string;
  author_name: string;
  created_at: string;
  updated_at: string;
}

export interface FanNoteReply {
  id: string;
  fan_note_id: string;
  content: string;
  image_url: string | null;
  author_id: string;
  author_name: string;
  created_at: string;
  updated_at: string;
}

export interface FanNotesGrouped {
  fanName: string;
  notes: FanNote[];
  totalNotes: number;
  latestNote: string;
}

export const useFanNotes = (clientId: string | undefined) => {
  const { teamMember } = useAuth();
  const [notes, setNotes] = useState<FanNote[]>([]);
  const [replies, setReplies] = useState<Record<string, FanNoteReply[]>>({});
  const [fanNames, setFanNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch fan notes
  const fetchFanNotes = async () => {
    if (!clientId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch notes
      const { data: notesData, error: notesError } = await supabase
        .from('fan_notes')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (notesError) throw notesError;

      setNotes(notesData || []);

      // Extract unique fan names for autocomplete
      const uniqueFanNames = Array.from(new Set((notesData || []).map(note => note.fan_name)));
      setFanNames(uniqueFanNames.sort());

      // Fetch all replies if we have notes
      if (notesData && notesData.length > 0) {
        const noteIds = notesData.map(note => note.id);
        const { data: repliesData, error: repliesError } = await supabase
          .from('fan_note_replies')
          .select('*')
          .in('fan_note_id', noteIds)
          .order('created_at', { ascending: true });

        if (repliesError) throw repliesError;

        // Group replies by note ID
        const repliesByNote: Record<string, FanNoteReply[]> = {};
        (repliesData || []).forEach((reply) => {
          if (!repliesByNote[reply.fan_note_id]) {
            repliesByNote[reply.fan_note_id] = [];
          }
          repliesByNote[reply.fan_note_id].push(reply);
        });

        setReplies(repliesByNote);
      }
    } catch (err) {
      console.error('Error fetching fan notes:', err);
      setError(err instanceof Error ? err.message : 'Failed to load fan notes');
    } finally {
      setLoading(false);
    }
  };

  // Create a new fan note
  const createFanNote = async (fanName: string, content: string, image?: File) => {
    if (!clientId || !teamMember) {
      return { error: 'Missing required data' };
    }

    try {
      let imageUrl: string | null = null;

      // Upload image if provided
      if (image) {
        const fileExt = image.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `fan_notes/${clientId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('fan-notes')
          .upload(filePath, image);

        if (uploadError) {
          console.error('Error uploading image:', uploadError);
        } else {
          const { data: urlData } = supabase.storage
            .from('fan-notes')
            .getPublicUrl(filePath);
          imageUrl = urlData.publicUrl;
        }
      }

      // Insert the fan note
      const { data, error } = await supabase
        .from('fan_notes')
        .insert({
          client_id: clientId,
          fan_name: fanName.trim(),
          content: content.trim(),
          image_url: imageUrl,
          author_id: teamMember.id,
          author_name: teamMember.full_name,
        })
        .select()
        .single();

      if (error) throw error;

      // Refresh the notes list
      await fetchFanNotes();

      return { data, error: null };
    } catch (err) {
      console.error('Error creating fan note:', err);
      return { data: null, error: err instanceof Error ? err.message : 'Failed to create fan note' };
    }
  };

  // Create a reply to a fan note
  const createReply = async (noteId: string, content: string, image?: File) => {
    if (!teamMember) {
      return { error: 'User not authenticated' };
    }

    try {
      let imageUrl: string | null = null;

      // Upload image if provided
      if (image) {
        const fileExt = image.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `fan_note_replies/${noteId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('fan-notes')
          .upload(filePath, image);

        if (uploadError) {
          console.error('Error uploading image:', uploadError);
        } else {
          const { data: urlData } = supabase.storage
            .from('fan-notes')
            .getPublicUrl(filePath);
          imageUrl = urlData.publicUrl;
        }
      }

      // Insert the reply
      const { data, error } = await supabase
        .from('fan_note_replies')
        .insert({
          fan_note_id: noteId,
          content: content.trim(),
          image_url: imageUrl,
          author_id: teamMember.id,
          author_name: teamMember.full_name,
        })
        .select()
        .single();

      if (error) throw error;

      // Refresh the notes list to get updated replies
      await fetchFanNotes();

      return { data, error: null };
    } catch (err) {
      console.error('Error creating reply:', err);
      return { data: null, error: err instanceof Error ? err.message : 'Failed to create reply' };
    }
  };

  // Delete a fan note
  const deleteFanNote = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from('fan_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      // Refresh the notes list
      await fetchFanNotes();

      return { error: null };
    } catch (err) {
      console.error('Error deleting fan note:', err);
      return { error: err instanceof Error ? err.message : 'Failed to delete fan note' };
    }
  };

  // Delete a reply
  const deleteReply = async (replyId: string) => {
    try {
      const { error } = await supabase
        .from('fan_note_replies')
        .delete()
        .eq('id', replyId);

      if (error) throw error;

      // Refresh the notes list
      await fetchFanNotes();

      return { error: null };
    } catch (err) {
      console.error('Error deleting reply:', err);
      return { error: err instanceof Error ? err.message : 'Failed to delete reply' };
    }
  };

  // Group notes by fan name
  const getNotesGroupedByFan = (): FanNotesGrouped[] => {
    const grouped: Record<string, FanNote[]> = {};

    notes.forEach(note => {
      if (!grouped[note.fan_name]) {
        grouped[note.fan_name] = [];
      }
      grouped[note.fan_name].push(note);
    });

    return Object.entries(grouped).map(([fanName, fanNotes]) => ({
      fanName,
      notes: fanNotes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
      totalNotes: fanNotes.length,
      latestNote: fanNotes[0]?.created_at || '',
    })).sort((a, b) => new Date(b.latestNote).getTime() - new Date(a.latestNote).getTime());
  };

  useEffect(() => {
    fetchFanNotes();
  }, [clientId]);

  return {
    notes,
    replies,
    fanNames,
    loading,
    error,
    createFanNote,
    createReply,
    deleteFanNote,
    deleteReply,
    getNotesGroupedByFan,
    refresh: fetchFanNotes,
  };
};

