/**
 * アプリ全体の動作を追跡するためのデバッグロガー。
 */
export type LogCategory = 'navigation' | 'state' | 'storage' | 'editor' | 'lifecycle' | 'error';

class DebugLogger {
  private isEnabled: boolean = import.meta.env.DEV;

  log(category: LogCategory, message: string, data?: any) {
    if (!this.isEnabled) return;

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${category.toUpperCase()}]`;

    if (data) {
      console.log(prefix, message, data);
    } else {
      console.log(prefix, message);
    }
  }

  error(category: LogCategory, message: string, error?: any) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${category.toUpperCase()}] ERROR:`;
    console.error(prefix, message, error);
  }
}

export const logger = new DebugLogger();
