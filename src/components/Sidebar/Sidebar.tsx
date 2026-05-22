'use client';
import styles from './Sidebar.module.css';
import { useApp } from '@/context/AppContext';
import { PageKey } from '@/types';
import logo from '../../../public/logo_thv.png';

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
  { key: 'auto-alloc', icon: '🤖', label: 'Bảng Chấm Công' },
  { key: 'export-attendance', icon: '📑', label: 'Xuất Báo Cáo' },
];

/* ── Hệ thống ───────────────────────────────── */
const MODULE3: NavItem[] = [
  { key: 'user-management', icon: '🔐', label: 'Quản lý tài khoản' },
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
        <div
          className={`${styles.logo} ${currentPage !== 'dashboard' ? styles.logoClickable : ''}`}
          onClick={() => currentPage !== 'dashboard' && navigate('dashboard')}
          title={currentPage !== 'dashboard' ? 'Về trang chủ' : undefined}
        >
          <div className={styles.logoIcon}><img src={logo.src} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 10 }} /></div>
          {!sidebarCollapsed && (
            <div className={styles.logoText}>
              <span className={styles.logoTitle}>TÂN HUÊ VIÊN</span>
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

        <div className={styles.divider} />

        {/* ── Hệ thống ── */}
        <div className={styles.section}>
          {!sidebarCollapsed && (
            <div className={styles.sectionTitle}>HỆ THỐNG</div>
          )}
          <NavList items={MODULE3} currentPage={currentPage} navigate={navigate} collapsed={sidebarCollapsed} />
        </div>

      </nav>

      {/* Footer */}
    </aside>
  );
}
