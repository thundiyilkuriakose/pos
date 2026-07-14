// ════════════════════════════════════════════
//  Polymorphic Item Creation Form Component
//  File: apps/pos/src/components/menu/PolymorphicItemForm.tsx
// ════════════════════════════════════════════

import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface IngredientRow {
  name: string;
  quantity: number;
  unit: 'g' | 'kg' | 'ml' | 'litre' | 'pcs';
}

interface VariantRow {
  name: string;
  price_rupees: string;
  sku: string;
  current_stock: number;
}

interface PolymorphicItemFormProps {
  outletId?: string;
  onSuccess?: () => void;
}

export default function PolymorphicItemForm({
  outletId = 'OUT001',
  onSuccess,
}: PolymorphicItemFormProps) {
  // Common Fields
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [categoryId, setCategoryId] = useState('cat_mains');
  const [itemKind, setItemKind] = useState<'simple' | 'recipe' | 'variant_parent'>('simple');
  const [basePriceRupees, setBasePriceRupees] = useState('');
  const [isInclusive, setIsInclusive] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);

  // Simple Item Dynamic Fields
  const [sku, setSku] = useState('');
  const [currentStock, setCurrentStock] = useState('50');
  const [stockUnit, setStockUnit] = useState<'pcs' | 'kg' | 'litre' | 'ml' | 'g'>('pcs');
  const [lowStockAlert, setLowStockAlert] = useState('5');

  // Recipe Item Dynamic Fields
  const [ingredients, setIngredients] = useState<IngredientRow[]>([
    { name: '', quantity: 1, unit: 'pcs' },
  ]);

  // Variant Parent Dynamic Fields
  const [variants, setVariants] = useState<VariantRow[]>([
    { name: 'Regular', price_rupees: '', sku: '', current_stock: 50 },
    { name: 'Large', price_rupees: '', sku: '', current_stock: 50 },
  ]);

  // Status state
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Ingredient Helpers
  const addIngredientRow = () => {
    setIngredients([...ingredients, { name: '', quantity: 1, unit: 'pcs' }]);
  };
  const removeIngredientRow = (idx: number) => {
    setIngredients(ingredients.filter((_, i) => i !== idx));
  };
  const updateIngredientRow = (idx: number, field: keyof IngredientRow, val: any) => {
    const updated = [...ingredients];
    updated[idx] = { ...updated[idx], [field]: val };
    setIngredients(updated);
  };

  // Variant Helpers
  const addVariantRow = () => {
    setVariants([...variants, { name: '', price_rupees: '', sku: '', current_stock: 50 }]);
  };
  const removeVariantRow = (idx: number) => {
    setVariants(variants.filter((_, i) => i !== idx));
  };
  const updateVariantRow = (idx: number, field: keyof VariantRow, val: any) => {
    const updated = [...variants];
    updated[idx] = { ...updated[idx], [field]: val };
    setVariants(updated);
  };

  const resetForm = () => {
    setName('');
    setDisplayName('');
    setBasePriceRupees('');
    setSku('');
    setCurrentStock('50');
    setIngredients([{ name: '', quantity: 1, unit: 'pcs' }]);
    setVariants([
      { name: 'Regular', price_rupees: '', sku: '', current_stock: 50 },
      { name: 'Large', price_rupees: '', sku: '', current_stock: 50 },
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!name.trim()) {
      setErrorMsg('Item name is required.');
      return;
    }

    if (itemKind !== 'variant_parent' && (!basePriceRupees || isNaN(Number(basePriceRupees)))) {
      setErrorMsg('Valid base price in Rupees is required.');
      return;
    }

    if (itemKind === 'variant_parent' && variants.length === 0) {
      setErrorMsg('At least one variant must be added.');
      return;
    }

    setSubmitting(true);

    try {
      const basePricePaise =
        itemKind === 'variant_parent' ? 0 : Math.round(parseFloat(basePriceRupees) * 100);

      const itemPayload: Record<string, any> = {
        name: name.trim(),
        display_name: displayName.trim() || name.trim(),
        category_id: categoryId,
        tags: [],
        base_price: basePricePaise,
        tax_config: {
          tax_group_id: 'tax_gst_5',
          is_inclusive: isInclusive,
        },
        is_available: isAvailable,
        available_channels: ['dine_in', 'takeaway', 'delivery', 'digital_menu'],
        outlet_id: outletId,
        item_kind: itemKind,
        addon_group_ids: [],
        sort_order: Date.now(),
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        is_deleted: false,
      };

      if (sku.trim()) {
        itemPayload.sku = sku.trim();
      }

      // Add Kind-Specific Payload Properties
      if (itemKind === 'simple') {
        itemPayload.inventory = {
          track: true,
          unit: stockUnit,
          current_stock: Number(currentStock) || 0,
          low_stock_alert: Number(lowStockAlert) || 5,
        };
      } else if (itemKind === 'recipe') {
        const validIngredients = ingredients
          .filter((ing) => ing.name.trim() !== '')
          .map((ing, idx) => ({
            inventory_item_id: `inv_${Date.now()}_${idx}`,
            name: ing.name.trim(),
            quantity: Number(ing.quantity) || 1,
            unit: ing.unit,
          }));

        itemPayload.recipe = {
          yield_qty: 1,
          yield_unit: 'serving',
          ingredients: validIngredients,
        };
        itemPayload.inventory = {
          track: true,
          unit: 'pcs',
          current_stock: Number(currentStock) || 0,
          low_stock_alert: 5,
        };
      } else if (itemKind === 'variant_parent') {
        itemPayload.variants = variants.map((v, idx) => ({
          variant_id: `var_${Date.now()}_${idx}`,
          name: v.name.trim() || `Variant ${idx + 1}`,
          price_override: Math.round(parseFloat(v.price_rupees || '0') * 100),
          sku: v.sku.trim() || '',
          inventory: {
            track: true,
            unit: 'pcs',
            current_stock: Number(v.current_stock) || 0,
            low_stock_alert: 5,
          },
        }));
      }

      const itemsRef = collection(db, 'outlets', outletId, 'items');
      await addDoc(itemsRef, itemPayload);

      setSuccessMsg(`"${name}" successfully created!`);
      resetForm();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Error creating menu item:', err);
      setErrorMsg(err.message || 'Failed to save menu item.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.formContainer}>
      <div style={styles.header}>
        <h2 style={styles.title}>Create New Item</h2>
        <span style={styles.subtitle}>Add polymorphic products to outlet catalog</span>
      </div>

      {errorMsg && <div style={styles.errorAlert}>{errorMsg}</div>}
      {successMsg && <div style={styles.successAlert}>{successMsg}</div>}

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Item Kind Discriminator */}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Product Architecture (item_kind)</label>
          <select
            value={itemKind}
            onChange={(e: any) => setItemKind(e.target.value)}
            style={styles.select}
          >
            <option value="simple">Simple Item (Packaged / Retail / Direct Count)</option>
            <option value="recipe">Recipe Item (Kitchen Prepared Dish)</option>
            <option value="variant_parent">Variant Parent (Multiple Sizes / Portions)</option>
          </select>
        </div>

        {/* Basic Metadata */}
        <div style={styles.row}>
          <div style={{ ...styles.fieldGroup, flex: 2 }}>
            <label style={styles.label}>Item Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Chicken Biryani / Espresso / Butter Naan"
              style={styles.input}
              required
            />
          </div>

          <div style={{ ...styles.fieldGroup, flex: 1 }}>
            <label style={styles.label}>Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              style={styles.select}
            >
              <option value="cat_mains">Main Course</option>
              <option value="cat_starters">Starters &amp; Snacks</option>
              <option value="cat_beverages">Beverages</option>
              <option value="cat_desserts">Desserts</option>
              <option value="cat_breads">Breads &amp; Rice</option>
            </select>
          </div>
        </div>

        {/* Base Price (Hidden if Variant Parent) */}
        {itemKind !== 'variant_parent' && (
          <div style={styles.row}>
            <div style={{ ...styles.fieldGroup, flex: 1 }}>
              <label style={styles.label}>Base Price (₹ Rupees) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={basePriceRupees}
                onChange={(e) => setBasePriceRupees(e.target.value)}
                placeholder="250.00"
                style={styles.input}
                required
              />
            </div>
            <div style={{ ...styles.fieldGroup, flex: 1, justifyContent: 'center' }}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={isInclusive}
                  onChange={(e) => setIsInclusive(e.target.checked)}
                  style={styles.checkbox}
                />
                Price includes GST tax
              </label>
            </div>
          </div>
        )}

        {/* ─── DYNAMIC FIELDS: SIMPLE ITEM ─── */}
        {itemKind === 'simple' && (
          <div style={styles.dynamicBox}>
            <h4 style={styles.boxTitle}>📦 Simple Inventory Tracking</h4>
            <div style={styles.row}>
              <div style={{ ...styles.fieldGroup, flex: 1 }}>
                <label style={styles.label}>SKU / Barcode</label>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="SKU-88201"
                  style={styles.input}
                />
              </div>
              <div style={{ ...styles.fieldGroup, flex: 1 }}>
                <label style={styles.label}>Current Stock</label>
                <input
                  type="number"
                  value={currentStock}
                  onChange={(e) => setCurrentStock(e.target.value)}
                  style={styles.input}
                />
              </div>
              <div style={{ ...styles.fieldGroup, flex: 1 }}>
                <label style={styles.label}>Unit</label>
                <select
                  value={stockUnit}
                  onChange={(e: any) => setStockUnit(e.target.value)}
                  style={styles.select}
                >
                  <option value="pcs">Pcs</option>
                  <option value="kg">Kg</option>
                  <option value="litre">Litre</option>
                  <option value="g">Grams</option>
                  <option value="ml">ml</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ─── DYNAMIC FIELDS: RECIPE ITEM ─── */}
        {itemKind === 'recipe' && (
          <div style={styles.dynamicBox}>
            <div style={styles.boxHeader}>
              <h4 style={styles.boxTitle}>👨‍🍳 Kitchen Recipe Ingredients</h4>
              <button
                type="button"
                onClick={addIngredientRow}
                style={styles.addBtnSmall}
              >
                + Add Ingredient
              </button>
            </div>
            <p style={styles.boxHelp}>Specify component ingredients for Kitchen KOT routing</p>

            {ingredients.map((ing, idx) => (
              <div key={idx} style={styles.rowInline}>
                <input
                  type="text"
                  placeholder="Ingredient name (e.g. Basmati Rice)"
                  value={ing.name}
                  onChange={(e) => updateIngredientRow(idx, 'name', e.target.value)}
                  style={{ ...styles.input, flex: 3 }}
                />
                <input
                  type="number"
                  placeholder="Qty"
                  value={ing.quantity}
                  onChange={(e) => updateIngredientRow(idx, 'quantity', e.target.value)}
                  style={{ ...styles.input, flex: 1 }}
                />
                <select
                  value={ing.unit}
                  onChange={(e) => updateIngredientRow(idx, 'unit', e.target.value)}
                  style={{ ...styles.select, flex: 1 }}
                >
                  <option value="g">g</option>
                  <option value="kg">kg</option>
                  <option value="ml">ml</option>
                  <option value="litre">litre</option>
                  <option value="pcs">pcs</option>
                </select>
                {ingredients.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeIngredientRow(idx)}
                    style={styles.deleteRowBtn}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ─── DYNAMIC FIELDS: VARIANT PARENT ─── */}
        {itemKind === 'variant_parent' && (
          <div style={styles.dynamicBox}>
            <div style={styles.boxHeader}>
              <h4 style={styles.boxTitle}>🏷️ Product Size Variants</h4>
              <button
                type="button"
                onClick={addVariantRow}
                style={styles.addBtnSmall}
              >
                + Add Variant Row
              </button>
            </div>
            <p style={styles.boxHelp}>
              Base price is derived from selected variant size (e.g., Small, Medium, Large)
            </p>

            {variants.map((variant, idx) => (
              <div key={idx} style={styles.rowInline}>
                <input
                  type="text"
                  placeholder="Variant Portion (e.g. Medium 10&quot;)"
                  value={variant.name}
                  onChange={(e) => updateVariantRow(idx, 'name', e.target.value)}
                  style={{ ...styles.input, flex: 3 }}
                  required
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Price (₹)"
                  value={variant.price_rupees}
                  onChange={(e) => updateVariantRow(idx, 'price_rupees', e.target.value)}
                  style={{ ...styles.input, flex: 2 }}
                  required
                />
                <input
                  type="text"
                  placeholder="SKU"
                  value={variant.sku}
                  onChange={(e) => updateVariantRow(idx, 'sku', e.target.value)}
                  style={{ ...styles.input, flex: 2 }}
                />
                {variants.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeVariantRow(idx)}
                    style={styles.deleteRowBtn}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Submit Action */}
        <button
          type="submit"
          disabled={submitting}
          style={styles.submitButton}
        >
          {submitting ? 'Saving to Firestore...' : 'Create & Save Item'}
        </button>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  formContainer: {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-xl)',
    boxShadow: 'var(--shadow-sm)',
  },
  header: {
    marginBottom: 'var(--space-lg)',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: 'var(--space-md)',
  },
  title: {
    fontSize: '20px',
    fontFamily: 'var(--font-display)',
    color: 'var(--color-primary)',
    fontWeight: 700,
  },
  subtitle: {
    fontSize: '13px',
    color: 'var(--color-text-muted)',
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
    outline: 'none',
    fontFamily: 'var(--font-body)',
  },
  select: {
    padding: '10px 12px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    fontSize: '14px',
    outline: 'none',
    backgroundColor: '#FFFFFF',
    fontFamily: 'var(--font-body)',
  },
  row: {
    display: 'flex',
    gap: 'var(--space-md)',
    alignItems: 'flex-start',
  },
  rowInline: {
    display: 'flex',
    gap: 'var(--space-sm)',
    alignItems: 'center',
    marginBottom: 'var(--space-sm)',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-xs)',
    fontSize: '13px',
    color: 'var(--color-text)',
    cursor: 'pointer',
    marginTop: '20px',
  },
  checkbox: {
    accentColor: 'var(--color-primary)',
    width: '16px',
    height: '16px',
  },
  dynamicBox: {
    backgroundColor: 'var(--color-background)',
    border: '1px dashed var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-md)',
    marginTop: 'var(--space-xs)',
  },
  boxHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },
  boxTitle: {
    fontSize: '14px',
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    color: 'var(--color-text)',
  },
  boxHelp: {
    fontSize: '12px',
    color: 'var(--color-text-muted)',
    marginBottom: 'var(--space-md)',
  },
  addBtnSmall: {
    backgroundColor: 'var(--color-primary-light)',
    color: 'var(--color-primary)',
    border: 'none',
    padding: '4px 10px',
    borderRadius: 'var(--radius-pill)',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'var(--font-display)',
  },
  deleteRowBtn: {
    backgroundColor: 'var(--color-danger-light)',
    color: 'var(--color-danger)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 700,
  },
  submitButton: {
    backgroundColor: 'var(--color-primary)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: '12px 20px',
    fontSize: '15px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    marginTop: 'var(--space-md)',
    boxShadow: 'var(--shadow-sm)',
    transition: 'background var(--transition-fast)',
  },
  errorAlert: {
    backgroundColor: 'var(--color-danger-light)',
    color: 'var(--color-danger)',
    padding: '10px 14px',
    borderRadius: 'var(--radius-md)',
    fontSize: '13px',
    fontWeight: 500,
    marginBottom: 'var(--space-md)',
  },
  successAlert: {
    backgroundColor: 'var(--color-support-1-light)',
    color: 'var(--color-support-1)',
    padding: '10px 14px',
    borderRadius: 'var(--radius-md)',
    fontSize: '13px',
    fontWeight: 600,
    marginBottom: 'var(--space-md)',
  },
};
