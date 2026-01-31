-- WDW Diabetes Guide — Supabase Schema
-- Run this in the Supabase SQL editor to create the tables.

-- Parks table
CREATE TABLE parks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  subtitle TEXT,
  lands TEXT[] NOT NULL DEFAULT '{}'
);

-- Menu items table
CREATE TABLE menu_items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  park_id TEXT NOT NULL REFERENCES parks(id) ON DELETE CASCADE,
  land TEXT NOT NULL,
  restaurant TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  calories INTEGER NOT NULL DEFAULT 0,
  carbs INTEGER NOT NULL DEFAULT 0,
  fat INTEGER NOT NULL DEFAULT 0,
  type TEXT NOT NULL DEFAULT 'food' CHECK (type IN ('food', 'drink')),
  vegetarian BOOLEAN NOT NULL DEFAULT FALSE,
  is_fried BOOLEAN NOT NULL DEFAULT FALSE
);

-- Indexes for common queries
CREATE INDEX idx_menu_items_park_id ON menu_items(park_id);
CREATE INDEX idx_menu_items_land ON menu_items(land);
CREATE INDEX idx_menu_items_restaurant ON menu_items(restaurant);
CREATE INDEX idx_menu_items_carbs ON menu_items(carbs);

-- Row Level Security: allow public read access
ALTER TABLE parks ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for parks"
  ON parks FOR SELECT
  USING (true);

CREATE POLICY "Public read access for menu_items"
  ON menu_items FOR SELECT
  USING (true);
