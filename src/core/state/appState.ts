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

/**
 * 安全な初期状態（デフォルト値）を生成する。
 */
export function createInitialState(): AppState {
  return {
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
}

/**
 * AppView の型ガード
 */
export function isValidAppView(view: unknown): view is AppView {
  return view === 'editor' || view === 'home' || view === 'settings' || view === 'trash';
}

/**
 * AppState の完全な型ガード
 */
export function isAppState(value: unknown): value is AppState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  const isCursorValid =
    candidate.cursor !== null &&
    typeof candidate.cursor === 'object' &&
    !Array.isArray(candidate.cursor) &&
    typeof (candidate.cursor as Record<string, unknown>).line === 'number' &&
    Number.isFinite((candidate.cursor as Record<string, unknown>).line) &&
    typeof (candidate.cursor as Record<string, unknown>).column === 'number' &&
    Number.isFinite((candidate.cursor as Record<string, unknown>).column);

  return (
    typeof candidate.initialized === 'boolean' &&
    isValidAppView(candidate.view) &&
    (typeof candidate.currentDocumentId === 'string' || candidate.currentDocumentId === null) &&
    (typeof candidate.currentFolderId === 'string' || candidate.currentFolderId === null) &&
    typeof candidate.text === 'string' &&
    isCursorValid &&
    Array.isArray(candidate.history) &&
    candidate.history.every((item) => typeof item === 'string') &&
    typeof candidate.lastActiveAt === 'number' &&
    Number.isFinite(candidate.lastActiveAt) &&
    typeof candidate.sessionStartedAt === 'number' &&
    Number.isFinite(candidate.sessionStartedAt)
  );
}

/**
 * 読み込んだデータを検証し、欠損・不正・型違い・未知の値を安全なデフォルト値で補完する。
 */
export function sanitizeAppState(raw: unknown, key: string = 'hirakawa_app_state'): AppState {
  const defaultState = createInitialState();

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    logger.error('storage', 'Invalid data root: expected object, fell back to default state', {
      location: 'sanitizeAppState',
      key,
      actualType: raw === null ? 'null' : Array.isArray(raw) ? 'array' : typeof raw,
      fallback: 'createInitialState',
    });
    return defaultState;
  }

  const data = raw as Record<string, unknown>;
  const sanitized: AppState = { ...defaultState };

  // 1. view
  if (isValidAppView(data.view)) {
    sanitized.view = data.view;
  } else {
    if (data.view !== undefined) {
      logger.error('storage', `Property "view" is invalid, fell back to "${defaultState.view}"`, {
        location: 'sanitizeAppState',
        key,
        actualType: typeof data.view,
        fallback: defaultState.view,
      });
    }
    sanitized.view = defaultState.view;
  }

  // 2. text
  if (typeof data.text === 'string') {
    sanitized.text = data.text;
  } else {
    if (data.text !== undefined) {
      logger.error('storage', `Property "text" is invalid (expected string), fell back to default text`, {
        location: 'sanitizeAppState',
        key,
        actualType: typeof data.text,
        fallback: 'default text',
      });
    }
    sanitized.text = defaultState.text;
  }

  // 3. currentDocumentId
  if (typeof data.currentDocumentId === 'string' || data.currentDocumentId === null) {
    sanitized.currentDocumentId = data.currentDocumentId;
  } else {
    if (data.currentDocumentId !== undefined) {
      logger.error('storage', 'Property "currentDocumentId" is invalid, fell back to null', {
        location: 'sanitizeAppState',
        key,
        actualType: typeof data.currentDocumentId,
        fallback: null,
      });
    }
    sanitized.currentDocumentId = null;
  }

  // 4. currentFolderId
  if (typeof data.currentFolderId === 'string' || data.currentFolderId === null) {
    sanitized.currentFolderId = data.currentFolderId;
  } else {
    if (data.currentFolderId !== undefined) {
      logger.error('storage', 'Property "currentFolderId" is invalid, fell back to null', {
        location: 'sanitizeAppState',
        key,
        actualType: typeof data.currentFolderId,
        fallback: null,
      });
    }
    sanitized.currentFolderId = null;
  }

  // 5. cursor
  if (
    data.cursor &&
    typeof data.cursor === 'object' &&
    !Array.isArray(data.cursor) &&
    typeof (data.cursor as Record<string, unknown>).line === 'number' &&
    Number.isFinite((data.cursor as Record<string, unknown>).line) &&
    typeof (data.cursor as Record<string, unknown>).column === 'number' &&
    Number.isFinite((data.cursor as Record<string, unknown>).column)
  ) {
    const line = Math.max(0, Math.floor((data.cursor as { line: number }).line));
    const column = Math.max(0, Math.floor((data.cursor as { column: number }).column));
    sanitized.cursor = { line, column };
  } else {
    if (data.cursor !== undefined) {
      logger.error('storage', 'Property "cursor" is invalid, fell back to default cursor', {
        location: 'sanitizeAppState',
        key,
        fallback: defaultState.cursor,
      });
    }
    sanitized.cursor = defaultState.cursor;
  }

  // 6. history
  if (Array.isArray(data.history) && data.history.every((item) => typeof item === 'string')) {
    sanitized.history = data.history.slice(-50);
  } else {
    if (data.history !== undefined) {
      logger.error('storage', 'Property "history" is invalid, fell back to empty array', {
        location: 'sanitizeAppState',
        key,
        fallback: [],
      });
    }
    sanitized.history = [];
  }

  // 7. lastActiveAt
  if (typeof data.lastActiveAt === 'number' && Number.isFinite(data.lastActiveAt) && data.lastActiveAt > 0) {
    sanitized.lastActiveAt = data.lastActiveAt;
  } else {
    sanitized.lastActiveAt = Date.now();
  }

  // 8. sessionStartedAt
  if (typeof data.sessionStartedAt === 'number' && Number.isFinite(data.sessionStartedAt) && data.sessionStartedAt > 0) {
    sanitized.sessionStartedAt = data.sessionStartedAt;
  } else {
    sanitized.sessionStartedAt = Date.now();
  }

  // initialized は初期化プロセスによって安全にセットされる
  sanitized.initialized = false;

  return sanitized;
}

let state: AppState = createInitialState();

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
  replace(newState: AppState) {
    state = {
      ...newState,
      lastActiveAt: Date.now(),
    };
    logger.log('state', 'State replaced/restored');
    listeners.forEach((listener) => listener());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

