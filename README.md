# Regalis Hotel Management

This repository is a React + Vite frontend for a hotel management system backed by Supabase.

## Prerequisites

1. Clone the repository.
2. Navigate to the project directory.
3. Install dependencies:

```bash
npm install
```

4. Create a `.env.local` file with your Supabase credentials:

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Run Locally

Start the frontend:

```bash
npm run dev
```

Open the local URL printed by Vite.

## Build

Create a production build:

```bash
npm run build
```

## Notes

- Auth and data access use Supabase.
- The app is designed to work with the SQL schema defined in `supabase_hotel_schema.sql`.
