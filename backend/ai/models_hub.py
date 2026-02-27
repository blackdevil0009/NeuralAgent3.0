import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
from transformers import AutoModelForCausalLM, AutoTokenizer

class NeuralAgentDNN(nn.Module):
    """Core Deep Neural Network for decision making."""
    def __init__(self, input_dim, hidden_dim, output_dim):
        super(NeuralAgentDNN, self).__init__()
        self.network = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, output_dim)
        )

    def forward(self, x):
        return self.network(x)

class DQNAgent:
    """Deep Q-Network for discrete actions."""
    def __init__(self, state_dim, action_dim):
        self.model = NeuralAgentDNN(state_dim, 64, action_dim)
        self.optimizer = optim.Adam(self.model.parameters(), lr=0.001)
        self.criterion = nn.MSELoss()

    def update(self, state, target_q):
        self.optimizer.zero_grad()
        output = self.model(torch.FloatTensor(state))
        loss = self.criterion(output, torch.FloatTensor(target_q))
        loss.backward()
        self.optimizer.step()
        return loss.item()

class PPOAgent:
    """Proximal Policy Optimization for stable RL."""
    def __init__(self, state_dim, action_dim):
        self.actor = NeuralAgentDNN(state_dim, 64, action_dim)
        self.critic = NeuralAgentDNN(state_dim, 64, 1)
        self.optimizer = optim.Adam(list(self.actor.parameters()) + list(self.critic.parameters()), lr=3e-4)

    def select_action(self, state):
        probs = torch.softmax(self.actor(torch.FloatTensor(state)), dim=-1)
        return torch.multinomial(probs, 1).item()

class ActorCriticAgent:
    """Standard Actor-Critic implementation."""
    def __init__(self, state_dim, action_dim):
        self.actor = NeuralAgentDNN(state_dim, 64, action_dim)
        self.critic = NeuralAgentDNN(state_dim, 64, 1)

class TransformerBrain:
    """Transformer-based interface for conversational AI."""
    def __init__(self, model_name="gpt2"): # Using gpt2 as a lightweight local placeholder
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModelForCausalLM.from_pretrained(model_name)

    def generate(self, prompt, max_length=100):
        inputs = self.tokenizer(prompt, return_tensors="pt")
        outputs = self.model.generate(**inputs, max_length=max_length)
        return self.tokenizer.decode(outputs[0], skip_special_tokens=True)
