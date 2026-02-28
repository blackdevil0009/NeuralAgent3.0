import numpy as np
import faiss
import networkx as nx
from sentence_transformers import SentenceTransformer
import os
import json

class VectorMemory:
    """Vector Database using FAISS for high-performance RAG."""
    def __init__(self, dimension=384, model_name='all-MiniLM-L6-v2'):
        self.model = SentenceTransformer(model_name)
        self.index = faiss.IndexFlatL2(dimension)
        self.metadata = []
        self.save_path = "backend/ai/data/vector_store.idx"
        self.meta_path = "backend/ai/data/vector_meta.json"
        self._ensure_data_dir()
        self.load_from_disk()

    def _ensure_data_dir(self):
        os.makedirs("backend/ai/data", exist_ok=True)

    def add_to_memory(self, text, metadata=None):
        embedding = self.model.encode([text])
        self.index.add(np.array(embedding).astype('float32'))
        self.metadata.append(metadata or {"text": text, "timestamp": os.path.getmtime(__file__)})
        self.save_to_disk()

    def search(self, query, top_k=3):
        if self.index.ntotal == 0:
            return []
        query_embedding = self.model.encode([query])
        distances, indices = self.index.search(np.array(query_embedding).astype('float32'), top_k)
        results = []
        for i in indices[0]:
            if i != -1 and i < len(self.metadata):
                results.append(self.metadata[i])
        return results

    def save_to_disk(self):
        faiss.write_index(self.index, self.save_path)
        with open(self.meta_path, 'w') as f:
            json.dump(self.metadata, f)

    def load_from_disk(self):
        if os.path.exists(self.save_path) and os.path.exists(self.meta_path):
            self.index = faiss.read_index(self.save_path)
            with open(self.meta_path, 'r') as f:
                self.metadata = json.load(f)
            print(f"VectorMemory: Loaded {len(self.metadata)} entries from disk.")

class KnowledgeGraph:
    """Multi-relational Knowledge Graph for Ayurvedic concepts."""
    def __init__(self):
        self.graph = nx.DiGraph()
        self._seed_ayurveda()

    def _seed_ayurveda(self):
        # Doshas
        self.add_concept("Vata", "Dosha", {"description": "Air and space elements, governs movement."})
        self.add_concept("Pitta", "Dosha", {"description": "Fire and water elements, governs metabolism."})
        self.add_concept("Kapha", "Dosha", {"description": "Earth and water elements, governs structure."})
        
        # Elements
        for el in ["Ether", "Air", "Fire", "Water", "Earth"]:
            self.add_concept(el, "Element")

        # Relationships
        self.connect_concepts("Vata", "Air", "composed_of")
        self.connect_concepts("Vata", "Ether", "composed_of")
        self.connect_concepts("Pitta", "Fire", "composed_of")
        self.connect_concepts("Kapha", "Earth", "composed_of")
        self.connect_concepts("Kapha", "Water", "composed_of")

    def add_concept(self, name, category, attrs=None):
        self.graph.add_node(name, category=category, **(attrs or {}))

    def connect_concepts(self, src, dst, relation):
        self.graph.add_edge(src, dst, relation=relation)

    def get_subgraph(self, center_node, depth=1):
        if center_node not in self.graph:
            return []
        return list(nx.bfs_edges(self.graph, center_node, depth_limit=depth))

class ContinualLearner:
    """Knowledge Consolidation and Drift Prevention."""
    def __init__(self, memory_ref):
        self.memory = memory_ref

    def consolidate(self, session_data):
        """Processes a session and adds insights to long-term memory."""
        summary = f"Interaction Insight: {session_data.get('summary', 'General interaction')}"
        self.memory.add_to_memory(summary, {"type": "v_consolidation"})
        print(f"Continual Learning: Consolidating {summary}")
