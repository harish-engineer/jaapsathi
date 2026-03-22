import { create } from 'zustand';

export interface SessionState {
  isActive: boolean;
  mantraId: string | null;
  count: number;
  malaRounds: number;
  targetCount: number;
  startTime: number | null;
  
  startSession: (mantraId: string, targetCount: number) => void;
  incrementCount: () => void;
  resetSession: () => void;
  updateTargetCount: (targetCount: number) => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  isActive: false,
  mantraId: null,
  count: 0,
  malaRounds: 0,
  targetCount: 108,
  startTime: null,

  startSession: (mantraId, targetCount) => {
    set({
      isActive: true,
      mantraId,
      targetCount,
      count: 0,
      malaRounds: 0,
      startTime: Date.now(),
    });
  },

  incrementCount: () => {
    const { count, malaRounds, targetCount } = get();
    const newCount = count + 1;
    // Mala round increments every targetCount beads (27, 54, or 108)
    const newMalaRounds = Math.floor(newCount / targetCount);
    set({ count: newCount, malaRounds: newMalaRounds });
  },

  resetSession: () => {
    set((state) => ({
      isActive: false,
      mantraId: state.mantraId, // Keep the same mantra
      count: 0,
      malaRounds: 0,
      targetCount: state.targetCount, // Preserve targetCount for next session
      startTime: null,
    }));
  },

  updateTargetCount: (targetCount) => {
    set({ targetCount });
  }
}));
