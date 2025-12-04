
import React, { useState, useEffect } from 'react';
import { Goal, Task, Expense } from '../types';
import { useGoals } from '../hooks/useGoals';
import PlusIcon from './icons/PlusIcon';
import AddGoalModal from './AddGoalModal';
import TargetIcon from './icons/TargetIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import EditIcon from './icons/EditIcon';
import TrashIcon from './icons/TrashIcon';
import ConfirmationModal from './ConfirmationModal';
import ClockIcon from './icons/ClockIcon';

interface GoalsViewProps {
  tasks: Task[];
  expenses: Expense[];
}

const GoalsView: React.FC<GoalsViewProps> = ({ tasks, expenses }) => {
  const { goals, addGoal, updateGoal, deleteGoal, loading, fetchGoals } = useGoals();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [goalToEdit, setGoalToEdit] = useState<Goal | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<string | null>(null);

  // --- SYNC LOGIC ---
  // Update current values based on real data (Finance/Tasks)
  useEffect(() => {
      if (goals.length === 0) return;

      let hasUpdates = false;
      const updates: Promise<any>[] = [];

      goals.forEach(goal => {
          let computedValue = goal.currentValue;
          
          if (goal.type === 'finance') {
              // Calculate savings: Income - Expense in 'Tabungan' category
              const savingsIncome = expenses
                .filter(e => e.type === 'income' && e.category === 'Tabungan')
                .reduce((acc, curr) => acc + Number(curr.amount), 0);
              const savingsExpense = expenses
                .filter(e => (e.type === 'expense' || !e.type) && e.category === 'Tabungan')
                .reduce((acc, curr) => acc + Number(curr.amount), 0);
              
              computedValue = savingsIncome - savingsExpense;
          } 
          else if (goal.type === 'task' && goal.linkedTag) {
              // Count completed tasks with specific tag
              const count = tasks.filter(t => 
                  t.status === 'Done' && t.tags?.includes(goal.linkedTag!)
              ).length;
              computedValue = count;
          }

          // Only update if diff > epsilon (for float) or distinct int
          if (computedValue !== goal.currentValue) {
              hasUpdates = true;
              updates.push(updateGoal(goal.id, { currentValue: computedValue }));
          }
      });

      // We don't await here to avoid UI blocking, logic runs in background
      // Ideally this logic is backend side, but for now frontend sync is fine
  }, [tasks, expenses, goals.length]); // Depend on length to avoid loop, specific deps usually safer but this is a "check on mount/data change"

  const formatCurrency = (val: number) => "Rp " + val.toLocaleString('id-ID');
  const formatNumber = (val: number) => val.toLocaleString('id-ID');

  const getGoalIcon = (type: string) => {
      switch (type) {
          case 'finance': return <TargetIcon className="w-6 h-6 text-emerald-600" />;
          case 'task': return <CheckCircleIcon className="w-6 h-6 text-blue-600" />;
          default: return <EditIcon className="w-6 h-6 text-purple-600" />;
      }
  };

  const getProgressColor = (percent: number) => {
      if (percent >= 100) return 'bg-green-500';
      if (percent >= 70) return 'bg-blue-500';
      if (percent >= 30) return 'bg-yellow-500';
      return 'bg-red-500';
  };

  const getDaysLeft = (dateStr?: string) => {
      if (!dateStr) return null;
      const diff = new Date(dateStr).getTime() - new Date().getTime();
      const days = Math.ceil(diff / (1000 * 3600 * 24));
      return days;
  };

  const handleDelete = async () => {
      if (goalToDelete) {
          await deleteGoal(goalToDelete);
          setGoalToDelete(null);
      }
  };

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto pb-24">
      <header className="mb-8 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 dark:text-slate-200">Target Kehidupan</h1>
          <p className="text-slate-500 dark:text-slate-300 mt-1">Visualisasikan impian dan pantau kemajuan nyata Anda.</p>
        </div>
        <button
          onClick={() => { setGoalToEdit(null); setIsModalOpen(true); }}
          className="flex items-center px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-transform active:scale-95"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Buat Tujuan
        </button>
      </header>

      {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
      ) : goals.length === 0 ? (
          <div className="text-center py-20 bg-slate-100 dark:bg-slate-800 rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700">
              <TargetIcon className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
              <h3 className="text-xl font-bold text-slate-600 dark:text-slate-300">Belum ada tujuan</h3>
              <p className="text-slate-500 dark:text-slate-400 mt-2">Mulai tetapkan target finansial atau produktivitas Anda sekarang.</p>
          </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {goals.map(goal => {
                  const percent = Math.min(100, Math.max(0, (goal.currentValue / goal.targetValue) * 100));
                  const daysLeft = getDaysLeft(goal.deadline);
                  
                  return (
                      <div key={goal.id} className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-lg border border-slate-100 dark:border-slate-700 flex flex-col relative group transition-all hover:-translate-y-1 hover:shadow-xl">
                          {/* Action Buttons (Hover) */}
                          <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => { setGoalToEdit(goal); setIsModalOpen(true); }}
                                className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900 text-slate-500 dark:text-slate-300 hover:text-blue-600"
                              >
                                  <EditIcon className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => setGoalToDelete(goal.id)}
                                className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full hover:bg-red-100 dark:hover:bg-red-900 text-slate-500 dark:text-slate-300 hover:text-red-600"
                              >
                                  <TrashIcon className="w-4 h-4" />
                              </button>
                          </div>

                          <div className="flex items-center mb-4">
                              <div className={`p-3 rounded-2xl ${goal.type === 'finance' ? 'bg-emerald-100 dark:bg-emerald-900/30' : goal.type === 'task' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-purple-100 dark:bg-purple-900/30'}`}>
                                  {getGoalIcon(goal.type)}
                              </div>
                              <div className="ml-4 flex-1 min-w-0">
                                  <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 truncate" title={goal.title}>{goal.title}</h3>
                                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                      {goal.type === 'finance' ? 'Keuangan' : goal.type === 'task' ? `Tugas ${goal.linkedTag ? `(#${goal.linkedTag})` : ''}` : 'Manual'}
                                  </p>
                              </div>
                          </div>

                          <div className="mb-2 flex justify-between items-end">
                              <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                                  {goal.type === 'finance' ? formatCurrency(goal.currentValue) : formatNumber(goal.currentValue)}
                              </span>
                              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                                  Target: {goal.type === 'finance' ? formatCurrency(goal.targetValue) : formatNumber(goal.targetValue)}
                              </span>
                          </div>

                          {/* Progress Bar */}
                          <div className="h-4 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-4 border border-slate-200 dark:border-slate-600">
                              <div 
                                  className={`h-full ${getProgressColor(percent)} transition-all duration-1000 ease-out relative`} 
                                  style={{ width: `${percent}%` }}
                              >
                                  {percent > 15 && <div className="absolute inset-0 flex items-center justify-end pr-2 text-[10px] font-bold text-white/90">{percent.toFixed(0)}%</div>}
                              </div>
                          </div>

                          {/* Footer Info */}
                          <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                              {daysLeft !== null ? (
                                  <div className={`flex items-center text-xs font-bold ${daysLeft < 0 ? 'text-red-500' : daysLeft < 7 ? 'text-amber-500' : 'text-slate-500 dark:text-slate-400'}`}>
                                      <ClockIcon className="w-4 h-4 mr-1.5" />
                                      {daysLeft < 0 ? `${Math.abs(daysLeft)} Hari Lewat` : `${daysLeft} Hari Lagi`}
                                  </div>
                              ) : (
                                  <span className="text-xs text-slate-400">Tidak ada tenggat</span>
                              )}
                              
                              {percent >= 100 && (
                                  <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold uppercase rounded-lg tracking-wide">
                                      Tercapai 🎉
                                  </span>
                              )}
                          </div>
                      </div>
                  );
              })}
          </div>
      )}

      {(isModalOpen || goalToEdit) && (
        <AddGoalModal
          onClose={() => { setIsModalOpen(false); setGoalToEdit(null); }}
          onAddGoal={addGoal}
          onUpdateGoal={updateGoal}
          initialData={goalToEdit}
        />
      )}

      {goalToDelete && (
          <ConfirmationModal
            title="Hapus Tujuan"
            message="Apakah Anda yakin ingin menghapus tujuan ini? Data tidak dapat dikembalikan."
            confirmText="Ya, Hapus"
            onConfirm={handleDelete}
            onCancel={() => setGoalToDelete(null)}
            isDestructive={true}
          />
      )}
    </div>
  );
};

export default GoalsView;