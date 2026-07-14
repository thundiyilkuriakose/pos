// ════════════════════════════════════════════
//  Party Document Schema Definitions
//  File: packages/shared/src/schemas/party.schema.ts
//
//  Firestore Path: outlets/{outletId}/parties/{partyId}
//
//  The party document acts as the Soundbox State Machine anchor.
//  When payment_received === true AND status === "seated",
//  the Capacitor Android app triggers the native TTS engine.
// ════════════════════════════════════════════

import { Timestamp } from "firebase/firestore";
import { OrderLineItem } from "./order.schema.ts";

export interface PartyDoc {
  party_name: string;             // Customer name or identifier (e.g. "Table 5 Party")
  party_size: number;
  phone?: string;                 // Customer mobile for billing SMS/Loyalty/OTP
  status: "queued" | "seated" | "billing" | "closed";
  table_id?: string;              // Ref -> table doc ID (assigned on seating)

  // ─── Conditional Soundbox Trigger State ───
  payment_received: boolean;      // True once Razorpay webhook flags transaction success
  payment_id?: string;            // Razorpay payment ID
  payment_amount?: number;        // In paise
  payment_method?: string;        // E.g. "upi", "card"
  seated_at?: Timestamp;
  soundbox_triggered: boolean;    // Ensures announcement is only run ONCE (guard flag)
  kot_triggered: boolean;         // Prevents printing duplicate pre-order KOTs

  // ─── Digital Menu Pre-Order ───
  pre_order_items: OrderLineItem[]; // Pre-seated cart items generated via digital menu

  queue_token?: string;           // Queue token representation e.g., "Q-007"
  order_id?: string;              // Ref -> order doc ID generated on Seating transition

  // ─── Metadata ───
  created_at: Timestamp;
  updated_at: Timestamp;
  outlet_id: string;
  is_deleted: boolean;
}
