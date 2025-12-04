
import React, { useState } from 'react';
import { Task } from '../types';
import XIcon from './icons/XIcon';
import { generateGoogleCalendarUrl, generateICSFile } from '../utils/calendarUtils';
import DownloadIcon from './icons/DownloadIcon';

interface CalendarExportModalProps {
  task: Task;
  onClose: () => void;
}

const CalendarExportModal: React.FC<CalendarExportModalProps> = ({ task, onClose }) => {
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  const handleClose = () => {
    setIsAnimatingOut(true);
    setTimeout(onClose, 300);
  };

  const handleGoogleClick = () => {
    window.open(generateGoogleCalendarUrl(task), '_blank');
    handleClose();
  };

  const handleICSClick = () => {
    generateICSFile(task);
    handleClose();
  };

  return (
    <div className={`fixed inset-0 bg-black flex justify-center items-center z-[100] p-4 transition-opacity duration-300 ${isAnimatingOut ? 'bg-opacity-0' : 'bg-opacity-50'}`}>
      <div className={`bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm transition-all duration-300 ease-out overflow-hidden ${isAnimatingOut ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
        <header className="p-5 border-b dark:border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Tambahkan ke Kalender</h2>
          <button type="button" onClick={handleClose} className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">
            <XIcon className="w-6 h-6" />
          </button>
        </header>
        
        <main className="p-6 space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
            Pilih kalender eksternal untuk menyimpan tugas <strong>"{task.title}"</strong>:
          </p>

          <button 
            onClick={handleGoogleClick}
            className="w-full flex items-center p-4 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors group"
          >
            <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" alt="Google" className="w-8 h-8 mr-4" />
            <div className="text-left">
              <span className="block font-bold text-slate-800 dark:text-slate-100">Google Calendar</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">Buka di tab baru</span>
            </div>
          </button>

          <button 
            onClick={handleICSClick}
            className="w-full flex items-center p-4 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors group"
          >
            <div className="w-8 h-8 mr-4 flex items-center justify-center bg-slate-100 dark:bg-slate-600 rounded-full text-slate-600 dark:text-slate-300">
               <DownloadIcon className="w-5 h-5" />
            </div>
            <div className="text-left">
              <span className="block font-bold text-slate-800 dark:text-slate-100">File .ICS</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">Untuk Apple Calendar & Lainnya</span>
            </div>
          </button>
        </main>
        
        <footer className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t dark:border-slate-700 flex justify-center">
            <button onClick={handleClose} className="text-sm font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                Batal
            </button>
        </footer>
      </div>
    </div>
  );
};

export default CalendarExportModal;
