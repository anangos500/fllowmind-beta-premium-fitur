
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useFocusTimer } from '../contexts/FocusTimerContext';
import StopCircleIcon from './icons/StopCircleIcon';
import MinimizeIcon from './icons/MinimizeIcon';
import PlayIcon from './icons/PlayIcon';
import MaximizeIcon from './icons/MaximizeIcon';
import ClockIcon from './icons/ClockIcon';
import FireIcon from './icons/FireIcon'; // Import FireIcon

// Simple Pause Icon component
const SimplePauseIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" />
    </svg>
);

interface FocusModeProps {
    streak?: number;
}

const FocusMode: React.FC<FocusModeProps> = ({ streak = 0 }) => {
  const {
    task,
    timeLeft,
    isActive,
    pomodoroState,
    stopFocusSession,
    pauseTimer,
    resumeTimer,
    minimize,
    maximize,
    visibility
  } = useFocusTimer();

  const totalDurationRef = useRef(0);
  
  // Widget Position & Drag State
  const [widgetPos, setWidgetPos] = useState({ x: window.innerWidth - 340, y: window.innerHeight - 450 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const widgetRef = useRef<HTMLDivElement>(null);

  // Determine Minimized State
  const isMinimized = visibility === 'minimized';

  // Init Position
  useEffect(() => {
      // Adjust initial widget pos for mobile
      if (window.innerWidth < 768) {
          setWidgetPos({ x: 16, y: window.innerHeight - 300 });
      }
  }, []);

  // Track duration for progress bar
  if (timeLeft > totalDurationRef.current && isActive) {
      totalDurationRef.current = timeLeft;
  }
  
  useEffect(() => {
    if (!task) totalDurationRef.current = 0;
  }, [task]);

  // --- Draggable Logic (Active only when minimized) ---
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!isMinimized || !widgetRef.current) return;
    
    // Check if clicking buttons
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const rect = widgetRef.current.getBoundingClientRect();
    
    // Removed vertical restriction to allow dragging from anywhere on the widget
    
    setIsDragging(true);
    dragOffset.current = {
        x: clientX - rect.left,
        y: clientY - rect.top,
    };
  }, [isMinimized]);
  
  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging || !widgetRef.current) return;
    e.preventDefault();

    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const widgetRect = widgetRef.current.getBoundingClientRect();

    let newX = clientX - dragOffset.current.x;
    let newY = clientY - dragOffset.current.y;

    // Constrain
    newX = Math.max(0, Math.min(newX, screenWidth - widgetRect.width));
    newY = Math.max(0, Math.min(newY, screenHeight - widgetRect.height));

    setWidgetPos({ x: newX, y: newY });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
        window.addEventListener('mousemove', handleMouseMove, { passive: false });
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('touchmove', handleMouseMove, { passive: false });
        window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchmove', handleMouseMove);
        window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);


  // --- Time Formatting ---
  const formatTime = (time: number) => {
    const totalSeconds = Math.max(0, Math.floor(time / 1000));
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  const progressPercentage = totalDurationRef.current > 0 ? Math.max(0, ((totalDurationRef.current - timeLeft) / totalDurationRef.current) * 100) : 0;

  if (!task) return null;

  // --- DYNAMIC STYLES ---
  const containerStyle: React.CSSProperties = isMinimized ? {
      position: 'fixed',
      left: `${widgetPos.x}px`,
      top: `${widgetPos.y}px`,
      width: '280px',
      height: 'auto',
      borderRadius: '32px',
      zIndex: 160, // Increased to sit above Music Player (145/150)
      boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.5)',
      touchAction: 'none', // Prevent scrolling while dragging
  } : {
      position: 'fixed',
      left: 0,
      top: 0,
      width: '100vw',
      height: '100vh',
      borderRadius: 0,
      zIndex: 140, // Increased to sit above Sidebar (110) but below Music Player (145)
      touchAction: 'none',
  };

  return (
    <>
      {/* 
          UNIFIED CONTAINER 
          Transitions between Full Screen and Widget seamlessly.
      */}
      <div 
        ref={widgetRef}
        style={containerStyle}
        className={`flex flex-col overflow-hidden transition-all duration-500 ease-in-out ${
            isMinimized 
                ? 'bg-slate-900/90 backdrop-blur-xl border border-white/10 pb-6' 
                : 'bg-slate-950'
        } ${!isMinimized && pomodoroState !== 'focus' ? 'bg-emerald-950' : ''}`}
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
      >
        {/* Background Gradients (Full Screen Only) */}
        {!isMinimized && (
            <div className="absolute inset-0 pointer-events-none">
                <div className={`absolute top-0 left-0 w-full h-full bg-gradient-to-br ${pomodoroState === 'focus' ? 'from-blue-900/20 to-slate-900' : 'from-emerald-900/20 to-slate-900'} opacity-50`}></div>
                <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px]"></div>
            </div>
        )}

        {/* Progress Bar (Top Line) */}
        <div className={`w-full bg-white/5 relative z-10 flex-shrink-0 transition-all ${isMinimized ? 'h-1 opacity-50' : 'h-1.5'}`}>
            <div 
                className={`h-full transition-all duration-1000 ease-linear ${pomodoroState === 'focus' ? 'bg-gradient-to-r from-blue-400 to-purple-400' : 'bg-emerald-400'}`} 
                style={{ width: `${progressPercentage}%` }}
            ></div>
        </div>

        {/* --- STREAK SCORECARD (Top Center) --- */}
        {!isMinimized && (
            <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-30 transition-all duration-500">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/50 border border-white/10 backdrop-blur-md shadow-lg hover:scale-105 transition-transform duration-300 cursor-default`}>
                    <FireIcon className={`w-5 h-5 transition-all duration-500 ${streak > 0 ? 'text-orange-500 drop-shadow-sm animate-pulse' : 'text-slate-500'}`} />
                    <div>
                        <span className={`font-bold text-sm ${streak > 0 ? 'text-orange-400' : 'text-slate-400'}`}>
                            {streak}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400 ml-1 uppercase tracking-wider">Streak</span>
                    </div>
                </div>
            </div>
        )}

        {/* --- HEADER SECTION --- */}
        <header className={`relative z-20 flex items-center justify-between transition-all ${isMinimized ? 'px-4 pt-4 pb-1' : 'px-6 py-6'}`}>
            {/* Left: Status Indicator */}
            <div className="flex items-center space-x-2 overflow-hidden">
                <div className={`flex items-center justify-center rounded-full ${isMinimized ? 'w-2 h-2 bg-blue-500 shadow-[0_0_10px_#3b82f6]' : 'w-8 h-8 bg-white/10'}`}>
                    {!isMinimized && <ClockIcon className="text-white w-4 h-4" />}
                </div>
                {!isMinimized && (
                    <div className="min-w-0">
                        <p className="font-bold text-white uppercase tracking-wider text-xs">
                            {pomodoroState === 'focus' ? 'Focus Mode' : 'Break Time'}
                        </p>
                    </div>
                )}
            </div>

            {/* Right: Controls */}
            <div className="flex items-center space-x-2 no-drag">
                {/* Min/Max Button */}
                <button 
                    onClick={isMinimized ? maximize : minimize} 
                    className={`rounded-full text-slate-300 transition-colors hover:text-white ${isMinimized ? 'p-1 hover:bg-white/10' : 'p-2 bg-white/5 hover:bg-white/10'}`}
                    title={isMinimized ? "Maximize" : "Minimize"}
                >
                    {isMinimized ? <MaximizeIcon className="w-4 h-4" /> : <MinimizeIcon className="w-4 h-4" />}
                </button>

                {/* Stop Button */}
                <button 
                    onClick={stopFocusSession} 
                    className={`rounded-full text-red-400 transition-colors hover:text-red-300 ${isMinimized ? 'p-1 hover:bg-red-500/20' : 'p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20'}`}
                    title="Stop Session"
                >
                    <StopCircleIcon className="w-4 h-4" />
                </button>
            </div>
        </header>

        {/* --- MAIN CONTENT (Timer) --- */}
        <main className={`relative z-10 flex flex-col items-center justify-center transition-all duration-500 ${isMinimized ? 'pb-3' : 'flex-grow'}`}>
            {/* Timer Display */}
            <div className={`font-mono font-bold text-white tracking-tighter leading-none transition-all duration-500 flex items-center justify-center ${isMinimized ? 'text-5xl mt-1' : 'text-[120px] sm:text-[180px] drop-shadow-2xl mb-8'}`}>
                {formatTime(timeLeft)}
                {/* Play/Pause Next to Timer in Minimized */}
                {isMinimized && (
                    <button 
                        onClick={isActive ? pauseTimer : resumeTimer}
                        className="ml-3 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                    >
                        {isActive ? <SimplePauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
                    </button>
                )}
            </div>

            {/* Task Title */}
            <p className={`text-center transition-all duration-300 ${isMinimized ? 'text-[11px] text-slate-400 max-w-[200px] truncate mt-1' : 'text-xl sm:text-3xl font-medium text-white/90 max-w-2xl px-4 mb-12 line-clamp-2'}`}>
                {task.title}
            </p>

            {/* Full Screen Play Controls */}
            {!isMinimized && (
                <div className="flex items-center justify-center">
                    <button 
                        onClick={isActive ? pauseTimer : resumeTimer} 
                        className={`flex items-center justify-center rounded-full transition-all duration-300 shadow-lg group ${isActive ? 'w-24 h-24 bg-white/10 hover:bg-white/20 border border-white/10 backdrop-blur-md' : 'w-24 h-24 bg-white hover:scale-105 text-slate-900'}`}
                    >
                        {isActive ? (
                            <div className="flex gap-2"><div className="w-2 h-8 bg-white rounded-full"></div><div className="w-2 h-8 bg-white rounded-full"></div></div>
                        ) : (
                            <PlayIcon className="w-10 h-10 ml-1" />
                        )}
                    </button>
                </div>
            )}
        </main>
      </div>
    </>
  );
};

export default FocusMode;
