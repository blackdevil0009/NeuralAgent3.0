# VaidyaMed-X Ayurveda AI Engine

A complete backend AI system for Ayurveda healthcare using RAG (Retrieval-Augmented Generation) and TinyLlama (1.1B Chat). This system is designed to run efficiently on CPU-only VPS environments with at least 8GB RAM.

## Features
- **Local LLM**: Uses TinyLlama-1.1B-Chat (No external API keys needed for inference).
- **RAG Engine**: FAISS-based vector search with `sentence-transformers` embeddings.
- **FastAPI**: Modern, fast, and asynchronous Python web framework.
- **Intent Router**: Automatically detects simple chat vs knowledge-based queries.
- **Caching**: In-memory LRU cache for high-speed response to common queries.
- **History**: SQLite-based conversation persistence.

## Project Structure
```text
ayurveda_ai/
├── app/
│   ├── main.py          # FastAPI endpoints & logic
│   ├── rag.py           # FAISS retrieval engine
│   ├── model.py         # TinyLlama singleton loader
│   ├── data/
│   │   └── ayurveda_data.json  # Knowledge base
│   └── utils/
│       ├── logger.py    # Logging system
│       ├── history.py   # SQLite history manager
│       └── caching.py   # In-memory cache
├── requirements.txt     # Dependencies
└── README.md            # You are here
```

## Setup & Run Instructions (Linux VPS)

### 1. Prerequisite Packages
Ensure you have Python 3.9+ and essential build tools:
```bash
sudo apt update
sudo apt install python3-pip python3-venv build-essential -y
```

### 2. Clone and Setup Environment
```bash
cd backend/ayurveda_ai
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3. Run the Server
Use `uvicorn` to start the FastAPI server:
```bash
# Development mode
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Production mode
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1
```
*Note: We recommend 1 worker to ensure the LLM singleton fits comfortably in 8GB RAM.*

## API Usage Examples

### Health Check
```bash
curl http://localhost:8000/health
```

### Ask a Question
```bash
curl -X POST http://localhost:8000/ask \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "patient_123",
    "message": "What are the benefits of Ashwagandha?"
  }'
```

### Python Example
```python
import requests

response = requests.post("http://localhost:8000/ask", json={
    "user_id": "test_user",
    "message": "I feel bloated after eating, any ayurvedic tips?"
})
print(response.json()['response'])
```

## Performance Tips
- **Pre-warming**: The model loads into RAM on server startup. Expect 10-20 seconds before the first request can be served.
- **Concurrency**: TinyLlama on CPU is serial by nature. For 1000+ users, consider scaling horizontally or using a Redis cache for common queries (already partially implemented with `cachetools`).
- **Memory**: The system uses ~3-4GB of RAM during peak inference.

## Safety & Warnings
VaidyaMed-X AI is an informational tool. It is configured with a strict system prompt to suggest doctor consultation for serious issues and to avoid absolute claims of cures.
