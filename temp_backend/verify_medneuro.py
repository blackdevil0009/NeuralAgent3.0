import asyncio
import sys
import os

# Add backend to path
sys.path.append(os.getcwd())

from ai.brain import get_brain

async def test_persona():
    brain = get_brain()
    queries = [
        "I have a mild headache and slight nausea for 4 hours.",
        "Sudden chest pain and difficulty breathing."
    ]
    
    for query in queries:
        print(f"\n--- Testing Query: {query} ---")
        # Note: Since the transformer is quantized and needs resources, 
        # this might take a moment or use fallback if resources are low.
        response = await brain.process_query(query)
        print(f"Response:\n{response}")

if __name__ == "__main__":
    asyncio.run(test_persona())
