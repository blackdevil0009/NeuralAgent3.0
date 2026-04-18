import os
import json
import logging
import requests
import numpy as np
import google.generativeai as genai
from flask import current_app

logger = logging.getLogger(__name__)

class AyurvedaAiService:
    def __init__(self):
        self.dataset_path = os.path.join(current_app.root_path, '..', 'data', 'ayurveda_dataset.json')
        self.db_path = os.path.join(current_app.root_path, '..', 'data', 'ayurveda_index.faiss')
        
        # Setup Gemini
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel('gemini-1.5-flash')
        else:
            self.model = None
            logger.warning("GEMINI_API_KEY not found in environment.")
        
        self.index = None
        self.dataset = []
        self.encoder = None

    def _get_encoder(self):
        if self.encoder is None:
            # We use a lightweight local encoder for RAG context retrieval
            from sentence_transformers import SentenceTransformer
            self.encoder = SentenceTransformer('all-MiniLM-L6-v2')
        return self.encoder

    def _load_data(self):
        if not self.dataset and os.path.exists(self.dataset_path):
            with open(self.dataset_path, 'r', encoding='utf-8') as f:
                self.dataset = json.load(f)
        return self.dataset

    def _initialize_index(self):
        import faiss
        if self.index is not None:
            return
        
        dataset = self._load_data()
        if not dataset:
            logger.error("Ayurveda dataset not found.")
            return

        encoder = self._get_encoder()
        texts = [
            f"Disease: {d['disease']}. Symptoms: {d['symptoms']}. Explanation: {d['ayurvedic_explanation']}"
            for d in dataset
        ]
        
        embeddings = encoder.encode(texts)
        d = embeddings.shape[1]
        self.index = faiss.IndexFlatL2(d)
        self.index.add(np.array(embeddings).astype('float32'))
        logger.info(f"FAISS index initialized with {len(dataset)} entries.")

    def query(self, user_query):
        import faiss
        self._initialize_index()
        if self.index is None:
            return {"error": "AI service not initialized."}

        if not self.model:
            return {"error": "Gemini API key not configured for hosting."}

        encoder = self._get_encoder()
        query_vector = encoder.encode([user_query])
        
        # Search for top 3 closest matches for better context
        D, I = self.index.search(np.array(query_vector).astype('float32'), k=3)
        
        context_parts = []
        best_match = None
        
        for idx in I[0]:
            if idx != -1 and idx < len(self.dataset):
                item = self.dataset[idx]
                if not best_match: best_match = item
                context_parts.append(
                    f"Possible Condition: {item['disease']}\n"
                    f"Symptoms: {item['symptoms']}\n"
                    f"Ayurvedic Insight: {item['ayurvedic_explanation']}\n"
                    f"Remedies: {item['remedies']}\n"
                    f"Lifestyle: {item['lifestyle']}\n"
                    f"Precautions: {item['precautions']}"
                )
        
        context = "\n---\n".join(context_parts)
        
        prompt = f"""
You are the VaidyaMed-X Ayurveda AI Assistant. Provide safe, informational Ayurvedic guidance.
DISCLAIMER: This is for informational purposes only. Consult a doctor.

User Query: {user_query}

Knowledge Base Context:
{context}

Response Rules:
1. Use the provided context to identify the possible condition.
2. If no direct match is found in context, give general Ayurvedic advice based on common principles (Vata/Pitta/Kapha).
3. Do NOT provide exact dosages.
4. Keep it professional and empathetic.
5. ALWAYS end with the disclaimer.

Format your response exactly as:
- Possible Condition: [Name]
- Symptoms Matched: [Brief list]
- Ayurvedic Insight: [Explanation]
- Suggested Remedies: [Herbal tips]
- Lifestyle Advice: [Tips]
- Precautions: [Warnings]
- Disclaimer: This is for informational purposes only. Consult a doctor.
"""

        try:
            response = self.model.generate_content(prompt)
            if response.text:
                return {
                    "response": response.text,
                    "condition": best_match['disease'] if best_match else "General Guidance",
                    "confidence": 0.95 if D[0][0] < 0.8 else 0.7
                }
            else:
                return {"error": "Empty response from Gemini."}
        except Exception as e:
            logger.error(f"Gemini error: {e}")
            return {"error": f"AI Engine error: {str(e)}"}

