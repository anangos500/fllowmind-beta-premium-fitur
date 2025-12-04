import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Expense, Profile, Budget } from '../types';
import PlusIcon from './icons/PlusIcon';
import LoaderIcon from './icons/LoaderIcon';
import TrashIcon from './icons/TrashIcon';
import XIcon from './icons/XIcon';
import AlertTriangleIcon from './icons/AlertTriangleIcon';
import CameraIcon from './icons/CameraIcon';
import ImageIcon from './icons/ImageIcon';
import ArrowRightCircleIcon from './icons/ArrowRightCircleIcon';
import RepeatIcon from './icons/RepeatIcon';
import TargetIcon from './icons/TargetIcon';
import EditIcon from './icons/EditIcon';
import WalletIcon from './icons/WalletIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import { useFinance } from '../hooks/useFinance';
import UnsavedChangesModal from './UnsavedChangesModal';

interface FinanceViewProps {
  expenses: Expense[];
  onAddExpense: (expense: Omit<Expense, 'id' | 'userId' | 'createdAt'>, receiptBlob?: Blob) => Promise<void>;
  onUpdateExpense: (expense: Expense) => Promise<void>;
  onDeleteExpense: (id: string) => Promise<void>;
  isTableMissing?: boolean;
  userProfile: Profile | null;
  onUpdateProfile: (updates: Partial<Omit<Profile, 'id'>>) => Promise<void>;
}

const EXPENSE_CATEGORIES = ['Makanan', 'Transportasi', 'Belanja', 'Tagihan', 'Hiburan', 'Lainnya'];
const INCOME_CATEGORIES = ['Gaji', 'Bonus', 'Penjualan', 'Investasi', 'Hadiah', 'Tabungan', 'Lainnya'];

const toLocalDatetimeString = (dateObj?: Date) => {
    const date = dateObj || new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const formatNumber = (value: string | number): string => {
    if (!value && value !== 0) return '';
    const numStr = typeof value === 'number' ? value.toString() : value;
    return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const unformatNumber = (value: string): string => {
    return value.replace(/\./g, '');
};

// Helper to convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

// --- SUB-COMPONENTS ---

const SetGoalModal: React.FC<{ onClose: () => void; currentGoal: number; onSave: (goal: number) => Promise<void>; title?: string }> = ({ onClose, currentGoal, onSave, title }) => {
    const [amountStr, setAmountStr] = useState(formatNumber(currentGoal));
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleInput = (val: string) => {
        const raw = unformatNumber(val.replace(/\D/g, ''));
        setAmountStr(formatNumber(raw));
    };

    const handleSave = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const val = parseFloat(unformatNumber(amountStr) || '0');
            await onSave(val);
            onClose();
        } catch (err: any) {
            console.error("Failed to save:", err);
            // Handle specific PostgREST error for missing column or table
            if (err.message && (err.message.includes('savings_goal') || err.code === '42703' || err.message.includes('budgets'))) {
                setError("Terjadi kesalahan database. Pastikan tabel/kolom yang diperlukan sudah dibuat.");
            } else {
                setError("Gagal menyimpan. Silakan coba lagi.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[80] p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">{title || 'Target Tabungan'}</h3>
                    <button onClick={onClose} disabled={isLoading}><XIcon className="w-5 h-5 text-slate-500" /></button>
                </div>
                <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Nominal Target (Rp)</label>
                    <input
                        type="text"
                        inputMode="numeric"
                        value={amountStr}
                        onChange={e => handleInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSave();
                            }
                        }}
                        className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white font-bold text-xl"
                        placeholder="0"
                        autoFocus
                        disabled={isLoading}
                    />
                    {error && (
                        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start">
                            <AlertTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400 mr-2 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
                        </div>
                    )}
                </div>
                <button 
                    onClick={handleSave} 
                    disabled={isLoading}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-bold rounded-lg transition-colors shadow-md flex justify-center items-center"
                >
                    {isLoading ? <LoaderIcon className="w-5 h-5 animate-spin" /> : 'Simpan'}
                </button>
            </div>
        </div>
    );
};

const ScanResultPopup: React.FC<{ status: 'success' | 'error', message: string, onClose: () => void, onRetry?: () => void }> = ({ status, message, onClose, onRetry }) => {
    useEffect(() => {
        if (status === 'success') {
            const t = setTimeout(onClose, 3000);
            return () => clearTimeout(t);
        }
    }, [status, onClose]);

    const isSuccess = status === 'success';

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
            <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-xs w-full text-center transform transition-all scale-100 relative overflow-hidden border ${isSuccess ? 'border-green-100 dark:border-green-900' : 'border-red-100 dark:border-red-900'}`}>
                <div className={`absolute top-0 left-0 w-full h-1.5 ${isSuccess ? 'bg-green-500' : 'bg-red-500'}`}></div>
                
                <div className="flex justify-center mb-4 mt-2">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isSuccess ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {isSuccess ? <CheckCircleIcon className="w-8 h-8" /> : <AlertTriangleIcon className="w-8 h-8" />}
                    </div>
                </div>
                
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                    {isSuccess ? 'Scan Berhasil' : 'Scan Gagal'}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-300 mb-6 leading-relaxed">
                    {message}
                </p>

                <div className="space-y-3">
                    {!isSuccess && onRetry && (
                        <button 
                            onClick={onRetry}
                            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors"
                        >
                            Coba Lagi
                        </button>
                    )}
                    <button 
                        onClick={onClose}
                        className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-colors ${!isSuccess ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                    >
                        {isSuccess ? 'Oke' : 'Tutup'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const FinanceView: React.FC<FinanceViewProps> = ({ expenses, onAddExpense, onUpdateExpense, onDeleteExpense, isTableMissing, userProfile, onUpdateProfile }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(''); // Default kosong agar user wajib pilih
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [date, setDate] = useState(toLocalDatetimeString());
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceInterval, setRecurrenceInterval] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isSavingsDeposit, setIsSavingsDeposit] = useState(false); // Opsi "Setor ke Tabungan"
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  
  // Budgeting State
  const { budgets, saveBudget } = useFinance();
  const [budgetCategoryToEdit, setBudgetCategoryToEdit] = useState<{ category: string, currentAmount: number } | null>(null);

  // AI & Camera State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  
  // New Camera Preview States
  const [capturedImageBlob, setCapturedImageBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // New Scan Result States
  const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [scanMessage, setScanMessage] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // --- CALCULATIONS ---

  const totalIncome = expenses.filter(e => e.type === 'income').reduce((acc, curr) => acc + Number(curr.amount), 0);
  const totalExpense = expenses.filter(e => e.type === 'expense' || !e.type).reduce((acc, curr) => acc + Number(curr.amount), 0);
  
  // Total Net Worth (Semua uang)
  const totalBalance = totalIncome - totalExpense;
  
  // Hitung Saldo Tabungan (Hanya pemasukan dengan kategori 'Tabungan')
  const savingsIncome = expenses.filter(e => e.type === 'income' && e.category === 'Tabungan').reduce((acc, curr) => acc + Number(curr.amount), 0);
  const savingsExpense = expenses.filter(e => (e.type === 'expense' || !e.type) && e.category === 'Tabungan').reduce((acc, curr) => acc + Number(curr.amount), 0);
  const currentSavings = savingsIncome - savingsExpense;

  const savingsGoal = userProfile?.savingsGoal || 0;
  
  // Progress dihitung berdasarkan Saldo Tabungan Spesifik vs Target
  const savingsProgress = savingsGoal > 0 ? Math.min(100, Math.max(0, (currentSavings / savingsGoal) * 100)) : 0;

  // --- BUDGET CALCULATIONS ---
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const categorySpending = expenses
    .filter(e => (e.type === 'expense' || !e.type))
    .filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((acc, curr) => {
        const cat = curr.category || 'Lainnya';
        acc[cat] = (acc[cat] || 0) + Number(curr.amount);
        return acc;
    }, {} as Record<string, number>);

  // --- HANDLERS ---

  // Cleanup stream when component unmounts
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const attemptCloseModal = () => {
      const isDirty = title.trim().length > 0 || amount.trim().length > 0;
      if (isDirty) {
          setShowUnsavedModal(true);
      } else {
          setIsModalOpen(false);
      }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
          attemptCloseModal();
      }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      const rawAmount = parseFloat(unformatNumber(amount));
      
      // Pastikan kategori terpilih (tidak string kosong)
      // Jika checkbox "Setor ke Tabungan" dicentang, paksa kategori jadi 'Tabungan'
      const finalCategory = (type === 'income' && isSavingsDeposit) ? 'Tabungan' : category;

      if (!title || isNaN(rawAmount) || rawAmount === 0 || !finalCategory) {
          return; // Validasi HTML required di select akan menghandle UI feedback untuk kategori
      }

      await onAddExpense({
          title, 
          amount: rawAmount, 
          category: finalCategory, 
          date: new Date(date).toISOString(), 
          type, 
          isRecurring, 
          recurrenceInterval: isRecurring ? recurrenceInterval : undefined
      });
      
      // Reset
      setIsModalOpen(false); 
      setTitle(''); 
      setAmount('');
      setIsSavingsDeposit(false);
      setCategory(''); // Reset ke kosong
  };

  const handleDiscard = () => {
      setIsModalOpen(false);
      setTitle('');
      setAmount('');
      setIsSavingsDeposit(false);
      setCategory('');
  };

  const handleUpdateGoal = async (newGoal: number) => {
      await onUpdateProfile({ savingsGoal: newGoal });
  };
  
  const handleSaveBudget = async (newBudget: number) => {
      if (budgetCategoryToEdit) {
          await saveBudget(budgetCategoryToEdit.category, newBudget);
          setBudgetCategoryToEdit(null);
      }
  };

  // --- AI & CAMERA LOGIC ---

  const startCamera = async () => {
    try {
      setIsVideoReady(false);
      setCapturedImageBlob(null);
      setPreviewUrl(null);
      setScanStatus('idle');

      // 1. Akses Hardware Kamera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Kamera belakang
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      streamRef.current = stream;
      setIsCameraOpen(true);
      
      // 2. Tampilkan Stream Video
      // Tunggu render modal
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      console.error("Gagal mengakses kamera:", err);
      setScanStatus('error');
      setScanMessage("Gagal mengakses kamera. Pastikan izin diberikan.");
    }
  };

  const stopStreamOnly = () => {
      if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
      }
      setIsVideoReady(false);
  };

  const closeCameraModal = () => {
    stopStreamOnly();
    setIsCameraOpen(false);
    setCapturedImageBlob(null);
    if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
    }
  };

  const captureImage = () => {
    if (!videoRef.current || !isVideoReady) return;

    const video = videoRef.current;
    
    // Ensure video has dimensions before capturing
    if (video.videoWidth === 0 || video.videoHeight === 0) {
        return;
    }

    // 3. Menangkap Gambar (Capture)
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // 4. Konversi Data
      canvas.toBlob((blob) => {
        if (blob) {
          // Simpan blob dan buat preview URL
          setCapturedImageBlob(blob);
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
          
          // Hentikan stream video agar hemat baterai saat preview
          stopStreamOnly();
        }
      }, 'image/jpeg', 0.92);
    }
  };
  
  const handleRetake = () => {
      // Bersihkan preview
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setCapturedImageBlob(null);
      
      // Mulai ulang kamera (tanpa menutup modal penuh)
      // Reuse logic from startCamera but simplified since modal is open
      setIsVideoReady(false);
      navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      }).then(stream => {
          streamRef.current = stream;
          if (videoRef.current) {
              videoRef.current.srcObject = stream;
          }
      }).catch(err => {
          console.error("Restart camera error:", err);
          setScanStatus('error');
          setScanMessage("Gagal memulai ulang kamera.");
      });
  };

  const handleConfirmScan = () => {
      if (capturedImageBlob) {
          const file = new File([capturedImageBlob], "receipt.jpg", { type: "image/jpeg" });
          processFile(file);
          closeCameraModal(); // Tutup modal kamera, proses berjalan di background dengan loading indicator di form utama
      }
  };
  
  // Refactored analysis logic to be reusable for both file input and camera
  const processFile = async (file: File) => {
      setIsAnalyzing(true);
      setScanStatus('idle'); // Reset status

      try {
          const base64String = await fileToBase64(file);
          const base64Data = base64String.split(',')[1];

          const prompt = `Analisis gambar struk/bukti transaksi ini. Ekstrak informasi berikut dalam format JSON:
          1. title: Nama toko atau deskripsi singkat transaksi.
          2. amount: Total nominal (hanya angka).
          3. date: Tanggal transaksi (format ISO String). Jika tidak ada tahun, asumsikan tahun ini. Jika tidak ada tanggal, gunakan null.
          4. category: Pilih satu yang paling cocok dari: [${[...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].join(', ')}].
          5. type: 'expense' atau 'income'.
          
          Jika gambar buram, tidak terbaca, atau bukan struk, kembalikan JSON dengan field "error": "alasan error".
          `;

          const response = await fetch('/api/gemini', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  model: 'gemini-2.5-flash',
                  contents: [
                      {
                          parts: [
                              { text: prompt },
                              { inlineData: { mimeType: file.type, data: base64Data } }
                          ]
                      }
                  ]
              })
          });

          if (!response.ok) throw new Error("Gagal menghubungi server AI.");

          const data = await response.json();
          const textResponse = data.text;
          
          const jsonMatch = textResponse.match(/```json\n([\s\S]*?)\n```/) || textResponse.match(/{[\s\S]*}/);
          
          if (jsonMatch) {
              const jsonStr = jsonMatch[1] || jsonMatch[0];
              const result = JSON.parse(jsonStr);
              
              if (result.error) {
                  // AI mendeteksi error spesifik
                  throw new Error(result.error === "alasan error" ? "Struk tidak terbaca atau tidak valid." : result.error);
              }

              if (result.title) setTitle(result.title);
              if (result.amount) setAmount(formatNumber(result.amount));
              if (result.category) setCategory(result.category);
              if (result.type) {
                  setType(result.type.toLowerCase());
                  if (result.type.toLowerCase() === 'expense') setIsSavingsDeposit(false);
              }
              if (result.date) {
                  const detectedDate = new Date(result.date);
                  if (!isNaN(detectedDate.getTime())) {
                      setDate(toLocalDatetimeString(detectedDate));
                  }
              }
              
              // SUKSES
              setScanStatus('success');
              setScanMessage("Struk berhasil dipindai. Data telah diisi otomatis.");

          } else {
              throw new Error("Format data tidak dikenali. Pastikan foto struk jelas.");
          }

      } catch (error: any) {
          console.error("Error analyzing receipt:", error);
          setScanStatus('error');
          // Coba tangkap jenis error umum
          let friendlyMsg = "Gagal memproses struk.";
          if (error.message.includes("buram") || error.message.includes("blur")) {
              friendlyMsg = "Struk terlalu buram. Harap foto ulang dengan fokus yang lebih baik.";
          } else if (error.message.includes("tidak terbaca")) {
              friendlyMsg = "Teks tidak terbaca. Pastikan pencahayaan cukup terang.";
          } else {
              friendlyMsg = error.message || "Terjadi kesalahan saat analisis.";
          }
          setScanMessage(friendlyMsg);
      } finally {
          setIsAnalyzing(false);
      }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          await processFile(file);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };


  if (isTableMissing) return <div className="p-8 text-center">Tabel database belum siap. Silakan jalankan migrasi SQL.</div>;

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto pb-24">
      <header className="mb-6 sm:mb-8 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 dark:text-slate-200">Keuangan</h1>
            <p className="text-slate-500 dark:text-slate-300 mt-1">Kelola aset dan tabungan Anda.</p>
        </div>
      </header>

      {/* --- SPLIT DASHBOARD --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        
        {/* 1. KARTU TOTAL SALDO (Main Balance) */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[180px]">
            {/* Deco */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
            
            <div className="relative z-10">
                <p className="text-blue-100 text-sm font-semibold mb-1 flex items-center opacity-90">
                    <WalletIcon className="w-4 h-4 mr-2" />
                    Total Aset Bersih
                </p>
                <h2 className="text-4xl font-extrabold tracking-tight mt-2 text-white drop-shadow-sm">
                    Rp {formatNumber(totalBalance)}
                </h2>
            </div>
            
            {/* Mini Stats inside Main Card */}
            <div className="relative z-10 mt-6 grid grid-cols-2 gap-3">
                 <div className="px-3 py-2 bg-emerald-400/20 rounded-lg backdrop-blur-sm border border-white/10 text-xs sm:text-sm">
                    <p className="text-emerald-200 mb-0.5">Pemasukan</p>
                    <span className="font-bold text-white">Rp {formatNumber(totalIncome)}</span>
                 </div>
                 <div className="px-3 py-2 bg-rose-400/20 rounded-lg backdrop-blur-sm border border-white/10 text-xs sm:text-sm">
                    <p className="text-rose-200 mb-0.5">Pengeluaran</p>
                    <span className="font-bold text-white">Rp {formatNumber(totalExpense)}</span>
                 </div>
            </div>
        </div>

        {/* 2. KARTU SALDO TABUNGAN (Savings Fund) */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col justify-between relative min-h-[180px]">
             <div>
                <div className="flex justify-between items-start mb-2">
                    <p className="text-emerald-600 dark:text-emerald-400 text-sm font-bold uppercase tracking-wide flex items-center">
                        <TargetIcon className="w-4 h-4 mr-2" />
                        Saldo Tabungan
                    </p>
                    <button 
                        onClick={() => setIsGoalModalOpen(true)} 
                        className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
                        title="Ubah Target Tabungan"
                    >
                        <EditIcon className="w-4 h-4" />
                    </button>
                </div>
                
                <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-4">
                    Rp {formatNumber(currentSavings)}
                </h2>
                
                {/* Progress Bar khusus Tabungan */}
                <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">
                        {savingsProgress.toFixed(0)}% Tercapai
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                        Goal: Rp {formatNumber(savingsGoal)}
                    </span>
                </div>
                <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                        className={`h-full rounded-full transition-all duration-1000 ease-out ${savingsProgress >= 100 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : 'bg-emerald-500'}`}
                        style={{ width: `${savingsProgress}%` }}
                    ></div>
                </div>
             </div>
             
             <div className="mt-3">
                 {savingsProgress >= 100 ? (
                     <p className="text-xs font-bold text-orange-500 flex items-center">
                         <span className="mr-1">🎉</span> Selamat! Target tercapai.
                     </p>
                 ) : (
                     <p className="text-xs text-slate-400 dark:text-slate-500">
                         Butuh <span className="font-semibold text-slate-600 dark:text-slate-300">Rp {formatNumber(Math.max(0, savingsGoal - currentSavings))}</span> lagi untuk mencapai target.
                     </p>
                 )}
             </div>
        </div>
      </div>

      <button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto px-6 py-3 mb-8 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md flex items-center justify-center transition-colors transform hover:scale-105 active:scale-95 duration-200">
          <PlusIcon className="w-5 h-5 mr-2" /> Tambah Transaksi
      </button>

      {/* BUDGETING PER CATEGORY SECTION (COMPACT GRID) */}
      <div className="mb-8">
          <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200 mb-4 flex items-center">
              Anggaran Bulanan
              <span className="ml-3 px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[10px] text-slate-500 dark:text-slate-400 font-normal uppercase tracking-wider">
                  {new Date().toLocaleDateString('id-ID', { month: 'long' })}
              </span>
          </h3>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {EXPENSE_CATEGORIES.map(cat => {
                  const limit = budgets?.find(b => b.category === cat)?.amount || 0;
                  const spent = categorySpending[cat] || 0;
                  const percent = limit > 0 ? (spent / limit) * 100 : (spent > 0 ? 100 : 0);
                  const isOver = spent > limit && limit > 0;

                  return (
                      <div 
                          key={cat} 
                          onClick={() => setBudgetCategoryToEdit({ category: cat, currentAmount: limit })}
                          className={`relative h-24 rounded-2xl p-4 flex flex-col justify-between overflow-hidden cursor-pointer transition-all hover:scale-[1.02] ${
                              limit > 0 
                              ? 'bg-slate-700/50 dark:bg-slate-800/50 text-white shadow-sm border border-slate-600/30 backdrop-blur-sm' 
                              : 'bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 border-2 border-dashed border-slate-300 dark:border-slate-700'
                          }`}
                      >
                          {/* Header */}
                          <div className="flex justify-between items-start relative z-10">
                              <span className="font-bold text-sm tracking-wide">{cat}</span>
                              {isOver && <AlertTriangleIcon className="w-4 h-4 text-red-500 animate-pulse" />}
                          </div>

                          {/* Progress Visuals */}
                          {limit > 0 ? (
                              <div className="w-full relative z-10">
                                  <div className="flex justify-between items-end text-[10px] opacity-80 mb-1.5 font-medium">
                                      <span>{Math.round(percent)}%</span>
                                      <span>{isOver ? 'Over' : 'Sisa'} {formatNumber(Math.abs(limit - spent))}</span>
                                  </div>
                                  {/* Progress Bar Track */}
                                  <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
                                      {/* Progress Bar Fill */}
                                      <div 
                                          className={`h-full rounded-full transition-all duration-1000 ${isOver ? 'bg-red-500' : 'bg-white'}`}
                                          style={{ width: `${Math.min(100, percent)}%` }}
                                      ></div>
                                  </div>
                              </div>
                          ) : (
                              <div className="flex items-center justify-center h-full opacity-60">
                                  <span className="text-xs font-medium flex items-center gap-1">
                                      <PlusIcon className="w-3 h-3" /> Set Budget
                                  </span>
                              </div>
                          )}
                      </div>
                  );
              })}
          </div>
      </div>

      {/* Transaction History List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden border border-slate-100 dark:border-slate-700">
         <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
             <h3 className="font-bold text-slate-700 dark:text-slate-300">Riwayat Transaksi</h3>
         </div>
         {expenses.length > 0 ? (
             <div className="divide-y divide-slate-100 dark:divide-slate-700">
                 {expenses.map(expense => (
                    <div key={expense.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-full flex-shrink-0 ${
                                expense.category === 'Tabungan' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' :
                                expense.type === 'income' ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-red-100 dark:bg-red-900/30 text-red-600'
                            }`}>
                                {expense.category === 'Tabungan' ? <TargetIcon className="w-5 h-5"/> : <span className="font-bold text-xs">{expense.category ? expense.category.substring(0, 2).toUpperCase() : '??'}</span>}
                            </div>
                            <div className="min-w-0">
                                <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{expense.title}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center">
                                    {new Date(expense.date).toLocaleDateString()} • {expense.category}
                                    {expense.category === 'Tabungan' && <span className="ml-2 px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-[10px] rounded font-bold">SAVINGS</span>}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 flex-shrink-0 ml-2">
                            <p className={`font-bold whitespace-nowrap ${expense.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                {expense.type === 'income' ? '+' : '-'} Rp {formatNumber(expense.amount)}
                            </p>
                            <button onClick={() => onDeleteExpense(expense.id)} className="text-slate-400 hover:text-red-500 transition-colors p-1"><TrashIcon className="w-5 h-5" /></button>
                        </div>
                    </div>
                 ))}
             </div>
         ) : <div className="p-8 text-center text-slate-500 italic">Belum ada transaksi tercatat.</div>}
      </div>

      {/* Add Transaction Modal */}
      {isModalOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4 lg:pl-64" 
            onClick={handleOverlayClick}
          >
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between mb-4">
                      <h3 className="font-bold text-lg text-slate-800 dark:text-white">Tambah Transaksi</h3>
                      <button onClick={attemptCloseModal} className="text-slate-500 hover:text-slate-800 dark:hover:text-white">
                          <XIcon className="w-6 h-6" />
                      </button>
                  </div>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                          <button 
                            type="button" 
                            onClick={() => { setType('expense'); setIsSavingsDeposit(false); setCategory(''); }} 
                            className={`flex-1 py-2 rounded-md font-semibold text-sm transition-all ${type === 'expense' ? 'bg-red-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                          >
                              Pengeluaran
                          </button>
                          <button 
                            type="button" 
                            onClick={() => { setType('income'); setCategory(''); }} 
                            className={`flex-1 py-2 rounded-md font-semibold text-sm transition-all ${type === 'income' ? 'bg-green-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                          >
                              Pemasukan
                          </button>
                      </div>

                      {/* AI Camera Scan Button */}
                      <div className="mb-4 mt-4">
                          <input 
                              type="file" 
                              ref={fileInputRef} 
                              accept="image/*" 
                              className="hidden" 
                              onChange={handleFileChange}
                          />
                          <button 
                              type="button"
                              onClick={startCamera}
                              disabled={isAnalyzing}
                              className="w-full py-3 bg-gradient-to-r from-orange-500 to-yellow-500 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait"
                          >
                              {isAnalyzing ? (
                                  <>
                                    <LoaderIcon className="w-5 h-5 animate-spin" />
                                    Menganalisis Struk...
                                  </>
                              ) : (
                                  <>
                                    <CameraIcon className="w-5 h-5" />
                                    Scan Struk dengan AI
                                  </>
                              )}
                          </button>
                          <p className="text-xs text-center text-slate-400 mt-2 cursor-pointer hover:underline" onClick={() => fileInputRef.current?.click()}>
                              atau upload file gambar
                          </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Judul</label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder={type === 'income' ? "Contoh: Setor Tabungan Juli" : "Contoh: Makan Siang"} className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200" required />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Jumlah (Rp)</label>
                        <input type="text" inputMode="numeric" value={amount} onChange={e => setAmount(formatNumber(unformatNumber(e.target.value.replace(/\D/g, ''))))} placeholder="0" className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200 font-bold" required />
                      </div>

                      {/* Opsi Khusus Tabungan untuk Pemasukan */}
                      {type === 'income' && (
                          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-lg">
                              <label className="flex items-center cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    checked={isSavingsDeposit} 
                                    onChange={e => {
                                        setIsSavingsDeposit(e.target.checked);
                                        if(e.target.checked) setCategory('Tabungan');
                                        else setCategory('');
                                    }}
                                    className="w-5 h-5 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                                  />
                                  <span className="ml-2 text-sm font-bold text-emerald-700 dark:text-emerald-400">Setor ke Saldo Tabungan?</span>
                              </label>
                              <p className="text-xs text-emerald-600/80 dark:text-emerald-500/80 mt-1 ml-7">
                                  Uang ini akan ditambahkan ke kartu "Saldo Tabungan" dan dihitung dalam target goal.
                              </p>
                          </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Kategori</label>
                            <select 
                                value={category} 
                                onChange={e => setCategory(e.target.value)} 
                                disabled={isSavingsDeposit} // Kunci kategori jika mode tabungan aktif
                                required
                                className={`w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 ${isSavingsDeposit ? 'opacity-70 cursor-not-allowed bg-slate-100' : ''}`}
                            >
                                <option value="" disabled>Pilih Kategori</option>
                                {(type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Tanggal</label>
                            <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200" />
                          </div>
                      </div>
                      
                      <button type="submit" className={`w-full py-3 text-white font-bold rounded-lg shadow-md transition-colors ${type === 'income' ? (isSavingsDeposit ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-green-600 hover:bg-green-700') : 'bg-blue-600 hover:bg-blue-700'}`}>
                          {type === 'income' ? (isSavingsDeposit ? 'Simpan ke Tabungan' : 'Simpan Pemasukan') : 'Simpan Pengeluaran'}
                      </button>
                  </form>
              </div>
          </div>
      )}

      {/* Camera Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 bg-slate-900/90 z-[1000] flex items-center justify-center sm:p-4 backdrop-blur-sm transition-all duration-300">
            
            {/* Desktop Portrait Container (resembles phone) */}
            <div className="relative w-full h-[100dvh] sm:w-[380px] sm:h-[700px] sm:max-h-[90vh] bg-black rounded-none sm:rounded-[2.5rem] overflow-hidden shadow-[0_0_0_10px_rgba(30,41,59,0.5)] ring-0 sm:ring-[1px] ring-slate-700 flex flex-col">
                
                {/* Video Feed or Preview */}
                <div className="absolute inset-0 w-full h-full bg-black">
                    {previewUrl ? (
                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                        <video 
                            ref={videoRef} 
                            autoPlay 
                            playsInline 
                            muted 
                            onLoadedMetadata={() => setIsVideoReady(true)}
                            className="w-full h-full object-cover"
                        ></video>
                    )}
                </div>
                
                {/* Overlay UI Layer */}
                <div className="absolute inset-0 z-20 flex flex-col justify-between pointer-events-none">
                    {/* Header / Top Bar */}
                    <div className="w-full px-6 pt-[max(3rem,env(safe-area-inset-top))] sm:pt-8 pb-4 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-start pointer-events-auto">
                         {/* Close Button (Top Left) */}
                        <button 
                            onClick={closeCameraModal} 
                            className="p-3 rounded-full bg-black/40 text-white backdrop-blur-md border border-white/10 hover:bg-white/20 transition-all active:scale-95 z-50"
                            aria-label="Tutup Kamera"
                        >
                            <XIcon className="w-6 h-6" />
                        </button>

                        {!previewUrl && (
                            <div className="bg-black/50 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 shadow-lg mt-1">
                                <p className="text-white text-[10px] font-bold tracking-widest drop-shadow-md flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
                                    REC
                                </p>
                            </div>
                        )}
                        
                        {/* Placeholder for symmetry */}
                        <div className="w-12"></div>
                    </div>

                    {/* Center Viewfinder - Only show in camera mode */}
                    {!previewUrl && (
                        <div className="flex-1 flex flex-col items-center justify-center px-8">
                            <div className="relative w-full max-w-[280px] aspect-[3/4] rounded-[2rem] shadow-[0_0_0_9999px_rgba(0,0,0,0.75)] overflow-hidden border-2 border-white/30">
                                {/* Corner Brackets */}
                                <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-blue-500 rounded-tl-[1.8rem] shadow-sm opacity-80"></div>
                                <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-blue-500 rounded-tr-[1.8rem] shadow-sm opacity-80"></div>
                                <div className="absolute bottom-0 left-0 w-16 h-16 border-b-4 border-l-4 border-blue-500 rounded-bl-[1.8rem] shadow-sm opacity-80"></div>
                                <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-blue-500 rounded-br-[1.8rem] shadow-sm opacity-80"></div>

                                {/* Scanning Laser */}
                                <div className="absolute left-0 right-0 h-0.5 bg-blue-400/80 shadow-[0_0_15px_rgba(96,165,250,0.8)] animate-scan top-[10%]"></div>
                                
                                {/* Grid Lines */}
                                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-30">
                                    <div className="border-r border-white/30"></div>
                                    <div className="border-r border-white/30"></div>
                                    <div></div>
                                    <div className="border-t border-white/30 col-span-3 row-start-2"></div>
                                    <div className="border-t border-white/30 col-span-3 row-start-3"></div>
                                </div>
                            </div>
                            <p className="mt-8 text-white/90 text-sm font-medium text-center max-w-[85%] drop-shadow-lg bg-black/30 px-4 py-2 rounded-lg backdrop-blur-sm">
                                Posisikan struk di dalam kotak
                            </p>
                        </div>
                    )}

                    {/* Preview Mode Controls */}
                    {previewUrl && (
                        <div className="flex-1 flex flex-col items-center justify-end pb-20 pointer-events-auto px-6 w-full">
                            <div className="w-full bg-black/40 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-2xl">
                                <p className="text-white text-center mb-6 font-medium text-lg">Apakah foto struk ini sudah jelas?</p>
                                <div className="flex gap-4">
                                    <button 
                                        onClick={handleRetake}
                                        className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-colors"
                                    >
                                        Ulangi
                                    </button>
                                    <button 
                                        onClick={handleConfirmScan}
                                        className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-colors shadow-lg shadow-blue-900/20"
                                    >
                                        Lanjutkan
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Bottom Controls - Only in camera mode */}
                    {!previewUrl && (
                        <div className="w-full px-8 pb-[max(3rem,env(safe-area-inset-bottom))] sm:pb-10 pt-8 flex justify-center items-center bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-auto z-50">
                            {/* Shutter Button */}
                            <button 
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    captureImage();
                                }} 
                                disabled={!isVideoReady}
                                className={`relative w-20 h-20 rounded-full border-[4px] border-white/80 flex items-center justify-center transition-all duration-300 shadow-2xl group touch-manipulation ${isVideoReady ? 'hover:scale-105 active:scale-95 cursor-pointer hover:border-white' : 'opacity-50 cursor-wait'}`}
                                aria-label="Ambil Foto"
                            >
                                <div className="w-16 h-16 bg-white rounded-full shadow-inner group-active:scale-90 transition-transform duration-200"></div>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* Scan Result Popups */}
      {scanStatus !== 'idle' && (
          <ScanResultPopup 
            status={scanStatus as 'success' | 'error'}
            message={scanMessage}
            onClose={() => setScanStatus('idle')}
            onRetry={handleRetake}
          />
      )}

      {isGoalModalOpen && <SetGoalModal onClose={() => setIsGoalModalOpen(false)} currentGoal={savingsGoal} onSave={handleUpdateGoal} />}
      
      {budgetCategoryToEdit && (
          <SetGoalModal 
            onClose={() => setBudgetCategoryToEdit(null)} 
            currentGoal={budgetCategoryToEdit.currentAmount} 
            onSave={handleSaveBudget}
            title={`Budget ${budgetCategoryToEdit.category}`}
          />
      )}
      
      {showUnsavedModal && (
          <UnsavedChangesModal
            onSave={() => handleSubmit()}
            onDiscard={handleDiscard}
            onCancel={() => setShowUnsavedModal(false)}
            hasDraftOption={false}
          />
      )}
    </div>
  );
};

export default FinanceView;