-- Migration: Add Feedback System with Token-based Security
-- Created: 2024-12-09
-- Description: Creates tables for feedback management system with secure token-based access

-- Create feedback_tokens table
CREATE TABLE IF NOT EXISTS feedback_tokens (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    used INTEGER DEFAULT 0,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    CONSTRAINT fk_feedback_tokens_order 
        FOREIGN KEY (order_id) 
        REFERENCES orders(id) 
        ON DELETE CASCADE
);

-- Create feedbacks table
CREATE TABLE IF NOT EXISTS feedbacks (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    product_quality INTEGER CHECK (product_quality IS NULL OR (product_quality >= 1 AND product_quality <= 5)),
    delivery_experience INTEGER CHECK (delivery_experience IS NULL OR (delivery_experience >= 1 AND delivery_experience <= 5)),
    customer_service INTEGER CHECK (customer_service IS NULL OR (customer_service >= 1 AND customer_service <= 5)),
    is_public INTEGER DEFAULT 1,
    response_text TEXT,
    responded_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    CONSTRAINT fk_feedbacks_order 
        FOREIGN KEY (order_id) 
        REFERENCES orders(id) 
        ON DELETE CASCADE,
    CONSTRAINT unique_order_feedback 
        UNIQUE (order_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_feedback_tokens_order_id ON feedback_tokens(order_id);
CREATE INDEX IF NOT EXISTS idx_feedback_tokens_token ON feedback_tokens(token);
CREATE INDEX IF NOT EXISTS idx_feedback_tokens_used_expires ON feedback_tokens(used, expires_at);
CREATE INDEX IF NOT EXISTS idx_feedbacks_order_id ON feedbacks(order_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_rating ON feedbacks(rating);
CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON feedbacks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedbacks_is_public ON feedbacks(is_public);

-- Add comments for documentation
COMMENT ON TABLE feedback_tokens IS 'Secure tokens for feedback submission links with expiration';
COMMENT ON TABLE feedbacks IS 'Customer feedback on completed orders with multi-dimensional ratings';
COMMENT ON COLUMN feedback_tokens.token IS 'Cryptographically secure random token (64 char hex)';
COMMENT ON COLUMN feedback_tokens.used IS '0 = unused, 1 = used (one-time use)';
COMMENT ON COLUMN feedback_tokens.expires_at IS 'Token expiration timestamp (default 30 days)';
COMMENT ON COLUMN feedbacks.rating IS 'Overall rating (1-5 stars, required)';
COMMENT ON COLUMN feedbacks.product_quality IS 'Product quality rating (1-5 stars, optional)';
COMMENT ON COLUMN feedbacks.delivery_experience IS 'Delivery experience rating (1-5 stars, optional)';
COMMENT ON COLUMN feedbacks.customer_service IS 'Customer service rating (1-5 stars, optional)';
COMMENT ON COLUMN feedbacks.is_public IS '1 = public (visible to customers), 0 = private';
COMMENT ON COLUMN feedbacks.response_text IS 'Manager response to customer feedback';
