-- Run this key in the Supabase SQL Editor to update the existing table.

-- 1. Make height optional
ALTER TABLE measurements ALTER COLUMN height DROP NOT NULL;

-- 2. Make weight optional
ALTER TABLE measurements ALTER COLUMN weight DROP NOT NULL;

-- Verification:
-- You should see 'Is Nullable' change to 'YES' for these columns in the Table Editor.