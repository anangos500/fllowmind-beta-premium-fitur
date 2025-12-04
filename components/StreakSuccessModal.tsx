import React, { useState, useRef, useMemo } from 'react';
import FireIcon from './icons/FireIcon';
import html2canvas from 'html2canvas';
import LoaderIcon from './icons/LoaderIcon';

interface StreakSuccessModalProps {
  streakDays: number;
  onClose: () => void;
}

const StreakSuccessModal: React.FC<StreakSuccessModalProps> = ({ streakDays, onClose }) => {
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Konfigurasi Level Streak
  const config = useMemo(() => {
    if (streakDays <= 3) {
      return {
        level: 'Spark',
        title: 'Awal Bagus!',
        message: 'Percikan api kecil untuk memulai sesuatu yang besar. Lanjutkan!',
        gradientText: 'from-blue-400 via-cyan-400 to-teal-400',
        fireColor: 'text-blue-500',
        coreColor: 'text-cyan-200',
        glowColor: 'bg-cyan-500',
        badgeBg: 'bg-cyan-500/20',
        badgeBorder: 'border-cyan-500/50',
        badgeText: 'text-cyan-300',
        particleColor: 'bg-blue-300'
      };
    } else if (streakDays <= 7) {
      return {
        level: 'Heating Up',
        title: 'Mulai Panas!',
        message: 'Konsistensi mulai terbentuk. Jangan biarkan apinya padam!',
        gradientText: 'from-yellow-400 via-orange-400 to-amber-500',
        fireColor: 'text-orange-500',
        coreColor: 'text-yellow-200',
        glowColor: 'bg-yellow-500',
        badgeBg: 'bg-yellow-500/20',
        badgeBorder: 'border-yellow-500/50',
        badgeText: 'text-yellow-300',
        particleColor: 'bg-yellow-200'
      };
    } else if (streakDays <= 20) {
      return {
        level: 'On Fire',
        title: 'Kamu On Fire!',
        message: 'Luar biasa! Produktivitasmu sedang berada di puncak!',
        gradientText: 'from-orange-500 via-red-500 to-rose-600',
        fireColor: 'text-red-600',
        coreColor: 'text-orange-300',
        glowColor: 'bg-orange-500',
        badgeBg: 'bg-orange-500/20',
        badgeBorder: 'border-orange-500/50',
        badgeText: 'text-orange-300',
        particleColor: 'bg-red-300'
      };
    } else {
      return {
        level: 'Legendary',
        title: 'Mode Legendaris!',
        message: '21+ Hari! Kebiasaan sukses kini sudah menjadi bagian darimu.',
        gradientText: 'from-purple-400 via-pink-500 to-rose-500',
        fireColor: 'text-purple-600',
        coreColor: 'text-pink-300',
        glowColor: 'bg-purple-500',
        badgeBg: 'bg-purple-500/20',
        badgeBorder: 'border-purple-500/50',
        badgeText: 'text-purple-300',
        particleColor: 'bg-pink-300'
      };
    }
  }, [streakDays]);

  const handleClose = () => {
    setIsAnimatingOut(true);
    setTimeout(onClose, 300);
  };

  const handleShare = async () => {
    if (!cardRef.current) return;
    setIsSharing(true);

    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
      });

      const imageBlob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));

      if (!imageBlob) throw new Error("Gagal membuat gambar");

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([imageBlob], 'streak.png', { type: 'image/png' })] })) {
        const file = new File([imageBlob], `flowmind-streak-${streakDays}.png`, { type: 'image/png' });
        await navigator.share({
          title: `Flowmind Streak: ${streakDays} Hari!`,
          text: `Saya mencapai level ${config.level}! ${streakDays} hari berturut-turut produktif. 🔥`,
          files: [file],
        });
      } else {
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `flowmind-streak-${streakDays}.png`;
        link.click();
      }
    } catch (error) {
      console.error("Error sharing:", error);
      alert("Gagal membagikan streak. Coba lagi.");
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-opacity duration-500 ${isAnimatingOut ? 'opacity-0' : 'opacity-100'}`}>

      {/* Inline Styles untuk animasi api */}
      <style>{`
        @keyframes flame-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.9; }
        }
        @keyframes flame-core-pulse {
          0%, 100% { transform: scale(1) translate(-50%, 0); opacity: 0.8; }
          50% { transform: scale(0.9) translate(-50%, 2px); opacity: 1; }
        }
        .animate-flame { animation: flame-pulse 2s ease-in-out infinite; }
        .animate-flame-core { animation: flame-core-pulse 1.5s ease-in-out infinite; }
      `}</style>

      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      ></div>

      <div className={`relative w-full max-w-sm transform transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) ${isAnimatingOut ? 'scale-90 translate-y-10' : 'scale-100 translate-y-0'}`}>
        <div 
            ref={cardRef}
            className="relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 text-center overflow-hidden border border-slate-700 shadow-2xl"
        >
            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 ${config.glowColor} opacity-20 rounded-full blur-3xl -mt-20 animate-pulse`}></div>
            <div className={`absolute bottom-0 right-0 w-40 h-40 ${config.glowColor} opacity-10 rounded-full blur-3xl -mb-10`}></div>

            <div className="relative z-10 flex flex-col items-center">
                <div className="mb-2">
                    <span className={`inline-block px-3 py-1 rounded-full ${config.badgeBg} border ${config.badgeBorder} ${config.badgeText} text-xs font-bold tracking-wider uppercase shadow-[0_0_10px_rgba(0,0,0,0.2)]`}>
                        {config.level} Streak
                    </span>
                </div>

                {/* FIRE VISUAL */}
                <div className="relative w-40 h-40 my-4 flex items-center justify-center">
                    <div className={`absolute inset-0 ${config.glowColor} blur-2xl opacity-30 animate-pulse`}></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <FireIcon className={`w-40 h-40 ${config.fireColor} drop-shadow-2xl animate-flame`} />
                    </div>
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                        <FireIcon className={`w-24 h-24 ${config.coreColor} opacity-90 animate-flame-core`} />
                    </div>

                    <div className={`absolute top-4 right-6 w-2 h-2 ${config.particleColor} rounded-full animate-ping`} style={{ animationDuration: '1.2s' }}></div>
                    <div className={`absolute bottom-8 left-6 w-1.5 h-1.5 ${config.particleColor} rounded-full animate-ping`} style={{ animationDuration: '1.8s' }}></div>
                </div>

                <h2 className={`text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r ${config.gradientText} mb-1 drop-shadow-sm`}>
                    {streakDays}
                </h2>
                <h3 className="text-xl font-bold text-white mb-4">Hari Beruntun!</h3>
                
                <div className="bg-slate-800/50 rounded-xl p-3 mb-6 border border-slate-700">
                    <h4 className={`text-sm font-bold ${config.fireColor} mb-1`}>{config.title}</h4>
                    <p className="text-slate-400 text-xs leading-relaxed">
                        {config.message}
                    </p>
                </div>
            </div>
        </div>

        <div className="mt-6 space-y-3">
            <button
                onClick={handleShare}
                disabled={isSharing}
                className={`w-full py-3.5 px-6 bg-gradient-to-r ${config.gradientText} hover:opacity-90 text-white font-bold rounded-xl shadow-lg transform transition-transform active:scale-95 flex items-center justify-center gap-2`}
            >
                {isSharing ? (
                    <>
                        <LoaderIcon className="w-5 h-5 animate-spin" />
                        Memproses...
                    </>
                ) : (
                    <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                        Pamerkan Pencapaian
                    </>
                )}
            </button>
            
            <button
                onClick={handleClose}
                className="w-full py-3.5 px-6 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition-colors"
            >
                Lanjutkan
            </button>
        </div>
      </div>
    </div>
  );
};

export default StreakSuccessModal;
