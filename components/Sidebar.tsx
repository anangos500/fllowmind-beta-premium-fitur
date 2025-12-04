
import React from 'react';
import CalendarIcon from './icons/CalendarIcon';
import SunIcon from './icons/SunIcon';
import BarChartIcon from './icons/BarChartIcon';
import { View } from '../types';
import { useAuth } from '../contexts/AuthContext';
import LogoutIcon from './icons/LogoutIcon';
import BookOpenIcon from './icons/BookOpenIcon';
import { useTheme } from '../contexts/ThemeContext';
import MoonIcon from './icons/MoonIcon';
import FlowmindIcon from './icons/FlowmindIcon';
import AlertTriangleIcon from './icons/AlertTriangleIcon';
import SettingsIcon from './icons/SettingsIcon';
import WalletIcon from './icons/WalletIcon';
import ShoppingBagIcon from './icons/ShoppingBagIcon';
import CoinsIcon from './icons/CoinsIcon';
import StickyNoteIcon from './icons/StickyNoteIcon';
import FlagIcon from './icons/FlagIcon'; // Import ikon baru
import Share2Icon from './icons/Share2Icon'; // Import ikon social


interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  onLogoutRequest: () => void;
  isOpen: boolean;
  onClose: () => void;
  onOpenShop: () => void; // New Prop
}

const NavItem: React.FC<{
  icon: React.ReactElement<{ className?: string }>;
  label: string;
  isActive: boolean;
  onClick: () => void;
  badge?: string;
}> = ({ icon, label, isActive, onClick, badge }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 relative ${
      isActive
        ? 'bg-blue-600 text-white shadow-lg'
        : 'text-slate-500 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-100'
    }`}
  >
    {React.cloneElement(icon, { className: 'w-6 h-6' })}
    <span className="font-semibold">{label}</span>
    {badge && (
        <span className="absolute right-3 px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-sm">
            {badge}
        </span>
    )}
  </button>
);

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, onLogoutRequest, isOpen, onClose, onOpenShop }) => {
    const { user, profile } = useAuth();
    const { theme, toggleTheme } = useTheme();

    const tiktokLogo = theme === 'dark'
        ? "https://www.dropbox.com/scl/fi/sgorw2dv667xqnbobkccb/Logoo-03.png?rlkey=hszacuyiah1l5mjw5tz083m2n&st=f29qb7um&dl=1"
        : "https://www.dropbox.com/scl/fi/xyhz3w79ne4idro388k72/Pogo-03.png?rlkey=gwkcy95hl4irnm05w17e9kucw&st=92rq5k0o&dl=1";
    
    const threadsLogo = theme === 'dark'
        ? "https://www.dropbox.com/scl/fi/l9tmwvnaxg5xz1gzi6ejo/Lowgo-01.png?rlkey=c8gjxmaitgrjlnhlfoty83ehj&st=heqsjnjf&dl=1"
        : "https://www.dropbox.com/scl/fi/yijukvk6bofzdcteoy0yt/Pogo-01.png?rlkey=wma1e95nrz093hoouk8zmjwoc&st=3v00fk2a&dl=1";
        
    const instagramLogo = theme === 'dark'
        ? "https://www.dropbox.com/scl/fi/6jhr8vn210luz0uanlepd/Lowgo-02.png?rlkey=b2h4942hls74rgiusgifx60j6&st=qealg1tt&dl=1"
        : "https://www.dropbox.com/scl/fi/9rs0e13fab5tfnbh09v2u/Pogo-02.png?rlkey=d2ac4c1p9973c2zrlei9cddhs&st=i6ot49j0&dl=1";


    return (
        <>
            {/* Overlay for mobile - Z-Index ditingkatkan menjadi 105 agar di atas Music Player (z-50) dan Toggle (z-100) */}
            <div
                className={`fixed inset-0 bg-black bg-opacity-50 z-[105] lg:hidden transition-opacity duration-300 ${
                isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                onClick={onClose}
            ></div>
            {/* Sidebar Container - Z-Index ditingkatkan menjadi 110 agar menutupi elemen lain */}
            <aside className={`w-64 bg-slate-100 dark:bg-slate-800 p-6 flex flex-col fixed inset-y-0 left-0 h-full border-r border-slate-200 dark:border-slate-700 z-[110] transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
                <div className="mb-6">
                    <div className="flex items-center space-x-3 mb-4">
                        {/* Menggunakan hex spesifik agar tidak terpengaruh tema */}
                        <FlowmindIcon className="w-8 h-8 text-[#2563eb]"/>
                        <div className="flex items-baseline">
                            <span className="text-2xl font-bold text-slate-800 dark:text-slate-200">Flowmind</span>
                            <span className="ml-1.5 px-1.5 py-0.5 text-xs font-semibold tracking-wider text-[#2563eb] bg-blue-100 dark:bg-blue-900/50 dark:text-blue-300 rounded-md">beta</span>
                        </div>
                    </div>
                    
                    {/* Gamification Balance Card */}
                    <div 
                        onClick={onOpenShop}
                        className="bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/40 p-3 rounded-xl border border-amber-200 dark:border-amber-800/50 cursor-pointer hover:shadow-md transition-all group relative overflow-hidden"
                    >
                        <div className="flex justify-between items-center relative z-10">
                            <div className="flex items-center space-x-2">
                                <div className="bg-white dark:bg-slate-800 p-1.5 rounded-full shadow-sm">
                                    <ShoppingBagIcon className="w-4 h-4 text-amber-600 dark:text-amber-500" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-amber-800 dark:text-amber-400 font-bold uppercase tracking-wide">FlowShop</p>
                                    <p className="font-extrabold text-yellow-800 dark:text-amber-100 flex items-center gap-1">
                                        {profile?.coins || 0} <CoinsIcon className="w-3 h-3" />
                                    </p>
                                </div>
                            </div>
                            <div className="bg-white/50 dark:bg-black/20 p-1.5 rounded-lg group-hover:bg-white dark:group-hover:bg-black/40 transition-colors">
                                <span className="text-xs font-bold text-amber-700 dark:text-amber-300">Buka</span>
                            </div>
                        </div>
                    </div>
                </div>

                <nav className="space-y-2 flex-grow overflow-y-auto" data-tour-id="sidebar-nav">
                    <NavItem icon={<SunIcon />} label="Hari Ini" isActive={currentView === 'daily'} onClick={() => onViewChange('daily')} />
                    <div data-tour-id="overdue-nav">
                        <NavItem icon={<AlertTriangleIcon />} label="Tugas Terlewat" isActive={currentView === 'overdue'} onClick={() => onViewChange('overdue')} />
                    </div>
                    <div data-tour-id="goals-nav">
                        <NavItem icon={<FlagIcon />} label="Life Goals" isActive={currentView === 'goals'} onClick={() => onViewChange('goals')} />
                    </div>
                    <div data-tour-id="weekly-nav">
                        <NavItem icon={<CalendarIcon />} label="Mingguan" isActive={currentView === 'weekly'} onClick={() => onViewChange('weekly')} />
                    </div>
                    <div data-tour-id="monthly-nav">
                        <NavItem icon={<BarChartIcon />} label="Bulanan" isActive={currentView === 'monthly'} onClick={() => onViewChange('monthly')} />
                    </div>
                    <NavItem icon={<Share2Icon />} label="Social Hub" isActive={currentView === 'social'} onClick={() => onViewChange('social')} badge="PRO" />
                    <div data-tour-id="canvas-nav">
                        <NavItem icon={<StickyNoteIcon />} label="Catatan" isActive={currentView === 'canvas'} onClick={() => onViewChange('canvas')} />
                    </div>
                    <div data-tour-id="finance-nav">
                        <NavItem icon={<WalletIcon />} label="Keuangan" isActive={currentView === 'finance'} onClick={() => onViewChange('finance')} />
                    </div>
                    <div data-tour-id="journal-nav">
                        <NavItem icon={<BookOpenIcon />} label="Jurnal" isActive={currentView === 'journal'} onClick={() => onViewChange('journal')} />
                    </div>
                    <div data-tour-id="settings-nav">
                        <NavItem icon={<SettingsIcon />} label="Pengaturan" isActive={currentView === 'settings'} onClick={() => onViewChange('settings')} />
                    </div>
                </nav>

                <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    {user && (
                        <div className="p-3 bg-slate-200 dark:bg-slate-700 rounded-lg">
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-200 truncate text-center" title={user.email || ''}>
                                {user.email}
                            </p>
                        </div>
                    )}
                    <div className="flex items-center space-x-2">
                        <button 
                            onClick={onLogoutRequest}
                            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-slate-500 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
                        >
                            <LogoutIcon className="w-6 h-6" />
                            <span className="font-semibold">Keluar</span>
                        </button>
                        <button 
                            onClick={toggleTheme}
                            aria-label="Toggle theme"
                            className="p-3 rounded-lg text-slate-500 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
                        >
                            {theme === 'light' ? <MoonIcon className="w-6 h-6" /> : <SunIcon className="w-6 h-6" />}
                        </button>
                    </div>
                    <div className="flex justify-center items-center space-x-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <a href="https://www.tiktok.com/@aos_2110" target="_blank" rel="noopener noreferrer" aria-label="Tiktok" className="text-slate-400 dark:text-slate-300 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                            <img src={tiktokLogo} alt="Tiktok" className="w-5 h-5" />
                        </a>
                        <a href="https://www.threads.net/@aospheree.ai" target="_blank" rel="noopener noreferrer" aria-label="Threads" className="text-slate-400 dark:text-slate-300 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                             <img src={threadsLogo} alt="Threads" className="w-5 h-5" />
                        </a>
                        <a href="https://www.instagram.com/aospheree.ai/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-slate-400 dark:text-slate-300 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                            <img src={instagramLogo} alt="Instagram" className="w-5 h-5" />
                        </a>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;