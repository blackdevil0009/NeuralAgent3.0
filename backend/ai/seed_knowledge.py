import os
import sys
# Add current directory to path
sys.path.append(os.getcwd())

from ai.memory import VectorMemory

def seed_charak_samhita():
    print("Initializing Charak Samhita Knowledge Ingestion...")
    memory = VectorMemory()
    
    # Core concepts from Charak Samhita
    charak_data = [
        {
            "text": "Charak Samhita defines health (Svastha) as a state of equilibrium of Doshas, Agni (digestive fire), Dhatus (tissues), and Malas (waste products), along with clarity of soul, senses, and mind.",
            "metadata": {"source": "Charak Samhita", "chapter": "Sutra Sthana", "topic": "Definition of Health"}
        },
        {
            "text": "The three pillars of life (Tri-Upastambha) according to Charak Samhita are Ahara (Proper Diet), Nidra (Proper Sleep), and Brahmacharya (Right conduct/Energy management).",
            "metadata": {"source": "Charak Samhita", "chapter": "Sutra Sthana", "topic": "Three Pillars"}
        },
        {
            "text": "Pitta Dosha is responsible for digestion (Paka), heat production, and intellectual clarity. Charak Samhita describes its qualities as slightly oily, hot, sharp, liquid, sour, and moving.",
            "metadata": {"source": "Charak Samhita", "topic": "Pitta Dosha"}
        },
        {
            "text": "Vata Dosha is the principle of movement. Its qualities according to Charak are dry, cold, light, subtle, moving, and non-slimy. It controls all motor and sensory functions.",
            "metadata": {"source": "Charak Samhita", "topic": "Vata Dosha"}
        },
        {
            "text": "Kapha Dosha provides stability and lubrication. Its qualities are heavy, cold, soft, oily, sweet, stable, and slimy. It governs structure and fluid balance.",
            "metadata": {"source": "Charak Samhita", "topic": "Kapha Dosha"}
        },
        {
            "text": "Charak Samhita emphasizes 'Prajnaparadha' (intellectual blasphemy or error of judgment) as the root cause of all diseases.",
            "metadata": {"source": "Charak Samhita", "topic": "Etiology of Disease"}
        },
        {
            "text": "The administration of Rasayana (rejuvenation therapy) aims at attaining longevity, memory, intelligence, health, youthfulness, and excellence of luster and complexion.",
            "metadata": {"source": "Charak Samhita", "chapter": "Chikitsa Sthana", "topic": "Rasayana"}
        },
        {
            "text": "Ritucharya (seasonal regimen) described in Charak Samhita guides the diet and lifestyle changes needed to maintain health during transition of seasons.",
            "metadata": {"source": "Charak Samhita", "topic": "Seasonal Regimen"}
        },
        {
            "text": "Sattva, Rajas, and Tamas are the three Gunas (qualities) of the mind. Charak Samhita states that Sattva is the pure quality that leads to health and clarity.",
            "metadata": {"source": "Charak Samhita", "topic": "Mental Qualities"}
        }
    ]
    
    for item in charak_data:
        memory.add_to_memory(item["text"], item["metadata"])
    
    print(f"Successfully ingested {len(charak_data)} core concepts from Charak Samhita into Vector Memory.")

if __name__ == "__main__":
    seed_charak_samhita()
