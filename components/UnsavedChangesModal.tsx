
import React, { useState } from 'react';
import XIcon from './icons/XIcon';
import SaveIcon from './icons/SaveIcon'; // Asumsi Anda mungkin ingin ikon, tapi kita pakai teks dulu
import TrashIcon from './icons/TrashIcon';
import FileIcon from './icons/FileIcon';

interface UnsavedChangesModalProps {
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
  onSaveDraft?: () => void; // Opsional, khusus untuk form baru
  hasDraftOption?: boolean;
}

const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({ 
  onSave, 
  onDiscard, 
  onCancel, 
  onSaveDraft,
  hasDraftOption = false 
}) => {
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  const handleAction = (action: () => void) => {
    setIsAnimatingOut(true);
    setTimeout(action, 300);
  };

  return (
    <div className={`fixed inset-0 bg-black flex justify-center items-center z-[150] p-4 transition-opacity duration-300 ${isAnimatingOut ? 'bg-opacity-0' : 'bg-opacity-50'}`} onClick={() => handleAction(onCancel)}>
      <div 
        onClick={(e) => e.stopPropagation()} 
        className={`bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm transition-all duration-300 ease-out overflow-hidden ${isAnimatingOut ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
      >
        <header className="p-5 border-b dark:border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Perubahan Belum Disimpan</h2>
          <button onClick={() => handleAction(onCancel)} className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">
            <XIcon className="w-6 h-6" />
          </button>
        </header>
        
        <main className="p-6">
          <p className="text-slate-600 dark:text-slate-300 text-center mb-6">
            Anda memiliki perubahan yang belum disimpan. Apa yang ingin Anda lakukan?
          </p>
          
          <div className="flex flex-col gap-3">
            <button
              onClick={() => handleAction(onSave)}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-md flex items-center justify-center"
            >
              Simpan Perubahan
            </button>

            {hasDraftOption && onSaveDraft && (
              <button
                onClick={() => handleAction(onSaveDraft)}
                className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition-colors flex items-center justify-center border border-slate-200 dark:border-slate-600"
              >
                <FileIcon className="w-5 h-5 mr-2 text-slate-500 dark:text-slate-400" />
                Simpan sebagai Draft
              </button>
            )}

            <button
              onClick={() => handleAction(onDiscard)}
              className="w-full py-3 px-4 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 font-semibold rounded-xl transition-colors border border-red-100 dark:border-red-800/50"
            >
              Buang Perubahan
            </button>
          </div>
        </main>
        
        <footer className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t dark:border-slate-700 flex justify-center">
            <button 
                onClick={() => handleAction(onCancel)}
                className="text-sm font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            >
                Batal
            </button>
        </footer>
      </div>
    </div>
  );
};

export default UnsavedChangesModal;
