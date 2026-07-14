// ════════════════════════════════════════════
//  Dashboard / Overview Page — Strict Brand System Edition
//  File: apps/pos/src/pages/DashboardPage.tsx
// ════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/auth.store.ts';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatPaiseToRupees } from '@skillsetgo/shared';

const Icons = {
  Wallet: (props: React.SVGProps<SVGSVGElement>) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  ),
  Users: (props: React.SVGProps<SVGSVGElement>) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  ClockList: (props: React.SVGProps<SVGSVGElement>) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="10" x2="21" y1="6" y2="6" />
      <line x1="10" x2="21" y1="12" y2="12" />
      <line x1="10" x2="21" y1="18" y2="18" />
      <circle cx="4" cy="12" r="3" />
      <polyline points="4 11 4 12 5 12" />
    </svg>
  ),
  Printer: (props: React.SVGProps<SVGSVGElement>) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  ),
  Volume: (props: React.SVGProps<SVGSVGElement>) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  ),
  DatabaseSync: (props: React.SVGProps<SVGSVGElement>) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  ),
};

interface TableDoc {
  id: string;
  status: string;
  capacity: number;
}

interface PartyDoc {
  id: string;
  status: string;
  party_size: number;
  created_at?: any;
}

interface OrderDoc {
  id: string;
  status: string;
  grand_total: number;
  closed_at?: any;
}

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const outletId = 'OUT001';

  const [activeTables, setActiveTables] = useState(0);
  const [totalTables, setTotalTables] = useState(0);
  const [activeCovers, setActiveCovers] = useState(0);
  const [waitlistCount, setWaitlistCount] = useState(0);
  const [longestWaitMins, setLongestWaitMins] = useState(0);
  const [todayRevenuePaise, setTodayRevenuePaise] = useState(0);

  useEffect(() => {
    const tablesRef = collection(db, 'outlets', outletId, 'tables');
    const unsubscribeTables = onSnapshot(query(tablesRef), (snap) => {
      let occupied = 0;
      snap.forEach((doc) => {
        const data = doc.data() as TableDoc;
        if (data.status === 'occupied') occupied++;
      });
      setTotalTables(snap.size);
      setActiveTables(occupied);
    });

    const partiesRef = collection(db, 'outlets', outletId, 'parties');
    const unsubscribeSeated = onSnapshot(query(partiesRef, where('status', '==', 'seated')), (snap) => {
      let covers = 0;
      snap.forEach((doc) => {
        const data = doc.data() as PartyDoc;
        covers += (data.party_size || 0);
      });
      setActiveCovers(covers);
    });

    return () => {
      unsubscribeTables();
      unsubscribeSeated();
    };
  }, [outletId]);

  useEffect(() => {
    const partiesRef = collection(db, 'outlets', outletId, 'parties');
    const q = query(
      partiesRef,
      where('status', '==', 'queued'),
      orderBy('created_at', 'asc')
    );

    const unsubscribeQueue = onSnapshot(q, (snap) => {
      setWaitlistCount(snap.size);
      if (snap.size > 0) {
        const oldestDoc = snap.docs[0].data() as PartyDoc;
        if (oldestDoc.created_at) {
          const dateObj = oldestDoc.created_at.toDate ? oldestDoc.created_at.toDate() : new Date(oldestDoc.created_at);
          const diffMins = Math.floor((Date.now() - dateObj.getTime()) / 60000);
          setLongestWaitMins(diffMins > 0 ? diffMins : 0);
        } else {
          setLongestWaitMins(0);
        }
      } else {
        setLongestWaitMins(0);
      }
    });

    return () => unsubscribeQueue();
  }, [outletId]);

  useEffect(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const ordersRef = collection(db, 'outlets', outletId, 'orders');
    const q = query(
      ordersRef,
      where('status', '==', 'closed'),
      where('closed_at', '>=', startOfToday)
    );

    const unsubscribeOrders = onSnapshot(q, (snap) => {
      const totalPaise = snap.docs.reduce((sum, doc) => {
        const data = doc.data() as OrderDoc;
        return sum + (data.grand_total || 0);
      }, 0);
      setTodayRevenuePaise(totalPaise);
    });

    return () => unsubscribeOrders();
  }, [outletId]);

  return (
    <div style={styles.container}>
      <div style={styles.heroSection}>
        <h1 style={styles.heroTitle}>Welcome back, {user?.name || 'Staff'}</h1>
        <p style={styles.heroSubtitle}>
          Real-time metrics and operational overview for terminal {outletId}.
        </p>
      </div>

      <div style={styles.cardGrid}>
        {/* Today's Revenue */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.cardLabel}>TODAY'S REVENUE</span>
            <div style={styles.iconContainer}>
              <Icons.Wallet style={{ color: 'var(--color-primary)' }} />
            </div>
          </div>
          <div style={styles.cardValue}>{formatPaiseToRupees(todayRevenuePaise)}</div>
          <div style={styles.cardTrend}>Real-time shift aggregation</div>
        </div>

        {/* Active Covers */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.cardLabel}>ACTIVE COVERS</span>
            <div style={styles.iconContainer}>
              <Icons.Users style={{ color: 'var(--color-primary)' }} />
            </div>
          </div>
          <div style={styles.cardValue}>{activeCovers} Seated</div>
          <div style={styles.cardTrend}>{activeTables} of {totalTables} tables active</div>
        </div>

        {/* Queue Waitlist */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.cardLabel}>WAITLIST QUEUE</span>
            <div style={styles.iconContainer}>
              <Icons.ClockList style={{ color: 'var(--color-primary)' }} />
            </div>
          </div>
          <div style={styles.cardValue}>{waitlistCount} Parties</div>
          <div style={styles.cardTrend}>
            {waitlistCount > 0 ? `Longest wait: ${longestWaitMins} mins` : 'No parties waiting'}
          </div>
        </div>
      </div>

      {/* Peripheral & System Status Block */}
      <div style={styles.systemStatusSection}>
        <h3 style={styles.statusSectionTitle}>Hardware Integrations &amp; System Status</h3>
        <div style={styles.statusGrid}>
          <div style={styles.statusItem}>
            <Icons.Printer style={{ color: 'var(--color-text-muted)' }} />
            <span style={styles.statusLabel}>Thermal KOT Printer:</span>
            <span style={styles.statusBadgeInactive}>Disconnected</span>
          </div>

          <div style={styles.statusItem}>
            <Icons.Volume style={{ color: 'var(--color-support-1)' }} />
            <span style={styles.statusLabel}>Android TTS Engine:</span>
            <span style={styles.statusBadgeActive}>Active (Google TTS)</span>
          </div>

          <div style={styles.statusItem}>
            <Icons.DatabaseSync style={{ color: 'var(--color-support-1)' }} />
            <span style={styles.statusLabel}>Firestore Channel:</span>
            <span style={styles.statusBadgeActive}>Active (IndexedDB)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: 'var(--space-2xl) var(--space-xl)',
    maxWidth: '1280px',
    margin: '0 auto',
    backgroundColor: 'var(--color-background)', // #FDFCFA Warm Off-White
    minHeight: '100vh',
  },
  heroSection: {
    marginBottom: 'var(--space-xl)',
  },
  heroTitle: {
    fontSize: 'var(--font-h1-size)',
    color: 'var(--color-primary)', // #942705 Deep Red-Brown
    fontFamily: 'var(--font-display)',
    fontWeight: 800,
    letterSpacing: '-0.5px',
    margin: '0 0 6px 0',
  },
  heroSubtitle: {
    fontSize: 'var(--font-body-size)',
    fontFamily: 'var(--font-body)',
    fontWeight: 300,
    color: 'var(--color-text-muted)',
    margin: 0,
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: 'var(--space-lg)',
    marginBottom: 'var(--space-2xl)',
  },
  card: {
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-xl)',
    boxShadow: 'var(--shadow-md)', // Floating card shadow over off-white
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: 'var(--space-sm)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: '12px',
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    color: 'var(--color-text-muted)',
    letterSpacing: '0.8px',
    textTransform: 'uppercase',
  },
  iconContainer: {
    width: '40px',
    height: '40px',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-primary-light)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardValue: {
    fontSize: '34px',
    fontWeight: 800,
    color: 'var(--color-text)', // #1F1F1F Charcoal Gray
    fontFamily: 'var(--font-display)',
    letterSpacing: '-0.5px',
  },
  cardTrend: {
    fontSize: '13px',
    color: 'var(--color-support-1)', // #6B8E23 Olive Green
    fontFamily: 'var(--font-body)',
    fontWeight: 500,
  },
  systemStatusSection: {
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-xl)',
    boxShadow: 'var(--shadow-sm)',
  },
  statusSectionTitle: {
    fontSize: '17px',
    fontWeight: 700,
    color: 'var(--color-text)',
    marginBottom: 'var(--space-lg)',
    fontFamily: 'var(--font-display)',
  },
  statusGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 'var(--space-2xl)',
  },
  statusItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  statusLabel: {
    fontSize: '14px',
    fontFamily: 'var(--font-body)',
    color: 'var(--color-text)',
    fontWeight: 400,
  },
  statusBadgeInactive: {
    fontSize: '12px',
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    backgroundColor: 'var(--color-primary-light)',
    color: 'var(--color-primary)',
    padding: '4px 12px',
    borderRadius: 'var(--radius-pill)',
  },
  statusBadgeActive: {
    fontSize: '12px',
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    backgroundColor: 'var(--color-support-1-light)',
    color: 'var(--color-support-1)',
    padding: '4px 12px',
    borderRadius: 'var(--radius-pill)',
  },
};
