
import { useState, useEffect, useCallback } from 'react';
import { CanvasNote } from '../types';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';

const toCamelCase = (obj: Record<string, any>): Record<string, any> => {
  if (!obj) return obj;
  const newObj: Record<string, any> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const camelKey = key.replace(/_([a-z])/g, g => g[1].toUpperCase());
      newObj[camelKey] = obj[key];
    }
  }
  return newObj;
};

const toSnakeCase = (obj: Record<string, any>): Record<string, any> => {
  if (!obj) return obj;
  const newObj: Record<string, any> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      newObj[snakeKey] = obj[key];
    }
  }
  return newObj;
};

export const useCanvas = () => {
  const [notes, setNotes] = useState<CanvasNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchNotes = useCallback(async () => {
    if (!user) {
      setNotes([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const { data, error: dbError } = await supabase
        .from('canvas_notes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (dbError) throw dbError;

      const camelCaseNotes = data.map(note => toCamelCase(note) as CanvasNote);
      setNotes(camelCaseNotes);
    } catch (error: any) {
      console.error('Error fetching canvas notes:', error.message || error);
      setError('Gagal memuat catatan canvas.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const addNote = async (note: Omit<CanvasNote, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) return;
    try {
      const snakeCaseNote = toSnakeCase(note);
      // Optimistic update
      const tempId = 'temp-' + Date.now();
      const tempNote = { ...note, id: tempId, userId: user.id, createdAt: new Date().toISOString() } as CanvasNote;
      setNotes(prev => [...prev, tempNote]);

      const { data, error } = await supabase
        .from('canvas_notes')
        .insert([{ ...snakeCaseNote, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      
      // Replace temp note with real one
      setNotes(prev => prev.map(n => n.id === tempId ? (toCamelCase(data) as CanvasNote) : n));
    } catch (error: any) {
      console.error('Error adding note:', error.message);
      fetchNotes(); // Revert on error
    }
  };

  const updateNote = async (id: string, updates: Partial<CanvasNote>) => {
    if (!user) return;
    
    // Optimistic update
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));

    try {
      const snakeCaseUpdates = toSnakeCase(updates);
      const { error } = await supabase
        .from('canvas_notes')
        .update(snakeCaseUpdates)
        .eq('id', id);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error updating note:', error.message);
      // Ideally revert optimistic update here, but simplified for now
    }
  };

  const deleteNote = async (id: string) => {
    if (!user) return;
    
    // Optimistic update
    setNotes(prev => prev.filter(n => n.id !== id));

    try {
      const { error } = await supabase
        .from('canvas_notes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error deleting note:', error.message);
      fetchNotes(); // Revert on error
    }
  };

  return { notes, addNote, updateNote, deleteNote, loading, error };
};
