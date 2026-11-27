ALTER TABLE order_proposals
  ADD COLUMN IF NOT EXISTS dish_name TEXT,
  ADD COLUMN IF NOT EXISTS restaurant_name TEXT;
