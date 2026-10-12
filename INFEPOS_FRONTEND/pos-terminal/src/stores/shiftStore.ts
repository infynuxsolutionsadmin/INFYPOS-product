import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Shift } from '../types/shift';

interface ShiftState {
  _hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;
  currentShift: Shift | null;
  setShift: (shift: Shift) => void;
  clearShift: () => void;
  isShiftOpen: (storeId?: string) => boolean;
}

export const useShiftStore = create<ShiftState>()(
  persist(
    (set, get) => ({
      _hasHydrated: false,
      setHasHydrated: (v) => set({ _hasHydrated: v }),
      currentShift: null,

      setShift: (shift) => set({ currentShift: shift }),

      clearShift: () => set({ currentShift: null }),

      isShiftOpen: (storeId?: string) => {
        const shift = get().currentShift;
        if (!shift || shift.status !== 'OPEN') return false;
        if (storeId && shift.storeId !== storeId) return false;
        return true;
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
