import { create } from 'zustand';
import { openDatabase, Sankalpa } from '../db/database';

interface SankalpaStoreState {
  sankalpas: Sankalpa[];           // All active/paused sankalpas
  isLoading: boolean;

  loadAllSankalpas: () => Promise<void>;

  /** Returns the active/paused sankalpa for a specific mantra, or null */
  getSankalpaForMantra: (mantraId: string) => Sankalpa | null;

  /** Creates a new sankalpa. Throws if one already exists for that mantra. */
  createSankalpa: (params: {
    mantraId: string;
    mantraName: string;
    targetCount: number;
    durationDays: number;
  }) => Promise<{ success: boolean; error?: string }>;

  /** Add jaap count to the sankalpa for a specific mantra */
  addProgress: (mantraId: string, count: number) => Promise<void>;

  completeSankalpa: (id: string) => Promise<void>;
  pauseSankalpa: (id: string) => Promise<void>;
  resumeSankalpa: (id: string) => Promise<void>;
}

export const useSankalpaStore = create<SankalpaStoreState>((set, get) => ({
  sankalpas: [],
  isLoading: true,

  loadAllSankalpas: async () => {
    set({ isLoading: true });
    try {
      const db = await openDatabase();
      const rows = await db.getAllAsync<Sankalpa>(
        "SELECT * FROM sankalpas WHERE status = 'active' OR status = 'paused' ORDER BY created_at DESC"
      );
      set({ sankalpas: rows ?? [] });
    } catch (e) {
      console.warn('loadAllSankalpas error:', e);
    } finally {
      set({ isLoading: false });
    }
  },

  getSankalpaForMantra: (mantraId: string) => {
    const { sankalpas } = get();
    return sankalpas.find(s => s.mantra_id === mantraId && (s.status === 'active' || s.status === 'paused')) ?? null;
  },

  createSankalpa: async ({ mantraId, mantraName, targetCount, durationDays }) => {
    // Enforce 1-per-mantra rule
    const existing = get().getSankalpaForMantra(mantraId);
    if (existing) {
      return { success: false, error: `A sankalpa for "${mantraName}" already exists. Complete or pause it first.` };
    }

    try {
      const db = await openDatabase();
      const now = new Date();
      const id = `sankalpa_${Date.now()}`;
      const startDate = now.toISOString().split('T')[0];
      const endDate = new Date(now.getTime() + durationDays * 86400000)
        .toISOString().split('T')[0];

      await db.runAsync(
        'INSERT INTO sankalpas (id, mantra_id, mantra_name, target_count, current_count, duration_days, start_date, end_date, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, mantraId, mantraName, targetCount, 0, durationDays, startDate, endDate, 'active', now.toISOString()]
      );

      const newSankalpa: Sankalpa = {
        id, mantra_id: mantraId, mantra_name: mantraName,
        target_count: targetCount, current_count: 0,
        duration_days: durationDays, start_date: startDate,
        end_date: endDate, status: 'active', created_at: now.toISOString()
      };
      set(state => ({ sankalpas: [newSankalpa, ...state.sankalpas] }));
      return { success: true };
    } catch (e) {
      console.warn('createSankalpa error:', e);
      return { success: false, error: 'Failed to save sankalpa. Please try again.' };
    }
  },

  addProgress: async (mantraId: string, count: number) => {
    const { sankalpas } = get();
    const sankalpa = sankalpas.find(s => s.mantra_id === mantraId && s.status === 'active');
    if (!sankalpa) return;

    const newCount = sankalpa.current_count + count;
    const isCompleted = newCount >= sankalpa.target_count;
    const newStatus = isCompleted ? 'completed' : 'active';

    try {
      const db = await openDatabase();
      await db.runAsync(
        'UPDATE sankalpas SET current_count = ?, status = ? WHERE id = ?',
        [newCount, newStatus, sankalpa.id]
      );
      set(state => ({
        sankalpas: state.sankalpas.map(s =>
          s.id === sankalpa.id
            ? { ...s, current_count: newCount, status: newStatus }
            : s
        )
      }));
    } catch (e) {
      console.warn('addProgress error:', e);
    }
  },

  completeSankalpa: async (id: string) => {
    try {
      const db = await openDatabase();
      await db.runAsync("UPDATE sankalpas SET status = 'completed' WHERE id = ?", [id]);
      // Remove from active list since it's done
      set(state => ({ sankalpas: state.sankalpas.filter(s => s.id !== id) }));
    } catch (e) {
      console.warn('completeSankalpa error:', e);
    }
  },

  pauseSankalpa: async (id: string) => {
    try {
      const db = await openDatabase();
      await db.runAsync("UPDATE sankalpas SET status = 'paused' WHERE id = ?", [id]);
      set(state => ({
        sankalpas: state.sankalpas.map(s => s.id === id ? { ...s, status: 'paused' } : s)
      }));
    } catch (e) {
      console.warn('pauseSankalpa error:', e);
    }
  },

  resumeSankalpa: async (id: string) => {
    try {
      const db = await openDatabase();
      await db.runAsync("UPDATE sankalpas SET status = 'active' WHERE id = ?", [id]);
      set(state => ({
        sankalpas: state.sankalpas.map(s => s.id === id ? { ...s, status: 'active' } : s)
      }));
    } catch (e) {
      console.warn('resumeSankalpa error:', e);
    }
  },
}));
