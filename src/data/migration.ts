import { logger } from '../utils/logger';

/**
 * 旧 Hirakawa または過去のスキーマからのデータ移行を管理する。
 */
export const migration = {
  /**
   * 過去スキーマや旧バージョンのデータを現在のデータ構造にマイグレーションする。
   */
  migrate: (legacyData: unknown, key: string = 'unknown_key'): Record<string, unknown> | null => {
    try {
      if (!legacyData || typeof legacyData !== 'object' || Array.isArray(legacyData)) {
        logger.error('storage', 'Migration skipped: input data is not an object', {
          location: 'migration.migrate',
          key,
          actualType: legacyData === null ? 'null' : Array.isArray(legacyData) ? 'array' : typeof legacyData,
          fallback: 'proceed with default fallback sanitization',
        });
        return null;
      }

      const data = legacyData as Record<string, unknown>;
      const migrated: Record<string, unknown> = { ...data };

      // 旧形式データの移行処理
      // 例: 旧バージョンで 'content' というキーにテキストが入っていた場合、'text' に引き継ぐ
      if (typeof data.content === 'string' && typeof data.text !== 'string') {
        migrated.text = data.content;
        logger.log('storage', 'Migrated legacy field "content" to "text"', {
          location: 'migration.migrate',
          key,
        });
      }

      // 旧バージョンでカーソル情報が直接 line/column ではなく x/y や row/col だった場合の移行
      if (
        !data.cursor &&
        typeof data.row === 'number' &&
        typeof data.col === 'number'
      ) {
        migrated.cursor = { line: data.row, column: data.col };
        logger.log('storage', 'Migrated legacy row/col to cursor object', {
          location: 'migration.migrate',
          key,
        });
      }

      return migrated;
    } catch (e) {
      logger.error('storage', 'Migration failed due to unexpected error', {
        location: 'migration.migrate',
        key,
        error: e instanceof Error ? e.message : String(e),
        fallback: 'proceed with default fallback sanitization',
      });
      return null;
    }
  }
};

