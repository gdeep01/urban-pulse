-- Urban Pulse Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Cities table
CREATE TABLE IF NOT EXISTS cities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  lat DECIMAL(10, 7) NOT NULL,
  lng DECIMAL(10, 7) NOT NULL,
  country TEXT,
  timezone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for city lookup
CREATE INDEX IF NOT EXISTS idx_cities_name ON cities(name);
CREATE INDEX IF NOT EXISTS idx_cities_location ON cities(lat, lng);

-- Live snapshots table
CREATE TABLE IF NOT EXISTS live_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city_id UUID REFERENCES cities(id) ON DELETE CASCADE,
  traffic_score INTEGER CHECK (traffic_score >= 0 AND traffic_score <= 100),
  weather_score INTEGER CHECK (weather_score >= 0 AND weather_score <= 100),
  raw_traffic_data JSONB,
  raw_weather_data JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_snapshots_city_time ON live_snapshots(city_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_snapshots_timestamp ON live_snapshots(timestamp DESC);

-- City metrics table (for Phase 2)
CREATE TABLE IF NOT EXISTS city_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city_id UUID REFERENCES cities(id) ON DELETE CASCADE,
  traffic_score INTEGER CHECK (traffic_score >= 0 AND traffic_score <= 100),
  weather_score INTEGER CHECK (weather_score >= 0 AND weather_score <= 100),
  sentiment_score INTEGER CHECK (sentiment_score >= 0 AND sentiment_score <= 100),
  pulse_score INTEGER CHECK (pulse_score >= 0 AND pulse_score <= 100),
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_metrics_city_time ON city_metrics(city_id, timestamp DESC);

-- Predictions table (for Phase 4)
CREATE TABLE IF NOT EXISTS predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city_id UUID REFERENCES cities(id) ON DELETE CASCADE,
  predicted_traffic INTEGER CHECK (predicted_traffic >= 0 AND predicted_traffic <= 100),
  confidence_score DECIMAL(3, 2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  future_timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_predictions_city ON predictions(city_id, future_timestamp);

-- Events table (for Phase 5)
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city_id UUID REFERENCES cities(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('accident', 'congestion', 'weather', 'disruption', 'other')),
  severity TEXT NOT NULL CHECK (severity IN ('minor', 'moderate', 'major', 'severe')),
  location_lat DECIMAL(10, 7),
  location_lng DECIMAL(10, 7),
  description TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_events_city_time ON events(city_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_unresolved ON events(city_id) WHERE resolved_at IS NULL;

-- Sentiment logs table (for Phase 2)
CREATE TABLE IF NOT EXISTS sentiment_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city_id UUID REFERENCES cities(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('reddit', 'twitter', 'news')),
  raw_text TEXT,
  sentiment_score INTEGER CHECK (sentiment_score >= 0 AND sentiment_score <= 100),
  sentiment_label TEXT CHECK (sentiment_label IN ('positive', 'neutral', 'negative')),
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sentiment_city_time ON sentiment_logs(city_id, timestamp DESC);

-- Insert some default cities
INSERT INTO cities (name, lat, lng, country, timezone) VALUES
  ('Bangalore', 12.9716, 77.5946, 'India', 'Asia/Kolkata'),
  ('Mumbai', 19.0760, 72.8777, 'India', 'Asia/Kolkata'),
  ('Delhi', 28.6139, 77.2090, 'India', 'Asia/Kolkata'),
  ('Chennai', 13.0827, 80.2707, 'India', 'Asia/Kolkata'),
  ('Hyderabad', 17.3850, 78.4867, 'India', 'Asia/Kolkata')
ON CONFLICT DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE city_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sentiment_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Public read access" ON cities FOR SELECT USING (true);
CREATE POLICY "Public read access" ON live_snapshots FOR SELECT USING (true);
CREATE POLICY "Public read access" ON city_metrics FOR SELECT USING (true);
CREATE POLICY "Public read access" ON predictions FOR SELECT USING (true);
CREATE POLICY "Public read access" ON events FOR SELECT USING (true);

-- Enable Realtime for live_snapshots
ALTER PUBLICATION supabase_realtime ADD TABLE live_snapshots;
ALTER PUBLICATION supabase_realtime ADD TABLE events;
