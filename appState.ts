// src/core/state/appState.ts

import { logger } from '../../utils/logger';

export type AppView = 'editor' | 'home' | 'settings' | 'trash';

export interface AppState {
  initialized: boolean;
  view: AppView;
  currentDocumentId: string | null;
  currentFolderId: string | null;
  text: string; // 本文データ
  cursor: { line: number; column: number }; // 論理座標
  
  // 将来の拡張用
  history: string[]; // ナビゲーション履歴（簡易版）
  lastActiveAt: number; // 最終操作時刻
  sessionStartedAt: number; // セッション開始時刻
}

let state: AppState = {
  initialized: false,
  view: 'editor',
  currentDocumentId: null,
  currentFolderId: null,
  text: 'ここに小説を執筆... (土台実装中)',
  cursor: { line: 0, column: 0 },
  history: [],
  lastActiveAt: Date.now(),
  sessionStartedAt: Date.now(),
};

const listeners = new Set<() => void>();

export const appState = {
  get(): AppState {
    return state;
  },
  set(nextState: Partial<AppState>) {
    state = { 
      ...state, 
      ...nextState,
      lastActiveAt: Date.now() // 操作があるたびに更新
    };
    logger.log('state', 'State updated', Object.keys(nextState));
    listeners.forEach((listener) => listener());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
