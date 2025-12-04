
import React, { useState, useEffect } from 'react';
import { FATE_CARDS } from '../constants';
import { FateCard } from '../types';
import SparklesIcon from './icons/SparklesIcon';

interface DailyFateModalProps {
  onSelectCard: (card: FateCard) => void;
}

const DailyFateModal: React.FC<DailyFateModalProps> = ({ onSelectCard }) => {
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [shuffledCards, setShuffledCards] = useState<FateCard[]>([]);
  const [isClosing, setIsClosing] = useState(false);

  // Shuffle cards on mount to ensure randomness visually
  useEffect(() => {
    const shuffled = [...FATE_CARDS].sort(() => Math.random() - 0.5);
    setShuffledCards(shuffled);
  }, []);

  const handleCardClick = (index: number) => {
    if (isRevealed) return;
    setSelectedCardIndex(index);
    setIsRevealed(true);

    // Wait for animation then callback
    setTimeout(() => {
        setIsClosing(true);
        setTimeout(() => {
            onSelectCard(shuffledCards[index]);
        }, 500);
    }, 2500);
  };

  return (
    <div className={`fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-opacity duration-500 ${isClosing ? 'opacity-0' : 'opacity-100'}`}>
      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
        
        @keyframes float-card {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
        .animate-float-1 { animation: float-card 3s ease-in-out infinite; }
        .animate-float-2 { animation: float-card 3.5s ease-in-out infinite; animation-delay: 0.5s; }
        .animate-float-3 { animation: float-card 4s ease-in-out infinite; animation-delay: 1s; }
        
        @keyframes glow-pulse {
            0%, 100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.5); }
            50% { box-shadow: 0 0 40px rgba(147, 51, 234, 0.8); }
        }
        .card-glow { animation: glow-pulse 2s infinite; }
      `}</style>

      <div className="w-full max-w-4xl flex flex-col items-center">
        <div className={`text-center mb-12 transition-all duration-500 ${isRevealed ? 'opacity-0 -translate-y-10' : 'opacity-100'}`}>
            <div className="inline-flex items-center justify-center p-3 bg-purple-900/50 rounded-full mb-4 border border-purple-500/30 backdrop-blur-md">
                <SparklesIcon className="w-6 h-6 text-purple-300 animate-pulse" />
            </div>
            <h2 className="text-4xl font-bold text-white mb-2 tracking-tight">Pilih Takdirmu</h2>
            <p className="text-purple-200 text-lg">Satu kartu akan menentukan keberuntunganmu hari ini.</p>
        </div>

        {isRevealed && (
             <div className="absolute top-1/4 text-center z-50 animate-fade-in">
                 <h3 className="text-3xl font-bold text-white mb-2 text-shadow-lg">{shuffledCards[selectedCardIndex!].name}</h3>
                 <p className="text-white/80 bg-black/30 px-4 py-1 rounded-full backdrop-blur-md">Kartu Terpilih!</p>
             </div>
        )}

        <div className="flex flex-col md:flex-row gap-6 md:gap-8 w-full justify-center items-center h-[400px]">
          {shuffledCards.map((card, index) => {
            const isSelected = selectedCardIndex === index;
            const isOther = isRevealed && !isSelected;
            
            return (
              <div 
                key={index}
                className={`
                    relative w-64 h-96 cursor-pointer transition-all duration-700 perspective-1000
                    ${!isRevealed ? `animate-float-${index + 1}` : ''}
                    ${isOther ? 'opacity-0 scale-75 pointer-events-none' : ''}
                    ${isSelected ? 'scale-110 z-20 -translate-y-10' : 'hover:scale-105'}
                `}
                onClick={() => handleCardClick(index)}
              >
                <div className={`relative w-full h-full transform-style-3d transition-transform duration-700 ${isSelected && isRevealed ? 'rotate-y-180' : ''}`}>
                    
                    {/* CARD BACK (Cover) */}
                    <div className="absolute inset-0 w-full h-full backface-hidden rounded-2xl overflow-hidden border-2 border-purple-500/30 shadow-2xl bg-slate-900">
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-black opacity-90"></div>
                        {/* Pattern */}
                        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.3) 1px, transparent 0)', backgroundSize: '20px 20px' }}></div>
                        
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-24 h-24 rounded-full border-4 border-purple-500/50 flex items-center justify-center card-glow">
                                <span className="text-4xl select-none">?</span>
                            </div>
                        </div>
                        <div className="absolute bottom-4 w-full text-center">
                            <span className="text-xs uppercase tracking-[0.3em] text-purple-400/60 font-bold">Flowmind Fate</span>
                        </div>
                    </div>

                    {/* CARD FRONT (Revealed) */}
                    <div className={`absolute inset-0 w-full h-full backface-hidden rounded-2xl overflow-hidden border-4 border-white/20 shadow-2xl rotate-y-180 bg-gradient-to-br ${card.color}`}>
                        <div className="absolute inset-0 bg-black/10"></div>
                        <div className="relative h-full flex flex-col items-center justify-between p-6 text-white">
                            <div className="mt-4 text-center">
                                <span className="text-6xl drop-shadow-md">{card.icon}</span>
                            </div>
                            
                            <div className="text-center">
                                <h3 className="text-2xl font-bold mb-2 drop-shadow-md">{card.name}</h3>
                                <div className="h-1 w-12 bg-white/50 mx-auto rounded-full mb-4"></div>
                                <p className="text-sm font-medium leading-relaxed opacity-90 bg-black/10 p-3 rounded-xl backdrop-blur-sm">
                                    {card.description}
                                </p>
                            </div>

                            <div className="w-full pt-4 border-t border-white/20 flex justify-between items-center opacity-80">
                                <span className="text-xs font-bold uppercase tracking-wider">Daily Buff</span>
                                <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded">Aktif</span>
                            </div>
                        </div>
                    </div>

                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DailyFateModal;
