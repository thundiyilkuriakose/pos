import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';

export default function PublicLayout() {
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      <nav style={styles.navbar}>
        <div style={styles.navBrand}>
          <Link to="/" style={styles.brandLink}>
            <span style={styles.logoText}>SkillSetGo</span>
            <span style={styles.logoBadge}>SaaS</span>
          </Link>
        </div>
        <div style={styles.navLinks}>
          <a href="#features" style={styles.navLink}>Features</a>
          <a href="#pricing" style={styles.navLink}>Pricing</a>
          <a href="#hardware" style={styles.navLink}>Hardware</a>
        </div>
        <div style={styles.navAuth}>
          <button style={styles.loginBtn} onClick={() => navigate('/login')}>
            Log In
          </button>
          <button style={styles.signupBtn} onClick={() => navigate('/signup')}>
            Get Started
          </button>
        </div>
      </nav>

      <div style={styles.bodyContent}>
        <Outlet />
      </div>

      <footer style={styles.footer}>
        <div style={styles.footerInner}>
          <p style={styles.footerText}>&copy; 2026 SkillSetGo POS. All rights reserved.</p>
          <div style={styles.footerLinks}>
            <a href="#terms" style={styles.footerLink}>Terms</a>
            <a href="#privacy" style={styles.footerLink}>Privacy Policy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    backgroundColor: 'var(--color-background)',
  },
  navbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 'var(--space-md) var(--space-xl)',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid var(--color-border)',
    position: 'sticky',
    top: 0,
    zIndex: 'var(--z-dropdown)',
  },
  navBrand: {
    display: 'flex',
    alignItems: 'center',
  },
  brandLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
    textDecoration: 'none',
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
  navLinks: {
    display: 'flex',
    gap: 'var(--space-xl)',
  },
  navLink: {
    fontFamily: 'var(--font-display)',
    fontWeight: 500,
    fontSize: '15px',
    color: 'var(--color-text-muted)',
    textDecoration: 'none',
    transition: 'color var(--transition-fast)',
  },
  navAuth: {
    display: 'flex',
    gap: 'var(--space-sm)',
  },
  loginBtn: {
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: '14px',
    color: 'var(--color-primary)',
    backgroundColor: 'transparent',
    border: '1px solid var(--color-primary)',
    padding: '8px 16px',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  signupBtn: {
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: '14px',
    color: 'var(--color-accent-text)',
    backgroundColor: 'var(--color-accent)',
    border: 'none',
    padding: '8px 16px',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    boxShadow: 'var(--shadow-sm)',
    transition: 'all var(--transition-fast)',
  },
  bodyContent: {
    flex: 1,
  },
  footer: {
    backgroundColor: 'var(--color-surface)',
    borderTop: '1px solid var(--color-border)',
    padding: 'var(--space-xl) var(--space-xl)',
  },
  footerInner: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%',
  },
  footerText: {
    fontSize: '14px',
    color: 'var(--color-text-muted)',
  },
  footerLinks: {
    display: 'flex',
    gap: 'var(--space-md)',
  },
  footerLink: {
    fontSize: '14px',
    color: 'var(--color-text-muted)',
    textDecoration: 'none',
  },
};
