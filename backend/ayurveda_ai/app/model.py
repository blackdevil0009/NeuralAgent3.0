import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline
from .utils.logger import logger

class TinyLlamaEngine:
    def __init__(self, model_id="TinyLlama/TinyLlama-1.1B-Chat-v1.0"):
        self.model_id = model_id
        self.model = None
        self.tokenizer = None
        self.pipeline = None
        self._load_model()

    def _load_model(self):
        try:
            logger.info(f"Loading TinyLlama model: {self.model_id}")
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_id)
            self.model = AutoModelForCausalLM.from_pretrained(
                self.model_id,
                torch_dtype=torch.float32,
                low_cpu_mem_usage=True,
                device_map="cpu"
            )
            
            self.pipeline = pipeline(
                "text-generation",
                model=self.model,
                tokenizer=self.tokenizer,
                torch_dtype=torch.float32,
                device=-1 # CPU
            )
            logger.info("TinyLlama loaded successfully on CPU.")
        except Exception as e:
            logger.error(f"Failed to load TinyLlama: {e}")

    def generate(self, user_query, context="", history=""):
        if not self.pipeline:
            return "Model not initialized."

        system_prompt = (
            "You are VaidyaMed-X AI, an expert Ayurvedic Assistant. "
            "Your Goal: Provide safe, helpful, and traditional Ayurvedic insights. "
            "Rules: 1. Do NOT claim to cure serious diseases. 2. Suggest seeing a doctor for emergency or complex symptoms. "
            "3. Format response in 4 sections: Explanation, Remedies, Lifestyle, Warning."
        )

        # Construct ChatML style prompt
        prompt = f"<|system|>\n{system_prompt}\n"
        
        if context:
            prompt += f"CONTEXT DATA:\n{context}\n"
        
        if history:
            prompt += f"CONVERSATION HISTORY:\n{history}\n"

        prompt += f"<|user|>\n{user_query}\n<|assistant|>\n"

        try:
            outputs = self.pipeline(
                prompt,
                max_new_tokens=300,
                do_sample=True,
                temperature=0.7,
                top_k=50,
                top_p=0.95
            )
            
            generated_text = outputs[0]["generated_text"]
            # Extract only the assistant's part
            if "<|assistant|>\n" in generated_text:
                response = generated_text.split("<|assistant|>\n")[-1].strip()
            else:
                response = generated_text[len(prompt):].strip()
            
            return response
        except Exception as e:
            logger.error(f"Generation error: {e}")
            return "VaidyaMed-X AI is resting. Please try again in 30 seconds."

# Initialize singleton
llm_engine = TinyLlamaEngine()
