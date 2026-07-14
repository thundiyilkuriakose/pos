// ════════════════════════════════════════════
//  Table Document Schema Definitions
//  File: packages/shared/src/schemas/table.schema.ts
//
//  Firestore Path: outlets/{outletId}/tables/{tableId}
// ════════════════════════════════════════════

export interface TableDoc {
  table_number: string;
  section: string;                // E.g., "Ground Floor", "Rooftop"
  capacity: number;
  status: "available" | "occupied" | "reserved" | "blocked";
  current_party_id?: string;      // Ref -> party doc ID
  current_order_id?: string;      // Ref -> order doc ID
  outlet_id: string;
  is_deleted: boolean;
}
