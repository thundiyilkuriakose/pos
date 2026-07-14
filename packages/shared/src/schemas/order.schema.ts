// ════════════════════════════════════════════
//  Order Document Schema Definitions
//  File: packages/shared/src/schemas/order.schema.ts
//
//  Firestore Path: outlets/{outletId}/orders/{orderId}
//  Line items are stored in a subcollection:
//    outlets/{outletId}/orders/{orderId}/line_items/{lineItemId}
//
//  This subcollection approach prevents Last-Write-Wins
//  conflicts when multiple cashiers concurrently add
//  items to the same order from different devices.
// ════════════════════════════════════════════

import { Timestamp } from "firebase/firestore";

export interface OrderDoc {
  order_number: string;           // Device-specific sequential bill number: "SSG-DEV01-00042"
  party_id: string;               // Firestore doc ID within the same outlet's parties collection
  table_id?: string;              // Firestore doc ID within the same outlet's tables collection
  status: "draft" | "confirmed" | "preparing" | "served" | "billed" | "closed" | "cancelled";
  order_type: "dine_in" | "takeaway" | "delivery" | "digital_menu";

  // Note: line items are in subcollection, NOT an embedded array.
  // Use collectionGroup queries or subcollection listeners instead.

  // ─── Financial (all amounts in paise) ───
  subtotal: number;               // Cumulative base price before discounts & tax
  tax_breakdown: TaxSummaryLine[];
  discount?: DiscountLine;
  round_off: number;              // ± paise adjustment for integer billing rounding
  grand_total: number;            // Total payable amount

  // ─── Payments ───
  payments: PaymentLine[];
  payment_status: "unpaid" | "partially_paid" | "paid" | "refunded";

  // ─── Verification & Announce Logs ───
  kot_printed: boolean;
  kot_printed_at?: Timestamp;
  soundbox_played: boolean;
  soundbox_played_at?: Timestamp;

  // ─── Metadata ───
  created_at: Timestamp;
  updated_at: Timestamp;
  created_by: string;             // Staff doc ID
  outlet_id: string;
  is_deleted: boolean;
}

/**
 * Line item stored in the subcollection:
 *   outlets/{outletId}/orders/{orderId}/line_items/{lineItemId}
 *
 * Each line item is its own document. This allows concurrent
 * additions from multiple offline devices to merge cleanly.
 */
export interface OrderLineItem {
  item_id: string;                // Ref -> item doc ID
  item_name: string;              // Denormalized for receipt accuracy
  item_kind: "simple" | "recipe" | "combo" | "variant";
  variant_id?: string;            // Present if item_kind === "variant"
  variant_name?: string;
  quantity: number;
  unit_price: number;             // Base price in paise
  tax_group_id: string;           // Ref -> tax group doc ID
  addons: AddonLineItem[];
  special_instructions?: string;  // Customer notes e.g., "Extra spicy"
  kot_status: "pending" | "sent" | "preparing" | "ready" | "served";
  added_at: Timestamp;            // When this line item was created
  added_by: string;               // Staff doc ID who added this item
}

export interface AddonLineItem {
  addon_id: string;
  name: string;
  price: number;                  // In paise
}

export interface TaxSummaryLine {
  component: "CGST" | "SGST" | "IGST" | "CESS";
  rate: number;                   // Percentage rate (e.g. 2.5, 9)
  amount: number;                 // Calculated tax amount in paise
}

export interface DiscountLine {
  type: "percentage" | "flat";
  value: number;                  // Percent value or flat paise value
  amount: number;                 // Evaluated discount amount in paise
  reason?: string;
}

export interface PaymentLine {
  payment_id: string;             // ULID or Razorpay identifier
  method: "cash" | "upi" | "card" | "razorpay" | "split";
  amount: number;                 // In paise
  razorpay_payment_id?: string;   // Native gateway reference
  timestamp: Timestamp;
}
