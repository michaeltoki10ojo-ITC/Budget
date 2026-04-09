# Budget V2

Cloud-synced budgeting app built with React, Vite, and Supabase. This branch replaces the
original local-only PIN flow with magic-link sign-in, cross-device accounts, a ledger-backed
transaction model, recurring rules, transfers, and a synced wishlist.

## What Changed

- Magic-link email sign-in with Supabase Auth
- Ledger-based account balances derived from transactions
- Transfers between accounts
- Recurring income, expenses, and adjustments
- Monthly summary on the home screen
- Wishlist images and account logos stored in Supabase Storage

## Local Setup

1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env.local`
3. Add your Supabase settings:

```env
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

4. Run the SQL in [`supabase/schema.sql`](./supabase/schema.sql) from the Supabase SQL editor.
5. Start the app:
   `npm run dev`

## Useful Commands

- `npm test`
- `npm run build`

## Notes

- This branch is intended for V2 work and does not modify the production app on `main`.
- The frontend only needs the publishable/anon key. Never expose the Supabase `service_role` key
  in the browser.
