/* ── Shared Types ─────────────────────────────────────────────── */

export interface User {
  id: number;
  telegramId: string;
  firstName: string | null;
  username: string | null;
  balance: number;
  photoUrl?: string;
  phone?: string | null;
  /** Placeholder stats — will come from backend later */
  totalGames?: number;
  winRate?: number;
  bestStreak?: number;
}

export type RoomTier = 'low' | 'mid' | 'high';

export interface Room {
  id: string;
  tier: RoomTier;
  name: string;
  description: string;
  fee: number;
  icon: string;
  activePlayers: number;
}

export type AuthState =
  | { status: 'loading' }
  | { status: 'success'; user: User; isNew: boolean }
  | { status: 'error'; message: string };
