
import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Task, TaskStatus } from '../types';
import ChevronLeftIcon from './icons/ChevronLeftIcon';
import ChevronRightIcon from './icons/ChevronRightIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import ClockIcon from './icons/ClockIcon';
import { useTheme } from '../contexts/ThemeContext';
import { getTasksForDay } from '../utils/taskUtils';
import XIcon from './icons/XIcon';

interface MonthlyViewProps {
  tasks: Task[];
}

const MonthlyView: React.FC<MonthlyViewProps> = ({ tasks }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const { theme, appTheme } = useTheme();

  // Reset selected day when month changes
  useEffect(() => {
    setSelectedDay(null);
  }, [currentDate]);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);

  const getTasksForDayByNumber = (day: number) => {
    const date = new Date(year, month, day);
    return getTasksForDay(date, tasks);
  };

  const tasksForSelectedDay = useMemo(() => {
    if (!selectedDay) return [];
    const date = new Date(year, month, selectedDay);
    return getTasksForDay(date, tasks);
  }, [selectedDay, year, month, tasks]);
  
  const monthTasks = tasks.filter(task => new Date(task.startTime).getMonth() === month && new Date(task.startTime).getFullYear() === year);
  
  const stats = {
    done: monthTasks.filter(t => t.status === TaskStatus.Done).length,
    pending: monthTasks.filter(t => t.status !== TaskStatus.Done).length,
    total: monthTasks.length,
    productivity: monthTasks.length > 0 ? Math.round((monthTasks.filter(t => t.status === TaskStatus.Done).length / monthTasks.length) * 100) : 0,
  };

  const chartData = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dayTasks = getTasksForDayByNumber(day);
      return {
        name: day.toString(),
        selesai: dayTasks.filter(t => t.status === TaskStatus.Done).length,
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, year, month]);

  const changeMonth = (delta: number) => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  // Determine gradient colors based on appTheme - More Striking & Solid
  const getChartColors = () => {
    switch (appTheme) {
      case 'nature': return { start: '#34d399', end: '#10b981', shadow: 'rgba(16, 185, 129, 0.4)' }; // Vivid Emerald
      case 'ocean': return { start: '#22d3ee', end: '#06b6d4', shadow: 'rgba(6, 182, 212, 0.4)' }; // Vivid Cyan
      case 'sunset': return { start: '#fb923c', end: '#f97316', shadow: 'rgba(249, 115, 22, 0.4)' }; // Vivid Orange
      case 'purple': return { start: '#a78bfa', end: '#8b5cf6', shadow: 'rgba(139, 92, 246, 0.4)' }; // Vivid Violet
      case 'pink': return { start: '#f472b6', end: '#ec4899', shadow: 'rgba(236, 72, 153, 0.4)' }; // Vivid Pink
      default: return { start: '#60a5fa', end: '#2563eb', shadow: 'rgba(37, 99, 235, 0.4)' }; // Vivid Blue
    }
  };

  const chartColors = getChartColors();

  const chartTheme = {
    textColor: theme === 'dark' ? '#cbd5e1' : '#64748b', // Lighter text in dark mode for better readability
    gridColor: theme === 'dark' ? '#334155' : '#e2e8f0',
    tooltipBg: theme === 'dark' ? '#1e293b' : '#ffffff',
    tooltipBorder: theme === 'dark' ? '#475569' : '#e2e8f0',
  };

  return (
    <div className="p-4 sm:p-8">
      <header className="flex flex-col sm:flex-row justify-between sm:items-center mb-8 gap-4">
        <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 dark:text-slate-200">Tinjauan Bulanan</h1>
            <p className="text-slate-500 dark:text-slate-200 mt-1">Kalender dan statistik produktivitas.</p>
        </div>
        <div className="flex items-center bg-white dark:bg-slate-800 shadow-sm rounded-lg p-1 self-start sm:self-center border border-slate-200 dark:border-slate-700">
          <button onClick={() => changeMonth(-1)} className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-300"><ChevronLeftIcon className="w-5 h-5"/></button>
          <span className="w-36 sm:w-48 text-center font-bold text-slate-700 dark:text-slate-200 tracking-wide">{currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</span>
          <button onClick={() => changeMonth(1)} className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-300"><ChevronRightIcon className="w-5 h-5"/></button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="grid grid-cols-7 text-center font-bold text-slate-400 dark:text-slate-500 text-xs sm:text-sm mb-4 uppercase tracking-wider">
            {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(day => <div key={day}>{day}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-2 sm:gap-3">
            {blanks.map(b => <div key={`b-${b}`} className="h-20 sm:h-28"></div>)}
            {days.map(day => {
              const dayTasks = getTasksForDayByNumber(day);
              const completedTasks = dayTasks.filter(t => t.status === TaskStatus.Done && !t.id.includes('-projected-'));
              const pendingTasks = dayTasks.filter(t => t.status !== TaskStatus.Done || t.id.includes('-projected-'));
              const today = new Date();
              const isToday = today.getFullYear() === year &&
                              today.getMonth() === month &&
                              today.getDate() === day;
              const isSelected = selectedDay === day;

              // Theme-based active ring color
              const activeRingColor = appTheme === 'nature' ? 'ring-emerald-500' : 
                                      appTheme === 'ocean' ? 'ring-cyan-500' :
                                      appTheme === 'sunset' ? 'ring-orange-500' :
                                      appTheme === 'purple' ? 'ring-violet-500' :
                                      appTheme === 'pink' ? 'ring-pink-500' : 'ring-blue-500';
                                      
              const activeText = appTheme === 'nature' ? 'text-emerald-600 dark:text-emerald-400' : 
                                 appTheme === 'ocean' ? 'text-cyan-600 dark:text-cyan-400' :
                                 appTheme === 'sunset' ? 'text-orange-600 dark:text-orange-400' :
                                 appTheme === 'purple' ? 'text-violet-600 dark:text-violet-400' :
                                 appTheme === 'pink' ? 'text-pink-600 dark:text-pink-400' : 'text-blue-600 dark:text-blue-400';

              const activeBg = appTheme === 'nature' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 
                               appTheme === 'ocean' ? 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800' :
                               appTheme === 'sunset' ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' :
                               appTheme === 'purple' ? 'bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800' :
                               appTheme === 'pink' ? 'bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800' : 'bg-blue-50 dark:bg-slate-800 border-blue-200 dark:border-blue-800';

              return (
                <div 
                  key={day} 
                  onClick={() => setSelectedDay(day)}
                  className={`h-20 sm:h-28 p-2 border rounded-xl flex flex-col transition-all duration-200 cursor-pointer group ${isToday ? `${activeBg} shadow-sm` : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'} ${isSelected ? `ring-2 ${activeRingColor} shadow-md transform scale-[1.02] z-10` : ''}`}
                >
                  <span className={`font-bold text-sm sm:text-base ${isToday ? activeText : 'text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white'}`}>{day}</span>
                  <div className="mt-1 space-y-1 flex-grow overflow-hidden text-xs">
                    {completedTasks.slice(0, 2).map(task => (
                      <div key={task.id} className="hidden sm:flex items-center text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/30 p-1 rounded border border-green-100 dark:border-green-800/50" title={task.title}>
                        <CheckCircleIcon className="w-3 h-3 mr-1.5 flex-shrink-0" />
                        <p className="truncate font-medium">{task.title}</p>
                      </div>
                    ))}
                     {completedTasks.length > 0 && (
                        <div className="sm:hidden flex items-center text-green-600 dark:text-green-400 font-bold">
                             <CheckCircleIcon className="w-3 h-3 mr-1"/>
                             <span>{completedTasks.length}</span>
                        </div>
                    )}
                    
                    {pendingTasks.length > 0 && (
                      <div className="flex items-center text-amber-700 dark:text-amber-400 mt-1 font-medium" title={`${pendingTasks.length} tugas tertunda`}>
                        <ClockIcon className="w-3 h-3 mr-1.5 flex-shrink-0" />
                        <span>{pendingTasks.length}</span>
                      </div>
                    )}

                    {completedTasks.length > 2 && (
                         <div className="text-slate-400 dark:text-slate-500 mt-1 hidden sm:block text-[10px] font-semibold pl-1">
                            + {completedTasks.length - 2} lagi
                        </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar: Selected Day & Stats */}
        <div className="lg:col-span-1 flex flex-col gap-6">
            {selectedDay && (
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 animate-fade-in relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1 h-full ${appTheme === 'nature' ? 'bg-emerald-500' : appTheme === 'sunset' ? 'bg-orange-500' : 'bg-blue-500'}`}></div>
                <div className="flex justify-between items-center mb-4 pl-3">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                    {new Date(year, month, selectedDay).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}
                  </h3>
                  <button onClick={() => setSelectedDay(null)} className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <XIcon className="w-5 h-5" />
                  </button>
                </div>
                {tasksForSelectedDay.length > 0 ? (
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-2 pl-3 custom-scrollbar">
                    {tasksForSelectedDay.map(task => (
                      <div key={task.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 flex items-start gap-3 border border-slate-100 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                        <span className={`w-2.5 h-2.5 mt-1.5 rounded-full flex-shrink-0 ${task.status === TaskStatus.Done ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-slate-300 dark:bg-slate-500'}`}></span>
                        <div>
                          <p className={`font-medium text-sm ${task.status === TaskStatus.Done ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'}`}>{task.title}</p>
                          <div className="flex items-center text-xs text-slate-400 dark:text-slate-400 mt-1 font-medium">
                            <ClockIcon className="w-3 h-3 mr-1.5" />
                            <span>{new Date(task.startTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(/\./g,':')} - {new Date(task.endTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(/\./g,':')}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 pl-3">
                      <p className="text-slate-400 dark:text-slate-500 text-sm">Tidak ada tugas.</p>
                  </div>
                )}
              </div>
            )}

            {/* Statistics Card */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-5">Statistik Bulan Ini</h3>
              <div className="grid grid-cols-2 gap-3 mb-8">
                {/* Total Tasks */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700">
                    <span className="block font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider mb-1">Total Tugas</span>
                    <span className="block font-bold text-slate-800 dark:text-white text-2xl">{stats.total}</span>
                </div>

                {/* Done */}
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30">
                    <span className="block font-semibold text-emerald-600 dark:text-emerald-400 text-xs uppercase tracking-wider mb-1">Selesai</span>
                    <span className="block font-bold text-emerald-700 dark:text-emerald-300 text-2xl">{stats.done}</span>
                </div>

                {/* Pending */}
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30">
                    <span className="block font-semibold text-amber-600 dark:text-amber-400 text-xs uppercase tracking-wider mb-1">Tertunda</span>
                    <span className="block font-bold text-amber-700 dark:text-amber-300 text-2xl">{stats.pending}</span>
                </div>

                {/* Productivity */}
                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30">
                    <span className="block font-semibold text-blue-600 dark:text-blue-400 text-xs uppercase tracking-wider mb-1">Produktivitas</span>
                    <span className="block font-bold text-blue-700 dark:text-blue-300 text-2xl">{stats.productivity}%</span>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center">
                    Grafik Harian
                    <span className="ml-2 h-px flex-grow bg-slate-100 dark:bg-slate-700"></span>
                </h4>
                <div style={{ width: '100%', height: 200 }}>
                    <ResponsiveContainer>
                        <BarChart data={chartData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                            <defs>
                                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={chartColors.start} stopOpacity={1}/>
                                    <stop offset="100%" stopColor={chartColors.end} stopOpacity={0.8}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartTheme.gridColor} strokeOpacity={0.3} />
                            <XAxis 
                                dataKey="name" 
                                fontSize={11} 
                                fontWeight={500}
                                tick={{ fill: chartTheme.textColor, dy: 5 }} 
                                tickLine={false}
                                axisLine={false}
                                interval="preserveStartEnd"
                                minTickGap={5}
                                angle={0}
                            />
                            <YAxis 
                                allowDecimals={false} 
                                fontSize={11} 
                                fontWeight={500}
                                tick={{ fill: chartTheme.textColor, dx: -10 }} 
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip 
                                cursor={{ fill: theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', radius: 4 }}
                                contentStyle={{ 
                                    backgroundColor: chartTheme.tooltipBg,
                                    borderColor: chartTheme.tooltipBorder,
                                    borderRadius: '12px',
                                    fontSize: '12px',
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                    color: chartTheme.textColor,
                                    fontWeight: 600
                                }}
                                itemStyle={{ color: chartColors.start }}
                            />
                            <Bar 
                                dataKey="selesai" 
                                fill="url(#barGradient)" 
                                radius={[4, 4, 0, 0]} 
                                barSize={10}
                                activeBar={{ fill: chartColors.start, strokeWidth: 0 }}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default MonthlyView;
