// ════════════════════════════════════════════
//  Interactive Table Floorplan Page
//  File: apps/pos/src/pages/TablesPage.tsx
// ════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import WalkInModal from '../components/orders/WalkInModal';
import OrderPanel from '../components/orders/OrderPanel';

interface TableItem {
  id: string;
  table_number: string;
  section: string;
  capacity: number;
  status: string;
  current_party_id?: string;
}

export default function TablesPage() {
  const [tables, setTables] = useState<TableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const outletId = 'OUT001';

  // Modal / Panel states
  const [selectedWalkInTable, setSelectedWalkInTable] = useState<TableItem | null>(null);
  
  const [orderPanelOpen, setOrderPanelOpen] = useState(false);
  const [activePartyId, setActivePartyId] = useState('');
  const [activeTableNumber, setActiveTableNumber] = useState('');

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
        
        // Sort by table number (basic string sort or alphanumeric if needed)
        list.sort((a, b) => a.table_number.localeCompare(b.table_number));
        
        setTables(list);
        setLoading(false);
      },
      (error) => {
        console.error('Tables realtime listener error:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [outletId]);

  const handleTableClick = (table: TableItem) => {
    if (table.status === 'available') {
      setSelectedWalkInTable(table);
    } else if (table.status === 'occupied') {
      if (table.current_party_id) {
        setActivePartyId(table.current_party_id);
        setActiveTableNumber(table.table_number);
        setOrderPanelOpen(true);
      } else {
        alert("This table is marked occupied but has no active party ID linked.");
      }
    } else {
      // Reserved or blocked
      alert(`Table is currently ${table.status}`);
    }
  };

  return (
    <div style={styles.pageContainer}>
      <h1 style={styles.pageTitle}>Table Floorplan Seating</h1>
      <p style={styles.pageSubtitle}>
        Manage dine-in seating layouts, covers, and real-time orders.
      </p>

      {loading ? (
        <div style={styles.loadingBox}>Loading floorplan...</div>
      ) : tables.length === 0 ? (
        <div style={styles.loadingBox}>
          No tables found. Ensure tables are seeded via the Queue seating flow first.
        </div>
      ) : (
        <div style={styles.floorplanGrid}>
          {tables.map((table) => {
            const isOccupied = table.status === 'occupied';
            const statusColor = isOccupied ? 'var(--color-status-occupied)' : 'var(--color-status-available)';
            
            return (
              <button
                key={table.id}
                type="button"
                onClick={() => handleTableClick(table)}
                style={{
                  ...styles.tableNode,
                  borderColor: statusColor,
                  backgroundColor: isOccupied ? 'var(--color-primary-light)' : 'var(--color-surface)',
                }}
              >
                <div style={styles.tableNodeHeader}>
                  <h3 style={styles.tableNumber}>{table.table_number}</h3>
                  <span style={styles.sectionBadge}>{table.section}</span>
                </div>
                
                <div style={styles.tableNodeFooter}>
                  <span style={{
                    ...styles.tableStatus,
                    color: isOccupied ? 'var(--color-primary)' : 'var(--color-support-1)'
                  }}>
                    {table.status.toUpperCase()}
                  </span>
                  <span style={styles.capacityText}>👥 {table.capacity}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Overlays */}
      <WalkInModal
        isOpen={selectedWalkInTable !== null}
        onClose={() => setSelectedWalkInTable(null)}
        table={selectedWalkInTable}
        outletId={outletId}
      />

      <OrderPanel
        isOpen={orderPanelOpen}
        onClose={() => setOrderPanelOpen(false)}
        partyId={activePartyId}
        tableNumber={activeTableNumber}
        outletId={outletId}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pageContainer: {
    padding: 'var(--space-xl)',
  },
  pageTitle: {
    fontSize: 'var(--font-h2-size)',
    color: 'var(--color-primary)',
    marginBottom: 'var(--space-xs)',
    fontFamily: 'var(--font-display)',
    margin: 0,
  },
  pageSubtitle: {
    color: 'var(--color-text-muted)',
    fontSize: '15px',
    marginBottom: 'var(--space-xl)',
  },
  loadingBox: {
    padding: 'var(--space-xl)',
    textAlign: 'center',
    color: 'var(--color-text-muted)',
  },
  floorplanGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: 'var(--space-lg)',
  },
  tableNode: {
    border: '2px solid',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-lg)',
    textAlign: 'left',
    boxShadow: 'var(--shadow-sm)',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-md)',
    transition: 'transform var(--transition-fast)',
  },
  tableNodeHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tableNumber: {
    fontSize: '20px',
    fontWeight: 700,
    margin: 0,
    fontFamily: 'var(--font-display)',
    color: 'var(--color-text)',
  },
  sectionBadge: {
    fontSize: '11px',
    fontWeight: 600,
    backgroundColor: '#EEEEEE',
    padding: '4px 8px',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text-muted)',
  },
  tableNodeFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tableStatus: {
    fontSize: '13px',
    fontWeight: 700,
    letterSpacing: '0.5px',
  },
  capacityText: {
    fontSize: '12px',
    color: 'var(--color-text-muted)',
    fontWeight: 600,
  },
};
