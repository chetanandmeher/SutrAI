import os
import sys
import time
from dotenv import load_dotenv
from pgvector.psycopg import register_vector
from sentence_transformers import SentenceTransformer

from db.connection import get_conn

load_dotenv()

MODEL_NAME = os.getenv("EMBEDDING_MODEL", "paraphrase-multilingual-MiniLM-L12-v2")
_model = None

QUERY_EXPANSIONS = {
    "damaged": "danificado danificada dano",
    "broken": "quebrado quebrada quebrar",
    "defective": "defeito defeituoso defeituosa",
    "missing item": "item faltando produto faltando",
    "never delivered": "pedido nao entregue pedido nao recebido",
    "late delivery": "entrega atrasada atraso entrega",
    "late deliveries": "entrega atrasada atraso entrega",
    "refund": "reembolso reembolsar",
    "cancellation": "cancelamento cancelar pedido",
    "seller communication": (
        "atendimento ruim OR pessimo atendimento OR sem resposta "
        "OR nao responde OR sem canal de reclamacao "
        "OR falta de atendimento"
    ),
    "customer support": (
        "atendimento ruim OR pessimo atendimento OR sem resposta "
        "OR nao responde OR sem canal de reclamacao "
        "OR falta de atendimento"
    ),
    "delivery service": "transportadora correios entrega",
}

def _get_model():
    global _model
    if _model is None:
        _model = SentenceTransformer(MODEL_NAME)
    return _model



def search(query: str, k: int = 5):
    vec = _get_model().encode(query, normalize_embeddings=True)

    with get_conn() as conn:
        register_vector(conn)

        return conn.execute(
            """
            SELECT
                id,
                document_name,
                chunk_text,
                metadata,
                1 - (embedding <=> %s) AS similarity
            FROM document_chunks
            ORDER BY embedding <=> %s
            LIMIT %s
            """,
            (vec, vec, k),
        ).fetchall()



def hybrid_search(
    query: str,
    k: int = 5,
    candidate_k: int = 20,
    rrf_constant: int = 60,
):
    vec = _get_model().encode(query, normalize_embeddings=True)

    expanded_query = expand_query(query)

    with get_conn() as conn:
        register_vector(conn)

        rows = conn.execute(
            """
            WITH vector_results AS (
                SELECT
                    id,
                    ROW_NUMBER() OVER (
                        ORDER BY embedding <=> %(vec)s
                    ) AS rank
                FROM document_chunks
                ORDER BY embedding <=> %(vec)s
                LIMIT %(candidate_k)s
            ),
            text_results AS (
                SELECT
                    id,
                    ROW_NUMBER() OVER (
                        ORDER BY ts_rank_cd(
                            search_vector,
                            websearch_to_tsquery('portuguese', %(expanded_query)s)
                        ) DESC
                    ) AS rank
                FROM document_chunks
                WHERE search_vector @@
                    websearch_to_tsquery('portuguese', %(expanded_query)s)
                ORDER BY ts_rank_cd(
                    search_vector,
                    websearch_to_tsquery('portuguese', %(expanded_query)s)
                ) DESC
                LIMIT %(candidate_k)s
            ),
            fused_results AS (
                SELECT
                    id,
                    SUM(score) AS rrf_score
                FROM (
                    SELECT
                        id,
                        1.0 / (%(rrf_constant)s + rank) AS score
                    FROM vector_results

                    UNION ALL

                    SELECT
                        id,
                        1.0 / (%(rrf_constant)s + rank) AS score
                    FROM text_results
                ) combined
                GROUP BY id
            )
            SELECT
                d.id,
                d.document_name,
                d.chunk_text,
                d.metadata,
                f.rrf_score
            FROM fused_results f
            JOIN document_chunks d ON d.id = f.id
            ORDER BY f.rrf_score DESC
            LIMIT %(k)s
            """,
            {
                "vec": vec,
                "query": query,
                "candidate_k": candidate_k,
                "rrf_constant": rrf_constant,
                "k": k,
                "expanded_query": expanded_query,
            },
        ).fetchall()

    return rows


def expand_query(query: str) -> str:
    query_lower = query.lower()
    expanded_terms = []

    for phrase, translation in QUERY_EXPANSIONS.items():
        if phrase in query_lower:
            if " OR " in translation:
                expanded_terms.append(f"({translation})")
            else:
                expanded_terms.extend(translation.split()) 

    if not expanded_terms:
        return query

    return " OR ".join(dict.fromkeys(expanded_terms))




# if __name__ == "__main__":
#     query = " ".join(sys.argv[1:]) or "produto chegou quebrado"

#     for chunk_id, document_name, text, metadata, similarity in search(query):
#         print(
#             f"ID: {chunk_id} | "
#             f"Similarity: {similarity:.3f} | "
#             f"Metadata: {metadata} | "
#             f"Review: {text[:110]}"
#         )

if __name__ == "__main__":
    query = " ".join(sys.argv[1:]) or "produto chegou quebrado"

    start = time.perf_counter()
    model = _get_model()
    model_load_time = time.perf_counter() - start

    start = time.perf_counter()
    results = search(query)
    search_time = time.perf_counter() - start

    print(f"\nModel loading: {model_load_time:.2f}s")
    print(f"Search (including encoding + DB): {search_time:.2f}s")

    for chunk_id, document_name, text, metadata, similarity in results:
        print(f"{similarity:.3f} | ID: {chunk_id} | {text[:100]}")