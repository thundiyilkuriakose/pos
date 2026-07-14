// ════════════════════════════════════════════
//  Inventory Document Schema Definitions
//  File: packages/shared/src/schemas/inventory.schema.ts
//
//  Firestore Path: outlets/{outletId}/inventory/{invId}
// ════════════════════════════════════════════

import { Timestamp } from "firebase/firestore";

export interface InventoryDoc {
  name: string;                   // "Coca Cola 300ml Can" or "Basmati Rice 5kg"
  sku?: string;                   // Barcode scan code
  unit: "pcs" | "kg" | "litre" | "ml" | "g";
  current_stock: number;          // Stock count (integer / decimal)
  low_stock_threshold: number;    // Alerts triggered when stock drops below this
  cost_per_unit: number;          // Purchase cost in paise
  supplier_name?: string;
  outlet_id: string;
  updated_at: Timestamp;
  is_deleted: boolean;
}
