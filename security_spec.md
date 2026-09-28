# Security Specification: RSR Vai Vai Enterprise Cloud Firestore

## 1. Data Invariants
1. **Invoice Integrity**: Invoices must possess valid identifiers, type in `['general', 'processing', 'dokan', 'commercial']`, valid mode (`purchase` or `sales`), non-empty partyName, positive numeric subtotal and grandTotal.
2. **Stock Invariant**: Stock items must have a unique alphanumeric ID, category in `['code', 'android', 'kg', 'pcs_blank']`, valid code, non-negative quantity and positive purchase rate.
3. **Ledger Consistency**: Party records must enforce valid phone, name, and non-null opening balance.
4. **Staff & Attendance Invariant**: Attendance cannot be recorded for an unknown staff without a valid ID. Overtime hours and late minutes must be non-negative numbers.
5. **Voucher Validation**: Petty cash and vehicle expense vouchers must specify valid category, non-negative amounts, and titles not exceeding length boundaries.
6. **Master Deny Catch-All**: Any unspecified collection or rogue root documents are unconditionally blocked.
7. **Identity & Authorization Gate**: The enterprise owner/admin (`vaivaienterprize798@gmail.com`) and verified shop employees authenticate to synchronize state across laptops and devices. Unauthenticated rogue public scripts cannot wipe or pollute company records.
8. **Size & Poisoning Mitigation**: Every string field strictly enforces `.size()` bounds (e.g. `<= 128` for keys, `<= 500` for titles, `<= 1000` for notes) to prevent Denial of Wallet exhaustion.

---

## 2. The "Dirty Dozen" Malicious Payloads

1. **Payload 1 (Rogue Path Injection / ID Poisoning)**: Document path with 2KB junk character ID targeting `/invoices/{2KB_OVERSIZED_STRING}` -> Expected `PERMISSION_DENIED`.
2. **Payload 2 (Unauthenticated Write Attempt)**: Unauthenticated visitor attempting `create` on `/invoices/inv-bad-1` -> Expected `PERMISSION_DENIED`.
3. **Payload 3 (Negative Price Invariant Breach)**: Stock item creation with negative `purchaseRate: -500` or negative `quantity: -100` -> Expected `PERMISSION_DENIED`.
4. **Payload 4 (Ghost Field / Shadow Key Pollution)**: Invoice created with unauthorized ghost fields like `isAdmin: true` or `shadowRoot: true` -> Expected `PERMISSION_DENIED`.
5. **Payload 5 (Oversized Payload / Wallet Exhaustion)**: Party record with 500,000-character description notes -> Expected `PERMISSION_DENIED`.
6. **Payload 6 (Invalid Enum Value)**: Stock item with invalid category `category: "hacked_category"` -> Expected `PERMISSION_DENIED`.
7. **Payload 7 (Invalid Invoice Mode)**: Invoice with `mode: "super_admin_bypass"` -> Expected `PERMISSION_DENIED`.
8. **Payload 8 (Attendance Negative OT Attack)**: Attendance record with `otHours: -10` and `otAmount: -600` -> Expected `PERMISSION_DENIED`.
9. **Payload 9 (Unauthorized Delete of Audit Trail)**: Non-admin or unauthenticated entity calling `delete` on an active invoice -> Expected `PERMISSION_DENIED`.
10. **Payload 10 (Company Profile Hijack)**: Unauthenticated entity attempting to overwrite `/company/main` with fake bank details -> Expected `PERMISSION_DENIED`.
11. **Payload 11 (Arbitrary Collection Write)**: Write to arbitrary collection `/malware/backdoor` -> Expected `PERMISSION_DENIED` by default catch-all.
12. **Payload 12 (Non-String Type Spoofing)**: Submitting array `[1, 2, 3]` in place of `partyName` string -> Expected `PERMISSION_DENIED`.

---

## 3. Test Runner Design (`firestore.rules.test.ts`)
The test suite validates:
- Unauthenticated rejection across all 10 core collections.
- Correct rejection of all 12 malicious payloads.
- Authorized reads and writes for verified enterprise users and admin `vaivaienterprize798@gmail.com`.
- Health check `get` on `/test/{testId}`.
