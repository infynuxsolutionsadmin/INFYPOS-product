import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Shift } from '../types/shift';

interface ShiftState {
  _hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;
  currentShift: Shift | null;
  setShift: (shift: Shift) => void;
  clearShift: () => void;
  isShiftOpen: () => boolean;
}

export const useShiftStore = create<ShiftState>()(
  persist(
    (set, get) => ({
      _hasHydrated: false,
      setHasHydrated: (v) => set({ _hasHydrated: v }),
      currentShift: null,

      setShift: (shift) => set({ currentShift: shift }),

      clearShift: () => set({ currentShift: null }),

      isShiftOpen: () => {
        const shift = get().currentShift;
        return shift !== null && shift.status === 'OPEN';
      },
    }),
    {
      name: 'pos-shift-storage',
      partialize: (state) => ({ currentShift: state.currentShift }),
      onRehydrateStorage: () => (state) => {
        if (state) state.setHasHydrated(true);
      },
    }
  )
);
