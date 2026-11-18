import os

from dotenv import load_dotenv
from pgvector.psycopg import register_vector
from psycopg.types.json import Jsonb
from sentence_transformers import SentenceTransformer

from db.connection import get_conn

load_dotenv()

MODEL_NAME = os.getenv("EMBEDDING_MODEL", "paraphrase-multilingual-MiniLM-L12-v2")
LIMIT = 5000
BATCH_SIZE = 64


def main():
    model = SentenceTransformer(MODEL_NAME)

    with get_conn() as conn:
        register_vector(conn)

        rows = conn.execute(
            """
            SELECT review_id, order_id, review_score, review_comment_message
            FROM order_reviews
            WHERE review_comment_message IS NOT NULL
              AND length(review_comment_message) > 20
            ORDER BY review_id
            LIMIT %s
            """,
            (LIMIT,),
        ).fetchall()
        print(f"fetched {len(rows)} reviews")

        texts = [r[3] for r in rows]
        embeddings = model.encode(
            texts,
            batch_size=BATCH_SIZE,
            normalize_embeddings=True,
            show_progress_bar=True,
        )

        conn.execute("TRUNCATE document_chunks")
        with conn.cursor() as cur:
            cur.executemany(
                """
                INSERT INTO document_chunks
                    (document_name, chunk_text, metadata, embedding)
                VALUES (%s, %s, %s, %s)
                """,
                [
                    (
                        "olist_reviews",
                        r[3],
                        Jsonb(
                            {
                                "review_id": r[0],
                                "order_id": r[1],
                                "review_score": r[2],
                            }
                        ),
                        emb,
                    )
                    for r, emb in zip(rows, embeddings)
                ],
            )

        count = conn.execute("SELECT COUNT(*) FROM document_chunks").fetchone()[0]
        print(f"stored {count} chunks")


if __name__ == "__main__":
    main()
    