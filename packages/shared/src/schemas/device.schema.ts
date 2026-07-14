// ════════════════════════════════════════════
//  Device Document Schema Definitions
//  File: packages/shared/src/schemas/device.schema.ts
//
//  Firestore Path: outlets/{outletId}/devices/{deviceId}
// ════════════════════════════════════════════

import { Timestamp } from "firebase/firestore";

export interface DeviceDoc {
  device_name: string;
  device_code: string;            // Short identifier e.g. "DEV01" for bill prefixes
  outlet_id: string;
  bill_counter: number;           // Monotonically increasing sequential number for billing
  kot_counter: number;            // Counter for kitchen tickets
  registered_at: Timestamp;
  last_sync_at?: Timestamp;
}
