// ════════════════════════════════════════════
//  Walk-In Modal Component
//  File: apps/pos/src/components/orders/WalkInModal.tsx
// ════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { doc, writeBatch, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface TableItem {
  id: string;
  table_number: string;
  section: string;
  capacity: number;
  status: string;
  current_party_id?: string;
}

interface WalkInModalProps {
  isOpen: boolean;
  onClose: () => void;
  table: TableItem | null;
  outletId?: string;
}

export default function WalkInModal({
  isOpen,
  onClose,
  table,
  outletId = 'OUT001',
}: WalkInModalProps) {
  const [partyName, setPartyName] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen && table) {
      setPartyName(`Table ${table.table_number} Walk-in`);
      setPartySize(table.capacity > 0 ? Math.min(2, table.capacity) : 2);
      setErrorMsg('');
    }
  }, [isOpen, table]);

  if (!isOpen || !table) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');

    try {
      const batch = writeBatch(db);

      // Create new Party Document
      const partiesRef = collection(db, 'outlets', outletId, 'parties');
      const newPartyRef = doc(partiesRef);
      
      batch.set(newPartyRef, {
        party_name: partyName.trim(),
        party_size: Number(partySize) || 1,
        status: 'seated',
        table_id: table.id,
        seated_at: serverTimestamp(),
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        outlet_id: outletId,
        is_deleted: false,
        pre_order_items: [], // Empty initially
      });

      // Update Table Document
      const tableRef = doc(db, 'outlets', outletId, 'tables', table.id);
      batch.update(tableRef, {
        status: 'occupied',
        current_party_id: newPartyRef.id,
        updated_at: serverTimestamp(),
      });

      // Commit Batch (non-blocking)
      const commitPromise = batch.commit();

      setSubmitting(false);
      onClose();

      commitPromise.catch((err: any) => {
        console.error('Error seating walk-in party:', err);
        setErrorMsg(err.message || 'Failed to seat walk-in party.');
      });
    } catch (err: any) {
      console.error('Error constructing walk-in batch:', err);
      setErrorMsg(err.message || 'Failed to seat walk-in party.');
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modalCard}>
        <div style={styles.modalHeader}>
          <div>
            <h2 style={styles.modalTitle}>Seat Walk-In Guest</h2>
            <span style={styles.modalSubtitle}>
              Assigning to {table.table_number} ({table.section})
            </span>
          </div>
          <button style={styles.closeBtn} onClick={onClose} type="button">✕</button>
        </div>

        {errorMsg && <div style={styles.errorAlert}>{errorMsg}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Party Name</label>
            <input
              type="text"
              value={partyName}
              onChange={(e) => setPartyName(e.target.value)}
              style={styles.input}
              required
              autoFocus
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Guests / Size</label>
            <input
              type="number"
              min="1"
              max="30"
              value={partySize}
              onChange={(e) => setPartySize(Number(e.target.value))}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.modalFooter}>
            <button type="button" onClick={onClose} style={styles.cancelBtn}>
              Cancel
            </button>
            <button type="submit" disabled={submitting} style={styles.submitBtn}>
              {submitting ? 'Seating...' : 'Confirm & Seat'}
            </button>
          </div>
        </form>
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
    maxWidth: '400px',
    padding: 'var(--space-xl)',
    boxShadow: 'var(--shadow-lg)',
    display: 'flex',
    flexDirection: 'column',
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
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-md)',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: '13px',
    color: 'var(--color-text)',
  },
  input: {
    padding: '10px 12px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    fontSize: '14px',
    fontFamily: 'var(--font-body)',
    outline: 'none',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 'var(--space-sm)',
    marginTop: 'var(--space-md)',
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
  errorAlert: {
    backgroundColor: 'var(--color-danger-light)',
    color: 'var(--color-danger)',
    padding: '8px 12px',
    borderRadius: 'var(--radius-md)',
    fontSize: '13px',
    marginBottom: 'var(--space-md)',
  },
};
