import sys
import os
import json

from dotenv import load_dotenv
load_dotenv()

# Force key for test if dotenv fails
if not os.environ.get("GEMINI_API_KEY") or os.environ.get("GEMINI_API_KEY") == "your_gemini_api_key_here":
    os.environ["GEMINI_API_KEY"] = "AIzaSyBGScuXAZxk5eGvrsBGAw82usi9xT0e89U"

# Re-import and reload brain
import importlib
from database import init_db, get_db_connection
import ai.brain
importlib.reload(ai.brain)
from ai.brain import get_brain

def main():
    print("=== Initializing AI Database Tables ===")
    init_db() # creates ai_chat_history and knowledge_base if missing
    
    print("\n=== Initializing MedAssistX ===")
    import google.generativeai as genai
    import os
    print("API KEY:", os.environ.get("GEMINI_API_KEY"))
    genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
    try:
        models = genai.list_models()
        for m in models: print(m.name)
        print("GENAI SDK IS WORKING!")
    except Exception as e:
        print("GENAI SDK CRASHED:", e)
    
    try:
        from ai.brain import MedAssistX
        brain = MedAssistX()
        print("API Available:", brain.api_available)
    except Exception as e:
        import traceback
        traceback.print_exc()
        print("FAIL: MedAssistX Crash:", e)
        return

    if not brain.api_available:
        print("FAIL: Gemini API not available. Check your API key.")
        return

    print("\n=== Test 1: RAG Knowledge Ingestion ===")
    test_kb_title = "Syndrome X Treatment Protocol"
    test_kb_content = "Syndrome X is a rare condition. The primary treatment for Syndrome X is exactly 500mg of extract of Herb Y twice daily with warm water. Do not give Herb Z."
    
    embed = brain._embed_text(test_kb_content)
    if embed and len(embed) > 100:
        print(f"[OK] Embedded successfully. Vector length: {len(embed)}")
        
        # Save to DB
        conn = get_db_connection()
        try:
            cur = conn.cursor()
            cur.execute("DELETE FROM knowledge_base WHERE title=%s", (test_kb_title,))
            cur.execute(
                "INSERT INTO knowledge_base (title, content, embedding) VALUES (%s, %s, %s)",
                (test_kb_title, test_kb_content, json.dumps(embed))
            )
            conn.commit()
            print("[OK] Ingested properly to knowledge_base table")
        except Exception as e:
            print(f"[FAIL] DB error: {e}")
        finally:
            conn.close()
    else:
        print("[FAIL] Failed to embed")

    print("\n=== Test 2: RAG Context Retrieval ===")
    retrieved = brain._retrieve_context("How do I treat Syndrome X?")
    if "Herb Y" in retrieved:
        print("[OK] Retrieved correct context!")
        print(f"Context Sample: {retrieved[:100]}...\n")
    else:
        print("[FAIL] Failed to retrieve context or low similarity")
        print(f"Got: {retrieved}\n")

    print("\n=== Test 3: AI Query with RAG ===")
    user_id = 9991 # Test patient
    
    # Clear history for test
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM ai_chat_history WHERE userId=%s", (user_id,))
    conn.commit()
    conn.close()

    resp1 = brain.process_query("How do I treat Syndrome X?", user_id=user_id)
    print(f"Q1: How do I treat Syndrome X?")
    print(f"A1: {resp1[:150]}...\n")
    if "Herb Y" in resp1:
        print("[OK] AI successfully used RAG context!")
    else:
        print("[FAIL] AI failed to use RAG context.")
        
    print("\n=== Test 4: AI Conversational Memory ===")
    resp2 = brain.process_query("What was the name of the condition I just asked about?", user_id=user_id)
    print(f"Q2: What was the name of the condition I just asked about?")
    print(f"A2: {resp2[:150]}...\n")
    if "Syndrome X" in resp2:
        print("[OK] AI successfully remembered the previous turn!")
    else:
        print("[FAIL] AI failed to remember context.")

if __name__ == "__main__":
    main()
