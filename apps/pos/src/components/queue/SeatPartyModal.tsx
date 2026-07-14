// ════════════════════════════════════════════
//  Seat Party Modal / Popover Component
//  File: apps/pos/src/components/queue/SeatPartyModal.tsx
// ════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  query,
  where,
  writeBatch,
  doc,
  serverTimestamp,
  addDoc,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface TableItem {
  id: string;
  table_number: string;
  section: string;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved' | 'blocked';
}

interface PartyInfo {
  id: string;
  party_name: string;
  party_size: number;
  queue_token?: string;
}

interface SeatPartyModalProps {
  isOpen: boolean;
  onClose: () => void;
  party: PartyInfo | null;
  outletId?: string;
}

const DEFAULT_FLOORPLAN_TABLES = [
  { table_number: 'T-01', section: 'Main Dining', capacity: 4 },
  { table_number: 'T-02', section: 'Main Dining', capacity: 2 },
  { table_number: 'T-03', section: 'Main Dining', capacity: 4 },
  { table_number: 'T-04', section: 'Main Dining', capacity: 6 },
  { table_number: 'T-05', section: 'Patio', capacity: 2 },
  { table_number: 'T-06', section: 'Patio', capacity: 4 },
  { table_number: 'T-07', section: 'VIP Section', capacity: 8 },
  { table_number: 'T-08', section: 'VIP Section', capacity: 4 },
];

export default function SeatPartyModal({
  isOpen,
  onClose,
  party,
  outletId = 'OUT001',
}: SeatPartyModalProps) {
  const [tables, setTables] = useState<TableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadTables();
    }
  }, [isOpen, outletId]);

  const loadTables = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const tablesRef = collection(db, 'outlets', outletId, 'tables');
      const snap = await getDocs(tablesRef);
      const list: TableItem[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<TableItem, 'id'>),
      }));
      setTables(list);
    } catch (err: any) {
      console.error('Error fetching floorplan tables:', err);
      setErrorMsg('Failed to load floorplan tables.');
    } finally {
      setLoading(false);
    }
  };

  const seedDefaultTables = async () => {
    setSeeding(true);
    try {
      const tablesRef = collection(db, 'outlets', outletId, 'tables');
      for (const t of DEFAULT_FLOORPLAN_TABLES) {
        await addDoc(tablesRef, {
          table_number: t.table_number,
          section: t.section,
          capacity: t.capacity,
          status: 'available',
          outlet_id: outletId,
          is_deleted: false,
        });
      }
      await loadTables();
    } catch (err: any) {
      console.error('Error seeding default tables:', err);
      setErrorMsg('Failed to seed default floorplan tables.');
    } finally {
      setSeeding(false);
    }
  };

  if (!isOpen || !party) return null;

  const availableTables = tables.filter((t) => t.status === 'available');

  const handleConfirmSeating = async () => {
    if (!selectedTableId) {
      setErrorMsg('Please select an available table to seat this party.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const batch = writeBatch(db);

      // 1. Update Target Table
      const tableRef = doc(db, 'outlets', outletId, 'tables', selectedTableId);
      batch.update(tableRef, {
        status: 'occupied',
        current_party_id: party.id,
        updated_at: serverTimestamp(),
      });

      // 2. Update Target Party Document
      const partyRef = doc(db, 'outlets', outletId, 'parties', party.id);
      batch.update(partyRef, {
        status: 'seated',
        table_id: selectedTableId,
        seated_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

      // Commit Atomic Batch Transaction (non-blocking)
      const commitPromise = batch.commit();

      setSubmitting(false);
      onClose();

      commitPromise.catch((err: any) => {
        console.error('Batch error during party seating transition:', err);
        setErrorMsg(err.message || 'Failed to transition party to seated status.');
      });
    } catch (err: any) {
      console.error('Batch construction error:', err);
      setErrorMsg(err.message || 'Failed to transition party to seated status.');
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modalCard}>
        <div style={styles.modalHeader}>
          <div>
            <h2 style={styles.modalTitle}>Assign Table &amp; Seat Party</h2>
            <span style={styles.modalSubtitle}>
              Party: <strong>{party.party_name}</strong> ({party.party_size} Guests) — Token{' '}
              {party.queue_token}
            </span>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        {errorMsg && <div style={styles.errorAlert}>{errorMsg}</div>}

        {loading ? (
          <div style={styles.loadingBox}>Checking available tables...</div>
        ) : tables.length === 0 ? (
          <div style={styles.emptyBox}>
            <p style={{ fontSize: '28px', marginBottom: '8px' }}>🪑</p>
            <h3 style={styles.emptyTitle}>No floorplan tables configured</h3>
            <p style={styles.emptySubtitle}>
              Click below to initialize default floorplan dining tables for this outlet.
            </p>
            <button
              onClick={seedDefaultTables}
              disabled={seeding}
              style={styles.seedBtn}
            >
              {seeding ? 'Initializing Tables...' : '⚡ Initialize Floorplan Tables'}
            </button>
          </div>
        ) : (
          <div style={styles.bodyContent}>
            <label style={styles.label}>
              Select Available Table (Showing {availableTables.length} of {tables.length} tables)
            </label>

            {availableTables.length === 0 ? (
              <div style={styles.warningAlert}>
                ⚠️ All tables are currently occupied or reserved. Please free a table on the Floorplan board.
              </div>
            ) : (
              <div style={styles.tableGrid}>
                {availableTables.map((tbl) => {
                  const isSelected = selectedTableId === tbl.id;
                  const isCapacityFit = tbl.capacity >= party.party_size;

                  return (
                    <button
                      key={tbl.id}
                      type="button"
                      onClick={() => setSelectedTableId(tbl.id)}
                      style={{
                        ...styles.tableCard,
                        borderColor: isSelected
                          ? 'var(--color-primary)'
                          : 'var(--color-border)',
                        backgroundColor: isSelected
                          ? 'var(--color-primary-light)'
                          : 'var(--color-surface)',
                      }}
                    >
                      <div style={styles.tableCardHeader}>
                        <h4 style={styles.tableNumber}>{tbl.table_number}</h4>
                        <span style={styles.sectionBadge}>{tbl.section}</span>
                      </div>
                      <div style={styles.tableCardFooter}>
                        <span
                          style={{
                            ...styles.capacityText,
                            color: isCapacityFit ? 'var(--color-support-1)' : 'var(--color-danger)',
                          }}
                        >
                          👥 Cap: {tbl.capacity} {isCapacityFit ? '✓' : '(Fits Small)'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div style={styles.modalFooter}>
          <button type="button" onClick={onClose} style={styles.cancelBtn}>
            Cancel
          </button>
          <button
            type="button"
            disabled={!selectedTableId || submitting}
            onClick={handleConfirmSeating}
            style={{
              ...styles.submitBtn,
              opacity: selectedTableId && !submitting ? 1 : 0.5,
            }}
          >
            {submitting ? 'Seating Party...' : 'Confirm Seating &amp; Send to Table'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    backdropFilter: 'blur(3px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 'var(--z-modal)',
    padding: 'var(--space-md)',
  },
  modalCard: {
    backgroundColor: 'var(--color-surface)',
    borderRadius: 'var(--radius-xl)',
    width: '100%',
    maxWidth: '560px',
    padding: 'var(--space-xl)',
    boxShadow: 'var(--shadow-lg)',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: 'var(--space-md)',
    marginBottom: 'var(--space-lg)',
  },
  modalTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '20px',
    fontWeight: 700,
    color: 'var(--color-primary)',
    margin: 0,
  },
  modalSubtitle: {
    fontSize: '13px',
    color: 'var(--color-text-muted)',
  },
  closeBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '18px',
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
    padding: '4px',
  },
  bodyContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-md)',
  },
  label: {
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: '13px',
    color: 'var(--color-text)',
  },
  tableGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: 'var(--space-md)',
    maxHeight: '300px',
    overflowY: 'auto',
    padding: '4px',
  },
  tableCard: {
    border: '2px solid',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-md)',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-xs)',
  },
  tableCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tableNumber: {
    fontFamily: 'var(--font-display)',
    fontSize: '16px',
    fontWeight: 800,
    margin: 0,
    color: 'var(--color-text)',
  },
  sectionBadge: {
    fontSize: '10px',
    fontWeight: 600,
    backgroundColor: '#EEEEEE',
    padding: '2px 6px',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text-muted)',
  },
  tableCardFooter: {
    marginTop: '4px',
  },
  capacityText: {
    fontSize: '12px',
    fontWeight: 600,
  },
  loadingBox: {
    padding: 'var(--space-xl)',
    textAlign: 'center',
    color: 'var(--color-text-muted)',
  },
  emptyBox: {
    padding: 'var(--space-xl)',
    textAlign: 'center',
    backgroundColor: 'var(--color-background)',
    borderRadius: 'var(--radius-md)',
    border: '1px dashed var(--color-border)',
  },
  emptyTitle: {
    fontSize: '16px',
    fontWeight: 700,
    fontFamily: 'var(--font-display)',
    margin: '0 0 4px 0',
  },
  emptySubtitle: {
    fontSize: '13px',
    color: 'var(--color-text-muted)',
    marginBottom: 'var(--space-md)',
  },
  seedBtn: {
    backgroundColor: 'var(--color-primary)',
    color: '#FFFFFF',
    border: 'none',
    padding: '8px 16px',
    borderRadius: 'var(--radius-md)',
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
  },
  warningAlert: {
    backgroundColor: 'var(--color-support-2-light, #FFF9E6)',
    border: '1px solid #FFE58F',
    color: '#8C6B00',
    padding: 'var(--space-md)',
    borderRadius: 'var(--radius-md)',
    fontSize: '13px',
  },
  errorAlert: {
    backgroundColor: 'var(--color-danger-light)',
    color: 'var(--color-danger)',
    padding: '8px 12px',
    borderRadius: 'var(--radius-md)',
    fontSize: '13px',
    marginBottom: 'var(--space-md)',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 'var(--space-sm)',
    marginTop: 'var(--space-lg)',
    borderTop: '1px solid var(--color-border)',
    paddingTop: 'var(--space-md)',
  },
  cancelBtn: {
    backgroundColor: 'transparent',
    border: '1px solid var(--color-border)',
    padding: '10px 18px',
    borderRadius: 'var(--radius-md)',
    fontSize: '14px',
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    cursor: 'pointer',
  },
  submitBtn: {
    backgroundColor: 'var(--color-primary)',
    color: '#FFFFFF',
    border: 'none',
    padding: '10px 20px',
    borderRadius: 'var(--radius-md)',
    fontSize: '14px',
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: 'var(--shadow-sm)',
  },
};
