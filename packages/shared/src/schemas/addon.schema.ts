// ════════════════════════════════════════════
//  Addon Group Document Schema Definitions
//  File: packages/shared/src/schemas/addon.schema.ts
//
//  Firestore Path: outlets/{outletId}/addon_groups/{addonGroupId}
// ════════════════════════════════════════════

export interface AddonGroupDoc {
  name: string;                   // E.g., "Choice of Cheese", "Extra Toppings"
  selection_type: "single" | "multiple";
  is_required: boolean;
  min_selections?: number;
  max_selections?: number;
  addons: AddonItem[];
  outlet_id: string;
  is_deleted: boolean;
}

export interface AddonItem {
  addon_id: string;               // Unique ID within group
  name: string;                   // "Extra Cheddar"
  price: number;                  // In paise
  is_available: boolean;
}
