// ════════════════════════════════════════════
//  Outlet Settings & Configuration Hub
//  File: apps/pos/src/pages/SettingsPage.tsx
// ════════════════════════════════════════════

import React, { useState } from 'react';
import FloorplanSetup from '../components/settings/FloorplanSetup';

import MenuCatalogSetup from '../components/settings/MenuCatalogSetup';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'floorplan' | 'catalog'>('floorplan');
  const outletId = 'OUT001';

  return (
    <div style={styles.pageContainer}>
      {/* Page Header */}
      <div style={styles.header}>
        <h1 style={styles.pageTitle}>Outlet Configuration &amp; Operations</h1>
        <p style={styles.pageSubtitle}>
          Configure your physical floorplan layout, dining capacity, and catalog item master.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div style={styles.tabContainer}>
        <button
          type="button"
          onClick={() => setActiveTab('floorplan')}
          style={{
            ...styles.tabBtn,
            ...(activeTab === 'floorplan' ? styles.tabBtnActive : {}),
          }}
        >
          🪑 Floorplan Setup
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('catalog')}
          style={{
            ...styles.tabBtn,
            ...(activeTab === 'catalog' ? styles.tabBtnActive : {}),
          }}
        >
          🍔 Menu Catalog Manager
        </button>
      </div>

      {/* Tab Panels */}
      <div style={styles.tabContent}>
        {activeTab === 'floorplan' && <FloorplanSetup outletId={outletId} />}

        {activeTab === 'catalog' && <MenuCatalogSetup outletId={outletId} />}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pageContainer: {
    padding: 'var(--space-xl)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-lg)',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  pageTitle: {
    fontSize: 'var(--font-h2-size)',
    color: 'var(--color-primary)',
    fontFamily: 'var(--font-display)',
    fontWeight: 800,
    margin: 0,
  },
  pageSubtitle: {
    color: 'var(--color-text-muted)',
    fontSize: '15px',
    margin: 0,
  },
  tabContainer: {
    display: 'flex',
    gap: 'var(--space-sm)',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: 'var(--space-xs)',
  },
  tabBtn: {
    padding: '10px 20px',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    backgroundColor: 'transparent',
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: '14px',
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  tabBtnActive: {
    backgroundColor: 'var(--color-primary)',
    color: '#FFFFFF',
    boxShadow: 'var(--shadow-sm)',
  },
  tabContent: {
    marginTop: 'var(--space-sm)',
  },
  placeholderCard: {
    backgroundColor: 'var(--color-surface)',
    border: '1px dashed var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-3xl) var(--space-xl)',
    textAlign: 'center',
    color: 'var(--color-text-muted)',
  },
  placeholderTitle: {
    fontSize: '20px',
    fontWeight: 700,
    fontFamily: 'var(--font-display)',
    color: 'var(--color-text)',
    margin: '0 0 6px 0',
  },
  placeholderSubtitle: {
    fontSize: '14px',
    maxWidth: '480px',
    margin: '0 auto',
  },
};
