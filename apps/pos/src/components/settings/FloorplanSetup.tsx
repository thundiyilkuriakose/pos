// ════════════════════════════════════════════
//  Floorplan Setup Component
//  File: apps/pos/src/components/settings/FloorplanSetup.tsx
// ════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import {
  collection,
  onSnapshot,
  query,
  writeBatch,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface TableItem {
  id: string;
  table_number: string;
  section: string;
  capacity: number;
  status: string;
  outlet_id: string;
}

interface FloorplanSetupProps {
  outletId?: string;
}

export default function FloorplanSetup({ outletId = 'OUT001' }: FloorplanSetupProps) {
  const [tables, setTables] = useState<TableItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Bulk Generator State
  const [bulkCount, setBulkCount] = useState<number>(4);
  const [bulkCapacity, setBulkCapacity] = useState<number>(4);
  const [bulkSection, setBulkSection] = useState<string>('Main Dining');
  const [generating, setGenerating] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Listen to Firestore tables in real time
  useEffect(() => {
    const tablesRef = collection(db, 'outlets', outletId, 'tables');
    const q = query(tablesRef);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: TableItem[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<TableItem, 'id'>),
        }));

        // Alphanumeric sorting by table number
        list.sort((a, b) =>
          a.table_number.localeCompare(b.table_number, undefined, { numeric: true, sensitivity: 'base' })
        );

        setTables(list);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching tables for floorplan setup:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [outletId]);

  // Bulk Generator Action
  const handleBulkGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bulkCount <= 0) return;

    setGenerating(true);
    setFeedbackMsg('');

    try {
      const batch = writeBatch(db);
      const tablesRef = collection(db, 'outlets', outletId, 'tables');

      // Determine starting index based on existing table count
      const startIdx = tables.length + 1;

      for (let i = 0; i < bulkCount; i++) {
        const numStr = String(startIdx + i).padStart(2, '0');
        const newTableRef = doc(tablesRef);

        batch.set(newTableRef, {
          table_number: `T-${numStr}`,
          capacity: bulkCapacity,
          section: bulkSection.trim() || 'Main Dining',
          status: 'available',
          outlet_id: outletId, // Dynamic tenant mapping context
          is_deleted: false,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        });
      }

      const commitPromise = batch.commit();

      // Optimistically unblock UI & reset inputs since local IndexedDB + onSnapshot has already captured the batch
      setFeedbackMsg(`Successfully generated ${bulkCount} new tables!`);
      setBulkCount(4);
      setBulkCapacity(4);
      setGenerating(false);

      commitPromise.catch((err: any) => {
        console.error('Error executing batch generation:', err);
        setFeedbackMsg(err.message || 'Failed to generate floorplan tables.');
      });
    } catch (err: any) {
      console.error('Error constructing batch generation:', err);
      setFeedbackMsg(err.message || 'Failed to generate floorplan tables.');
      setGenerating(false);
    }
  };

  // Update Table Fields Inline
  const handleUpdateTable = async (id: string, updates: Partial<TableItem>) => {
    try {
      const tableRef = doc(db, 'outlets', outletId, 'tables', id);
      await updateDoc(tableRef, {
        ...updates,
        updated_at: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error updating table:', err);
    }
  };

  // Delete Table
  const handleDeleteTable = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from your floorplan?`)) {
      return;
    }

    try {
      const tableRef = doc(db, 'outlets', outletId, 'tables', id);
      await deleteDoc(tableRef);
    } catch (err) {
      console.error('Error deleting table:', err);
    }
  };

  return (
    <div style={styles.container}>
      {/* Quick Grid Generator Card */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>⚡ Quick Grid Generator</h2>
          <span style={styles.cardSubtitle}>
            Batch-create sequential dining tables for rapid onboarding setup.
          </span>
        </div>

        <form onSubmit={handleBulkGenerate} style={styles.generatorForm}>
          <div style={styles.formRow}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Number of Tables</label>
              <input
                type="number"
                min="1"
                max="50"
                value={bulkCount}
                onChange={(e) => setBulkCount(Number(e.target.value))}
                style={styles.input}
                required
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Base Capacity / Chairs</label>
              <input
                type="number"
                min="1"
                max="30"
                value={bulkCapacity}
                onChange={(e) => setBulkCapacity(Number(e.target.value))}
                style={styles.input}
                required
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Section Zone</label>
              <input
                type="text"
                value={bulkSection}
                onChange={(e) => setBulkSection(e.target.value)}
                placeholder="e.g. Main Dining, Patio"
                style={styles.input}
                required
              />
            </div>

            <button
              type="submit"
              disabled={generating}
              style={{
                ...styles.generateBtn,
                opacity: generating ? 0.7 : 1,
              }}
            >
              {generating ? 'Generating Batch...' : '+ Generate Tables'}
            </button>
          </div>
        </form>

        {feedbackMsg && <div style={styles.feedbackAlert}>{feedbackMsg}</div>}
      </div>

      {/* Live Customizer Grid */}
      <div style={styles.card}>
        <div style={styles.customizerHeader}>
          <div>
            <h2 style={styles.cardTitle}>🪑 Live Table Floorplan Customizer</h2>
            <span style={styles.cardSubtitle}>
              Directly edit seating capacities, section labels, or delete physical tables. Updates reflect live on waiter terminals.
            </span>
          </div>
          <div style={styles.tableCountBadge}>
            {tables.length} Total Tables
          </div>
        </div>

        {loading ? (
          <div style={styles.loadingBox}>Fetching live floorplan tables...</div>
        ) : tables.length === 0 ? (
          <div style={styles.emptyBox}>
            <p style={{ fontSize: '32px', marginBottom: '8px' }}>🏢</p>
            <h3 style={styles.emptyTitle}>No tables in your floorplan</h3>
            <p style={styles.emptySubtitle}>
              Use the <strong>Quick Grid Generator</strong> above to instantly set up your restaurant dining area.
            </p>
          </div>
        ) : (
          <div style={styles.tablesGrid}>
            {tables.map((table) => (
              <div key={table.id} style={styles.tableEditorCard}>
                <div style={styles.editorCardTop}>
                  <div style={styles.inputWrapper}>
                    <label style={styles.miniLabel}>Display Name</label>
                    <input
                      type="text"
                      value={table.table_number}
                      onChange={(e) =>
                        handleUpdateTable(table.id, { table_number: e.target.value })
                      }
                      style={styles.tableNameInput}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteTable(table.id, table.table_number)}
                    title="Remove Table"
                    style={styles.deleteBtn}
                  >
                    🗑️
                  </button>
                </div>

                <div style={styles.editorCardMiddle}>
                  <div style={styles.inputWrapper}>
                    <label style={styles.miniLabel}>Section / Zone</label>
                    <input
                      type="text"
                      value={table.section || ''}
                      onChange={(e) =>
                        handleUpdateTable(table.id, { section: e.target.value })
                      }
                      style={styles.sectionInput}
                    />
                  </div>

                  <div style={styles.inputWrapper}>
                    <label style={styles.miniLabel}>Capacity</label>
                    <div style={styles.stepperWrapper}>
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateTable(table.id, {
                            capacity: Math.max(1, table.capacity - 1),
                          })
                        }
                        style={styles.stepBtn}
                      >
                        -
                      </button>
                      <span style={styles.capacityValue}>{table.capacity}</span>
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateTable(table.id, {
                            capacity: table.capacity + 1,
                          })
                        }
                        style={styles.stepBtn}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div style={styles.editorCardFooter}>
                  <span
                    style={{
                      ...styles.statusDot,
                      backgroundColor:
                        table.status === 'occupied'
                          ? 'var(--color-status-occupied, #E53935)'
                          : 'var(--color-support-1, #2E7D32)',
                    }}
                  />
                  <span style={styles.statusText}>
                    Status: {table.status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-xl)',
  },
  card: {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-xl)',
    boxShadow: 'var(--shadow-sm)',
  },
  cardHeader: {
    marginBottom: 'var(--space-lg)',
  },
  cardTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '18px',
    fontWeight: 700,
    color: 'var(--color-primary)',
    margin: '0 0 4px 0',
  },
  cardSubtitle: {
    fontSize: '13px',
    color: 'var(--color-text-muted)',
  },
  generatorForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-md)',
  },
  formRow: {
    display: 'flex',
    gap: 'var(--space-md)',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1,
    minWidth: '150px',
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
    backgroundColor: '#FFFFFF',
  },
  generateBtn: {
    backgroundColor: 'var(--color-primary)',
    color: '#FFFFFF',
    border: 'none',
    padding: '11px 22px',
    borderRadius: 'var(--radius-md)',
    fontSize: '14px',
    fontWeight: 700,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    boxShadow: 'var(--shadow-sm)',
    whiteSpace: 'nowrap',
  },
  feedbackAlert: {
    marginTop: 'var(--space-md)',
    padding: '10px 14px',
    backgroundColor: 'var(--color-support-1-light, #E8F5E9)',
    color: 'var(--color-support-1, #2E7D32)',
    borderRadius: 'var(--radius-md)',
    fontSize: '13px',
    fontWeight: 600,
  },
  customizerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 'var(--space-lg)',
  },
  tableCountBadge: {
    backgroundColor: 'var(--color-primary-light)',
    color: 'var(--color-primary)',
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: '13px',
    padding: '6px 14px',
    borderRadius: 'var(--radius-pill)',
  },
  loadingBox: {
    padding: 'var(--space-2xl)',
    textAlign: 'center',
    color: 'var(--color-text-muted)',
  },
  emptyBox: {
    padding: 'var(--space-2xl)',
    textAlign: 'center',
    border: '1px dashed var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    backgroundColor: 'var(--color-background)',
  },
  emptyTitle: {
    fontSize: '18px',
    fontWeight: 700,
    fontFamily: 'var(--font-display)',
    color: 'var(--color-text)',
    margin: '0 0 4px 0',
  },
  emptySubtitle: {
    fontSize: '14px',
    color: 'var(--color-text-muted)',
    maxWidth: '400px',
    margin: '0 auto',
  },
  tablesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: 'var(--space-lg)',
  },
  tableEditorCard: {
    backgroundColor: 'var(--color-background)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-md)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-md)',
    boxShadow: 'var(--shadow-sm)',
  },
  editorCardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 'var(--space-xs)',
  },
  inputWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flex: 1,
  },
  miniLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  tableNameInput: {
    padding: '6px 10px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: '15px',
    color: 'var(--color-text)',
    outline: 'none',
    backgroundColor: '#FFFFFF',
  },
  deleteBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '6px',
    borderRadius: 'var(--radius-sm)',
    transition: 'background var(--transition-fast)',
  },
  editorCardMiddle: {
    display: 'flex',
    gap: 'var(--space-sm)',
    alignItems: 'center',
  },
  sectionInput: {
    padding: '6px 10px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    fontSize: '12px',
    color: 'var(--color-text)',
    outline: 'none',
    backgroundColor: '#FFFFFF',
  },
  stepperWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    padding: '2px 6px',
  },
  stepBtn: {
    border: 'none',
    backgroundColor: 'transparent',
    fontWeight: 700,
    fontSize: '14px',
    cursor: 'pointer',
    padding: '2px 6px',
  },
  capacityValue: {
    fontWeight: 700,
    fontSize: '13px',
    color: 'var(--color-text)',
    minWidth: '16px',
    textAlign: 'center',
  },
  editorCardFooter: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    borderTop: '1px solid var(--color-border)',
    paddingTop: 'var(--space-xs)',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  statusText: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--color-text-muted)',
  },
};
