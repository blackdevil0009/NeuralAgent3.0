from ai.brain import get_brain

def test_brain_orchestration():
    brain = get_brain()
    # Test query processing
    response = brain.process_query("What is Vata dosha?")
    assert isinstance(response, str)
    assert len(response) > 0
    print(f"Brain Response: {response}")
    
    # Test RL training cycle integration
    import numpy as np
    state = np.random.rand(12)
    next_state = np.random.rand(12)
    metrics = brain.run_training_cycle(state, 1, 1.0, next_state, False)
    assert "dqn" in metrics
    assert "ac" in metrics
    print("Brain Orchestration Test Passed!")

if __name__ == "__main__":
    test_brain_orchestration()
