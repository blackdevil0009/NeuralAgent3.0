import json

diseases = [
    {
        "disease": "Common Cold (Pratishyaya)",
        "symptoms": "Runny nose, sneezing, mild fever, body ache.",
        "ayurvedic_explanation": "Imbalance of Kapha and Vata doshas, leading to respiratory congestion.",
        "remedies": "Ginger tea, basil (Tulsi) leaves, black pepper, and honey.",
        "lifestyle": "Stay warm, avoid cold drinks, and rest.",
        "precautions": "Avoid dairy products and heavy oily foods during congestion."
    },
    {
        "disease": "Hyperacidity (Amla Pitta)",
        "symptoms": "Heartburn, sour belching, nausea, stomach discomfort.",
        "ayurvedic_explanation": "Aggravation of Pitta dosha in the stomach.",
        "remedies": "Amla powder, cooling herbs like Fennel and Coriander, Aloe Vera juice.",
        "lifestyle": "Eat small, frequent meals. Avoid spicy and fermented foods.",
        "precautions": "Do not skip meals. Avoid caffeine and alcohol."
    },
    {
        "disease": "Constipation (Vibandha)",
        "symptoms": "Hard stools, infrequent bowel movements, abdominal bloating.",
        "ayurvedic_explanation": "Vata imbalance causing dryness in the colon.",
        "remedies": "Triphala powder at night with warm water, Psyllium husk (Isabgol).",
        "lifestyle": "Drink plenty of warm water. Walk regularly.",
        "precautions": "Avoid dry, cold, and processed foods."
    },
    {
        "disease": "Insomnia (Anidra)",
        "symptoms": "Difficulty falling or staying asleep, daytime fatigue.",
        "ayurvedic_explanation": "Vata and Tarpaka Kapha imbalance leading to overactive mind.",
        "remedies": "Warm milk with nutmeg, Ashwagandha powder, Brahmi oil head massage.",
        "lifestyle": "Maintain a regular sleep schedule. Foot massage with sesame oil.",
        "precautions": "Avoid screens and caffeine 3 hours before bed."
    },
    {
        "disease": "Joint Pain (Sandhigata Vata / Amavata)",
        "symptoms": "Pain, stiffness, and swelling in joints.",
        "ayurvedic_explanation": "Vata aggravation and accumulation of toxins (Ama) in joints.",
        "remedies": "Ginger, Turmeric, Guggulu, Shallaki (Boswellia).",
        "lifestyle": "Keep joints warm. Gentle stretching (Yoga). Warm oil massage.",
        "precautions": "Avoid cold weather exposure and heavy, gas-forming foods like beans."
    },
    {
        "disease": "Indigestion (Ajirna)",
        "symptoms": "Bloating, gas, fullness after eating, mild nausea.",
        "ayurvedic_explanation": "Weak Agni (digestive fire) due to improper eating habits.",
        "remedies": "Cumin (Jeera), Ginger juice with lemon, Hingvastak Churna.",
        "lifestyle": "Eat only when hungry. Chew food thoroughly.",
        "precautions": "Avoid drinking water immediately before or after meals."
    },
    {
        "disease": "Diabetes (Prameha / Madhumeha)",
        "symptoms": "Frequent urination, excessive thirst, fatigue, slow healing.",
        "ayurvedic_explanation": "Kapha imbalance and depletion of Ojas.",
        "remedies": "Bitter melon (Karela), Turmeric with Amla (Nisha-Amalki), Fenugreek seeds.",
        "lifestyle": "Regular physical exercise. Avoid sedentary habits.",
        "precautions": "Avoid sugar, refined flour, and heavy sweets. Regular monitoring is vital."
    },
    {
        "disease": "Cough (Kasa)",
        "symptoms": "Dry or productive cough, throat irritation.",
        "ayurvedic_explanation": "Irritation of Vata or Kapha in the respiratory tract.",
        "remedies": "Honey with Ginger, Licorice (Mulethi) tea, Sitopaladi Churna.",
        "lifestyle": "Steam inhalation. Gargle with warm salt water.",
        "precautions": "Avoid cold breeze and refrigerated foods."
    },
    {
        "disease": "Anemia (Pandu Roga)",
        "symptoms": "Pale skin, weakness, shortness of breath, dizziness.",
        "ayurvedic_explanation": "Pitta imbalance affecting blood (Rakta) quality.",
        "remedies": "Pomegranate juice, Beetroot, Iron-rich herbs like Mandura Bhasma (under supervision).",
        "lifestyle": "Iron-rich diet including spinach and raisins.",
        "precautions": "Avoid excessive intake of sour and salty foods."
    },
    {
        "disease": "Asthma (Tamaka Shwasa)",
        "symptoms": "Shortness of breath, wheezing, chest tightness.",
        "ayurvedic_explanation": "Vata and Kapha blockage in the respiratory channels (Pranavaha Srotas).",
        "remedies": "Ginger and Honey, Adhatoda vasica (Vasaka) leaves, Black pepper.",
        "lifestyle": "Pranayama (breathing exercises). Keep the chest warm.",
        "precautions": "Avoid allergens like dust and smoke. Avoid cold foods."
    },
    {
        "disease": "Migraine (Ardhavabhedaka)",
        "symptoms": "Pulsating headache, usually on one side, sensitivity to light/sound.",
        "ayurvedic_explanation": "Pitta-Vata imbalance affecting the head channels.",
        "remedies": "Cow's Ghee (Nasya), cooling herbs like Peppermint and Sandalwood.",
        "lifestyle": "Manage stress. Regular meal times.",
        "precautions": "Avoid sunlight exposure and triggers like aged cheese or chocolate."
    },
    {
        "disease": "Obesity (Sthaulya)",
        "symptoms": "Excess body weight, lethargy, breathlessness on exertion.",
        "ayurvedic_explanation": "Kapha imbalance and slow Meda Dhatu (fat tissue) metabolism.",
        "remedies": "Honey with warm water, Guggulu, Triphala, Trikatu powder.",
        "lifestyle": "Regular aerobic exercise. Avoid sleeping during the day.",
        "precautions": "Reduce carbohydrate and fat intake. Avoid cold water."
    },
    {
        "disease": "Skin Allergy (Sheetapitta)",
        "symptoms": "Hives, itching, red patches on skin.",
        "ayurvedic_explanation": "Pitta and Vata imbalance caused by environmental or dietary triggers.",
        "remedies": "Neem, Turmeric, Haridrakhanda, Aloe Vera gel.",
        "lifestyle": "Wear cotton clothes. Stay in cool environments.",
        "precautions": "Avoid spicy and fermented foods. Avoid direct sun."
    },
    {
        "disease": "Hair Loss (Khalitya)",
        "symptoms": "Thinning of hair, excessive hair fall.",
        "ayurvedic_explanation": "High Pitta at the root of the hair (Bhrajaka Pitta).",
        "remedies": "Bhingraj oil, Brahmi, Amla, Hibiscus hair masks.",
        "lifestyle": "Regular scalp massage. Stress management.",
        "precautions": "Avoid harsh chemical products and excessive heat styling."
    },
    {
        "disease": "Fever (Jwara)",
        "symptoms": "High body temperature, chills, loss of appetite.",
        "ayurvedic_explanation": "Accumulation of Ama (toxins) blocking the body channels.",
        "remedies": "Holy Basil (Tulsi), Ginger tea, Giloy (Guduchi) juice.",
        "lifestyle": "Rest. Take light, warm liquids.",
        "precautions": "Do not take heavy food or cold water. Seek help if very high."
    },
    {
        "disease": "High Blood Pressure (Rakta Vata)",
        "symptoms": "Headache, dizziness, palpitations, often asymptomatic.",
        "ayurvedic_explanation": "Vata-Pitta imbalance in the blood vessels.",
        "remedies": "Sarpagandha (under supervision), Arjuna bark powder, Garlic.",
        "lifestyle": "Daily meditation and Yoga. Low sodium diet.",
        "precautions": "Avoid excessive stress, anger, and salty snacks."
    },
    {
        "disease": "Menstrual Cramps (Kashta Artava)",
        "symptoms": "Pain in the lower abdomen and back during periods.",
        "ayurvedic_explanation": "Vata imbalance in the pelvic region.",
        "remedies": "Fenugreek seeds, Aloe Vera juice, Ginger and Jaggery tea.",
        "lifestyle": "Rest. Warm compress on abdomen.",
        "precautions": "Avoid cold drinks and excessive physical exertion during periods."
    },
    {
        "disease": "Piles / Hemorrhoids (Arsha)",
        "symptoms": "Bleeding during bowel movements, itching or pain in the anal area.",
        "ayurvedic_explanation": "Deterioration of digestive fire leading to Vata/Pitta imbalance in the rectum.",
        "remedies": "Buttermilk (Takra), Haritaki powder, Triphala Guggulu.",
        "lifestyle": "Avoid sitting for long hours. High fiber diet.",
        "precautions": "Strictly avoid spicy, dry, and heavy foods. Prevent constipation."
    },
    {
        "disease": "Psoriasis (Kitibha)",
        "symptoms": "Scaly skin patches, itching, silver-colored scales.",
        "ayurvedic_explanation": "Imbalance of Vata and Kapha affecting the skin tissues.",
        "remedies": "Neem oil, Jasmine oil, Guggulu, Manjistha.",
        "lifestyle": "Expose affected area to morning sun. Maintain skin hydration.",
        "precautions": "Avoid incompatible food combinations like milk and fish."
    },
    {
        "disease": "Urinary Tract Infection (Mutrakrichra)",
        "symptoms": "Burning sensation while urinating, frequent urge, cloudy urine.",
        "ayurvedic_explanation": "Pitta aggravation in the urinary system.",
        "remedies": "Coriander seed water, Gokshura, Punarnava, Barley water.",
        "lifestyle": "Drink plenty of water. Maintain hygiene.",
        "precautions": "Avoid spicy food, caffeine, and alcohol during infection."
    },
    {
        "disease": "Acne (Yuvana Pidaka)",
        "symptoms": "Pimples, blackheads, inflammation on face/back.",
        "ayurvedic_explanation": "Pitta and Kapha imbalance causing blood impurities.",
        "remedies": "Neem paste, Sandalwood powder, Manjistha, Turmeric.",
        "lifestyle": "Keep skin clean. Drink plenty of water.",
        "precautions": "Avoid oily, fried, and sugary foods."
    },
    {
        "disease": "Stress & Anxiety (Manovaha Srotas Vikara)",
        "symptoms": "Nervousness, racing thoughts, restlessness.",
        "ayurvedic_explanation": "Aggravation of Rajas and Vata in the mind.",
        "remedies": "Ashwagandha, Shankhapushpi, Brahmi, Jatamansi.",
        "lifestyle": "Pranayama, Meditation, Abhyanga (oil massage).",
        "precautions": "Establish a consistent routine. Avoid excessive multitasking."
    },
    {
        "disease": "Leucorrhea (Shweta Pradara)",
        "symptoms": "Excessive white discharge from the vagina, weakness.",
        "ayurvedic_explanation": "Kapha imbalance in the female reproductive tract.",
        "remedies": "Ashoka bark decoction, Lodhra, Rice water (Tandulodaka).",
        "lifestyle": "Maintain pelvic hygiene. Balanced diet.",
        "precautions": "Avoid sugary, fermented, and heavy foods."
    },
    {
        "disease": "Back Pain (Kati Shoola)",
        "symptoms": "Aching or stiffness in the lower back.",
        "ayurvedic_explanation": "Vata aggravation in the lumbar region.",
        "remedies": "Ashwagandha, Guggulu, Garlic milk.",
        "lifestyle": "Maintain good posture. Regular gentle Yoga.",
        "precautions": "Avoid lifting heavy weights and sitting in one position too long."
    },
    {
        "disease": "Gastritis (Urdhvaga Amla Pitta)",
        "symptoms": "Burning sensation in stomach, nausea, bloating.",
        "ayurvedic_explanation": "High Pitta affecting the stomach lining.",
        "remedies": "Cold milk, Yashtimadhu (Licorice), Fennel tea.",
        "lifestyle": "Eat on time. Practice mindful eating.",
        "precautions": "Avoid sour, spicy, and very hot foods."
    },
    {
        "disease": "Eczema (Vicharchika)",
        "symptoms": "Itchy, dry, cracked skin, inflammation.",
        "ayurvedic_explanation": "Vata-Kapha imbalance with blood toxicity.",
        "remedies": "Neem, Turmeric, coconut oil with camphor.",
        "lifestyle": "Use mild soaps. Keep skin moisturized.",
        "precautions": "Avoid dairy and wheat if they trigger flare-ups."
    },
    {
        "disease": "Hypothyroidism (Galaganda - related)",
        "symptoms": "Weight gain, fatigue, cold intolerance, dry skin.",
        "ayurvedic_explanation": "Slowed metabolism (Agni) and Kapha accumulation.",
        "remedies": "Kanchanar Guggulu, Trikatu, Kelp/Iodine rich herbs (carefully).",
        "lifestyle": "Stay active. Eat iodine-rich foods like seaweed.",
        "precautions": "Avoid heavy, processed, and cold foods."
    },
    {
        "disease": "Jaundice (Kamala)",
        "symptoms": "Yellowing of skin and eyes, dark urine, fatigue.",
        "ayurvedic_explanation": "Excess Pitta affecting liver function (Ranjaka Pitta).",
        "remedies": "Sugar cane juice, Bhumi Amla, Katuki juice.",
        "lifestyle": "Strict rest. Extremely light diet.",
        "precautions": "Complete avoidance of fats, oils, and alcohol."
    },
    {
        "disease": "Tonsillitis (Galayu)",
        "symptoms": "Sore throat, difficulty swallowing, swollen tonsils.",
        "ayurvedic_explanation": "Kapha and Pitta imbalance in the throat area.",
        "remedies": "Turmeric gargle, Honey and Ginger, Sitopaladi Churna.",
        "lifestyle": "Keep the throat warm. Drink warm liquids.",
        "precautions": "Avoid cold water and sour citrus fruits."
    },
    {
        "disease": "Sinusitis (Pinasa)",
        "symptoms": "Facial pain, nasal congestion, headache.",
        "ayurvedic_explanation": "Kapha-Vata blockage in the sinus cavities.",
        "remedies": "Steam inhalation with Eucalyptus, Trikatu, Nasya with Anu Taila.",
        "lifestyle": "Avoid sleeping during the day. Stay away from dust.",
        "precautions": "Avoid cold environments and dairy products."
    },
    {
        "disease": "Dandruff (Darunaka)",
        "symptoms": "Flaky scalp, itching, white scales.",
        "ayurvedic_explanation": "Vata and Kapha imbalance on the scalp skin.",
        "remedies": "Lemon and coconut oil, Neem water wash, Fenugreek paste.",
        "lifestyle": "Keep scalp clean. Wash hair regularly.",
        "precautions": "Avoid shared combs and harsh synthetic shampoos."
    },
    {
        "disease": "Mouth Ulcers (Mukha Paka)",
        "symptoms": "Small painful sores inside the mouth.",
        "ayurvedic_explanation": "High Pitta in the oral cavity.",
        "remedies": "Honey application, Yashtimadhu (Licorice) powder, cooling coconut oil.",
        "lifestyle": "Rinse mouth after every meal.",
        "precautions": "Avoid spicy, salty, and hot foods."
    },
    {
        "disease": "Fatigue (Shrama / Klama)",
        "symptoms": "Lack of energy, tiredness even after rest.",
        "ayurvedic_explanation": "Low Ojas and weak digestive fire (Agni).",
        "remedies": "Ashwagandha, Dates, Almonds, Chyawanprash.",
        "lifestyle": "Ensure 7-8 hours of sleep. Balanced nutritious diet.",
        "precautions": "Avoid excessive physical and mental strain."
    },
    {
        "disease": "Sciatica (Gridhrasi)",
        "symptoms": "Pain radiating from the lower back down the leg.",
        "ayurvedic_explanation": "Vata aggravation affecting the sciatic nerve.",
        "remedies": "Guggulu, Castor oil with ginger water, Dashamoola.",
        "lifestyle": "Gentle lumbar stretching. Warm oil massage.",
        "precautions": "Avoid lifting heavy weights and jerky movements."
    },
    {
        "disease": "Diarrhea (Atisara)",
        "symptoms": "Loose, watery stools, abdominal cramps.",
        "ayurvedic_explanation": "Excess Pitta or Vata leading to impaired absorption.",
        "remedies": "Buttermilk (Takra) with cumin, Pomegranate peel decoction, Bael fruit.",
        "lifestyle": "Hydrate with ORS or coconut water. Eat light food like Gruel.",
        "precautions": "Avoid milk, coffee, and fatty foods during flare-up."
    },
    {
        "disease": "Loss of Appetite (Aruchi)",
        "symptoms": "Disinterest in eating, feeling full even without food.",
        "ayurvedic_explanation": "Accumulation of Kapha or Ama on the tongue and stomach.",
        "remedies": "Ginger with salt before meals, Trikatu, Pomegranate.",
        "lifestyle": "Walk before meals. Eat in a pleasant environment.",
        "precautions": "Avoid eating when not hungry. Avoid heavy snacks."
    },
    {
        "disease": "Varicose Veins (Siraja Granthi)",
        "symptoms": "Swollen, twisted, bluish veins, usually in legs.",
        "ayurvedic_explanation": "Vata imbalance causing weakness in the veins.",
        "remedies": "Arjuna, Brahmi, Guggulu, Kaishore Guggulu.",
        "lifestyle": "Avoid standing for too long. Elevate legs while sleeping.",
        "precautions": "Avoid very tight clothing and excessive weight gain."
    },
    {
        "disease": "Osteoarthritis (Sandhigata Vata)",
        "symptoms": "Joint pain, creaking sounds (crepitus), reduced mobility.",
        "ayurvedic_explanation": "Depletion of Shleshaka Kapha (joint lubrication) and Vata increase.",
        "remedies": "Shallaki (Boswellia), Guggulu, Ashwagandha oil massage.",
        "lifestyle": "Low impact exercise. Stay warm.",
        "precautions": "Avoid cold and dry foods. Reduce excessive running."
    },
    {
        "disease": "Menopause Symptoms (Rajonivritti)",
        "symptoms": "Hot flashes, mood swings, night sweats, dryness.",
        "ayurvedic_explanation": "Transition from Pitta to Vata stage of life.",
        "remedies": "Shatavari, Ashoka, Aloe Vera, Ashwagandha.",
        "lifestyle": "Regular Yoga and meditation. Calcium-rich diet.",
        "precautions": "Avoid stimulants like caffeine and alcohol."
    },
    {
        "disease": "Dark Circles (Karshya / Raktapitta related)",
        "symptoms": "Darkening of skin under the eyes.",
        "ayurvedic_explanation": "Pitta imbalance, poor circulation, or lack of rest.",
        "remedies": "Aloe Vera gel, Cucumber slices, Saffron oil (Kumkumadi).",
        "lifestyle": "Get adequate sleep. Hydrate properly.",
        "precautions": "Avoid excessive eye strain and late night work."
    },
    {
        "disease": "Bad Breath (Mukha Durgandhya)",
        "symptoms": "Unpleasant odor from the mouth.",
        "ayurvedic_explanation": "Accumulation of Ama (toxins) in the gut or poor oral hygiene.",
        "remedies": "Chewing Fennel seeds (Saunf), Cloves, Triphala mouthwash.",
        "lifestyle": "Scrape tongue daily. Maintain oral hygiene.",
        "precautions": "Avoid heavy, indigestible foods at night."
    },
    {
        "disease": "Premature Graying (Akala Palitya)",
        "symptoms": "Graying of hair before age 30.",
        "ayurvedic_explanation": "Excessive Pitta 'cooking' the hair pigment.",
        "remedies": "Amla, Bhringraj, Brahmi, Nasya with Ghee.",
        "lifestyle": "Scalp massage. Stress reduction.",
        "precautions": "Avoid spicy, salty, and sour foods. Avoid heat to scalp."
    },
    {
        "disease": "Earache (Karna Shoola)",
        "symptoms": "Sharp or dull pain in the ear.",
        "ayurvedic_explanation": "Vata aggravation in the ear canal.",
        "remedies": "Warm Garlic oil (ear drops - careful!), Ginger juice (external).",
        "lifestyle": "Keep ears covered in cold wind.",
        "precautions": "Avoid putting sharp objects or cold water in the ear."
    },
    {
        "disease": "Bronchitis (Kas-Shwasa)",
        "symptoms": "Inflammation of bronchial tubes, persistent cough, mucus.",
        "ayurvedic_explanation": "Vata-Kapha obstruction in the chest.",
        "remedies": "Vasaka (Adhatoda), Turmeric milk, Trikatu, Pippali.",
        "lifestyle": "Keep chest warm. Warm water only.",
        "precautions": "Avoid exposure to cold, damp environments."
    },
    {
        "disease": "Nausea (Chhardi - early stage)",
        "symptoms": "Urge to vomit, uneasy feeling in stomach.",
        "ayurvedic_explanation": "Vitiated Pitta or Kapha moving upward.",
        "remedies": "Ginger, Cardamom (Elaichi), Lemon juice, Peppermint.",
        "lifestyle": "Rest in a well-ventilated room.",
        "precautions": "Do not suppress the urge to vomit if it is strong."
    },
    {
        "disease": "Allergic Rhinitis (Vataja Pratishyaya)",
        "symptoms": "Hay fever, sneezing, itchy eyes, runny nose.",
        "ayurvedic_explanation": "Hypersensitivity of Vata-Kapha to environmental allergens.",
        "remedies": "Turmeric, Haridrakhanda, Nasya with Anu Taila, Tulsi.",
        "lifestyle": "Avoid triggers. Practice Neti Kriya (nasal rinse).",
        "precautions": "Avoid cold water and daytime sleep."
    },
    {
        "disease": "Sore Throat (Kantha Shoola)",
        "symptoms": "Pain, scratchiness, or irritation of the throat.",
        "ayurvedic_explanation": "Pitta or Kapha inflammation in the throat.",
        "remedies": "Salt water gargle, Turmeric and Milk, Licorice (Yashtimadhu).",
        "lifestyle": "Sip warm liquids throughout the day.",
        "precautions": "Avoid very spicy or very cold foods."
    },
    {
        "disease": "Weak Memory (Smriti Daurbalya)",
        "symptoms": "Difficulty in recalling information, lack of focus.",
        "ayurvedic_explanation": "Imbalance in the Sadhaka Pitta and Vata in the mind.",
        "remedies": "Brahmi, Shankhapushpi, Walnut, Ghee.",
        "lifestyle": "Adequate sleep. Brain exercises/Meditation.",
        "precautions": "Avoid excessive stress and chaotic environments."
    },
    {
        "disease": "Low Immunity (Vyadhikshamatwa Hinata)",
        "symptoms": "Frequent infections, slow recovery, general weakness.",
        "ayurvedic_explanation": "Low Ojas due to poor digestion and lifestyle.",
        "remedies": "Giloy (Guduchi), Chyawanprash, Ashwagandha, Amla.",
        "lifestyle": "Regular exercise. Seasonal detoxification (Panchakarma).",
        "precautions": "Avoid stale food and excessive stress."
    },
    {
        "disease": "Muscle Cramps (Mamsa Vata)",
        "symptoms": "Sudden, involuntary contraction of muscles, pain.",
        "ayurvedic_explanation": "Vata aggravation in the muscle tissues (Mamsa Dhatu).",
        "remedies": "Warm Sesame oil massage, Ashwagandha, Magnesium-rich foods.",
        "lifestyle": "Stay hydrated. Stretching before exercise.",
        "precautions": "Avoid overexertion and exposure to cold wind."
    }
]

output_path = 'data/ayurveda_dataset.json'
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(diseases, f, indent=2)

print(f"Dataset with {len(diseases)} entries created at {output_path}")
