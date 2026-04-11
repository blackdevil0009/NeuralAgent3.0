import os
import logging
import PyPDF2
from flask import current_app

logger = logging.getLogger(__name__)

class RagService:
    def __init__(self):
        self.db_path = os.path.join(current_app.root_path, '..', 'data', 'vector_index.faiss')
        self.meta_path = os.path.join(current_app.root_path, '..', 'data', 'vector_meta.json')
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        
        self.index = None
        self.metadata = []
        
        # Lazy load embeddings and index
        self.encoder = None

    def _get_encoder(self):
        if self.encoder is None:
            try:
                from sentence_transformers import SentenceTransformer
                self.encoder = SentenceTransformer('all-MiniLM-L6-v2')
            except ImportError:
                logger.error("sentence-transformers not installed.")
                return None
        return self.encoder

    def _load_index(self):
        if self.index is not None:
            return True
        
        try:
            import faiss
            import numpy as np
            if os.path.exists(self.db_path):
                self.index = faiss.read_index(self.db_path)
                if os.path.exists(self.meta_path):
                    with open(self.meta_path, 'r', encoding='utf-8') as f:
                        self.metadata = json.load(f)
                return True
            else:
                # Initialize empty index
                d = 384 # Dimension for all-MiniLM-L6-v2
                self.index = faiss.IndexFlatL2(d)
                return True
        except Exception as e:
            logger.error(f"Failed to load FAISS index: {e}")
            return False

    def ingest_file(self, file_path, metadata=None):
        """Extract, chunk, embed and add to FAISS index."""
        try:
            import faiss
            import numpy as np
            import json

            self._load_index()
            encoder = self._get_encoder()
            if not encoder or self.index is None:
                return False, "AI Indexing components not ready."

            text = ""
            if file_path.endswith('.pdf'):
                with open(file_path, 'rb') as f:
                    reader = PyPDF2.PdfReader(f)
                    for page in reader.pages:
                        text += page.extract_text() + "\n"
            elif file_path.endswith('.txt'):
                with open(file_path, 'r', encoding='utf-8') as f:
                    text = f.read()

            if not text.strip():
                return False, "No content found."

            # Chunks
            chunks = [text[i:i+800] for i in range(0, len(text), 600)]
            embeddings = encoder.encode(chunks)
            
            # Add to FAISS
            self.index.add(np.array(embeddings).astype('float32'))
            
            # Add to metadata
            for chunk in chunks:
                self.metadata.append({
                    "content": chunk,
                    "source": os.path.basename(file_path),
                    "ext_meta": metadata or {}
                })
            
            # Persist
            faiss.write_index(self.index, self.db_path)
            with open(self.meta_path, 'w', encoding='utf-8') as f:
                json.dump(self.metadata, f)

            return True, len(chunks)
        except Exception as e:
            logger.error(f"Ingestion error: {e}")
            return False, str(e)

    def query(self, user_query, top_k=5):
        """Perform FAISS similarity search."""
        try:
            import faiss
            import numpy as np
            import json

            if not self._load_index() or not self.metadata:
                return []

            encoder = self._get_encoder()
            if not encoder:
                return []

            query_vector = encoder.encode([user_query])
            distances, indices = self.index.search(np.array(query_vector).astype('float32'), top_k)
            
            results = []
            for i, idx in enumerate(indices[0]):
                if idx != -1 and idx < len(self.metadata):
                    results.append({
                        "content": self.metadata[idx]['content'],
                        "metadata": self.metadata[idx].get('ext_meta', {}),
                        "distance": float(distances[0][i])
                    })
            return results
        except Exception as e:
            logger.error(f"RAG query error: {e}")
            return []

    def reset_db(self):
        self.index = None
        self.metadata = []
        if os.path.exists(self.db_path): os.remove(self.db_path)
        if os.path.exists(self.meta_path): os.remove(self.meta_path)
        return True

import json
