
import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { SHOP_ITEMS, COIN_REWARDS } from '../constants';
import { ItemType, ShopItem } from '../types';
import XIcon from './icons/XIcon';
import CoinsIcon from './icons/CoinsIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import ConfirmationModal from './ConfirmationModal';
import Mascot from './Mascot';
import FireIcon from './icons/FireIcon';

interface GamificationShopModalProps {
  onClose: () => void;
}

const GamificationShopModal: React.FC<GamificationShopModalProps> = ({ onClose }) => {
  const { profile, buyItem, equipItem } = useAuth();
  const [activeTab, setActiveTab] = useState<'robot' | 'theme'>('robot');
  const [filterType, setFilterType] = useState<'all' | 'head' | 'face' | 'skin'>('all');
  const [isProcessing, setIsProcessing] = useState<string | null>(null); // item id being processed
  const [modalMessage, setModalMessage] = useState<{title: string, message: string} | null>(null);
  
  // Preview Animation State
  const [previewAction, setPreviewAction] = useState<'idle' | 'eating' | 'celebrating'>('idle');

  // Info Popup State
  const [showInfoPopup, setShowInfoPopup] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const coins = profile?.coins || 0;
  const inventory = profile?.inventory || [];
  const equipped = profile?.equipped || {};

  // Discount Logic
  const activeCard = profile?.activeFateCard;
  const isDiscountActive = activeCard?.buffType === 'shop_discount';
  const discountValue = activeCard?.buffValue || 0; // e.g. 0.3

  // Check localStorage on mount
  useEffect(() => {
      const shouldHide = localStorage.getItem('hideCoinInfoPopup') === 'true';
      if (!shouldHide) {
          // Sedikit delay agar transisi modal utama selesai dulu
          const timer = setTimeout(() => setShowInfoPopup(true), 500);
          return () => clearTimeout(timer);
      }
  }, []);

  const handleCloseInfoPopup = () => {
      if (dontShowAgain) {
          localStorage.setItem('hideCoinInfoPopup', 'true');
      }
      setShowInfoPopup(false);
  };

  const filteredItems = useMemo(() => {
    if (activeTab === 'theme') {
        return SHOP_ITEMS.filter(item => item.type === 'theme');
    }
    return SHOP_ITEMS.filter(item => {
        if (item.type === 'theme') return false;
        if (filterType === 'all') return true;
        return item.type === filterType;
    });
  }, [activeTab, filterType]);

  const triggerHappyReaction = () => {
      setPreviewAction('celebrating');
      setTimeout(() => setPreviewAction('idle'), 2000);
  };

  const handleBuy = async (item: ShopItem) => {
      setIsProcessing(item.id);
      const result = await buyItem(item);
      setIsProcessing(null);
      
      if (!result.success) {
          setModalMessage({ title: 'Gagal Membeli', message: result.message });
      } else {
          // Auto equip triggered by user separately, or we could trigger it here.
          // triggerHappyReaction(); // Optional on buy
      }
  };

  const handleEquip = async (item: ShopItem) => {
      setIsProcessing(item.id);
      await equipItem(item.type, item.id);
      setIsProcessing(null);
      triggerHappyReaction();
  };

  const handleUnequip = async (type: ItemType) => {
      setIsProcessing('unequip-' + type);
      // If skin or theme, reset to default, otherwise null
      const val = (type === 'skin' || type === 'theme') ? 'default' : null;
      await equipItem(type, val);
      setIsProcessing(null);
      triggerHappyReaction();
  };

  const isEquipped = (item: ShopItem) => {
      if (item.type === 'head') return equipped.head === item.id;
      if (item.type === 'face') return equipped.face === item.id;
      if (item.type === 'skin') return equipped.skin === item.id;
      if (item.type === 'theme') return equipped.theme === item.id;
      return false;
  };

  // Helper untuk mendapatkan warna background preview berdasarkan tema yang sedang DIPAKAI
  const getPreviewThemeStyles = (themeId?: string | null) => {
      switch (themeId) {
          case 'theme_nature':
              return {
                  bgGradient: 'from-emerald-50 to-emerald-200 dark:from-emerald-900/40 dark:to-emerald-900',
                  titleColor: 'text-emerald-800 dark:text-emerald-200',
                  textColor: 'text-emerald-600 dark:text-emerald-400'
              };
          case 'theme_ocean':
              return {
                  bgGradient: 'from-cyan-50 to-cyan-200 dark:from-cyan-900/40 dark:to-cyan-900',
                  titleColor: 'text-cyan-800 dark:text-cyan-200',
                  textColor: 'text-cyan-600 dark:text-cyan-400'
              };
          case 'theme_sunset':
              return {
                  bgGradient: 'from-orange-50 to-orange-200 dark:from-orange-900/40 dark:to-orange-900',
                  titleColor: 'text-orange-800 dark:text-orange-200',
                  textColor: 'text-orange-600 dark:text-orange-400'
              };
          case 'theme_purple':
              return {
                  bgGradient: 'from-violet-50 to-violet-200 dark:from-violet-900/40 dark:to-violet-900',
                  titleColor: 'text-violet-800 dark:text-violet-200',
                  textColor: 'text-violet-600 dark:text-violet-400'
              };
          case 'theme_pink':
              return {
                  bgGradient: 'from-pink-50 to-pink-200 dark:from-pink-900/40 dark:to-pink-900',
                  titleColor: 'text-pink-800 dark:text-pink-200',
                  textColor: 'text-pink-600 dark:text-pink-400'
              };
          default:
              // Default Slate/Blue theme
              return {
                  bgGradient: 'from-white to-slate-200 dark:from-slate-800 dark:to-slate-950',
                  titleColor: 'text-slate-800 dark:text-slate-200',
                  textColor: 'text-slate-500 dark:text-slate-400'
              };
      }
  };

  const currentThemeStyles = getPreviewThemeStyles(equipped.theme);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[100] p-4 animate-fade-in lg:pl-64">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 flex-shrink-0 relative overflow-hidden">
            {/* Active Buff Background Indicator */}
            {isDiscountActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-teal-500/10 to-transparent pointer-events-none"></div>
            )}

            <div className="flex items-center space-x-3 z-10">
                <div 
                    className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-xl cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => setShowInfoPopup(true)}
                    title="Cara mendapatkan koin"
                >
                    <CoinsIcon className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        FlowShop
                        {isDiscountActive && (
                            <span className="px-2 py-0.5 text-[10px] bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 rounded-full border border-teal-200 dark:border-teal-700 uppercase font-bold tracking-wide animate-pulse">
                                Diskon {discountValue * 100}% Aktif!
                            </span>
                        )}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center">
                        Saldo: <span className="font-bold text-amber-600 dark:text-amber-400 ml-1 text-base">{coins} Koin</span>
                    </p>
                </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors z-10">
                <XIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" />
            </button>
        </div>

        {/* Main Content - Split Layout for Desktop */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
            
            {/* Left Column: Shop Items */}
            <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-200 dark:border-slate-700">
                {/* Navigation Tabs */}
                <div className="flex border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                    <button 
                        onClick={() => setActiveTab('robot')}
                        className={`flex-1 py-4 text-sm font-semibold text-center transition-colors relative ${activeTab === 'robot' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                    >
                        Kustomisasi Robot
                        {activeTab === 'robot' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"></div>}
                    </button>
                    <button 
                        onClick={() => setActiveTab('theme')}
                        className={`flex-1 py-4 text-sm font-semibold text-center transition-colors relative ${activeTab === 'theme' ? 'text-purple-600 dark:text-purple-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                    >
                        Tema Aplikasi
                        {activeTab === 'theme' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600 dark:bg-purple-400"></div>}
                    </button>
                </div>

                {/* Sub Filters for Robot */}
                {activeTab === 'robot' && (
                    <div className="flex gap-2 p-4 overflow-x-auto bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700/50 flex-shrink-0">
                        {(['all', 'head', 'face', 'skin'] as const).map(type => (
                            <button
                                key={type}
                                onClick={() => setFilterType(type)}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide transition-all whitespace-nowrap ${
                                    filterType === type 
                                    ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900 shadow-md' 
                                    : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                                }`}
                            >
                                {type === 'all' ? 'Semua' : type === 'head' ? 'Topi' : type === 'face' ? 'Kacamata' : 'Upgrade'}
                            </button>
                        ))}
                    </div>
                )}

                {/* Items Grid */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-900/50">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4">
                        {/* Default Unequip Option (Only for Robot parts) */}
                        {activeTab === 'robot' && filterType !== 'all' && filterType !== 'skin' && (
                            <div 
                                onClick={() => handleUnequip(filterType)}
                                className={`aspect-square rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                                    equipped[filterType] === null ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20 border-solid border-blue-500' : ''
                                }`}
                            >
                                <span className="text-slate-400 dark:text-slate-500 text-sm font-medium">Lepas Item</span>
                            </div>
                        )}
                        
                        {/* Default Skin */}
                        {activeTab === 'robot' && (filterType === 'all' || filterType === 'skin') && (
                            <div 
                                onClick={() => handleUnequip('skin')}
                                className={`p-4 rounded-2xl border-2 flex flex-col justify-between transition-all cursor-pointer ${
                                    equipped.skin === 'default' || !equipped.skin
                                    ? 'border-blue-500 bg-white dark:bg-slate-800 ring-2 ring-blue-500/30 shadow-lg' 
                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-300'
                                }`}
                            >
                                <div className="flex-1 flex items-center justify-center mb-2">
                                    <div className="w-12 h-12 rounded-full bg-indigo-500"></div>
                                </div>
                                <div className="text-center">
                                    <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">Default</p>
                                    <p className="text-xs text-green-600 dark:text-green-400 font-semibold mt-1">Dimiliki</p>
                                </div>
                            </div>
                        )}

                        {filteredItems.map(item => {
                            const owned = inventory.includes(item.id);
                            const equippedStatus = isEquipped(item);
                            
                            // Calculate Discounted Price
                            const originalPrice = item.price;
                            const finalPrice = isDiscountActive 
                                ? Math.floor(originalPrice * (1 - discountValue)) 
                                : originalPrice;
                                
                            const canAfford = coins >= finalPrice;

                            return (
                                <div 
                                    key={item.id} 
                                    className={`relative p-4 rounded-2xl border-2 flex flex-col justify-between transition-all ${
                                        equippedStatus 
                                        ? 'border-blue-500 bg-white dark:bg-slate-800 ring-2 ring-blue-500/30 shadow-lg' 
                                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-300 dark:hover:border-slate-500'
                                    }`}
                                >
                                    {equippedStatus && (
                                        <div className="absolute top-2 right-2 text-blue-500">
                                            <CheckCircleIcon className="w-5 h-5" />
                                        </div>
                                    )}

                                    <div className="flex-1 flex items-center justify-center mb-3">
                                        {/* Preview Visual */}
                                        {item.previewColor ? (
                                            <div className="w-12 h-12 rounded-full shadow-sm" style={{ backgroundColor: item.previewColor }}></div>
                                        ) : (
                                            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center text-2xl">
                                                {item.id.includes('cowboy') ? '🤠' : item.id.includes('wizard') ? '🧙‍♂️' : item.id.includes('crown') ? '👑' : item.id.includes('sunglasses') ? '😎' : item.id.includes('thug') ? '🕶️' : item.id.includes('monocle') ? '🧐' : '🎧'}
                                            </div>
                                        )}
                                    </div>

                                    <div className="text-center">
                                        <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-1">{item.name}</h3>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 h-8 leading-tight">{item.description}</p>
                                        
                                        <div className="mt-3">
                                            {owned ? (
                                                <button
                                                    onClick={() => handleEquip(item)}
                                                    disabled={equippedStatus || isProcessing === item.id}
                                                    className={`w-full py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                                        equippedStatus 
                                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 cursor-default'
                                                        : 'bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                                                    }`}
                                                >
                                                    {equippedStatus ? 'Dipakai' : 'Pakai'}
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleBuy(item)}
                                                    disabled={!canAfford || isProcessing === item.id}
                                                    className={`w-full py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors ${
                                                        canAfford 
                                                        ? 'bg-amber-100 text-amber-700 hover:bg-amber-500 hover:text-white dark:bg-amber-900/30 dark:text-amber-400' 
                                                        : 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-700/50 dark:text-slate-600'
                                                    }`}
                                                >
                                                    {isProcessing === item.id ? '...' : (
                                                        <div className="flex items-center gap-1">
                                                            {isDiscountActive ? (
                                                                <div className="flex flex-col leading-none items-end mr-1">
                                                                    <span className="text-[9px] line-through opacity-60">{originalPrice}</span>
                                                                    <span>{finalPrice}</span>
                                                                </div>
                                                            ) : (
                                                                <span>{finalPrice}</span>
                                                            )}
                                                            <div className="w-3 h-3 rounded-full bg-amber-400 border border-amber-600"></div>
                                                        </div>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Right Column: Live Preview (Hidden on Mobile, Visible on LG+) */}
            <div className="hidden lg:flex w-[350px] bg-slate-100 dark:bg-slate-900 relative items-center justify-center flex-col flex-shrink-0 border-l border-slate-200 dark:border-slate-700 transition-colors duration-500">
                <div className={`absolute inset-0 bg-gradient-to-b ${currentThemeStyles.bgGradient} opacity-80 transition-colors duration-500`}></div>
                
                <div className="relative z-10 w-full h-1/2 flex items-center justify-center">
                    <Mascot 
                        tasks={[]} 
                        recentAction={previewAction} 
                        overrideEquipped={equipped} 
                        isPreview={true} 
                    />
                </div>

                <div className="relative z-10 mt-8 text-center px-6">
                    <h3 className={`${currentThemeStyles.titleColor} font-bold text-lg mb-2 transition-colors duration-300`}>Tampilan Maskot</h3>
                    <p className={`${currentThemeStyles.textColor} text-xs leading-relaxed transition-colors duration-300`}>
                        Ini adalah preview langsung dari teman produktivitas Anda. Item yang Anda pakai akan langsung terlihat di sini.
                    </p>
                </div>
            </div>

        </div>
      </div>
      
      {/* INFO POPUP - CARA DAPAT KOIN */}
      {showInfoPopup && (
          <div className="fixed inset-0 z-[110] bg-black/70 flex justify-center items-center p-4 animate-fade-in">
              {/* Overlay click to close but respect "Don't Show Again" logic */}
              <div className="absolute inset-0" onClick={handleCloseInfoPopup}></div>
              
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm p-6 relative transform transition-all scale-100 border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
                  
                  {/* Icon Header */}
                  <div className="flex flex-col items-center mb-5">
                      <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-3 shadow-lg shadow-amber-500/20">
                          <CoinsIcon className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-800 dark:text-white text-center">Cara Menambahkan Koin</h3>
                  </div>

                  {/* List */}
                  <div className="space-y-4 mb-6">
                      <div className="flex items-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-700">
                          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 mr-3">
                              <CheckCircleIcon className="w-5 h-5" />
                          </div>
                          <div>
                              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Selesaikan Tugas</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">Dapatkan <span className="text-amber-500 font-bold">+{COIN_REWARDS.TASK_COMPLETION} Koin</span> setiap tugas.</p>
                          </div>
                      </div>

                      <div className="flex items-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-700">
                          <div className="flex-shrink-0 w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center text-orange-600 dark:text-orange-400 mr-3">
                              <FireIcon className="w-5 h-5" />
                          </div>
                          <div>
                              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Jaga Streak Harian</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">Bonus <span className="text-amber-500 font-bold">+{COIN_REWARDS.STREAK_BONUS} Koin</span> setiap hari!</p>
                          </div>
                      </div>
                  </div>

                  {/* Footer */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                      <label className="flex items-center justify-center mb-4 cursor-pointer group">
                          <input 
                              type="checkbox" 
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600"
                              checked={dontShowAgain}
                              onChange={(e) => setDontShowAgain(e.target.checked)}
                          />
                          <span className="ml-2 text-xs text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                              Jangan tampilkan lagi notifikasi ini
                          </span>
                      </label>
                      
                      <button 
                          onClick={handleCloseInfoPopup}
                          className="w-full py-3 bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95"
                      >
                          Mengerti
                      </button>
                  </div>
              </div>
          </div>
      )}

      {modalMessage && (
          <ConfirmationModal 
            title={modalMessage.title}
            message={modalMessage.message}
            confirmText="Oke"
            onConfirm={() => setModalMessage(null)}
            onCancel={() => setModalMessage(null)}
            isDestructive={false}
          />
      )}
    </div>
  );
};

export default GamificationShopModal;
