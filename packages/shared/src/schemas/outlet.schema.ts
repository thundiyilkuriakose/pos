// ════════════════════════════════════════════
//  Outlet Document Schema Definitions
//  File: packages/shared/src/schemas/outlet.schema.ts
//
//  Firestore Path: outlets/{outletId}
// ════════════════════════════════════════════

import { Timestamp } from "firebase/firestore";

export interface OutletDoc {
  name: string;
  address: string;
  gstin?: string;
  fssai_number?: string;
  phone: string;
  currency: "INR";
  timezone: "Asia/Kolkata";
  logo_url?: string;
  receipt_header?: string;
  receipt_footer?: string;
  created_at: Timestamp;
}
