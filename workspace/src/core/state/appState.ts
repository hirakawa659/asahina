// src/core/state/appState.ts

export interface AppState {
  initialized: boolean;
  currentDocumentId: string | null;
  text: string; // 本文データ
  cursor: { line: number; column: number }; // 論理座標
}

let state: AppState = {
  initialized: true,
  currentDocumentId: null,
  text: 'ここに小説を執筆... (土台実装中)',
  cursor: { line: 0, column: 0 },
};

const listeners = new Set<() => void>();

export const appState = {
  get(): AppState {
    return state;
  },
  set(nextState: Partial<AppState>) {
    state = { ...state, ...nextState };
    listeners.forEach((listener) => listener());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
