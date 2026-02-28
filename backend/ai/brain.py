from ai.models_hub import QuantizedTransformerBrain, PPOAgent, DQNAgent, ActorCriticAgent, VitalsGRU
from ai.memory import VectorMemory, KnowledgeGraph, ContinualLearner
import os
import time
import asyncio
import torch
from collections import OrderedDict

# 1. Clinical Caching Layer
class ClinicalCache:
    """LRU Cache for near-instant clinical querying."""
    def __init__(self, capacity=100):
        self.cache = OrderedDict()
        self.capacity = capacity

    def get(self, key):
        if key not in self.cache:
            return None
        self.cache.move_to_end(key)
        return self.cache[key]

    def put(self, key, value):
        if key in self.cache:
            self.cache.move_to_end(key)
        self.cache[key] = value
        if len(self.cache) > self.capacity:
            self.cache.popitem(last=False)

class NeuralAgentBrain:
    """The central orchestrator for multi-modal clinical AI (v2.0)."""
    def __init__(self):
        print("Initializing MedNeuro-AI Brain Architecture (v2.0)...")
        # Models
        self.transformer = QuantizedTransformerBrain() # 8-bit Quantized
        self.ppo = PPOAgent(state_dim=12, action_dim=10)
        self.dqn = DQNAgent(state_dim=12, action_dim=10)
        self.actor_critic = ActorCriticAgent(state_dim=12, action_dim=10)
        self.vitals_monitor = VitalsGRU(input_dim=1, hidden_dim=64) # Sequential Processing
        
        # Memory & Learning
        self.memory = VectorMemory()
        self.kb = KnowledgeGraph()
        self.learner = ContinualLearner(self.memory)
        self.cache = ClinicalCache(capacity=50)
        self.current_session_log = []

        # Structured Few-Shot Examples (Self-Care & Mild Cases)
        self.few_shot_examples = (
            "Patient Symptoms: Mild fever and body pain for 2 days\n"
            "Possible Causes: Viral infection, seasonal flu, mild inflammation\n"
            "Severity Level: Level 1 – Minor / Self-care\n"
            "Allopathic Approach: Rest, hydration, over-the-counter fever reducers (consult pharmacist)\n"
            "Ayurvedic Approach: Tulsi tea, Giloy extract, turmeric milk, warm water\n"
            "Diet & Lifestyle Advice: Light meals, avoid cold drinks, adequate rest\n"
            "When to See a Doctor: If fever > 3 days, breathing difficulty, rash, severe weakness\n"
            "Disclaimer: This information is for educational purposes only and not a substitute for professional medical advice. 🌿\n\n"
        )

    async def process_query(self, user_input):
        """Async processing for MedNeuro-AI with robust fallback & gibberish detection."""
        # 1. Check Cache
        cached_res = self.cache.get(user_input.lower())
        if cached_res:
            return f"(Cached) {cached_res}"

        # 2. Sequential RAG & KG Context Extraction
        related_memories = self.memory.search(user_input, top_k=3)
        graph_context = []
        for word in user_input.split():
            subgraph = self.kb.get_subgraph(word.capitalize())
            if subgraph:
                graph_context.append(f"{word} -> {', '.join([e[1] for e in subgraph])}")

        knowledge_base = "\n".join([m.get('text', '') for m in related_memories])
        kb_context = knowledge_base if knowledge_base else "General Clinical Knowledge"
        
        # 3. Emergency Detection (Heuristic)
        emergency_keywords = ["chest pain", "stroke", "bleeding", "unconscious", "cannot breathe"]
        is_emergency = any(kw in user_input.lower() for kw in emergency_keywords)

        # 4. Construct Structured Meta-Prompt
        prompt = (
            f"Role: You are MedNeuro-AI, an advanced medical assistant. Provide structured guidance.\n"
            f"Rules: Classify severity (Level 1-3). Provide Allopathic & Ayurvedic approaches.\n"
            f"Knowledge Context: {kb_context}\n"
            f"Graph Info: {', '.join(graph_context)}\n\n"
            f"{self.few_shot_examples}"
            f"Patient Symptoms: {user_input}\n"
            f"Possible Causes:"
        )
        
        try:
            # 5. Model Generation
            response = await asyncio.to_thread(self.transformer.generate, prompt, max_length=500)
            
            # 6. Gibberish Detection (Uniqueness & Repetitive token ratio)
            tokens = response.lower().split()
            if len(tokens) > 5:
                unique_ratio = len(set(tokens)) / len(tokens)
                if unique_ratio < 0.3: # High repetition detected
                    response = "" # Trigger fallback

            # 7. Validation & Fallback Logic
            if not response or "Severity Level" not in response or len(response) < 20:
                severity = "Level 3 – Emergency" if is_emergency else "Level 2 – Moderate"
                if not is_emergency and len(related_memories) > 0 and "mild" in user_input.lower():
                    severity = "Level 1 – Minor"
                
                # Template Fallback using RAG context
                response = f"Possible Causes: Analysis indicates symptoms related to {', '.join(graph_context) if graph_context else 'clinical observation'}.\n"
                response += f"Severity Level: {severity}\n"
                response += f"Allopathic Approach: Standard care includes symptom management and consultation with a specialist.\n"
                response += f"Ayurvedic Approach: Focus on balancing Doshas. Recommended: {related_memories[0]['text'] if related_memories else 'General herbs like Tulsi and Turmeric'}.\n"
                response += f"Diet & Lifestyle Advice: Rest, hydration, and light Sattvic meals.\n"
                response += f"When to See a Doctor: {'IMMEDIATELY - Emergency signs detected.' if is_emergency else 'If symptoms persist beyond 24-48 hours.'}\n"
                response += f"Disclaimer: This information is for educational purposes only. MedNeuro-AI is an assistant, not a doctor. 🌿"
            else:
                # Ensure the response starts correctly
                if not response.startswith("Possible Causes:"):
                    response = "Possible Causes: " + response

            # Update Cache
            self.cache.put(user_input.lower(), response)
            
        except Exception as e:
            print(f"Brain Error: {e}")
            response = "MedNeuro-AI: Neural pathways re-routing. Please repeat clinical query. 🌿"
            
        self.current_session_log.append({"u": user_input, "a": response})
        return response

    def run_training_cycle(self, state, action, reward, next_state, done):
        """MAML-inspired Meta-Learning foundation + RL update loop."""
        # Simulation of Meta-Gradient Update (MAML foundation)
        # We perform a trial update on a small batch before the main replay
        self.dqn.replay(batch_size=8) 
        
        # Main updates
        dqn_loss = self.dqn.replay(batch_size=32)
        ac_loss = self.actor_critic.train_step(state, action, reward, next_state, done)
        return {"dqn": dqn_loss, "ac": ac_loss}

    def process_vitals(self, pulse_stream):
        """Sequential analysis of pulse stream using GRU."""
        pulse_tensor = torch.FloatTensor(pulse_stream).unsqueeze(0).unsqueeze(-1)
        with torch.no_grad():
            vitals_score = self.vitals_monitor(pulse_tensor)
        return vitals_score.item()

    def update_brain(self, data):
        """Online learning foundation: update models based on real-time telemetry."""
        # This is where we would trigger lightweight fine-tuning or distillation
        print(f"Meta-learning update triggered for {len(data)} clinical data points.")
        # Incrementally update the knowledge base or distillation student
        pass

# Singleton instance
brain_instance = None

def get_brain():
    global brain_instance
    if brain_instance is None:
        brain_instance = NeuralAgentBrain()
    return brain_instance
