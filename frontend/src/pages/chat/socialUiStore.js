import { create } from "zustand";

export const DEFAULT_VIEW = { x: 0, y: 0, k: 1 }; // k = 1: nó ≈ 72px em 1080p

// Vive só na memória: trocar de aba ou ir pra outra página do app mantém a câmera,
// e um refresh (ou abrir a página de novo) volta ao padrão.
export const useSocialUi = create((set, get) => ({
  owner: null,
  ...DEFAULT_VIEW,
  selectedId: null,

  // chamado ao entrar: se mudou de conta, a câmera começa do zero
  load(playerId) {
    if (get().owner === playerId) return;
    set({ owner: playerId, ...DEFAULT_VIEW, selectedId: null });
  },

  save(snapshot) {
    if (!get().owner) return;
    set(snapshot);
  },

  clear() {
    set({ owner: null, ...DEFAULT_VIEW, selectedId: null });
  },
}));