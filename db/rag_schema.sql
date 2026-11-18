CREATE EXTENSION IF NOT EXISTS vector;

DROP TABLE IF EXISTS document_chunks;

CREATE TABLE document_chunks (
    id BIGSERIAL PRIMARY KEY,
    document_name TEXT,
    chunk_text TEXT,
    metadata JSONB,
    embedding VECTOR(384),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_chunks_embedding
    ON document_chunks USING hnsw (embedding vector_cosine_ops);