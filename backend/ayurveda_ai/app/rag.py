import os
import json
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
from .utils.logger import logger

class RagEngine:
    def __init__(self, data_path="app/data/ayurveda_data.json"):
        self.data_path = data_path
        self.encoder = SentenceTransformer('all-MiniLM-L6-v2')
        self.index = None
        self.documents = []
        
        self._load_data()
        self._build_index()

    def _load_data(self):
        try:
            # Check if file exists relative to working dir or this file
            path = self.data_path
            if not os.path.exists(path):
                # Fallback to local path if running from within app dir
                path = os.path.join(os.path.dirname(__file__), "data", "ayurveda_data.json")
            
            with open(path, 'r', encoding='utf-8') as f:
                self.documents = json.load(f)
            logger.info(f"Loaded {len(self.documents)} Ayurvedic knowledge chunks.")
        except Exception as e:
            logger.error(f"Failed to load data for RAG: {e}")

    def _build_index(self):
        if not self.documents:
            return

        try:
            texts = [f"{doc['topic']}: {doc['content']}" for doc in self.documents]
            embeddings = self.encoder.encode(texts)
            
            dimension = embeddings.shape[1]
            self.index = faiss.IndexFlatL2(dimension)
            self.index.add(np.array(embeddings).astype('float32'))
            logger.info("FAISS index built successfully.")
        except Exception as e:
            logger.error(f"Failed to build FAISS index: {e}")

    def retrieve(self, query, top_k=3):
        if self.index is None or not self.documents:
            return []

        try:
            query_vector = self.encoder.encode([query])
            distances, indices = self.index.search(np.array(query_vector).astype('float32'), top_k)
            
            results = []
            for i, idx in enumerate(indices[0]):
                if idx != -1 and idx < len(self.documents):
                    results.append(self.documents[idx])
            return results
        except Exception as e:
            logger.error(f"RAG retrieval error: {e}")
            return []

# Initialize singleton
rag_engine = RagEngine()
