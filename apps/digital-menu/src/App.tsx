// ════════════════════════════════════════════
//  Customer Digital Menu App
//  File: apps/digital-menu/src/App.tsx
// ════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './lib/firebase.ts';
import { formatPaiseToRupees } from '@skillsetgo/shared';

interface MenuItem {
  id: string;
  name: string;
  category: string;
  base_price: number;
  item_kind: string;
  is_available: boolean;
  variants?: Array<{ name: string; price_override: number }>;
  tax_config?: { tax_group_id: string };
}

interface CartItem {
  item_id: string;
  item_name: string;
  variant_name?: string;
  unit_price: number; // in paise
  quantity: number;
  tax_group_id: string;
}

export default function App() {
  // Parse outlet_id from route/hash URL
  const getOutletIdFromUrl = (): string => {
    const hash = window.location.hash || window.location.pathname;
    const parts = hash.split('/digital-menu/');
    if (parts.length > 1 && parts[1]) {
      return parts[1].split('?')[0].split('/')[0] || 'OUT001';
    }
    return 'OUT001';
  };

  const outletId = getOutletIdFromUrl();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Category State
  const [categories, setCategories] = useState<string[]>(['All']);
  const [activeCategory, setActiveCategory] = useState('All');

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Variant Bottom Sheet State
  const [selectedParentItem, setSelectedParentItem] = useState<MenuItem | null>(null);

  // Token Handoff State
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [submittingQueue, setSubmittingQueue] = useState(false);

  // Live Catalog Sync for available items
  useEffect(() => {
    const itemsRef = collection(db, 'outlets', outletId, 'items');
    const q = query(itemsRef, where('is_available', '==', true));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: MenuItem[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<MenuItem, 'id'>),
        }));
        setItems(list);

        const cats = Array.from(new Set(list.map((i) => i.category || 'Uncategorized')));
        setCategories(['All', ...cats]);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching live digital menu:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [outletId]);

  // Cart Management Functions
  const handleAddToCart = (item: MenuItem, variantIdx?: number) => {
    let unitPrice = item.base_price;
    let variantName: string | undefined = undefined;

    if (item.item_kind === 'variant_parent') {
      if (variantIdx === undefined) {
        setSelectedParentItem(item);
        return;
      } else if (item.variants && item.variants[variantIdx]) {
        const v = item.variants[variantIdx];
        unitPrice = v.price_override;
        variantName = v.name;
      }
    }

    const existingIndex = cart.findIndex(
      (c) => c.item_id === item.id && c.variant_name === variantName
    );

    if (existingIndex >= 0) {
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
    } else {
      setCart([
        ...cart,
        {
          item_id: item.id,
          item_name: item.name,
          variant_name: variantName,
          unit_price: unitPrice,
          quantity: 1,
          tax_group_id: item.tax_config?.tax_group_id || 'tax_gst_5',
        },
      ]);
    }

    setSelectedParentItem(null);
  };

  const updateCartQty = (idx: number, delta: number) => {
    const updated = [...cart];
    const newQty = updated[idx].quantity + delta;
    if (newQty <= 0) {
      updated.splice(idx, 1);
    } else {
      updated[idx].quantity = newQty;
    }
    setCart(updated);
  };

  const cartTotalPaise = cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Send to Waitlist Action
  const handleSendToWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || cart.length === 0) return;

    setSubmittingQueue(true);

    try {
      const randomCode = Math.floor(1000 + Math.random() * 9000);
      const tokenCode = `PRE-${randomCode}`;

      const partyPayload = {
        party_name: customerName.trim(),
        party_size: Number(partySize) || 1,
        status: 'queued',
        queue_token: tokenCode,
        payment_received: false,
        soundbox_triggered: false,
        kot_triggered: false,
        pre_order_items: cart.map((c) => ({
          line_id: `pre_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          item_id: c.item_id,
          item_name: c.item_name,
          variant_name: c.variant_name,
          quantity: c.quantity,
          unit_price: c.unit_price,
          tax_group_id: c.tax_group_id,
          kot_status: 'pending',
          addons: [],
        })),
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        outlet_id: outletId,
        is_deleted: false,
      };

      await addDoc(collection(db, 'outlets', outletId, 'parties'), partyPayload);

      setGeneratedToken(tokenCode);
      setIsCartOpen(false);
    } catch (err) {
      console.error('Error submitting pre-order to waitlist:', err);
      alert('Failed to submit pre-order. Please try again.');
    } finally {
      setSubmittingQueue(false);
    }
  };

  const filteredItems = activeCategory === 'All'
    ? items
    : items.filter((i) => (i.category || 'Uncategorized') === activeCategory);

  return (
    <div style={styles.appShell}>
      <div style={styles.phoneContainer}>
        {/* Header */}
        <header style={styles.header}>
          <div style={styles.brandTitle}>
            <span>SkillSetGo</span>
            <span style={styles.brandBadge}>Digital Menu</span>
          </div>
          <span style={styles.outletBadge}>Outlet #{outletId}</span>
        </header>

        {/* Sticky Category Scroll */}
        <nav style={styles.categoryBar}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                ...styles.categoryChip,
                ...(activeCategory === cat ? styles.categoryChipActive : {}),
              }}
            >
              {cat}
            </button>
          ))}
        </nav>

        {/* Catalog Grid */}
        <main style={styles.mainContent}>
          {loading ? (
            <div style={styles.statusBox}>Syncing digital menu items...</div>
          ) : filteredItems.length === 0 ? (
            <div style={styles.statusBox}>No items available in this category.</div>
          ) : (
            <div style={styles.itemGrid}>
              {filteredItems.map((item) => (
                <div key={item.id} style={styles.itemCard} onClick={() => handleAddToCart(item)}>
                  <div style={styles.itemMeta}>
                    <h3 style={styles.itemName}>{item.name}</h3>
                    <span style={styles.itemCategory}>{item.category || 'Uncategorized'}</span>
                  </div>
                  <div style={styles.itemPriceRow}>
                    <span style={styles.itemPrice}>
                      {item.item_kind === 'variant_parent'
                        ? 'Select Variant'
                        : formatPaiseToRupees(item.base_price)}
                    </span>
                    <button style={styles.addBtn}>+ Add</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Floating View Cart Bar */}
        {cart.length > 0 && !isCartOpen && !generatedToken && (
          <div style={styles.floatingCartBar}>
            <button onClick={() => setIsCartOpen(true)} style={styles.viewCartBtn}>
              <span>🛒 View Cart ({totalItemCount} items)</span>
              <strong>{formatPaiseToRupees(cartTotalPaise)} →</strong>
            </button>
          </div>
        )}

        {/* Variant Bottom Sheet Modal */}
        {selectedParentItem && (
          <div style={styles.overlay}>
            <div style={styles.bottomSheet}>
              <div style={styles.sheetHeader}>
                <h3 style={styles.sheetTitle}>Select Variant for {selectedParentItem.name}</h3>
                <button onClick={() => setSelectedParentItem(null)} style={styles.closeBtn}>
                  ✕
                </button>
              </div>

              <div style={styles.variantList}>
                {selectedParentItem.variants?.map((v, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAddToCart(selectedParentItem, idx)}
                    style={styles.variantOptionBtn}
                  >
                    <span>{v.name}</span>
                    <strong>{formatPaiseToRupees(v.price_override)}</strong>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Cart Drawer / Waitlist Pre-order Sheet */}
        {isCartOpen && (
          <div style={styles.overlay}>
            <div style={styles.bottomSheetFull}>
              <div style={styles.sheetHeader}>
                <h3 style={styles.sheetTitle}>Your Pre-Order Cart</h3>
                <button onClick={() => setIsCartOpen(false)} style={styles.closeBtn}>
                  ✕
                </button>
              </div>

              <div style={styles.cartItemsList}>
                {cart.map((c, idx) => (
                  <div key={idx} style={styles.cartRow}>
                    <div>
                      <div style={styles.cartItemName}>{c.item_name}</div>
                      {c.variant_name && (
                        <div style={styles.cartItemVariant}>({c.variant_name})</div>
                      )}
                      <div style={styles.cartItemPrice}>
                        {formatPaiseToRupees(c.unit_price * c.quantity)}
                      </div>
                    </div>

                    <div style={styles.qtyControls}>
                      <button onClick={() => updateCartQty(idx, -1)} style={styles.qtyBtn}>
                        -
                      </button>
                      <span style={styles.qtyVal}>{c.quantity}</span>
                      <button onClick={() => updateCartQty(idx, 1)} style={styles.qtyBtn}>
                        +
                      </button>
                    </div>
                  </div>
                ))}

                <div style={styles.cartTotalSummary}>
                  <span>Total Estimated Bill</span>
                  <strong>{formatPaiseToRupees(cartTotalPaise)}</strong>
                </div>
              </div>

              {/* Handoff Details Form */}
              <form onSubmit={handleSendToWaitlist} style={styles.waitlistForm}>
                <h4 style={styles.formTitle}>📋 Send Pre-Order to Host Queue</h4>
                <div style={styles.row}>
                  <input
                    type="text"
                    placeholder="Your Name (e.g. Rahul)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    style={{ ...styles.input, flex: 2 }}
                    required
                  />
                  <input
                    type="number"
                    min="1"
                    max="20"
                    placeholder="Party Size"
                    value={partySize}
                    onChange={(e) => setPartySize(Number(e.target.value))}
                    style={{ ...styles.input, flex: 1 }}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingQueue}
                  style={styles.sendWaitlistBtn}
                >
                  {submittingQueue ? 'Generating Handoff Token...' : '🚀 Send to Waitlist Host'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Handoff Digital Token Card Payload */}
        {generatedToken && (
          <div style={styles.overlay}>
            <div style={styles.tokenCardModal}>
              <div style={styles.tokenCardHeader}>
                <span style={styles.successIcon}>🎉</span>
                <h3 style={styles.tokenCardTitle}>Pre-Order Submitted!</h3>
                <p style={styles.tokenCardSubtitle}>
                  Please show this digital token card to the host at the entrance counter.
                </p>
              </div>

              <div style={styles.tokenBadgeBox}>
                <span style={styles.tokenLabel}>YOUR QUEUE TOKEN</span>
                <span style={styles.tokenCode}>{generatedToken}</span>
                <span style={styles.tokenParty}>
                  Guest: <strong>{customerName}</strong> ({partySize} Guests)
                </span>
              </div>

              <div style={styles.tokenItemsSummary}>
                <span style={styles.summaryLabel}>Pre-Ordered Dishes ({cart.length})</span>
                {cart.map((c, i) => (
                  <div key={i} style={styles.summaryRow}>
                    <span>
                      {c.quantity}x {c.item_name} {c.variant_name ? `(${c.variant_name})` : ''}
                    </span>
                    <span>{formatPaiseToRupees(c.unit_price * c.quantity)}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => {
                  setGeneratedToken(null);
                  setCart([]);
                  setCustomerName('');
                }}
                style={styles.closeTokenBtn}
              >
                Done / Start New Pre-Order
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  appShell: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
  },
  phoneContainer: {
    width: '100%',
    maxWidth: '480px',
    backgroundColor: 'var(--color-background)',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    boxShadow: 'var(--shadow-lg)',
  },
  header: {
    backgroundColor: 'var(--color-surface)',
    padding: '16px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--color-border)',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  brandTitle: {
    fontFamily: 'var(--font-display)',
    fontWeight: 800,
    fontSize: '20px',
    color: 'var(--color-primary)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  brandBadge: {
    backgroundColor: 'var(--color-primary-light)',
    color: 'var(--color-primary)',
    fontSize: '11px',
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 'var(--radius-pill)',
  },
  outletBadge: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--color-text-muted)',
  },
  categoryBar: {
    display: 'flex',
    overflowX: 'auto',
    padding: '12px 16px',
    gap: '8px',
    backgroundColor: 'var(--color-surface)',
    borderBottom: '1px solid var(--color-border)',
    position: 'sticky',
    top: '60px',
    zIndex: 9,
  },
  categoryChip: {
    padding: '8px 16px',
    borderRadius: 'var(--radius-pill)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text)',
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: '13px',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
  },
  categoryChipActive: {
    backgroundColor: 'var(--color-primary)',
    color: '#FFFFFF',
    borderColor: 'var(--color-primary)',
  },
  mainContent: {
    padding: '16px',
    flex: 1,
    paddingBottom: '100px',
  },
  statusBox: {
    textAlign: 'center',
    padding: '40px 20px',
    color: 'var(--color-text-muted)',
    fontSize: '14px',
  },
  itemGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '12px',
  },
  itemCard: {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: 'var(--shadow-sm)',
    cursor: 'pointer',
  },
  itemMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  itemName: {
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: '16px',
    color: 'var(--color-text)',
    margin: 0,
  },
  itemCategory: {
    fontSize: '12px',
    color: 'var(--color-text-muted)',
  },
  itemPriceRow: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '6px',
  },
  itemPrice: {
    fontWeight: 800,
    fontSize: '15px',
    color: 'var(--color-primary)',
  },
  addBtn: {
    backgroundColor: 'var(--color-primary-light)',
    color: 'var(--color-primary)',
    border: 'none',
    padding: '6px 12px',
    borderRadius: 'var(--radius-md)',
    fontWeight: 700,
    fontSize: '13px',
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
  },
  floatingCartBar: {
    position: 'fixed',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 'calc(100% - 32px)',
    maxWidth: '448px',
    zIndex: 100,
  },
  viewCartBtn: {
    width: '100%',
    backgroundColor: 'var(--color-primary)',
    color: '#FFFFFF',
    border: 'none',
    padding: '16px 20px',
    borderRadius: 'var(--radius-xl)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: '15px',
    boxShadow: 'var(--shadow-lg)',
    cursor: 'pointer',
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-end',
    zIndex: 'var(--z-modal)',
  },
  bottomSheet: {
    width: '100%',
    maxWidth: '480px',
    backgroundColor: 'var(--color-surface)',
    borderTopLeftRadius: 'var(--radius-xl)',
    borderTopRightRadius: 'var(--radius-xl)',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  bottomSheetFull: {
    width: '100%',
    maxWidth: '480px',
    backgroundColor: 'var(--color-surface)',
    borderTopLeftRadius: 'var(--radius-xl)',
    borderTopRightRadius: 'var(--radius-xl)',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  sheetHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: '12px',
  },
  sheetTitle: {
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: '18px',
    margin: 0,
  },
  closeBtn: {
    border: 'none',
    backgroundColor: 'transparent',
    fontSize: '20px',
    cursor: 'pointer',
    color: 'var(--color-text-muted)',
  },
  variantList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  variantOptionBtn: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '14px 16px',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-surface)',
    fontSize: '14px',
    fontFamily: 'var(--font-body)',
    cursor: 'pointer',
  },
  cartItemsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: '12px',
  },
  cartRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: '10px',
  },
  cartItemName: {
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: '14px',
  },
  cartItemVariant: {
    fontSize: '12px',
    color: 'var(--color-text-muted)',
  },
  cartItemPrice: {
    fontSize: '13px',
    fontWeight: 700,
    color: 'var(--color-primary)',
    marginTop: '2px',
  },
  qtyControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  qtyBtn: {
    width: '28px',
    height: '28px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    backgroundColor: '#FFFFFF',
    fontSize: '16px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  qtyVal: {
    fontWeight: 700,
    fontSize: '14px',
  },
  cartTotalSummary: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '10px',
    fontFamily: 'var(--font-display)',
    fontSize: '16px',
    fontWeight: 800,
  },
  waitlistForm: {
    marginTop: '20px',
    paddingTop: '16px',
    borderTop: '2px dashed var(--color-border)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  formTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '15px',
    fontWeight: 700,
    margin: 0,
  },
  row: {
    display: 'flex',
    gap: '8px',
  },
  input: {
    padding: '12px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    fontSize: '14px',
    outline: 'none',
  },
  sendWaitlistBtn: {
    backgroundColor: 'var(--color-primary)',
    color: '#FFFFFF',
    border: 'none',
    padding: '14px',
    borderRadius: 'var(--radius-lg)',
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: '15px',
    cursor: 'pointer',
    boxShadow: 'var(--shadow-sm)',
  },
  tokenCardModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 'var(--radius-xl)',
    width: 'calc(100% - 32px)',
    maxWidth: '420px',
    marginBottom: '40px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    boxShadow: 'var(--shadow-lg)',
    textAlign: 'center',
  },
  tokenCardHeader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  successIcon: {
    fontSize: '36px',
  },
  tokenCardTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '20px',
    fontWeight: 800,
    color: 'var(--color-primary)',
    margin: 0,
  },
  tokenCardSubtitle: {
    fontSize: '13px',
    color: 'var(--color-text-muted)',
  },
  tokenBadgeBox: {
    backgroundColor: 'var(--color-primary-light)',
    border: '2px dashed var(--color-primary)',
    borderRadius: 'var(--radius-lg)',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  tokenLabel: {
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--color-text-muted)',
    letterSpacing: '1px',
  },
  tokenCode: {
    fontFamily: 'var(--font-display)',
    fontSize: '32px',
    fontWeight: 800,
    color: 'var(--color-primary)',
  },
  tokenParty: {
    fontSize: '13px',
    color: 'var(--color-text)',
  },
  tokenItemsSummary: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    backgroundColor: 'var(--color-background)',
    padding: '12px',
    borderRadius: 'var(--radius-md)',
    textAlign: 'left',
  },
  summaryLabel: {
    fontSize: '12px',
    fontWeight: 700,
    color: 'var(--color-text-muted)',
    marginBottom: '4px',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
  },
  closeTokenBtn: {
    backgroundColor: 'var(--color-primary)',
    color: '#FFFFFF',
    border: 'none',
    padding: '12px',
    borderRadius: 'var(--radius-md)',
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: '14px',
    cursor: 'pointer',
  },
};
