
import React, { useState } from 'react';
import { Goal, GoalType } from '../types';
import XIcon from './icons/XIcon';
import TargetIcon from './icons/TargetIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import EditIcon from './icons/EditIcon';

interface AddGoalModalProps {
  onClose: () => void;
  onAddGoal: (goal: Omit<Goal, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  initialData?: Goal | null;
  onUpdateGoal?: (id: string, updates: Partial<Goal>) => Promise<void>;
}

const AddGoalModal: React.FC<AddGoalModalProps> = ({ onClose, onAddGoal, initialData, onUpdateGoal }) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [type, setType] = useState<GoalType>(initialData?.type || 'finance');
  const [targetValueStr, setTargetValueStr] = useState(initialData?.targetValue?.toString() || '');
  const [currentValueStr, setCurrentValueStr] = useState(initialData?.currentValue?.toString() || '0');
  const [deadline, setDeadline] = useState(initialData?.deadline ? new Date(initialData.deadline).toISOString().split('T')[0] : '');
  const [linkedTag, setLinkedTag] = useState(initialData?.linkedTag || '');
  const [isLoading, setIsLoading] = useState(false);

  // Helper formatting number
  const formatNumber = (val: string) => val.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const unformat = (val: string) => parseFloat(val.replace(/\./g, '') || '0');

  const handleTargetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setTargetValueStr(formatNumber(e.target.value));
  };
  const handleCurrentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setCurrentValueStr(formatNumber(e.target.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !targetValueStr) return;

    setIsLoading(true);
    try {
      const payload = {
        title,
        type,
        targetValue: unformat(targetValueStr),
        currentValue: unformat(currentValueStr),
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
        linkedTag: type === 'task' ? linkedTag.replace('#', '').trim() : undefined,
      };

      if (initialData && onUpdateGoal) {
          await onUpdateGoal(initialData.id, payload);
      } else {
          await onAddGoal(payload);
      }
      onClose();
    } catch (error) {
      alert('Gagal menyimpan goal. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[150] p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
        <header className="p-6 border-b dark:border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
            {initialData ? 'Edit Tujuan' : 'Buat Tujuan Baru'}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
            <XIcon className="w-6 h-6" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Type Selection */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <button
              type="button"
              onClick={() => setType('finance')}
              className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                type === 'finance' 
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' 
                  : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <TargetIcon className="w-6 h-6" />
              <span className="text-xs font-bold">Keuangan</span>
            </button>
            <button
              type="button"
              onClick={() => setType('task')}
              className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                type === 'task' 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' 
                  : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <CheckCircleIcon className="w-6 h-6" />
              <span className="text-xs font-bold">Tugas</span>
            </button>
            <button
              type="button"
              onClick={() => setType('manual')}
              className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                type === 'manual' 
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' 
                  : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <EditIcon className="w-6 h-6" />
              <span className="text-xs font-bold">Manual</span>
            </button>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Nama Tujuan</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={type === 'finance' ? "Beli Rumah, Dana Darurat..." : type === 'task' ? "Selesaikan Skripsi, Proyek Web..." : "Baca 10 Buku..."}
              className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
              required
            />
          </div>

          {/* Target & Current */}
          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Target {type === 'finance' ? '(Rp)' : '(Jumlah)'}
                </label>
                <input
                    type="text"
                    value={targetValueStr}
                    onChange={handleTargetChange}
                    placeholder="0"
                    className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white font-mono font-bold"
                    required
                />
            </div>
            <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tercapai Saat Ini
                </label>
                <input
                    type="text"
                    value={currentValueStr}
                    onChange={handleCurrentChange}
                    placeholder="0"
                    className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white font-mono"
                    disabled={type === 'finance' || type === 'task'} // Auto-calculated usually
                />
                {(type === 'finance' || type === 'task') && (
                    <p className="text-[10px] text-slate-400 mt-1">Diisi otomatis dari data {type === 'finance' ? 'Tabungan' : 'Tag'}</p>
                )}
            </div>
          </div>

          {/* Conditional Inputs */}
          {type === 'task' && (
              <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Tag Tugas (tanpa #)</label>
                  <input
                    type="text"
                    value={linkedTag}
                    onChange={e => setLinkedTag(e.target.value)}
                    placeholder="contoh: skripsi, belajar, coding"
                    className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
                  />
                  <p className="text-xs text-slate-500 mt-1">Progress akan bertambah setiap kali tugas dengan tag ini selesai.</p>
              </div>
          )}

          {/* Deadline */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Tenggat Waktu</label>
            <input
              type="date"
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
              className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-70"
          >
            {isLoading ? 'Menyimpan...' : (initialData ? 'Simpan Perubahan' : 'Buat Tujuan')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddGoalModal;