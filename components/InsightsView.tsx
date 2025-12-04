import React, { useState, useEffect, useMemo } from 'react';
import { Task, Expense, TaskStatus } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import SparklesIcon from './icons/SparklesIcon';
import { useTheme } from '../contexts/ThemeContext';
import LoaderIcon from './icons/LoaderIcon';

interface InsightsViewProps {
  tasks: Task[];
  expenses: Expense[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1'];
const AI_INSIGHT_CACHE_KEY = 'flowmind_ai_insight_cache';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

const InsightsView: React.FC<InsightsViewProps> = ({ tasks, expenses }) => {
  const { theme } = useTheme();
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  // --- Data Calculation for Charts ---

  // 1. Productivity Trend (Last 7 Days)
  const productivityData = useMemo(() => {
    const data = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toDateString();
      
      const dayTasks = tasks.filter(t => new Date(t.startTime).toDateString() === dateStr);
      const completed = dayTasks.filter(t => t.status === TaskStatus.Done).length;
      const total = dayTasks.length;
      
      data.push({
        name: d.toLocaleDateString('id-ID', { weekday: 'short' }),
        selesai: completed,
        total: total,
        rate: total > 0 ? Math.round((completed / total) * 100) : 0
      });
    }
    return data;
  }, [tasks]);

  // 2. Expense Distribution (Current Month)
  const expenseData = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthExpenses = expenses.filter(e => {
      const d = new Date(e.date);
      // Filter only expenses (type is undefined or 'expense')
      const isExpenseType = e.type === 'expense' || !e.type;
      return isExpenseType && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const categoryMap: Record<string, number> = {};
    monthExpenses.forEach(e => {
      const cat = e.category || 'Lainnya';
      categoryMap[cat] = (categoryMap[cat] || 0) + Number(e.amount);
    });

    return Object.keys(categoryMap).map(key => ({
      name: key,
      value: categoryMap[key]
    })).sort((a, b) => b.value - a.value); // Sort highest first
  }, [expenses]);

  // 3. Summary Stats for AI
  const summaryStats = useMemo(() => {
    const totalTasksLast7Days = productivityData.reduce((acc, curr) => acc + curr.total, 0);
    const totalCompletedLast7Days = productivityData.reduce((acc, curr) => acc + curr.selesai, 0);
    const avgProductivity = totalTasksLast7Days > 0 ? Math.round((totalCompletedLast7Days / totalTasksLast7Days) * 100) : 0;
    
    const totalSpentMonth = expenseData.reduce((acc, curr) => acc + curr.value, 0);
    const topExpenseCategory = expenseData.length > 0 ? expenseData[0].name : 'Tidak ada';

    return {
      avgProductivity,
      totalSpentMonth,
      topExpenseCategory,
      completedCount: totalCompletedLast7Days
    };
  }, [productivityData, expenseData]);


  // --- AI Logic ---
  const generateAiInsight = async () => {
    setIsLoadingAi(true);
    try {
      const prompt = `
        Anda adalah konsultan produktivitas dan keuangan pribadi "Flowmind". Analisis data pengguna berikut:
        
        Periode: 7 Hari Terakhir (Produktivitas) & Bulan Ini (Keuangan)
        - Rata-rata Penyelesaian Tugas: ${summaryStats.avgProductivity}% (${summaryStats.completedCount} tugas selesai)
        - Total Pengeluaran Bulan Ini: Rp ${summaryStats.totalSpentMonth.toLocaleString('id-ID')}
        - Kategori Pengeluaran Terbesar: ${summaryStats.topExpenseCategory}

        Tugas Anda:
        1. Temukan korelasi menarik (misalnya: apakah produktivitas rendah berhubungan dengan pengeluaran tinggi di kategori tertentu? atau berikan pujian jika seimbang).
        2. Berikan 1 saran konkret untuk meningkatkan keseimbangan hidup.
        
        Format:
        Berikan respons dalam 2 paragraf singkat. Gunakan Bahasa Indonesia yang natural, cerdas, dan memotivasi. Jangan gunakan markdown list, buat naratif.
      `;

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini-2.0-flash',
          contents: prompt
        })
      });

      if (!response.ok) throw new Error('AI Error');
      const data = await response.json();
      setAiAnalysis(data.text);
      
      // Save to cache
      localStorage.setItem(AI_INSIGHT_CACHE_KEY, JSON.stringify({
        text: data.text,
        timestamp: Date.now()
      }));

    } catch (error) {
      console.error("Gagal membuat insight AI:", error);
      setAiAnalysis("Maaf, Flowie sedang sibuk dan tidak dapat menganalisis data saat ini. Coba lagi nanti.");
    } finally {
      setIsLoadingAi(false);
    }
  };

  // Fetch AI insight on mount or when stats change, respecting cache
  useEffect(() => {
    // 1. Check cache
    const cachedData = localStorage.getItem(AI_INSIGHT_CACHE_KEY);
    let shouldUseCache = false;

    if (cachedData) {
      try {
        const { text, timestamp } = JSON.parse(cachedData);
        if (Date.now() - timestamp < CACHE_DURATION) {
          setAiAnalysis(text);
          shouldUseCache = true;
        }
      } catch (e) {
        console.error("Error parsing cached insight", e);
      }
    }

    // 2. If not cached or expired, and data is available, generate new
    if (!shouldUseCache && !aiAnalysis && !isLoadingAi && (summaryStats.completedCount > 0 || summaryStats.totalSpentMonth > 0)) {
      generateAiInsight();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summaryStats.completedCount, summaryStats.totalSpentMonth]);

  const chartTheme = {
    textColor: theme === 'dark' ? '#e2e8f0' : '#64748b',
    gridColor: theme === 'dark' ? '#334155' : '#e2e8f0',
    tooltipBg: theme === 'dark' ? '#1e293b' : '#ffffff',
    tooltipBorder: theme === 'dark' ? '#334155' : '#e2e8f0',
  };

  // Custom Tooltip for Pie Chart
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      // Recharts usually passes the cell color in payload[0].payload.fill
      const color = data.payload.fill || data.fill || '#3b82f6';
      const percentage = summaryStats.totalSpentMonth > 0 
        ? ((data.value / summaryStats.totalSpentMonth) * 100).toFixed(1) 
        : 0;

      return (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 min-w-[200px]">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full mr-2 shadow-sm ring-2 ring-opacity-50 ring-current" style={{ backgroundColor: color, color: color }}></div>
                    <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">{data.name}</span>
                </div>
            </div>
            <div className="flex flex-col">
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100" style={{ color: theme === 'dark' ? '#f8fafc' : color }}>
                    Rp {Number(data.value).toLocaleString('id-ID')}
                </p>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 flex items-center">
                    <span className="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300 mr-1">{percentage}%</span>
                    dari Pengeluaran
                </p>
            </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 dark:text-slate-200">Flowmind Insights</h1>
        <p className="text-slate-500 dark:text-slate-300 mt-1">Analisis cerdas pola produktivitas dan keuangan Anda.</p>
      </header>

      {/* AI Insight Card */}
      <div className="mb-8 relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 p-[2px] shadow-xl">
        <div className="relative bg-white dark:bg-slate-800 rounded-[14px] p-6 sm:p-8">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg mr-3">
                <SparklesIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Analisis Flowie</h2>
            <button 
                onClick={generateAiInsight} 
                disabled={isLoadingAi}
                className="ml-auto text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
            >
                {isLoadingAi ? 'Menganalisis...' : 'Segarkan Analisis'}
            </button>
          </div>
          
          <div className="prose dark:prose-invert max-w-none">
            {isLoadingAi ? (
                <div className="flex flex-col items-center justify-center py-6">
                    <LoaderIcon className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">Menghubungkan titik-titik data Anda...</p>
                </div>
            ) : (
                <p className="text-slate-600 dark:text-slate-300 text-lg leading-relaxed whitespace-pre-line">
                    {aiAnalysis || "Mulai gunakan Flowmind (selesaikan tugas & catat pengeluaran) untuk melihat analisis cerdas di sini."}
                </p>
            )}
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Productivity Chart */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-6">Tren Produktivitas (7 Hari)</h3>
            <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={productivityData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartTheme.gridColor} />
                        <XAxis dataKey="name" fontSize={12} tick={{ fill: chartTheme.textColor }} />
                        <YAxis fontSize={12} tick={{ fill: chartTheme.textColor }} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: chartTheme.tooltipBg, borderColor: chartTheme.tooltipBorder, color: chartTheme.textColor }}
                            cursor={{fill: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}}
                        />
                        <Bar dataKey="selesai" name="Tugas Selesai" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="total" name="Total Tugas" fill={theme === 'dark' ? '#475569' : '#cbd5e1'} radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Expenses Chart */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-6">Distribusi Pengeluaran (Bulan Ini)</h3>
            {expenseData.length > 0 ? (
                <div className="h-72 w-full flex flex-col items-center">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={expenseData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={0} // Changed to 0 to remove gaps/white lines
                                dataKey="value"
                                stroke="none"
                            >
                                {expenseData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomPieTooltip />} />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="h-72 flex items-center justify-center text-slate-400 italic border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                    Belum ada data pengeluaran bulan ini.
                </div>
            )}
        </div>

      </div>
    </div>
  );
};

export default InsightsView;