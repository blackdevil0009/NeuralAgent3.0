import os
import google.generativeai as genai

api_key = "AIzaSyByDFMLB2rbTpgKm9MIjZtbUpVizfIgOJI"
genai.configure(api_key=api_key)

print("Fetching available models for this API Key...")
try:
    models = genai.list_models()
    for m in models:
        if 'generateContent' in m.supported_generation_methods:
            print(f"Supported Model: {m.name}")
except Exception as e:
    print(f"Failed to fetch models: {e}")
