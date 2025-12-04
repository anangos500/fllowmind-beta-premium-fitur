
export enum TaskStatus {
  ToDo = 'To Do',
  InProgress = 'In Progress',
  Done = 'Done',
}

export enum Recurrence {
  None = 'none',
  Daily = 'daily',
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface EquippedItems {
  head?: string | null;
  face?: string | null;
  skin?: string | null; // 'default', 'gold', 'neon', etc.
  theme?: string | null; // 'default', 'nature', 'ocean', etc.
}

export type BuffType = 'coin_multiplier' | 'protection' | 'shop_discount';

export interface FateCard {
  id: string;
  name: string;
  description: string;
  buffType: BuffType;
  buffValue: number; // e.g., 2 for 2x multiplier, 0.3 for 30% discount
  color: string;
  icon: string; // Component name reference
}

export interface Profile {
  id: string; // Corresponds to auth.users.id
  updated_at?: string;
  username?: string;
  hasCompletedOnboarding?: boolean;
  playFocusEndSound?: boolean;
  playBreakEndSound?: boolean;
  focusEndSound?: string;
  breakEndSound?: string;
  savingsGoal?: number; // Target Tabungan
  coins?: number;
  inventory?: string[]; // Array of Item IDs
  equipped?: EquippedItems;
  lastFateDate?: string; // YYYY-MM-DD
  activeFateCard?: FateCard | null;
}

export type ItemType = 'head' | 'face' | 'skin' | 'theme';

export interface ShopItem {
  id: string;
  name: string;
  type: ItemType;
  price: number;
  description?: string;
  previewColor?: string; // For skins/themes
}

export interface Task {
  id: string;
  userId?: string; // Changed from user_id to standardize on camelCase
  title: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  status: TaskStatus;
  checklist: ChecklistItem[];
  notes: string;
  isImportant: boolean;
  recurrence: Recurrence;
  recurringTemplateId?: string;
  tags?: string[];
  createdAt: string;
}

export interface Journal {
  id: string;
  userId: string;
  journalDate: string; // YYYY-MM-DD
  title: string;
  notes: string;
  completedTasks: { title: string }[];
  pdfPath: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  userId: string;
  title: string; // Merchant or Description
  amount: number;
  category: string;
  date: string; // ISO string
  receiptUrl?: string;
  notes?: string;
  type: 'income' | 'expense'; // Added to track transaction type
  isRecurring?: boolean;
  recurrenceInterval?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  nextDueDate?: string; // ISO string for the next auto-creation
  createdAt: string;
}

export interface Budget {
  id: string;
  userId: string;
  category: string;
  amount: number;
  createdAt?: string;
}

export interface CanvasNote {
  id: string;
  userId: string;
  title: string;
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: 'yellow' | 'blue' | 'green' | 'pink' | 'purple';
  isPinned: boolean;
  createdAt: string;
}

export type GoalType = 'finance' | 'task' | 'manual';

export interface Goal {
  id: string;
  userId: string;
  title: string;
  type: GoalType;
  targetValue: number;
  currentValue: number;
  deadline?: string; // ISO string
  linkedTag?: string; // e.g. 'skripsi' if type is 'task'
  createdAt: string;
}

// Social Media Types
export type SocialPlatform = 'tiktok' | 'instagram' | 'youtube' | 'facebook' | 'x';

export interface SocialAccount {
  id: string;
  userId: string;
  platform: SocialPlatform;
  username: string;
  avatarUrl?: string;
  connected: boolean;
  createdAt: string;
}

export interface SocialPost {
  id: string;
  userId: string;
  caption: string;
  mediaUrl?: string;
  platforms: SocialPlatform[];
  scheduledTime: string; // ISO
  status: 'scheduled' | 'posting' | 'posted' | 'failed';
  createdAt: string;
}

export type View = 'daily' | 'overdue' | 'weekly' | 'monthly' | 'journal' | 'finance' | 'canvas' | 'settings' | 'goals' | 'social';