
import { TaskStatus, ShopItem, FateCard } from './types';

export const STATUS_STYLES: { [key in TaskStatus]: { bg: string; text: string; dot: string } } = {
  [TaskStatus.ToDo]: { 
    bg: 'bg-slate-100 dark:bg-slate-700', 
    text: 'text-slate-600 dark:text-slate-300', 
    dot: 'bg-slate-400 dark:bg-slate-500' 
  },
  [TaskStatus.InProgress]: { 
    bg: 'bg-blue-100 dark:bg-blue-900/50', 
    text: 'text-blue-600 dark:text-blue-400', 
    dot: 'bg-blue-400' 
  },
  [TaskStatus.Done]: { 
    bg: 'bg-green-100 dark:bg-green-900/50', 
    text: 'text-green-600 dark:text-green-400', 
    dot: 'bg-green-500' 
  },
};

export const COIN_REWARDS = {
  TASK_COMPLETION: 2,
  STREAK_BONUS: 5,
};

export const FATE_CARDS: FateCard[] = [
  {
    id: 'the_flash',
    name: 'The Flash',
    description: 'Mendapatkan 2x Koin untuk setiap tugas yang diselesaikan hari ini.',
    buffType: 'coin_multiplier',
    buffValue: 2,
    color: 'from-yellow-400 to-orange-500',
    icon: '⚡'
  },
  {
    id: 'the_guardian',
    name: 'The Guardian',
    description: 'Kebal terhadap 1 tugas overdue (tidak merusak mood Maskot).',
    buffType: 'protection',
    buffValue: 1,
    color: 'from-blue-400 to-indigo-600',
    icon: '🛡️'
  },
  {
    id: 'the_merchant',
    name: 'The Merchant',
    description: 'Diskon 30% untuk semua item di FlowShop hari ini.',
    buffType: 'shop_discount',
    buffValue: 0.3,
    color: 'from-emerald-400 to-teal-600',
    icon: '💰'
  }
];

export const SHOP_ITEMS: ShopItem[] = [
  // HEAD
  { id: 'hat_cowboy', name: 'Topi Koboi', type: 'head', price: 150, description: 'Yeehaw! Untuk robot petualang.' },
  { id: 'hat_wizard', name: 'Topi Penyihir', type: 'head', price: 200, description: 'Magic coding skills +10.' },
  { id: 'hat_crown', name: 'Mahkota Emas', type: 'head', price: 500, description: 'Hanya untuk sultan produktivitas.' },
  { id: 'hat_headphones', name: 'Headphones', type: 'head', price: 100, description: 'Fokus maksimal dengan musik.' },

  // FACE
  { id: 'face_sunglasses', name: 'Kacamata Hitam', type: 'face', price: 120, description: 'Stay cool di bawah tekanan deadline.' },
  { id: 'face_thug', name: 'Pixel Glasses', type: 'face', price: 250, description: 'Deal with it.' },
  { id: 'face_monocle', name: 'Monocle', type: 'face', price: 300, description: 'Untuk analisis data yang berkelas.' },

  // SKIN / UPGRADE
  { id: 'skin_gold', name: 'Gold Plated', type: 'skin', price: 1000, description: 'Upgrade bodi robot dengan lapisan emas murni.', previewColor: '#fbbf24' },
  { id: 'skin_neon', name: 'Neon Cyber', type: 'skin', price: 600, description: 'Menyala dalam gelap.', previewColor: '#06b6d4' },
  { id: 'skin_rose', name: 'Rose Gold', type: 'skin', price: 400, description: 'Elegan dan menawan.', previewColor: '#fb7185' },
  { id: 'skin_dark', name: 'Stealth Black', type: 'skin', price: 450, description: 'Mode ninja produktivitas.', previewColor: '#1e293b' },

  // THEMES
  { id: 'theme_nature', name: 'Nature Green', type: 'theme', price: 300, description: 'Suasana hutan yang menenangkan.', previewColor: '#22c55e' },
  { id: 'theme_ocean', name: 'Ocean Blue', type: 'theme', price: 300, description: 'Sedalam samudra.', previewColor: '#0ea5e9' },
  { id: 'theme_sunset', name: 'Sunset Orange', type: 'theme', price: 300, description: 'Semangat sore hari.', previewColor: '#f97316' },
  { id: 'theme_purple', name: 'Cyber Purple', type: 'theme', price: 350, description: 'Vibes futuristik.', previewColor: '#8b5cf6' },
  { id: 'theme_pink', name: 'Sakura Pink', type: 'theme', price: 350, description: 'Kelembutan bunga sakura.', previewColor: '#ec4899' },
];
