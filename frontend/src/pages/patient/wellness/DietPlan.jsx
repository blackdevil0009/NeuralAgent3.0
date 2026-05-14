import React, { useState, useEffect } from 'react';

const SAMPLE_DIETS = {
    Vata: {
        title: 'Vata Balancing Diet',
        intro: 'Warm, moist, grounding foods to calm airy Vata.',
        meals: [
            { day: 'Mon', breakfast: 'Oatmeal w/ ghee + almonds', lunch: 'Rice + mung dal + cooked veggies', dinner: 'Khichdi w/ warm milk' },
            { day: 'Tue', breakfast: 'Warm porridge + dates', lunch: 'Vegetable stew + chapati', dinner: 'Root vegetable soup' },
            { day: 'Wed', breakfast: 'Stewed apples + cinnamon', lunch: 'Quinoa + carrots + spinach', dinner: 'Lentil soup + rice' }
        ]
    },
    Pitta: {
        title: 'Pitta Cooling Diet',
        intro: 'Cool, sweet, bitter foods to soothe fiery Pitta.',
        meals: [
            { day: 'Mon', breakfast: 'Sweet rice pudding', lunch: 'Cucumber raita + rice', dinner: 'Mung beans + leafy greens' },
            { day: 'Tue', breakfast: 'Milk w/ rice', lunch: 'Coconut rice + veggies', dinner: 'Quinoa salad w/ mint' },
            { day: 'Wed', breakfast: 'Pears + cardamom', lunch: 'Basmati rice + gourd', dinner: 'Chickpea curry (mild)' }
        ]
    },
    Kapha: {
        title: 'Kapha Energizing Diet',
        intro: 'Light, warm, spicy foods to stimulate heavy Kapha.',
        meals: [
            { day: 'Mon', breakfast: 'Ginger tea + toast', lunch: 'Barley soup + veggies', dinner: 'Spiced lentils + greens' },
            { day: 'Tue', breakfast: 'Apple + cinnamon tea', lunch: 'Millet + bitter greens', dinner: 'Vegetable stir-fry (dry)' },
            { day: 'Wed', breakfast: 'Pomegranate + spices', lunch: 'Quinoa khichdi (spicy)', dinner: 'Bean soup w/ ginger' }
        ]
    }
};

export default function DietPlan() {
    const [dosha, setDosha] = useState('Vata');
    const [plan, setPlan] = useState(SAMPLE_DIETS.Vata);

    useEffect(() => {
        setPlan(SAMPLE_DIETS[dosha]);
    }, [dosha]);

    return (
        <div>
            <div className="pd-card" style={{ marginBottom: 24, padding: 28 }}>
                <h3 className="pd-section-title" style={{ marginBottom: 12 }}>🍲 Weekly Diet Plan</h3>
                <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                    {Object.keys(SAMPLE_DIETS).map(d => (
                        <button
                            key={d}
                            className={`pd-btn ${dosha === d ? 'pd-btn-primary' : 'pd-btn-outline'}`}
                            style={{ flex: 1 }}
                            onClick={() => setDosha(d)}
                        >
                            {d}
                        </button>
                    ))}
                </div>
                <div style={{ fontSize: '0.95rem', color: '#2d6a4f', marginBottom: 16 }}>
                    <strong>{plan.title}</strong>: {plan.intro}
                </div>
            </div>

            <div className="pd-grid-3">
                {plan.meals.map((dayPlan, i) => (
                    <div key={i} className="pd-card" style={{ height: 180 }}>
                        <h4 style={{ fontFamily: 'Playfair Display, serif', marginBottom: 12, color: '#2d6a4f' }}>
                            {dayPlan.day}
                        </h4>
                        <div style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>
                            <div><strong>🌅 Breakfast:</strong> {dayPlan.breakfast}</div>
                            <div style={{ marginTop: 8 }}><strong>🍛 Lunch:</strong> {dayPlan.lunch}</div>
                            <div style={{ marginTop: 8 }}><strong>🍲 Dinner:</strong> {dayPlan.dinner}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ marginTop: 24, padding: 20, background: 'rgba(45,106,79,0.05)', borderRadius: 16, textAlign: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: '#6b8f71' }}>
                    ⚠️ Customize with your nutritionist. Avoid allergens.
                </span>
            </div>
        </div>
    );
}
