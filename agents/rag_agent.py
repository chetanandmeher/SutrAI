from rag.search import search


def answer_rag(task: str, k: int = 5) -> dict:
    rows = search(task, k)

    return {
        "task": task,
        "chunks": [
            {
                "chunk_id": row[0],
                "document_name": row[1],
                "text": row[2],
                "metadata": row[3],
                "similarity": float(row[4]),
            }
            for row in rows
        ],
    }    
    