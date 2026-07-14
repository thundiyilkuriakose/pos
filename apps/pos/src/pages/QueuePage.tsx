// ════════════════════════════════════════════
//  Waiting Queue Board Page
//  File: apps/pos/src/pages/QueuePage.tsx
// ════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatPaiseToRupees } from '@skillsetgo/shared';
import AddPartyModal from '../components/queue/AddPartyModal';
import SeatPartyModal from '../components/queue/SeatPartyModal';

interface QueuedParty {
  id: string;
  party_name: string;
  party_size: number;
  phone?: string;
  queue_token?: string;
  status: string;
  created_at?: any;
  pre_order_items?: Array<{
    item_name: string;
    quantity: number;
    unit_price: number;
    variant_name?: string;
  }>;
}

export default function QueuePage() {
  const [parties, setParties] = useState<QueuedParty[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedSeatParty, setSelectedSeatParty] = useState<QueuedParty | null>(null);

  const outletId = 'OUT001';

  useEffect(() => {
    const partiesRef = collection(db, 'outlets', outletId, 'parties');
    // Real-time listener filtering for status == "queued", ordered chronologically
    const q = query(
      partiesRef,
      where('status', '==', 'queued'),
      orderBy('created_at', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: QueuedParty[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<QueuedParty, 'id'>),
        }));
        setParties(list);
        setLoading(false);
      },
      (error) => {
        console.error('Queue realtime listener error:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [outletId]);

  // Format creation time / elapsed wait duration
  const getElapsedWaitMinutes = (createdAt: any): string => {
    if (!createdAt) return 'Just now';
    const dateObj = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
    const diffMs = Date.now() - dateObj.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  };

  const calculatePreOrderSum = (items?: QueuedParty['pre_order_items']) => {
    if (!items || items.length === 0) return 0;
    return items.reduce((acc, curr) => acc + curr.unit_price * curr.quantity, 0);
  };

  return (
    <div style={styles.pageContainer}>
      {/* Top Header Bar */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.pageTitle}>Party Waiting &amp; Seating Queue</h1>
          <p style={styles.pageSubtitle}>
            Live waiting list. Seating a party updates table occupancy &amp; routes pre-orders.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          style={styles.addQueueBtn}
        >
          + Add to Queue
        </button>
      </div>

      {/* Overview Stat Counters */}
      <div style={styles.statsRow}>
        <div style={styles.statBox}>
          <span style={styles.statLabel}>WAITING PARTIES</span>
          <span style={styles.statValue}>{parties.length}</span>
        </div>
        <div style={styles.statBox}>
          <span style={styles.statLabel}>TOTAL GUESTS WAITING</span>
          <span style={styles.statValue}>
            {parties.reduce((sum, p) => sum + (p.party_size || 0), 0)}
          </span>
        </div>
        <div style={styles.statBox}>
          <span style={styles.statLabel}>PRE-ORDERS PENDING</span>
          <span style={styles.statValue}>
            {parties.filter((p) => p.pre_order_items && p.pre_order_items.length > 0).length}
          </span>
        </div>
      </div>

      {/* Main Waitlist Cards Grid */}
      {loading ? (
        <div style={styles.emptyBox}>Listening to Firestore waitlist updates...</div>
      ) : parties.length === 0 ? (
        <div style={styles.emptyBox}>
          <p style={{ fontSize: '36px', marginBottom: '8px' }}>📋</p>
          <h3 style={styles.emptyTitle}>No parties in the waitlist</h3>
          <p style={styles.emptySubtitle}>
            Click <strong>"+ Add to Queue"</strong> to register incoming guests and manage dine-in seating.
          </p>
        </div>
      ) : (
        <div style={styles.queueGrid}>
          {parties.map((party, index) => {
            const preOrderTotal = calculatePreOrderSum(party.pre_order_items);

            return (
              <div key={party.id} style={styles.partyCard}>
                <div style={styles.cardTopHeader}>
                  <div style={styles.tokenBadge}>
                    {party.queue_token || `Q-${String(index + 1).padStart(3, '0')}`}
                  </div>
                  <div style={styles.waitBadge}>
                    ⏱️ {getElapsedWaitMinutes(party.created_at)}
                  </div>
                </div>

                <div style={styles.cardMainContent}>
                  <h3 style={styles.partyName}>{party.party_name}</h3>
                  <div style={styles.partyMetaRow}>
                    <span style={styles.metaBadge}>👥 {party.party_size} Guests</span>
                    {party.phone && (
                      <span style={styles.metaPhone}>📞 {party.phone}</span>
                    )}
                  </div>

                  {/* Pre-order summary pill */}
                  {party.pre_order_items && party.pre_order_items.length > 0 && (
                    <div style={styles.preOrderBox}>
                      <div style={styles.preOrderBoxHeader}>
                        <span>🛒 Pre-Orders ({party.pre_order_items.length} items)</span>
                        <strong>{formatPaiseToRupees(preOrderTotal)}</strong>
                      </div>
                      <div style={styles.preOrderItemsList}>
                        {party.pre_order_items.map((item, idx) => (
                          <span key={idx} style={styles.preOrderItemTag}>
                            {item.quantity}x {item.item_name}
                            {item.variant_name ? ` (${item.variant_name})` : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div style={styles.cardActions}>
                  <button
                    onClick={() => setSelectedSeatParty(party)}
                    style={styles.seatPartyBtn}
                  >
                    🪑 Seat Party
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Party Modal */}
      <AddPartyModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        outletId={outletId}
        queueLength={parties.length}
      />

      {/* Seat Party Modal */}
      <SeatPartyModal
        isOpen={selectedSeatParty !== null}
        onClose={() => setSelectedSeatParty(null)}
        party={selectedSeatParty}
        outletId={outletId}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pageContainer: {
    padding: 'var(--space-lg) var(--space-xl)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-lg)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: 'var(--font-h2-size)',
    color: 'var(--color-primary)',
    fontFamily: 'var(--font-display)',
    margin: 0,
  },
  pageSubtitle: {
    color: 'var(--color-text-muted)',
    fontSize: '14px',
    marginTop: '2px',
  },
  addQueueBtn: {
    backgroundColor: 'var(--color-primary)',
    color: '#FFFFFF',
    border: 'none',
    padding: '12px 24px',
    borderRadius: 'var(--radius-md)',
    fontSize: '15px',
    fontWeight: 700,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    boxShadow: 'var(--shadow-md)',
    transition: 'transform var(--transition-fast)',
  },
  statsRow: {
    display: 'flex',
    gap: 'var(--space-lg)',
  },
  statBox: {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-md) var(--space-lg)',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    boxShadow: 'var(--shadow-sm)',
  },
  statLabel: {
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--color-text-muted)',
    letterSpacing: '0.5px',
  },
  statValue: {
    fontFamily: 'var(--font-display)',
    fontSize: '24px',
    fontWeight: 800,
    color: 'var(--color-text)',
  },
  queueGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: 'var(--space-lg)',
  },
  partyCard: {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-lg)',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: 'var(--space-md)',
  },
  cardTopHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tokenBadge: {
    backgroundColor: 'var(--color-accent)',
    color: 'var(--color-accent-text)',
    fontFamily: 'var(--font-display)',
    fontSize: '14px',
    fontWeight: 800,
    padding: '4px 12px',
    borderRadius: 'var(--radius-pill)',
  },
  waitBadge: {
    fontSize: '12px',
    color: 'var(--color-text-muted)',
    fontWeight: 500,
  },
  cardMainContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-xs)',
  },
  partyName: {
    fontFamily: 'var(--font-display)',
    fontSize: '18px',
    fontWeight: 700,
    color: 'var(--color-text)',
    margin: 0,
  },
  partyMetaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-md)',
    marginTop: '2px',
  },
  metaBadge: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--color-primary)',
    backgroundColor: 'var(--color-primary-light)',
    padding: '2px 8px',
    borderRadius: 'var(--radius-sm)',
  },
  metaPhone: {
    fontSize: '13px',
    color: 'var(--color-text-muted)',
  },
  preOrderBox: {
    marginTop: 'var(--space-sm)',
    backgroundColor: 'var(--color-background)',
    border: '1px dashed var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-sm) var(--space-md)',
    fontSize: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  preOrderBoxHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: 'var(--color-text)',
    fontWeight: 600,
  },
  preOrderItemsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
    marginTop: '2px',
  },
  preOrderItemTag: {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    padding: '2px 6px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '11px',
    color: 'var(--color-text-muted)',
  },
  cardActions: {
    marginTop: 'var(--space-xs)',
  },
  seatPartyBtn: {
    width: '100%',
    backgroundColor: 'var(--color-primary)',
    color: '#FFFFFF',
    border: 'none',
    padding: '10px',
    borderRadius: 'var(--radius-md)',
    fontSize: '14px',
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: 'var(--shadow-sm)',
    transition: 'all var(--transition-fast)',
  },
  emptyBox: {
    backgroundColor: 'var(--color-surface)',
    border: '1px dashed var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-3xl) var(--space-xl)',
    textAlign: 'center',
    color: 'var(--color-text-muted)',
  },
  emptyTitle: {
    fontSize: '18px',
    fontWeight: 700,
    fontFamily: 'var(--font-display)',
    color: 'var(--color-text)',
    marginBottom: '4px',
  },
  emptySubtitle: {
    fontSize: '14px',
    maxWidth: '420px',
    margin: '0 auto',
  },
};
