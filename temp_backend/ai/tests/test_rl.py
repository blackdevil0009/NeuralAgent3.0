import torch
import numpy as np
from ai.models_hub import DQNAgent, PPOAgent, ActorCriticAgent

def test_dqn_agent():
    state_dim = 12
    action_dim = 10
    agent = DQNAgent(state_dim, action_dim)
    
    state = np.random.rand(state_dim)
    action = agent.act(state)
    assert 0 <= action < action_dim
    
    # Test replay
    for _ in range(10):
        agent.remember(state, action, 1, np.random.rand(state_dim), False)
    agent.replay(5)
    print("DQN Agent Test Passed!")

def test_actor_critic():
    state_dim = 12
    action_dim = 10
    agent = ActorCriticAgent(state_dim, action_dim)
    
    state = np.random.rand(state_dim)
    action = 1
    next_state = np.random.rand(state_dim)
    loss = agent.train_step(state, action, 1.0, next_state, False)
    assert isinstance(loss, float)
    print("Actor-Critic Agent Test Passed!")

if __name__ == "__main__":
    test_dqn_agent()
    test_actor_critic()
