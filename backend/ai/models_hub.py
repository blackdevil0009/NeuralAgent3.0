import torch
import torch.nn as nn
import torch.optim as optim
import torch.nn.functional as F
import numpy as np
from transformers import AutoModelForCausalLM, AutoTokenizer
from collections import deque
import random

class NeuralAgentDNN(nn.Module):
    """Robust Deep Neural Network for multi-modal feature extraction and decision making."""
    def __init__(self, input_dim, hidden_layers, output_dim, dropout=0.2):
        super(NeuralAgentDNN, self).__init__()
        layers = []
        last_dim = input_dim
        for h in hidden_layers:
            layers.append(nn.Linear(last_dim, h))
            layers.append(nn.ReLU())
            layers.append(nn.Dropout(dropout))
            last_dim = h
        layers.append(nn.Linear(last_dim, output_dim))
        self.network = nn.Sequential(*layers)

    def forward(self, x):
        return self.network(x)

class DQNAgent:
    """Deep Q-Network with Experience Replay and Target Network."""
    def __init__(self, state_dim, action_dim):
        self.state_dim = state_dim
        self.action_dim = action_dim
        self.memory = deque(maxlen=2000)
        self.gamma = 0.95
        self.epsilon = 1.0
        self.epsilon_min = 0.01
        self.epsilon_decay = 0.995
        self.model = NeuralAgentDNN(state_dim, [128, 128], action_dim)
        self.target_model = NeuralAgentDNN(state_dim, [128, 128], action_dim)
        self.update_target_network()
        self.optimizer = optim.Adam(self.model.parameters(), lr=0.001)

    def update_target_network(self):
        self.target_model.load_state_dict(self.model.state_dict())

    def remember(self, state, action, reward, next_state, done):
        self.memory.append((state, action, reward, next_state, done))

    def act(self, state):
        if np.random.rand() <= self.epsilon:
            return random.randrange(self.action_dim)
        state_t = torch.FloatTensor(state).unsqueeze(0)
        act_values = self.model(state_t)
        return torch.argmax(act_values[0]).item()

    def replay(self, batch_size):
        if len(self.memory) < batch_size:
            return 0.0
        minibatch = random.sample(self.memory, batch_size)
        total_loss = 0
        for state, action, reward, next_state, done in minibatch:
            target = reward
            if not done:
                next_state_t = torch.FloatTensor(next_state).unsqueeze(0)
                target = (reward + self.gamma * torch.max(self.target_model(next_state_t)[0]).item())
            
            state_t = torch.FloatTensor(state).unsqueeze(0)
            target_f = self.model(state_t)
            target_f[0][action] = target
            
            self.optimizer.zero_grad()
            current_out = self.model(state_t)
            loss = F.mse_loss(current_out, target_f)
            loss.backward()
            self.optimizer.step()
            total_loss += loss.item()
        
        if self.epsilon > self.epsilon_min:
            self.epsilon *= self.epsilon_decay
        
        return total_loss / batch_size

class PPOAgent:
    """Proximal Policy Optimization for stable clinical strategy optimization."""
    def __init__(self, state_dim, action_dim):
        self.actor = NeuralAgentDNN(state_dim, [64, 64], action_dim)
        self.critic = NeuralAgentDNN(state_dim, [64, 64], 1)
        self.optimizer = optim.Adam(list(self.actor.parameters()) + list(self.critic.parameters()), lr=3e-4)
        self.eps_clip = 0.2
        self.gamma = 0.99

    def select_action(self, state):
        state_t = torch.FloatTensor(state).unsqueeze(0)
        probs = F.softmax(self.actor(state_t), dim=-1)
        dist = torch.distributions.Categorical(probs)
        action = dist.sample()
        return action.item(), dist.log_prob(action)

    def update(self, rewards, states, actions, old_log_probs):
        # Implementation for PPO update loop
        # Calculating returns and advantages...
        pass

class ActorCriticAgent:
    """Unified Actor-Critic for real-time patient interaction feedback."""
    def __init__(self, state_dim, action_dim):
        self.actor = NeuralAgentDNN(state_dim, [64, 64], action_dim)
        self.critic = NeuralAgentDNN(state_dim, [64, 64], 1)
        self.optimizer = optim.Adam(list(self.actor.parameters()) + list(self.critic.parameters()), lr=1e-3)

    def train_step(self, state, action, reward, next_state, done):
        state_t = torch.FloatTensor(state).unsqueeze(0)
        next_state_t = torch.FloatTensor(next_state).unsqueeze(0)
        
        # Critic update
        value = self.critic(state_t)
        next_value = self.critic(next_state_t)
        target = reward + (0.99 * next_value * (1 - int(done)))
        critic_loss = F.mse_loss(value, target.detach())
        
        # Actor update
        probs = F.softmax(self.actor(state_t), dim=-1)
        dist = torch.distributions.Categorical(probs)
        log_prob = dist.log_prob(torch.tensor([action]))
        advantage = target - value
        actor_loss = -(log_prob * advantage.detach())
        
        self.optimizer.zero_grad()
        (actor_loss + critic_loss).backward()
        self.optimizer.step()
        return critic_loss.item()

class VitalsLSTM(nn.Module):
    """LSTM for processing sequential health vitals (Heart Rate, SpO2, etc)."""
    def __init__(self, input_dim=1, hidden_dim=64, num_layers=2, output_dim=1):
        super(VitalsLSTM, self).__init__()
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers
        self.lstm = nn.LSTM(input_dim, hidden_dim, num_layers, batch_first=True)
        self.fc = nn.Linear(hidden_dim, output_dim)

    def forward(self, x):
        # x shape: (batch_size, seq_len, input_dim)
        h0 = torch.zeros(self.num_layers, x.size(0), self.hidden_dim).to(x.device)
        c0 = torch.zeros(self.num_layers, x.size(0), self.hidden_dim).to(x.device)
        out, _ = self.lstm(x, (h0, c0))
        out = self.fc(out[:, -1, :]) # Take the last time step
        return out

class VitalsGRU(nn.Module):
    """GRU: Faster and more lightweight than LSTM for edge sequential processing."""
    def __init__(self, input_dim=1, hidden_dim=64, num_layers=2, output_dim=1):
        super(VitalsGRU, self).__init__()
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers
        self.gru = nn.GRU(input_dim, hidden_dim, num_layers, batch_first=True)
        self.fc = nn.Linear(hidden_dim, output_dim)

    def forward(self, x):
        h0 = torch.zeros(self.num_layers, x.size(0), self.hidden_dim).to(x.device)
        out, _ = self.gru(x, h0)
        out = self.fc(out[:, -1, :])
        return out

class QuantizedTransformerBrain:
    """Memory-efficient Transformer utilizing stable sampling and fallback logic."""
    def __init__(self, model_name="distilgpt2"):
        print(f"Initializing {model_name} for MedNeuro-AI...")
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModelForCausalLM.from_pretrained(model_name)
        
        # We'll skip dynamic quantization for now as it's causing gibberish on local environments
        # self.model = torch.quantization.quantize_dynamic(
        #     base_model, {nn.Linear}, dtype=torch.qint8
        # )

    def generate(self, prompt, max_length=150):
        try:
            inputs = self.tokenizer(prompt, return_tensors="pt")
            
            # Optimized generation for coherence
            outputs = self.model.generate(
                **inputs, 
                max_length=max_length, 
                pad_token_id=self.tokenizer.eos_token_id,
                no_repeat_ngram_size=3,
                do_sample=True,
                temperature=0.7,
                top_k=40,
                top_p=0.9,
                repetition_penalty=1.2
            )
            full_text = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
            return full_text[len(prompt):].strip() if full_text.startswith(prompt) else full_text
        except Exception as e:
            print(f"Transformer Generation Error: {e}")
            return ""

class TransformerBrain:
    """Transformer-based interface for fallback/teacher modeling."""
    def __init__(self, model_name="gpt2"):
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModelForCausalLM.from_pretrained(model_name)

    def generate(self, prompt, max_length=150):
        inputs = self.tokenizer(prompt, return_tensors="pt")
        outputs = self.model.generate(
            **inputs, 
            max_length=max_length, 
            pad_token_id=self.tokenizer.eos_token_id,
            no_repeat_ngram_size=2,
            do_sample=True,
            top_k=50,
            top_p=0.95
        )
        full_text = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
        return full_text[len(prompt):].strip() if full_text.startswith(prompt) else full_text
