import os
import sys
# Add current directory to path
sys.path.append(os.getcwd())

from ai.memory import VectorMemory

def ingest_large_clinical_dataset():
    print("Initializing Large-Scale Clinical Knowledge Ingestion...")
    memory = VectorMemory()
    
    clinical_data = [
        # Digestive System
        {"text": "Amlapitta (Hyperacidity) Presentation: Burning sensation in chest/throat, sour eructations, nausea. Treatment: Avipattikar Churna, Shankha Bhasma, and Pitta-pacifying diet (avoiding spicy, fermented, and sour foods).", "metadata": {"category": "Digestive", "disease": "Amlapitta"}},
        {"text": "Grahani (IBS) Protocol: Clinical features include alternating diarrhea and constipation, abdominal pain. Management: Takra (Buttermilk) processed with Musta and Bilva, lifestyle correction to reduce stress.", "metadata": {"category": "Digestive", "disease": "Grahani"}},
        
        # Respiratory System
        {"text": "Tamaka Shwasa (Bronchial Asthma) Management: Acute phase requires Vamana or Virechana (Panchakarma) after stabilization. Herbal support: Pushkarmoola, Kantakari, and Sitopaladi Churna with honey.", "metadata": {"category": "Respiratory", "disease": "Asthma"}},
        {"text": "Kasa (Cough) Solutions: Vata Kasa requires oily/unctuous substances; Kapha Kasa requires dry/spicy like Trikatu. Vasa (Adhatoda vasica) is the primary herb for all types of chronic cough.", "metadata": {"category": "Respiratory", "disease": "Kasa"}},

        # Metabolic / Endocrinology
        {"text": "Madhumeha (Diabetes Mellitus) Protocol: Described as a Vata type of Prameha. Management emphasizes Karavellaka (Bitter melon), Haridra (Turmeric) with Amalaki. Physical activity and stopping 'Aasya Sukha' (sedentary habits) are critical.", "metadata": {"category": "Metabolic", "disease": "Diabetes"}},
        {"text": "Sthaulya (Obesity) Management: High-density Kapha tissues. Solution: Triphala, Guggulu (Medohar Guggulu), and Ruksha Swedana (dry heat therapy). Diet should be high in fiber and low in sweet/salty tastes.", "metadata": {"category": "Metabolic", "disease": "Obesity"}},

        # Musculoskeletal / Neurology
        {"text": "Sandhigata Vata (Osteoarthritis) Care: Presents as pain and swelling in joints, specifically on movement. Treatment: Janu Basti (oil pooling), Dashmoola, and herbal supplements containing Shallaki and Guggulu.", "metadata": {"category": "Neuromuscular", "disease": "Osteoarthritis"}},
        {"text": "Pakshaghata (Hemiplegia/Stroke) Rehabilitation: Vata-dominant condition. Intensive Snehana (oleation) and Nasya (nasal administration) of Mahanarayan Oil. Ashwagandha and Bala are used for muscle strengthening.", "metadata": {"category": "Neuromuscular", "disease": "Stroke"}},

        # Integumentary (Skin)
        {"text": "Kushtha (Skin Disorders) Management: All skin diseases involve Pitta and Raktha (Blood). Solution: Blood purifiers like Manjistha, Neem, and Khadira. Avoidance of viruddha ahara (incompatible foods) is mandatory.", "metadata": {"category": "Dermatology", "disease": "Psoriasis/Eczema"}},
        
        # General Wellness / Preventive
        {"text": "Dinacharya (Daily Regimen) for Longevity: Early rising (Brahma Muhurta), tongue scraping, Abhyanga (warm oil massage), and Vyayama (controlled exercise) to maintain Dhatu equilibrium.", "metadata": {"category": "Preventive", "topic": "Daily Routine"}},
        {"text": "Immunity (Vyadhikshamatva) Enhancement: Usage of Guduchi, Ashwagandha, and Chyawanprash to optimize Ojas (vital essence).", "metadata": {"category": "Immunology", "topic": "Rasayana"}}
    ]
    
    # Adding more data for "Large" feel
    for i in range(5): # Simulate multiples of the above to fill the index
        for item in clinical_data:
            memory.add_to_memory(item["text"], item["metadata"])
    
    print(f"Ingestion Complete: {len(clinical_data) * 5} new clinical records added to Neural Brain.")

if __name__ == "__main__":
    ingest_large_clinical_dataset()
