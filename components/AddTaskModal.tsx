
import React, { useState, useEffect } from 'react';
import { Task, TaskStatus, Recurrence, ChecklistItem } from '../types';
import XIcon from './icons/XIcon';
import StarIcon from './icons/StarIcon';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import SparklesIcon from './icons/SparklesIcon';
import ConfirmationModal from './ConfirmationModal';
import UnsavedChangesModal from './UnsavedChangesModal';
import TagIcon from './icons/TagIcon';
import TargetIcon from './icons/TargetIcon';

interface AddTaskModalProps {
  onClose: () => void;
  onAddTask: (task: Omit<Task, 'id' | 'createdAt' | 'userId'>) => void;
  tasks: Task[];
  initialData?: Omit<Task, 'id' | 'createdAt' | 'userId'> | null;
  availableTags?: { name: string, isGoal: boolean }[];
}

// Helper to convert ISO string to 'YYYY-MM-DDTHH:mm' format for datetime-local input
const toLocalDatetimeString = (isoString?: string): string => {
    const date = isoString ? new Date(isoString) : new Date();
    // Adjust for timezone offset to display correctly in the user's local time
    const adjustedDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return adjustedDate.toISOString().substring(0, 16);
};

const DRAFT_KEY = 'flowmind_new_task_draft';

const AddTaskModal: React.FC<AddTaskModalProps> = ({ onClose, onAddTask, tasks, initialData, availableTags = [] }) => {
  const [title, setTitle] = useState(initialData?.title || '');
  
  const defaultStartTime = toLocalDatetimeString();
  const defaultEndTime = toLocalDatetimeString(new Date(Date.now() + 3600000).toISOString()); // +1 hour

  const [startTime, setStartTime] = useState(initialData ? toLocalDatetimeString(initialData.startTime) : defaultStartTime);
  const [endTime, setEndTime] = useState(initialData ? toLocalDatetimeString(initialData.endTime) : defaultEndTime);
  const [dailyStartTime, setDailyStartTime] = useState('09:00');
  const [dailyEndTime, setDailyEndTime] = useState('10:00');

  const [isImportant, setIsImportant] = useState(initialData?.isImportant || false);
  const [recurrence, setRecurrence] = useState<Recurrence>(initialData?.recurrence || Recurrence.None);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [checklist, setChecklist] = useState<ChecklistItem[]>(initialData?.checklist || []);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [showAiChecklistRetry, setShowAiChecklistRetry] = useState(false);
  
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [tagInput, setTagInput] = useState('');
  
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  // Load draft if no initial data
  useEffect(() => {
    if (!initialData) {
        const savedDraft = localStorage.getItem(DRAFT_KEY);
        if (savedDraft) {
            try {
                const draft = JSON.parse(savedDraft);
                if (draft.title) setTitle(draft.title);
                if (draft.checklist) setChecklist(draft.checklist);
                if (draft.tags) setTags(draft.tags);
                if (draft.isImportant) setIsImportant(draft.isImportant);
            } catch (e) {
                console.error("Failed to parse task draft", e);
            }
        }
    }
  }, [initialData]);

  const handleClose = () => {
    setIsAnimatingOut(true);
    setTimeout(onClose, 300); // Animation duration
  };

  const attemptClose = () => {
      const isDirty = title.trim().length > 0 || checklist.length > 0;
      if (isDirty) {
          setShowUnsavedModal(true);
      } else {
          handleClose();
      }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
      // If user clicks strictly on the overlay (not inside form)
      if (e.target === e.currentTarget) {
          attemptClose();
      }
  };

  const handleSaveDraft = () => {
      const draft = {
          title,
          checklist,
          isImportant,
          tags
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      handleClose();
  };

  const handleDiscard = () => {
      localStorage.removeItem(DRAFT_KEY);
      handleClose();
  };

  const handleAddChecklistItem = () => {
    if (newChecklistItem.trim() === '') return;
    const newItem: ChecklistItem = {
      id: new Date().toISOString(),
      text: newChecklistItem.trim(),
      completed: false,
    };
    setChecklist([...checklist, newItem]);
    setNewChecklistItem('');
  };

  const handleDeleteChecklistItem = (itemId: string) => {
    setChecklist(checklist.filter(item => item.id !== itemId));
  };

  const handleAiChecklist = async () => {
    if (!title.trim() || isAiProcessing) return;
    setIsAiProcessing(true);
    setShowAiChecklistRetry(false);
    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini-2.5-flash',
          contents: `Berdasarkan judul tugas "${title}", buat daftar detail tugas atau langkah-langkah yang dapat ditindaklanjuti. Hasilkan semua item daftar HANYA dalam Bahasa Indonesia.`,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                checklist: {
                  type: 'ARRAY',
                  items: { type: 'STRING' },
                },
              },
              required: ['checklist'],
            },
          },
        }),
      });
      
      if (!response.ok) {
        throw new Error('AI service returned an error.');
      }

      const data = await response.json();
      const jsonString = data.text.trim();
      const result = JSON.parse(jsonString);

      if (result.checklist && Array.isArray(result.checklist)) {
        const newItems: ChecklistItem[] = result.checklist.map((text: string) => ({
          id: new Date().toISOString() + text,
          text,
          completed: false,
        }));
        setChecklist(prev => [...prev, ...newItems]);
      } else {
        throw new Error('Invalid response format from AI.');
      }

    } catch (error) {
      console.error("Error generating checklist with AI:", error);
      setShowAiChecklistRetry(true);
    } finally {
      setIsAiProcessing(false);
    }
  };
  
  // Tag Handlers
  const handleAddTag = (tagToAdd: string) => {
      const cleanTag = tagToAdd.trim().toLowerCase().replace(/\s+/g, '-');
      if (cleanTag && !tags.includes(cleanTag)) {
          setTags([...tags, cleanTag]);
      }
      setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
      setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) return;
    setError(null);
    
    let finalStartTime: string;
    let finalEndTime: string;

    if (recurrence === Recurrence.Daily) {
        const today = new Date();
        const [startHours, startMinutes] = dailyStartTime.split(':');
        today.setHours(parseInt(startHours, 10), parseInt(startMinutes, 10), 0, 0);
        finalStartTime = today.toISOString();
        
        const endToday = new Date();
        const [endHours, endMinutes] = dailyEndTime.split(':');
        endToday.setHours(parseInt(endHours, 10), parseInt(endMinutes, 10), 0, 0);
        
        if (endToday < today) {
            endToday.setDate(endToday.getDate() + 1);
        }
        finalEndTime = endToday.toISOString();
    } else {
        finalStartTime = new Date(startTime).toISOString();
        finalEndTime = new Date(endTime).toISOString();
    }

    const newStartTime = new Date(finalStartTime);
    const newEndTime = new Date(finalEndTime);
    
    if (newEndTime <= newStartTime) {
        setError("Waktu selesai harus setelah waktu mulai.");
        return;
    }

    const newStartDateString = newStartTime.toDateString();
    const tasksOnSameDay = tasks.filter(t => new Date(t.startTime).toDateString() === newStartDateString);

    const conflictingTask = tasksOnSameDay.find(t => {
      const existingStartTime = new Date(t.startTime);
      const existingEndTime = new Date(t.endTime);
      return (newStartTime < existingEndTime) && (existingStartTime < newEndTime);
    });

    if (conflictingTask) {
        setError(`Jadwal bentrok dengan tugas: "${conflictingTask.title}". Silakan pilih waktu lain.`);
        return;
    }

    onAddTask({
      title: title.trim(),
      startTime: finalStartTime,
      endTime: finalEndTime,
      status: TaskStatus.ToDo,
      checklist: checklist,
      notes: '',
      isImportant,
      recurrence,
      tags,
    });
    
    // Clear draft on successful submit
    localStorage.removeItem(DRAFT_KEY);
    handleClose();
  };
  
  const RecurrenceButton: React.FC<{
    label: string;
    value: Recurrence;
    currentValue: Recurrence;
    onClick: (value: Recurrence) => void;
    disabled?: boolean;
  }> = ({ label, value, currentValue, onClick, disabled }) => (
    <button
      type="button"
      onClick={() => onClick(value)}
      disabled={disabled}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        currentValue === value
          ? 'bg-blue-600 text-white'
          : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
      } ${disabled ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed' : ''}`}
    >
      {label}
    </button>
  );


  return (
    <div 
        className={`fixed inset-0 bg-black flex justify-center items-center z-50 p-4 lg:pl-64 transition-opacity duration-300 ${isAnimatingOut ? 'bg-opacity-0' : 'bg-opacity-50'}`}
        onClick={handleOverlayClick}
    >
      <form 
        onSubmit={handleSubmit} 
        onClick={(e) => e.stopPropagation()}
        className={`bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md transition-all duration-300 ease-out overflow-hidden flex flex-col max-h-[90vh] ${isAnimatingOut ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
      >
        <header className="p-5 border-b dark:border-slate-700 flex justify-between items-center flex-shrink-0">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
              {initialData ? 'Konfirmasi Jadwal AI' : 'Tugas Baru'}
          </h2>
          <button type="button" onClick={attemptClose} className="text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-200">
            <XIcon className="w-6 h-6" />
          </button>
        </header>
        <main className="p-6 space-y-5 overflow-y-auto flex-grow">
          {error && (
            <div className="p-3 mb-4 text-sm text-center text-red-800 bg-red-100 rounded-lg dark:bg-red-900/30 dark:text-red-300" role="alert">
              {error}
            </div>
          )}
          
          {initialData && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg flex items-start border border-blue-100 dark:border-blue-800">
                  <SparklesIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                      AI telah menjadwalkan tugas ini. Silakan periksa, tambahkan tag, atau edit detail sebelum menyimpan.
                  </p>
              </div>
          )}

          <div>
            <label htmlFor="title" className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
              Judul Tugas
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} 
              placeholder="Contoh: Buat presentasi untuk meeting"
              className="w-full p-3 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500 dark:placeholder-slate-400 text-slate-800 dark:text-slate-200"
              required
            />
          </div>
          
          {/* TAGS SECTION */}
          <div>
              <label className="flex items-center text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
                  <TagIcon className="w-4 h-4 mr-2" />
                  Tags (Kategori)
              </label>
              
              {/* Selected Tags */}
              <div className="flex flex-wrap gap-2 mb-3">
                  {tags.map(tag => {
                      const isGoal = availableTags.find(t => t.name === tag)?.isGoal;
                      return (
                        <div key={tag} className={`flex items-center px-2 py-1 rounded-full text-xs font-bold border ${isGoal ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300' : 'bg-slate-100 border-slate-200 text-slate-600 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300'}`}>
                            {isGoal && <TargetIcon className="w-3 h-3 mr-1" />}
                            #{tag}
                            <button type="button" onClick={() => handleRemoveTag(tag)} className="ml-1 hover:text-red-500">
                                <XIcon className="w-3 h-3" />
                            </button>
                        </div>
                      );
                  })}
              </div>

              {/* Suggested Tags */}
              {availableTags.length > 0 && (
                  <div className="mb-3">
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1.5">Saran Tag:</p>
                      <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto custom-scrollbar">
                          {availableTags.filter(t => !tags.includes(t.name)).map(tag => (
                              <button
                                key={tag.name}
                                type="button"
                                onClick={() => handleAddTag(tag.name)}
                                className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors border ${
                                    tag.isGoal 
                                    ? 'bg-white dark:bg-slate-800 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20' 
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                                }`}
                              >
                                  {tag.isGoal && <span className="mr-1">🎯</span>}
                                  {tag.name}
                              </button>
                          ))}
                      </div>
                  </div>
              )}

              <input
                  type="text"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          handleAddTag(tagInput);
                      }
                  }}
                  onBlur={() => tagInput && handleAddTag(tagInput)}
                  placeholder="+ Tambah tag baru"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
              />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
              Jadwal
            </label>
            {recurrence === Recurrence.Daily ? (
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="daily-start-time" className="block text-sm font-medium text-slate-500 dark:text-slate-200 mb-1">Waktu Mulai</label>
                        <input
                            id="daily-start-time"
                            type="time"
                            value={dailyStartTime}
                            onChange={(e) => setDailyStartTime(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(e); }}
                            className="w-full p-3 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="daily-end-time" className="block text-sm font-medium text-slate-500 dark:text-slate-200 mb-1">Waktu Selesai</label>
                        <input
                            id="daily-end-time"
                            type="time"
                            value={dailyEndTime}
                            onChange={(e) => setDailyEndTime(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(e); }}
                            className="w-full p-3 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
                            required
                        />
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div>
                        <label htmlFor="start-time" className="block text-sm font-medium text-slate-500 dark:text-slate-200 mb-1">Waktu Mulai</label>
                        <input
                            id="start-time"
                            type="datetime-local"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(e); }}
                            className="w-full p-3 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="end-time" className="block text-sm font-medium text-slate-500 dark:text-slate-200 mb-1">Waktu Selesai</label>
                        <input
                            id="end-time"
                            type="datetime-local"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(e); }}
                            className="w-full p-3 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
                            required
                        />
                    </div>
                </div>
            )}
          </div>
           <div>
            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
              Ulangi Tugas
            </label>
            <div className="flex space-x-2">
                <RecurrenceButton label="Tidak Berulang" value={Recurrence.None} currentValue={recurrence} onClick={setRecurrence} />
                <RecurrenceButton label="Setiap Hari" value={Recurrence.Daily} currentValue={recurrence} onClick={setRecurrence} />
            </div>
          </div>
           <div>
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold text-slate-700 dark:text-slate-200">Detail Task</h4>
              <button
                  type="button"
                  onClick={handleAiChecklist}
                  disabled={isAiProcessing || !title.trim()}
                  className="flex items-center px-3 py-1.5 text-sm font-semibold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/50 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                  <SparklesIcon className="w-4 h-4 mr-2"/>
                  {isAiProcessing ? 'Memproses...' : 'Buat dengan AI'}
              </button>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto pr-2 mb-3">
              {checklist.map(item => (
                <div key={item.id} className="flex items-center group bg-slate-100 dark:bg-slate-700/50 p-2 rounded-md">
                  <span className="flex-grow text-slate-700 dark:text-slate-200 text-sm">{item.text}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteChecklistItem(item.id)}
                    className="ml-2 p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Hapus item"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex items-center">
              <input 
                type="text" 
                value={newChecklistItem} 
                onChange={e => setNewChecklistItem(e.target.value)} 
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddChecklistItem(); } }}
                placeholder="Tambah item baru..." 
                className="flex-grow p-3 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500 dark:placeholder-slate-400 text-slate-800 dark:text-slate-200"
              />
              <button 
                type="button"
                onClick={handleAddChecklistItem} 
                disabled={!newChecklistItem.trim()}
                aria-label="Tambah item detail task"
                className="p-3 ml-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              >
                <PlusIcon className="w-5 h-5"/>
              </button>
            </div>
          </div>
          <div>
            <label className="flex items-center cursor-pointer mt-2 p-3 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600">
                <input 
                    type="checkbox" 
                    checked={isImportant} 
                    onChange={e => setIsImportant(e.target.checked)}
                    className="h-5 w-5 rounded text-amber-500 focus:ring-amber-400 border-slate-400 dark:bg-slate-600 dark:border-slate-500"
                />
                <StarIcon filled={isImportant} className={`w-5 h-5 ml-3 ${isImportant ? 'text-amber-500' : 'text-slate-500'}`} />
                <span className="ml-2 font-semibold text-slate-800 dark:text-slate-200">Tandai sebagai tugas penting</span>
            </label>
          </div>
        </main>
        <footer className="p-5 bg-slate-50 dark:bg-slate-800/50 border-t dark:border-slate-700 flex justify-end flex-shrink-0">
          <button
            type="submit"
            className="px-6 py-3 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:bg-slate-400"
            disabled={!title.trim()}
          >
            {initialData ? 'Simpan Jadwal' : 'Tambah Tugas'}
          </button>
        </footer>
      </form>
       {showAiChecklistRetry && (
        <ConfirmationModal
          title="Gagal Membuat Detail Tugas"
          message="AI gagal membuat detail tugas. Apakah Anda ingin mencoba lagi?"
          confirmText="Coba Lagi"
          onConfirm={handleAiChecklist}
          onCancel={() => setShowAiChecklistRetry(false)}
          isDestructive={false}
        />
      )}
      {showUnsavedModal && (
          <UnsavedChangesModal 
            onSave={() => handleSubmit()}
            onSaveDraft={handleSaveDraft}
            onDiscard={handleDiscard}
            onCancel={() => setShowUnsavedModal(false)}
            hasDraftOption={true}
          />
      )}
    </div>
  );
};

export default AddTaskModal;
