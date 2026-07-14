// ════════════════════════════════════════════
//  Polymorphic Item Schema Definitions
//  File: packages/shared/src/schemas/item.schema.ts
//
//  Firestore Path: outlets/{outletId}/items/{itemId}
// ════════════════════════════════════════════

import { Timestamp } from "firebase/firestore";

export interface BaseItem {
  // ─── Identity ───
  name: string;                   // "Chicken Biryani"
  display_name?: string;          // Override for customer-facing digital menu
  sku?: string;                   // Barcode/SKU scan code
  category_id: string;            // Ref -> category doc ID
  tags: string[];                 // ["bestseller", "spicy", "veg"]

  // ─── Pricing (all amounts in paise) ───
  base_price: number;             // ₹250 = 25000 paise
  tax_config: {
    tax_group_id: string;         // Ref -> tax group doc ID
    is_inclusive: boolean;        // Price includes tax?
  };

  // ─── Availability ───
  is_available: boolean;
  available_channels: ("dine_in" | "takeaway" | "delivery" | "digital_menu")[];
  outlet_id: string;

  // ─── Polymorphic Discriminator ───
  item_kind: "simple" | "recipe" | "combo" | "variant_parent";

  // ─── Add-on Groups ───
  addon_group_ids: string[];      // Ref -> addon group doc IDs

  // ─── Metadata ───
  sort_order: number;
  image_url?: string;
  created_at: Timestamp;
  updated_at: Timestamp;
  is_deleted: boolean;            // Soft delete for sync reconciliation
}

// ──── SIMPLE ITEM (retail/beverages/packaged goods) ────
export interface SimpleItem extends BaseItem {
  item_kind: "simple";
  inventory: {
    track: boolean;
    unit: "pcs" | "kg" | "litre" | "ml" | "g";
    current_stock: number;
    low_stock_alert: number;
  };
}

// ──── RECIPE ITEM (kitchen-prepared dishes) ────
export interface RecipeItem extends BaseItem {
  item_kind: "recipe";
  recipe: {
    yield_qty: number;
    yield_unit: string;
    ingredients: RecipeIngredient[];
    prep_time_minutes?: number;
    instructions?: string;
  };
  inventory: {
    track: boolean;
    unit: "pcs";
    current_stock: number;
    low_stock_alert: number;
  };
}

export interface RecipeIngredient {
  inventory_item_id: string;     // Ref -> inventory doc ID
  name: string;                  // Denormalized for offline rendering
  quantity: number;
  unit: "g" | "kg" | "ml" | "litre" | "pcs";
  waste_percentage?: number;
}

// ──── COMBO ITEM ────
export interface ComboItem extends BaseItem {
  item_kind: "combo";
  combo: {
    components: {
      item_id: string;
      item_name: string;
      quantity: number;
      is_optional: boolean;
    }[];
    combo_discount: number;       // Discount in paise
  };
}

// ──── VARIANT PARENT (e.g. Pizza -> Small, Medium, Large) ────
export interface VariantParentItem extends BaseItem {
  item_kind: "variant_parent";
  variants: ItemVariant[];
}

export interface ItemVariant {
  variant_id: string;
  name: string;
  price_override: number;
  sku?: string;
  inventory: {
    track: boolean;
    unit: "pcs" | "kg" | "litre" | "ml" | "g";
    current_stock: number;
    low_stock_alert: number;
  };
}

// ──── DISCRIMINATED UNION ────
export type PolymorphicItem = SimpleItem | RecipeItem | ComboItem | VariantParentItem;
