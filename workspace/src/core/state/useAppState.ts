// src/core/state/useAppState.ts
import { useSyncExternalStore } from 'react';
import { appState } from './appState';

export function useAppState() {
  return useSyncExternalStore(
    appState.subscribe,
    appState.get
  );
}
