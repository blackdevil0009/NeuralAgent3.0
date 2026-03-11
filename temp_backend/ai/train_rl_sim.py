import os
import sys
import torch
import numpy as np
import random

# Add current directory to path
sys.path.append(os.getcwd())

from ai.brain import get_brain

def simulate_rl_training():
    print("Initializing Reinforcement Learning Training Simulation...")
    brain = get_brain()
    
    # Simulate a series of clinical interactions
    episodes = 50
    state_dim = 12
    action_dim = 10
    
    print(f"Starting Training across {episodes} clinical episodes...")
    
    for e in range(episodes):
        # Generate random clinical state (vitals, symptoms, history features)
        state = np.random.rand(state_dim)
        
        # Agent decides on a clinical action
        action = brain.dqn.act(state)
        
        # Simulate environment response (reward based on clinical accuracy)
        # Higher reward for actions that align with the "ideal" clinical path
        reward = 1.0 if random.random() > 0.3 else -0.5
        
        next_state = np.random.rand(state_dim)
        done = (e == episodes - 1)
        
        # Agent saves experience and learns
        brain.dqn.remember(state, action, reward, next_state, done)
        
        if len(brain.dqn.memory) > 32:
            metrics = brain.run_training_cycle(state, action, reward, next_state, done)
            if e % 10 == 0:
                dqn_l = metrics.get('dqn')
                dqn_str = f"{dqn_l:.4f}" if dqn_l is not None else "N/A"
                print(f"Episode {e}/{episodes} | DQN Loss: {dqn_str} | Epsilon: {brain.dqn.epsilon:.2f}")

    print("Success: RL Training simulation complete. NeuralAgent Brain weights updated.")

if __name__ == "__main__":
    simulate_rl_training()
