// src/core/state/appState.ts

import { z } from 'zod';
import { logger } from '../../utils/logger';

export const AppViewSchema = z.enum(['editor', 'home', 'settings', 'trash']);
export type AppView = z.infer<typeof AppViewSchema>;

export const CURRENT_APP_VERSION = 2;
export const DEFAULT_PROJECT_ID = 'default_project';

/**
 * フォルダのデータモデル
 * - parentId による自己参照（フラット管理）で多層階層を表現
 */
export const FolderSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string(),
  parentId: z.string().nullable(),      // ルート階層なら null、親フォルダ配下なら親の folder.id
  order: z.number(),                    // 並び順情報（初期値やインデックス）
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),     // null: 通常、タイムスタンプ: ゴミ箱内
});
export type Folder = z.infer<typeof FolderSchema>;

/**
 * ノート（文書）のデータモデル
 */
export const DocumentSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  title: z.string(),
  content: z.string(),                  // 本文（長文小説前提）
  folderId: z.string().nullable(),      // ルート階層なら null、フォルダ配下なら folder.id
  order: z.number(),                    // 並び順情報
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),     // null: 通常、タイムスタンプ: ゴミ箱内
});
export type Document = z.infer<typeof DocumentSchema>;

/**
 * 画面・ナビゲーション状態
 * - タブ復帰・PWA再起動時に前回の作業状態を完全復帰するための状態
 */
export const NavigationStateSchema = z.object({
  currentFolderId: z.string().nullable(),    // 現在サイドバー/一覧で表示しているフォルダ（ルートは null）
  activeDocumentId: z.string().nullable(),   // 現在エディタで開いているノート
  expandedFolderIds: z.array(z.string()),    // サイドバーで展開されているフォルダID一覧
  isSidebarOpen: z.boolean(),                // サイドバーの開閉状態
  currentView: z.enum(['documents', 'trash']), // 通常ドキュメント一覧かゴミ箱か
});
export type NavigationState = z.infer<typeof NavigationStateSchema>;

/**
 * エディタ設定
 * - 数値範囲制限などの単純な値の正規化は Zod スキーマで一元管理
 */
export const EditorSettingsSchema = z.object({
  charsPerLine: z.number().int().min(10).max(60), // 1行の文字数（10〜60文字）
  linesPerPage: z.number().int().min(5).max(60),   // ページあたりの行数（5〜60行）
  fontSize: z.number().min(10).max(36),           // フォントサイズ (10〜36px)
  lineHeight: z.number().min(1.0).max(3.0),       // 行送り倍率 (1.0〜3.0)
  showGrid: z.boolean(),                          // 原稿用紙グリッド表示
  theme: z.enum(['light', 'dark', 'sepia']),
});
export type EditorSettings = z.infer<typeof EditorSettingsSchema>;

/**
 * カーソル位置
 */
export const CursorSchema = z.object({
  line: z.number(),
  column: z.number(),
});
export type Cursor = z.infer<typeof CursorSchema>;

/**
 * アプリケーション統合状態 (AppState)
 * - 状態を外部モジュール変数に分散させず、一元管理する
 */
export const AppStateSchema = z.object({
  version: z.number(),
  folders: z.array(FolderSchema),
  documents: z.array(DocumentSchema),
  navigation: NavigationStateSchema,
  settings: EditorSettingsSchema,
  lastSavedAt: z.number(),

  // 既存UI・ライフサイクルとの完全互換用プロパティ
  initialized: z.boolean(),
  view: AppViewSchema,
  text: z.string(),
  cursor: CursorSchema,
  history: z.array(z.string()),
  lastActiveAt: z.number(),
  sessionStartedAt: z.number(),
});
export type AppState = z.infer<typeof AppStateSchema>;

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
    projectId: DEFAULT_PROJECT_ID,
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
  return AppViewSchema.safeParse(view).success;
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

  // Zod による実行時データ構造検証
  const zodValidation = AppStateSchema.safeParse(raw);
  if (zodValidation.success) {
    logger.log('storage', 'AppState structure successfully verified with Zod Schema', {
      location: 'sanitizeAppState',
      key,
    });
  } else {
    logger.log('storage', 'Raw data did not fully match AppStateSchema; executing domain sanitization and fallback', {
      location: 'sanitizeAppState',
      key,
      issues: zodValidation.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).slice(0, 5),
    });
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
      const projectId = typeof f.projectId === 'string' && f.projectId.trim().length > 0 ? f.projectId.trim() : DEFAULT_PROJECT_ID;
      const name = typeof f.name === 'string' && f.name.trim().length > 0 ? f.name : '無題のフォルダ';
      const parentId = typeof f.parentId === 'string' && f.parentId.trim().length > 0 ? f.parentId.trim() : null;
      const order = typeof f.order === 'number' && Number.isFinite(f.order) ? f.order : index;
      const createdAt = typeof f.createdAt === 'number' && Number.isFinite(f.createdAt) && f.createdAt > 0 ? f.createdAt : now;
      const updatedAt = typeof f.updatedAt === 'number' && Number.isFinite(f.updatedAt) && f.updatedAt > 0 ? f.updatedAt : createdAt;
      const deletedAt = typeof f.deletedAt === 'number' && Number.isFinite(f.deletedAt) && f.deletedAt > 0 ? f.deletedAt : null;

      sanitizedFolders.push({
        id,
        projectId,
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
      const projectId = typeof d.projectId === 'string' && d.projectId.trim().length > 0 ? d.projectId.trim() : DEFAULT_PROJECT_ID;
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
        projectId,
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
      projectId: DEFAULT_PROJECT_ID,
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

  // 5. settings のサニタイズ（Zod Schema による数値範囲と型の検証・正規化）
  const defaultSettings = createDefaultSettings();
  const parsedSettings = EditorSettingsSchema.safeParse(data.settings);
  let sanitizedSettings: EditorSettings;

  if (parsedSettings.success) {
    sanitizedSettings = parsedSettings.data;
  } else {
    // 欠損や一部異常値がある場合は、項目ごとにスキーマ検証し、不正な項目のみ安全なデフォルト値へフォールバック
    const rawSettings = (data.settings && typeof data.settings === 'object' && !Array.isArray(data.settings))
      ? (data.settings as Record<string, unknown>)
      : {};

    const charsPerLine = EditorSettingsSchema.shape.charsPerLine.safeParse(rawSettings.charsPerLine).success
      ? (rawSettings.charsPerLine as number)
      : defaultSettings.charsPerLine;

    const linesPerPage = EditorSettingsSchema.shape.linesPerPage.safeParse(rawSettings.linesPerPage).success
      ? (rawSettings.linesPerPage as number)
      : defaultSettings.linesPerPage;

    const fontSize = EditorSettingsSchema.shape.fontSize.safeParse(rawSettings.fontSize).success
      ? (rawSettings.fontSize as number)
      : defaultSettings.fontSize;

    const lineHeight = EditorSettingsSchema.shape.lineHeight.safeParse(rawSettings.lineHeight).success
      ? (rawSettings.lineHeight as number)
      : defaultSettings.lineHeight;

    const showGrid = EditorSettingsSchema.shape.showGrid.safeParse(rawSettings.showGrid).success
      ? (rawSettings.showGrid as boolean)
      : defaultSettings.showGrid;

    const theme = EditorSettingsSchema.shape.theme.safeParse(rawSettings.theme).success
      ? (rawSettings.theme as EditorSettings['theme'])
      : defaultSettings.theme;

    sanitizedSettings = {
      charsPerLine,
      linesPerPage,
      fontSize,
      lineHeight,
      showGrid,
      theme,
    };
  }

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

  const candidateState: AppState = {
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

  // Zod による最終確定データの安全性検証
  const finalValidation = AppStateSchema.safeParse(candidateState);
  if (!finalValidation.success) {
    logger.error('storage', 'Sanitized state failed final AppStateSchema validation; falling back to initial state', {
      location: 'sanitizeAppState (final validation)',
      key,
      issues: finalValidation.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
    });
    return defaultState;
  }

  return finalValidation.data;
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


