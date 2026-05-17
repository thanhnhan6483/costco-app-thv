'use client';
import { Component, ReactNode } from 'react';
import styles from './MainLayout.module.css';
import Sidebar from '@/components/Sidebar/Sidebar';
import Topbar from '@/components/Topbar/Topbar';
import { useApp } from '@/context/AppContext';

import Dashboard from '@/components/pages/Dashboard/Dashboard';
import Departments from '@/components/pages/Departments/Departments';
import Shifts from '@/components/pages/Shifts/Shifts';
import LeaveTypes from '@/components/pages/LeaveTypes/LeaveTypes';
import SpecialGroups from '@/components/pages/SpecialGroups/SpecialGroups';
import AllocRules from '@/components/pages/AllocRules/AllocRules';
import AttendanceGrid from '@/components/pages/AttendanceGrid/AttendanceGrid';
import PlaceholderPage from '@/components/pages/PlaceholderPage/PlaceholderPage';
import ConfigMonth from '@/components/pages/ConfigMonth/ConfigMonth';
import ImportEmployees from '@/components/pages/ImportEmployees/ImportEmployees';
import AutoAlloc from '@/components/pages/AutoAlloc/AutoAlloc';
import ExportAttendance from '@/components/pages/ExportAttendance/ExportAttendance';

class ErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null };
  static getDerivedStateFromError(e: Error) { return { error: e.message }; }
  render() {
    if (this.state.error) return (
      <div style={{ padding: 32, color: '#b91c1c', background: '#fef2f2', borderRadius: 8, margin: 16 }}>
        <strong>Lỗi:</strong> {this.state.error}
        <br /><button style={{ marginTop: 12, padding: '4px 12px' }} onClick={() => this.setState({ error: null })}>Thử lại</button>
      </div>
    );
    return this.props.children;
  }
}

function renderPage(page: string) {
  switch (page) {
    case 'dashboard':        return <Dashboard />;
    case 'config-month':     return <ConfigMonth />;
    case 'departments':      return <Departments />;
    case 'shifts':           return <Shifts />;
    case 'leave-types':      return <LeaveTypes />;
    case 'special-groups':   return <SpecialGroups />;
    case 'alloc-rules':      return <AllocRules />;
    case 'attendance-grid':  return <AttendanceGrid />;
    case 'import-employees': return <ImportEmployees />;
    case 'export-config':
      return <PlaceholderPage title="Xuất Cấu Hình" icon="📤" description="Xuất toàn bộ cấu hình tháng ra file để lưu trữ hoặc chia sẻ." />;
    case 'auto-alloc':      return <ErrorBoundary><AutoAlloc /></ErrorBoundary>;
    case 'export-attendance':
      return <ExportAttendance />;
    default:
      return <Dashboard />;
  }
}

export default function MainLayout() {
  const { currentPage, sidebarCollapsed } = useApp();

  return (
    <div className={styles.layout}>
      <Sidebar />
      <div className={`${styles.content} ${sidebarCollapsed ? styles.contentExpanded : ''}`}>
        <Topbar />
        <main className={styles.main} key={currentPage}>
          {renderPage(currentPage)}
        </main>
      </div>
    </div>
  );
}
