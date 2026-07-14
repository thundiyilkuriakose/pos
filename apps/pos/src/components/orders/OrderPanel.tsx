// ════════════════════════════════════════════
//  Split-Screen Order Panel Component
//  File: apps/pos/src/components/orders/OrderPanel.tsx
// ════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, onSnapshot, updateRef, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { formatPaiseToRupees } from '@skillsetgo/shared';

interface OrderPanelProps {
  isOpen: boolean;
  onClose: () => void;
  partyId: string;
  tableNumber: string;
  outletId?: string;
}

interface MenuItem {
  id: string;
  name: string;
  base_price: number;
  item_kind: string;
  category?: string;
  variants?: Array<{ name: string; price_override: number }>;
  tax_config?: { tax_group_id: string };
}

interface LineItem {
  line_id: string;
  item_id: string;
  item_name: string;
  item_kind: string;
  variant_id?: string;
  variant_name?: string;
  quantity: number;
  unit_price: number; // in paise
  tax_group_id: string;
  addons: any[];
  kot_status: 'pending' | 'sent';
}

interface PartyDoc {
  id: string;
  party_name: string;
  pre_order_items?: LineItem[];
  waiter_name?: string;
}

// Indian Tax Engine Configuration mock
// For a robust system, this should be fetched from Firestore.
const TAX_GROUPS: Record<string, { rate: number; name: string }> = {
  tax_gst_5: { rate: 0.05, name: 'GST 5%' },
  tax_gst_18: { rate: 0.18, name: 'GST 18%' },
  tax_nil: { rate: 0, name: 'Nil' },
};

export default function OrderPanel({
  isOpen,
  onClose,
  partyId,
  tableNumber,
  outletId = 'OUT001',
}: OrderPanelProps) {
  const [catalog, setCatalog] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [activeCategory, setActiveCategory] = useState('All');
  
  const [party, setParty] = useState<PartyDoc | null>(null);
  const [cart, setCart] = useState<LineItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [selectedParentItem, setSelectedParentItem] = useState<MenuItem | null>(null);

  // Sync with Party document for running items
  useEffect(() => {
    if (isOpen && partyId) {
      const partyRef = doc(db, 'outlets', outletId, 'parties', partyId);
      const unsubscribe = onSnapshot(partyRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setParty({ id: snap.id, ...data } as PartyDoc);
          setCart(data.pre_order_items || []);
        }
        setLoading(false);
      });
      return () => unsubscribe();
    }
  }, [isOpen, partyId, outletId]);

  // Fetch Catalog
  useEffect(() => {
    if (isOpen) {
      fetchCatalog();
    }
  }, [isOpen, outletId]);

  const fetchCatalog = async () => {
    try {
      const itemsRef = collection(db, 'outlets', outletId, 'items');
      const q = query(itemsRef, where('is_available', '==', true));
      const snap = await getDocs(q);
      const list: MenuItem[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<MenuItem, 'id'>),
      }));
      setCatalog(list);
      
      const cats = Array.from(new Set(list.map((i) => i.category || 'Uncategorized')));
      setCategories(['All', ...cats]);
    } catch (err) {
      console.error('Error fetching catalog:', err);
    }
  };

  if (!isOpen) return null;

  // Sync cart changes back to Firestore (debounced or explicit save)
  const saveCartToFirestore = async (newCart: LineItem[]) => {
    try {
      const partyRef = doc(db, 'outlets', outletId, 'parties', partyId);
      await updateDoc(partyRef, { pre_order_items: newCart });
    } catch (err) {
      console.error('Error syncing cart:', err);
    }
  };

  const handleAddItem = (item: MenuItem, variantIdx?: number) => {
    let unitPrice = item.base_price;
    let variantName: string | undefined = undefined;
    let variantId: string | undefined = undefined;

    if (item.item_kind === 'variant_parent') {
      if (variantIdx === undefined) {
        // Need to ask for variant
        setSelectedParentItem(item);
        setVariantModalOpen(true);
        return;
      } else if (item.variants?.length) {
        const v = item.variants[variantIdx];
        unitPrice = v.price_override;
        variantName = v.name;
        variantId = `var_${variantIdx}`;
      }
    }

    const existingIdx = cart.findIndex(
      (c) => c.item_id === item.id && c.variant_name === variantName && c.kot_status === 'pending'
    );

    let newCart = [...cart];
    if (existingIdx >= 0) {
      newCart[existingIdx].quantity += 1;
    } else {
      newCart.push({
        line_id: `line_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        item_id: item.id,
        item_name: item.name,
        item_kind: item.item_kind === 'variant_parent' ? 'variant' : item.item_kind,
        variant_id: variantId,
        variant_name: variantName,
        quantity: 1,
        unit_price: unitPrice,
        tax_group_id: item.tax_config?.tax_group_id || 'tax_gst_5',
        addons: [],
        kot_status: 'pending',
      });
    }

    setCart(newCart);
    saveCartToFirestore(newCart);
    setVariantModalOpen(false);
  };

  const updateQuantity = (idx: number, delta: number) => {
    const newCart = [...cart];
    const item = newCart[idx];
    
    // Once sent to KOT, a basic update might require voiding, but for simplicity here we just don't allow modifying sent items via this exact button if KOT flow is strict.
    // For now, allow modification if pending.
    if (item.kot_status === 'sent') {
      alert("Cannot modify items already sent to KOT. Please void instead.");
      return;
    }

    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      newCart.splice(idx, 1);
    } else {
      item.quantity = newQty;
    }
    setCart(newCart);
    saveCartToFirestore(newCart);
  };

  // V1 Indian Tax Engine Computation
  const computeTaxes = () => {
    let subtotalPaise = 0;
    let cgstPaise = 0;
    let sgstPaise = 0;

    cart.forEach((item) => {
      const lineTotal = item.unit_price * item.quantity;
      subtotalPaise += lineTotal;

      const taxGroup = TAX_GROUPS[item.tax_group_id] || TAX_GROUPS['tax_nil'];
      const taxRate = taxGroup.rate;
      
      // Calculate tax and split equally between CGST and SGST
      const totalTaxForLine = Math.round(lineTotal * taxRate);
      const halfTax = Math.round(totalTaxForLine / 2);
      
      cgstPaise += halfTax;
      sgstPaise += halfTax;
    });

    const grandTotalPaise = subtotalPaise + cgstPaise + sgstPaise;

    return { subtotalPaise, cgstPaise, sgstPaise, grandTotalPaise };
  };

  const totals = computeTaxes();

  const handlePrintKOT = async () => {
    const newCart = cart.map(item => {
      if (item.kot_status === 'pending') {
        return { ...item, kot_status: 'sent' as const };
      }
      return item;
    });

    setCart(newCart);
    await saveCartToFirestore(newCart);

    console.log("Mocking Capacitor Bluetooth thermal printer layout call...");
    console.log("-----------------------");
    console.log(`KOT - Table ${tableNumber}`);
    console.log(`Time: ${new Date().toLocaleTimeString()}`);
    console.log("-----------------------");
    newCart.forEach(item => {
      console.log(`${item.quantity}x ${item.item_name} ${item.variant_name ? `(${item.variant_name})` : ''}`);
    });
    console.log("-----------------------");
  };

  const handleProceedToBill = () => {
    alert("Proceeding to Bill: This will open the Checkout Overlay.");
  };

  const filteredCatalog = activeCategory === 'All' 
    ? catalog 
    : catalog.filter(i => (i.category || 'Uncategorized') === activeCategory);

  return (
    <div style={styles.slideOverOverlay}>
      <div style={styles.slideOverContainer}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.headerTitle}>Order Management</h2>
            <span style={styles.headerSubtitle}>
              Table {tableNumber} — {party?.party_name}
            </span>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={styles.splitScreen}>
          {/* Left Pane: Menu Catalog Browser */}
          <div style={styles.leftPane}>
            <div style={styles.categoryScroll}>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    ...styles.categoryBtn,
                    ...(activeCategory === cat ? styles.categoryBtnActive : {}),
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div style={styles.menuGrid}>
              {filteredCatalog.map((item) => (
                <div 
                  key={item.id} 
                  style={styles.menuCard} 
                  onClick={() => handleAddItem(item)}
                >
                  <span style={styles.menuItemName}>{item.name}</span>
                  <span style={styles.menuItemPrice}>
                    {item.item_kind === 'variant_parent' ? 'Multiple' : formatPaiseToRupees(item.base_price)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Pane: Active Receipt & Running Cart */}
          <div style={styles.rightPane}>
            <div style={styles.receiptHeader}>
              <span style={styles.receiptLabel}>Running Bill</span>
              <span style={styles.receiptWaiter}>{party?.waiter_name ? `Server: ${party.waiter_name}` : ''}</span>
            </div>

            <div style={styles.cartList}>
              {cart.length === 0 ? (
                <div style={styles.emptyCartMsg}>Cart is empty. Add items from the catalog.</div>
              ) : (
                cart.map((item, idx) => (
                  <div key={idx} style={styles.cartRow}>
                    <div style={styles.cartItemDetails}>
                      <span style={styles.cartItemName}>{item.item_name}</span>
                      {item.variant_name && <span style={styles.cartItemVariant}>({item.variant_name})</span>}
                      {item.kot_status === 'sent' && <span style={styles.kotSentBadge}>✓ Sent</span>}
                    </div>
                    <div style={styles.cartItemActions}>
                      <span style={styles.cartItemPrice}>{formatPaiseToRupees(item.unit_price * item.quantity)}</span>
                      <div style={styles.qtyControls}>
                        <button onClick={() => updateQuantity(idx, -1)} style={styles.qtyBtn}>-</button>
                        <span style={styles.qtyValue}>{item.quantity}</span>
                        <button onClick={() => updateQuantity(idx, 1)} style={styles.qtyBtn}>+</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={styles.taxEngineSection}>
              <div style={styles.taxRow}>
                <span>Subtotal</span>
                <span>{formatPaiseToRupees(totals.subtotalPaise)}</span>
              </div>
              <div style={styles.taxRow}>
                <span style={styles.taxLabel}>CGST</span>
                <span>{formatPaiseToRupees(totals.cgstPaise)}</span>
              </div>
              <div style={styles.taxRow}>
                <span style={styles.taxLabel}>SGST</span>
                <span>{formatPaiseToRupees(totals.sgstPaise)}</span>
              </div>
              <div style={{...styles.taxRow, ...styles.grandTotalRow}}>
                <span>Grand Total</span>
                <span>{formatPaiseToRupees(totals.grandTotalPaise)}</span>
              </div>
            </div>

            <div style={styles.actionButtonsRow}>
              <button style={styles.kotBtn} onClick={handlePrintKOT}>
                Print KOT
              </button>
              <button style={styles.billBtn} onClick={handleProceedToBill}>
                Proceed to Bill
              </button>
            </div>
          </div>
        </div>

        {/* Micro-modal for variants */}
        {variantModalOpen && selectedParentItem && (
          <div style={styles.variantModalOverlay}>
            <div style={styles.variantModal}>
              <h3 style={styles.variantTitle}>Select {selectedParentItem.name} Variant</h3>
              <div style={styles.variantList}>
                {selectedParentItem.variants?.map((v, idx) => (
                  <button 
                    key={idx} 
                    style={styles.variantOptionBtn}
                    onClick={() => handleAddItem(selectedParentItem, idx)}
                  >
                    <span>{v.name}</span>
                    <span>{formatPaiseToRupees(v.price_override)}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => setVariantModalOpen(false)} style={styles.variantCancelBtn}>Cancel</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  slideOverOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    backdropFilter: 'blur(3px)',
    zIndex: 'var(--z-drawer)',
    display: 'flex',
    justifyContent: 'flex-end',
  },
  slideOverContainer: {
    width: '90vw',
    maxWidth: '1200px',
    backgroundColor: 'var(--color-surface)',
    height: '100vh',
    boxShadow: '-4px 0 24px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    animation: 'slideInRight 0.3s ease-out forwards',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 'var(--space-md) var(--space-xl)',
    borderBottom: '1px solid var(--color-border)',
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '22px',
    fontWeight: 700,
    color: 'var(--color-primary)',
    margin: 0,
  },
  headerSubtitle: {
    fontSize: '14px',
    color: 'var(--color-text-muted)',
    fontWeight: 600,
  },
  closeBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '24px',
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
  },
  splitScreen: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  leftPane: {
    flex: 6,
    borderRight: '1px solid var(--color-border)',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--color-background)',
  },
  categoryScroll: {
    display: 'flex',
    overflowX: 'auto',
    padding: 'var(--space-md)',
    gap: 'var(--space-sm)',
    borderBottom: '1px solid var(--color-border)',
    backgroundColor: '#fff',
  },
  categoryBtn: {
    padding: '8px 16px',
    borderRadius: 'var(--radius-pill)',
    border: '1px solid var(--color-border)',
    backgroundColor: '#fff',
    color: 'var(--color-text)',
    whiteSpace: 'nowrap',
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: '13px',
  },
  categoryBtnActive: {
    backgroundColor: 'var(--color-primary)',
    color: '#fff',
    borderColor: 'var(--color-primary)',
  },
  menuGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: 'var(--space-md)',
    padding: 'var(--space-md)',
    overflowY: 'auto',
    flex: 1,
  },
  menuCard: {
    backgroundColor: '#fff',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-md)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '100px',
    cursor: 'pointer',
    boxShadow: 'var(--shadow-sm)',
    transition: 'transform var(--transition-fast)',
  },
  menuItemName: {
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: '14px',
    lineHeight: 1.2,
    color: 'var(--color-text)',
  },
  menuItemPrice: {
    fontWeight: 700,
    fontSize: '14px',
    color: 'var(--color-primary)',
    marginTop: 'var(--space-sm)',
  },
  rightPane: {
    flex: 4,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#fff',
  },
  receiptHeader: {
    padding: 'var(--space-md)',
    borderBottom: '1px dashed var(--color-border)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
  },
  receiptLabel: {
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: '16px',
  },
  receiptWaiter: {
    fontSize: '13px',
    color: 'var(--color-text-muted)',
  },
  cartList: {
    flex: 1,
    overflowY: 'auto',
    padding: 'var(--space-md)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-sm)',
  },
  emptyCartMsg: {
    textAlign: 'center',
    color: 'var(--color-text-muted)',
    fontSize: '14px',
    marginTop: 'var(--space-xl)',
  },
  cartRow: {
    display: 'flex',
    justifyContent: 'space-between',
    borderBottom: '1px solid #F0F0F0',
    paddingBottom: '8px',
  },
  cartItemDetails: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },
  cartItemName: {
    fontWeight: 600,
    fontSize: '14px',
  },
  cartItemVariant: {
    fontSize: '12px',
    color: 'var(--color-text-muted)',
  },
  kotSentBadge: {
    fontSize: '10px',
    color: '#fff',
    backgroundColor: 'var(--color-support-1)',
    padding: '2px 6px',
    borderRadius: '4px',
    marginTop: '4px',
    width: 'fit-content',
    fontWeight: 600,
  },
  cartItemActions: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '8px',
  },
  cartItemPrice: {
    fontWeight: 600,
    fontSize: '14px',
  },
  qtyControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  qtyBtn: {
    width: '24px',
    height: '24px',
    borderRadius: '4px',
    border: '1px solid var(--color-border)',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontWeight: 700,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyValue: {
    fontWeight: 700,
    fontSize: '14px',
    width: '16px',
    textAlign: 'center',
  },
  taxEngineSection: {
    padding: 'var(--space-md)',
    backgroundColor: '#FAF8F5',
    borderTop: '2px dashed var(--color-border)',
  },
  taxRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    marginBottom: '6px',
    color: 'var(--color-text)',
  },
  taxLabel: {
    color: 'var(--color-text-muted)',
    fontSize: '13px',
  },
  grandTotalRow: {
    fontFamily: 'var(--font-display)',
    fontSize: '20px',
    fontWeight: 800,
    marginTop: 'var(--space-sm)',
    paddingTop: 'var(--space-sm)',
    borderTop: '1px solid var(--color-border)',
    color: 'var(--color-primary)',
  },
  actionButtonsRow: {
    padding: 'var(--space-md)',
    display: 'flex',
    gap: 'var(--space-sm)',
    borderTop: '1px solid var(--color-border)',
    backgroundColor: '#fff',
  },
  kotBtn: {
    flex: 1,
    backgroundColor: 'var(--color-support-1)',
    color: '#fff',
    border: 'none',
    padding: '14px',
    borderRadius: 'var(--radius-lg)',
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: '15px',
    cursor: 'pointer',
    boxShadow: 'var(--shadow-sm)',
  },
  billBtn: {
    flex: 1,
    backgroundColor: 'var(--color-primary)',
    color: '#fff',
    border: 'none',
    padding: '14px',
    borderRadius: 'var(--radius-lg)',
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: '15px',
    cursor: 'pointer',
    boxShadow: 'var(--shadow-sm)',
  },
  variantModalOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 'var(--z-modal)',
  },
  variantModal: {
    backgroundColor: '#fff',
    padding: 'var(--space-lg)',
    borderRadius: 'var(--radius-lg)',
    width: '300px',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-md)',
  },
  variantTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '16px',
    fontWeight: 700,
    margin: 0,
  },
  variantList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  variantOptionBtn: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontWeight: 600,
  },
  variantCancelBtn: {
    marginTop: '8px',
    padding: '8px',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
    fontWeight: 600,
  }
};
