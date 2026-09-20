import React from 'react';
import { Settings, FileText, Trash2, FolderOpen } from 'lucide-react';

/**
 * サイドバーUI。
 */
export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        Hirakawa
      </div>
      <nav className="sidebar-nav">
        <SidebarItem icon={<FileText size={18} />} label="執筆中" active />
        <SidebarItem icon={<FolderOpen size={18} />} label="ドキュメント" />
        <SidebarItem icon={<Trash2 size={18} />} label="ゴミ箱" />
      </nav>
      <div className="sidebar-footer">
        <SidebarItem icon={<Settings size={18} />} label="設定" />
      </div>
    </aside>
  );
}

function SidebarItem({ icon, label, active = false }: { icon: React.ReactNode; label: string; active?: boolean }) {
  const className = `sidebar-item ${active ? 'active' : ''}`;
  return (
    <div className={className}>
      {icon}
      <span>{label}</span>
    </div>
  );
}
