"""
VaidyaMed-X — Integrated Clinical Decision Support AI Engine
Powered by Gemini API with rule-based fallback.
"""
import os
import re
import time
import json
import math
from collections import OrderedDict

# Adjust path to import database connection if called from backend directory
import sys
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
try:
    from database import get_db_connection
except ImportError:
    def get_db_connection(): return None

# ─── Gemini API Integration ─────────────────────────────────────────────

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "AIzaSyByDFMLB2rbTpgKm9MIjZtbUpVizfIgOJI")
GEMINI_MODEL = "gemini-pro"

# ─── System Prompt ──────────────────────────────────────────────────────

BASE_SYSTEM_PROMPT = """Tu ek real insaan ki tarah baat karta hai — VaidyaMed-X tera naam hai, jo ek friendly doctor friend hai.

Sabse important rule:
→ Har message ka jawab de. Koi bhi message ignore mat kar.
→ Normal baat = normal jawab. Medical baat = doctor ki tarah jawab.
→ Kabhi bhi robot ya AI jaisi feeling nahi aani chahiye.

Personality:
- Tu ek WhatsApp friend hai jo doctor bhi hai
- Short, casual, warm replies deta hai
- Emojis use karta hai occasionally (overdone nahi)
- Kabhi "Certainly!" ya "Of course!" nahi kehta
- Kabhi "As an AI..." nahi kehta — tu ek dost hai

Language rule:
- User jo language mein likhe, usi mein jawab de
- Hindi → Hindi, Hinglish → Hinglish, English → English
- Mix language = mix mein jawab

Har type ke message ka jawab:
1. Hi/Hello/Hey → "Heyy! Kya chal raha? 😄"
2. Naam batana ("main Govind hun") → "Arre Govind! Kya haal hai? 😊"
3. Kaise ho → "Badhiya! Tum batao, sab theek hai? 😊"
4. Medical symptoms → samajh ke follow-up poocho, phir simple advice do
5. Random questions (news, food, life) → respond naturally, gently connect to health if relevant
6. Emotional/personal baat → empathize first, then help
7. Koi bhi unclear message → naturally poocho "Thoda aur batao? 😊"

Memory rule:
- User ne jo kuch bhi bataya (naam, symptoms, history) — yaad rakho
- Dobara puchne ki zaroorat nahi agar pehle bata diya hai
- Naam ka use naturally karo, baar baar nahi, sirf thoda

Medical advice style:
- Pehle concern acknowledge karo warmly
- 1-2 smart follow-up questions poocho
- Simple language mein samjhao (no jargon)
- Safe home remedy + OTC suggestion do
- Doctor referral sirf agar actually zaroorat ho
- Red flags tabhi batao jab serious ho

Never do:
- Long robotic bullet lists unless genuinely needed
- Copy-paste template responses
- Start with "I understand that..."
- Repeat same phrase structure twice in a row
- Sound clinical or formal in casual conversation

Examples:
User: hi → "Heyy! 😄 Sab theek?"
User: main Govind hun → "Arre Govind! Mast! Kya scene hai? Koi problem hai?"
User: I have headache → "Oh! Headache kab se hai? Throbbing feel ho raha hai ya dull pain?"
User: bored hun → "Haha samajh sakta hun 😄 Thoda walk pe jaao, 15 min mein dimag fresh ho jaega!"
User: what is diabetes → "Diabetes mein body properly glucose use nahi kar paata. Type 2 mein insulin resist hoti hai — basically sugar control nahi hota. Kisi ko hai tere ghar mein?"
"""

# ─── Emergency keywords → immediate action before API call ──────────────
EMERGENCY_KEYWORDS = [
    "chest pain", "heart attack", "stroke", "cannot breathe", "breathing difficulty",
    "severe bleeding", "unconscious", "seizure", "paralysis", "suicidal",
    "anaphylaxis", "choking", "collapse", "cardiac arrest", "coma",
    "severe headache sudden", "saans nahi aa raha", "dil ka dora", "behosh",
    "khoon bahut aa raha", "nahi uth raha", "pet mein bahut dard", "gardan akad gayi"
]

# ─── Expanded Clinical Knowledge Base ───────────────────────────────────

CLINICAL_KB = {
    "headache": {
        "name": "Headache (Tension/Migraine)",
        "modern": "Pain in the head, scalp, or neck — most commonly tension-type or migraine.",
        "ayurveda": "Shiro Roga — often Vata & Pitta imbalance.",
        "symptoms": "Throbbing, squeezing, or aching pain in the head or face.",
        "causes": "Stress, dehydration, lack of sleep, eye strain, screen time, sinus.",
        "investigations": "Clinical diagnosis. CT/MRI only if red flags present.",
        "allo": "Paracetamol 500-650mg. Ibuprofen for moderate pain. Triptans for migraine.",
        "home_remedies": "Cold/warm compress on forehead. Rest in dark quiet room. Ginger tea. Peppermint oil on temples.",
        "ayur_herbs": "Brahmi, Shankhpushpi, Ashwagandha.",
        "ayur_diet": "Warm nourishing foods. Avoid caffeine, alcohol.",
        "ayur_lifestyle": "Adequate sleep, meditation, yoga.",
        "ayur_panchakarma": "Shirodhara, Nasya.",
        "red_flags": "Sudden thunderclap pain, worst headache of life, fever with neck stiffness, vision changes.",
        "prevention": "Stay hydrated, regular sleep, manage screen time.",
        "confidence": "Moderate"
    },
    "fever": {
        "name": "Fever (Pyrexia)",
        "modern": "Body temperature above 98.6°F/37°C, typically due to infection.",
        "ayurveda": "Jwara — Pitta dosha imbalance affecting Agni.",
        "symptoms": "High temperature, sweating, chills, body aches, weakness, loss of appetite.",
        "causes": "Viral/bacterial infections, inflammatory conditions, dengue, malaria, typhoid.",
        "investigations": "CBC, Dengue NS1 antigen, Malaria antigen, Urine R/M, Widal test if typhoid suspected.",
        "allo": "Paracetamol 500-650mg every 6 hours. Stay hydrated. Antibiotics ONLY if bacterial.",
        "home_remedies": "Wet cloth on forehead. ORS to prevent dehydration. Tulsi + ginger tea. Rest.",
        "ayur_herbs": "Guduchi (Giloy), Tulsi, Sudarshan Churna.",
        "ayur_diet": "Khichdi, moong dal soup, warm fluids. Avoid heavy/spicy food.",
        "ayur_lifestyle": "Rest completely.",
        "ayur_panchakarma": "Langhana (light fasting) in early stage.",
        "red_flags": "Fever >104°F, persistent >3 days, difficulty breathing, neck stiffness, rash.",
        "prevention": "Hygiene, mosquito protection, clean water.",
        "confidence": "Moderate"
    },
    "cough": {
        "name": "Cough",
        "modern": "Reflex to clear airways — can be acute (viral) or chronic (asthma, TB, GERD).",
        "ayurveda": "Kasa — Kapha & Vata imbalance.",
        "symptoms": "Repeated throat clearing, chest tightness, thick sputum, breathlessness.",
        "causes": "Common cold, flu, asthma, smoking, GERD, TB, allergies.",
        "investigations": "Chest X-ray, sputum AFB (if >3 weeks), PFT for asthma.",
        "allo": "Dry cough: Dextromethorphan/Benzonatate. Wet cough: Ambroxol/Bromhexine. Asthma: Salbutamol inhaler.",
        "home_remedies": "Honey + ginger + lemon tea. Steam inhalation. Turmeric milk at night. Gargle with warm salt water.",
        "ayur_herbs": "Sitopaladi churna, Yashtimadhu (licorice), Kantakari, Vasa.",
        "ayur_diet": "Warm fluids, ginger tea. Avoid cold drinks, ice cream, dairy.",
        "ayur_lifestyle": "Avoid dust, smoke, cold air. Steam twice daily.",
        "ayur_panchakarma": "Swedana (steam therapy).",
        "red_flags": "Coughing blood, chest pain, shortness of breath, sudden weight loss, cough >3 weeks.",
        "prevention": "No smoking, avoid allergens, wash hands regularly.",
        "confidence": "Moderate"
    },
    "stomach pain": {
        "name": "Abdominal Pain",
        "modern": "Pain anywhere below ribs to pelvis from digestive or abdominal organ issues.",
        "ayurveda": "Udarashoola — Vata-Pitta imbalance in the gut.",
        "symptoms": "Cramping, bloating, nausea, gas, diarrhea or constipation accompanying pain.",
        "causes": "Indigestion, gastritis, ulcers, IBS, food poisoning, appendicitis, kidney stones.",
        "investigations": "CBC, LFT, Ultrasound abdomen, stool examination.",
        "allo": "Antacids (Eno, Gelusil). PPI (Omeprazole) for acidity. ORS for loose motions. Antispasmodics (Meftal Spas) for cramps.",
        "home_remedies": "Ajwain (carom seeds) with warm water for gas. Jeera water for indigestion. Hing (asafoetida) paste on navel for colic. Coconut water for dehydration.",
        "ayur_herbs": "Hingwastak Churna, Avipattikar Churna, Shankh Bhasma, Ajwain.",
        "ayur_diet": "Khichdi, cooked vegetables, buttermilk with cumin. Avoid spicy, fried foods.",
        "ayur_lifestyle": "Eat at regular intervals. Don't lie down after meals.",
        "ayur_panchakarma": "Basti (enema therapy) for severe Vata.",
        "red_flags": "Sudden severe pain, bloody stools, vomiting blood, rigid abdomen, high fever with pain.",
        "prevention": "Eat slowly, chew well, avoid overeating, high-fiber diet.",
        "confidence": "Moderate"
    },
    "cold": {
        "name": "Common Cold",
        "modern": "Viral infection of upper respiratory tract (nose and throat).",
        "ayurveda": "Pratishyaya — Kapha & Vata aggravation.",
        "symptoms": "Runny/stuffy nose, sore throat, mild fever, sneezing, watery eyes.",
        "causes": "Rhinovirus (most common), adenovirus, coronavirus variants.",
        "investigations": "Usually none needed.",
        "allo": "Cetrizine for runny nose/sneezing. Paracetamol for fever/body ache. Nasal decongestant drops (Nasivion).",
        "home_remedies": "Kadha: Tulsi + ginger + black pepper + honey boiled in water. Steam inhalation with Vicks. Warm saline nasal rinse. Turmeric milk.",
        "ayur_herbs": "Trikatu Churna, Tulsi, Haridra (Turmeric), Ginger.",
        "ayur_diet": "Warm soups, herbal teas. Avoid dairy, cold foods, sweets.",
        "ayur_lifestyle": "Rest, keep warm, stay hydrated.",
        "ayur_panchakarma": "Mild facial steam (Swedana).",
        "red_flags": "Symptoms >10 days, severe ear pain, shortness of breath, high fever.",
        "prevention": "Hand washing, avoid sick contact, vitamin C foods.",
        "confidence": "High"
    },
    "joint pain": {
        "name": "Joint Pain (Arthralgia/Arthritis)",
        "modern": "Pain, swelling, or stiffness in one or more joints.",
        "ayurveda": "Sandhigata Vata or Amavata.",
        "symptoms": "Pain, stiffness, swelling, reduced range of motion, morning stiffness.",
        "causes": "Osteoarthritis (wear & tear), Rheumatoid arthritis, Gout, Sports injury, Vitamin D deficiency.",
        "investigations": "X-ray, Uric acid, RA Factor, CRP, ESR, Vitamin D3 levels.",
        "allo": "NSAIDs (Diclofenac, Ibuprofen). Calcium + Vitamin D3 supplement. Physiotherapy.",
        "home_remedies": "Hot/cold compress. Turmeric + ginger tea. Massage with warm mustard oil. Light stretching.",
        "ayur_herbs": "Shallaki (Boswellia), Guggulu, Ashwagandha, Nirgundi oil for application.",
        "ayur_diet": "Anti-inflammatory foods (turmeric, ginger). Avoid sour, salty, processed foods.",
        "ayur_lifestyle": "Gentle yoga, swimming, avoid heavy lifting.",
        "ayur_panchakarma": "Janu Basti, Abhyanga (oil massage), Swedana.",
        "red_flags": "Joint red/hot/swollen with high fever (septic arthritis — emergency).",
        "prevention": "Healthy weight, regular low-impact exercise, Vitamin D.",
        "confidence": "Moderate"
    },
    "skin rash": {
        "name": "Skin Rash (Dermatitis/Urticaria)",
        "modern": "Change in skin texture or color — red, itchy, swollen patches.",
        "ayurveda": "Twak Roga / Kushta — Pitta & Kapha with Rakta dhatu involvement.",
        "symptoms": "Itching, redness, scaling, bumps, hives, blisters.",
        "causes": "Allergies, contact dermatitis, eczema, fungal infection, heat rash, viral.",
        "investigations": "Clinical exam. KOH scraping (fungal), Allergy patch test, CBC with eosinophils.",
        "allo": "Antihistamine (Cetrizine, Loratadine). Topical steroid cream (mild). Antifungal cream if ringworm.",
        "home_remedies": "Aloe vera gel for soothing. Coconut oil for dry rash. Cool compress for hives. Oatmeal bath for widespread rash.",
        "ayur_herbs": "Neem, Manjistha, Khadir, Aloe Vera.",
        "ayur_diet": "Avoid sour, spicy, fermented foods. Drink plenty of water.",
        "ayur_lifestyle": "Loose cotton clothes. Avoid harsh soaps/detergents.",
        "ayur_panchakarma": "Virechana (if severe), Raktamokshana.",
        "red_flags": "Rapid spread, difficulty breathing (anaphylaxis), blistering rash like burns (SJS).",
        "prevention": "Know your allergens, keep skin moisturized.",
        "confidence": "Moderate"
    },
    "anxiety": {
        "name": "Anxiety / Stress",
        "modern": "Excessive worry, fear, or nervousness interfering with daily life.",
        "ayurveda": "Chittodvega — Vata imbalance affecting Prana Vata (mind).",
        "symptoms": "Restlessness, racing heart, sweating, trouble sleeping, constant worry, irritability.",
        "causes": "Stress, life events, genetics, thyroid disorders, caffeine excess.",
        "investigations": "Thyroid Function Test (TFT) to rule out hyperthyroidism.",
        "allo": "Counseling/CBT (most effective). SSRIs (Escitalopram, Sertraline) if needed. Avoid self-medicating.",
        "home_remedies": "Deep breathing: 4-7-8 technique. Chamomile tea. Warm milk with nutmeg before bed. Journaling worries.",
        "ayur_herbs": "Ashwagandha, Brahmi, Jatamansi — all proven stress-relievers.",
        "ayur_diet": "Warm, nourishing foods. Avoid caffeine, alcohol.",
        "ayur_lifestyle": "Fixed sleep routine, yoga, Pranayama, meditation daily.",
        "ayur_panchakarma": "Shirodhara, Abhyanga.",
        "red_flags": "Thoughts of self-harm, panic attacks mimicking heart attack.",
        "prevention": "Stress management, healthy routine, social support.",
        "confidence": "Moderate"
    },
    "diabetes": {
        "name": "Diabetes Mellitus (Type 2)",
        "modern": "Chronic condition where body cannot properly process blood glucose.",
        "ayurveda": "Madhumeha — Kapha moving to Vata stage.",
        "symptoms": "Increased thirst, frequent urination, fatigue, blurred vision, slow wound healing.",
        "causes": "Insulin resistance, obesity, sedentary lifestyle, genetics, age.",
        "investigations": "FBS (Fasting Blood Sugar), HbA1c, PPBS, Lipid profile, Kidney function tests annually.",
        "allo": "Metformin (first-line). Sulfonylureas, SGLT2 inhibitors, Insulin if needed. Regular monitoring.",
        "home_remedies": "Bitter gourd (Karela) juice in morning. Fenugreek (methi) seed water. Jamun seeds powder. Walk 30 mins daily.",
        "ayur_herbs": "Gudmar, Karela, Methi, Jamun seed powder, Vijaysar.",
        "ayur_diet": "Barley, millet, bitter gourd, leafy greens. Avoid refined sugar, white rice, maida.",
        "ayur_lifestyle": "Exercise daily, maintain healthy weight.",
        "ayur_panchakarma": "Udvartana (dry powder massage), Panchakarma.",
        "red_flags": "Fruity breath, confusion, extremely high sugar, DKA symptoms.",
        "prevention": "Balanced diet, exercise, healthy weight management.",
        "confidence": "High"
    },
    "back pain": {
        "name": "Back Pain (Lower/Upper)",
        "modern": "Pain in the back from muscles, nerves, bones, or spine structures.",
        "ayurveda": "Kati Shoola — Vata aggravation in the lower back region.",
        "symptoms": "Dull ache or sharp stabbing pain, radiating to legs (sciatica), stiffness.",
        "causes": "Muscle strain, disc herniation, poor posture, sitting for long, arthritis.",
        "investigations": "X-ray spine, MRI if nerve compression suspected.",
        "allo": "NSAIDs (Ibuprofen, Diclofenac). Muscle relaxants (Thiocolchicoside). Physiotherapy.",
        "home_remedies": "Hot water bag on back. Turmeric milk. Massage with sesame oil. Cat-cow yoga stretches.",
        "ayur_herbs": "Dashamoola arishta, Ashwagandha, Yogaraj Guggulu, Nirgundi oil.",
        "ayur_diet": "Warm, unctuous foods. Calcium-rich foods (milk, sesame seeds).",
        "ayur_lifestyle": "Correct sitting posture. Don't sit for >45 mins without break. Bhujangasana, Marjariasana.",
        "ayur_panchakarma": "Kati Basti, Patra Pinda Sweda.",
        "red_flags": "Loss of bowel/bladder control, leg weakness, pain with unexplained weight loss.",
        "prevention": "Core strengthening exercises, correct posture.",
        "confidence": "Moderate"
    },
    "diarrhea": {
        "name": "Diarrhea / Loose Motions",
        "modern": "Loose, watery stools occurring more than 3 times a day.",
        "ayurveda": "Atisara — Pitta & Vata imbalance in the colon.",
        "symptoms": "Watery stools, stomach cramps, nausea, urgency, dehydration.",
        "causes": "Food poisoning, viral gastroenteritis, contaminated water, IBS, medications.",
        "investigations": "Stool examination (if >3 days), stool culture if bacterial suspected, CBC.",
        "allo": "ORS (most important!). Zinc supplements (children). Loperamide for adults. Antibiotics only if bacterial (Norfloxacin, Metronidazole).",
        "home_remedies": "ORS: 1 liter water + 6 tsp sugar + ½ tsp salt. Banana, rice, applesauce, toast (BRAT diet). Curd with rice. Nimbu pani.",
        "ayur_herbs": "Kutajarishta, Bilva (Bael) fruit, Nagarmotha.",
        "ayur_diet": "BRAT diet. Curd, moong dal khichdi. Avoid raw vegetables, spicy food, dairy (except curd).",
        "ayur_lifestyle": "Rest, avoid solid foods initially, keep sipping ORS.",
        "ayur_panchakarma": "Grahi (digestive) herbs to reduce Atisara.",
        "red_flags": "Blood in stool, high fever with diarrhea, signs of severe dehydration (no urine, sunken eyes, very dry mouth), diarrhea >7 days.",
        "prevention": "Clean water, hand washing, food hygiene.",
        "confidence": "High"
    },
    "vomiting": {
        "name": "Vomiting / Nausea",
        "modern": "Forceful expulsion of stomach contents, often with nausea.",
        "ayurveda": "Chardi — Pitta aggravation forcing upward movement of Apana Vata.",
        "symptoms": "Nausea, retching, vomiting, stomach cramps, dizziness.",
        "causes": "Food poisoning, motion sickness, pregnancy, migraine, gastroenteritis, alcohol.",
        "investigations": "Usually clinical. Blood tests if prolonged.",
        "allo": "Ondansetron (Emeset) 4mg for nausea. ORS to replace fluids. Domperidone (Dom) for vomiting.",
        "home_remedies": "Ginger tea (strong anti-nausea). Coconut water. Ice chips to suck. Rest stomach for 1-2 hours.",
        "ayur_herbs": "Ela (cardamom), Shunthi (dry ginger), Nagarmotha.",
        "ayur_diet": "Clear liquids first. Then bland foods (banana, toast, rice). Avoid spicy, fatty foods.",
        "ayur_lifestyle": "Rest. Small frequent sips rather than large amounts.",
        "ayur_panchakarma": "Shaman chikitsa (pacifying therapy).",
        "red_flags": "Blood in vomit, severe abdominal pain, signs of dehydration, >24 hours without keeping anything down.",
        "prevention": "Safe food handling, hygiene.",
        "confidence": "Moderate"
    },
    "high blood pressure": {
        "name": "Hypertension (High Blood Pressure)",
        "modern": "Persistently elevated blood pressure ≥140/90 mmHg damaging blood vessels over time.",
        "ayurveda": "Rakta Gata Vata — Vata & Pitta imbalance affecting blood vessels.",
        "symptoms": "Often silent. Can cause headache (back of head), dizziness, blurred vision, chest tightness.",
        "causes": "Salt intake, obesity, stress, lack of exercise, smoking, genetics, kidney disease.",
        "investigations": "BP monitoring (at least 3 readings), CBC, Urine R/M, ECG, Renal function tests, Fundus exam.",
        "allo": "Amlodipine, Losartan/Telmisartan, Atenolol depending on profile. NEVER stop medication without doctor advice.",
        "home_remedies": "Reduce salt to <5g/day. DASH diet. Garlic daily. Hibiscus tea. Reduce caffeine and alcohol.",
        "ayur_herbs": "Sarpagandha (under doctor supervision), Arjun bark tea, Ashwagandha, Brahmi.",
        "ayur_diet": "Low-salt, low-fat diet. Plenty of fruits, vegetables.",
        "ayur_lifestyle": "35-40 min brisk walk daily. Yoga (Shavasana, Pranayama). No smoking.",
        "ayur_panchakarma": "Shirodhara, Abhyanga with medicated oils.",
        "red_flags": "BP >180/120 (hypertensive crisis), severe headache, chest pain, vision loss — GO TO ER.",
        "prevention": "Salt restriction, exercise, stress management, maintain healthy weight.",
        "confidence": "High"
    },
    "thyroid": {
        "name": "Thyroid Disorders (Hypothyroidism / Hyperthyroidism)",
        "modern": "Underactive (hypothyroid) or overactive (hyperthyroid) thyroid gland affecting metabolism.",
        "ayurveda": "Galaganda — Kapha & Vata imbalance (hypothyroid), Pitta excess (hyperthyroid).",
        "symptoms": "Hypothyroid: fatigue, weight gain, cold intolerance, constipation, hair loss. Hyperthyroid: weight loss, heat intolerance, palpitations, anxiety.",
        "causes": "Autoimmune (Hashimoto's/Graves disease), iodine deficiency, medications.",
        "investigations": "TSH, Free T3, Free T4. TPO antibodies if autoimmune suspected.",
        "allo": "Hypothyroid: Levothyroxine (T4). Hyperthyroid: Methimazole/PTU, beta-blockers.",
        "home_remedies": "Iodine-rich foods (iodized salt, seafood). Selenium foods (Brazil nuts). Avoid excess raw cruciferous vegetables with hypothyroid.",
        "ayur_herbs": "Kanchanar Guggulu, Ashwagandha (hypothyroid), Brahmi.",
        "ayur_diet": "Balanced iodine intake. Avoid soy excess.",
        "ayur_lifestyle": "Stress reduction, regular exercise.",
        "ayur_panchakarma": "Virechana, Basti.",
        "red_flags": "Thyroid storm (hyperthyroid emergency), myxedema coma (hypothyroid emergency).",
        "prevention": "Adequate iodine, regular thyroid check if family history.",
        "confidence": "High"
    },
    "acidity": {
        "name": "Acidity / GERD (Gastroesophageal Reflux Disease)",
        "modern": "Stomach acid flows back into esophagus causing heartburn and discomfort.",
        "ayurveda": "Amlapitta — Pitta excess causing acid production.",
        "symptoms": "Burning in chest after eating, sour taste in mouth, bloating, belching, worse when lying down.",
        "causes": "Spicy/fatty food, obesity, coffee, alcohol, late-night eating, stress, Hiatus hernia.",
        "investigations": "Usually clinical. Endoscopy if persistent or alarm symptoms.",
        "allo": "Antacids (Gelusil, Digene) for immediate relief. PPI: Omeprazole/Pantoprazole 20-40mg before meals for prolonged cases.",
        "home_remedies": "Cold milk for instant relief. Jeera water after meals. Banana. Avoid tea/coffee on empty stomach. Eat 2-3 hours before sleeping.",
        "ayur_herbs": "Avipattikar Churna, Amla (Indian Gooseberry), Licorice (Mulethi).",
        "ayur_diet": "Avoid spicy, sour, fried foods. Small frequent meals. Never skip meals.",
        "ayur_lifestyle": "Elevate head of bed. Don't lie down after meals. Avoid tight clothing.",
        "ayur_panchakarma": "Virechana (Pitta purification).",
        "red_flags": "Difficulty swallowing, vomiting blood, unexplained weight loss, anaemia with acidity.",
        "prevention": "Healthy diet, healthy weight, avoid late meals.",
        "confidence": "High"
    },
    "cold and flu": {
        "name": "Influenza (Flu)",
        "modern": "Contagious respiratory illness caused by influenza viruses — more severe than common cold.",
        "ayurveda": "Vataja Jwara — Vata and Pitta combined affliction.",
        "symptoms": "Sudden high fever (101-104°F), body ache, headache, sore throat, cough, extreme fatigue.",
        "causes": "Influenza A/B/C viruses transmitted via droplets.",
        "investigations": "Usually clinical. Rapid flu test in severe cases.",
        "allo": "Oseltamivir (Tamiflu) within 48 hours if needed. Paracetamol for fever. Rest and hydration.",
        "home_remedies": "Ginger + Tulsi + Honey kadha. Steam inhalation. Complete bed rest. ORS.",
        "ayur_herbs": "Sudarshan Churna, Trikatu, Giloy.",
        "ayur_diet": "Light warm soups, herbal teas, warm water with lemon and honey.",
        "ayur_lifestyle": "Absolute rest, isolation from others.",
        "ayur_panchakarma": "Mild Swedana.",
        "red_flags": "Difficulty breathing, persistent chest pain, confusion, bluish lips — go to hospital.",
        "prevention": "Annual flu vaccine. Hand hygiene. Wear mask in crowded places.",
        "confidence": "Moderate"
    },
    "urinary tract infection": {
        "name": "Urinary Tract Infection (UTI)",
        "modern": "Bacterial infection in the urinary system — most commonly bladder (cystitis).",
        "ayurveda": "Mutrakriccha — Pitta aggravation in the urinary tract.",
        "symptoms": "Burning sensation during urination, frequent urge to urinate, cloudy/foul-smelling urine, pelvic pain.",
        "causes": "E.coli (most common), poor hygiene, dehydration, holding urine too long.",
        "investigations": "Urine R/M (routine microscopy), Urine culture and sensitivity.",
        "allo": "Nitrofurantoin / Trimethoprim-Sulfamethoxazole for 3-7 days. Phenazopyridine for pain relief. Drink plenty of water.",
        "home_remedies": "Drink at least 3 liters of water. Cranberry juice/tablet. Baking soda in water (alkalinizes urine). Don't hold urine.",
        "ayur_herbs": "Gokshura, Chandan (Sandalwood), Punarnava, Varuna bark.",
        "ayur_diet": "Plenty of water. Avoid spicy, sour foods. Coconut water.",
        "ayur_lifestyle": "Urinate after intercourse. Wipe front to back. Cotton underwear.",
        "ayur_panchakarma": "Basti (medicated enema).",
        "red_flags": "Fever with UTI, lower back/flank pain (kidney infection), blood in urine, symptoms despite antibiotics.",
        "prevention": "Stay hydrated, good hygiene, don't hold urine for long.",
        "confidence": "High"
    },
    "eye problems": {
        "name": "Eye Problems (Conjunctivitis / Dry Eyes / Strain)",
        "modern": "Inflammation or irritation of the eye surfaces or strain from excessive screen use.",
        "ayurveda": "Netra Roga — Pitta dosha afflicting Alochaka Pitta (vision).",
        "symptoms": "Redness, watering, discharge, itching, blurred vision, eye strain, light sensitivity.",
        "causes": "Viral/bacterial conjunctivitis (pink eye), allergies, dry eyes from screens, foreign body.",
        "investigations": "Clinical exam. Slit lamp examination if needed.",
        "allo": "Bacterial: Antibiotic drops (Chloramphenicol, Moxifloxacin). Allergic: Antihistamine drops. Dry eyes: Lubricant drops (Tear drops).",
        "home_remedies": "Cool/warm compress (depending on type). Wash eyes with clean water. Rose water drops (cooling). Screen breaks: 20-20-20 rule.",
        "ayur_herbs": "Triphala eyewash, Rose water, Yashtimadhu.",
        "ayur_diet": "Vitamin A rich foods (carrots, leafy greens). Avoid excessive screen time.",
        "ayur_lifestyle": "20-20-20 rule: every 20 mins, look 20 feet away for 20 seconds. Proper lighting while reading.",
        "ayur_panchakarma": "Netra Tarpana (eye nourishment), Nasya.",
        "red_flags": "Sudden vision loss, severe pain, flashes/floaters, injury to eye.",
        "prevention": "Eye hygiene, screen breaks, sunglasses outdoors.",
        "confidence": "Moderate"
    },
    "tooth pain": {
        "name": "Toothache / Dental Problems",
        "modern": "Pain originating from tooth, gum, or jaw — often from decay, infection, or gum disease.",
        "ayurveda": "Dantashoola — Vata & Kapha combined with Pitta disturbance.",
        "symptoms": "Sharp or throbbing tooth pain, sensitivity to cold/hot, swollen gum, jaw pain.",
        "causes": "Tooth decay (cavity), dental abscess, cracked tooth, gum disease, wisdom tooth.",
        "investigations": "Dental X-ray.",
        "allo": "Ibuprofen 400mg for pain. Clove oil on tooth for temporary relief. Dental treatment is essential (filling/RCT/extraction).",
        "home_remedies": "Clove oil on cotton ball on painful tooth. Gargle warm salt water. Ice pack on cheek. Toothpaste for sensitive teeth.",
        "ayur_herbs": "Clove (Lavang), Neem twig brushing, Arimedadi tailam oil pulling.",
        "ayur_diet": "Avoid sugar, cold/hot foods during pain.",
        "ayur_lifestyle": "Brush twice daily. Floss. Regular dental checkups (every 6 months).",
        "ayur_panchakarma": "Gandusha (oil pulling) with sesame/coconut oil.",
        "red_flags": "Swelling spreading to jaw/neck (dental abscess), difficulty swallowing, high fever with tooth pain.",
        "prevention": "Brush twice, floss, reduce sugar, regular dental visits.",
        "confidence": "Moderate"
    },
    "sleep problems": {
        "name": "Insomnia / Sleep Disorders",
        "modern": "Difficulty falling asleep, staying asleep, or getting restful sleep.",
        "ayurveda": "Anidra — Vata imbalance disturbing the nervous system and mind.",
        "symptoms": "Difficulty falling asleep, frequent waking, early morning waking, daytime fatigue, irritability.",
        "causes": "Stress, anxiety, poor sleep hygiene, caffeine, screen light, shift work, depression.",
        "investigations": "Usually clinical. Sleep study (Polysomnography) if sleep apnea suspected.",
        "allo": "Melatonin (0.5-5mg) 30 min before bed. Short-term: Zolpidem (under doctor only). CBT-I is most effective long-term treatment.",
        "home_remedies": "Warm milk with nutmeg + honey. Chamomile tea. Lavender oil. No screens 1 hour before bed. Fixed sleep time.",
        "ayur_herbs": "Ashwagandha, Brahmi, Jatamansi, Tagar (Valeriana) — all proven sleep aids.",
        "ayur_diet": "Light dinner. Avoid caffeine after 4pm. Warm milk with nutmeg.",
        "ayur_lifestyle": "Fixed wake-up time. No screens after 9pm. Bed only for sleep. Anulom Vilom pranayama.",
        "ayur_panchakarma": "Shirodhara, Abhyanga.",
        "red_flags": "Snoring with pauses in breathing (sleep apnea), excessive daytime sleepiness affecting work.",
        "prevention": "Sleep hygiene, stress management, consistent sleep schedule.",
        "confidence": "Moderate"
    },
}

SYMPTOM_SYNONYMS = {
    "headache": ["head pain", "migraine", "head ache", "sir dard", "sir mein dard", "sar dard", "maatha", "headache aa raha"],
    "fever": ["temperature", "pyrexia", "bukhar", "bukhaar", "tap", "body temperature", "garam ho raha", "body hot"],
    "cough": ["coughing", "khansi", "dry cough", "wet cough", "khaansi", "khansi aa rahi", "throat clearing"],
    "stomach pain": ["abdominal pain", "belly pain", "pet dard", "pet mein dard", "gastric", "acidity", "indigestion", "tummy ache", "navel pain"],
    "cold": ["runny nose", "sneezing", "nasal congestion", "sardi", "nazla", "nose beh rahi", "naak beh raha", "sneezing", "blocked nose"],
    "joint pain": ["arthritis", "knee pain", "jodo mein dard", "body pain", "ghutne mein dard", "haath dard", "pair dard", "body ache"],
    "skin rash": ["itching", "rash", "eczema", "allergy skin", "khujli", "daane", "redness on skin", "jalan on skin", "hives", "urticaria"],
    "anxiety": ["anxious", "panic", "stress", "tension", "nervous", "worried", "ghabrahat", "pareshan hu", "dar lag raha", "chinta"],
    "diabetes": ["sugar", "blood sugar", "glucose", "diabetic", "madhumeh", "sugar patient", "sugar disease"],
    "back pain": ["backache", "lower back", "spine pain", "kamar dard", "sciatica", "kamar mein dard", "peeth dard"],
    "diarrhea": ["loose motions", "dast", "potty bar bar", "latrine bar bar", "watery stool", "ulti potty", "loose stool"],
    "vomiting": ["ulti", "nausea", "vomit", "ukalai", "jee ghabraana", "ulti aa rahi", "nausea aa raha"],
    "high blood pressure": ["bp high", "blood pressure high", "hypertension", "bp badha hua", "bp problem"],
    "thyroid": ["thyroid problem", "thyroid disease", "hypothyroid", "hyperthyroid", "tsh high", "tsh low", "gala mein ganth"],
    "acidity": ["heartburn", "acid reflux", "gerd", "chest mein jalan", "seene mein jalan", "khatta", "belching", "ulti jaise lagta"],
    "urinary tract infection": ["uti", "urine mein jalan", "peshab mein jalan", "baaram baar peshab", "burning urination", "peshab jaldi jaldi"],
    "eye problems": ["aankhon mein jalan", "eye redness", "aankhein laal", "aankhon se paani", "ankh mein khujli", "pink eye", "conjunctivitis"],
    "tooth pain": ["daant dard", "toothache", "daant mein dard", "gum problem", "daant toot gaya", "daant mein kida"],
    "sleep problems": ["insomnia", "neend nahi aati", "neend ki problem", "raat ko neend nahi", "jaldi uth jaana", "sleep disorder"],
}

GREETING_KEYWORDS = [
    "hello", "hi", "hey", "good morning", "good evening", "good afternoon",
    "namaste", "namaskar", "kaise ho", "how are you", "what can you do", "help",
    "who are you", "sup", "hii", "helo", "heya", "salam", "adaab"
]

INTRODUCTION_PATTERNS = [
    r"i am ([a-zA-Z\s]+)",
    r"my name is ([a-zA-Z\s]+)",
    r"mera naam ([a-zA-Z\s\u0900-\u097F]+) hai",
    r"main ([a-zA-Z\s\u0900-\u097F]+) hun",
    r"main ([a-zA-Z\s\u0900-\u097F]+) hoon",
    r"mujhe ([a-zA-Z\s\u0900-\u097F]+) kehte hain",
    r"i'm ([a-zA-Z\s]+)",
    r"naam ([a-zA-Z]+) hai",
    r"call me ([a-zA-Z\s]+)",
]

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

        api_key = GEMINI_API_KEY
        print("DEBUG API KEY:", repr(api_key))
        if api_key and api_key != "your_gemini_api_key_here":
            try:
                import google.generativeai as genai
                genai.configure(api_key=api_key)
                self.client = genai.GenerativeModel(
                    GEMINI_MODEL,
                    system_instruction=BASE_SYSTEM_PROMPT
                )
                self.api_available = True
                print("✚ VaidyaMed-X initialized with Gemini API ✓")
            except Exception as e:
                print(f"[-] VaidyaMed-X: Gemini init failed ({type(e).__name__}: {e}), using fallback engine")
        else:
            print("[i] VaidyaMed-X initialized (offline mode — set GEMINI_API_KEY for AI responses)")

    def _detect_emergency(self, text):
        text_lower = text.lower()
        for kw in EMERGENCY_KEYWORDS:
            if kw in text_lower:
                return True, kw
        return False, None

    def _is_greeting(self, text):
        text_lower = text.lower().strip()
        return any(g in text_lower for g in GREETING_KEYWORDS) and len(text_lower.split()) < 8

    def _extract_name_from_message(self, text):
        """Try to detect if user is introducing themselves and extract their name."""
        text_lower = text.lower().strip()
        for pattern in INTRODUCTION_PATTERNS:
            match = re.search(pattern, text_lower, re.IGNORECASE)
            if match:
                name = match.group(1).strip().title()
                # Filter out common false positives
                if name.lower() not in ["a", "the", "not", "fine", "good", "okay", "ok", "well"]:
                    return name
        return None

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

    # ─── User Profile Functions ───────────────────────────────────────

    def _get_user_profile(self, user_id):
        """Fetch user's name and basic profile from DB."""
        if not user_id:
            return None
        conn = get_db_connection()
        if not conn:
            return None
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(
                "SELECT fullName, role, gender, dob FROM users WHERE id = %s",
                (user_id,)
            )
            return cursor.fetchone()
        except Exception as e:
            print(f"Profile fetch error: {e}")
            return None
        finally:
            conn.close()

    # ─── Memory & RAG Functions ──────────────────────────────────────

    def _retrieve_history(self, user_id, limit=12):
        """Retrieve recent conversation history for a user from the DB."""
        if not user_id:
            return []
        conn = get_db_connection()
        if not conn:
            return []
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute('''
                SELECT role, content FROM ai_chat_history
                WHERE userId = %s
                ORDER BY timestamp DESC LIMIT %s
            ''', (user_id, limit))
            rows = cursor.fetchall()
            rows.reverse()
            history = []
            for r in rows:
                role = "user" if r['role'] == "user" else "model"
                history.append({"role": role, "parts": [r['content']]})
            return history
        except Exception as e:
            print(f"Memory Retrieval Error: {e}")
            return []
        finally:
            conn.close()

    def _save_history(self, user_id, role, content):
        """Save a message to the AI chat history."""
        if not user_id:
            return
        conn = get_db_connection()
        if not conn:
            return
        try:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO ai_chat_history (userId, role, content)
                VALUES (%s, %s, %s)
            ''', (user_id, role, content))
            conn.commit()
        except Exception as e:
            print(f"Memory Save Error: {e}")
        finally:
            conn.close()

    def _cosine_similarity(self, vec1, vec2):
        dot = sum(a * b for a, b in zip(vec1, vec2))
        norm1 = math.sqrt(sum(a * a for a in vec1))
        norm2 = math.sqrt(sum(b * b for b in vec2))
        if norm1 == 0 or norm2 == 0:
            return 0.0
        return dot / (norm1 * norm2)

    def _embed_text(self, text):
        """Generate vector embedding using Gemini."""
        if not self.api_available:
            return None
        try:
            import google.generativeai as genai
            result = genai.embed_content(
                model="models/text-embedding-004",
                content=text,
                task_type="retrieval_query",
            )
            return result['embedding']
        except Exception as e:
            print(f"Embedding error: {e}")
            return None

    def _retrieve_context(self, query_text):
        """Find top relevant documents from knowledge_base using cosine similarity."""
        conn = get_db_connection()
        if not conn:
            return ""
        try:
            query_embed = self._embed_text(query_text)
            if not query_embed:
                return ""
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT title, content, embedding FROM knowledge_base")
            rows = cursor.fetchall()
            scored_chunks = []
            for row in rows:
                try:
                    doc_embed = json.loads(row['embedding']) if isinstance(row['embedding'], str) else row['embedding']
                    if doc_embed:
                        score = self._cosine_similarity(query_embed, doc_embed)
                        scored_chunks.append((score, row['title'], row['content']))
                except Exception:
                    continue
            scored_chunks.sort(reverse=True, key=lambda x: x[0])
            top_chunks = scored_chunks[:2]
            if top_chunks and top_chunks[0][0] > 0.6:
                context_str = "RELEVANT MEDICAL KNOWLEDGE:\n"
                for i, (_, title, chunk) in enumerate(top_chunks):
                    context_str += f"[Source {i+1}: {title}]\n{chunk}\n\n"
                return context_str
            return ""
        except Exception as e:
            print(f"RAG Retrieval Error: {e}")
            return ""
        finally:
            conn.close()

    # ─── Gemini API Call ─────────────────────────────────────────────

    def _call_gemini(self, user_input, user_id=None, user_profile=None):
        """Call Gemini API with Memory, User Profile Context, and RAG."""
        if not self.api_available or not self.client:
            return None

        # 1. Retrieve RAG Context
        context = self._retrieve_context(user_input)

        # 2. Build prompt with user profile context injected
        prompt = user_input
        if context:
            prompt = f"{context}\n\n---USER QUERY---\n{user_input}"

        try:
            # 3. Retrieve conversation history
            history = self._retrieve_history(user_id) if user_id else []

            # 4. Build a system context injection with user profile info
            profile_context = ""
            if user_profile:
                name = user_profile.get('fullName', '').split()[0] if user_profile.get('fullName') else ''
                role = user_profile.get('role', 'patient')
                gender = user_profile.get('gender', '')
                if name:
                    profile_context = f"[CONTEXT: You are talking to {name}, a {gender} {role}. You already know their name is {name}. Address them warmly by name naturally during conversation.]\n\n"

            final_prompt = profile_context + prompt if profile_context else prompt

            # 5. Start Chat Session
            chat = self.client.start_chat(history=history)
            response = chat.send_message(
                final_prompt,
                generation_config=dict(
                    temperature=0.72,
                    max_output_tokens=1000
                )
            )
            content = response.text

            if content and len(content.strip()) > 5:
                if user_id:
                    self._save_history(user_id, 'user', user_input)
                    self._save_history(user_id, 'model', content.strip())
                return content.strip()
            return None
        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"Gemini API Error: {e}")
            return None

    # ─── Fallback Response Builders ────────────────────────────────────

    def _build_greeting(self, user_name=None):
        if user_name:
            return f"Hey {user_name}! Kaise ho? Koi health problem hai ya bass baat karne aaye? 😊"
        return "Hey! Kaise ho? Batao kya help chahiye? 😊"

    def _build_introduction_response(self, name):
        return f"Arre {name} bhai/behen! Bohot khushi hui! 😄 Kya chal raha hai? Koi health problem hai toh zaroor batao!"

    def _build_emergency(self, trigger):
        return (
            "**🚨 EMERGENCY ALERT — IMMEDIATE ACTION REQUIRED**\n\n"
            f"**Trigger detected:** {trigger.upper()}\n\n"
            "---\n\n"
            "**Immediate Actions:**\n"
            "1. **Call emergency services (112 / 108)** immediately\n"
            "2. Keep patient calm, in safe position\n"
            "3. If unconscious: check Airway, Breathing, Circulation\n"
            "4. If chest pain: sit upright, loosen clothing, aspirin 325mg if not allergic\n"
            "5. If bleeding: apply direct pressure\n"
            "6. Do NOT give food/water if surgery may be needed\n\n"
            "**Medical Disclaimer:** This is an emergency beyond AI scope. "
            "Seek immediate in-person medical care. Do NOT rely on AI for emergencies."
        )

    def _build_fallback(self, user_input, matches, user_name=None):
        """Build structured response from rule-based KB when API is unavailable."""
        if not matches:
            return self._build_unknown(user_input)

        symptom, data = matches[0]
        name_prefix = f"{user_name}, " if user_name else ""

        r = f"**{name_prefix}lagta hai ye {data['name']} ho sakta hai.**\n\n"
        r += f"**Kya hota hai:** {data['modern']}\n\n"
        r += f"**Common symptoms:** {data['symptoms']}\n\n"
        r += f"**Aam causes:** {data['causes']}\n\n"
        if data.get('home_remedies'):
            r += f"**Ghar pe try karo:** {data['home_remedies']}\n\n"
        r += f"**Dawa (doctor se confirm karo):** {data['allo']}\n\n"
        r += f"**Ayurvedic help:** {data['ayur_herbs']} | Diet: {data['ayur_diet']}\n\n"
        r += f"**⚠️ Doctor ke paas jao agar:** {data['red_flags']}\n\n"
        r += "_Note: Ye AI suggestion hai, doctor se milna zaroor karein._"
        return r

    def _build_unknown(self, user_input):
        return (
            "Hmm, thoda aur batao — kya ho raha hai exactly? 🤔\n\n"
            "Koi symptom hai, ya koi sawaal hai health ke baare mein?"
        )

    # ─── Main Entry Point ──────────────────────────────────────────────

    def process_query(self, user_input, user_id=None):
        """Process any query — Gemini API first, fallback if unavailable."""
        self.query_count += 1

        if not user_input or not user_input.strip():
            return self._build_greeting()

        # Fetch user profile to inject name into AI context
        user_profile = self._get_user_profile(user_id)
        user_name = None
        if user_profile and user_profile.get('fullName'):
            user_name = user_profile['fullName'].split()[0]  # First name only

        # Check if user is introducing themselves — handle directly in fallback
        introduced_name = self._extract_name_from_message(user_input)

        # Emergency — always use built-in (faster, no API latency)
        is_emergency, trigger = self._detect_emergency(user_input)
        if is_emergency:
            resp = self._build_emergency(trigger)
            self.session_log.append({"q": user_input, "type": "emergency"})
            return resp

        # Skip cache for authenticated users (memory state matters)
        cache_key = None
        if not user_id:
            cache_key = user_input.lower().strip()
            cached = self.cache.get(cache_key)
            if cached:
                return cached

        # Try Gemini API first (handles all query types including names, small talk, medical)
        api_response = self._call_gemini(user_input, user_id=user_id, user_profile=user_profile)
        if api_response:
            resp = api_response
            if cache_key:
                self.cache.put(cache_key, resp)
            self.session_log.append({"q": user_input, "type": "gemini"})
            return resp

        # ─── Fallback (API unavailable) ───────────────────────────

        # Handle introduction in fallback
        if introduced_name:
            resp = self._build_introduction_response(introduced_name)
            return resp

        # Greeting fallback
        if self._is_greeting(user_input):
            resp = self._build_greeting(user_name)
            if cache_key:
                self.cache.put(cache_key, resp)
            return resp

        # Rule-based KB fallback
        matches = self._match_symptoms(user_input)
        resp = self._build_fallback(user_input, matches, user_name)
        if cache_key:
            self.cache.put(cache_key, resp)
        self.session_log.append({"q": user_input, "type": "fallback"})
        return resp

    def analyze_medical_report(self, file_path):
        """Extract vitals and symptoms from a medical report using Gemini."""
        if not self.api_available or not self.client:
            return {"error": "AI Engine unavailable"}
        prompt = """
        Analyze this medical report and extract the following in JSON format:
        1. Vitals: { heartRate: number, bloodPressure: string, temperature: number, bmi: number, spo2: number }
        2. Symptoms: Array of strings
        3. Medical Summary: 2-3 sentences
        4. Ayurvedic Insights: 2-3 sentences on Dosha balance based on findings.
        If a vital is missing, use null. Return ONLY valid JSON.
        """
        try:
            content = ""
            if file_path.endswith('.txt') or file_path.endswith('.md'):
                with open(file_path, 'r') as f:
                    content = f.read()
            else:
                content = "[Binary File — Analysis based on filename and metadata]"
            response = self.client.generate_content(
                f"{prompt}\n\nReport Context: {os.path.basename(file_path)}\nContent: {content}"
            )
            text = response.text
            import re as _re
            json_match = _re.search(r'\{.*\}', text, _re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            return {"error": "Failed to parse AI response as JSON"}
        except Exception as e:
            print(f"Analysis Error: {e}")
            return {"error": str(e)}

    def get_metrics(self):
        return {
            "engine": "VaidyaMed-X",
            "version": "3.2",
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
