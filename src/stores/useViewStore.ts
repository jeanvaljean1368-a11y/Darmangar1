// Global view state for درمانگر single-page app

import { create } from 'zustand'

export type AppView =
  | 'home'
  | 'requester-flow'
  | 'provider-flow'
  | 'admin-flow'

interface ViewState {
  view: AppView
  setView: (view: AppView) => void
  goHome: () => void
}

export const useViewStore = create<ViewState>((set) => ({
  view: 'home',
  setView: (view) => set({ view }),
  goHome: () => set({ view: 'home' }),
}))
