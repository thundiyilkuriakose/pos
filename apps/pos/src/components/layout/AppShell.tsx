import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store.ts';

export default function AppShell() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div style={styles.shellContainer}>
      {/* Sidebar Nav */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <span style={styles.logoText}>SkillSetGo</span>
          <span style={styles.logoBadge}>POS</span>
        </div>
        <nav style={styles.navMenu}>
          <Link to="/dashboard" style={styles.navItem}>
            <span style={styles.navIcon}>📊</span> Dashboard
          </Link>
          <Link to="/tables" style={styles.navItem}>
            <span style={styles.navIcon}>🪑</span> Floorplan
          </Link>
          <Link to="/menu" style={styles.navItem}>
            <span style={styles.navIcon}>🍔</span> Catalog
          </Link>
          <Link to="/queue" style={styles.navItem}>
            <span style={styles.navIcon}>📋</span> Waiting Queue
          </Link>
          {(user?.role === 'owner' || user?.role === 'manager') && (
            <Link to="/settings" style={styles.navItem}>
              <span style={styles.navIcon}>⚙️</span> Outlet Settings
            </Link>
          )}
        </nav>
        <div style={styles.sidebarFooter}>
          <div style={styles.userInfo}>
            <span style={styles.userName}>{user?.name || 'STAFF'}</span>
            <span style={styles.userRole}>{user?.role || 'Waiter'}</span>
          </div>
          <button style={styles.logoutBtn} onClick={handleLogout}>
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Panel */}
      <div style={styles.mainWrapper}>
        <header style={styles.header}>
          <div style={styles.headerTitle}>System Terminal</div>
          <div style={styles.syncStatus}>
            <span style={styles.syncDot}></span>
            <span style={styles.syncText}>Firestore Synced</span>
          </div>
        </header>

        <main style={styles.contentArea}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  shellContainer: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: 'var(--color-background)',
  },
  sidebar: {
    width: '280px',
    backgroundColor: '#FFFFFF',
    borderRight: '1px solid var(--color-border)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    position: 'sticky',
    top: 0,
    height: '100vh',
    zIndex: 10,
  },
  sidebarHeader: {
    padding: 'var(--space-xl) var(--space-lg)',
    borderBottom: '1px solid var(--color-border)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-xs)',
  },
  logoText: {
    fontFamily: 'var(--font-display)',
    fontWeight: 800,
    fontSize: '24px',
    color: 'var(--color-primary)',
  },
  logoBadge: {
    backgroundColor: 'var(--color-accent)',
    color: 'var(--color-accent-text)',
    fontSize: '11px',
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 'var(--radius-pill)',
  },
  navMenu: {
    flex: 1,
    padding: 'var(--space-md)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-xs)',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-md)',
    padding: '12px 16px',
    borderRadius: 'var(--radius-md)',
    color: 'var(--color-text)',
    textDecoration: 'none',
    fontWeight: 500,
    fontFamily: 'var(--font-display)',
    transition: 'background var(--transition-fast)',
  },
  navIcon: {
    fontSize: '18px',
  },
  sidebarFooter: {
    padding: 'var(--space-lg)',
    borderTop: '1px solid var(--color-border)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-md)',
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  userName: {
    fontWeight: 600,
    fontSize: '15px',
    color: 'var(--color-text)',
  },
  userRole: {
    fontSize: '13px',
    color: 'var(--color-text-muted)',
    textTransform: 'capitalize',
  },
  logoutBtn: {
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: '14px',
    color: '#FFFFFF',
    backgroundColor: 'var(--color-primary)',
    border: 'none',
    padding: '10px',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    textAlign: 'center',
  },
  mainWrapper: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 'var(--space-md) var(--space-xl)',
    backgroundColor: '#FFFFFF',
    borderBottom: '1px solid var(--color-border)',
    position: 'sticky',
    top: 0,
    zIndex: 9,
  },
  headerTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '18px',
    fontWeight: 600,
    color: 'var(--color-text)',
  },
  syncStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
  },
  syncDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-sync-online)',
  },
  syncText: {
    fontSize: '13px',
    color: 'var(--color-text-muted)',
  },
  contentArea: {
    flex: 1,
    backgroundColor: 'var(--color-background)',
  },
};
