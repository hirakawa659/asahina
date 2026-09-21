import React from 'react';
import { FileText, Trash2, FolderOpen } from 'lucide-react';
import { navigation } from '../core/navigation';
import { useAppState } from '../core/state/useAppState';

/**
 * サイドバーUI。
 */
export function Sidebar() {
  const { view } = useAppState();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        Hirakawa
      </div>
      <nav className="sidebar-nav">
        <SidebarItem 
          icon={<FileText size={18} />} 
          label="執筆中" 
          active={view === 'editor'} 
          onClick={() => navigation.navigate('editor')}
        />
        <SidebarItem 
          icon={<FolderOpen size={18} />} 
          label="ドキュメント" 
          onClick={() => navigation.navigate('home')}
        />
        <SidebarItem 
          icon={<Trash2 size={18} />} 
          label="ゴミ箱" 
          active={view === 'trash'}
          onClick={() => navigation.navigate('trash')}
        />
      </nav>
      <div className="sidebar-footer">
        <SidebarItem 
          label="バグ診断" 
          active={view === 'settings'}
          onClick={() => {
            if (view === 'settings') {
              navigation.navigate('editor');
            } else {
              navigation.navigate('settings');
            }
          }}
        />
      </div>
    </aside>
  );
}

function SidebarItem({ 
  icon, 
  label, 
  active = false, 
  onClick 
}: { 
  icon?: React.ReactNode; 
  label: string; 
  active?: boolean;
  onClick?: () => void;
}) {
  const className = `sidebar-item ${active ? 'active' : ''}`;
  return (
    <div className={className} onClick={onClick}>
      {icon}
      <span>{label}</span>
    </div>
  );
}
