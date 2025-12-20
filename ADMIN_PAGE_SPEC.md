# Admin Page Specification

**Version:** 1.0  
**Date:** December 19, 2025  
**For:** Portfolio Tracker PWA

---

## Overview

Add an Admin page to the Portfolio Tracker app for managing accounts, watchlists, and performing data cleanup operations. This page is for trusted admin use only (single-user app) with appropriate confirmation dialogs for destructive operations.

---

## Route & Navigation

**Route:** `/admin`

**Navigation:** Add "Admin" link to the Settings dropdown menu in the Header (gear icon), not to the main navigation bar. This keeps it accessible but not prominent.

---

## Page Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Admin                                                        │
│ Database and system management                               │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Database Backup                                          │ │
│ │ Download a backup before making changes                  │ │
│ │ [💾 Download Backup]                    Last: never      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─── Accounts ──────────────────────────────────────────┐   │
│ │                                                        │   │
│ └────────────────────────────────────────────────────────┘   │
│                                                              │
│ ┌─── Watchlists ────────────────────────────────────────┐   │
│ │                                                        │   │
│ └────────────────────────────────────────────────────────┘   │
│                                                              │
│ ┌─── Data Cleanup ──────────────────────────────────────┐   │
│ │                                                        │   │
│ └────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Section 1: Database Backup

**Purpose:** Allow user to download a backup of the SQLite database before making destructive changes.

### UI Components

| Element | Type | Description |
|---------|------|-------------|
| Download Backup | Button (primary) | Downloads `portfolio-backup-YYYY-MM-DD.db` |
| Last backup | Text | Shows timestamp of last download (stored in localStorage) |

### API Endpoint

```
GET /api/admin/backup
Response: Binary file download (application/x-sqlite3)
Filename: portfolio-backup-{timestamp}.db
```

### Implementation Notes

- Server copies the database file and sends it as a download
- Client stores last backup timestamp in localStorage
- Show toast: "Backup downloaded successfully"

---

## Section 2: Accounts Management

**Purpose:** View, edit, and delete brokerage accounts.

### UI Components

**Accounts Table:**

| Column | Description |
|--------|-------------|
| Name | Account name (editable) |
| Broker | Broker name (editable) |
| Suffix | Account number suffix (editable) |
| Positions | Count of positions in this account |
| Actions | Edit / Delete buttons |

**Action Buttons:**
- **+ New Account** - Opens create dialog
- **Edit** (pencil icon) - Opens edit dialog
- **Delete** (trash icon) - Opens delete confirmation

### Create/Edit Account Dialog

```
┌─────────────────────────────────────────┐
│ Create Account              [X]         │
├─────────────────────────────────────────┤
│ Account Name *                          │
│ ┌─────────────────────────────────────┐ │
│ │ Jim's Roth IRA                      │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Broker                                  │
│ ┌─────────────────────────────────────┐ │
│ │ Schwab                              │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Account Suffix (last 4 digits)          │
│ ┌─────────────────────────────────────┐ │
│ │ 1234                                │ │
│ └─────────────────────────────────────┘ │
│                                         │
│              [Cancel]  [Save]           │
└─────────────────────────────────────────┘
```

### Delete Account Confirmation

**Simple confirm for accounts with 0 positions:**
```
┌─────────────────────────────────────────┐
│ Delete Account                  [X]     │
├─────────────────────────────────────────┤
│ Are you sure you want to delete         │
│ "Test Account"?                         │
│                                         │
│ This account has no positions.          │
│                                         │
│              [Cancel]  [Delete]         │
└─────────────────────────────────────────┘
```

**Type-to-confirm for accounts WITH positions:**
```
┌─────────────────────────────────────────┐
│ ⚠️ Delete Account               [X]     │
├─────────────────────────────────────────┤
│ WARNING: This will permanently delete   │
│ "Jim's Roth IRA" and all 18 positions.  │
│                                         │
│ This action cannot be undone.           │
│ Consider downloading a backup first.    │
│                                         │
│ Type DELETE to confirm:                 │
│ ┌─────────────────────────────────────┐ │
│ │                                     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│              [Cancel]  [Delete]         │
│                         (disabled)      │
└─────────────────────────────────────────┘
```

Delete button only enables when user types "DELETE" exactly.

### API Endpoints

```
GET    /api/accounts                    # Existing - list all
POST   /api/accounts                    # Existing - create
PATCH  /api/accounts/:id                # NEW - update account
DELETE /api/accounts/:id                # NEW - delete account (cascades)
```

**PATCH /api/accounts/:id**
```json
Request:
{
  "name": "Updated Name",
  "broker": "Schwab",
  "account_number_suffix": "5678"
}

Response:
{
  "id": 1,
  "name": "Updated Name",
  "broker": "Schwab",
  "account_number_suffix": "5678"
}
```

**DELETE /api/accounts/:id**
```json
Response:
{
  "success": true,
  "deleted": {
    "account": "Jim's Roth IRA",
    "positions": 18
  }
}
```

---

## Section 3: Watchlists Management

**Purpose:** View, edit, and delete watchlists. Remove symbols from watchlists.

### UI Components

**Watchlists Table:**

| Column | Description |
|--------|-------------|
| Name | Watchlist name (editable) |
| Source | seeking_alpha or motley_fool (editable dropdown) |
| Allocation | Dollar allocation (editable) |
| Symbols | Count of active members |
| Actions | Edit / Manage / Delete buttons |

**Action Buttons:**
- **+ New Watchlist** - Opens create dialog
- **Edit** (pencil icon) - Opens edit dialog
- **Manage** (list icon) - Opens symbol management dialog
- **Delete** (trash icon) - Opens delete confirmation

### Create/Edit Watchlist Dialog

```
┌─────────────────────────────────────────┐
│ Create Watchlist                [X]     │
├─────────────────────────────────────────┤
│ Watchlist Name *                        │
│ ┌─────────────────────────────────────┐ │
│ │ Alpha Picks                         │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Source *                                │
│ ┌─────────────────────────────────────┐ │
│ │ Seeking Alpha              ▼        │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Dollar Allocation                       │
│ ┌─────────────────────────────────────┐ │
│ │ $ 15,000                            │ │
│ └─────────────────────────────────────┘ │
│                                         │
│              [Cancel]  [Save]           │
└─────────────────────────────────────────┘
```

### Manage Watchlist Symbols Dialog

```
┌─────────────────────────────────────────────────┐
│ Manage Symbols - Alpha Picks            [X]     │
├─────────────────────────────────────────────────┤
│ 38 symbols in this watchlist                    │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ 🔍 Filter symbols...                        │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ Symbol    Company              Added    [X] │ │
│ │ ──────────────────────────────────────────  │ │
│ │ AAPL      Apple Inc.          Dec 15   [🗑] │ │
│ │ MSFT      Microsoft Corp      Dec 15   [🗑] │ │
│ │ GOOGL     Alphabet Inc.       Dec 15   [🗑] │ │
│ │ ...                                         │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│                              [Done]             │
└─────────────────────────────────────────────────┘
```

Clicking trash icon on a symbol shows simple confirm:
```
Remove AAPL from Alpha Picks?
[Cancel] [Remove]
```

Removing a symbol sets `removed_at` timestamp (soft delete) rather than hard delete, preserving history.

### Delete Watchlist Confirmation

**Simple confirm for watchlists with 0 symbols:**
```
┌─────────────────────────────────────────┐
│ Delete Watchlist                [X]     │
├─────────────────────────────────────────┤
│ Are you sure you want to delete         │
│ "Empty Watchlist"?                      │
│                                         │
│ This watchlist has no symbols.          │
│                                         │
│              [Cancel]  [Delete]         │
└─────────────────────────────────────────┘
```

**Type-to-confirm for watchlists WITH symbols/ratings:**
```
┌─────────────────────────────────────────┐
│ ⚠️ Delete Watchlist             [X]     │
├─────────────────────────────────────────┤
│ WARNING: This will permanently delete   │
│ "Alpha Picks" including:                │
│   • 38 symbol memberships               │
│   • 38 Seeking Alpha ratings            │
│                                         │
│ This action cannot be undone.           │
│ Consider downloading a backup first.    │
│                                         │
│ Type DELETE to confirm:                 │
│ ┌─────────────────────────────────────┐ │
│ │                                     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│              [Cancel]  [Delete]         │
│                         (disabled)      │
└─────────────────────────────────────────┘
```

### API Endpoints

```
GET    /api/watchlists                     # Existing - list all
GET    /api/watchlists/:id                 # Existing - get with members
POST   /api/watchlists                     # Existing - create
PATCH  /api/watchlists/:id                 # Existing - update
DELETE /api/watchlists/:id                 # NEW - delete (cascades)

DELETE /api/watchlists/:id/symbols/:symbol # NEW - remove symbol
```

**DELETE /api/watchlists/:id**
```json
Response:
{
  "success": true,
  "deleted": {
    "watchlist": "Alpha Picks",
    "members": 38,
    "ratings": 38
  }
}
```

**DELETE /api/watchlists/:id/symbols/:symbol**
```json
Response:
{
  "success": true,
  "removed": {
    "symbol": "AAPL",
    "watchlist": "Alpha Picks"
  }
}
```

Implementation: Sets `removed_at = datetime('now')` rather than DELETE.

---

## Section 4: Data Cleanup

**Purpose:** Remove test data, orphan records, and cached data.

### UI Components

**Cleanup Actions Card:**

```
┌─────────────────────────────────────────────────────────────┐
│ Data Cleanup                                                 │
│ Remove test data and optimize database                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Orphan Symbols                                    12 found   │
│ Symbols with no positions and no watchlist membership        │
│                                              [Clean Up]      │
│ ─────────────────────────────────────────────────────────── │
│                                                              │
│ Transactions                                      3 records  │
│ Clear all transaction history                                │
│                                              [Clear All]     │
│ ─────────────────────────────────────────────────────────── │
│                                                              │
│ Quotes Cache                                     45 cached   │
│ Clear cached stock quotes (will re-fetch on demand)          │
│                                              [Clear Cache]   │
│ ─────────────────────────────────────────────────────────── │
│                                                              │
│ Removed Watchlist Members                        5 records   │
│ Permanently delete soft-deleted watchlist members            │
│                                              [Purge]         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Cleanup Confirmations

**Simple confirm for low-risk operations:**
- Clear Quotes Cache
- Purge Removed Watchlist Members

**Type-to-confirm for data deletion:**
- Clean Up Orphan Symbols (if count > 0)
- Clear All Transactions

Example:
```
┌─────────────────────────────────────────┐
│ ⚠️ Clear Transactions           [X]     │
├─────────────────────────────────────────┤
│ This will permanently delete all 3      │
│ transaction records.                    │
│                                         │
│ Type DELETE to confirm:                 │
│ ┌─────────────────────────────────────┐ │
│ │                                     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│              [Cancel]  [Clear All]      │
└─────────────────────────────────────────┘
```

### API Endpoints

```
GET    /api/admin/stats                    # Get cleanup stats
DELETE /api/admin/orphan-symbols           # Delete orphan symbols
DELETE /api/admin/transactions             # Clear all transactions
DELETE /api/admin/quotes-cache             # Clear quotes cache
DELETE /api/admin/purge-removed-members    # Hard delete soft-deleted members
```

**GET /api/admin/stats**
```json
Response:
{
  "orphanSymbols": 12,
  "transactions": 3,
  "quotesCache": 45,
  "removedMembers": 5
}
```

**All DELETE endpoints:**
```json
Response:
{
  "success": true,
  "deleted": <count>
}
```

---

## New API Routes Summary

### Server Routes to Add

**File:** `server/src/routes/admin.ts`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/admin/backup | Download database backup |
| GET | /api/admin/stats | Get cleanup statistics |
| DELETE | /api/admin/orphan-symbols | Delete orphan symbols |
| DELETE | /api/admin/transactions | Clear all transactions |
| DELETE | /api/admin/quotes-cache | Clear quotes cache |
| DELETE | /api/admin/purge-removed-members | Hard delete removed members |

**File:** `server/src/routes/accounts.ts` (add to existing)

| Method | Endpoint | Description |
|--------|----------|-------------|
| PATCH | /api/accounts/:id | Update account |
| DELETE | /api/accounts/:id | Delete account (cascade) |

**File:** `server/src/routes/watchlists.ts` (add to existing)

| Method | Endpoint | Description |
|--------|----------|-------------|
| DELETE | /api/watchlists/:id | Delete watchlist (cascade) |
| DELETE | /api/watchlists/:id/symbols/:symbol | Remove symbol from watchlist |

---

## Client Components to Create

```
client/src/
├── pages/
│   └── Admin.tsx                    # Main admin page
├── components/
│   └── admin/
│       ├── DatabaseBackup.tsx       # Backup download section
│       ├── AccountsManager.tsx      # Accounts table + dialogs
│       ├── WatchlistsManager.tsx    # Watchlists table + dialogs
│       ├── DataCleanup.tsx          # Cleanup actions
│       ├── ConfirmDialog.tsx        # Simple confirm dialog
│       └── TypeConfirmDialog.tsx    # Type-to-confirm dialog
```

---

## Styling Notes

- Use existing shadcn/ui components (Card, Table, Dialog, Button, Input, Select)
- Destructive buttons use `variant="destructive"`
- Warning dialogs use yellow/amber accent for the ⚠️ icon
- Keep consistent with existing dark theme
- Add subtle red background tint to type-to-confirm dialogs

---

## Toast Notifications

| Action | Message |
|--------|---------|
| Backup downloaded | "Backup downloaded successfully" |
| Account created | "Account created" |
| Account updated | "Account updated" |
| Account deleted | "Account and {n} positions deleted" |
| Watchlist created | "Watchlist created" |
| Watchlist updated | "Watchlist updated" |
| Watchlist deleted | "Watchlist and {n} ratings deleted" |
| Symbol removed | "{SYMBOL} removed from {watchlist}" |
| Orphans cleaned | "Deleted {n} orphan symbols" |
| Transactions cleared | "Cleared {n} transactions" |
| Cache cleared | "Quotes cache cleared" |
| Members purged | "Purged {n} removed members" |

---

## Error Handling

- Show toast with error message on API failure
- Disable submit buttons while request is in progress
- Re-fetch data after successful mutations (invalidate React Query cache)

---

## Security Considerations

This is a single-user local app, but still:
- All DELETE operations require confirmation
- Destructive operations on data with children require type-to-confirm
- Backup option is prominently displayed before dangerous sections
- No operation is truly irreversible if user has a backup

---

## Implementation Checklist

### Backend
- [ ] Create `server/src/routes/admin.ts` with backup and cleanup endpoints
- [ ] Add PATCH and DELETE to `server/src/routes/accounts.ts`
- [ ] Add DELETE endpoints to `server/src/routes/watchlists.ts`
- [ ] Create `server/src/services/admin.ts` for cleanup operations
- [ ] Register admin routes in `server/src/index.ts`

### Frontend
- [ ] Create `client/src/pages/Admin.tsx`
- [ ] Create admin components (see component list above)
- [ ] Add `/admin` route to App.tsx
- [ ] Add Admin link to Header settings dropdown
- [ ] Add API methods to `client/src/services/api.ts`
- [ ] Test all operations with confirmations

### Testing
- [ ] Test backup download
- [ ] Test account CRUD with cascade delete
- [ ] Test watchlist CRUD with cascade delete
- [ ] Test symbol removal from watchlist
- [ ] Test all cleanup operations
- [ ] Verify type-to-confirm works correctly
- [ ] Test on iPad

---

*End of specification*
