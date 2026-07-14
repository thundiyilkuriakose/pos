// ════════════════════════════════════════════
//  Menu Catalog Setup & QR Code Generator
//  File: apps/pos/src/components/settings/MenuCatalogSetup.tsx
// ════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import {
  collection,
  onSnapshot,
  query,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { formatPaiseToRupees } from '@skillsetgo/shared';

interface MenuItem {
  id: string;
  name: string;
  category: string;
  base_price: number; // in paise
  tax_config?: { tax_group_id: string };
  is_available: boolean;
  item_kind: string;
  outlet_id: string;
}

interface MenuCatalogSetupProps {
  outletId?: string;
}

const TAX_GROUPS = [
  { id: 'tax_gst_5', label: 'GST 5% (Food & Beverage standard)' },
  { id: 'tax_gst_18', label: 'GST 18% (Alcohol / Premium service)' },
  { id: 'tax_nil', label: 'Nil / Tax Exempt' },
];

export default function MenuCatalogSetup({ outletId = 'OUT001' }: MenuCatalogSetupProps) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Form Fields
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('');
  const [priceRupees, setPriceRupees] = useState('');
  const [taxGroupId, setTaxGroupId] = useState('tax_gst_5');
  const [isAvailable, setIsAvailable] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // QR Code State
  const digitalMenuUrl = `${window.location.origin}/#/digital-menu/${outletId}`;
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(digitalMenuUrl)}`;

  // Listen to Firestore Items in Real-time
  useEffect(() => {
    const itemsRef = collection(db, 'outlets', outletId, 'items');
    const q = query(itemsRef);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: MenuItem[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<MenuItem, 'id'>),
        }));
        setItems(list);
        setLoading(false);
      },
      (err) => {
        console.error('Error listening to catalog items:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [outletId]);

  const openCreateModal = () => {
    setEditingItem(null);
    setItemName('');
    setCategory('Main Course');
    setPriceRupees('');
    setTaxGroupId('tax_gst_5');
    setIsAvailable(true);
    setIsModalOpen(true);
  };

  const openEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setItemName(item.name);
    setCategory(item.category || 'Uncategorized');
    setPriceRupees((item.base_price / 100).toString());
    setTaxGroupId(item.tax_config?.tax_group_id || 'tax_gst_5');
    setIsAvailable(item.is_available);
    setIsModalOpen(true);
  };

  const [errorMsg, setErrorMsg] = useState('');

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || !priceRupees) return;

    setSubmitting(true);
    setErrorMsg('');
    const priceInPaise = Math.round(parseFloat(priceRupees) * 100);

    try {
      const payload = {
        name: itemName.trim(),
        category: category.trim() || 'Uncategorized',
        base_price: priceInPaise,
        tax_config: { tax_group_id: taxGroupId },
        is_available: isAvailable,
        item_kind: 'simple',
        outlet_id: outletId, // Strict Tenant Isolation
        updated_at: serverTimestamp(),
      };

      let savePromise: Promise<any>;

      if (editingItem) {
        const itemRef = doc(db, 'outlets', outletId, 'items', editingItem.id);
        savePromise = updateDoc(itemRef, payload);
      } else {
        const itemsRef = collection(db, 'outlets', outletId, 'items');
        savePromise = addDoc(itemsRef, {
          ...payload,
          created_at: serverTimestamp(),
        });
      }

      // Optimistically reset form, close modal & unblock UI state
      setItemName('');
      setCategory('Main Course');
      setPriceRupees('');
      setEditingItem(null);
      setIsModalOpen(false);
      setSubmitting(false);

      savePromise.catch((err: any) => {
        console.error('Error saving catalog item:', err);
        setErrorMsg(err.message || 'Failed to save catalog item.');
      });
    } catch (err: any) {
      console.error('Error preparing catalog item save:', err);
      setErrorMsg(err.message || 'Failed to save catalog item.');
      setSubmitting(false);
    }
  };

  // Inline Stock Toggling
  const handleToggleStock = async (item: MenuItem) => {
    try {
      const itemRef = doc(db, 'outlets', outletId, 'items', item.id);
      await updateDoc(itemRef, {
        is_available: !item.is_available,
        updated_at: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error toggling item stock:', err);
    }
  };

  // Download Pure QR Poster Matrix
  const handleDownloadQR = async () => {
    try {
      const response = await fetch(qrApiUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `Digital_Menu_QR_${outletId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Error downloading QR code:', err);
      // Fallback
      window.open(qrApiUrl, '_blank');
    }
  };

  // Group items by category
  const categoriesMap = items.reduce<Record<string, MenuItem[]>>((acc, item) => {
    const cat = item.category || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const categoriesList = Object.keys(categoriesMap).sort();

  return (
    <div style={styles.container}>
      {/* Top Action Bar & Digital Menu QR Card */}
      <div style={styles.topSection}>
        <div style={styles.headerInfo}>
          <h2 style={styles.sectionTitle}>🍔 Menu Master Catalog</h2>
          <span style={styles.sectionSubtitle}>
            Configure your dishes, pricing, tax mappings, and instantaneous stock availability.
          </span>
        </div>

        <button onClick={openCreateModal} style={styles.addItemBtn}>
          + Create New Item
        </button>
      </div>

      {/* Digital Menu Access QR Card */}
      <div style={styles.qrCard}>
        <div style={styles.qrInfoPane}>
          <h3 style={styles.qrCardTitle}>📱 Digital Menu Access (Self-Serve QR)</h3>
          <p style={styles.qrCardSubtitle}>
            Print or download this clean QR matrix poster for table standees. Customers can scan this directly to browse your live menu.
          </p>
          <div style={styles.qrUrlBox}>
            <span style={styles.urlLabel}>Public Menu Link:</span>
            <code style={styles.urlCode}>{digitalMenuUrl}</code>
          </div>
          <button onClick={handleDownloadQR} style={styles.downloadQrBtn}>
            📥 Download QR Matrix Poster
          </button>
        </div>

        <div style={styles.qrPreviewBox}>
          <img
            src={qrApiUrl}
            alt="Pure Functional Digital Menu QR Matrix"
            style={styles.qrImage}
          />
          <span style={styles.qrBadge}>Pristine Matrix Output</span>
        </div>
      </div>

      {/* Catalog Grouped Grid */}
      {loading ? (
        <div style={styles.loadingBox}>Loading catalog items...</div>
      ) : items.length === 0 ? (
        <div style={styles.emptyBox}>
          <p style={{ fontSize: '32px', marginBottom: '8px' }}>🍽️</p>
          <h3 style={styles.emptyTitle}>No menu items configured</h3>
          <p style={styles.emptySubtitle}>
            Click <strong>"+ Create New Item"</strong> to populate your restaurant menu catalog.
          </p>
        </div>
      ) : (
        <div style={styles.categoryStack}>
          {categoriesList.map((catName) => (
            <div key={catName} style={styles.categoryBlock}>
              <div style={styles.categoryBlockHeader}>
                <h3 style={styles.categoryTitle}>{catName}</h3>
                <span style={styles.categoryCountBadge}>
                  {categoriesMap[catName].length} Items
                </span>
              </div>

              <div style={styles.itemsGrid}>
                {categoriesMap[catName].map((item) => (
                  <div key={item.id} style={styles.itemCard}>
                    <div style={styles.itemCardTop}>
                      <span style={styles.itemName}>{item.name}</span>
                      <span style={styles.itemPrice}>
                        {formatPaiseToRupees(item.base_price)}
                      </span>
                    </div>

                    <div style={styles.itemCardMiddle}>
                      <span style={styles.taxTag}>
                        {item.tax_config?.tax_group_id || 'tax_gst_5'}
                      </span>
                    </div>

                    <div style={styles.itemCardFooter}>
                      <label style={styles.stockToggleLabel}>
                        <input
                          type="checkbox"
                          checked={item.is_available}
                          onChange={() => handleToggleStock(item)}
                          style={styles.checkbox}
                        />
                        <span
                          style={{
                            ...styles.stockStatusText,
                            color: item.is_available
                              ? 'var(--color-support-1)'
                              : 'var(--color-danger)',
                          }}
                        >
                          {item.is_available ? 'In Stock' : 'Out of Stock'}
                        </span>
                      </label>

                      <button
                        onClick={() => openEditModal(item)}
                        style={styles.editBtn}
                      >
                        ✏️ Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div style={styles.overlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={styles.closeBtn}
              >
                ✕
              </button>
            </div>

            {errorMsg && <div style={styles.errorAlert}>{errorMsg}</div>}

            <form onSubmit={handleSaveItem} style={styles.form}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Item Name *</label>
                <input
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g. Paneer Butter Masala"
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.row}>
                <div style={{ ...styles.fieldGroup, flex: 1 }}>
                  <label style={styles.label}>Category *</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Main Course, Starters..."
                    style={styles.input}
                    required
                  />
                </div>

                <div style={{ ...styles.fieldGroup, flex: 1 }}>
                  <label style={styles.label}>Base Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={priceRupees}
                    onChange={(e) => setPriceRupees(e.target.value)}
                    placeholder="250.00"
                    style={styles.input}
                    required
                  />
                </div>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Tax Group Mapping *</label>
                <select
                  value={taxGroupId}
                  onChange={(e) => setTaxGroupId(e.target.value)}
                  style={styles.select}
                >
                  {TAX_GROUPS.map((tg) => (
                    <option key={tg.id} value={tg.id}>
                      {tg.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.stockToggleLabelModal}>
                  <input
                    type="checkbox"
                    checked={isAvailable}
                    onChange={(e) => setIsAvailable(e.target.checked)}
                    style={styles.checkbox}
                  />
                  <span>Mark as Available / In Stock</span>
                </label>
              </div>

              <div style={styles.modalFooter}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={styles.cancelBtn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={styles.saveBtn}
                >
                  {submitting ? 'Saving...' : 'Save Catalog Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-xl)',
  },
  topSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  sectionTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '20px',
    fontWeight: 700,
    color: 'var(--color-primary)',
    margin: 0,
  },
  sectionSubtitle: {
    fontSize: '13px',
    color: 'var(--color-text-muted)',
  },
  addItemBtn: {
    backgroundColor: 'var(--color-primary)',
    color: '#FFFFFF',
    border: 'none',
    padding: '10px 20px',
    borderRadius: 'var(--radius-md)',
    fontSize: '14px',
    fontWeight: 700,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    boxShadow: 'var(--shadow-sm)',
  },
  qrCard: {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-xl)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 'var(--space-xl)',
    boxShadow: 'var(--shadow-sm)',
    flexWrap: 'wrap',
  },
  qrInfoPane: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-sm)',
    flex: 1,
    minWidth: '280px',
  },
  qrCardTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '18px',
    fontWeight: 700,
    color: 'var(--color-primary)',
    margin: 0,
  },
  qrCardSubtitle: {
    fontSize: '13px',
    color: 'var(--color-text-muted)',
    lineHeight: 1.4,
  },
  qrUrlBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
    backgroundColor: 'var(--color-background)',
    padding: '8px 12px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
  },
  urlLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--color-text-muted)',
  },
  urlCode: {
    fontSize: '12px',
    fontWeight: 700,
    color: 'var(--color-primary)',
    wordBreak: 'break-all',
  },
  downloadQrBtn: {
    backgroundColor: 'var(--color-support-1)',
    color: '#FFFFFF',
    border: 'none',
    padding: '10px 18px',
    borderRadius: 'var(--radius-md)',
    fontSize: '13px',
    fontWeight: 700,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    width: 'fit-content',
    marginTop: '4px',
  },
  qrPreviewBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#FFFFFF',
    padding: 'var(--space-md)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
  },
  qrImage: {
    width: '130px',
    height: '130px',
    objectFit: 'contain',
  },
  qrBadge: {
    fontSize: '10px',
    fontWeight: 600,
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
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
    backgroundColor: 'var(--color-surface)',
  },
  emptyTitle: {
    fontSize: '18px',
    fontWeight: 700,
    fontFamily: 'var(--font-display)',
    margin: '0 0 4px 0',
  },
  emptySubtitle: {
    fontSize: '14px',
    color: 'var(--color-text-muted)',
  },
  categoryStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-xl)',
  },
  categoryBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-md)',
  },
  categoryBlockHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
    borderBottom: '2px solid var(--color-border)',
    paddingBottom: '6px',
  },
  categoryTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '17px',
    fontWeight: 700,
    color: 'var(--color-text)',
    margin: 0,
  },
  categoryCountBadge: {
    fontSize: '11px',
    fontWeight: 700,
    backgroundColor: 'var(--color-primary-light)',
    color: 'var(--color-primary)',
    padding: '2px 8px',
    borderRadius: 'var(--radius-pill)',
  },
  itemsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: 'var(--space-md)',
  },
  itemCard: {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-md)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-sm)',
    boxShadow: 'var(--shadow-sm)',
  },
  itemCardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemName: {
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: '15px',
    color: 'var(--color-text)',
  },
  itemPrice: {
    fontWeight: 800,
    fontSize: '15px',
    color: 'var(--color-primary)',
  },
  itemCardMiddle: {
    display: 'flex',
    gap: '6px',
  },
  taxTag: {
    fontSize: '11px',
    fontWeight: 600,
    backgroundColor: 'var(--color-background)',
    border: '1px solid var(--color-border)',
    padding: '2px 6px',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text-muted)',
  },
  itemCardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid var(--color-border)',
    paddingTop: '8px',
    marginTop: '4px',
  },
  stockToggleLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer',
  },
  checkbox: {
    cursor: 'pointer',
    width: '16px',
    height: '16px',
  },
  stockStatusText: {
    fontSize: '12px',
    fontWeight: 700,
  },
  editBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--color-primary)',
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    backdropFilter: 'blur(3px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 'var(--z-modal)',
    padding: 'var(--space-md)',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 'var(--radius-xl)',
    width: '100%',
    maxWidth: '460px',
    padding: 'var(--space-xl)',
    boxShadow: 'var(--shadow-lg)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: 'var(--space-md)',
    marginBottom: 'var(--space-lg)',
  },
  modalTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '18px',
    fontWeight: 700,
    color: 'var(--color-primary)',
    margin: 0,
  },
  closeBtn: {
    border: 'none',
    backgroundColor: 'transparent',
    fontSize: '18px',
    cursor: 'pointer',
    color: 'var(--color-text-muted)',
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
  },
  input: {
    padding: '10px 12px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    fontSize: '14px',
    outline: 'none',
  },
  select: {
    padding: '10px 12px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    fontSize: '13px',
    backgroundColor: '#FFFFFF',
    outline: 'none',
  },
  stockToggleLabelModal: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
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
    fontWeight: 600,
    cursor: 'pointer',
  },
  saveBtn: {
    backgroundColor: 'var(--color-primary)',
    color: '#FFFFFF',
    border: 'none',
    padding: '10px 20px',
    borderRadius: 'var(--radius-md)',
    fontSize: '14px',
    fontWeight: 700,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
  },
  errorAlert: {
    backgroundColor: 'var(--color-danger-light, #FFEBEE)',
    color: 'var(--color-danger, #D32F2F)',
    padding: '8px 12px',
    borderRadius: 'var(--radius-md)',
    fontSize: '13px',
    marginBottom: 'var(--space-md)',
  },
};
