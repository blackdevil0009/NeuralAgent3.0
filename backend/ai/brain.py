from ai.models_hub import TransformerBrain, PPOAgent, DQNAgent, ActorCriticAgent
from ai.memory import VectorMemory, KnowledgeGraph, ContinualLearner
import os

class NeuralAgentBrain:
    """The central orchestrator for all AI functionalities."""
    def __init__(self):
        print("Initializing NeuralAgent Brain...")
        # Models
        self.transformer = TransformerBrain()
        self.ppo = PPOAgent(state_dim=10, action_dim=5)
        self.dqn = DQNAgent(state_dim=10, action_dim=5)
        self.actor_critic = ActorCriticAgent(state_dim=10, action_dim=5)
        
        # Memory
        self.memory = VectorMemory()
        self.kb = KnowledgeGraph()
        self.learner = ContinualLearner(self.transformer)
        
        # Initialize KB with some Ayurvedic defaults
        self._init_knowledge_graph()

    def _init_knowledge_graph(self):
        self.kb.add_concept("Vata", "Dosha")
        self.kb.add_concept("Pitta", "Dosha")
        self.kb.add_concept("Kapha", "Dosha")
        self.kb.connect_concepts("Vata", "Air", "Element")
        self.kb.connect_concepts("Pitta", "Fire", "Element")
        self.kb.connect_concepts("Kapha", "Water", "Element")

    def process_query(self, user_input):
        """Processes a chat query using Transformer + RAG + Graph Search."""
        # 1. Search Vector Memory (RAG)
        related_memories = self.memory.search(user_input)
        
        # 2. Search Knowledge Graph
        # (Simple keyword match for demo)
        graph_context = ""
        for concept in ["Vata", "Pitta", "Kapha"]:
            if concept.lower() in user_input.lower():
                related = self.kb.find_related(concept)
                graph_context += f"{concept} is related to {', '.join(related)}. "

        # 3. Generate Response
        context = f"Memories: {related_memories}. Graph: {graph_context}"
        prompt = f"Context: {context}\nUser: {user_input}\nNeuralAgent:"
        
        # For demo, using transformer generate (can be slow on first run)
        try:
            response = self.transformer.generate(prompt)
        except Exception:
            response = "I am processing your query with deep intelligence. How else can I assist? 🌿"
            
        return response

    def update_brain(self, feedback_data):
        """Reinforcement Learning update loop."""
        # Placeholder for real RL feedback integration
        self.learner.update_knowledge(feedback_data)
        return "Brain architecture updated with latest interaction patterns."

# Singleton instance
brain_instance = None

def get_brain():
    global brain_instance
    if brain_instance is None:
        brain_instance = NeuralAgentBrain()
    return brain_instance
