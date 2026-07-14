import React from 'react';
import { Outlet, Link } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div style={styles.pageWrapper}>
      <div style={styles.authContainer}>
        {/* Left Side: Brand Panel */}
        <div style={styles.brandPanel}>
          <div style={styles.brandContent}>
            <Link to="/" style={styles.logoLink}>
              <span style={styles.logoText}>SkillSetGo</span>
              <span style={styles.logoBadge}>SaaS</span>
            </Link>
            <h1 style={styles.brandTitle}>Next-Gen Restaurant OS</h1>
            <p style={styles.brandSubtitle}>
              Offline-first billing, intelligent table maps, and custom hardware plugin bridges built for modern food outlets.
            </p>
            <div style={styles.graphicBlock}>
              <div style={styles.circle1}></div>
              <div style={styles.circle2}></div>
            </div>
          </div>
        </div>

        {/* Right Side: Form Panel */}
        <div style={styles.formPanel}>
          <div style={styles.formCard}>
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pageWrapper: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#F7F5F0', // warm grey backdrop
    padding: 'var(--space-md)',
  },
  authContainer: {
    display: 'flex',
    width: '100%',
    maxWidth: '1000px',
    height: '620px',
    backgroundColor: 'var(--color-surface)',
    borderRadius: 'var(--radius-xl)',
    boxShadow: 'var(--shadow-lg)',
    overflow: 'hidden',
  },
  brandPanel: {
    flex: 1,
    backgroundColor: 'var(--color-primary)',
    backgroundImage: 'linear-gradient(135deg, var(--color-primary) 0%, #611701 100%)',
    padding: 'var(--space-2xl)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    color: '#FFFFFF',
    position: 'relative',
    overflow: 'hidden',
  },
  brandContent: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    justifyContent: 'space-between',
  },
  logoLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
    textDecoration: 'none',
  },
  logoText: {
    fontFamily: 'var(--font-display)',
    fontWeight: 800,
    fontSize: '24px',
    color: '#FFFFFF',
  },
  logoBadge: {
    backgroundColor: 'var(--color-accent)',
    color: 'var(--color-accent-text)',
    fontSize: '11px',
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 'var(--radius-pill)',
  },
  brandTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: 'var(--font-h2-size)',
    fontWeight: 700,
    marginTop: 'var(--space-xl)',
    marginBottom: 'var(--space-sm)',
  },
  brandSubtitle: {
    fontFamily: 'var(--font-body)',
    fontSize: '15px',
    lineHeight: '1.6',
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: 300,
  },
  graphicBlock: {
    position: 'relative',
    height: '140px',
    marginTop: 'var(--space-md)',
  },
  circle1: {
    position: 'absolute',
    bottom: '-20px',
    left: '-20px',
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    backgroundColor: 'rgba(253, 211, 85, 0.15)', // accent circle
  },
  circle2: {
    position: 'absolute',
    bottom: '20px',
    left: '60px',
    width: '70px',
    height: '70px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  formPanel: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 'var(--space-2xl)',
    backgroundColor: 'var(--color-surface)',
  },
  formCard: {
    width: '100%',
    maxWidth: '360px',
  },
};
