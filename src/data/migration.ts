/**
 * 旧 Hirakawa からのデータ移行を管理する。
 */
export const migration = {
  migrate: (legacyData: any) => {
    console.log('Migrated from legacy', legacyData);
  }
};
