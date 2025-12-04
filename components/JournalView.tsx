import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Task, Journal, TaskStatus, Expense } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import DownloadIcon from './icons/DownloadIcon';
import SparklesIcon from './icons/SparklesIcon';
import TrashIcon from './icons/TrashIcon';
import { useTheme } from '../contexts/ThemeContext';
import ConfirmationModal from './ConfirmationModal';
import EditIcon from './icons/EditIcon';
import FlowmindIcon from './icons/FlowmindIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import WalletIcon from './icons/WalletIcon';

interface JournalViewProps {
  tasks: Task[];
  journals: Journal[];
  expenses: Expense[];
  createOrUpdateJournal: (
    journalDate: string,
    title: string,
    notes: string,
    completedTasks: { title: string }[],
    pdfBlob: Blob,
    existingPdfPath?: string
  ) => Promise<void>;
  downloadJournal: (path: string) => Promise<void>;
  deleteJournal: (journalId: string, pdfPath: string) => Promise<void>;
}

const getDraftKey = (date: string) => `flowmind-journal-draft-${date}`;

// Helper to get local date string YYYY-MM-DD
const getLocalDateString = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const JournalView: React.FC<JournalViewProps> = ({ tasks, journals, expenses, createOrUpdateJournal, downloadJournal, deleteJournal }) => {
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [journalTitle, setJournalTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [isAiTitleProcessing, setIsAiTitleProcessing] = useState(false);
  const [showAiRefineRetry, setShowAiRefineRetry] = useState(false);
  const [journalToDelete, setJournalToDelete] = useState<Journal | null>(null);
  const [editingJournal, setEditingJournal] = useState<Journal | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const pdfContentRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  const existingJournal = useMemo(() => {
    return journals.find(j => j.journalDate === selectedDate);
  }, [journals, selectedDate]);
  
  const completedTasksForDate = useMemo(() => {
    // Construct local start and end times for the selected day
    const startLocal = new Date(`${selectedDate}T00:00:00`);
    const endLocal = new Date(`${selectedDate}T23:59:59.999`);

    return tasks.filter(task => {
      const taskDate = new Date(task.startTime);
      return task.status === TaskStatus.Done && taskDate >= startLocal && taskDate <= endLocal;
    });
  }, [tasks, selectedDate]);

  const expensesForDate = useMemo(() => {
      const startLocal = new Date(`${selectedDate}T00:00:00`);
      const endLocal = new Date(`${selectedDate}T23:59:59.999`);

      return expenses.filter(expense => {
          const expDate = new Date(expense.date);
          // Filter by date range AND ensure it's an expense (or legacy/undefined type)
          const isExpenseType = expense.type === 'expense' || !expense.type;
          return isExpenseType && expDate >= startLocal && expDate <= endLocal;
      });
  }, [expenses, selectedDate]);

  const incomeForDate = useMemo(() => {
      const startLocal = new Date(`${selectedDate}T00:00:00`);
      const endLocal = new Date(`${selectedDate}T23:59:59.999`);

      return expenses.filter(expense => {
          const expDate = new Date(expense.date);
          return expense.type === 'income' && expDate >= startLocal && expDate <= endLocal;
      });
  }, [expenses, selectedDate]);

  const totalDailyExpenses = useMemo(() => {
      return expensesForDate.reduce((sum, item) => sum + Number(item.amount), 0);
  }, [expensesForDate]);

  const totalDailyIncome = useMemo(() => {
      return incomeForDate.reduce((sum, item) => sum + Number(item.amount), 0);
  }, [incomeForDate]);

  const globalBalance = useMemo(() => {
      const totalInc = expenses
        .filter(e => e.type === 'income')
        .reduce((acc, curr) => acc + Number(curr.amount), 0);
      const totalExp = expenses
        .filter(e => e.type === 'expense' || !e.type)
        .reduce((acc, curr) => acc + Number(curr.amount), 0);
      return totalInc - totalExp;
  }, [expenses]);

  const sortedJournals = useMemo(() => {
    return [...journals].sort((a, b) => new Date(b.journalDate).getTime() - new Date(a.journalDate).getTime());
  }, [journals]);

  useEffect(() => {
    setSaveError(null); // Hapus kesalahan saat tanggal berubah
    if (editingJournal && selectedDate !== editingJournal.journalDate) {
      setEditingJournal(null);
      setNotes('');
      setJournalTitle('');
    } else if (!editingJournal) {
      const journalForDate = journals.find(j => j.journalDate === selectedDate);
      if (journalForDate) {
        setNotes(journalForDate.notes || '');
        setJournalTitle(journalForDate.title || '');
      } else {
        try {
          const draftKey = getDraftKey(selectedDate);
          const savedDraft = localStorage.getItem(draftKey);
          if (savedDraft) {
            const draft = JSON.parse(savedDraft);
            setNotes(draft.notes || '');
            setJournalTitle(draft.title || '');
          } else {
            setNotes('');
            setJournalTitle('');
          }
        } catch (e) {
          console.error("Failed to parse journal draft:", e);
          setNotes('');
          setJournalTitle('');
        }
      }
    }
  }, [selectedDate, journals, editingJournal]);

  useEffect(() => {
    const isNewEntry = !existingJournal && !editingJournal;
    
    if (isNewEntry) {
        const draft = { title: journalTitle, notes };
        localStorage.setItem(getDraftKey(selectedDate), JSON.stringify(draft));
    }
  }, [notes, journalTitle, selectedDate, existingJournal, editingJournal]);
  
  const handleAiRefine = async () => {
    if (!notes.trim() || isAiProcessing) return;
    setIsAiProcessing(true);
    setShowAiRefineRetry(false);
    try {
      const prompt = `Anda adalah seorang editor ahli. Perbaiki dan rapikan teks berikut agar memiliki tata bahasa, koherensi, dan kejelasan yang sangat baik. Jangan mengubah makna atau konteks aslinya. Jaga agar gaya bahasanya tetap sama.
      
      Jika pengguna menyebutkan pengeluaran, referensikan ringkasan keuangan hari ini: Total Pengeluaran Rp ${totalDailyExpenses.toLocaleString('id-ID')}.
      
      Kembalikan hanya teks yang sudah diperbaiki, tanpa penjelasan atau pembukaan apa pun. Teks yang akan diperbaiki:\n\n"${notes}"`;
      
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'gemini-2.5-flash',
            contents: prompt,
        })
      });

      if (!response.ok) {
        throw new Error("AI service returned an error.");
      }

      const data = await response.json();
      const refinedText = data.text;

      if (refinedText) {
        setNotes(refinedText);
      } else {
        throw new Error("AI tidak memberikan respons teks.");
      }
    } catch (error) {
      console.error("Error refining text with AI:", error);
      setShowAiRefineRetry(true);
    } finally {
      setIsAiProcessing(false);
    }
  };

   const handleAiGenerateTitle = async () => {
    if ((completedTasksForDate.length === 0 && !notes.trim()) || isAiTitleProcessing) return;
    setIsAiTitleProcessing(true);
    
    const taskList = completedTasksForDate.map(t => `- ${t.title}`).join('\n');
    const expenseSummary = expensesForDate.length > 0 ? `Pengeluaran: Rp ${totalDailyExpenses}` : "Tidak ada pengeluaran.";
    const incomeSummary = incomeForDate.length > 0 ? `Pemasukan: Rp ${totalDailyIncome}` : "Tidak ada pemasukan.";
    
    const context = `
        Tugas yang Selesai:
        ${taskList || 'Tidak ada.'}
        
        Keuangan:
        ${incomeSummary}
        ${expenseSummary}

        Catatan & Refleksi:
        ${notes || 'Tidak ada.'}
    `;
    const prompt = `Anda adalah seorang asisten yang ahli dalam membuat judul yang ringkas. Berdasarkan ringkasan aktivitas hari berikut, buatlah satu judul jurnal yang singkat, padat, dan jelas dalam Bahasa Indonesia. Judul harus secara langsung mencerminkan tema atau aktivitas utama hari itu (termasuk jika ada pengeluaran/pemasukan besar yang mencolok).

Aturan:
- Jangan gunakan tanda kutip.
- Hindari metafora yang terlalu rumit.
- Kembalikan HANYA judulnya.

Sekarang, buat judul untuk ringkasan berikut:
${context}`;

    try {
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'gemini-2.5-flash',
                contents: prompt,
            })
        });

        if (!response.ok) throw new Error("AI service returned an error.");
        
        const data = await response.json();
        const generatedTitle = data.text.replace(/["*]/g, '').trim();

        if (generatedTitle) {
            setJournalTitle(generatedTitle);
        } else {
            throw new Error("AI did not return a valid title.");
        }
    } catch (error) {
        console.error("Error generating title with AI:", error);
        alert("Gagal membuat judul dengan AI. Silakan coba lagi.");
    } finally {
        setIsAiTitleProcessing(false);
    }
  };

  const handleGenerateAndSave = async () => {
    if (!pdfContentRef.current) return;
    setIsLoading(true);
    setSaveError(null);

    try {
        const canvas = await html2canvas(pdfContentRef.current, {
            scale: 2,
            useCORS: true,
            // FEAT: Selalu gunakan latar belakang putih untuk PDF agar ramah cetak.
            backgroundColor: '#ffffff',
        });
        const imgData = canvas.toDataURL('image/png');
        
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'pt',
            format: 'a4'
        });

        // FEAT: Latar belakang PDF diatur menjadi putih.
        pdf.setFillColor('#ffffff');
        pdf.rect(0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), 'F');

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const canvasAspectRatio = canvasWidth / canvasHeight;
        
        const margin = 40;
        const contentWidth = pdfWidth - margin * 2;
        let contentHeight = contentWidth / canvasAspectRatio;

        if (contentHeight > pdfHeight - margin * 2) {
            contentHeight = pdfHeight - margin * 2;
        }

        pdf.addImage(imgData, 'PNG', margin, margin, contentWidth, contentHeight);
        
        const pdfBlob = pdf.output('blob');
        
        await createOrUpdateJournal(
            selectedDate,
            journalTitle,
            notes,
            completedTasksForDate.map(t => ({ title: t.title })),
            pdfBlob,
            editingJournal?.pdfPath
        );
        
        localStorage.removeItem(getDraftKey(selectedDate));

        if (editingJournal) {
            setEditingJournal(null);
        }
    } catch (error: any) {
        console.error("Error generating or saving PDF:", error);
        setSaveError(error.message || "Gagal membuat atau menyimpan jurnal PDF. Periksa koneksi Anda dan coba lagi.");
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleDownload = async (journal: Journal) => {
    setIsLoading(true);
    try {
        await downloadJournal(journal.pdfPath);
    } catch (error) {
        alert("Gagal mengunduh PDF.");
    } finally {
        setIsLoading(false);
    }
  }

  const handleDeleteJournalRequest = (journal: Journal) => {
    setJournalToDelete(journal);
  };

  const handleConfirmDeleteJournal = async () => {
    if (!journalToDelete) return;
    try {
      setIsLoading(true);
      await deleteJournal(journalToDelete.id, journalToDelete.pdfPath);
      localStorage.removeItem(getDraftKey(journalToDelete.journalDate));
    } catch (error: any) {
      console.error("Failed to delete journal:", error);
      alert(error.message || "Gagal menghapus jurnal.");
    } finally {
      setIsLoading(false);
      setJournalToDelete(null);
    }
  };

  const handleStartEdit = (journal: Journal) => {
    setEditingJournal(journal);
    setSelectedDate(journal.journalDate);
    setJournalTitle(journal.title || '');
    setNotes(journal.notes);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingJournal(null);
    setSelectedDate(getLocalDateString());
  };

  const formattedDate = new Date(selectedDate + 'T00:00:00').toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 dark:text-slate-200">Jurnal Harian</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Refleksikan pekerjaan dan keuangan harian Anda.</p>
      </header>
       {/* PDF Content - Hidden from view, used for generation */}
       <div className="absolute -left-[9999px] -top-[9999px]" aria-hidden="true">
          <div 
            ref={pdfContentRef} 
            style={{
                width: '595px',
                height: '842px',
                padding: '40px',
                fontFamily: 'Inter, sans-serif',
                color: '#1e293b',
                backgroundColor: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '28px', display: 'flex', justifyContent: 'center', color: '#2563eb', marginRight: '8px' }}>
                    <FlowmindIcon className="w-7 h-7" />
                </div>
                <span style={{ fontSize: '16px', fontWeight: 'bold' }}>Jurnal Harian Flowmind</span>
              </div>
              <span style={{ fontSize: '12px', color: '#64748b' }}>{formattedDate}</span>
            </div>
            
            {/* Title */}
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: '32px 0', textAlign: 'center', color: '#0f172a' }}>
              {journalTitle || 'Jurnal Harian'}
            </h1>

            {/* Completed Tasks */}
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                Tugas Selesai
              </h2>
              {completedTasksForDate.length > 0 ? (
                <ul style={{ paddingLeft: '0', listStyle: 'none', fontSize: '14px' }}>
                  {completedTasksForDate.map(task => (
                    <li key={task.id} style={{ marginBottom: '8px', display: 'flex', alignItems: 'center' }}>
                      <div style={{ width: '28px', display: 'flex', justifyContent: 'center', color: '#22c55e', marginRight: '8px', flexShrink: 0 }}>
                        <CheckCircleIcon className="w-4 h-4" />
                      </div>
                      <span>{task.title}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ fontStyle: 'italic', color: '#94a3b8', fontSize: '14px' }}>
                  Tidak ada tugas yang diselesaikan.
                </p>
              )}
            </div>

            {/* Expenses Summary */}
             <div style={{ marginTop: '24px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                Ringkasan Keuangan
              </h2>
              <div style={{ fontSize: '14px', color: '#334155' }}>
                  <p style={{ marginBottom: '4px' }}>Saldo Saat Ini: <strong>Rp {globalBalance.toLocaleString('id-ID')}</strong></p>
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '8px', color: '#64748b', fontSize: '12px' }}>
                      <span>Pemasukan Hari Ini: <span style={{ color: '#16a34a' }}>+ Rp {totalDailyIncome.toLocaleString('id-ID')}</span></span>
                      <span>Pengeluaran Hari Ini: <span style={{ color: '#dc2626' }}>- Rp {totalDailyExpenses.toLocaleString('id-ID')}</span></span>
                  </div>
                  
                  {(expensesForDate.length > 0 || incomeForDate.length > 0) && (
                       <ul style={{ marginTop: '12px', paddingLeft: '16px' }}>
                          {[...incomeForDate, ...expensesForDate].slice(0, 5).map(trx => (
                              <li key={trx.id} style={{ marginBottom: '4px' }}>
                                  <span style={{ color: trx.type === 'income' ? '#16a34a' : '#dc2626', fontWeight: 'bold', marginRight: '6px' }}>
                                      {trx.type === 'income' ? '(+)' : '(-)'}
                                  </span>
                                  {trx.title} (Rp {Number(trx.amount).toLocaleString('id-ID')})
                              </li>
                          ))}
                          {(expensesForDate.length + incomeForDate.length) > 5 && <li>...dan {(expensesForDate.length + incomeForDate.length) - 5} lainnya.</li>}
                       </ul>
                  )}
              </div>
            </div>

            {/* Notes & Reflection */}
            <div style={{ marginTop: '24px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                Catatan & Refleksi
              </h2>
              <div style={{ whiteSpace: 'pre-wrap', color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>
                {notes || <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>Tidak ada catatan.</span>}
              </div>
            </div>
            
            {/* Footer */}
            <div style={{ marginTop: 'auto', textAlign: 'center', fontSize: '10px', color: '#94a3b8', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
              © {new Date().getFullYear()} Flowmind by Aospheree.ai. All rights reserved.
            </div>
          </div>
        </div>

      <div className="mb-6">
        <label htmlFor="journal-date" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
          Pilih Tanggal Jurnal
        </label>
        <input
          type="date"
          id="journal-date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          disabled={!!editingJournal}
          className="p-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200 disabled:opacity-70 disabled:cursor-not-allowed"
        />
      </div>

      <div className="bg-white dark:bg-slate-800 p-4 sm:p-8 rounded-xl shadow-sm">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-200 mb-6">{formattedDate}</h2>

        <div className="mb-6">
            <label htmlFor="journal-title" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Judul Jurnal
            </label>
            <div className="flex items-center space-x-2">
                <input
                    type="text"
                    id="journal-title"
                    value={journalTitle}
                    onChange={e => setJournalTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.currentTarget.blur();
                        handleGenerateAndSave();
                      }
                    }}
                    placeholder={isAiTitleProcessing ? "AI sedang berpikir..." : "Judul jurnal hari ini..."}
                    className="flex-grow p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-400 disabled:opacity-70"
                    readOnly={(!!existingJournal && !editingJournal) || isAiTitleProcessing}
                />
                 {(editingJournal || !existingJournal) && (
                    <button
                        onClick={handleAiGenerateTitle}
                        disabled={isAiTitleProcessing || (completedTasksForDate.length === 0 && !notes.trim())}
                        className="flex-shrink-0 flex items-center p-3 text-sm font-semibold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/50 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Buat judul dengan AI"
                    >
                        <SparklesIcon className="w-5 h-5"/>
                    </button>
                 )}
            </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
                <h3 className="font-semibold text-lg text-slate-700 dark:text-slate-300 mb-3">Tugas Selesai</h3>
                {completedTasksForDate.length > 0 ? (
                    <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-300">
                    {completedTasksForDate.map(task => (
                        <li key={task.id}>{task.title}</li>
                    ))}
                    </ul>
                ) : (
                    <p className="text-slate-500 dark:text-slate-400 italic">Belum ada tugas yang diselesaikan hari ini.</p>
                )}
            </div>
            
            {/* Financial Reconciliation Block */}
            <div>
                <h3 className="font-semibold text-lg text-slate-700 dark:text-slate-300 mb-3 flex items-center">
                    <WalletIcon className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                    Keuangan Hari Ini
                </h3>
                <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
                    <div className="grid grid-cols-1 gap-4 mb-4">
                        {/* FIX: Conditional class to remove bg-blue-100 in dark mode to prevent theme overrides making it too bright */}
                        <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-blue-900/20 border border-blue-800/30' : 'bg-blue-100'}`}>
                            <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">Saldo Total</p>
                            <p className="text-lg font-bold text-slate-800 dark:text-slate-200">Rp {globalBalance.toLocaleString('id-ID')}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                <p className="text-xs font-semibold text-green-700 dark:text-green-300 uppercase tracking-wide">Pemasukan</p>
                                <p className="text-lg font-bold text-slate-800 dark:text-slate-200">+ {totalDailyIncome.toLocaleString('id-ID')}</p>
                            </div>
                            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                                <p className="text-xs font-semibold text-red-700 dark:text-red-300 uppercase tracking-wide">Pengeluaran</p>
                                <p className="text-lg font-bold text-slate-800 dark:text-slate-200">- {totalDailyExpenses.toLocaleString('id-ID')}</p>
                            </div>
                        </div>
                    </div>

                    {(expensesForDate.length > 0 || incomeForDate.length > 0) ? (
                         <div className="mt-3">
                             <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Transaksi Hari Ini</p>
                             <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-1 max-h-32 overflow-y-auto pr-2">
                                {incomeForDate.map(inc => (
                                    <li key={inc.id} className="flex justify-between items-center">
                                        <span className="truncate pr-2 flex items-center"><span className="w-2 h-2 rounded-full bg-green-500 mr-2 flex-shrink-0"></span>{inc.title}</span>
                                        <span className="font-medium text-green-600 dark:text-green-400">+ {Number(inc.amount).toLocaleString('id-ID')}</span>
                                    </li>
                                ))}
                                {expensesForDate.map(exp => (
                                    <li key={exp.id} className="flex justify-between items-center">
                                        <span className="truncate pr-2 flex items-center"><span className="w-2 h-2 rounded-full bg-red-500 mr-2 flex-shrink-0"></span>{exp.title}</span>
                                        <span className="font-medium text-red-600 dark:text-red-400">- {Number(exp.amount).toLocaleString('id-ID')}</span>
                                    </li>
                                ))}
                             </ul>
                         </div>
                    ) : (
                        <p className="text-sm text-slate-400 italic text-center mt-2">Tidak ada transaksi tercatat hari ini.</p>
                    )}
                </div>
            </div>
        </div>
        
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-lg text-slate-700 dark:text-slate-300">Catatan & Refleksi</h3>
            {(editingJournal || !existingJournal) && (
                <button
                    onClick={handleAiRefine}
                    disabled={isAiProcessing || !notes.trim()}
                    className="flex items-center px-3 py-1.5 text-sm font-semibold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/50 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <SparklesIcon className="w-4 h-4 mr-2"/>
                    {isAiProcessing ? 'Memproses...' : 'Rapikan dengan AI'}
                </button>
            )}
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Tulis refleksi Anda tentang hari ini..."
            className="w-full h-48 p-4 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
            readOnly={!!existingJournal && !editingJournal}
          ></textarea>
        </div>

        {saveError && (
            <div className="my-4 p-3 text-sm text-center text-red-800 bg-red-100 rounded-lg dark:bg-red-900/30 dark:text-red-300" role="alert">
              <strong>Gagal Menyimpan:</strong> {saveError}
            </div>
        )}
        <div className="flex justify-end items-center gap-4">
            {editingJournal ? (
                <>
                    <button
                        onClick={handleCancelEdit}
                        disabled={isLoading}
                        className="px-6 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-600 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
                    >
                        Batal Edit
                    </button>
                    <button
                        onClick={handleGenerateAndSave}
                        disabled={isLoading}
                        className="px-6 py-3 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:bg-slate-400"
                    >
                        {isLoading ? 'Memperbarui...' : 'Perbarui Jurnal & PDF'}
                    </button>
                </>
            ) : existingJournal ? (
                 <button
                    onClick={() => handleDownload(existingJournal)}
                    disabled={isLoading}
                    className="flex items-center px-6 py-3 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-sm disabled:bg-slate-400"
                >
                    <DownloadIcon className="w-5 h-5 mr-2" />
                    {isLoading ? 'Mengunduh...' : 'Unduh Jurnal PDF'}
                </button>
            ) : (
                <button
                    onClick={handleGenerateAndSave}
                    disabled={isLoading || (completedTasksForDate.length === 0 && !notes.trim() && !journalTitle.trim())}
                    className="px-6 py-3 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:bg-slate-400 disabled:cursor-not-allowed"
                    title={completedTasksForDate.length === 0 && !notes.trim() ? "Selesaikan tugas atau tulis catatan untuk membuat jurnal." : "Simpan Jurnal"}
                >
                    {isLoading ? 'Menyimpan...' : 'Simpan & Hasilkan PDF'}
                </button>
            )}
        </div>
      </div>
      
      {showAiRefineRetry && (
        <ConfirmationModal
          title="Gagal Merapikan Teks"
          message="AI gagal merapikan teks. Apakah Anda ingin mencoba lagi?"
          confirmText="Coba Lagi"
          onConfirm={handleAiRefine}
          onCancel={() => setShowAiRefineRetry(false)}
          isDestructive={false}
        />
      )}

      {/* Journal History Section */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4">Riwayat Jurnal</h2>
        {sortedJournals.length > 0 ? (
          <div className="space-y-3">
            {sortedJournals.map(journal => (
              <div key={journal.id} className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-3 transition-shadow hover:shadow-md">
                <div>
                  <p className="font-semibold text-slate-700 dark:text-slate-300">{journal.title || 'Jurnal Tanpa Judul'}</p>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {new Date(journal.journalDate + 'T00:00:00').toLocaleDateString('id-ID', {
                        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                    })}
                  </span>
                </div>
                <div className="flex items-center space-x-2 self-end sm:self-center">
                    <button
                      onClick={() => handleStartEdit(journal)}
                      disabled={isLoading}
                      className="p-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 dark:bg-slate-600 dark:text-slate-300 dark:hover:bg-slate-500 transition-colors disabled:opacity-50"
                      aria-label={`Edit jurnal untuk ${journal.journalDate}`}
                      title="Edit Jurnal"
                    >
                        <EditIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDownload(journal)}
                      disabled={isLoading}
                      className="flex items-center px-4 py-2 text-sm font-semibold text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-900/80 transition-colors disabled:opacity-50"
                      aria-label={`Unduh jurnal untuk ${journal.journalDate}`}
                    >
                      <DownloadIcon className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Unduh</span>
                    </button>
                    <button
                        onClick={() => handleDeleteJournalRequest(journal)}
                        disabled={isLoading}
                        className="p-2 text-red-600 bg-red-100 rounded-lg hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900/80 transition-colors disabled:opacity-50"
                        aria-label={`Hapus jurnal untuk ${journal.journalDate}`}
                        title="Hapus Jurnal"
                    >
                        <TrashIcon className="w-5 h-5" />
                    </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm text-center">
            <p className="text-slate-500 dark:text-slate-400 italic">Belum ada riwayat jurnal.</p>
          </div>
        )}
      </div>
      {journalToDelete && (
        <ConfirmationModal
            title="Hapus Jurnal"
            message={`Apakah Anda yakin ingin menghapus jurnal untuk tanggal ${new Date(journalToDelete.journalDate + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}? Tindakan ini tidak dapat diurungkan.`}
            confirmText="Ya, Hapus"
            onConfirm={handleConfirmDeleteJournal}
            onCancel={() => setJournalToDelete(null)}
            isDestructive={true}
        />
      )}
    </div>
  );
};

export default JournalView;