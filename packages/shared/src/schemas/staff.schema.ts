// ════════════════════════════════════════════
//  Staff Document Schema Definitions
//  File: packages/shared/src/schemas/staff.schema.ts
//
//  Firestore Path: outlets/{outletId}/staff/{staffId}
// ════════════════════════════════════════════

import { Timestamp } from "firebase/firestore";

export interface StaffDoc {
  name: string;
  email?: string;
  phone: string;
  role: "owner" | "manager" | "cashier" | "waiter" | "kitchen";
  pin_hash: string;               // bcrypt hash of numeric PIN code for terminal shift auth
  is_active: boolean;
  permissions: string[];          // E.g. ["billing", "menu_edit", "reports"]
  outlet_ids: string[];           // Outlets this user has access to
  last_login_at?: Timestamp;
  created_at: Timestamp;
  is_deleted: boolean;
}
