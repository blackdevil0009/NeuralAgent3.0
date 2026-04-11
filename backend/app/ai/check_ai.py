import os
import sys
import logging

# Add current app to path if running standalone
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("AI-Diagnostic")

def check_env():
    logger.info(f"Python Version: {sys.version}")
    
    components = {
        "torch": "Machine Learning Core",
        "faiss": "Vector Search (Optional)",
        "sentence_transformers": "Embeddings",
        "google.generativeai": "Gemini API",
        "PyPDF2": "PDF Processing",
        "fairseq": "BioGPT Engine"
    }
    
    for lib, desc in components.items():
        try:
            __import__(lib)
            logger.info(f"✅ {lib} ({desc}) is INSTALLED")
        except ImportError:
            logger.error(f"❌ {lib} ({desc}) is MISSING")

def check_biogpt():
    # Correct path logic: check_ai.py is in backend/app/ai/
    # We need to go up 2 levels to get to backend/
    biogpt_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'BioGPT-main'))
    checkpoint_path = os.path.join(biogpt_dir, 'checkpoints', 'Pre-trained-BioGPT', 'checkpoint_last.pt')
    
    logger.info(f"Checking BioGPT at: {biogpt_dir}")
    if os.path.exists(biogpt_dir):
        logger.info("✅ BioGPT Directory Found")
    else:
        logger.error("❌ BioGPT Directory NOT Found")
        
    if os.path.exists(checkpoint_path):
        logger.info("✅ BioGPT Checkpoints Found")
    else:
        logger.warning("⚠️ BioGPT Checkpoints (checkpoint_last.pt) MISSING. Model cannot run.")

if __name__ == "__main__":
    print("\n--- VaidyaMed-X AI Diagnostic Tool ---")
    check_env()
    print("\n--- BioGPT Subdirectory Status ---")
    check_biogpt()
    print("\n--------------------------------------")
