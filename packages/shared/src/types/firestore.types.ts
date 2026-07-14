// ════════════════════════════════════════════
//  Firestore Type Definitions
//  File: packages/shared/src/types/firestore.types.ts
//
//  Base types for the Firebase-native data model.
//  All documents use Firestore auto-generated IDs;
//  document paths encode the hierarchy instead of
//  the old PouchDB `_id` prefix scheme.
//
//  Collection Hierarchy:
//    outlets/{outletId}
//    outlets/{outletId}/items/{itemId}
//    outlets/{outletId}/categories/{catId}
//    outlets/{outletId}/tables/{tableId}
//    outlets/{outletId}/parties/{partyId}
//    outlets/{outletId}/orders/{orderId}
//    outlets/{outletId}/orders/{orderId}/line_items/{lineItemId}
//    outlets/{outletId}/staff/{staffId}
//    outlets/{outletId}/devices/{deviceId}
//    outlets/{outletId}/tax_groups/{taxGroupId}
//    outlets/{outletId}/addon_groups/{addonGroupId}
//    outlets/{outletId}/inventory/{invId}
// ════════════════════════════════════════════

import { Timestamp } from "firebase/firestore";

/**
 * Base metadata present on every Firestore document.
 * Documents no longer carry PouchDB's `_id` or `_rev` —
 * the document path itself encodes identity.
 */
export interface FirestoreDocBase {
  created_at: Timestamp;
  updated_at: Timestamp;
  is_deleted: boolean;
}

/**
 * Lightweight reference to a Firestore document path.
 * Used when storing cross-collection references.
 */
export type FirestoreRef = string; // e.g. "outlets/OUT001/items/abc123"

/**
 * Discriminated collection names used as type guards
 * throughout the Firestore layer.
 */
export const COLLECTION_NAMES = {
  OUTLETS: "outlets",
  ITEMS: "items",
  CATEGORIES: "categories",
  TABLES: "tables",
  PARTIES: "parties",
  ORDERS: "orders",
  LINE_ITEMS: "line_items",
  STAFF: "staff",
  DEVICES: "devices",
  TAX_GROUPS: "tax_groups",
  ADDON_GROUPS: "addon_groups",
  INVENTORY: "inventory",
} as const;

export type CollectionName = (typeof COLLECTION_NAMES)[keyof typeof COLLECTION_NAMES];

/**
 * Cache retention policy for offline persistence.
 * Only documents matching these criteria are retained
 * in the local IndexedDB cache.
 *
 * Strategy (per user requirement):
 *  - Active documents: status !== "closed"
 *  - Recent receipts: finalized within the last 48 hours
 */
export interface CacheRetentionPolicy {
  /** Keep documents where status is NOT in this list */
  excludeStatuses: string[];
  /** Keep closed documents younger than this (in hours) */
  retentionWindowHours: number;
}

export const DEFAULT_CACHE_POLICY: CacheRetentionPolicy = {
  excludeStatuses: ["closed"],
  retentionWindowHours: 48,
};
