CREATE UNIQUE INDEX IF NOT EXISTS idx_progress_item_unique
ON progress (item_type, item_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_review_schedule_item_unique
ON review_schedule (item_type, item_id);

CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at
ON user_sessions (expires_at);

CREATE INDEX IF NOT EXISTS idx_user_progress_user_id
ON user_progress (user_id);

CREATE INDEX IF NOT EXISTS idx_user_review_schedule_user_id
ON user_review_schedule (user_id);
