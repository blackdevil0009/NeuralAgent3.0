import os
import sys
# Add current directory to path
sys.path.append(os.getcwd())
from ai.brain import get_brain

def verify_charak_knowledge():
    print("Initializing Brain Verification...")
    brain = get_brain()
    
    query = "What does Charak Samhita say about the definition of health?"
    print(f"Query: {query}")
    
    response = brain.process_query(query)
    print(f"AI Response: {response}")
    
    if "equilibrium" in response.lower() and "dosha" in response.lower():
        print("SUCCESS: AI successfully retrieved Charak Samhita knowledge!")
    else:
        print("FAILURE: AI did not mention the expected definition of health.")

if __name__ == "__main__":
    verify_charak_knowledge()
