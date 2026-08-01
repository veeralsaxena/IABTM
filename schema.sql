-- ============================================
-- 1. ENABLE EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS vector;          -- pgvector for embeddings
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";     -- UUID generation

-- ============================================
-- 2. USER IDENTITY LAYER
-- ============================================

-- Core user profile (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  journal_entry TEXT,                              -- The unstructured "brain dump"
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User's selected attributes (Me + I Am)
CREATE TABLE user_attributes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  attribute_name TEXT NOT NULL,                    -- e.g., "Procrastination"
  attribute_type TEXT CHECK (attribute_type IN ('current', 'aspirational')),
  is_custom BOOLEAN DEFAULT FALSE,                
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, attribute_name, attribute_type)
);

-- The AI-generated psychological profile
CREATE TABLE identity_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  root_cause TEXT NOT NULL,
  core_tension TEXT NOT NULL,
  emotional_themes TEXT[] NOT NULL,
  readiness_level TEXT CHECK (readiness_level IN ('low', 'medium', 'high')),
  raw_text TEXT NOT NULL,                          -- The concatenated input used by Groq
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ⭐ User Identity Embedding (THE KEY INNOVATION)
-- The mathematical fingerprint of the user's struggle
CREATE TABLE user_vectors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  identity_text TEXT NOT NULL,                     -- The specific text block that was embedded
  embedding VECTOR(768) NOT NULL,                  -- 768-dim vector (Gemini format)
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast similarity search
CREATE INDEX ON user_vectors USING hnsw (embedding vector_cosine_ops);

-- ============================================
-- 3. KNOWLEDGE BASE (Methods)
-- ============================================

-- Pre-defined psychological frameworks
CREATE TABLE method_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,                       -- e.g., "The 2-Minute Rule"
  description TEXT NOT NULL,
  difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 10),
  best_for_attributes TEXT[],
  
  -- ⭐ Method embedding for semantic matching
  method_embedding VECTOR(768) NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON method_definitions USING hnsw (method_embedding vector_cosine_ops);

-- ============================================
-- 4. PATH LAYER
-- ============================================

-- The assigned path for a user
CREATE TABLE paths (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  method_id UUID REFERENCES method_definitions(id),
  path_name TEXT NOT NULL,                         -- "Procrastination to Action-oriented"
  from_attributes TEXT[] NOT NULL,                 
  to_attributes TEXT[] NOT NULL,                   
  ai_explanation TEXT NOT NULL,                    -- Empathetic explanation of WHY this method
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. CONTENT & CURATION LAYER
-- ============================================

-- Content discovered and validated by the agent
CREATE TABLE curated_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  path_id UUID REFERENCES paths(id) ON DELETE CASCADE,
  category TEXT CHECK (category IN ('film', 'music', 'art', 'animation', 'editorial', 'print')),
  title TEXT NOT NULL,
  creator TEXT,                                    
  source_url TEXT NOT NULL,                        
  curators_note TEXT NOT NULL,                     -- Agent's explanation of fit
  journey_stage TEXT CHECK (journey_stage IN 
    ('resistance', 'curiosity', 'small_wins', 'momentum', 'identity_shift')),
  
  -- Multi-dimensional scoring
  score_relevance INTEGER CHECK (score_relevance BETWEEN 1 AND 10),
  score_quality INTEGER CHECK (score_quality BETWEEN 1 AND 10),
  score_accessibility INTEGER CHECK (score_accessibility BETWEEN 1 AND 10),
  score_emotional_fit INTEGER CHECK (score_emotional_fit BETWEEN 1 AND 10),
  score_diversity INTEGER CHECK (score_diversity BETWEEN 1 AND 10),
  composite_score FLOAT GENERATED ALWAYS AS (
    (score_relevance * 3 + score_quality * 2 + score_accessibility * 2 
     + score_emotional_fit * 2 + score_diversity * 1) / 10.0
  ) STORED,
  
  -- ⭐ Content embedding for semantic matching
  content_embedding VECTOR(768) NOT NULL,          
  
  sort_order INTEGER,
  is_viewed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for content similarity search
CREATE INDEX ON curated_media USING hnsw (content_embedding vector_cosine_ops);

-- ============================================
-- 6. RPC MATCHING FUNCTION
-- ============================================

-- A function to do the hybrid ranking inside the database securely
CREATE OR REPLACE FUNCTION get_personalized_media(
  p_user_id UUID,
  p_category TEXT,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  media_id UUID,
  title TEXT,
  source_url TEXT,
  curators_note TEXT,
  similarity FLOAT,
  final_score FLOAT
) 
LANGUAGE plpgsql AS $$
DECLARE
  v_user_embedding VECTOR(768);
BEGIN
  -- Get the user's vector
  SELECT embedding INTO v_user_embedding 
  FROM user_vectors 
  WHERE user_id = p_user_id;

  RETURN QUERY
  SELECT 
    cm.id,
    cm.title,
    cm.source_url,
    cm.curators_note,
    1 - (cm.content_embedding <=> v_user_embedding) AS similarity,
    -- Formula: 50% vector match + 50% AI quality score
    ((1 - (cm.content_embedding <=> v_user_embedding)) * 0.5) + (cm.composite_score * 0.1 * 0.5) AS final_score
  FROM curated_media cm
  JOIN paths p ON cm.path_id = p.id
  WHERE p.user_id = p_user_id 
    AND cm.category = p_category
  ORDER BY final_score DESC
  LIMIT match_count;
END;
$$;
