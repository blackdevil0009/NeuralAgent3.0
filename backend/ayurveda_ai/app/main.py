from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
import time

from .rag import rag_engine
from .model import llm_engine
from .utils.logger import logger
from .utils.history import history_manager
from .utils.caching import ai_cache

app = FastAPI(title="VaidyaMed-X Ayurveda AI", version="1.0.0")

# Request/Response Schemas
class QueryRequest(BaseModel):
    user_id: str = "guest"
    message: str
    stream: Optional[bool] = False

class QueryResponse(BaseModel):
    response: str
    sources: List[str]
    processing_time: float
    cached: bool

@app.on_event("startup")
async def startup_event():
    logger.info("VaidyaMed-X AI Starting up...")
    # Engines are initialized on module import (singleton pattern)

@app.get("/health")
async def health_check():
    return {"status": "online", "model": "TinyLlama-1.1B", "rag": "FAISS+MiniLM"}

def intent_router(query: str):
    """Simple heuristic to route between direct chat and clinical knowledge."""
    knowledge_keywords = ["remedy", "herb", "medicine", "treatment", "dosha", "vata", "pitta", "kapha", "ayurveda"]
    is_knowledge = any(kw in query.lower() for kw in knowledge_keywords)
    
    # Also check length - very short queries are usually greetings
    if len(query.split()) < 3 and not is_knowledge:
        return "chat"
    return "knowledge"

@app.post("/ask", response_model=QueryResponse)
async def ask_question(request: QueryRequest):
    start_time = time.time()
    query = request.message
    user_id = request.user_id

    # 1. Check Cache
    cached_val = ai_cache.get(f"{user_id}:{query}")
    if cached_val:
        return QueryResponse(
            response=cached_val["response"],
            sources=cached_val["sources"],
            processing_time=time.time() - start_time,
            cached=True
        )

    try:
        # 2. Intent Routing
        intent = intent_router(query)
        logger.info(f"User Query: {query} | Intent: {intent}")

        # 3. Memory Retrieval
        conv_history = history_manager.get_context(user_id)

        # 4. RAG Retrieval (if knowledge intent)
        context_text = ""
        sources = []
        if intent == "knowledge":
            retrieved_docs = rag_engine.retrieve(query)
            context_text = "\n".join([f"- {d['topic']}: {d['content']}" for d in retrieved_docs])
            sources = [d['topic'] for d in retrieved_docs]

        # 5. LLM Generation
        response = llm_engine.generate(query, context=context_text, history=conv_history)

        # 6. Save History
        history_manager.add_entry(user_id, query, response)

        # 7. Update Cache
        res_obj = {
            "response": response,
            "sources": sources,
            "processing_time": time.time() - start_time,
            "cached": False
        }
        ai_cache.set(f"{user_id}:{query}", res_obj)

        return QueryResponse(**res_obj)

    except Exception as e:
        logger.error(f"Error in /ask endpoint: {e}")
        raise HTTPException(status_code=500, detail="Internal AI Engine Error")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
