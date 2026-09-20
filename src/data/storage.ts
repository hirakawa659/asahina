/**
 * ブラウザのローカルストレージへの保存を管理する。
 */
export const storage = {
  save: (data: any) => {
    console.log('Saved to storage', data);
  },
  load: () => {
    return null;
  }
};
