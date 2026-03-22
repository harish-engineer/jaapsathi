import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const zustandStorage: StateStorage = {
  setItem: (name, value) => {
    return AsyncStorage.setItem(name, value);
  },
  getItem: (name) => {
    return AsyncStorage.getItem(name);
  },
  removeItem: (name) => {
    return AsyncStorage.removeItem(name);
  },
};

interface PreferencesState {
  userName: string;
  selectedTradition: string;
  defaultBeadCount: number;
  currentStreak: number;
  bestStreak: number;
  lastSessionDate: string;
  onboardingComplete: boolean;
  hapticsEnabled: boolean;
  reminderEnabled: boolean;
  reminderTime: string;

  setUserName: (name: string) => void;
  setSelectedTradition: (tradition: string) => void;
  setDefaultBeadCount: (count: number) => void;
  setOnboardingComplete: (complete: boolean) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  setReminderEnabled: (enabled: boolean) => void;
  setReminderTime: (time: string) => void;
  updateStreak: (dateStr: string) => { streakUpdated: boolean, newStreak: number };
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set, get) => ({
      userName: '',
      selectedTradition: 'hindu',
      defaultBeadCount: 108,
      currentStreak: 0,
      bestStreak: 0,
      lastSessionDate: '',
      onboardingComplete: false,
      hapticsEnabled: true,
      reminderEnabled: false,
      reminderTime: '06:00',

      setUserName: (name) => set({ userName: name }),
      setSelectedTradition: (tradition) => set({ selectedTradition: tradition }),
      setDefaultBeadCount: (count) => set({ defaultBeadCount: count }),
      setOnboardingComplete: (complete) => set({ onboardingComplete: complete }),
      setHapticsEnabled: (enabled) => set({ hapticsEnabled: enabled }),
      setReminderEnabled: (enabled) => set({ reminderEnabled: enabled }),
      setReminderTime: (time) => set({ reminderTime: time }),
      
      updateStreak: (dateStr) => {
        const { lastSessionDate, currentStreak, bestStreak } = get();
        
        if (lastSessionDate === dateStr) {
           return { streakUpdated: false, newStreak: currentStreak };
        }

        const todayDate = new Date(dateStr);
        const yesterdayDate = new Date(todayDate);
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

        let newStreak = currentStreak;
        let streakUpdated = false;

        if (lastSessionDate === yesterdayStr) {
          newStreak += 1;
          streakUpdated = true;
        } else {
          newStreak = 1;
        }

        set({
          currentStreak: newStreak,
          bestStreak: Math.max(newStreak, bestStreak),
          lastSessionDate: dateStr
        });

        return { streakUpdated, newStreak };
      }
    }),
    {
      name: 'preferences-storage',
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
