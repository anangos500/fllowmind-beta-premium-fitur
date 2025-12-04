
import { useState, useEffect, useCallback } from 'react';
import { Goal } from '../types';
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

export const useGoals = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchGoals = useCallback(async () => {
    if (!user) {
      setGoals([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const { data, error: dbError } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .order('deadline', { ascending: true }); // Urutkan berdasarkan deadline

      if (dbError) throw dbError;

      const camelCaseGoals = data.map(g => toCamelCase(g) as Goal);
      setGoals(camelCaseGoals);
    } catch (error: any) {
      console.error('Error fetching goals:', error.message || error);
      // Jangan tampilkan error di UI jika tabel belum ada (silent fail untuk backward compat)
      if (error.code !== '42P01') {
          setError('Gagal memuat goals.');
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const addGoal = async (goal: Omit<Goal, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) return;
    try {
      const snakeCaseGoal = toSnakeCase(goal);
      const { error } = await supabase
        .from('goals')
        .insert([{ ...snakeCaseGoal, user_id: user.id }]);

      if (error) throw error;
      await fetchGoals();
    } catch (error: any) {
      console.error('Error adding goal:', error.message);
      throw error;
    }
  };

  const updateGoal = async (id: string, updates: Partial<Goal>) => {
    if (!user) return;
    try {
      const snakeCaseUpdates = toSnakeCase(updates);
      const { error } = await supabase
        .from('goals')
        .update(snakeCaseUpdates)
        .eq('id', id);

      if (error) throw error;
      await fetchGoals();
    } catch (error: any) {
      console.error('Error updating goal:', error.message);
      throw error;
    }
  };

  const deleteGoal = async (id: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchGoals();
    } catch (error: any) {
      console.error('Error deleting goal:', error.message);
      throw error;
    }
  };

  return { goals, addGoal, updateGoal, deleteGoal, loading, error, fetchGoals };
};