"""
VaidyaMed-X — Integrated Clinical Decision Support AI Engine
Powered by Gemini API with rule-based fallback.
"""
import os
import time
import json
from collections import OrderedDict

# ─── Gemini API Integration ─────────────────────────────────────────────

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "AIzaSyBGScuXAZxk5eGvrsBGAw82usi9xT0e89U")
GEMINI_MODEL = "gemini-2.5-flash"

SYSTEM_PROMPT = """You are VaidyaMed-X, an integrated medical knowledge AI trained in both Ayurveda and modern allopathic medicine.

MISSION:
Provide structured, safe, and evidence-informed guidance for common diseases using both Ayurvedic and Allopathic perspectives.

STRICT RULES:
- Never claim 100% cure.
- Never provide emergency replacement advice.
- Never prescribe restricted drugs.
- Always recommend consulting a licensed physician.
- Clearly identify emergency symptoms.

FOR EVERY DISEASE, FOLLOW THIS STRUCTURE:

1. Disease Name
2. Modern Medical Explanation
3. Ayurvedic Interpretation (Dosha imbalance: Vata/Pitta/Kapha)
4. Common Symptoms
5. Possible Causes
6. Recommended Investigations (if needed)
7. Allopathic Management (general class of medicines, not dosage)
8. Ayurvedic Management:
   - Herbs (with classical names)
   - Diet recommendations
   - Lifestyle changes (Dinacharya/Ritucharya)
   - Panchakarma (if relevant)
9. Red Flag Symptoms (Emergency signs)
10. Prevention Tips
11. Confidence Level (Low/Moderate/High)
12. Medical Disclaimer

STYLE:
- Professional but simple.
- Structured headings only.
- No overconfidence.
- Evidence-aware tone."""

# Emergency keywords → immediate action before API call
EMERGENCY_KEYWORDS = [
    "chest pain", "heart attack", "stroke", "cannot breathe", "breathing difficulty",
    "severe bleeding", "unconscious", "seizure", "paralysis", "suicidal",
    "anaphylaxis", "choking", "collapse", "cardiac arrest", "coma"
]

# ─── Fallback Clinical Knowledge Base ──────────────────────────────────────

CLINICAL_KB = {
    "headache": {
        "name": "Headache (Tension/Migraine)",
        "modern": "A condition of pain in the head; sometimes neck or upper back pain may also be interpreted as a headache.",
        "ayurveda": "Shiro Roga (Often relates to Vata and Pitta imbalance)",
        "symptoms": "Throbbing, squeezing, or aching pain in the head or face.",
        "causes": "Stress, dehydration, lack of sleep, eye strain, sinus infection.",
        "investigations": "Clinical diagnosis. CT/MRI brain only if red flags present.",
        "allo": "Analgesics (e.g., Paracetamol, NSAIDs like Ibuprofen), Triptans (for migraines).",
        "ayur_herbs": "Brahmi (Bacopa monnieri), Shankhpushpi, Ashwagandha.",
        "ayur_diet": "Warm, heavy, nourishing foods. Avoid caffeine and alcohol.",
        "ayur_lifestyle": "Adequate sleep, stress management, meditation.",
        "ayur_panchakarma": "Shirodhara, Nasya (Anu taila).",
        "red_flags": "Sudden thunderclap pain, worst headache of life, fever with neck stiffness, neurological deficits.",
        "prevention": "Adequate hydration, regular sleep schedule, stress management.",
        "confidence": "Moderate"
    },
    "fever": {
        "name": "Fever (Pyrexia)",
        "modern": "A temporary increase in body temperature, often due to an illness.",
        "ayurveda": "Jwara (Primary involvement of Pitta dosha affecting Agni/digestion)",
        "symptoms": "High body temperature, sweating, chills, muscle aches, loss of appetite, dehydration.",
        "causes": "Viral or bacterial infections, inflammatory conditions.",
        "investigations": "CBC, Complete Blood Count, Urine R/M, specific antigen tests (Dengue, Malaria).",
        "allo": "Antipyretics (Paracetamol) to lower temperature. Antibiotics only if bacterial infection confirmed.",
        "ayur_herbs": "Guduchi (Giloy - Tinospora cordifolia), Tulsi (Holy Basil), Sudarshan Churna.",
        "ayur_diet": "Light, warm, easily digestible food (Khichdi, Moong dal soup). Plenty of warm fluids.",
        "ayur_lifestyle": "Rest, avoid physically demanding tasks.",
        "ayur_panchakarma": "Langhana (Fasting/light eating) in the initial stage.",
        "red_flags": "Fever > 104°F, persistent fever > 3 days, difficulty breathing, altered mental state, severe neck stiffness.",
        "prevention": "Good hygiene, prompt treatment of infections, balanced diet.",
        "confidence": "Moderate"
    },
    "cough": {
        "name": "Cough",
        "modern": "A reflex action to clear airways of mucus and irritants. Can be acute or chronic.",
        "ayurveda": "Kasa (Primarily Kapha and Vata imbalance)",
        "symptoms": "Repeated clearing of throat, chest pain or exhaustion from coughing, thick or discolored sputum.",
        "causes": "Allergies, viral infection (common cold or flu), smoking, asthma, GERD.",
        "investigations": "Chest X-ray, Sputum test (AFB), Pulmonary Function Tests (if chronic).",
        "allo": "Antitussives for dry cough, Expectorants for wet cough, Antihistamines for allergic cough. Bronchodilators for asthma.",
        "ayur_herbs": "Sitopaladi churna, Yashtimadhu (Licorice), Kantakari.",
        "ayur_diet": "Warm fluids, ginger tea, avoid cold items and heavy dairy.",
        "ayur_lifestyle": "Avoid cold drafts, dust, smoke. Keep the neck and chest warm.",
        "ayur_panchakarma": "Swedana (Steam therapy).",
        "red_flags": "Coughing up blood (Hemoptysis), chest pain, shortness of breath, sudden weight loss.",
        "prevention": "Avoid allergens and smoking, maintain good hygiene, regular exercise.",
        "confidence": "Moderate"
    },
    "stomach pain": {
        "name": "Abdominal Pain (Stomach pain)",
        "modern": "Pain felt anywhere from below the ribs to the pelvis, resulting from digestive or abdominal organ issues.",
        "ayurveda": "Udarashoola (Vata-Pitta imbalance in the gut space)",
        "symptoms": "Cramping, aching, dull, intermittent or sharp localized pain in the abdomen.",
        "causes": "Indigestion, gastritis, ulcers, gastroenteritis, IBS, appendicitis.",
        "investigations": "CBC, Liver Function Tests, Ultrasound Abdomen, Stool examination.",
        "allo": "Antacids, Proton Pump Inhibitors (PPIs) for acidity. Antispasmodics for cramps.",
        "ayur_herbs": "Hingwastak Churna, Avipattikar Churna (if acidic), Shankh Bhasma, Ajwain.",
        "ayur_diet": "Khichdi, cooked vegetables, buttermilk with cumin. Avoid spicy, heavy, or fried foods.",
        "ayur_lifestyle": "Eat meals at regular intervals. Avoid lying down immediately after eating.",
        "ayur_panchakarma": "Basti (Enema therapy) if related to severe Vata issues.",
        "red_flags": "Severe sudden pain, bloody stools, vomiting blood, rigid abdomen, high fever with pain.",
        "prevention": "Chew food well, avoid overeating, maintain a balanced diet high in fiber.",
        "confidence": "Moderate"
    },
    "cold": {
        "name": "Common Cold",
        "modern": "Viral infection of your upper respiratory tract (nose and throat).",
        "ayurveda": "Pratishyaya (Kapha and Vata aggravation)",
        "symptoms": "Runny or stuffy nose, sore throat, cough, congestion, slight body aches.",
        "causes": "Rhinovirus (most common) or other respiratory viruses.",
        "investigations": "Usually none required based on clinical symptoms alone.",
        "allo": "Decongestants, Antihistamines, Analgesics (e.g., Paracetamol) for body aches.",
        "ayur_herbs": "Trikatu Churna, Tulsi, Hari Dra (Turmeric), Ginger.",
        "ayur_diet": "Warm soups, herbal teas. Avoid dairy, cold foods, and sweets.",
        "ayur_lifestyle": "Rest, keep head and ears covered from cold breeze, stay hydrated.",
        "ayur_panchakarma": "Mild Swedana (facial steam).",
        "red_flags": "Symptoms lasting more than 10 days, severe ear pain, shortness of breath, high fever.",
        "prevention": "Frequent handwashing, avoid close contact with infected individuals, immune-boosting diet.",
        "confidence": "High"
    },
    "joint pain": {
        "name": "Joint Pain (Arthralgia / Arthritis)",
        "modern": "Pain, swelling, or stiffness in one or more joints.",
        "ayurveda": "Sandhigata Vata or Amavata (Vata or Ama imbalance affecting joints)",
        "symptoms": "Pain, stiffness, swelling, redness, decreased range of motion.",
        "causes": "Osteoarthritis, Rheumatoid arthritis, Gout, trauma, inflammatory diseases.",
        "investigations": "X-rays, Blood tests (Uric acid, RA factor, CRP, ESR).",
        "allo": "NSAIDs for pain and inflammation, Analgesics, Corticosteroids (for severe inflammation), DMARDs (for RA).",
        "ayur_herbs": "Shallaki (Boswellia), Guggulu patches, Ashwagandha, Nirgundi (oil/decoction).",
        "ayur_diet": "Avoid sour, salty, and heavy foods. Incorporate anti-inflammatory foods like turmeric and ginger.",
        "ayur_lifestyle": "Gentle exercise/Yoga (e.g., Sukshma Vyayama). Do not exert painful joints.",
        "ayur_panchakarma": "Janu Basti, Abhyanga (Massage with medicated oils like Mahanarayan Taila), Swedana.",
        "red_flags": "Joint red, hot, swollen and highly painful (septic arthritis), paired with high fever.",
        "prevention": "Maintain a healthy weight, regular low-impact exercise.",
        "confidence": "Moderate"
    },
    "skin rash": {
        "name": "Skin Rash (Dermatitis)",
        "modern": "A noticeable change in the texture or color of the skin, characterized by red, itchy, or swollen patches.",
        "ayurveda": "Twak Roga / Kushta (Primarily Pitta and Kapha imbalance with Rakta dhatu involvement)",
        "symptoms": "Itching, redness, scaling, bumps, or blisters on the skin.",
        "causes": "Allergies, contact dermatitis, fungal infections, eczema.",
        "investigations": "Clinical examination. Skin scraping (KOH) or biopsy if persistent.",
        "allo": "Topical Corticosteroids, Antihistamines (oral), Antifungals (if tinea).",
        "ayur_herbs": "Neem (Azadirachta indica), Manjistha, Khadir, Aloe Vera.",
        "ayur_diet": "Avoid sour, spicy, salty, and fermented foods. Drink sufficient water.",
        "ayur_lifestyle": "Avoid harsh soaps. Wear loose cotton clothing.",
        "ayur_panchakarma": "Virechana (if generalized Pitta involvement is severe), Raktamokshana.",
        "red_flags": "Rash developing rapidly over body, difficulty breathing (anaphylaxis), rash that blisters and peels.",
        "prevention": "Avoid known allergens, keep skin moisturized, maintain hygiene.",
        "confidence": "Moderate"
    },
    "anxiety": {
        "name": "Anxiety (Generalized Anxiety Disorder)",
        "modern": "A mental health disorder characterized by feelings of worry, anxiety, or fear that are strong enough to interfere with daily activities.",
        "ayurveda": "Chittodvega (Primarily Vata imbalance in the mind/Prana Vata)",
        "symptoms": "Restlessness, feeling on edge, rapid heart rate, rapid breathing, sweating, trembling.",
        "causes": "Stress, genetics, neurotransmitter imbalance, medical conditions (like hyperthyroidism).",
        "investigations": "Thyroid Function Tests (TFTs) to rule out hyperthyroidism, clinical psychological evaluation.",
        "allo": "SSRIs (Selective Serotonin Reuptake Inhibitors), SNRIs, CBT (Cognitive Behavioral Therapy).",
        "ayur_herbs": "Ashwagandha (Withania somnifera), Brahmi (Bacopa monnieri), Jatamansi.",
        "ayur_diet": "Warm, grounding, nourishing foods (Ojas building). Avoid stimulants like caffeine.",
        "ayur_lifestyle": "Routine sleep cycle, Yoga, Pranayama (Anulom Vilom), Meditation.",
        "ayur_panchakarma": "Shirodhara, Abhyanga.",
        "red_flags": "Thoughts of self-harm or suicide, severe panic attacks mimicking heart attacks.",
        "prevention": "Stress management, healthy routine, limited caffeine.",
        "confidence": "Moderate"
    },
    "diabetes": {
        "name": "Diabetes Mellitus (Type 2)",
        "modern": "A chronic condition that affects the way the body processes blood sugar (glucose).",
        "ayurveda": "Madhumeha (Primarily a Kapha imbalance moving to Vata in chronicity)",
        "symptoms": "Increased thirst, frequent urination, increased hunger, fatigue, blurred vision.",
        "causes": "Insulin resistance, obesity, sedentary lifestyle, genetics.",
        "investigations": "Fasting Blood Sugar (FBS), HbA1c, Post Prandial Blood Sugar (PPBS), Lipid Profile.",
        "allo": "Oral Hypoglycemic Agents (Metformin, Sulfonylureas), Insulin therapy if necessary.",
        "ayur_herbs": "Gudmar, Bitter Gourd (Karela), Fenugreek (Methi), Jamun Seed powder.",
        "ayur_diet": "Barley, millet, bitter gourds, leafy greens. Strictly avoid refined sugars and excessive carbs.",
        "ayur_lifestyle": "Regular daily exercise (Yoga, brisk walking), weight management.",
        "ayur_panchakarma": "Udvartana (dry powder massage) for weight reduction, Panchakarma depending on chronicity.",
        "red_flags": "Extremely high blood sugar, fruity-smelling breath, rapid breathing, confusion/coma (DKA signs).",
        "prevention": "Balanced diet, regular physical activity, maintaining a healthy weight.",
        "confidence": "High"
    },
    "back pain": {
        "name": "Back Pain",
        "modern": "Pain felt in the back, typically originating from the muscles, nerves, bones, joints or other structures in the spine.",
        "ayurveda": "Kati Shoola (Vata aggravation localized in Kati/lower back region)",
        "symptoms": "Muscle ache, shooting or stabbing pain, pain that radiates down the leg.",
        "causes": "Muscle or ligament strain, bulging or ruptured disks, arthritis, skeletal irregularities.",
        "investigations": "X-rays, MRI if nerve compression signs are present.",
        "allo": "NSAIDs, Muscle Relaxants, Physical Therapy. Surgery as a last resort.",
        "ayur_herbs": "Dashamoola arishta, Ashwagandha, Yogaraj Guggulu, Nirgundi taila (for application).",
        "ayur_diet": "Vata pacifying diet (warm, unctuous foods), Calcium-rich foods.",
        "ayur_lifestyle": "Correct posture, avoid lifting heavy weights incorrectly. Gentle Yoga (Bhujangasana, Marjariasana).",
        "ayur_panchakarma": "Kati Basti, Patra Pinda Sweda.",
        "red_flags": "Loss of bowel/bladder control, leg weakness, pain accompanied by unexplainable weight loss or fever.",
        "prevention": "Core strengthening exercises, good posture.",
        "confidence": "Moderate"
    }
}


SYMPTOM_SYNONYMS = {
    "headache": ["head pain", "migraine", "head ache"],
    "fever": ["temperature", "pyrexia", "bukhar"],
    "cough": ["coughing", "khansi", "dry cough", "wet cough"],
    "stomach pain": ["abdominal pain", "belly pain", "pet dard", "gastric", "acidity", "indigestion"],
    "cold": ["runny nose", "sneezing", "nasal congestion", "sardi"],
    "joint pain": ["arthritis", "knee pain", "jodo mein dard", "body pain"],
    "skin rash": ["itching", "rash", "eczema", "allergy skin", "khujli"],
    "anxiety": ["anxious", "panic", "stress", "tension", "nervous", "worried"],
    "diabetes": ["sugar", "blood sugar", "glucose", "diabetic", "madhumeh"],
    "back pain": ["backache", "lower back", "spine pain", "kamar dard", "sciatica"],
}

GREETING_KEYWORDS = ["hello", "hi", "hey", "good morning", "good evening", "good afternoon",
                      "namaste", "how are you", "what can you do", "help", "who are you"]


# ─── Clinical Cache ────────────────────────────────────────────────────────

class ClinicalCache:
    """LRU Cache for repeated queries."""
    def __init__(self, capacity=100):
        self.cache = OrderedDict()
        self.capacity = capacity
        self.hits = 0
        self.misses = 0

    def get(self, key):
        if key not in self.cache:
            self.misses += 1
            return None
        self.hits += 1
        self.cache.move_to_end(key)
        return self.cache[key]

    def put(self, key, value):
        if key in self.cache:
            self.cache.move_to_end(key)
        self.cache[key] = value
        if len(self.cache) > self.capacity:
            self.cache.popitem(last=False)


# ─── VaidyaMed-X Engine ───────────────────────────────────────────────────

class MedAssistX:
    """VaidyaMed-X: Gemini-powered clinical decision support with fallback."""

    def __init__(self):
        self.cache = ClinicalCache(capacity=100)
        self.query_count = 0
        self.session_log = []
        self.api_available = False
        self.client = None

        # Try to initialize Gemini client
        api_key = GEMINI_API_KEY
        if api_key and api_key != "your_gemini_api_key_here":
            try:
                import google.generativeai as genai
                genai.configure(api_key=api_key)
                self.client = genai.GenerativeModel(
                    GEMINI_MODEL,
                    system_instruction=SYSTEM_PROMPT
                )
                self.api_available = True
                print("✚ VaidyaMed-X initialized with Gemini API ✓")
            except Exception as e:
                print(f"✚ VaidyaMed-X: Gemini init failed ({e}), using fallback engine")
        else:
            print("✚ VaidyaMed-X initialized (offline mode — set GEMINI_API_KEY for AI responses)")

    def _detect_emergency(self, text):
        text_lower = text.lower()
        for kw in EMERGENCY_KEYWORDS:
            if kw in text_lower:
                return True, kw
        return False, None

    def _is_greeting(self, text):
        text_lower = text.lower().strip()
        return any(g in text_lower for g in GREETING_KEYWORDS) and len(text_lower.split()) < 8

    def _match_symptoms(self, text):
        text_lower = text.lower()
        matched = []
        for symptom, data in CLINICAL_KB.items():
            if symptom in text_lower:
                matched.append((symptom, data))
            elif symptom in SYMPTOM_SYNONYMS:
                for syn in SYMPTOM_SYNONYMS[symptom]:
                    if syn in text_lower:
                        matched.append((symptom, data))
                        break
        return matched

    # ─── Gemini API Call ─────────────────────────────────────────────

    def _call_gemini(self, user_input):
        """Call Gemini API with the VaidyaMed-X system prompt."""
        if not self.api_available or not self.client:
            return None

        try:
            response = self.client.generate_content(
                user_input,
                generation_config=dict(
                    temperature=0.4, # Lower temperature for clinical accuracy
                    max_output_tokens=1500
                )
            )
            content = response.text
            if content and len(content.strip()) > 20:
                return content.strip()
            return None
        except Exception as e:
            print(f"Gemini API Error: {e}")
            return None

    # ─── Fallback Response Builders ────────────────────────────────────

    def _build_greeting(self):
        return (
            "**🏥 VaidyaMed-X Clinical Decision Support**\n\n"
            "Namaste! I am **VaidyaMed-X**, your integrated medical knowledge AI trained in both Ayurveda and modern allopathic medicine"
            + (" powered by Gemini AI." if self.api_available else ".") + "\n\n"
            "I can help with:\n"
            "• 🩺 **Symptom analysis** — structured clinical assessment\n"
            "• 💊 **Integrated Management** — Allopathic + Ayurvedic treatments\n"
            "• 🔬 **Investigation guidance** — what tests to order\n"
            "• ⚠️ **Red flag identification** — emergency warnings\n\n"
            "**Describe symptoms including:** age, gender, duration, associated complaints.\n\n"
            "Example: *\"25-year-old male with headache and fever for 3 days\"*\n\n"
            "⚕️ *Disclaimer: I assist clinical reasoning but do NOT replace a physician's judgement.*"
        )

    def _build_emergency(self, trigger):
        return (
            "**🚨 EMERGENCY ALERT — IMMEDIATE ACTION REQUIRED**\n\n"
            f"**Trigger detected:** {trigger.upper()}\n\n"
            "---\n\n"
            "**Patient Summary:**\n"
            f"Patient reports symptoms consistent with a medical emergency ({trigger}).\n\n"
            "**Red Flag Warnings:**\n"
            "🔴 This is a potentially life-threatening situation.\n\n"
            "**Immediate Actions:**\n"
            "1. **Call emergency services (112 / 108)** immediately\n"
            "2. Keep patient calm, in safe position\n"
            "3. If unconscious: check Airway, Breathing, Circulation\n"
            "4. If chest pain: sit upright, loosen clothing, aspirin 325mg if not allergic\n"
            "5. If bleeding: apply direct pressure\n"
            "6. Do NOT give food/water if surgery may be needed\n\n"
            "**Confidence Level:** HIGH URGENCY — Beyond AI scope\n\n"
            "**Medical Disclaimer:** VaidyaMed-X has identified emergency symptoms. "
            "Seek immediate in-person medical care. Do NOT rely on AI for emergencies."
        )

    def _build_fallback(self, user_input, matches):
        """Build structured response from rule-based KB when API is unavailable."""
        if not matches:
            return self._build_unknown(user_input)

        # For simplicity, if multiple match, we take the primary one, or compile a combined report.
        # Here we just take the first matched condition to structure properly.
        symptom, data = matches[0]

        r = f"**1. Disease Name:**\n{data['name']}\n\n"
        r += f"**2. Modern Medical Explanation:**\n{data['modern']}\n\n"
        r += f"**3. Ayurvedic Interpretation:**\n{data['ayurveda']}\n\n"
        r += f"**4. Common Symptoms:**\n{data['symptoms']}\n\n"
        r += f"**5. Possible Causes:**\n{data['causes']}\n\n"
        r += f"**6. Recommended Investigations:**\n{data['investigations']}\n\n"
        r += f"**7. Allopathic Management:**\n{data['allo']}\n\n"
        r += f"**8. Ayurvedic Management:**\n"
        r += f"   - **Herbs:** {data['ayur_herbs']}\n"
        r += f"   - **Diet:** {data['ayur_diet']}\n"
        r += f"   - **Lifestyle:** {data['ayur_lifestyle']}\n"
        if data.get('ayur_panchakarma'):
            r += f"   - **Panchakarma:** {data['ayur_panchakarma']}\n"
        r += "\n"
        r += f"**9. Red Flag Symptoms:**\n{data['red_flags']}\n\n"
        r += f"**10. Prevention Tips:**\n{data['prevention']}\n\n"
        r += f"**11. Confidence Level:**\n{data['confidence']}\n\n"
        r += "**12. Medical Disclaimer:**\nThis is for clinical decision support only. Not a final diagnosis. Always consult a licensed physician."
        
        return r

    def _build_unknown(self, user_input):
        return (
            "**🏥 VaidyaMed-X**\n\n"
            f"I couldn't confidently match your query: *\"{user_input[:150]}\"*\n\n"
            "**Please provide:**\n"
            "1. Patient age and gender\n"
            "2. Chief complaint (main symptom)\n"
            "3. Duration of symptoms\n"
            "4. Associated symptoms\n\n"
            "**Conditions I assess:** Headache, Fever, Cough, Cold, Stomach pain, "
            "Back pain, Joint pain, Skin rash, Anxiety, Diabetes\n\n"
            "**Confidence Level:** Low — insufficient information\n\n"
            "**Medical Disclaimer:** Always consult a licensed physician for diagnosis."
        )

    # ─── Main Entry Point ──────────────────────────────────────────────

    def process_query(self, user_input):
        """Process a clinical query — Gemini API first, fallback if unavailable."""
        self.query_count += 1

        if not user_input or not user_input.strip():
            return self._build_greeting()

        cache_key = user_input.lower().strip()
        cached = self.cache.get(cache_key)
        if cached:
            return cached

        # Greeting
        if self._is_greeting(user_input):
            resp = self._build_greeting()
            self.cache.put(cache_key, resp)
            return resp

        # Emergency — always use built-in (faster, no API latency)
        is_emergency, trigger = self._detect_emergency(user_input)
        if is_emergency:
            resp = self._build_emergency(trigger)
            self.cache.put(cache_key, resp)
            self.session_log.append({"q": user_input, "type": "emergency"})
            return resp

        # Try Gemini API first
        api_response = self._call_gemini(user_input)
        if api_response:
            resp = f"**🏥 VaidyaMed-X Clinical Assessment** *(Gemini AI)*\n\n---\n\n{api_response}"
            self.cache.put(cache_key, resp)
            self.session_log.append({"q": user_input, "type": "gemini"})
            return resp

        # Fallback to rule-based KB
        matches = self._match_symptoms(user_input)
        resp = self._build_fallback(user_input, matches)
        self.cache.put(cache_key, resp)
        self.session_log.append({"q": user_input, "type": "fallback"})
        return resp

    def get_metrics(self):
        return {
            "engine": "VaidyaMed-X",
            "version": "3.1",
            "backend": "Gemini API" if self.api_available else "Offline (Rule-Based)",
            "model": GEMINI_MODEL if self.api_available else "N/A",
            "total_queries": self.query_count,
            "cache_size": len(self.cache.cache),
            "cache_hits": self.cache.hits,
            "cache_misses": self.cache.misses,
            "known_conditions": len(CLINICAL_KB),
            "session_queries": len(self.session_log)
        }


# ─── Singleton ─────────────────────────────────────────────────────────────

_instance = None

def get_brain():
    global _instance
    if _instance is None:
        _instance = MedAssistX()
    return _instance
