// ════════════════════════════════════════════
//  Polymorphic Menu Catalog Dashboard Page
//  File: apps/pos/src/pages/MenuPage.tsx
// ════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatPaiseToRupees } from '@skillsetgo/shared';
import PolymorphicItemForm from '../components/menu/PolymorphicItemForm';

interface MenuItemDoc {
  id: string;
  name: string;
  display_name?: string;
  category_id: string;
  base_price: number;
  item_kind: 'simple' | 'recipe' | 'combo' | 'variant_parent';
  is_available: boolean;
  variants?: Array<{ name: string; price_override: number }>;
  recipe?: { ingredients: Array<{ name: string; quantity: number; unit: string }> };
  sku?: string;
}

const CATEGORY_MAP: Record<string, string> = {
  cat_mains: 'Main Course',
  cat_starters: 'Starters & Snacks',
  cat_beverages: 'Beverages',
  cat_desserts: 'Desserts',
  cat_breads: 'Breads & Rice',
};

export default function MenuPage() {
  const [items, setItems] = useState<MenuItemDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const outletId = 'OUT001';

  useEffect(() => {
    const itemsRef = collection(db, 'outlets', outletId, 'items');
    const q = query(itemsRef, orderBy('sort_order', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: MenuItemDoc[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<MenuItemDoc, 'id'>),
        }));
        setItems(list);
        setLoading(false);
      },
      (error) => {
        console.error('Firestore listener error:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [outletId]);

  const toggleAvailability = async (item: MenuItemDoc) => {
    try {
      const itemRef = doc(db, 'outlets', outletId, 'items', item.id);
      await updateDoc(itemRef, {
        is_available: !item.is_available,
      });
    } catch (err) {
      console.error('Failed to toggle item availability:', err);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesCategory =
      selectedCategory === 'ALL' || item.category_id === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div style={styles.pageContainer}>
      {/* Dashboard Top Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.pageTitle}>Polymorphic Item Catalog</h1>
          <p style={styles.pageSubtitle}>
            Live Firestore catalog with offline multi-tab persistence &amp; dynamic item kinds.
          </p>
        </div>
        <div style={styles.statsBadge}>
          <span style={styles.statsNumber}>{items.length}</span>
          <span style={styles.statsText}>Total Items</span>
        </div>
      </div>

      {/* Main Split Pane Layout */}
      <div style={styles.splitPane}>
        {/* LEFT PANE: Active Menu List */}
        <div style={styles.leftPane}>
          {/* Controls Bar */}
          <div style={styles.controlsBar}>
            <input
              type="text"
              placeholder="Search items by name or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
            <div style={styles.categoryTabs}>
              <button
                style={{
                  ...styles.tabBtn,
                  ...(selectedCategory === 'ALL' ? styles.tabBtnActive : {}),
                }}
                onClick={() => setSelectedCategory('ALL')}
              >
                All
              </button>
              {Object.entries(CATEGORY_MAP).map(([catKey, catLabel]) => (
                <button
                  key={catKey}
                  style={{
                    ...styles.tabBtn,
                    ...(selectedCategory === catKey ? styles.tabBtnActive : {}),
                  }}
                  onClick={() => setSelectedCategory(catKey)}
                >
                  {catLabel}
                </button>
              ))}
            </div>
          </div>

          {/* List Content */}
          {loading ? (
            <div style={styles.emptyBox}>Loading Firestore menu items...</div>
          ) : filteredItems.length === 0 ? (
            <div style={styles.emptyBox}>
              <p style={{ fontSize: '32px', marginBottom: '8px' }}>🍽️</p>
              <h3 style={styles.emptyTitle}>No items found</h3>
              <p style={styles.emptyText}>
                {items.length === 0
                  ? 'Your menu is currently empty. Create your first item using the form on the right.'
                  : 'No items match your selected filter or search term.'}
              </p>
            </div>
          ) : (
            <div style={styles.itemsGrid}>
              {filteredItems.map((item) => (
                <div key={item.id} style={styles.itemCard}>
                  <div style={styles.cardHeader}>
                    <div style={styles.cardTitleBox}>
                      <h3 style={styles.itemName}>{item.name}</h3>
                      <span style={styles.categoryBadge}>
                        {CATEGORY_MAP[item.category_id] || 'General'}
                      </span>
                    </div>

                    <span
                      style={{
                        ...styles.kindBadge,
                        backgroundColor:
                          item.item_kind === 'simple'
                            ? 'var(--color-support-1-light)'
                            : item.item_kind === 'recipe'
                            ? 'rgba(148, 39, 5, 0.08)'
                            : 'rgba(253, 211, 85, 0.2)',
                        color:
                          item.item_kind === 'simple'
                            ? 'var(--color-support-1)'
                            : item.item_kind === 'recipe'
                            ? 'var(--color-primary)'
                            : '#7A5B00',
                      }}
                    >
                      {item.item_kind.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>

                  <div style={styles.cardDetails}>
                    {/* Price Rendering */}
                    {item.item_kind === 'variant_parent' && item.variants?.length ? (
                      <div style={styles.priceSection}>
                        <span style={styles.priceLabel}>Variants:</span>
                        <div style={styles.variantPills}>
                          {item.variants.map((v, i) => (
                            <span key={i} style={styles.variantPill}>
                              {v.name}: {formatPaiseToRupees(v.price_override)}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div style={styles.priceSection}>
                        <span style={styles.priceValue}>
                          {formatPaiseToRupees(item.base_price)}
                        </span>
                      </div>
                    )}

                    {/* Ingredients Summary for Recipe Items */}
                    {item.item_kind === 'recipe' && item.recipe?.ingredients?.length ? (
                      <div style={styles.recipeIngredientsText}>
                        🧑‍🍳 Ingredients:{' '}
                        {item.recipe.ingredients.map((ing) => ing.name).join(', ')}
                      </div>
                    ) : null}

                    {/* SKU Info */}
                    {item.sku && (
                      <span style={styles.skuTag}>SKU: {item.sku}</span>
                    )}
                  </div>

                  <div style={styles.cardFooter}>
                    <button
                      onClick={() => toggleAvailability(item)}
                      style={{
                        ...styles.toggleBtn,
                        backgroundColor: item.is_available
                          ? 'var(--color-support-1-light)'
                          : 'var(--color-danger-light)',
                        color: item.is_available
                          ? 'var(--color-support-1)'
                          : 'var(--color-danger)',
                      }}
                    >
                      {item.is_available ? '● Available' : '○ Out of Stock'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT PANE: Polymorphic Item Form Scaffolding */}
        <div style={styles.rightPane}>
          <PolymorphicItemForm outletId={outletId} />
        </div>
      </div>
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
  statsBadge: {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: '8px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
    boxShadow: 'var(--shadow-sm)',
  },
  statsNumber: {
    fontFamily: 'var(--font-display)',
    fontSize: '22px',
    fontWeight: 800,
    color: 'var(--color-primary)',
  },
  statsText: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  splitPane: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 1fr',
    gap: 'var(--space-xl)',
    alignItems: 'start',
  },
  leftPane: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-md)',
  },
  rightPane: {
    position: 'sticky',
    top: '80px',
  },
  controlsBar: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-sm)',
  },
  searchInput: {
    padding: '10px 14px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    fontSize: '14px',
    fontFamily: 'var(--font-body)',
    outline: 'none',
    width: '100%',
    backgroundColor: 'var(--color-surface)',
  },
  categoryTabs: {
    display: 'flex',
    gap: 'var(--space-xs)',
    flexWrap: 'wrap',
  },
  tabBtn: {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    padding: '6px 14px',
    borderRadius: 'var(--radius-pill)',
    fontSize: '12px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  tabBtnActive: {
    backgroundColor: 'var(--color-primary)',
    color: '#FFFFFF',
    borderColor: 'var(--color-primary)',
  },
  itemsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-md)',
  },
  itemCard: {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-md) var(--space-lg)',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-xs)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitleBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
  },
  itemName: {
    fontSize: '16px',
    fontWeight: 700,
    fontFamily: 'var(--font-display)',
    color: 'var(--color-text)',
    margin: 0,
  },
  categoryBadge: {
    fontSize: '11px',
    fontWeight: 600,
    backgroundColor: '#F3F0EC',
    color: 'var(--color-text-muted)',
    padding: '2px 8px',
    borderRadius: 'var(--radius-sm)',
  },
  kindBadge: {
    fontSize: '10px',
    fontWeight: 800,
    padding: '3px 8px',
    borderRadius: 'var(--radius-pill)',
    letterSpacing: '0.5px',
  },
  cardDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginTop: '4px',
  },
  priceSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-xs)',
  },
  priceValue: {
    fontSize: '18px',
    fontWeight: 700,
    fontFamily: 'var(--font-display)',
    color: 'var(--color-primary)',
  },
  priceLabel: {
    fontSize: '12px',
    color: 'var(--color-text-muted)',
    fontWeight: 600,
  },
  variantPills: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
  },
  variantPill: {
    fontSize: '12px',
    fontWeight: 600,
    backgroundColor: 'rgba(148, 39, 5, 0.05)',
    color: 'var(--color-primary)',
    padding: '2px 8px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid rgba(148, 39, 5, 0.15)',
  },
  recipeIngredientsText: {
    fontSize: '12px',
    color: 'var(--color-text-muted)',
    marginTop: '2px',
  },
  skuTag: {
    fontSize: '11px',
    color: 'var(--color-text-muted)',
    fontFamily: 'monospace',
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: 'var(--space-xs)',
    paddingTop: 'var(--space-xs)',
    borderTop: '1px dashed var(--color-border)',
  },
  toggleBtn: {
    border: 'none',
    padding: '4px 10px',
    borderRadius: 'var(--radius-pill)',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
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
  emptyText: {
    fontSize: '14px',
    maxWidth: '400px',
    margin: '0 auto',
  },
};
