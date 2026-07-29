import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================
// UI STORE
// Client-side UI state — sidebar, density,
// command palette, etc.
// ============================================

type Density = 'comfortable' | 'compact';

type UIState = {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  density: Density;
  mobileMenuOpen: boolean;
};

type UIActions = {
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleCommandPalette: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setDensity: (density: Density) => void;
  setMobileMenuOpen: (open: boolean) => void;
};

export const useUIStore = create<UIState & UIActions>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      sidebarCollapsed: false,
      commandPaletteOpen: false,
      density: 'comfortable',
      mobileMenuOpen: false,

      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      toggleSidebarCollapsed: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
      setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
      setDensity: (density) => set({ density }),
      setMobileMenuOpen: (mobileMenuOpen) => set({ mobileMenuOpen }),
    }),
    {
      name: 'comops-ui',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        density: state.density,
      }),
    },
  ),
);
