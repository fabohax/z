-- Table to track encrypted (hashed) IP download counts
CREATE TABLE download_limits (
    id bigserial PRIMARY KEY,
    ip_hash text NOT NULL,
    download_count integer NOT NULL DEFAULT 0,
    last_download_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT unique_ip_hash UNIQUE (ip_hash)
);

-- Index for fast lookup
CREATE INDEX idx_download_limits_ip_hash ON download_limits(ip_hash);