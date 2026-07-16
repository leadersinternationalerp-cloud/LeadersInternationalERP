# Leaders ERP Deployment Guide

This document outlines the steps to deploy the Leaders ERP application and the initial seed accounts available for testing and training.

## Environment Variables

Before deploying, ensure the following environment variables are set in your hosting provider (e.g., Vercel, Netlify):

*   `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL.
*   `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key.
*   `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (keep this secret!).
*   `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`: Configuration for your chosen email SMTP provider.
*   `GEMINI_API_KEY`: API key for Google Gemini 2.5 Flash to enable the AI Quiz Generation feature.
*   `SMS_API_URL`, `SMS_API_USER`, `SMS_API_PASS`: Configuration for a Tanzanian SMS provider (e.g., Beem, NextSMS) once integrated.

See `.env.example` for reference.

## Database Setup

1.  Create a new Supabase project.
2.  Run all SQL migration files located in the `supabase/migrations/` directory against your database in chronological order.
    *   *Note: Ensure `20260712000000_quiz_activities.sql` is executed to enable the AI Quiz features.*
3.  Ensure Row Level Security (RLS) is enabled on all tables and the policies defined in the migrations are applied.
4.  Configure Supabase Storage: Create a bucket named `logos` (or `avatars`) and ensure appropriate public read access and authenticated upload policies are in place.

## Seed Accounts

For training and demonstration purposes, use the following seed accounts. **Change the passwords immediately after first login in a production environment.**

*   **System Admin:** `admin@leaders.ac.tz` (Password: `admin123`)
*   **Director:** `director@leaders.ac.tz` (Password: `dir123`)
*   **Principal:** `principal@leaders.ac.tz` (Password: `prin123`)
*   **Dean:** `dean@leaders.ac.tz` (Password: `dean123`)
*   **Accountant:** `accountant@leaders.ac.tz` (Password: `acc123`)
*   **Teacher:** `teacher1@leaders.ac.tz` (Password: `teach123`)
*   **Student:** `student1@leaders.ac.tz` (Password: `stud123`)
*   **Parent:** `parent1@leaders.ac.tz` (Password: `par123`)

## Deployment (Vercel Example)

1.  Push your code to a GitHub repository.
2.  Import the project into Vercel.
3.  Set the Environment Variables listed above in the Vercel project settings.
4.  Deploy! The GitHub Action (`.github/workflows/main.yml`) will also ensure builds succeed on every push to your main branch.
