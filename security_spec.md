# Security Spec

## 1. Data Invariants
- A booking cannot exist without a valid status. All timestamps/strings must conform to reasonable limits to avoid Denial of Wallet.
- Booking status can only be modified by standard users to standard states or cancelled. Admins can update any status.
- Admin records must be placed under an `admins` collection matching the user's uid.

## 2. The "Dirty Dozen" Payloads
- Creating a booking with spoofed ID, unverified email, inject massive strings, setting role fields, or altering locked bookings.

## 3. Test Runner
Included in firestore.rules.test.ts.
