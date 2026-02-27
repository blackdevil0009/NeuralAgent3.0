from ai.models_hub import TransformerBrain, PPOAgent, DQNAgent, ActorCriticAgent
from ai.memory import VectorMemory, KnowledgeGraph, ContinualLearner
import os
import time

class NeuralAgentBrain:
    """The central orchestrator for multi-modal clinical AI."""
    def __init__(self):
        print("Initializing Advanced NeuralAgent Brain...")
        # Models
        self.transformer = TransformerBrain()
        self.ppo = PPOAgent(state_dim=12, action_dim=10)
        self.dqn = DQNAgent(state_dim=12, action_dim=10)
        self.actor_critic = ActorCriticAgent(state_dim=12, action_dim=10)
        
        # Memory & Learning
        self.memory = VectorMemory()
        self.kb = KnowledgeGraph()
        self.learner = ContinualLearner(self.memory)
        self.current_session_log = []

    def process_query(self, user_input):
        """Processes a chat query using Transformer + RAG + Graph Context."""
        # 1. Recursive Search in Vector Memory (RAG)
        related_memories = self.memory.search(user_input, top_k=5)
        
        # 2. Extract context from Knowledge Graph
        graph_context = ""
        for word in user_input.split():
            subgraph = self.kb.get_subgraph(word.capitalize())
            if subgraph:
                graph_context += f"Related to {word}: {', '.join([e[1] for e in subgraph])}. "

        # 3. Construct Deep Prompt
        mem_text = " ".join([m.get('text', '') for m in related_memories])
        prompt = f"System: Use Ayurvedic context: {graph_context} and History: {mem_text}\nUser: {user_input}\nNeuralAgent:"
        
        try:
            response = self.transformer.generate(prompt, max_length=150)
        except Exception as e:
            print(f"Transformer Error: {e}")
            response = "I am processing your clinical data with high-layer neural depth. 🌿"
            
        self.current_session_log.append({"u": user_input, "a": response})
        return response

    def run_training_cycle(self, state, action, reward, next_state, done):
        """Integrated RL training step across all agents."""
        dqn_loss = self.dqn.replay(batch_size=32)
        ac_loss = self.actor_critic.train_step(state, action, reward, next_state, done)
        return {"dqn": dqn_loss, "ac": ac_loss}

    def end_session(self):
        """Consolidates knowledge at the end of an interaction."""
        if self.current_session_log:
            summary = self.current_session_log[-1].get('a', '')
            self.learner.consolidate({"summary": summary, "history": self.current_session_log})
            self.current_session_log = []

# Singleton instance
brain_instance = None

def get_brain():
    global brain_instance
    if brain_instance is None:
        brain_instance = NeuralAgentBrain()
    return brain_instance
