// ════════════════════════════════════════════
//  Landing Page — Bold Red-Brown Brand System
//  File: apps/pos/src/pages/public/LandingPage.tsx
// ════════════════════════════════════════════

import React from 'react';
import { useNavigate } from 'react-router-dom';

const Icons = {
  WifiOff: (props: React.SVGProps<SVGSVGElement>) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="2" x2="22" y1="2" y2="22" />
      <path d="M8.5 8.5a6 6 0 0 1 7 0" />
      <path d="M5 5a10 10 0 0 1 14 0" />
      <line x1="12" x2="12.01" y1="20" y2="20" />
    </svg>
  ),
  Volume: (props: React.SVGProps<SVGSVGElement>) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  ),
  Printer: (props: React.SVGProps<SVGSVGElement>) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  ),
  ArrowRight: (props: React.SVGProps<SVGSVGElement>) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  ),
};

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      <style>
        {`
          @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
        `}
      </style>

      {/* Ambient Glassmorphism Hero Section */}
      <section style={styles.heroSection}>
        {/* Glow Blobs */}
        <div style={{...styles.glowBlob, ...styles.blob1}}></div>
        <div style={{...styles.glowBlob, ...styles.blob2}}></div>

        {/* Decorative Shapes */}
        <div style={styles.decorativeCircle1}></div>
        <div style={styles.decorativeCircle2}></div>

        <div style={styles.heroGrid}>
          
          {/* Left Column (Content & CTAs) */}
          <div style={styles.heroLeft}>
            <div style={styles.taglineBadge}>OFFLINE-FIRST HYBRID OS</div>
            <h1 style={styles.heroTitle}>
              Smart POS &amp;<br />Multi-Tenant ERP
            </h1>
            <p style={styles.heroSubtitle}>
              A resilient operations dashboard built for zero downtime. Keep billing, managing live tables, and dispatching kitchen tickets even when the internet drops.
            </p>
            <div style={styles.heroCtas}>
              <button style={styles.primaryCta} onClick={() => navigate('/signup')}>
                <span>START NOW FOR FREE</span>
                <Icons.ArrowRight />
              </button>
              <a href="#features" style={styles.secondaryCta}>
                Explore Features
              </a>
            </div>
          </div>

          {/* Right Column (Visual Composition) */}
          <div style={styles.heroRight}>
            <div style={styles.compositionWrapper}>
              
              {/* Glass Card 1: Revenue Dashboard */}
              <div style={{...styles.uiCard, ...styles.uiCard1}}>
                <div style={styles.uiCardHeader}>
                  <div style={styles.uiCardTitle}>Today's Revenue</div>
                  <div style={styles.uiCardSubtitle}>Live Update</div>
                </div>
                <div style={styles.uiCardValue}>₹12,450.00</div>
                <div style={styles.uiCardGraph}>
                  <div style={{...styles.graphBar, height: '40%'}}></div>
                  <div style={{...styles.graphBar, height: '70%'}}></div>
                  <div style={{...styles.graphBar, height: '50%'}}></div>
                  <div style={{...styles.graphBar, height: '90%'}}></div>
                  <div style={{...styles.graphBar, height: '100%', backgroundColor: '#942705'}}></div>
                </div>
              </div>

              {/* Glass Card 2: Live Table Status */}
              <div style={{...styles.uiCard, ...styles.uiCard2}}>
                 <div style={styles.uiCardHeader}>
                  <div style={styles.uiCardTitle}>Table 04</div>
                  <div style={{...styles.uiCardBadge, backgroundColor: 'rgba(39, 174, 96, 0.2)', color: '#27ae60'}}>Active</div>
                </div>
                <div style={styles.uiCardList}>
                  <div style={styles.uiCardListItem}>
                     <div style={styles.uiCardListText}>2x Truffle Pasta</div>
                     <div style={styles.uiCardListPrice}>₹240</div>
                  </div>
                  <div style={styles.uiCardListItem}>
                     <div style={styles.uiCardListText}>1x Garlic Bread</div>
                     <div style={styles.uiCardListPrice}>₹80</div>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* Features Section on Warm Off-White */}
      <section id="features" style={styles.featuresSection}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Built for High-Volume Outlets</h2>
          <p style={styles.sectionSubtitle}>
            Architected with multi-tab IndexedDB offline storage, automated webhooks, and thermal receipt printing.
          </p>
        </div>

        <div style={styles.featureGrid}>
          <div style={styles.featureCard}>
            <div style={styles.featureIconContainer}>
              <Icons.WifiOff style={{ color: 'var(--color-primary)' }} />
            </div>
            <h3 style={styles.featureTitle}>Firestore Offline-First</h3>
            <p style={styles.featureText}>
              Powered by IndexedDB local caching. Billing and queue management run unhindered offline, syncing to cloud servers the moment connectivity is restored.
            </p>
          </div>

          <div style={styles.featureCard}>
            <div style={styles.featureIconContainer}>
              <Icons.Volume style={{ color: 'var(--color-primary)' }} />
            </div>
            <h3 style={styles.featureTitle}>Conditional Soundbox</h3>
            <p style={styles.featureText}>
              Razorpay payment webhooks update order status automatically. Real-time listeners trigger the native Android TTS engine strictly after guest seating.
            </p>
          </div>

          <div style={styles.featureCard}>
            <div style={styles.featureIconContainer}>
              <Icons.Printer style={{ color: 'var(--color-primary)' }} />
            </div>
            <h3 style={styles.featureTitle}>Capacitor Peripherals</h3>
            <p style={styles.featureText}>
              Native Android wrapper leverages Bluetooth thermal printing via raw ESC/POS byte channels and background audio notification services.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    fontFamily: 'var(--font-body)',
    backgroundColor: '#FDFCFA', // Warm Off-White
    minHeight: '100vh',
    overflow: 'hidden',
  },
  heroSection: {
    position: 'relative',
    padding: '120px 24px 80px',
    textAlign: 'center',
    backgroundColor: 'transparent', 
  },
  glowBlob: {
    position: 'absolute',
    borderRadius: '50%',
    filter: 'blur(120px)',
    zIndex: 0,
  },
  blob1: {
    width: '600px',
    height: '600px',
    backgroundColor: 'rgba(199, 186, 96, 0.20)', // Warm Mustard #C7BA60 at 20%
    top: '-100px',
    left: '50%',
    transform: 'translateX(-80%)',
  },
  blob2: {
    width: '500px',
    height: '500px',
    backgroundColor: 'rgba(148, 39, 5, 0.10)', // Deep Red-Brown #942705 at 10%
    top: '100px',
    left: '50%',
    transform: 'translateX(20%)',
  },
  decorativeCircle1: {
    position: 'absolute',
    width: '300px',
    height: '300px',
    border: '2px dashed rgba(199, 186, 96, 0.4)',
    borderRadius: '50%',
    top: '-50px',
    left: '-100px',
    zIndex: 0,
    animation: 'float 8s ease-in-out infinite',
  },
  decorativeCircle2: {
    position: 'absolute',
    width: '150px',
    height: '150px',
    border: '4px solid rgba(148, 39, 5, 0.1)',
    borderRadius: '50%',
    bottom: '40px',
    right: '5%',
    zIndex: 0,
    animation: 'float 6s ease-in-out infinite reverse',
  },
  heroGrid: {
    position: 'relative',
    zIndex: 1,
    maxWidth: '1280px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '48px',
    alignItems: 'center',
  },
  heroLeft: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    textAlign: 'left',
  },
  heroRight: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    minHeight: '400px',
    width: '100%',
  },
  taglineBadge: {
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: '11px',
    letterSpacing: '1.2px',
    color: '#942705', // Deep Red-Brown
    backgroundColor: 'rgba(148, 39, 5, 0.1)',
    padding: '6px 16px',
    borderRadius: 'var(--radius-pill)',
    marginBottom: '28px',
  },
  heroTitle: {
    fontFamily: 'var(--font-display)', // Assuming Outfit is set here in CSS vars
    fontSize: 'var(--font-h1-size, 56px)',
    fontWeight: 900,
    color: '#1F1F1F', // Charcoal Gray
    lineHeight: '1.1',
    letterSpacing: '-1px',
    marginBottom: '20px',
  },
  heroSubtitle: {
    fontFamily: 'var(--font-body)',
    fontSize: '18px',
    fontWeight: 400,
    lineHeight: '1.65',
    color: '#4A4A4A',
    maxWidth: '560px',
    marginBottom: '40px',
  },
  heroCtas: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginBottom: '64px',
  },
  primaryCta: {
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: '16px',
    color: '#FDFCFA', // Warm Off-White
    backgroundColor: '#942705', // Deep Red-Brown
    border: 'none',
    padding: '16px 32px',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    boxShadow: 'var(--shadow-md)',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    transition: 'transform var(--transition-fast)',
  },
  secondaryCta: {
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: '16px',
    color: '#1F1F1F',
    textDecoration: 'none',
    padding: '14px 24px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid rgba(31, 31, 31, 0.2)',
    backgroundColor: 'transparent',
    transition: 'background var(--transition-fast)',
  },
  compositionWrapper: {
    position: 'relative',
    width: '100%',
    maxWidth: '500px',
    height: '460px',
  },
  uiCard: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    border: '1px solid #FFFFFF',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    animation: 'float 6s ease-in-out infinite',
  },
  uiCard1: {
    top: '40px',
    left: '0',
    width: '320px',
    zIndex: 2,
    animationDelay: '0s',
  },
  uiCard2: {
    bottom: '40px',
    right: '20px',
    width: '280px',
    zIndex: 3,
    animationDelay: '-3s', // Offset animation
  },
  uiCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  uiCardTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '16px',
    fontWeight: 700,
    color: '#1F1F1F',
  },
  uiCardSubtitle: {
    fontFamily: 'var(--font-body)',
    fontSize: '12px',
    color: '#4A4A4A',
  },
  uiCardValue: {
    fontFamily: 'var(--font-display)',
    fontSize: '36px',
    fontWeight: 800,
    color: '#942705',
    lineHeight: '1',
  },
  uiCardGraph: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '8px',
    height: '60px',
    marginTop: '8px',
  },
  graphBar: {
    flex: 1,
    backgroundColor: 'rgba(148, 39, 5, 0.2)',
    borderRadius: '4px',
    transition: 'height 0.3s ease',
  },
  uiCardBadge: {
    padding: '4px 8px',
    borderRadius: '8px',
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  uiCardList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  uiCardListItem: {
    display: 'flex',
    justifyContent: 'space-between',
    borderBottom: '1px solid rgba(0,0,0,0.05)',
    paddingBottom: '8px',
  },
  uiCardListText: {
    fontFamily: 'var(--font-body)',
    fontSize: '14px',
    color: '#1F1F1F',
    fontWeight: 500,
  },
  uiCardListPrice: {
    fontFamily: 'var(--font-body)',
    fontSize: '14px',
    color: '#4A4A4A',
  },
  featuresSection: {
    padding: '88px 24px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  sectionHeader: {
    textAlign: 'center',
    marginBottom: '60px',
  },
  sectionTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: 'var(--font-h2-size)',
    fontWeight: 800,
    color: 'var(--color-text)',
    letterSpacing: '-0.5px',
    marginBottom: '10px',
  },
  sectionSubtitle: {
    fontFamily: 'var(--font-body)',
    fontSize: '17px',
    fontWeight: 400,
    color: 'var(--color-text-muted)',
    maxWidth: '560px',
    margin: '0 auto',
  },
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '28px',
  },
  featureCard: {
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: '36px 30px',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  featureIconContainer: {
    width: '52px',
    height: '52px',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-primary-light)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '8px',
  },
  featureTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '20px',
    fontWeight: 700,
    color: 'var(--color-text)',
    margin: 0,
  },
  featureText: {
    fontFamily: 'var(--font-body)',
    fontSize: '15px',
    fontWeight: 300,
    color: 'var(--color-text-muted)',
    lineHeight: '1.65',
    margin: 0,
  },
};
