
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Task, TaskStatus, Recurrence } from '../types';
import SparklesIcon from './icons/SparklesIcon';
import MicIcon from './icons/MicIcon';
import EnterIcon from './icons/EnterIcon';
import LoaderIcon from './icons/LoaderIcon';
import ConfirmationModal from './ConfirmationModal';
import AiConflictResolutionModal from './AiConflictResolutionModal';

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}
interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionAlternative {
  readonly transcript: string;
}
interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
}
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface SmartAddTaskProps {
  onAddTask: (task: Omit<Task, 'id' | 'createdAt' | 'userId'>) => void;
  tasks: Task[];
  onOpenManualAdd: (taskData: Omit<Task, 'id' | 'createdAt' | 'userId'>) => void;
}

const findAvailableSlots = (taskDurationMs: number, targetDate: Date, existingTasksOnDay: Task[]) => {
    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);
    const isToday = targetDate.toDateString() === new Date().toDateString();
    const searchStartBoundary = isToday ? new Date().getTime() : dayStart.getTime();
    let busyPeriods = [
        { start: dayStart.getTime(), end: searchStartBoundary },
        ...existingTasksOnDay.map(t => ({
            start: new Date(t.startTime).getTime(),
            end: new Date(t.endTime).getTime(),
        }))
    ];
    busyPeriods.sort((a, b) => a.start - b.start);
    const mergedBusyPeriods: { start: number; end: number }[] = [];
    if (busyPeriods.length > 0) {
        let currentMerge = { ...busyPeriods[0] };
        for (let i = 1; i < busyPeriods.length; i++) {
            const nextPeriod = busyPeriods[i];
            if (nextPeriod.start <= currentMerge.end) {
                currentMerge.end = Math.max(currentMerge.end, nextPeriod.end);
            } else {
                mergedBusyPeriods.push(currentMerge);
                currentMerge = { ...nextPeriod };
            }
        }
        mergedBusyPeriods.push(currentMerge);
    }
    const suggestions: { startTime: string; endTime: string }[] = [];
    let lastBusyEnd = mergedBusyPeriods.length > 0 ? mergedBusyPeriods[0].end : searchStartBoundary;
    const finalBusyBlocks = [...mergedBusyPeriods, { start: dayEnd.getTime() + 1, end: dayEnd.getTime() + 1 }];
    for (const period of finalBusyBlocks) {
        const gapStart = lastBusyEnd;
        const gapEnd = period.start;
        const gapDuration = gapEnd - gapStart;
        if (gapDuration >= taskDurationMs) {
            suggestions.push({
                startTime: new Date(gapStart).toISOString(),
                endTime: new Date(gapStart + taskDurationMs).toISOString(),
            });
        }
        lastBusyEnd = Math.max(lastBusyEnd, period.end);
    }
    return suggestions;
};

const SmartAddTask: React.FC<SmartAddTaskProps> = ({ onAddTask, tasks, onOpenManualAdd }) => {
  const [inputValue, setInputValue] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showRetryModal, setShowRetryModal] = useState(false);
  const [conflictingTask, setConflictingTask] = useState<{ title: string; startTime: string; endTime: string } | null>(null);
  const [suggestedSlots, setSuggestedSlots] = useState<{ startTime: string; endTime: string }[]>([]);
  const [isConflictModalOpen, setConflictModalOpen] = useState(false);
  const [conflictReason, setConflictReason] = useState<string>('');
  const [conflictType, setConflictType] = useState<'overlap' | 'overdue'>('overlap');

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isListening, setIsListening] = useState(false);
  const [micPermission, setMicPermission] = useState<'default' | 'granted' | 'denied' | 'prompt'>('default');
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  useEffect(() => {
    if (isMobile && isListening) {
        setIsListening(false);
    }
  }, [isMobile, isListening]);

  useEffect(() => {
    const checkPermission = async () => {
      if (!navigator.permissions) return;
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        setMicPermission(permissionStatus.state);
        permissionStatus.onchange = () => setMicPermission(permissionStatus.state);
      } catch (err) {
        console.error("Tidak dapat menanyakan izin mikrofon:", err);
      }
    };
    checkPermission();
  }, []);

  const handleAiRequest = useCallback(async (command?: string) => {
    const textToSubmit = command || inputValue;
    if (!textToSubmit.trim()) return;
    setIsAiLoading(true);
    setShowRetryModal(false);
    if (isListening) setIsListening(false);

    try {
      // Fix: Use local time as reference to avoid UTC shift issues (H-1 problem)
      const now = new Date();
      const localDateInfo = now.toLocaleString('id-ID', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit',
          timeZoneName: 'short'
      });
      
      const prompt = `Anda adalah asisten cerdas yang tugasnya mengubah permintaan bahasa alami menjadi satu atau beberapa tugas dalam format JSON.
- **Waktu Lokal Pengguna (Referensi Utama):** ${localDateInfo}
- **Aturan Penting:**
  - Gunakan "Waktu Lokal Pengguna" di atas untuk menentukan tanggal "hari ini", "besok", atau tanggal spesifik yang diminta. JANGAN menggunakan waktu UTC sistem untuk menentukan tanggal.
  - Jika pengguna hanya menyebutkan jam (misal "jam 9 pagi"), asumsikan itu untuk tanggal "hari ini" (${now.getDate()} ${now.toLocaleString('id-ID', { month: 'short' })}) KECUALI jam tersebut sudah lewat jauh dari waktu sekarang, maka pertimbangkan besok atau gunakan logika terbaik.
  - Output \`startTime\` dan \`endTime\` HARUS dalam format string **ISO 8601 UTC** (diakhiri 'Z') agar kompatibel dengan database. Anda harus mengonversi waktu lokal pengguna ke UTC.
- Jika tidak ada durasi atau waktu berakhir, asumsikan durasi 1 jam.
- Jika durasi eksplisit disebutkan (misalnya, "rapat selama 2 jam" atau "dari jam 2 sampai jam 4"), gunakan durasi tersebut.
- Selalu kembalikan array JSON, bahkan jika hanya ada satu tugas.
**Permintaan Pengguna:** "${textToSubmit}"`;

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini-2.5-flash', contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: { type: 'ARRAY', items: { type: 'OBJECT', properties: { title: { type: 'STRING' }, startTime: { type: 'STRING' }, endTime: { type: 'STRING' } }, required: ['title', 'startTime', 'endTime'] } }
          }
        })
      });
      if (!response.ok) throw new Error('AI service returned an error.');
      const data = await response.json();
      const parsedTasks = JSON.parse(data.text.trim());
      if (!Array.isArray(parsedTasks) || parsedTasks.length === 0) throw new Error('AI tidak mengembalikan tugas yang valid.');
      
      const getTasksOnSameDay = (d: Date) => tasks.filter(t => new Date(t.startTime).toDateString() === d.toDateString());
      
      // Loop through tasks to check conflicts, but we only process the FIRST task
      // because the user flow for confirmation (modal) works best with single items.
      // If multiple tasks are needed, user can repeat or we'd need a bulk review UI.
      for (const p of parsedTasks) {
        if (!p.title || !p.startTime || !p.endTime) continue;
        const newStart = new Date(p.startTime), newEnd = new Date(p.endTime);
        let duration = newEnd.getTime() - newStart.getTime();
        if (isNaN(duration) || duration < 60000) duration = 3600000;
        
        const tasksOnDay = getTasksOnSameDay(newStart);
        
        // Check Overlap
        const overlappingTask = tasksOnDay.find(t => {
            const tStart = new Date(t.startTime).getTime();
            const tEnd = new Date(t.endTime).getTime();
            const nStart = newStart.getTime();
            const nEnd = newEnd.getTime();
            // Intersection check
            return (nStart < tEnd && tStart < nEnd);
        });

        // Check Overdue (Allow 1 min buffer)
        const isOverdue = newEnd.getTime() < (Date.now() - 60000);

        if (overlappingTask || isOverdue) {
          setConflictingTask(p);
          if (overlappingTask) {
              setConflictType('overlap');
              setConflictReason(`bentrok dengan tugas "${overlappingTask.title}"`);
          } else {
              setConflictType('overdue');
              setConflictReason(`waktu yang diminta sudah berlalu`);
          }

          // Generate Suggested Slots
          let slots: {startTime: string, endTime: string}[] = [];
          for (let i = 0; i < 5 && slots.length < 3; i++) {
            const searchDate = new Date(); 
            searchDate.setHours(0,0,0,0); 
            searchDate.setDate(searchDate.getDate() + i);
            // If today, prevent suggestions in the past
            if (i === 0 && searchDate.getTime() < Date.now()) {
               // This logic is handled inside findAvailableSlots using 'searchStartBoundary'
            }
            slots.push(...findAvailableSlots(duration, searchDate, getTasksOnSameDay(searchDate)));
          }
          
          if (slots.length > 0) { 
              setSuggestedSlots(slots.slice(0,3)); 
              setConflictModalOpen(true); 
          } else { 
              alert(`Jadwal untuk "${p.title}" bermasalah, dan tidak ada slot kosong ditemukan.`); 
          }
        } else {
          // SUCCESS FLOW: Open Manual Add Modal with pre-filled data for confirmation
          onOpenManualAdd({ 
              title: p.title, 
              startTime: newStart.toISOString(), 
              endTime: new Date(newStart.getTime() + duration).toISOString(), 
              status: TaskStatus.ToDo, 
              checklist: [], 
              notes: '', 
              isImportant: false, 
              recurrence: Recurrence.None,
              tags: [] 
          });
        }
        // Only process the first valid task found for now to keep UI simple
        break; 
      }
      setInputValue('');
    } catch (err) { console.error("Error with AI task creation:", err); setShowRetryModal(true); } 
    finally { setIsAiLoading(false); }
  }, [inputValue, tasks, isListening, onOpenManualAdd]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    if (!recognitionRef.current) {
      const recognition: SpeechRecognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'id-ID';
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        }
        if (finalTranscript) {
          // Update input value
          setInputValue(prev => (prev + ' ' + finalTranscript.trim()).trim());
          // Stop listening immediately after getting final text to switch to "Enter" button
          setIsListening(false);
        }
      };
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error !== 'no-speech' && event.error !== 'aborted') setIsListening(false);
      };
      recognition.onend = () => {
          // Intentionally mostly empty to let react state control the flow
          // If we set isListening(false) here, it might conflict with manual toggles
      };
      recognitionRef.current = recognition;
    }
    return () => {
      recognitionRef.current?.stop();
    };
  }, []); // Dependencies removed to prevent recreation

  useEffect(() => {
    if (isListening) {
      try {
        setInputValue('');
        recognitionRef.current?.start();
      } catch (e) {
        // If already started or error, ensure state reflects reality
        // setIsListening(false); // Don't force false, allows retries
      }
    } else {
      recognitionRef.current?.stop();
    }
  }, [isListening]);

  const toggleListening = async () => {
    if (isMobile) return;
    
    if (isListening) {
      setIsListening(false);
    } else if (micPermission === 'granted') {
      setIsListening(true);
    } else if (micPermission === 'prompt') {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        // Status akan diperbarui oleh event 'onchange', lalu kita bisa mencoba lagi
      } catch (err) {
        // Izin ditolak, status akan menjadi 'denied'
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => { 
      e.preventDefault(); 
      if (isAiLoading) return; 
      
      // Ensure microphone is stopped when submitting
      if (isListening) {
          recognitionRef.current?.stop();
          setIsListening(false);
      }
      
      handleAiRequest(); 
  };
  
  const handleSlotSelection = (slot: { startTime: string; endTime: string }) => { 
      if (conflictingTask) {
          onOpenManualAdd({ 
              title: conflictingTask.title, 
              startTime: slot.startTime, 
              endTime: slot.endTime, 
              status: TaskStatus.ToDo, 
              checklist: [], 
              notes: '', 
              isImportant: false, 
              recurrence: Recurrence.None 
          }); 
      }
      setConflictModalOpen(false); 
      setConflictingTask(null); 
      setSuggestedSlots([]); 
      setInputValue(''); 
  };
  
  const handleManualAdd = () => { 
      if (conflictingTask) {
          onOpenManualAdd({ 
              title: conflictingTask.title, 
              startTime: conflictingTask.startTime, 
              endTime: conflictingTask.endTime, 
              status: TaskStatus.ToDo, 
              checklist: [], 
              notes: '', 
              isImportant: false, 
              recurrence: Recurrence.None 
          }); 
      }
      setConflictModalOpen(false); 
      setConflictingTask(null); 
      setSuggestedSlots([]); 
      setInputValue(''); 
  };

  let micButtonClass = 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400';
  if (isListening) micButtonClass = 'text-red-500 animate-pulse';
  if (micPermission === 'denied') micButtonClass = 'text-slate-400 dark:text-slate-600 cursor-not-allowed';

  const hasText = inputValue.trim().length > 0;

  return (
    <div className="mb-8" data-tour-id="smart-add-task">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <SparklesIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 pointer-events-none" />
          <input
            type="text" value={inputValue} onChange={e => setInputValue(e.target.value)} disabled={isAiLoading}
            placeholder={isListening ? 'Mendengarkan perintah Anda...' : isMobile ? 'Coba: Rapat dengan tim besok jam 2' : 'Coba: Rapat besok jam 3 dan kirim laporan jam 5'}
            className={`w-full pl-12 ${isMobile ? 'pr-4' : 'pr-12'} py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400 dark:placeholder-slate-500 text-slate-800 dark:text-slate-200 shadow-sm`}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
            {isAiLoading ? (
                <LoaderIcon className="w-5 h-5 text-slate-400" />
            ) : (
                !isMobile && (
                    hasText ? (
                        <button
                            type="button"
                            onClick={handleSubmit}
                            className="p-1 rounded-full text-blue-600 hover:text-blue-700 dark:text-blue-500 dark:hover:text-blue-400 transition-colors"
                            title="Kirim"
                        >
                            <EnterIcon className="w-6 h-6" />
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={toggleListening}
                            disabled={micPermission === 'denied'}
                            title={micPermission === 'denied' ? 'Izin mikrofon diblokir di pengaturan browser Anda' : 'Gunakan perintah suara'}
                            className={`p-1 rounded-full transition-colors ${micButtonClass}`}
                            aria-label="Gunakan perintah suara"
                        >
                            <MicIcon className="w-6 h-6" />
                        </button>
                    )
                )
            )}
          </div>
        </div>
      </form>
      <p className="text-xs text-slate-500 dark:text-slate-300 text-center mt-2">
        {isAiLoading ? 'AI Sedang membuat jadwal Anda...' : isListening ? 'Bicara sekarang... teks akan muncul otomatis.' : isMobile ? 'Tekan Enter untuk membuat tugas.' : 'Tekan Enter atau aktifkan mic untuk membuat tugas.'}
      </p>
      {showRetryModal && <ConfirmationModal title="Terjadi Kegagalan" message="AI gagal memproses permintaan Anda. Apakah Anda ingin mencoba lagi?" confirmText="Coba Lagi" onConfirm={() => handleAiRequest()} onCancel={() => setShowRetryModal(false)} isDestructive={false} />}
      {isConflictModalOpen && conflictingTask && (
        <AiConflictResolutionModal 
            taskTitle={conflictingTask.title} 
            suggestedSlots={suggestedSlots} 
            onClose={() => { setConflictModalOpen(false); setConflictingTask(null); }} 
            onSelectSlot={handleSlotSelection} 
            onManualAdd={handleManualAdd} 
            conflictReason={conflictReason}
            conflictType={conflictType}
        />
      )}
    </div>
  );
};

export default SmartAddTask;
