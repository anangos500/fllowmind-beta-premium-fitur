
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CanvasNote } from '../types';
import { useCanvas } from '../hooks/useCanvas';
import PlusIcon from './icons/PlusIcon';
import PinIcon from './icons/PinIcon';
import TrashIcon from './icons/TrashIcon';
import XIcon from './icons/XIcon';
import LoaderIcon from './icons/LoaderIcon';
import TackIcon from './icons/TackIcon';

// Palet warna yang lebih solid dan tegas untuk mode gelap
const NOTE_THEMES = {
  yellow: {
    container: 'bg-[#fffde7] dark:bg-[#422006] border-[#fff59d] dark:border-[#78350f]',
    header: 'border-b border-[#fbc02d]/20 dark:border-[#f59e0b]/30',
    text: 'text-slate-800 dark:text-[#fef3c7]',
    placeholder: 'placeholder-slate-400 dark:placeholder-[#fcd34d]/50',
    icon: 'text-[#fbc02d] dark:text-[#fbbf24]',
    selection: 'bg-[#fbc02d]', 
  },
  blue: {
    container: 'bg-[#e3f2fd] dark:bg-[#172554] border-[#90caf9] dark:border-[#1e40af]',
    header: 'border-b border-[#2196f3]/20 dark:border-[#3b82f6]/30',
    text: 'text-slate-800 dark:text-[#dbeafe]',
    placeholder: 'placeholder-slate-400 dark:placeholder-[#93c5fd]/50',
    icon: 'text-[#2196f3] dark:text-[#60a5fa]',
    selection: 'bg-[#2196f3]',
  },
  green: {
    container: 'bg-[#e8f5e9] dark:bg-[#052e16] border-[#a5d6a7] dark:border-[#15803d]',
    header: 'border-b border-[#4caf50]/20 dark:border-[#22c55e]/30',
    text: 'text-slate-800 dark:text-[#dcfce7]',
    placeholder: 'placeholder-slate-400 dark:placeholder-[#86efac]/50',
    icon: 'text-[#4caf50] dark:text-[#4ade80]',
    selection: 'bg-[#4caf50]',
  },
  pink: {
    container: 'bg-[#fce4ec] dark:bg-[#500724] border-[#f48fb1] dark:border-[#9d174d]',
    header: 'border-b border-[#e91e63]/20 dark:border-[#ec4899]/30',
    text: 'text-slate-800 dark:text-[#fce7f3]',
    placeholder: 'placeholder-slate-400 dark:placeholder-[#f9a8d4]/50',
    icon: 'text-[#e91e63] dark:text-[#f472b6]',
    selection: 'bg-[#e91e63]',
  },
  purple: {
    container: 'bg-[#f3e5f5] dark:bg-[#2e1065] border-[#ce93d8] dark:border-[#7e22ce]',
    header: 'border-b border-[#9c27b0]/20 dark:border-[#a855f7]/30',
    text: 'text-slate-800 dark:text-[#f3e8ff]',
    placeholder: 'placeholder-slate-400 dark:placeholder-[#d8b4fe]/50',
    icon: 'text-[#9c27b0] dark:text-[#c084fc]',
    selection: 'bg-[#9c27b0]',
  },
};

const ZoomOutIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="8" y1="12" x2="16" y2="12"></line>
    </svg>
);

const ZoomInIconSvg = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="16"></line>
        <line x1="8" y1="12" x2="16" y2="12"></line>
    </svg>
);

// --- Sub-component for Individual Note Card ---
interface CanvasNoteCardProps {
    note: CanvasNote;
    theme: typeof NOTE_THEMES['yellow'];
    isDragging: boolean;
    isResizing: boolean;
    onStartDrag: (e: React.MouseEvent, note: CanvasNote) => void;
    onStartResize: (e: React.MouseEvent, note: CanvasNote) => void;
    onContentChange: (id: string, field: 'title' | 'content', value: string) => void;
    onPinToggle: (id: string, currentPinned: boolean) => void;
    onColorChange: (id: string, color: CanvasNote['color']) => void;
    onDelete: (id: string) => void;
}

const CanvasNoteCard: React.FC<CanvasNoteCardProps> = ({
    note,
    theme,
    isDragging,
    isResizing,
    onStartDrag,
    onStartResize,
    onContentChange,
    onPinToggle,
    onColorChange,
    onDelete,
}) => {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDeleteRequest = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsDeleting(true);
        setTimeout(() => {
            onDelete(note.id);
        }, 600); // Wait for animation
    };

    return (
        <div
            style={{
                position: 'absolute',
                left: `${note.x}px`,
                top: `${note.y}px`,
                width: `${note.width}px`,
                height: `${note.height}px`,
                zIndex: isDragging || isResizing ? 50 : (note.isPinned ? 40 : 1),
            }}
            className={`
                flex flex-col 
                rounded-xl 
                border-2 
                shadow-sm
                ${theme.container} 
                ${note.isPinned ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-slate-500 dark:ring-offset-slate-900' : ''} 
                ${isDragging ? 'shadow-2xl cursor-grabbing scale-[1.02] transition-none' : 'shadow-md transition-all duration-200'}
                ${isDeleting ? 'animate-crumple' : ''}
            `}
        >
            {/* Pinned Tack Visual - Updated position & animation */}
            {note.isPinned && (
                <div className={`absolute -top-4 left-1/2 -translate-x-1/2 z-[60] filter drop-shadow-sm transition-transform duration-300 ${isDeleting ? 'animate-pin-fall' : 'animate-bounce-subtle'}`}>
                    <TackIcon className="w-10 h-10" />
                </div>
            )}

            {/* Header / Drag Handle */}
            <div 
                className={`px-5 py-4 flex justify-between items-start ${theme.header} ${note.isPinned ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}
                onMouseDown={(e) => onStartDrag(e, note)}
            >
                <input
                    type="text"
                    value={note.title}
                    onChange={(e) => onContentChange(note.id, 'title', e.target.value)}
                    placeholder="Judul..."
                    className={`bg-transparent border-none focus:outline-none font-extrabold text-lg ${theme.text} w-full mr-3 ${theme.placeholder}`}
                    onMouseDown={(e) => e.stopPropagation()}
                />
                
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 note-actions">
                    {/* Color Picker - Improved Stability with Bridge */}
                    <div className="relative group/color h-7 flex items-center justify-center">
                        <button className={`p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${theme.text}`}>
                            <div className={`w-3 h-3 rounded-full ${theme.selection}`}></div>
                        </button>
                        
                        {/* Improved Bridge: Wraps both button and menu space to prevent closing */}
                        <div className="absolute top-0 right-0 w-[150px] h-[40px] -z-10 hidden group-hover/color:block"></div>

                        <div className="absolute top-full right-0 pt-2 hidden group-hover/color:block z-50">
                            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-2 flex gap-1.5">
                                {(Object.keys(NOTE_THEMES) as CanvasNote['color'][]).map(c => (
                                    <button
                                        key={c}
                                        onClick={(e) => { e.stopPropagation(); onColorChange(note.id, c); }}
                                        className={`w-6 h-6 rounded-full border-2 border-white dark:border-slate-600 hover:scale-110 transition-transform shadow-sm ${NOTE_THEMES[c].selection}`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={(e) => { e.stopPropagation(); onPinToggle(note.id, note.isPinned); }}
                        className={`p-1.5 rounded-full transition-colors hover:bg-black/5 dark:hover:bg-white/10 ${theme.text} ${note.isPinned ? 'opacity-100 text-blue-500' : 'opacity-50 hover:opacity-100'}`}
                        title={note.isPinned ? "Lepas Pin" : "Pasang Pin"}
                    >
                        <PinIcon className="w-4 h-4" filled={note.isPinned} />
                    </button>
                    
                    <button 
                        onClick={handleDeleteRequest}
                        className={`p-1.5 rounded-full transition-colors hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400 hover:text-red-600`}
                        title="Hapus"
                    >
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </div>
                <style>{`
                    .note-actions { opacity: 0; }
                    div:hover > div > .note-actions { opacity: 1; }
                `}</style>
            </div>

            {/* Content Body */}
            <div className="flex-grow p-5 relative">
                <textarea
                    value={note.content}
                    onChange={(e) => onContentChange(note.id, 'content', e.target.value)}
                    placeholder="Tulis sesuatu..."
                    className={`w-full h-full bg-transparent border-none focus:outline-none resize-none text-base leading-relaxed ${theme.text} ${theme.placeholder}`}
                    onMouseDown={(e) => e.stopPropagation()}
                    spellCheck={false}
                />
                
                {/* Custom Resize Handle */}
                <div 
                    className={`absolute bottom-0 right-0 w-10 h-10 cursor-nwse-resize flex items-end justify-end p-2 opacity-50 hover:opacity-100 ${theme.text}`}
                    onMouseDown={(e) => onStartResize(e, note)}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15l-6 6" />
                        <path d="M21 9l-12 12" />
                    </svg>
                </div>
            </div>
        </div>
    );
};


const CanvasView: React.FC = () => {
  const { notes, addNote, updateNote, deleteNote, loading } = useCanvas();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [resizingId, setResizingId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  
  // Use local state for smooth dragging interactions without DB lag
  const [dragPosition, setDragPosition] = useState<{x: number, y: number} | null>(null);
  const [resizeDims, setResizeDims] = useState<{width: number, height: number} | null>(null);
  
  // Refs for calculating deltas
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const resizeStart = useRef<{ x: number; y: number; w: number; h: number }>({ x: 0, y: 0, w: 0, h: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // --- Handlers for Note Actions ---

  const handleAddNote = () => {
    const offset = Math.random() * 40;
    const colors = Object.keys(NOTE_THEMES) as CanvasNote['color'][];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const centerX = 100 + (window.innerWidth / 2 - 140) / zoom; 
    const centerY = 100 + (window.innerHeight / 2 - 140) / zoom;

    addNote({
      title: 'Catatan Baru',
      content: '',
      x: centerX + offset,
      y: centerY + offset,
      width: 300, 
      height: 300,
      color: randomColor,
      isPinned: false,
    });
  };

  const handleColorChange = (id: string, color: CanvasNote['color']) => {
    updateNote(id, { color });
  };

  const handlePinToggle = (id: string, currentPinned: boolean) => {
    updateNote(id, { isPinned: !currentPinned });
  };

  const handleContentChange = (id: string, field: 'title' | 'content', value: string) => {
    updateNote(id, { [field]: value });
  };

  // --- Zoom Logic ---
  const handleZoomIn = () => {
      setZoom(prev => parseFloat(Math.min(prev + 0.1, 2.0).toFixed(1)));
  };

  const handleZoomOut = () => {
      setZoom(prev => parseFloat(Math.max(prev - 0.1, 0.5).toFixed(1)));
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        e.stopPropagation();
        const delta = e.deltaY * -0.001;
        setZoom(prev => {
            const newZoom = Math.min(Math.max(prev + delta, 0.5), 2.0);
            return parseFloat(newZoom.toFixed(2));
        });
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // --- Drag Logic ---

  const startDrag = (e: React.MouseEvent, note: CanvasNote) => {
    if (note.isPinned) return;
    e.stopPropagation();
    setDraggingId(note.id);
    setDragPosition({ x: note.x, y: note.y }); // Initialize local state
    dragOffset.current = {
      x: e.clientX / zoom - note.x,
      y: e.clientY / zoom - note.y,
    };
  };

  const startResize = (e: React.MouseEvent, note: CanvasNote) => {
    e.stopPropagation();
    e.preventDefault();
    setResizingId(note.id);
    setResizeDims({ width: note.width, height: note.height }); // Initialize local state
    resizeStart.current = {
      x: e.clientX,
      y: e.clientY,
      w: note.width,
      h: note.height,
    };
  };

  // --- Global Mouse Listeners for Drag/Resize ---

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (draggingId) {
      const newX = e.clientX / zoom - dragOffset.current.x;
      const newY = e.clientY / zoom - dragOffset.current.y;
      // Only update local state for performance
      setDragPosition({ x: newX, y: newY });
    } else if (resizingId) {
      const dx = (e.clientX - resizeStart.current.x) / zoom;
      const dy = (e.clientY - resizeStart.current.y) / zoom;
      const newW = Math.max(220, resizeStart.current.w + dx);
      const newH = Math.max(180, resizeStart.current.h + dy);
      // Only update local state
      setResizeDims({ width: newW, height: newH });
    }
  }, [draggingId, resizingId, zoom]);

  const handleMouseUp = useCallback(() => {
    if (draggingId && dragPosition) {
        // Commit change to DB only on mouse up
        updateNote(draggingId, dragPosition);
    }
    if (resizingId && resizeDims) {
        // Commit change to DB
        updateNote(resizingId, resizeDims);
    }
    
    setDraggingId(null);
    setResizingId(null);
    setDragPosition(null);
    setResizeDims(null);
  }, [draggingId, dragPosition, resizingId, resizeDims, updateNote]);

  useEffect(() => {
    if (draggingId || resizingId) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingId, resizingId, handleMouseMove, handleMouseUp]);


  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoaderIcon className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="w-full h-full relative overflow-hidden bg-[#f8fafc] dark:bg-[#0f172a]"
      style={{ 
        backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', 
        backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
        backgroundPosition: '10px 10px'
      }}
    >
      <style>{`
        @keyframes crumple {
          0% { transform: scale(1); filter: none; }
          20% { transform: scale(0.95) rotate(-2deg); }
          100% { transform: scale(0.8) rotate(5deg); opacity: 0; filter: grayscale(1) contrast(1.2); }
        }
        @keyframes pin-fall {
          0% { transform: translate(-50%, 0) rotate(0deg); }
          100% { transform: translate(-50%, 50px) rotate(45deg); opacity: 0; }
        }
        @keyframes bounce-subtle {
            0%, 100% { transform: translate(-50%, 0); }
            50% { transform: translate(-50%, -3px); }
        }
        .animate-crumple { animation: crumple 0.6s ease-in-out forwards; }
        .animate-pin-fall { animation: pin-fall 0.5s ease-in forwards; }
        .animate-bounce-subtle { animation: bounce-subtle 2s ease-in-out infinite; }
      `}</style>

      {/* Header - Title Only with Solid Shape */}
      <header className="absolute top-0 left-0 p-6 z-10 pointer-events-none">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl shadow-sm pointer-events-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-200">Catatan</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">Area bebas untuk ide kreatif Anda.</p>
        </div>
      </header>

      {/* Bottom Controls */}
      <div className="absolute bottom-8 right-8 flex flex-col-reverse sm:flex-row items-end sm:items-center gap-4 z-[60] pointer-events-auto">
        {/* Zoom Controls */}
        <div className="flex items-center bg-white dark:bg-slate-800 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 p-1">
            <button onClick={handleZoomOut} className="p-3 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors" title="Zoom Out (Ctrl + Scroll)">
                <ZoomOutIcon className="w-5 h-5" />
            </button>
            <span className="text-xs font-bold w-12 text-center text-slate-700 dark:text-slate-300 select-none">{Math.round(zoom * 100)}%</span>
            <button onClick={handleZoomIn} className="p-3 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors" title="Zoom In (Ctrl + Scroll)">
                <ZoomInIconSvg className="w-5 h-5" />
            </button>
        </div>

        {/* Add Note FAB */}
        <button 
          onClick={handleAddNote}
          className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-xl transition-all hover:scale-110 hover:rotate-90 flex items-center justify-center"
          title="Tambah Catatan"
        >
          <PlusIcon className="w-8 h-8" />
        </button>
      </div>

      {/* Infinite Canvas Area */}
      <div className="w-full h-full overflow-auto relative custom-scrollbar">
        <div 
            className="min-w-[3000px] min-h-[3000px] relative origin-top-left transition-transform duration-100 ease-out"
            style={{ transform: `scale(${zoom})` }}
        >
          {notes.map(note => {
            // Determine if we should use the local optimistic state or the confirmed DB state
            const isBeingDragged = draggingId === note.id;
            const isBeingResized = resizingId === note.id;
            
            // Merge properties based on activity
            const displayNote = {
                ...note,
                ...(isBeingDragged && dragPosition ? dragPosition : {}),
                ...(isBeingResized && resizeDims ? resizeDims : {})
            };

            return (
                <CanvasNoteCard
                  key={note.id}
                  note={displayNote}
                  theme={NOTE_THEMES[note.color]}
                  isDragging={isBeingDragged}
                  isResizing={isBeingResized}
                  onStartDrag={startDrag}
                  onStartResize={startResize}
                  onContentChange={handleContentChange}
                  onPinToggle={handlePinToggle}
                  onColorChange={handleColorChange}
                  onDelete={deleteNote}
                />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CanvasView;
