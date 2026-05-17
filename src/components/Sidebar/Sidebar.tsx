'use client';
import styles from './Sidebar.module.css';
import { useApp } from '@/context/AppContext';
import { PageKey } from '@/types';

interface NavItem {
  key: PageKey;
  icon: string;
  label: string;
  badge?: string;
}

/* ── Quản lý chung ─────────────────────────────── */
const MODULE0: NavItem[] = [
  { key: 'config-month', icon: '📅', label: 'Tháng Chấm công' },
];

/* ── Cấu hình Phân bổ ───────────────────────── */
const MODULE1: NavItem[] = [
  { key: 'departments', icon: '🏢', label: 'Phòng Ban' },
  { key: 'shifts', icon: '🕐', label: 'Ca Làm Việc' },
  { key: 'leave-types', icon: '📋', label: 'Loại Nghỉ Phép' },
  { key: 'special-groups', icon: '👥', label: 'Nhóm Đặc Thù' },
  { key: 'alloc-rules', icon: '⚙️', label: 'Quy Tắc Phân Bổ' },
  { key: 'import-employees', icon: '👥', label: 'Danh sách Nhân viên' },
];

/* ── PHÂN BỔ CHẤM CÔNG ────────────── */
const MODULE2: NavItem[] = [
  { key: 'auto-alloc', icon: '🤖', label: 'Phân Bổ Tự Động' },
  { key: 'export-attendance', icon: '📑', label: 'Xuất Báo Cáo' },
];

function NavList({ items, currentPage, navigate, collapsed }: {
  items: NavItem[];
  currentPage: string;
  navigate: (k: PageKey) => void;
  collapsed: boolean;
}) {
  return (
    <>
      {items.map(item => (
        <button
          key={item.key}
          className={`${styles.navItem} ${currentPage === item.key ? styles.active : ''}`}
          onClick={() => navigate(item.key)}
          title={collapsed ? item.label : undefined}
        >
          <span className={styles.navIcon}>{item.icon}</span>
          {!collapsed && <span className={styles.navLabel}>{item.label}</span>}
          {!collapsed && item.badge && (
            <span className={styles.badge}>{item.badge}</span>
          )}
        </button>
      ))}
    </>
  );
}

export default function Sidebar() {
  const { currentPage, setCurrentPage, sidebarCollapsed, toggleSidebar } = useApp();
  const navigate = (key: PageKey) => setCurrentPage(key);

  return (
    <aside className={`${styles.sidebar} ${sidebarCollapsed ? styles.collapsed : ''}`}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>C</div>
          {!sidebarCollapsed && (
            <div className={styles.logoText}>
              <span className={styles.logoTitle}>COSTCO</span>
              <span className={styles.logoSub}>Quản Lý Chấm Công</span>
            </div>
          )}
        </div>
        <button className={styles.toggleBtn} onClick={toggleSidebar} title="Thu/Mở menu">
          {sidebarCollapsed ? '▶' : '◀'}
        </button>
      </div>

      {/* Nav */}
      <nav className={styles.nav}>

        {/* ── Quản lý chung ── */}
        <div className={styles.section}>
          {!sidebarCollapsed && (
            <div className={styles.sectionTitle}>QUẢN LÝ CHUNG</div>
          )}
          <NavList items={MODULE0} currentPage={currentPage} navigate={navigate} collapsed={sidebarCollapsed} />
        </div>

        <div className={styles.divider} />

        {/* ── Cấu hình Phân bổ ── */}
        <div className={styles.section}>
          {!sidebarCollapsed && (
            <div className={styles.sectionTitle}>Cấu hình Phân bổ</div>
          )}
          <NavList items={MODULE1} currentPage={currentPage} navigate={navigate} collapsed={sidebarCollapsed} />
        </div>

        <div className={styles.divider} />

        {/* ── Phân bổ ── */}
        <div className={styles.section}>
          {!sidebarCollapsed && (
            <div className={styles.sectionTitle}>PHÂN BỔ CHẤM CÔNG</div>
          )}
          <NavList items={MODULE2} currentPage={currentPage} navigate={navigate} collapsed={sidebarCollapsed} />
        </div>

      </nav>

      {/* Footer */}
      <div className={styles.footer}>
        <div className={styles.userAvatar}>HR</div>
        {!sidebarCollapsed && (
          <div className={styles.userInfo}>
            <span className={styles.userName}>Admin HR</span>
            <span className={styles.userRole}>Quản trị viên</span>
          </div>
        )}
      </div>
    </aside>
  );
}
