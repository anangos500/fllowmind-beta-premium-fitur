
import React, {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
  CSSProperties
} from 'react';
import { Task, TaskStatus, Expense, EquippedItems } from '../types';
import { useFocusTimer } from '../contexts/FocusTimerContext';

interface MascotProps {
  tasks: Task[];
  expenses?: Expense[];
  recentAction: 'idle' | 'eating' | 'celebrating';
  equipped?: EquippedItems;
  isListening?: boolean;
  isPreview?: boolean; // New prop for shop preview
  overrideEquipped?: EquippedItems; // New prop to force specific look
  isPlayerExpanded?: boolean; // New prop for positioning above expanded player
}

// --- CONSTANTS & CONFIGURATION ---

const IDLE_PHRASES = [
  'Sepi ya...',
  'Bip bop...',
  'Jalan-jalan dulu ah...',
  'Ada rencana apa?',
  '♪ ♫ ♪',
  'Cek jadwalmu...',
  'Baterai: 99%...',
  'Waktu adalah uang!'
];

const OVERDUE_PHRASES = [
  'WOI! TUGAS TERLEWAT!',
  'SYSTEM CRITICAL!!',
  'Selesaikan sekarang!!',
  'Aku akan meledak...',
  'Deadline menghantui...',
  'ALERT! ALERT!',
  'Jangan ditunda lagi!'
];

const SICK_PHRASES = [
  'Sistem... error...',
  'Berat sekali...',
  'Mataku... glitch...',
  'Butuh... update...',
  '404: Energy Not Found'
];

const HABIT_QUOTES = [
  'Konsistensi adalah kunci!',
  'Satu langkah kecil setiap hari.',
  'Jangan putus rantai habitmu!',
  'Mulai dari yang termudah.',
  'Sukses = Habit + Waktu.'
];

const FINANCE_QUOTES = [
  'Hemat pangkal kaya!',
  'Sudah catat pengeluaran?',
  'Jaga cashflow tetap positif.',
  'Investasi leher ke atas!',
  'Jangan boros hari ini ya.'
];

const FOCUS_PHRASES = [
  'Fokus... Fokus...',
  'Kamu pasti bisa!',
  'Jangan terdistraksi.',
  'Satu tugas pada satu waktu.',
  'Semangat! Waktu berjalan.',
  'Keep going!',
  'Zona produktif aktif.'
];

// --- COLOR PALETTES ---
interface SkinPalette {
    bodyFill: string;
    bodyStroke: string;
    faceFill: string; // Screen background color
    accessoryPrimary: string; // Main color for hats/headphones
    accessorySecondary: string; // Detail color
    accessoryStroke: string; // Outline for accessories
}

const ROBOT_SKINS: Record<string, SkinPalette> = {
    'default': {
        bodyFill: '#a5b4fc', // Indigo-300 (Pastel)
        bodyStroke: '#4338ca', // Indigo-700
        faceFill: '#312e81', // Indigo-900 (Deep Navy)
        accessoryPrimary: '#f472b6', // Pink-400
        accessorySecondary: '#fbcfe8', // Pink-200
        accessoryStroke: '#be185d', // Pink-700
    },
    'skin_gold': {
        bodyFill: '#fcd34d', // Amber-300 (Pastel Gold)
        bodyStroke: '#b45309', // Amber-700
        faceFill: '#78350f', // Amber-900 (Deep Brown)
        accessoryPrimary: '#ef4444', // Red-500
        accessorySecondary: '#fecaca', // Red-200
        accessoryStroke: '#991b1b', // Red-800
    },
    'skin_neon': {
        bodyFill: '#67e8f9', // Cyan-300 (Pastel Neon)
        bodyStroke: '#0e7490', // Cyan-700
        faceFill: '#164e63', // Cyan-900 (Deep Teal)
        accessoryPrimary: '#c084fc', // Purple-400
        accessorySecondary: '#e9d5ff', // Purple-200
        accessoryStroke: '#7e22ce', // Purple-700
    },
    'skin_rose': {
        bodyFill: '#fda4af', // Rose-300 (Pastel Pink)
        bodyStroke: '#be123c', // Rose-700
        faceFill: '#881337', // Rose-900 (Deep Maroon)
        accessoryPrimary: '#fdba74', // Orange-300
        accessorySecondary: '#ffedd5', // Orange-100
        accessoryStroke: '#c2410c', // Orange-700
    },
    'skin_dark': {
        bodyFill: '#cbd5e1', // Slate-300 (Silver/Bright Gray)
        bodyStroke: '#334155', // Slate-700
        faceFill: '#0f172a', // Slate-900 (Deep Dark)
        accessoryPrimary: '#3b82f6', // Blue-500
        accessorySecondary: '#bfdbfe', // Blue-200
        accessoryStroke: '#1d4ed8', // Blue-700
    },
};

type Mood = 'broken' | 'sick' | 'neutral' | 'powerful' | 'angry' | 'scared' | 'vibing';
type Eyes =
  | 'blink'
  | 'open'
  | 'happy'
  | 'sad'
  | 'angry'
  | 'wide'
  | 'dead-left'
  | 'dead-both';

const Mascot: React.FC<MascotProps> = ({ 
  tasks, 
  expenses = [], 
  recentAction, 
  equipped, 
  isListening = false,
  isPreview = false,
  overrideEquipped,
  isPlayerExpanded = false
}) => {
  // Use overrideEquipped if available (for shop preview), otherwise fall back to equipped prop
  const activeEquipped = overrideEquipped || equipped;
  const activeSkinId = activeEquipped?.skin || 'default';
  
  // Get palette or fallback to default
  const palette = ROBOT_SKINS[activeSkinId] || ROBOT_SKINS['default'];

  // --- State: Mood & Visuals ---
  const [mood, setMood] = useState<Mood>('neutral');
  const [eyes, setEyes] = useState<Eyes>('open');

  // --- State: Position & Movement ---
  const [posX, setPosX] = useState(50);
  const [bottomY, setBottomY] = useState(0);
  const [moveDuration, setMoveDuration] = useState(0);
  const [isWalking, setIsWalking] = useState(false);
  const [direction, setDirection] = useState<'left' | 'right'>('right');

  // --- State: Interaction ---
  const [isDragging, setIsDragging] = useState(false);
  const [isLanding, setIsLanding] = useState(false);
  const [isSpawning, setIsSpawning] = useState(true);
  const [showCracks, setShowCracks] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Parachute
  const [isParachuting, setIsParachuting] = useState(false);

  // Strikes / Electricity
  const [showSmallStrike, setShowSmallStrike] = useState(false);
  const [showBigStrike, setShowBigStrike] = useState(false);
  const [showShockFlash, setShowShockFlash] = useState(false);

  // Rage click
  const [rageClicks, setRageClicks] = useState(0);

  // --- State: Dialog ---
  const [dialog, setDialog] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const dialogTimeoutRef = useRef<number | null>(null);
  const loopTimeoutRef = useRef<number | null>(null);

  // Refs
  const mascotRef = useRef<HTMLDivElement>(null);
  const moveTimerRef = useRef<number | null>(null);

  // Focus Context
  const { isActive, pomodoroState } = useFocusTimer();

  // Rub / Gosok detection
  const rubScoreRef = useRef(0);
  const lastRubTimeRef = useRef(0);

  // --- Helpers ---
  const getBoundaries = () => {
    if (typeof window === 'undefined') {
      return { minX: 20, maxX: 300 };
    }
    const isDesktop = window.innerWidth >= 1024;
    const minX = isDesktop ? 280 : 20;
    const maxX = window.innerWidth - 100;
    return { minX, maxX };
  };

  const getRandomPhrase = (arr: string[], defaultText: string = "Halo!") => {
      if (!arr || arr.length === 0) return defaultText;
      return arr[Math.floor(Math.random() * arr.length)];
  };

  // --- Logic: Initial Spawn ---
  useEffect(() => {
    const timer = window.setTimeout(() => setIsSpawning(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  // --- Logic: Listening Mode (Fix Position) ---
  useEffect(() => {
      if (isPreview) return; // Disable in preview

      if (isListening) {
          // Stop all random movement timers
          if (moveTimerRef.current) {
              clearTimeout(moveTimerRef.current);
              moveTimerRef.current = null;
          }
          // Stop walking
          setIsWalking(false);
          setMoveDuration(500); 
          
          // Position logic is now handled by CSS classes for isListening to support calc()
          // But we reset these to neutral values
          setBottomY(0); 
          setDirection('right'); // Look at the player
          setDialog(null);
          setShowDialog(false);
      } else {
          // Resume wandering after a delay
          if (!isDragging && !isWalking) {
              planNextMove();
          }
      }
  }, [isListening, isPreview]);

  // --- Logic: Health/Mood Calculation ---
  const derivedStats = useMemo(() => {
    // If in preview, simplify logic or mock it
    if (isPreview) {
        return {
            overdueCount: 0,
            isHighProductivity: false,
            hasPendingTasks: false,
            todayTotal: 0,
            todayCompleted: 0,
            hasTasksToday: false,
            allDoneToday: false
        };
    }

    const todayStr = new Date().toDateString();
    const todaysTasks = tasks.filter(
      t => new Date(t.startTime).toDateString() === todayStr
    );

    const now = Date.now();
    const overdueTasks = tasks.filter(
      t =>
        new Date(t.endTime).getTime() < now &&
        t.status !== TaskStatus.Done
    );

    const total = todaysTasks.length;
    const completed = todaysTasks.filter(
      t => t.status === TaskStatus.Done
    ).length;
    const ratio = total === 0 ? 0 : completed / total;

    return {
      overdueCount: overdueTasks.length,
      isHighProductivity: ratio >= 0.75 && total > 2,
      hasPendingTasks: total > 0 && ratio < 0.5,
      todayTotal: total,
      todayCompleted: completed,
      hasTasksToday: total > 0,
      allDoneToday: total > 0 && completed === total
    };
  }, [tasks, isPreview]);

  const {
    overdueCount,
    isHighProductivity,
    hasPendingTasks,
    allDoneToday
  } = derivedStats;

  // --- Logic: Mood based on tasks & interactions ---
  useEffect(() => {
    if (isDragging) {
      setMood('scared');
      setEyes('wide');
      return;
    }
    
    if (isListening) {
        setMood('vibing');
        setEyes('happy');
        return;
    }
    
    // If user is celebrating (e.g. streak, or ITEM SHOP EQUIP), mascot should be happy/powerful
    if (recentAction === 'celebrating') {
        setMood('powerful');
        setEyes('happy');
        return;
    }

    // PREVIEW MODE DEFAULT
    if (isPreview) {
        setMood('neutral');
        setEyes('open');
        return;
    }

    // Rage mode: banyak klik → amukan listrik
    if (rageClicks >= 4) {
      setMood('angry');
      setEyes('angry');
      setShowBigStrike(true);
      setShowShockFlash(true);
      const t1 = window.setTimeout(() => setShowBigStrike(false), 600);
      const t2 = window.setTimeout(() => setShowShockFlash(false), 300);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }

    // 2+ Overdue → rusak parah + petir besar
    if (overdueCount >= 2) {
      setMood('broken');
      setEyes('dead-both');
      setShowBigStrike(true);
      setShowShockFlash(true);
      const t1 = window.setTimeout(() => setShowBigStrike(false), 800);
      const t2 = window.setTimeout(() => setShowShockFlash(false), 400);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }

    // 1 Overdue → rusak ringan + spark kecil
    if (overdueCount === 1) {
      setMood('sick');
      setEyes('dead-left');
      setShowSmallStrike(true);
      setShowShockFlash(true);
      const t1 = window.setTimeout(() => setShowSmallStrike(false), 300);
      const t2 = window.setTimeout(() => setShowShockFlash(false), 200);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }

    // Tidak overdue tapi banyak pending hari ini
    if (hasPendingTasks) {
      setMood('sick');
      setEyes('sad');
      return;
    }

    // Semua tugas hari ini selesai
    if (allDoneToday) {
      setMood('powerful');
      setEyes('happy');
      return;
    }

    // Produktif (rasio tinggi tapi belum all done)
    if (isHighProductivity) {
      setMood('powerful');
      setEyes('happy');
      return;
    }

    // Normal / tidak ada tugas
    setMood('neutral');
    setEyes('open');
  }, [
    overdueCount,
    hasPendingTasks,
    isHighProductivity,
    allDoneToday,
    isDragging,
    rageClicks,
    recentAction,
    isListening,
    isPreview
  ]);

  // --- Logic: Blink Animation ---
  useEffect(() => {
    if (
      mood === 'broken' ||
      mood === 'sick' ||
      isDragging ||
      mood === 'angry' ||
      isSpawning ||
      isListening
    )
      return;

    const interval = window.setInterval(() => {
      setEyes('blink');
      const backTo: Eyes = mood === 'powerful' ? 'happy' : 'open';
      window.setTimeout(() => setEyes(backTo), 150);
    }, 4000);

    return () => clearInterval(interval);
  }, [mood, isDragging, isSpawning, isListening]); 

  // --- Logic: Eye while walking → always open (normal) ---
  useEffect(() => {
    if (isWalking && !isDragging && !isSpawning) {
      // kecuali mood rusak / sakit / marah (biarkan dead / sad / angry)
      if (mood !== 'broken' && mood !== 'sick' && mood !== 'angry') {
        setEyes('open');
      }
    }
  }, [isWalking, isDragging, isSpawning, mood]);

  // --- Logic: Wandering (Automatic Movement) ---
  const planNextMove = useCallback(() => {
    if (isDragging || isLanding || isSpawning || isListening || isPreview) return;
    if (typeof window === 'undefined') return;

    const basePause = mood === 'broken' ? 6000 : 3000;
    const randomPause = Math.random() * 3000;

    moveTimerRef.current = window.setTimeout(() => {
      moveTimerRef.current = null;

      const { minX, maxX } = getBoundaries();
      const screenW = window.innerWidth;

      const currentPixelX = (posX / 100) * screenW;
      const range = maxX - minX;
      const targetPixelX = minX + Math.random() * range;
      const newPosPct = (targetPixelX / screenW) * 100;

      const isMovingRight = newPosPct > posX;
      setDirection(isMovingRight ? 'right' : 'left');

      const distance = Math.abs(targetPixelX - currentPixelX);
      const speed = mood === 'broken' ? 0.015 : 0.05;
      const durationMs = distance / speed;

      setMoveDuration(durationMs);
      setIsWalking(true);
      setPosX(newPosPct);
    }, basePause + randomPause);
  }, [posX, mood, isDragging, isLanding, isSpawning, isListening, isPreview]);

  useEffect(() => {
    if (!moveTimerRef.current && !isWalking && !isDragging && !isSpawning && !isListening && !isPreview) {
      planNextMove();
    }
    return () => {
      if (moveTimerRef.current) {
        clearTimeout(moveTimerRef.current);
        moveTimerRef.current = null;
      }
    };
  }, [planNextMove, isWalking, isDragging, isSpawning, isListening, isPreview]);

  const handleTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.propertyName === 'left') {
      setIsWalking(false);
      planNextMove();
    }
  };

  // --- Logic: Drag & Drop ---
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (isPreview) return; 

    e.stopPropagation();
    setIsDragging(true);
    setIsLanding(false);
    setIsWalking(false);
    setMoveDuration(0);
    setIsParachuting(false);

    if (moveTimerRef.current) {
      clearTimeout(moveTimerRef.current);
      moveTimerRef.current = null;
    }

    showMessage('Waaa! Turunin pelan-pelan!', 3000, true);

    const clientX =
      'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY =
      'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    if (mascotRef.current) {
      const rect = mascotRef.current.getBoundingClientRect();
      dragOffset.current = {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    }
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isDragging || isPreview) return;
      e.preventDefault();
      if (typeof window === 'undefined') return;

      const clientX =
        'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY =
        'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

      const screenW = window.innerWidth;
      const screenH = window.innerHeight;

      const rawX = clientX - dragOffset.current.x;
      const rawY = clientY - dragOffset.current.y;

      const newBottom = screenH - rawY - 100;
      const newPct = (rawX / screenW) * 100;

      const clampedPct = Math.min(95, Math.max(5, newPct));
      const clampedBottom = Math.max(0, newBottom);

      setPosX(clampedPct);
      setBottomY(clampedBottom);
    },
    [isDragging, isPreview]
  );

  const handleMouseUp = useCallback(() => {
    if (!isDragging || isPreview) return;

    setIsDragging(false);
    setShowDialog(false);

    const highDropThreshold = 160; // px

    // Kalau drop dari cukup tinggi → aktifkan parasut (turun pelan)
    if (bottomY > highDropThreshold) {
      setIsParachuting(true);
      setIsLanding(true);
      setMoveDuration(1600);
      setBottomY(0);

      const t = window.setTimeout(() => {
        setIsLanding(false);
        setIsParachuting(false);
      }, 1600);

      return () => clearTimeout(t);
    }

    // Kalau dijatuhkan dari rendah (tanpa parasut) → strike kecil + cracks
    setIsLanding(true);
    setMoveDuration(350);
    setBottomY(0);
    setShowCracks(true);
    setShowSmallStrike(true);
    setShowShockFlash(true);

    const t1 = window.setTimeout(() => {
      setIsLanding(false);
      setShowCracks(false);
    }, 800);

    const t2 = window.setTimeout(() => {
      setShowSmallStrike(false);
      setShowShockFlash(false);
    }, 250);

    const t3 = window.setTimeout(() => {
      planNextMove();
    }, 900);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isDragging, bottomY, planNextMove, isPreview]);

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

  // --- Logic: Click Interaction (single click = marah + listrik) ---
  const handleClick = () => {
    if (isDragging || isSpawning || isPreview) return; 

    setRageClicks(prev => prev + 1);

    setMood('angry');
    setEyes('angry');
    showMessage('Hei! Jangan ganggu aku!', 1500, true);

    // kecil dulu
    setShowSmallStrike(true);
    setShowShockFlash(true);
    const t1 = window.setTimeout(() => setShowSmallStrike(false), 150);
    const t2 = window.setTimeout(() => setShowShockFlash(false), 200);

    // kalau udah banyak klik → amukan listrik (big strike)
    if (rageClicks + 1 >= 4) {
      setShowBigStrike(true);
      setShowShockFlash(true);
      const t3 = window.setTimeout(() => setShowBigStrike(false), 600);
      const t4 = window.setTimeout(() => setShowShockFlash(false), 300);
      window.setTimeout(() => setRageClicks(0), 3000);
    } else {
      window.setTimeout(() => setRageClicks(0), 5000);
    }

    window.setTimeout(() => {
      setShowDialog(false);
    }, 1600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  };

  // --- Logic: “Gosok panah” (mouse move cepat di atas robot) ---
  const handleHoverMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging || isSpawning || isPreview) return;
    if (e.buttons !== 0) return; 

    const now = Date.now();
    const delta = now - lastRubTimeRef.current;

    if (delta < 120) {
      rubScoreRef.current += 1;
    } else {
      rubScoreRef.current = 1;
    }
    lastRubTimeRef.current = now;

    if (rubScoreRef.current >= 12 && mood !== 'angry') {
      rubScoreRef.current = 0;
      setMood('powerful');
      setEyes('happy');
      showMessage('Hahaha! Enak digelitik! 😆', 2500, true);
    }
  };

  // --- DIALOG SYSTEM REFACTOR ---

  // 1. State Ref to avoid closure staleness in loop
  const stateRef = useRef({
      mood,
      recentAction,
      overdueCount: derivedStats.overdueCount,
      hasTasksToday: derivedStats.hasTasksToday,
      allDoneToday: derivedStats.allDoneToday,
      expenses,
      isDragging,
      isListening,
      isActive, // Focus active
      pomodoroState,
      isPreview
  });

  useEffect(() => {
      stateRef.current = {
          mood,
          recentAction,
          overdueCount: derivedStats.overdueCount,
          hasTasksToday: derivedStats.hasTasksToday,
          allDoneToday: derivedStats.allDoneToday,
          expenses,
          isDragging,
          isListening,
          isActive,
          pomodoroState,
          isPreview
      };
  }, [mood, recentAction, derivedStats, expenses, isDragging, isListening, isActive, pomodoroState, isPreview]);

  // 2. Show Message Function
  const showMessage = useCallback((text: string, duration: number = 4000, force: boolean = false) => {
      if (stateRef.current.isPreview && !force) return;

      // Clear existing hide timer
      if (dialogTimeoutRef.current) {
          clearTimeout(dialogTimeoutRef.current);
      }

      setDialog(text);
      setShowDialog(true);

      dialogTimeoutRef.current = window.setTimeout(() => {
          setShowDialog(false);
      }, duration);
  }, []);

  // 3. Event-Driven Triggers (Immediate)
  
  // React to recentAction (Celebrations, Eating)
  useEffect(() => {
      if (isPreview) return;
      if (recentAction === 'celebrating') {
          showMessage(getRandomPhrase(['Luar biasa!', 'Mantap!', 'On fire! 🔥']), 3000, true);
      } else if (recentAction === 'eating') {
          showMessage('Nyam! Tugas selesai!', 2500, true);
      }
  }, [recentAction, showMessage, isPreview]);

  // React to Focus State
  const prevActive = useRef(isActive);
  useEffect(() => {
      if (isPreview) return;
      if (isActive && !prevActive.current) {
          // Started focus
          showMessage('Mode Fokus Aktif! Ayo konsentrasi.', 4000, true);
      } else if (!isActive && prevActive.current) {
          // Stopped focus
          if (pomodoroState === 'short_break' || pomodoroState === 'long_break') {
              showMessage('Waktunya istirahat sejenak.', 4000, true);
          } else {
              showMessage('Sesi fokus selesai.', 3000, true);
          }
      }
      prevActive.current = isActive;
  }, [isActive, pomodoroState, showMessage, isPreview]);

  // 4. Background Loop (Idle Chatter)
  useEffect(() => {
      const runLoop = () => {
          const state = stateRef.current;
          if (state.isPreview) return; // No idle chatter in preview

          let nextDelay = 10000 + Math.random() * 15000; // Default 10-25s

          // Don't chat if dragging or listening
          if (state.isDragging || state.isListening) {
              loopTimeoutRef.current = window.setTimeout(runLoop, 5000);
              return;
          }

          let text = "";
          
          // Priority 1: Focus Mode (Motivational)
          if (state.isActive) {
              text = getRandomPhrase(FOCUS_PHRASES);
              nextDelay = 30000 + Math.random() * 20000; // Less frequent in focus
          } 
          // Priority 2: Overdue (Warning)
          else if (state.overdueCount > 0) {
              text = getRandomPhrase(OVERDUE_PHRASES);
              nextDelay = 8000; // More frequent nagging
          } 
          // Priority 3: Sick (Low battery/energy)
          else if (state.mood === 'sick') {
              text = getRandomPhrase(SICK_PHRASES);
          } 
          // Priority 4: All Done
          else if (state.allDoneToday && state.hasTasksToday) {
              text = getRandomPhrase(["Semua tugas beres!", "Santai dulu...", "Kerja bagus hari ini!", "Siap untuk besok?"]);
              nextDelay = 20000;
          } 
          // Priority 5: Idle / General
          else {
              const r = Math.random();
              if (r < 0.25) text = getRandomPhrase(HABIT_QUOTES);
              else if (r < 0.5 && state.expenses.length > 0) text = getRandomPhrase(FINANCE_QUOTES);
              else text = getRandomPhrase(IDLE_PHRASES);
          }

          showMessage(text, 4000);
          loopTimeoutRef.current = window.setTimeout(runLoop, nextDelay);
      };

      // Initial start delay
      loopTimeoutRef.current = window.setTimeout(runLoop, 5000);

      return () => {
          if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current);
      };
  }, [showMessage]);

  // --- Styles Calculation ---
  const getResolvedStyles = () => {
    // 1. Default values from active Skin Palette
    let bodyFill = palette.bodyFill;
    let bodyStroke = palette.bodyStroke;
    let faceFill = palette.faceFill;
    let auraClass = 'opacity-40 bg-yellow-300/40';
    let eyeColor = '#ffffff';
    let mouthType: 'sad' | 'happy' | 'neutral' | 'o' = 'neutral';
    let showSpark = false;

    // 2. Override based on Mood (Mood overrides Skin colors for dramatic effect)
    switch (mood) {
      case 'broken':
        bodyFill = '#475569'; // Slate-600
        bodyStroke = '#7f1d1d'; // Red-900
        faceFill = '#0f172a'; // Dark Slate
        auraClass = 'opacity-30 bg-red-900/50 animate-pulse';
        eyeColor = '#ef4444';
        mouthType = 'sad';
        showSpark = true;
        break;
      case 'sick':
        bodyFill = '#94a3b8'; // Slate-400 (Pale)
        bodyStroke = '#475569'; // Slate-600
        faceFill = '#334155'; // Slate-700
        auraClass = 'opacity-0';
        eyeColor = '#cbd5e1';
        mouthType = 'sad';
        showSpark = true;
        break;
      case 'powerful':
      case 'vibing':
        // Keep skin colors, add powerful aura
        auraClass = 'opacity-100 animate-pulse-fast bg-yellow-400/50 shadow-yellow-400/50';
        eyeColor = '#fbbf24'; // Gold Eyes
        mouthType = 'happy';
        break;
      case 'angry':
        bodyFill = '#ef4444'; // Red-500
        bodyStroke = '#b91c1c'; // Red-700
        faceFill = '#450a0a'; // Red-950
        auraClass = 'opacity-60 bg-red-500/60 animate-pulse';
        eyeColor = '#ffffff';
        mouthType = 'sad';
        break;
      case 'scared':
        bodyFill = '#c084fc'; // Purple-400
        bodyStroke = '#7e22ce'; // Purple-700
        faceFill = '#3b0764'; // Purple-950
        auraClass = 'opacity-0';
        eyeColor = '#ffffff';
        mouthType = 'o';
        break;
      default:
        // Neutral - use defaults
        break;
    }

    return { bodyFill, bodyStroke, faceFill, auraClass, eyeColor, mouthType, showSpark };
  };

  const style = getResolvedStyles();
  const isEating = recentAction === 'eating' || recentAction === 'celebrating';
  const faceTransform = direction === 'right' ? 'translate(3, 0)' : 'translate(-3, 0)';

  const DeadEye = ({ cx, cy }: { cx: number; cy: number }) => (
    <g stroke={style.eyeColor} strokeWidth="3" strokeLinecap="round">
      <line x1={cx - 4} y1={cy - 4} x2={cx + 4} y2={cy + 4} />
      <line x1={cx + 4} y1={cy - 4} x2={cx - 4} y2={cy + 4} />
    </g>
  );

  // --- Accessories Rendering ---
  const renderHat = () => {
      if (!activeEquipped?.head) return null;
      const transform = direction === 'right' ? 'translate(3, 0)' : 'translate(-3, 0)';
      
      const primary = palette.accessoryPrimary;
      const secondary = palette.accessorySecondary;
      const stroke = palette.accessoryStroke;

      switch (activeEquipped.head) {
          case 'hat_cowboy':
              return (
                  <g transform={`translate(25, 10) ${transform}`}>
                      <path d="M-5 20 Q25 10 55 20" fill="none" stroke={stroke} strokeWidth="4" style={{ transition: 'all 0.5s ease' }} />
                      <path d="M10 20 L10 5 Q25 -5 40 5 L40 20 Z" fill={primary} stroke={stroke} strokeWidth="2" style={{ transition: 'all 0.5s ease' }} />
                  </g>
              );
          case 'hat_wizard':
              return (
                  <g transform={`translate(25, -15) ${transform}`}>
                      <polygon points="10,45 40,45 25,5" fill={primary} stroke={stroke} strokeWidth="2" style={{ transition: 'all 0.5s ease' }} />
                      <path d="M-5 45 Q25 55 55 45" fill="none" stroke={stroke} strokeWidth="3" style={{ transition: 'all 0.5s ease' }} />
                  </g>
              );
          case 'hat_crown':
              return (
                  <g transform={`translate(35, 10) rotate(10) ${transform}`}>
                      <path 
                        d="M 2 14 L 2 4 L 10 10 L 15 0 L 20 10 L 28 4 L 28 14 Q 15 20 2 14 Z" 
                        fill="url(#grad-gold)" 
                        stroke="#b45309" 
                        strokeWidth="1.5" 
                        strokeLinejoin="round"
                      />
                      <circle cx="15" cy="12" r="2.5" fill="#ef4444" stroke="#b91c1c" strokeWidth="0.5" />
                      <path d="M 15 0 L 15 2" stroke="white" strokeWidth="1" opacity="0.6" />
                  </g>
              );
          case 'hat_headphones':
              return (
                  <g transform={`translate(0, 0) ${transform}`}>
                      <path 
                        d="M 22 45 Q 22 12 50 12 Q 78 12 78 45" 
                        fill="none" 
                        stroke={stroke} 
                        strokeWidth="6" 
                        strokeLinecap="round"
                        style={{ transition: 'all 0.5s ease' }}
                      />
                      <path 
                        d="M 22 45 Q 22 12 50 12 Q 78 12 78 45" 
                        fill="none" 
                        stroke={secondary} 
                        strokeWidth="2" 
                        strokeLinecap="round"
                        opacity="0.5"
                        style={{ transition: 'all 0.5s ease' }}
                      />
                      <g transform="translate(16, 40)">
                          <rect x="0" y="0" width="10" height="16" rx="3" fill={primary} stroke={stroke} strokeWidth="1.5" style={{ transition: 'all 0.5s ease' }} />
                          <rect x="2" y="2" width="6" height="12" rx="2" fill={secondary} style={{ transition: 'all 0.5s ease' }} />
                      </g>
                      <g transform="translate(74, 40)">
                          <rect x="0" y="0" width="10" height="16" rx="3" fill={primary} stroke={stroke} strokeWidth="1.5" style={{ transition: 'all 0.5s ease' }} />
                          <rect x="2" y="2" width="6" height="12" rx="2" fill={secondary} style={{ transition: 'all 0.5s ease' }} />
                      </g>
                  </g>
              );
          default: return null;
      }
  };

  const renderGlasses = () => {
      if (!activeEquipped?.face) return null;
      const transform = direction === 'right' ? 'translate(3, 0)' : 'translate(-3, 0)';
      const stroke = palette.accessoryStroke;

      switch (activeEquipped.face) {
          case 'face_sunglasses':
              return (
                  <g transform={`translate(32, 48) ${transform}`}>
                      <path d="M5 0 L15 0 L18 8 L2 8 Z" fill="#000000" fillOpacity="0.9" stroke={stroke} strokeWidth="1.5" style={{ transition: 'all 0.5s ease' }} />
                      <path d="M21 0 L31 0 L34 8 L18 8 Z" fill="#000000" fillOpacity="0.9" stroke={stroke} strokeWidth="1.5" style={{ transition: 'all 0.5s ease' }} />
                      <line x1="15" y1="2" x2="21" y2="2" stroke={stroke} strokeWidth="2" style={{ transition: 'all 0.5s ease' }} />
                  </g>
              );
          case 'face_thug':
              return (
                  <g transform={`translate(32, 48) ${transform}`}>
                      <g stroke={stroke} strokeWidth="0.5" fill="black">
                        <rect x="5" y="0" width="10" height="2" />
                        <rect x="7" y="2" width="8" height="2" />
                        <rect x="8" y="4" width="6" height="2" />
                        <rect x="9" y="6" width="4" height="2" />
                        <rect x="21" y="0" width="10" height="2" />
                        <rect x="23" y="2" width="8" height="2" />
                        <rect x="24" y="4" width="6" height="2" />
                        <rect x="25" y="6" width="4" height="2" />
                        <rect x="15" y="0" width="6" height="1" />
                      </g>
                  </g>
              );
          case 'face_monocle':
              return (
                  <g transform={`translate(32, 48) ${transform}`}>
                      <circle cx="26" cy="4" r="6" fill="none" stroke="#fbbf24" strokeWidth="1.5" />
                      <line x1="26" y1="10" x2="26" y2="20" stroke="#fbbf24" strokeWidth="1" />
                  </g>
              );
          default: return null;
      }
  };

  // Apply specialized styling for listening mode and preview mode
  const listeningStyle: React.CSSProperties = isListening ? {
      // When listening, positioning is handled via classes, but we can use inline to handle dynamic "expanded" state
      // which overrides the class defaults if needed for better precision.
  } : isPreview ? {
      // Relative positioning for preview
      position: 'relative',
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transform: 'scale(1.8)' // Scale up for preview visibility
  } : {
      left: `${posX}%`,
      bottom: `${bottomY}px`,
      transform: 'translateX(-50%)',
      transitionDuration: isDragging ? '0s' : `${moveDuration}ms`,
  };

  const containerClasses = isPreview
    ? `robot-container flex items-center justify-center transition-transform duration-300 ${recentAction === 'idle' ? 'animate-float' : ''}`
    : isListening 
        ? `fixed left-0 right-0 lg:left-64 z-40 flex justify-center items-end pointer-events-none transition-all duration-500 ${isPlayerExpanded ? 'bottom-[490px]' : 'bottom-[100px]'} lg:bottom-6 translate-x-0 lg:-translate-x-[200px]`
        : `absolute robot-container pointer-events-auto cursor-grab touch-none select-none ${isDragging ? 'dragging' : ''} ${isLanding ? 'landing' : 'walking'} hover:scale-[1.02] transition-transform`;

  return (
    <div className={isPreview ? "w-full h-full flex items-center justify-center overflow-visible" : "fixed bottom-0 left-0 w-full h-0 z-40 pointer-events-none font-sans"}>
      <style>{`
        @keyframes spin-wheel { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes spin-wheel-back { 0% { transform: rotate(360deg); } 100% { transform: rotate(0deg); } }
        @keyframes eat { 0% { transform: scale(1); } 50% { transform: scale(1.2) rotate(5deg); } 100% { transform: scale(1); } }
        @keyframes shake { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-10deg); } 75% { transform: rotate(10deg); } }
        @keyframes land-sway { 0% { transform: rotate(0deg); } 25% { transform: rotate(5deg); } 75% { transform: rotate(-5deg); } 100% { transform: rotate(0deg); } }
        @keyframes spawn-pop { 0% { transform: scale(0) translateY(50px); opacity: 0; } 70% { transform: scale(1.2) translateY(-10px); opacity: 1; } 100% { transform: scale(1) translateY(0); opacity: 1; } }
        @keyframes portal-pulse { 0% { transform: scaleX(0); opacity: 0; } 20% { transform: scaleX(1); opacity: 1; } 80% { transform: scaleX(1); opacity: 1; } 100% { transform: scaleX(0); opacity: 0; } }
        @keyframes body-bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
        @keyframes sick-wobble { 0%, 100% { transform: rotate(0deg); } 33% { transform: rotate(-3deg); } 66% { transform: rotate(3deg); } }
        @keyframes smoke-puff {
          0% { opacity: 0.8; transform: scale(0.5) translateX(0) translateY(0); }
          100% { opacity: 0; transform: scale(2) translateX(var(--tx)) translateY(-15px); }
        }
        @keyframes parachute-sway {
          0% { transform: translateX(-2px); }
          50% { transform: translateX(2px); }
          100% { transform: translateX(-2px); }
        }
        @keyframes music-bob { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-3px) rotate(1deg); } }
        @keyframes note-float { 0% { transform: translateY(0) scale(0.5); opacity: 0; } 30% { opacity: 1; } 100% { transform: translateY(-40px) scale(1); opacity: 0; } }
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }

        .animate-eat { animation: eat 0.4s ease-in-out; }
        .animate-pulse-fast { animation: pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        .animate-shake { animation: shake 0.3s ease-in-out infinite; }
        .animate-land-sway { animation: land-sway 1.5s ease-in-out infinite; }
        .animate-spawn { animation: spawn-pop 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; animation-delay: 0.3s; }
        .animate-portal { animation: portal-pulse 2s ease-in-out forwards; }
        .animate-body-bounce { animation: body-bounce 0.6s ease-in-out infinite; }
        .animate-sick { animation: sick-wobble 2s ease-in-out infinite; }
        .animate-parachute-sway { animation: parachute-sway 1.2s ease-in-out infinite; }
        .animate-vibing { animation: music-bob 1.2s ease-in-out infinite; }
        .animate-float { animation: float 3s ease-in-out infinite; }
        
        .smoke-particle {
          transform-box: fill-box;
          transform-origin: center;
          animation: smoke-puff 0.8s ease-out infinite;
        }
        .note-particle {
            animation: note-float 2s ease-out infinite;
            transform-origin: center;
        }
        
        .wheel-spin { transform-box: fill-box; transform-origin: center; animation: spin-wheel 1s linear infinite; }
        .wheel-spin-back { transform-box: fill-box; transform-origin: center; animation: spin-wheel-back 1s linear infinite; }
        .wheel-spin-slow { transform-box: fill-box; transform-origin: center; animation: spin-wheel 8s linear infinite; }
        .robot-container { transition-property: left, bottom; will-change: left, bottom; }
        .robot-container.landing { transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1); }
        .robot-container.walking { transition-timing-function: linear; }
        .robot-container.dragging { transition: none !important; cursor: grabbing; }
        .face-features { transition: transform 0.3s ease-in-out; }
      `}</style>

      <div
        ref={mascotRef}
        className={containerClasses}
        style={listeningStyle}
        onTransitionEnd={handleTransitionEnd}
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
        onClick={handleClick}
        onMouseMove={handleHoverMove}
      >
        {/* Music Notes Animation */}
        {isListening && (
            <div className="absolute top-[-50px] left-1/2 -translate-x-1/2 w-24 h-24 pointer-events-none opacity-80">
                <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                    <text x="30" y="60" fill="#3b82f6" fontSize="16" className="note-particle" style={{ animationDelay: '0s', animationDuration: '3s' }}>♪</text>
                    <text x="60" y="50" fill="#8b5cf6" fontSize="20" className="note-particle" style={{ animationDelay: '1s', animationDuration: '3.5s' }}>♫</text>
                </svg>
            </div>
        )}

        {/* Speech Bubble - Hide in preview */}
        {!isPreview && (
            <div
            className={`absolute bottom-[100px] left-1/2 -translate-x-1/2 w-52 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 py-2 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-600 text-xs font-medium text-center transition-all duration-300 z-50 ${
                showDialog
                ? 'opacity-100 translate-y-0 scale-100'
                : 'opacity-0 translate-y-2 scale-95'
            }`}
            >
            {dialog}
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white dark:bg-slate-800 border-b border-r border-slate-200 dark:border-slate-600 transform rotate-45" />
            </div>
        )}

        {/* Portal */}
        {isSpawning && !isPreview && (
          <div className="absolute bottom-[10px] left-1/2 -translate-x-1/2 w-20 h-5 bg-blue-500/50 blur-md rounded-[100%] animate-portal z-0" />
        )}

        {/* Shock Flash */}
        {showShockFlash && !isPreview && (
          <div className="absolute inset-0 bg-white/60 rounded-full blur-sm pointer-events-none z-40" />
        )}

        {/* Cracks Effect */}
        {showCracks && !isPreview && (
          <svg
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-24 h-8 pointer-events-none z-0 opacity-80"
            viewBox="0 0 100 40"
          >
            <path
              d="M10 20 L30 22 L40 15 L50 25 L60 18 L80 22 L90 18"
              fill="none"
              stroke="#475569"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M45 25 L40 35"
              fill="none"
              stroke="#475569"
              strokeWidth="2"
            />
            <path
              d="M55 25 L60 33"
              fill="none"
              stroke="#475569"
              strokeWidth="2"
            />
          </svg>
        )}

        {/* Robot Wrapper */}
        <div
          className={`relative w-24 h-24 z-10 ${isListening ? 'pointer-events-auto' : ''} ${
            isLanding && !isParachuting && !isPreview ? 'animate-land-sway' : ''
          } ${isSpawning && !isPreview ? 'opacity-0 animate-spawn' : ''} ${
            mood === 'angry' && !isPreview ? 'animate-shake' : ''
          } ${
            (mood === 'sick' || mood === 'broken') && !isWalking && !isPreview
              ? 'animate-sick'
              : ''
          } ${isParachuting && !isPreview ? 'animate-parachute-sway' : ''} ${isListening ? 'animate-vibing' : ''}`}
        >
          {/* Aura */}
          <div
            className={`absolute inset-0 rounded-full blur-2xl transition-all duration-500 ${style.auraClass}`}
          />

          {/* Main SVG */}
          <svg
            viewBox="0 -30 100 150"
            className={`w-full h-full drop-shadow-lg ${
              isEating ? 'animate-eat' : ''
            }`}
            style={{ overflow: 'visible' }}
          >
            <defs>
                <linearGradient id="grad-gold" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#fcd34d', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: '#d97706', stopOpacity: 1 }} />
                </linearGradient>
            </defs>

            {/* Big Strike */}
            {showBigStrike && !isPreview && (
              <g className="pointer-events-none">
                <path
                  d="M50 -10 L45 15 L55 15 L48 40 L60 40 L52 70"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M52 10 L48 25"
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="2"
                />
              </g>
            )}

            {/* Small Strike */}
            {showSmallStrike && !isPreview && (
              <g className="pointer-events-none">
                <path
                  d="M80 20 L75 30 L82 30 L78 40"
                  fill="none"
                  stroke="#fde68a"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            )}

            {/* Parachute */}
            {isParachuting && !isPreview && (
              <g className="pointer-events-none">
                <path
                  d="M25 20 Q50 -5 75 20 Z"
                  fill="#e5e7eb"
                  stroke="#94a3b8"
                  strokeWidth="2"
                />
                <path
                  d="M25 20 Q37.5 5 50 20 Q62.5 5 75 20"
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth="1.5"
                />
                <line
                  x1="30"
                  y1="20"
                  x2="35"
                  y2="30"
                  stroke="#cbd5e1"
                  strokeWidth="2"
                />
                <line
                  x1="50"
                  y1="20"
                  x2="50"
                  y2="30"
                  stroke="#cbd5e1"
                  strokeWidth="2"
                />
                <line
                  x1="70"
                  y1="20"
                  x2="65"
                  y2="30"
                  stroke="#cbd5e1"
                  strokeWidth="2"
                />
              </g>
            )}

            {/* Smoke Particles */}
            {isWalking && !isDragging && !isParachuting && !isListening && !isPreview && (
              <g className="smoke-group">
                <circle
                  cx={direction === 'right' ? 20 : 80}
                  cy="95"
                  r="4"
                  fill="#94a3b8"
                  className="smoke-particle"
                  style={{ '--tx': direction === 'right' ? '-20px' : '20px' } as CSSProperties}
                />
                <circle
                  cx={direction === 'right' ? 15 : 85}
                  cy="98"
                  r="3"
                  fill="#cbd5e1"
                  className="smoke-particle"
                  style={{ animationDelay: '0.2s', '--tx': direction === 'right' ? '-25px' : '25px' } as CSSProperties}
                />
                <circle
                  cx={direction === 'right' ? 25 : 75}
                  cy="92"
                  r="2"
                  fill="#e2e8f0"
                  className="smoke-particle"
                  style={{ animationDelay: '0.4s', '--tx': direction === 'right' ? '-15px' : '15px' } as CSSProperties}
                />
              </g>
            )}

            {/* Body Group */}
            <g className={isWalking && !isDragging && !isListening && !isPreview ? 'animate-body-bounce' : ''}>
              
              {/* Antenna */}
              <g>
                <line
                  x1="50"
                  y1="30"
                  x2="50"
                  y2="0"
                  stroke={palette.bodyStroke}
                  strokeWidth="4"
                  style={{ transition: 'all 0.5s ease' }}
                />
                <circle
                  cx="50"
                  cy="0"
                  r="4"
                  fill={mood === 'powerful' ? '#ef4444' : '#94a3b8'}
                  className={mood === 'powerful' ? 'animate-pulse' : ''}
                />
              </g>

              {/* Body Rect */}
              <rect
                x="25"
                y="30"
                width="50"
                height="50"
                rx="12"
                fill={style.bodyFill}
                stroke={style.bodyStroke}
                strokeWidth="2"
                style={{ transition: 'all 0.5s ease' }}
              />

              {/* Face */}
              <g className="face-features" transform={faceTransform}>
                <rect
                  x="32"
                  y="38"
                  width="36"
                  height="28"
                  rx="6"
                  fill={style.faceFill}
                  style={{ transition: 'all 0.5s ease' }}
                />
                <g transform="translate(0, 2)">
                  {eyes === 'open' && (
                    <>
                      <circle cx="42" cy="50" r="4" fill={style.eyeColor} />
                      <circle cx="58" cy="50" r="4" fill={style.eyeColor} />
                    </>
                  )}
                  {eyes === 'blink' && (
                    <>
                      <line x1="38" y1="50" x2="46" y2="50" stroke={style.eyeColor} strokeWidth="2" />
                      <line x1="54" y1="50" x2="62" y2="50" stroke={style.eyeColor} strokeWidth="2" />
                    </>
                  )}
                  {eyes === 'happy' && (
                    <>
                      <path d="M38 52 Q42 46 46 52" fill="none" stroke={style.eyeColor} strokeWidth="2" strokeLinecap="round" />
                      <path d="M54 52 Q58 46 62 52" fill="none" stroke={style.eyeColor} strokeWidth="2" strokeLinecap="round" />
                    </>
                  )}
                  {eyes === 'angry' && (
                    <>
                      <path d="M38 48 L46 52" stroke={style.eyeColor} strokeWidth="3" strokeLinecap="round" />
                      <path d="M62 48 L54 52" stroke={style.eyeColor} strokeWidth="3" strokeLinecap="round" />
                      <circle cx="42" cy="54" r="3" fill={style.eyeColor} />
                      <circle cx="58" cy="54" r="3" fill={style.eyeColor} />
                    </>
                  )}
                  {eyes === 'wide' && (
                    <>
                      <circle cx="42" cy="50" r="6" fill="white" />
                      <circle cx="42" cy="50" r="2" fill="black" />
                      <circle cx="58" cy="50" r="6" fill="white" />
                      <circle cx="58" cy="50" r="2" fill="black" />
                    </>
                  )}
                  {eyes === 'dead-left' && (
                    <>
                      <DeadEye cx={42} cy={50} />
                      <circle cx="58" cy="50" r="4" fill={style.eyeColor} />
                    </>
                  )}
                  {eyes === 'dead-both' && (
                    <>
                      <DeadEye cx={42} cy={50} />
                      <DeadEye cx={58} cy={50} />
                    </>
                  )}
                  {eyes === 'sad' && (
                    <>
                      <path d="M38 52 Q42 48 46 52" fill="none" stroke={style.eyeColor} strokeWidth="2" strokeLinecap="round" />
                      <path d="M54 52 Q58 48 62 52" fill="none" stroke={style.eyeColor} strokeWidth="2" strokeLinecap="round" />
                    </>
                  )}
                </g>
                
                {renderGlasses()}

                <g transform="translate(0, 5)">
                  {isEating ? (
                    <circle cx="50" cy="60" r="6" className="fill-red-400 animate-ping" />
                  ) : style.mouthType === 'happy' ? (
                    <path d="M45 60 Q50 65 55 60" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  ) : style.mouthType === 'sad' ? (
                    <path d="M45 62 Q50 58 55 62" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  ) : style.mouthType === 'o' ? (
                    <circle cx="50" cy="60" r="4" stroke="white" strokeWidth="2" fill="none" />
                  ) : (
                    <line x1="46" y1="60" x2="54" y2="60" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  )}
                </g>
              </g>

              {renderHat()}

              {/* Arms */}
              {isDragging ? (
                <g>
                  <path d="M25 50 L15 30" stroke={style.bodyStroke} strokeWidth="4" strokeLinecap="round" style={{ transition: 'all 0.5s ease' }} />
                  <path d="M75 50 L85 30" stroke={style.bodyStroke} strokeWidth="4" strokeLinecap="round" style={{ transition: 'all 0.5s ease' }} />
                </g>
              ) : (
                <g>
                  <path d="M25 50 Q15 50 15 65" fill="none" stroke={style.bodyStroke} strokeWidth="4" className={mood === 'powerful' ? 'animate-pulse' : ''} style={{ transition: 'all 0.5s ease' }} />
                  <path d="M75 50 Q85 50 85 65" fill="none" stroke={style.bodyStroke} strokeWidth="4" className={mood === 'powerful' ? 'animate-pulse' : ''} style={{ transition: 'all 0.5s ease' }} />
                </g>
              )}
            </g>

            {/* Wheels */}
            <g className="wheels">
              <rect
                x="35"
                y="80"
                width="30"
                height="6"
                rx="2"
                fill={style.bodyStroke}
                style={{ transition: 'all 0.5s ease' }}
              />
              <g
                className={
                  isWalking && !isParachuting && !isListening && !isPreview
                    ? direction === 'right'
                      ? 'wheel-spin'
                      : 'wheel-spin-back'
                    : isPreview && recentAction === 'idle' ? 'wheel-spin-slow' : ''
                }
              >
                <circle cx="35" cy="90" r="12" fill="#1e293b" stroke="#475569" strokeWidth="2" />
                <circle cx="35" cy="90" r="4" fill="#94a3b8" />
                <path d="M35 78 L35 82 M35 98 L35 102 M23 90 L27 90 M43 90 L47 90" stroke="white" strokeWidth="2" />
              </g>
              <g
                className={
                  isWalking && !isParachuting && !isListening && !isPreview
                    ? direction === 'right'
                      ? 'wheel-spin'
                      : 'wheel-spin-back'
                    : isPreview && recentAction === 'idle' ? 'wheel-spin-slow' : ''
                }
              >
                <circle cx="65" cy="90" r="12" fill="#1e293b" stroke="#475569" strokeWidth="2" />
                <circle cx="65" cy="90" r="4" fill="#94a3b8" />
                <path d="M65 78 L65 82 M65 98 L65 102 M53 90 L57 90 M73 90 L77 90" stroke="white" strokeWidth="2" />
              </g>
            </g>

            {/* Sick/Broken Sparks */}
            {style.showSpark && !isPreview && (
              <g>
                <path
                  d="M80 30 L85 25 L90 35"
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="2"
                  className="animate-ping"
                  style={{ animationDuration: mood === 'broken' ? '0.5s' : '1s' }}
                />
                <path
                  d="M15 80 L10 85 L5 75"
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="2"
                  className="animate-ping"
                  style={{ animationDuration: mood === 'broken' ? '0.7s' : '1.5s' }}
                />
              </g>
            )}
          </svg>
        </div>
      </div>
    </div>
  );
};

export default Mascot;
