
import { useState, useEffect, useCallback } from 'react';
import { Expense, Budget } from '../types';
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

export const useFinance = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTableMissing, setIsTableMissing] = useState(false);
  const { user } = useAuth();

  const processRecurringExpenses = useCallback(async (allExpenses: any[]) => {
      if (!user) return false;
      const now = new Date();
      const recurringTemplates = allExpenses.filter(e => e.is_recurring && e.next_due_date);
      
      let hasUpdates = false;

      for (const template of recurringTemplates) {
          let nextDue = new Date(template.next_due_date);
          // Check if due date is today or in the past
          if (nextDue <= now) {
              hasUpdates = true;
              
              // 1. Create new transaction for today based on template
              const newTransaction = {
                  user_id: user.id,
                  title: template.title,
                  amount: template.amount,
                  category: template.category,
                  type: template.type,
                  date: new Date().toISOString(), // Created now
                  is_recurring: false, // The instance itself is not the template
                  notes: `Otomatisasi dari: ${template.title}`
              };

              const { error: insertError } = await supabase.from('expenses').insert([newTransaction]);
              if (insertError) console.error("Gagal membuat transaksi otomatis:", insertError);

              // 2. Update template's next_due_date
              let nextDate = new Date(nextDue);
              switch (template.recurrence_interval) {
                  case 'daily': nextDate.setDate(nextDate.getDate() + 1); break;
                  case 'weekly': nextDate.setDate(nextDate.getDate() + 7); break;
                  case 'monthly': nextDate.setMonth(nextDate.getMonth() + 1); break;
                  case 'yearly': nextDate.setFullYear(nextDate.getFullYear() + 1); break;
                  default: nextDate.setMonth(nextDate.getMonth() + 1);
              }
              
              await supabase.from('expenses').update({ next_due_date: nextDate.toISOString() }).eq('id', template.id);
          }
      }
      
      return hasUpdates;
  }, [user]);

  const fetchExpenses = useCallback(async () => {
    if (!user) {
        setExpenses([]);
        setBudgets([]);
        setLoading(false);
        return;
    };
    try {
      setLoading(true);
      setError(null);
      setIsTableMissing(false);
      
      // 1. Fetch raw data first
      const { data, error: dbError } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (dbError) throw dbError;

      // 2. Fetch budgets
      const { data: budgetData, error: budgetError } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id);
      
      // Ignore budget error if table doesn't exist yet (graceful fallback)
      if (!budgetError && budgetData) {
          setBudgets(budgetData.map(b => toCamelCase(b) as Budget));
      }

      // 3. Check and process recurring transactions
      const processedUpdates = await processRecurringExpenses(data || []);
      
      // 4. If updates happened, re-fetch to get clean list
      if (processedUpdates) {
          const { data: refreshedData } = await supabase
            .from('expenses')
            .select('*')
            .eq('user_id', user.id)
            .order('date', { ascending: false });
            
          const camelCaseExpenses = (refreshedData || []).map(expense => toCamelCase(expense) as Expense);
          setExpenses(camelCaseExpenses);
      } else {
          const camelCaseExpenses = data.map(expense => toCamelCase(expense) as Expense);
          setExpenses(camelCaseExpenses);
      }

    } catch (error: any) {
      // Check for missing table error (Postgres code 42P01 or specific message)
      if (error.code === '42P01' || error.message?.includes('Could not find the table')) {
          console.warn("Tabel 'expenses' atau 'budgets' belum dibuat di database.");
          if (error.message?.includes('budgets')) {
             // If only budget is missing, allow expenses to load
             setBudgets([]);
          } else {
             setIsTableMissing(true);
             setExpenses([]);
          }
      } else {
          console.error('Error fetching expenses:', error.message || error);
          setError('Gagal memuat data keuangan.');
      }
    } finally {
      setLoading(false);
    }
  }, [user, processRecurringExpenses]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const addExpense = async (expense: Omit<Expense, 'id' | 'userId' | 'createdAt'>, receiptBlob?: Blob) => {
    if (!user) return;
    try {
      let receiptUrl = expense.receiptUrl;

      if (receiptBlob) {
        const filename = `${user.id}/${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
            .from('receipts')
            .upload(filename, receiptBlob);
            
        if (uploadError) throw uploadError;
        
        // Get public URL (assuming bucket is public, or use signedUrl if private)
        const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(filename);
        receiptUrl = publicUrl;
      }

      // Calculate next due date if recurring
      let nextDueDate = expense.nextDueDate;
      if (expense.isRecurring && expense.recurrenceInterval && expense.date) {
          const startDate = new Date(expense.date);
          let nextDate = new Date(startDate);
          switch (expense.recurrenceInterval) {
              case 'daily': nextDate.setDate(nextDate.getDate() + 1); break;
              case 'weekly': nextDate.setDate(nextDate.getDate() + 7); break;
              case 'monthly': nextDate.setMonth(nextDate.getMonth() + 1); break;
              case 'yearly': nextDate.setFullYear(nextDate.getFullYear() + 1); break;
              default: nextDate.setMonth(nextDate.getMonth() + 1);
          }
          nextDueDate = nextDate.toISOString();
      }

      const snakeCaseExpense = toSnakeCase({ ...expense, receiptUrl, nextDueDate });
      
      const { error } = await supabase.from('expenses').insert([
        { ...snakeCaseExpense, user_id: user.id }
      ]);
      
      if (error) throw error;
      await fetchExpenses();
    } catch (error: any) {
        console.error('Error adding expense:', error.message || error);
        throw error;
    }
  };

  const updateExpense = async (updatedExpense: Expense) => {
    if (!user) return;
    try {
      const { id, ...expenseData } = updatedExpense;
      const snakeCaseExpense = toSnakeCase(expenseData);
      
      const { error } = await supabase
        .from('expenses')
        .update(snakeCaseExpense)
        .eq('id', id);
      
      if (error) throw error;
      await fetchExpenses();
    } catch (error: any) {
      console.error('Error updating expense:', error.message || error);
      throw error;
    }
  };

  const deleteExpense = async (expenseId: string) => {
    if (!user) return;
    try {
        const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
        if (error) throw error;
        await fetchExpenses();
    } catch (error: any) {
        console.error('Error deleting expense:', error.message || error);
        throw error;
    }
  };

  const saveBudget = async (category: string, amount: number) => {
      if (!user) return;
      try {
          const { error } = await supabase
            .from('budgets')
            .upsert({ 
                user_id: user.id, 
                category, 
                amount 
            }, { onConflict: 'user_id, category' });
            
          if (error) throw error;
          await fetchExpenses(); // Refresh budgets
      } catch (error: any) {
          console.error('Error saving budget:', error.message || error);
          throw error;
      }
  };

  return { expenses, budgets, addExpense, updateExpense, deleteExpense, saveBudget, fetchExpenses, loading, error, isTableMissing };
};