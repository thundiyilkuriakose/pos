// ════════════════════════════════════════════
//  Category Document Schema Definitions
//  File: packages/shared/src/schemas/category.schema.ts
//
//  Firestore Path: outlets/{outletId}/categories/{catId}
// ════════════════════════════════════════════

export interface CategoryDoc {
  name: string;
  icon?: string;
  sort_order: number;
  parent_category_id?: string;    // Self-reference for subcategories
  outlet_id: string;
  is_deleted: boolean;
}
