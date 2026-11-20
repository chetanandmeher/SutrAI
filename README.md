# SutrAI

**An AI analyst for e-commerce operations.**

SutrAI lets users ask business questions about e-commerce data in natural language. It combines LLM-based planning, SQL analytics, semantic retrieval over customer reviews, and evidence-based answer synthesis in one Python backend.

Instead of treating every question as a generic chatbot prompt, SutrAI routes work to the data source suited to the question:
- **SQL** for structured metrics such as order counts, revenue, delivery times, and review scores.
- **RAG** for qualitative questions about customer feedback and recurring complaints.
- **Combined SQL + RAG** for questions that need both quantitative context and customer explanations.

## Architecture

```mermaid
flowchart TD
    A[User question] --> B[FastAPI /ask]
    B --> C[Planner]
    C --> D{Planned steps}
    D --> E[SQL Agent]
    D --> F[RAG Agent]
    E --> G[Answer synthesizer]
    F --> G
    G --> H[Grounding validator]
    H --> I[Answer + plan + evidence + metrics]
    
    E --> J[(PostgreSQL - Olist data)]
    F --> K[(PostgreSQL + pgvector - review embeddings)]
    C --> L[Groq LLM API]
    E --> L
    G --> L
    H --> L
```

### Request lifecycle

1. **Planning:** the planner converts the question into a structured plan containing SQL and/or RAG steps. The plan is validated with Pydantic.
2. **Execution:** the orchestrator runs each planned step through the corresponding agent.
3. **SQL analytics:** the SQL agent generates PostgreSQL queries and executes them through a read-only database connection after SQL validation.
4. **Review retrieval:** the RAG agent retrieves the top matching customer-review chunks using multilingual sentence embeddings and pgvector cosine similarity.
5. **Synthesis:** the synthesizer combines the available evidence into a concise business answer.
6. **Grounding check:** a validator evaluates whether the answer's material claims are supported by the supplied evidence.
7. **Response:** the API returns the answer, plan, step outputs, grounding result, latency, and token usage.

## Key capabilities

- Natural-language question planning with Pydantic-validated structured output.
- Text-to-SQL over the Olist e-commerce schema.
- SQL safety checks: single read-only SELECT/UNION statement, table allowlist, blocked operations/functions, and a maximum result limit.
- Database-level read-only credentials and a PostgreSQL statement timeout.
- Multilingual semantic retrieval over Portuguese Olist customer reviews.
- Configurable embedding model through `EMBEDDING_MODEL`.
- LLM calls through Groq, with configurable model selection and retry handling.
- Answer synthesis that separates numerical SQL evidence from qualitative review evidence.
- LLM-based grounding validation.
- Per-request latency and prompt/completion token accounting.
- Grounding validation details and expandable execution diagnostics in the UI.
- Interactive result visualizations, formatted tables, and CSV export for structured SQL results.
- Retrieval evaluation using manually labeled relevance judgments.

## Technology stack

| Area | Technologies |
|---|---|
| Language | Python |
| API | FastAPI, Uvicorn, Pydantic |
| LLM | Groq API |
| Orchestration | Custom Python planner and orchestrator |
| Retrieval | Sentence Transformers, pgvector, cosine similarity |
| Database | PostgreSQL 16 |
| SQL validation | SQLGlot |
| Containers | Docker Compose |
| Testing | pytest |

## Data

SutrAI uses the **Brazilian E-Commerce Public Dataset by Olist**.

The relational schema includes customers, orders, sellers, products, order items, payments, reviews, and category translations. Customer review text is embedded and stored separately in the `document_chunks` table with review and order metadata.

The current review-ingestion script, `rag/ingest_reviews.py`, reads review comments longer than 20 characters and processes up to 5,000 records per run. It uses the multilingual model `paraphrase-multilingual-MiniLM-L12-v2` by default and stores 384-dimensional embeddings.

Download the Olist CSV files from Kaggle and place the required files in the local `data/` directory. The dataset itself is not included in this repository.

## Getting started

### Prerequisites

- Python version compatible with the project configuration
- Docker Desktop with Docker Compose
- A Groq API key
- Olist dataset CSV files

### 1. Clone the repository

```bash
git clone https://github.com/chetanandmeher/SutrAI.git
cd SutrAI
```

### 2. Create and activate a virtual environment

Windows PowerShell:

```powershell
uv venv
.\.venv\Scripts\Activate.ps1
```

Install the pinned packages and the API/runtime packages used by the application:

```powershell
uv pip install -r requirements.txt
uv pip install fastapi uvicorn groq sqlglot pytest
```

### 3. Start PostgreSQL with pgvector

```powershell
docker compose up -d
docker compose ps
```

The Compose configuration runs PostgreSQL 16 with the pgvector image and exposes the database on host port **5433**.

### 4. Configure environment variables

Create a `.env` file in the repository root:

```dotenv
DATABASE_URL=postgresql://sutrai:sutrai@localhost:5433/sutrai
READONLY_DATABASE_URL=postgresql://sutrai_ro:sutrai_ro@localhost:5433/sutrai
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile
EMBEDDING_MODEL=paraphrase-multilingual-MiniLM-L12-v2
```

Use your own Groq API key. Do not commit `.env` or expose credentials.

### 5. Initialize the database

Apply the relational schema:

```powershell
Get-Content db\schema.sql | docker exec -i sutrai-db psql -U sutrai -d sutrai
```

Create the pgvector review-chunk table and index:

```powershell
Get-Content db\rag_schema.sql | docker exec -i sutrai-db psql -U sutrai -d sutrai
```

Create the restricted SQL-agent database role:

```powershell
Get-Content db\readonly_role.sql | docker exec -i sutrai-db psql -U sutrai -d sutrai
```

Load the Olist CSV data into the relational tables before running the agents. The CSV dataset is not bundled with this repository.

### 6. Generate review embeddings

After loading the Olist data and initializing the vector table:

```powershell
python -m rag.ingest_reviews
```

This loads eligible review comments, generates multilingual embeddings, and writes the review chunks and metadata to PostgreSQL.

### 7. Run the API

From the repository root:

```powershell
uvicorn api.main:app --reload
```

The interactive API documentation is available at:

- http://127.0.0.1:8000/docs

### 8. Run the web frontend

The frontend is a React + Vite application located at `frontend/lovable-app`.

Keep the FastAPI server running in one terminal. In a second PowerShell terminal, run:

```powershell
cd frontend/lovable-app
npm install
npm run dev
```

Open the URL printed by Vite (the current project setup uses `http://localhost:8080`).

In the UI, open **Data Sources & System Status**, set the API base URL to `http://127.0.0.1:8000`, save it, select **API mode**, and check the connection health.

If the browser blocks requests because of CORS, stop Uvicorn and start it with the frontend origin allowed:

```powershell
$env:SUTRAI_CORS_ORIGINS="http://localhost:8080,http://127.0.0.1:8080"
uvicorn api.main:app --reload
```

The API also allows the default Vite development and preview origins. You can configure additional trusted origins using the comma-separated `SUTRAI_CORS_ORIGINS` environment variable.

## API

### Health check

`GET /health`

Example response:

```json
{
  "status": "healthy",
  "service": "sutrai"
}
```

### Ask a business question

`POST /ask`

Request:

```json
{
  "question": "What complaints do customers have about late deliveries?"
}
```

The response contains:
- `answer`: synthesized natural-language response.
- `is_grounded`: grounding validator result.
- `validation`: unsupported claims and validator explanation.
- `plan`: planner-generated execution plan.
- `steps`: SQL/RAG execution results and supporting evidence.
- `metrics`: end-to-end latency and prompt/completion/total token counts.

Example request using PowerShell:

```powershell
$body = @{ question = "What complaints do customers have about late deliveries?" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://127.0.0.1:8000/ask" -Method Post -ContentType "application/json" -Body $body
```

## Retrieval evaluation

The repository includes a seven-question RAG benchmark covering:

1. Late deliveries
2. Orders that were never delivered
3. Damaged or defective products
4. Missing or incorrect items
5. Refunds and cancellations
6. Seller communication and customer support
7. Delivery services and carriers

Relevance judgments are stored in `eval/rag_relevance_pool_labeled.json`. The evaluation script reports:

- **Precision@5**
- **Pooled Recall@5**
- **MRR@5**

Run the current vector-retrieval evaluation from the repository root:

```powershell
python -m eval.evaluate_rag
```

### Current recorded vector-retrieval baseline

| Metric | Result |
|---|---:|
| Questions | 7 |
| Precision@5 | 0.7143 |
| Pooled Recall@5 | 0.2445 |
| MRR@5 | 0.9286 |

**Evaluation limitation:** pooled recall is calculated against the manually judged top-20 retrieval pool, not every review in the full corpus. The benchmark is small and should be expanded before treating these values as representative of production performance.

The current RAG agent calls vector-only `search()`. A hybrid vector + PostgreSQL full-text retrieval function exists in `rag/search.py`, but it is not currently connected to the agent's runtime path.

## Tests

Run the test suite from the repository root:

```powershell
python -m pytest tests -q
```

The existing tests cover planner-output parsing and SQL validation, including rejection of write operations, multiple statements, disallowed tables, and unsafe functions.

## Current limitations and next steps

- The retrieval benchmark currently contains seven questions; answer-generation quality (faithfulness, relevance, and correctness) still needs a dedicated evaluation.
- The relevance pool is manually judged and not exhaustive.
- Hybrid retrieval is implemented as a search function but is not yet used by the RAG agent.
- Grounding validation currently reports whether the answer is supported; the orchestrator still returns the generated answer when validation is false.
- The React + Vite frontend is available in `frontend/lovable-app/`. It provides a workspace, API status and mode selection, answer rendering, interactive charts for numeric results, formatted result tables, CSV export, review evidence, grounding status, and expandable diagnostics. Conversation history is held in browser memory and is not persisted.
- Kafka, Redis, and distributed task processing are not part of the current implementation.

## Project structure

```text
SutrAI/
├── agents/
│   ├── planner.py
│   ├── sql_agent.py
│   ├── sql_guard.py
│   ├── rag_agent.py
│   ├── synthesizer.py
│   ├── validator.py
│   └── orchestrator.py
├── api/
│   └── main.py
├── db/
│   ├── connection.py
│   ├── schema.sql
│   ├── rag_schema.sql
│   └── readonly_role.sql
├── eval/
│   ├── rag_questions.json
│   ├── rag_relevance_pool_labeled.json
│   └── evaluate_rag.py
├── llm/
│   └── client.py
├── rag/
│   ├── ingest_reviews.py
│   └── search.py
├── tests/
│   ├── test_planner.py
│   └── test_sql_guard.py
├── docker-compose.yml
├── pyproject.toml
└── requirements.txt
```

---

SutrAI is focused on the engineering behind trustworthy data answers: choosing the right data source, validating generated SQL, retrieving relevant customer evidence, and measuring retrieval quality.
