
import { useState, useEffect, useCallback } from 'react';
import { Task, TaskStatus, Recurrence } from '../types';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';

// Helper to convert object keys from snake_case (database) to camelCase (app)
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

// Helper to convert object keys from camelCase (app) to snake_case (database)
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


export const useTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Fetches all tasks from DB, converts them to camelCase, and updates state.
  // This is the single source of truth.
  const fetchTasks = useCallback(async () => {
    if (!user) {
        setTasks([]);
        setLoading(false);
        return;
    };
    try {
      setLoading(true);
      setError(null);
      const { data, error: dbError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id);

      if (dbError) throw dbError;
      
      const camelCaseTasks = data.map(task => toCamelCase(task) as Task);
      setTasks(camelCaseTasks);
    } catch (error: any) {
      console.error('Error fetching tasks:', error.message || error);
      setError('Gagal memuat tugas dari database. Pastikan koneksi internet Anda stabil dan coba lagi.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Adds a new task to the database and then re-fetches all tasks.
  const addTask = async (task: Omit<Task, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) return;
    try {
      // The task object is in camelCase, convert it to snake_case for the DB
      const snakeCaseTask = toSnakeCase(task);
      
      const { error } = await supabase.from('tasks').insert([
        // user_id is required by the DB, it's not in the task object type
        { ...snakeCaseTask, user_id: user.id }
      ]);
      
      if (error) throw error;
      await fetchTasks(); // Re-fetch to get the source of truth
    } catch (error: any)
    {
        console.error('Error adding task:', error.message || error);
    }
  };

  const updateTask = async (updatedTask: Task) => {
    if (!user) return;
  
    const originalTasks = tasks;
    const originalTask = originalTasks.find(t => t.id === updatedTask.id);
  
    // Optimistically update the UI for a responsive feel
    setTasks(prevTasks =>
      prevTasks.map(t => (t.id === updatedTask.id ? updatedTask : t))
    );
  
    try {
      const { id, ...taskToUpdate } = updatedTask;
      const snakeCaseTask = toSnakeCase(taskToUpdate);
  
      const { error: updateError } = await supabase
        .from('tasks')
        .update(snakeCaseTask)
        .eq('id', id);
  
      if (updateError) throw updateError;
  
      // Check if a recurring task was just completed
      const justCompletedRecurringTask =
        updatedTask.status === TaskStatus.Done &&
        originalTask?.status !== TaskStatus.Done &&
        updatedTask.recurrence !== Recurrence.None;
  
      // If a recurring task is completed, we must create the next instance
      // and then re-fetch to ensure the entire task list is accurate.
      if (justCompletedRecurringTask) {
        if (updatedTask.recurrence === Recurrence.Daily) {
            const nextStartTime = new Date(updatedTask.startTime);
            nextStartTime.setDate(nextStartTime.getDate() + 1);
            const nextEndTime = new Date(updatedTask.endTime);
            nextEndTime.setDate(nextEndTime.getDate() + 1);
  
            const nextTaskInstance: Omit<Task, 'id' | 'userId' | 'createdAt'> = {
              title: updatedTask.title,
              startTime: nextStartTime.toISOString(),
              endTime: nextEndTime.toISOString(),
              status: TaskStatus.ToDo,
              checklist: updatedTask.checklist.map(item => ({ ...item, completed: false })),
              notes: updatedTask.notes,
              isImportant: updatedTask.isImportant,
              recurrence: updatedTask.recurrence,
              recurringTemplateId: updatedTask.recurringTemplateId || updatedTask.id,
            };
      
            const snakeCaseNextTask = toSnakeCase(nextTaskInstance);
      
            const { error: insertError } = await supabase.from('tasks').insert([
              { ...snakeCaseNextTask, user_id: user.id }
            ]);
      
            if (insertError) throw insertError;
        }
        // After creating the new instance, a full re-fetch is necessary.
        await fetchTasks();
      }
      // For simple updates (like checklist changes), the optimistic update is sufficient
      // and no re-fetch is needed, preventing UI glitches.
  
    } catch (error: any) {
      console.error('Error updating task, reverting local state:', error.message || error);
      // If the update fails, roll back to the original state.
      setTasks(originalTasks);
      throw new Error('Gagal memperbarui tugas. Silakan coba lagi.');
    }
  };


  const deleteTask = async (taskId: string) => {
    if (!user) return;

    // Handle projected IDs (e.g. "uuid-projected-2023-10-10")
    // We need to find the real underlying task ID to know what we are deleting
    const realId = taskId.split('-projected-')[0];

    const taskToDelete = tasks.find(t => t.id === realId);
    if (!taskToDelete) {
      console.warn(`Tugas dengan id ${realId} tidak ditemukan untuk dihapus.`);
      throw new Error('Tugas tidak ditemukan.');
    }

    // Case 1: Non-recurring Task (Simple Delete)
    if (taskToDelete.recurrence === Recurrence.None) {
      try {
        const { error } = await supabase.from('tasks').delete().eq('id', realId);
        if (error) throw error;
        await fetchTasks();
        return;
      } catch (error: any) {
        console.error('Error deleting task:', error.message || error);
        throw new Error('Gagal menghapus tugas. Silakan coba lagi.');
      }
    }

    // Case 2: Recurring Task Series
    // LOGIKA BARU: Hapus semua instance masa depan dan instance aktif.
    // PENTING: Jika ada instance masa lalu yang 'Done', ubah recurrence-nya menjadi 'none'.
    // Ini menghentikan proyeksi hantu di masa depan.
    try {
      const templateId = taskToDelete.recurringTemplateId || taskToDelete.id;

      // 1. Ambil semua instance dari DB yang terkait dengan template ini.
      const { data: allInstances, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .or(`id.eq.${templateId},recurring_template_id.eq.${templateId}`);

      if (fetchError) throw fetchError;
      
      if (!allInstances || allInstances.length === 0) {
        await fetchTasks();
        return;
      }

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      // Sort instances terbaru ke terlama
      const sortedInstances = allInstances.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

      const idsToDelete: string[] = [];
      let latestHistoryInstance: any = null;

      for (const instance of sortedInstances) {
          const instanceStartTime = new Date(instance.start_time);
          // Kondisi History: Masa lalu DAN Selesai
          const isHistory = instanceStartTime < startOfToday && instance.status === TaskStatus.Done;

          if (isHistory) {
              // Jika kita menemukan history (terbaru karena sudah disortir),
              // Simpan ini untuk diupdate agar recurrence-nya mati.
              if (!latestHistoryInstance) {
                  latestHistoryInstance = instance;
              }
              // Jangan hapus item history
          } else {
              // Hapus jika belum selesai atau berada di masa depan/hari ini
              idsToDelete.push(instance.id);
          }
      }

      // 2. Matikan recurrence pada item history terakhir agar tidak memproyeksikan tugas baru
      if (latestHistoryInstance) {
          const { error: updateError } = await supabase
              .from('tasks')
              .update({ recurrence: Recurrence.None })
              .eq('id', latestHistoryInstance.id);
          
          if (updateError) throw updateError;
      }

      // 3. Lakukan penghapusan massal untuk tugas aktif/masa depan
      if (idsToDelete.length > 0) {
        const { error: deleteError } = await supabase.from('tasks').delete().in('id', idsToDelete);
        if (deleteError) throw deleteError;
      }
      
      // 4. Ambil ulang semua tugas untuk menyinkronkan UI.
      await fetchTasks();

    } catch (error: any) {
      console.error('Error deleting recurring task series:', error.message || error);
      await fetchTasks(); // Selalu coba segarkan data jika terjadi kesalahan.
      throw new Error('Gagal menghapus rangkaian tugas berulang. Silakan coba lagi.');
    }
  };
  
  const bulkDeleteTasks = async (taskIds: string[]) => {
    if (!user || taskIds.length === 0) return;
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .in('id', taskIds);

      if (error) throw error;
      await fetchTasks(); // Re-fetch
    } catch (error: any) {
      console.error('Error bulk deleting tasks:', error.message || error);
      throw new Error('Gagal menghapus beberapa tugas. Silakan coba lagi.');
    }
  };

  const bulkUpdateTasks = async (tasksToUpdate: Task[]) => {
    if (!user || tasksToUpdate.length === 0) return;
    try {
        const updatePromises = tasksToUpdate.map(task => {
            const { id, ...taskData } = task;
            const snakeCaseTask = toSnakeCase(taskData);
            return supabase.from('tasks').update(snakeCaseTask).eq('id', id);
        });
        
        const results = await Promise.all(updatePromises);
        
        const firstError = results.find(res => res.error);
        if (firstError) throw firstError.error;

        await fetchTasks();
    } catch (error: any) {
        console.error('Error bulk updating tasks:', error.message || error);
        throw new Error('Gagal memperbarui beberapa tugas secara massal.');
    }
  };

  const getTaskById = (taskId: string): Task | undefined => {
    return tasks.find(task => task.id === taskId);
  };

  return { tasks, addTask, updateTask, deleteTask, bulkDeleteTasks, bulkUpdateTasks, getTaskById, loading, error };
};
