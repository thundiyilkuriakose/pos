// ════════════════════════════════════════════
//  Add Party Modal Component
//  File: apps/pos/src/components/queue/AddPartyModal.tsx
// ════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { formatPaiseToRupees } from '@skillsetgo/shared';

interface MenuItem {
  id: string;
  name: string;
  base_price: number;
  item_kind: string;
  variants?: Array<{ name: string; price_override: number }>;
  tax_config?: { tax_group_id: string };
}

interface PreOrderItem {
  line_id: string;
  item_id: string;
  item_name: string;
  item_kind: 'simple' | 'recipe' | 'combo' | 'variant';
  variant_id?: string;
  variant_name?: string;
  quantity: number;
  unit_price: number;
  tax_group_id: string;
  addons: [];
  kot_status: 'pending';
}

interface AddPartyModalProps {
  isOpen: boolean;
  onClose: () => void;
  outletId?: string;
  queueLength: number;
}

export default function AddPartyModal({
  isOpen,
  onClose,
  outletId = 'OUT001',
  queueLength,
}: AddPartyModalProps) {
  const [partyName, setPartyName] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [phone, setPhone] = useState('');

  // Pre-order section states
  const [showPreOrder, setShowPreOrder] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [selectedVariantIdx, setSelectedVariantIdx] = useState<number>(0);
  const [itemSearch, setItemSearch] = useState('');
  const [preOrderCart, setPreOrderCart] = useState<PreOrderItem[]>([]);

  // Feedback states
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchCatalogItems();
    }
  }, [isOpen, outletId]);

  const fetchCatalogItems = async () => {
    try {
      const itemsRef = collection(db, 'outlets', outletId, 'items');
      const q = query(itemsRef, where('is_available', '==', true));
      const snap = await getDocs(q);
      const list: MenuItem[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<MenuItem, 'id'>),
      }));
      setMenuItems(list);
    } catch (err) {
      console.error('Error loading menu for pre-order:', err);
    }
  };

  if (!isOpen) return null;

  const handleAddPreOrderItem = () => {
    if (!selectedItemId) return;
    const item = menuItems.find((m) => m.id === selectedItemId);
    if (!item) return;

    let unitPrice = item.base_price;
    let variantName: string | undefined = undefined;
    let variantId: string | undefined = undefined;

    if (item.item_kind === 'variant_parent' && item.variants?.length) {
      const v = item.variants[selectedVariantIdx] || item.variants[0];
      unitPrice = v.price_override;
      variantName = v.name;
      variantId = `var_${selectedVariantIdx}`;
    }

    const existingIndex = preOrderCart.findIndex(
      (c) => c.item_id === item.id && c.variant_name === variantName
    );

    if (existingIndex >= 0) {
      const updated = [...preOrderCart];
      updated[existingIndex].quantity += 1;
      setPreOrderCart(updated);
    } else {
      const lineItem: PreOrderItem = {
        line_id: `line_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        item_id: item.id,
        item_name: item.name,
        item_kind: item.item_kind === 'variant_parent' ? 'variant' : (item.item_kind as any),
        variant_id: variantId,
        variant_name: variantName,
        quantity: 1,
        unit_price: unitPrice,
        tax_group_id: item.tax_config?.tax_group_id || 'tax_gst_5',
        addons: [],
        kot_status: 'pending',
      };
      setPreOrderCart([...preOrderCart, lineItem]);
    }

    // Reset selectors
    setSelectedItemId('');
  };

  const updateCartQty = (idx: number, delta: number) => {
    const updated = [...preOrderCart];
    const newQty = updated[idx].quantity + delta;
    if (newQty <= 0) {
      setPreOrderCart(updated.filter((_, i) => i !== idx));
    } else {
      updated[idx].quantity = newQty;
      setPreOrderCart(updated);
    }
  };

  const calculatePreOrderTotal = () => {
    return preOrderCart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!partyName.trim()) {
      setErrorMsg('Customer name is required.');
      return;
    }

    setSubmitting(true);

    try {
      const tokenNumber = queueLength + 1;
      const queueToken = `Q-${String(tokenNumber).padStart(3, '0')}`;

      const partyPayload = {
        party_name: partyName.trim(),
        party_size: Number(partySize) || 1,
        phone: phone.trim() || undefined,
        status: 'queued',
        queue_token: queueToken,
        payment_received: false,
        soundbox_triggered: false,
        kot_triggered: false,
        pre_order_items: preOrderCart,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        outlet_id: outletId,
        is_deleted: false,
      };

      const addPromise = addDoc(collection(db, 'outlets', outletId, 'parties'), partyPayload);

      // Optimistically reset state & close modal immediately
      setPartyName('');
      setPartySize(2);
      setPhone('');
      setPreOrderCart([]);
      setShowPreOrder(false);
      setSubmitting(false);
      onClose();

      addPromise.catch((err: any) => {
        console.error('Error adding party to queue:', err);
        setErrorMsg(err.message || 'Failed to add party to queue.');
      });
    } catch (err: any) {
      console.error('Error constructing party payload:', err);
      setErrorMsg(err.message || 'Failed to add party to queue.');
      setSubmitting(false);
    }
  };

  const filteredMenuItems = menuItems.filter((item) =>
    item.name.toLowerCase().includes(itemSearch.toLowerCase())
  );

  return (
    <div style={styles.overlay}>
      <div style={styles.modalCard}>
        <div style={styles.modalHeader}>
          <div>
            <h2 style={styles.modalTitle}>Add Customer to Waitlist</h2>
            <span style={styles.modalSubtitle}>Register guest party &amp; optional pre-orders</span>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {errorMsg && <div style={styles.errorAlert}>{errorMsg}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.row}>
            <div style={{ ...styles.fieldGroup, flex: 2 }}>
              <label style={styles.label}>Customer Name *</label>
              <input
                type="text"
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                placeholder="e.g. Ananya Roy / Table 4 Group"
                style={styles.input}
                required
                autoFocus
              />
            </div>

            <div style={{ ...styles.fieldGroup, flex: 1 }}>
              <label style={styles.label}>Guests / Size *</label>
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
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Mobile Number (Optional)</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              style={styles.input}
            />
          </div>

          {/* Collapsible Pre-Order Section */}
          <div style={styles.collapsibleBox}>
            <button
              type="button"
              onClick={() => setShowPreOrder(!showPreOrder)}
              style={styles.collapsibleHeader}
            >
              <span>🛒 Add Pre-Order Items ({preOrderCart.length})</span>
              <span>{showPreOrder ? '▲ Hide' : '▼ Expand'}</span>
            </button>

            {showPreOrder && (
              <div style={styles.collapsibleContent}>
                <p style={styles.helpText}>
                  Pre-ordered dishes are linked to the party and sent to KOT once seated.
                </p>

                {/* Search & Select Bar */}
                <div style={styles.preOrderSelectors}>
                  <input
                    type="text"
                    placeholder="Search menu catalog..."
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    style={{ ...styles.input, flex: 2 }}
                  />

                  <select
                    value={selectedItemId}
                    onChange={(e) => {
                      setSelectedItemId(e.target.value);
                      setSelectedVariantIdx(0);
                    }}
                    style={{ ...styles.select, flex: 3 }}
                  >
                    <option value="">-- Choose Item to Add --</option>
                    {filteredMenuItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} {item.base_price ? `(${formatPaiseToRupees(item.base_price)})` : ''}
                      </option>
                    ))}
                  </select>

                  {/* If variant parent is selected, show variant selector */}
                  {selectedItemId &&
                    menuItems.find((m) => m.id === selectedItemId)?.item_kind ===
                      'variant_parent' && (
                      <select
                        value={selectedVariantIdx}
                        onChange={(e) => setSelectedVariantIdx(Number(e.target.value))}
                        style={{ ...styles.select, flex: 2 }}
                      >
                        {menuItems
                          .find((m) => m.id === selectedItemId)
                          ?.variants?.map((v, i) => (
                            <option key={i} value={i}>
                              {v.name} ({formatPaiseToRupees(v.price_override)})
                            </option>
                          ))}
                      </select>
                    )}

                  <button
                    type="button"
                    onClick={handleAddPreOrderItem}
                    disabled={!selectedItemId}
                    style={{
                      ...styles.addCartBtn,
                      opacity: selectedItemId ? 1 : 0.5,
                    }}
                  >
                    + Add
                  </button>
                </div>

                {/* Selected Pre-Order Basket */}
                {preOrderCart.length > 0 && (
                  <div style={styles.cartList}>
                    {preOrderCart.map((c, idx) => (
                      <div key={idx} style={styles.cartRow}>
                        <div style={styles.cartItemInfo}>
                          <span style={styles.cartItemName}>{c.item_name}</span>
                          {c.variant_name && (
                            <span style={styles.cartVariant}>({c.variant_name})</span>
                          )}
                          <span style={styles.cartItemPrice}>
                            {formatPaiseToRupees(c.unit_price)}
                          </span>
                        </div>
                        <div style={styles.qtyControls}>
                          <button
                            type="button"
                            onClick={() => updateCartQty(idx, -1)}
                            style={styles.qtyBtn}
                          >
                            -
                          </button>
                          <span style={styles.qtyVal}>{c.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateCartQty(idx, 1)}
                            style={styles.qtyBtn}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                    <div style={styles.cartTotalRow}>
                      <span>Pre-Order Total:</span>
                      <strong>{formatPaiseToRupees(calculatePreOrderTotal())}</strong>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={styles.modalFooter}>
            <button type="button" onClick={onClose} style={styles.cancelBtn}>
              Cancel
            </button>
            <button type="submit" disabled={submitting} style={styles.submitBtn}>
              {submitting ? 'Adding to Waitlist...' : 'Confirm & Add to Queue'}
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
    maxWidth: '540px',
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
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-md)',
  },
  row: {
    display: 'flex',
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
  select: {
    padding: '10px 12px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    fontSize: '13px',
    fontFamily: 'var(--font-body)',
    backgroundColor: '#FFFFFF',
    outline: 'none',
  },
  collapsibleBox: {
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
  },
  collapsibleHeader: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    backgroundColor: 'var(--color-background)',
    border: 'none',
    fontFamily: 'var(--font-display)',
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--color-text)',
    cursor: 'pointer',
  },
  collapsibleContent: {
    padding: 'var(--space-md)',
    borderTop: '1px solid var(--color-border)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-sm)',
  },
  helpText: {
    fontSize: '12px',
    color: 'var(--color-text-muted)',
    margin: 0,
  },
  preOrderSelectors: {
    display: 'flex',
    gap: 'var(--space-xs)',
    flexWrap: 'wrap',
    marginTop: '4px',
  },
  addCartBtn: {
    backgroundColor: 'var(--color-primary)',
    color: '#FFFFFF',
    border: 'none',
    padding: '8px 14px',
    borderRadius: 'var(--radius-md)',
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
  },
  cartList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginTop: 'var(--space-sm)',
    backgroundColor: '#FAF8F5',
    padding: 'var(--space-sm)',
    borderRadius: 'var(--radius-md)',
  },
  cartRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '13px',
  },
  cartItemInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  cartItemName: {
    fontWeight: 600,
  },
  cartVariant: {
    fontSize: '11px',
    color: 'var(--color-text-muted)',
  },
  cartItemPrice: {
    fontSize: '12px',
    color: 'var(--color-primary)',
    fontWeight: 600,
  },
  qtyControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  qtyBtn: {
    width: '24px',
    height: '24px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    backgroundColor: '#FFFFFF',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 700,
    lineHeight: '1',
  },
  qtyVal: {
    fontWeight: 700,
    fontSize: '13px',
  },
  cartTotalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid var(--color-border)',
    paddingTop: '6px',
    marginTop: '4px',
    fontSize: '13px',
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
