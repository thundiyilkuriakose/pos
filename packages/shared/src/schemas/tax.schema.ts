// ════════════════════════════════════════════
//  Tax Group Document Schema Definitions
//  File: packages/shared/src/schemas/tax.schema.ts
//
//  Firestore Path: outlets/{outletId}/tax_groups/{taxGroupId}
// ════════════════════════════════════════════

export interface TaxGroupDoc {
  name: string;                   // E.g., "GST 5%", "GST 18%", "Tax Free"
  components: TaxComponent[];
  outlet_id: string;
  is_deleted: boolean;
}

export interface TaxComponent {
  name: "CGST" | "SGST" | "IGST" | "CESS";
  rate: number;                   // Decimal rate representation e.g. 2.5 for 2.5%, 9 for 9%
}
