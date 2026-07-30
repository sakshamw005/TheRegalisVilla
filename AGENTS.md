# AGENTS.md

## Project Context

This repository is a React + Vite frontend for a hotel management system using Supabase.

Start with `README.md` for local setup and environment variables.

## Key Files

- `src/`: frontend application source.
- `src/api/supabaseClient.js`: Supabase client configuration.
- `src/api/supabaseData.js`: Supabase data access adapter.
- `.env.local`: local-only environment values; never commit secrets.

## Working Notes

- Use `npm install` to install dependencies.
- Use `npm run dev` to start the frontend locally.
- Run `npm run build` to verify production build output.
- The app uses Supabase auth and database tables.
