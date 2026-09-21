// src/core/state/appState.ts

import { logger } from '../../utils/logger';

export type AppView = 'editor' | 'home' | 'settings' | 'trash';

export const CURRENT_APP_VERSION = 2;

/**
 * フォルダのデータモデル
 * - parentId による自己参照（フラット管理）で多層階層を表現
 */
export interface Folder {
  id: string;
  name: string;
  parentId: string | null;      // ルート階層なら null、親フォルダ配下なら親の folder.id
  order: number;                // 並び順情報（初期値やインデックス）
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;     // null: 通常、タイムスタンプ: ゴミ箱内
}

/**
 * ノート（文書）のデータモデル
 */
export interface Document {
  id: string;
  title: string;
  content: string;              // 本文（長文小説前提）
  folderId: string | null;      // ルート階層なら null、フォルダ配下なら folder.id
  order: number;                // 並び順情報
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;     // null: 通常、タイムスタンプ: ゴミ箱内
}

/**
 * 画面・ナビゲーション状態
 * - タブ復帰・PWA再起動時に前回の作業状態を完全復帰するための状態
 */
export interface NavigationState {
  currentFolderId: string | null;    // 現在サイドバー/一覧で表示しているフォルダ（ルートは null）
  activeDocumentId: string | null;   // 現在エディタで開いているノート
  expandedFolderIds: string[];       // サイドバーで展開されているフォルダID一覧
  isSidebarOpen: boolean;            // サイドバーの開閉状態
  currentView: 'documents' | 'trash'; // 通常ドキュメント一覧かゴミ箱か
}

/**
 * エディタ設定
 */
export interface EditorSettings {
  charsPerLine: number;          // 1行の文字数（18〜40文字）
  linesPerPage: number;          // ページあたりの行数
  fontSize: number;              // フォントサイズ (px)
  lineHeight: number;            // 行送り倍率
  showGrid: boolean;             // 原稿用紙グリッド表示
  theme: 'light' | 'dark' | 'sepia';
}

/**
 * アプリケーション統合状態 (AppState)
 * - 状態を外部モジュール変数に分散させず、一元管理する
 */
export interface AppState {
  version: number;
  folders: Folder[];
  documents: Document[];
  navigation: NavigationState;
  settings: EditorSettings;
  lastSavedAt: number;

  // 既存UI・ライフサイクルとの完全互換用プロパティ
  initialized: boolean;
  view: AppView;
  text: string;
  cursor: { line: number; column: number };
  history: string[];
  lastActiveAt: number;
  sessionStartedAt: number;
}

/**
 * 安全な初期エディタ設定を生成する。
 */
export function createDefaultSettings(): EditorSettings {
  return {
    charsPerLine: 20,
    linesPerPage: 20,
    fontSize: 16,
    lineHeight: 1.7,
    showGrid: true,
    theme: 'light',
  };
}

/**
 * 安全な初期状態（デフォルト値）を生成する。
 */
export function createInitialState(): AppState {
  const now = Date.now();
  const initialDocId = 'doc_initial_default';
  const defaultText = 'ここに小説を執筆... (土台実装中)';
  const initialDoc: Document = {
    id: initialDocId,
    title: '無題のノート',
    content: defaultText,
    folderId: null,
    order: 0,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  return {
    version: CURRENT_APP_VERSION,
    folders: [],
    documents: [initialDoc],
    navigation: {
      currentFolderId: null,
      activeDocumentId: initialDocId,
      expandedFolderIds: [],
      isSidebarOpen: true,
      currentView: 'documents',
    },
    settings: createDefaultSettings(),
    lastSavedAt: now,

    // 既存UI互換
    initialized: false,
    view: 'editor',
    text: defaultText,
    cursor: { line: 0, column: 0 },
    history: [],
    lastActiveAt: now,
    sessionStartedAt: now,
  };
}

/**
 * AppView の型ガード
 */
export function isValidAppView(view: unknown): view is AppView {
  return view === 'editor' || view === 'home' || view === 'settings' || view === 'trash';
}

/**
 * フォルダ循環（A → B → C → A など）を検知し、
 * 循環に関与しているフォルダの parentId を null（ルート）へ退避する。
 */
function resolveFolderCycles(folders: Folder[]): Folder[] {
  const folderMap = new Map<string, Folder>();
  folders.forEach((f) => folderMap.set(f.id, f));

  for (const folder of folders) {
    if (!folder.parentId) continue;

    let currentParentId: string | null = folder.parentId;
    const visited = new Set<string>([folder.id]);

    while (currentParentId !== null) {
      if (visited.has(currentParentId)) {
        logger.error('storage', `Cycle detected in folder hierarchy for "${folder.id}". Resetting parentId to null.`, {
          folderId: folder.id,
          cyclicParentId: currentParentId,
        });
        folder.parentId = null;
        break;
      }
      visited.add(currentParentId);
      const parent = folderMap.get(currentParentId);
      currentParentId = parent ? parent.parentId : null;
    }
  }

  return folders;
}

/**
 * 読み込んだデータを検証し、欠損・不正・型違い・未知の値を安全なデフォルト値で補完する。
 * 旧バージョンからのデータ移行も安全に行い、絶対に起動時クラッシュを起こさない。
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
  const now = Date.now();

  // 1. version
  let version = CURRENT_APP_VERSION;
  if (typeof data.version === 'number' && Number.isFinite(data.version)) {
    version = data.version;
  }

  // 2. folders のサニタイズ
  const sanitizedFolders: Folder[] = [];
  if (Array.isArray(data.folders)) {
    data.folders.forEach((item, index) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return;
      const f = item as Record<string, unknown>;

      const id = typeof f.id === 'string' && f.id.trim().length > 0 ? f.id.trim() : `folder_${now}_${index}`;
      const name = typeof f.name === 'string' && f.name.trim().length > 0 ? f.name : '無題のフォルダ';
      const parentId = typeof f.parentId === 'string' && f.parentId.trim().length > 0 ? f.parentId.trim() : null;
      const order = typeof f.order === 'number' && Number.isFinite(f.order) ? f.order : index;
      const createdAt = typeof f.createdAt === 'number' && Number.isFinite(f.createdAt) && f.createdAt > 0 ? f.createdAt : now;
      const updatedAt = typeof f.updatedAt === 'number' && Number.isFinite(f.updatedAt) && f.updatedAt > 0 ? f.updatedAt : createdAt;
      const deletedAt = typeof f.deletedAt === 'number' && Number.isFinite(f.deletedAt) && f.deletedAt > 0 ? f.deletedAt : null;

      sanitizedFolders.push({
        id,
        name,
        parentId,
        order,
        createdAt,
        updatedAt,
        deletedAt,
      });
    });
  }

  // フォルダIDセットの作成
  const folderIdSet = new Set<string>(sanitizedFolders.map((f) => f.id));

  // 実在しない parentId や自己参照を null にフォールバック
  sanitizedFolders.forEach((f) => {
    if (f.parentId && (!folderIdSet.has(f.parentId) || f.parentId === f.id)) {
      f.parentId = null;
    }
  });

  // 循環参照の検知とルート退避
  resolveFolderCycles(sanitizedFolders);

  // 3. documents のサニタイズ
  const sanitizedDocuments: Document[] = [];
  if (Array.isArray(data.documents)) {
    data.documents.forEach((item, index) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return;
      const d = item as Record<string, unknown>;

      const id = typeof d.id === 'string' && d.id.trim().length > 0 ? d.id.trim() : `doc_${now}_${index}`;
      const title = typeof d.title === 'string' && d.title.trim().length > 0 ? d.title : '無題のノート';
      const content = typeof d.content === 'string' ? d.content : typeof d.text === 'string' ? d.text : '';
      const rawFolderId = typeof d.folderId === 'string' && d.folderId.trim().length > 0 ? d.folderId.trim() : null;
      // 実在しないフォルダを指していたら安全にルート (null) へ
      const folderId = rawFolderId && folderIdSet.has(rawFolderId) ? rawFolderId : null;
      const order = typeof d.order === 'number' && Number.isFinite(d.order) ? d.order : index;
      const createdAt = typeof d.createdAt === 'number' && Number.isFinite(d.createdAt) && d.createdAt > 0 ? d.createdAt : now;
      const updatedAt = typeof d.updatedAt === 'number' && Number.isFinite(d.updatedAt) && d.updatedAt > 0 ? d.updatedAt : createdAt;
      const deletedAt = typeof d.deletedAt === 'number' && Number.isFinite(d.deletedAt) && d.deletedAt > 0 ? d.deletedAt : null;

      sanitizedDocuments.push({
        id,
        title,
        content,
        folderId,
        order,
        createdAt,
        updatedAt,
        deletedAt,
      });
    });
  }

  // 旧データからの移行対応: documents が空で、旧 text が存在する場合、旧 text を持つドキュメントを生成
  if (sanitizedDocuments.length === 0) {
    const legacyText = typeof data.text === 'string' ? data.text : defaultState.text;
    sanitizedDocuments.push({
      id: 'doc_migrated_default',
      title: '無題のノート',
      content: legacyText,
      folderId: null,
      order: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
  }

  const documentIdSet = new Set<string>(sanitizedDocuments.map((d) => d.id));

  // 4. navigation のサニタイズ
  const rawNav = (data.navigation && typeof data.navigation === 'object' && !Array.isArray(data.navigation))
    ? (data.navigation as Record<string, unknown>)
    : {};

  let currentFolderId: string | null = null;
  if (typeof rawNav.currentFolderId === 'string' && folderIdSet.has(rawNav.currentFolderId)) {
    currentFolderId = rawNav.currentFolderId;
  } else if (typeof data.currentFolderId === 'string' && folderIdSet.has(data.currentFolderId)) {
    currentFolderId = data.currentFolderId;
  }

  let activeDocumentId: string | null = null;
  if (typeof rawNav.activeDocumentId === 'string' && documentIdSet.has(rawNav.activeDocumentId)) {
    activeDocumentId = rawNav.activeDocumentId;
  } else if (typeof data.currentDocumentId === 'string' && documentIdSet.has(data.currentDocumentId)) {
    activeDocumentId = data.currentDocumentId;
  } else {
    // 存在しない場合は通常（未削除）の先頭ドキュメントを選択
    const activeDoc = sanitizedDocuments.find((d) => d.deletedAt === null) || sanitizedDocuments[0];
    activeDocumentId = activeDoc ? activeDoc.id : null;
  }

  const expandedFolderIds: string[] = [];
  if (Array.isArray(rawNav.expandedFolderIds)) {
    rawNav.expandedFolderIds.forEach((id) => {
      if (typeof id === 'string' && folderIdSet.has(id) && !expandedFolderIds.includes(id)) {
        expandedFolderIds.push(id);
      }
    });
  }

  const isSidebarOpen = typeof rawNav.isSidebarOpen === 'boolean' ? rawNav.isSidebarOpen : true;
  const currentView: 'documents' | 'trash' = rawNav.currentView === 'trash' ? 'trash' : 'documents';

  const sanitizedNav: NavigationState = {
    currentFolderId,
    activeDocumentId,
    expandedFolderIds,
    isSidebarOpen,
    currentView,
  };

  // 5. settings のサニタイズ
  const defaultSettings = createDefaultSettings();
  const rawSettings = (data.settings && typeof data.settings === 'object' && !Array.isArray(data.settings))
    ? (data.settings as Record<string, unknown>)
    : {};

  const charsPerLine =
    typeof rawSettings.charsPerLine === 'number' && Number.isFinite(rawSettings.charsPerLine) && rawSettings.charsPerLine >= 10 && rawSettings.charsPerLine <= 60
      ? rawSettings.charsPerLine
      : defaultSettings.charsPerLine;

  const linesPerPage =
    typeof rawSettings.linesPerPage === 'number' && Number.isFinite(rawSettings.linesPerPage) && rawSettings.linesPerPage >= 5 && rawSettings.linesPerPage <= 60
      ? rawSettings.linesPerPage
      : defaultSettings.linesPerPage;

  const fontSize =
    typeof rawSettings.fontSize === 'number' && Number.isFinite(rawSettings.fontSize) && rawSettings.fontSize >= 10 && rawSettings.fontSize <= 36
      ? rawSettings.fontSize
      : defaultSettings.fontSize;

  const lineHeight =
    typeof rawSettings.lineHeight === 'number' && Number.isFinite(rawSettings.lineHeight) && rawSettings.lineHeight >= 1.0 && rawSettings.lineHeight <= 3.0
      ? rawSettings.lineHeight
      : defaultSettings.lineHeight;

  const showGrid = typeof rawSettings.showGrid === 'boolean' ? rawSettings.showGrid : defaultSettings.showGrid;
  const theme = rawSettings.theme === 'dark' || rawSettings.theme === 'sepia' ? rawSettings.theme : 'light';

  const sanitizedSettings: EditorSettings = {
    charsPerLine,
    linesPerPage,
    fontSize,
    lineHeight,
    showGrid,
    theme,
  };

  // 6. 既存互換プロパティのサニタイズ
  const view: AppView = isValidAppView(data.view) ? data.view : defaultState.view;

  // text: activeDocumentId が指すノートの content と同期
  let text = defaultState.text;
  if (activeDocumentId) {
    const activeDoc = sanitizedDocuments.find((d) => d.id === activeDocumentId);
    if (activeDoc) {
      text = activeDoc.content;
    }
  } else if (typeof data.text === 'string') {
    text = data.text;
  }

  // cursor
  let cursor = defaultState.cursor;
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
    cursor = { line, column };
  }

  // history
  const history = Array.isArray(data.history) && data.history.every((item) => typeof item === 'string')
    ? data.history.slice(-50)
    : [];

  // タイムスタンプ類
  const lastActiveAt =
    typeof data.lastActiveAt === 'number' && Number.isFinite(data.lastActiveAt) && data.lastActiveAt > 0
      ? data.lastActiveAt
      : now;

  const sessionStartedAt =
    typeof data.sessionStartedAt === 'number' && Number.isFinite(data.sessionStartedAt) && data.sessionStartedAt > 0
      ? data.sessionStartedAt
      : now;

  const lastSavedAt =
    typeof data.lastSavedAt === 'number' && Number.isFinite(data.lastSavedAt) && data.lastSavedAt > 0
      ? data.lastSavedAt
      : now;

  return {
    version,
    folders: sanitizedFolders,
    documents: sanitizedDocuments,
    navigation: sanitizedNav,
    settings: sanitizedSettings,
    lastSavedAt,
    initialized: false,
    view,
    text,
    cursor,
    history,
    lastActiveAt,
    sessionStartedAt,
  };
}

let state: AppState = createInitialState();

const listeners = new Set<() => void>();

export const appState = {
  get(): AppState {
    return state;
  },
  set(nextState: Partial<AppState>) {
    // 1. ベースとなる documents 配列の決定
    let finalDocuments = nextState.documents !== undefined ? nextState.documents : state.documents;

    // 2. 遷移先（最新）の navigation オブジェクトの決定
    const finalNavigation = nextState.navigation !== undefined
      ? { ...state.navigation, ...nextState.navigation }
      : state.navigation;

    const activeId = finalNavigation.activeDocumentId;

    // 3. text の更新（appState.set({ text: "..." })）が渡された場合、
    // アクティブなドキュメントの content 側を「正」として更新（および updatedAt の更新）
    if (typeof nextState.text === 'string' && activeId) {
      const targetDocIndex = finalDocuments.findIndex((d) => d.id === activeId);
      if (targetDocIndex !== -1 && finalDocuments[targetDocIndex].content !== nextState.text) {
        const updatedDoc = {
          ...finalDocuments[targetDocIndex],
          content: nextState.text,
          updatedAt: Date.now(),
        };
        finalDocuments = [
          ...finalDocuments.slice(0, targetDocIndex),
          updatedDoc,
          ...finalDocuments.slice(targetDocIndex + 1),
        ];
      }
    }

    // 4. 最新のアクティブドキュメントの content を text キャッシュへ自動逆同期
    let syncedText = state.text;
    if (activeId) {
      const currentActiveDoc = finalDocuments.find((d) => d.id === activeId);
      if (currentActiveDoc) {
        syncedText = currentActiveDoc.content;
      } else if (typeof nextState.text === 'string') {
        syncedText = nextState.text;
      }
    } else if (typeof nextState.text === 'string') {
      syncedText = nextState.text;
    }

    state = {
      ...state,
      ...nextState,
      documents: finalDocuments,
      navigation: finalNavigation,
      text: syncedText,
      lastActiveAt: Date.now(),
    };

    logger.log('state', 'State updated', Object.keys(nextState));
    listeners.forEach((listener) => listener());
  },
  replace(newState: AppState) {
    let syncedText = newState.text;
    const activeId = newState.navigation.activeDocumentId;
    if (activeId) {
      const activeDoc = newState.documents.find((d) => d.id === activeId);
      if (activeDoc) {
        syncedText = activeDoc.content;
      }
    }

    state = {
      ...newState,
      text: syncedText,
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


