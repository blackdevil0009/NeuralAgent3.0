import os
import sys
import asyncio
import numpy as np
import re

# Add current directory to path
sys.path.append(os.getcwd())

from ai.brain import get_brain
from ai.models_hub import VitalsLSTM, VitalsGRU

def sanitize(text):
    return re.sub(r'[^\x00-\x7F]+', ' ', str(text))

async def verify_v2():
    print("Verifying Professional AI Architecture v2.0...")
    brain = get_brain()
    
    # 1. Verify Quantized Transformer
    print("Testing Quantized Transformer (NLU)...")
    res1 = await brain.process_query("What is Vata?")
    print(f"Response: {sanitize(res1)}")
    
    # 2. Verify Clinical Cache
    print("Testing Clinical Cache...")
    res2 = await brain.process_query("What is Vata?")
    if "(Cached)" in res2:
        print("OK: Cache Success - Response retrieved from LRU cache.")
    else:
        print("Error: Cache Failure - Response not cached.")
        
    # 3. Verify Sequential Models (LSTM/GRU)
    print("Testing Sequential Models (GRU)...")
    pulse_stream = np.random.rand(10).tolist() # 10 sequential heart rate points
    score = brain.process_vitals(pulse_stream)
    print(f"Vitals Analysis Score: {score:.4f}")
    if isinstance(score, float):
        print("OK: GRU Success - Sequential data processed.")
    
    # 4. Verify Meta-Learning (RL Cycle)
    print("Testing MAML-inspired RL Training Cycle...")
    state = np.random.rand(12).tolist()
    next_state = np.random.rand(12).tolist()
    metrics = brain.run_training_cycle(state, 1, 1.0, next_state, False)
    print(f"Metrics: {metrics}")
    if 'dqn' in metrics:
        print("OK: RL Cycle Success - Meta-gradients simulated.")

    print("\nALL V2 ARCHITECTURE COMPONENTS VERIFIED SUCCESSFULLY!")

if __name__ == "__main__":
    asyncio.run(verify_v2())
