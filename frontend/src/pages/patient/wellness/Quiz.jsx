import React, { useState } from 'react';

const QUESTIONS = [
    { q: 'What is your primary energy level?', options: ['High & active 🔥', 'Steady & calm 🧘', 'Slow & relaxed 😴'], dosha: ['Pitta', 'Kapha', 'Vata'] },
    { q: 'Preferred climate?', options: ['Warm 🌞', 'Cool ❄️', 'Balanced 🌿'], dosha: ['Pitta', 'Kapha', 'Vata'] },
    { q: 'Body frame?', options: ['Muscular 💪', 'Large & strong 🏋️', 'Slim & light 🕊️'], dosha: ['Pitta', 'Kapha', 'Vata'] },
    { q: 'Sleep pattern?', options: ['Light sleeper 😴', 'Heavy sleeper 😴😴', 'Irregular 🌙'], dosha: ['Vata', 'Kapha', 'Pitta'] },
    { q: 'Digestion?', options: ['Strong 🔥', 'Slow 🐌', 'Variable 🌪️'], dosha: ['Pitta', 'Kapha', 'Vata'] },
    { q: 'Mood tendency?', options: ['Intense & focused ⚡', 'Calm & steady 🏔️', 'Creative & changing 🎨'], dosha: ['Pitta', 'Kapha', 'Vata'] }
];

export default function Quiz() {
    const [current, setCurrent] = useState(0);
    const [answers, setAnswers] = useState({});
    const [result, setResult] = useState(null);

    const handleAnswer = (dosha) => {
        const newAnswers = { ...answers, [current]: dosha };
        setAnswers(newAnswers);
        if (current < QUESTIONS.length - 1) {
            setCurrent(current + 1);
        } else {
            // Calculate dominant dosha
            const scores = { Vata: 0, Pitta: 0, Kapha: 0 };
            Object.values(newAnswers).forEach(d => scores[d]++);
            const dominant = Object.entries(scores).reduce((a, b) => a[1] > b[1] ? a : b)[0];
            setResult({ dosha: dominant, score: scores[dominant], total: QUESTIONS.length });
        }
    };

    if (result) {
        return (
            <div className="pd-card" style={{ maxWidth: 500, margin: '0 auto' }}>
                <div style={{ textAlign: 'center', padding: 30 }}>
                    <div style={{ fontSize: '4rem', marginBottom: 20 }}>🎉</div>
                    <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.8rem', marginBottom: 10 }}>
                        Your Dosha: <span style={{ color: '#c9a84c' }}>{result.dosha}</span>
                    </h2>
                    <div style={{ fontSize: '1.1rem', color: '#6b8f71', marginBottom: 24 }}>
                        Score: {Math.round((result.score / result.total) * 100)}%
                    </div>
                    <div style={{ background: 'rgba(201,168,76,0.1)', borderRadius: 12, padding: 20, marginBottom: 24 }}>
                        <strong>{result.dosha} Tips:</strong><br/>
                        {result.dosha === 'Vata' && 'Warm foods, routine, grounding herbs like ashwagandha.'}<br/>
                        {result.dosha === 'Pitta' && 'Cooling foods, moonlit walks, rose water.'}<br/>
                        {result.dosha === 'Kapha' && 'Spicy foods, exercise, dry brushing.'}
                    </div>
                    <button className="pd-btn pd-btn-primary" onClick={() => window.location.reload()}>
                        🔄 New Quiz
                    </button>
                </div>
            </div>
        );
    }

    const q = QUESTIONS[current];

    return (
        <div style={{ maxWidth: 500, margin: '0 auto' }}>
            <div className="pd-card" style={{ padding: 40 }}>
                <div style={{ textAlign: 'center', marginBottom: 30 }}>
                    <div style={{ fontSize: '2.5rem' }}>❓</div>
                    <h2 style={{ fontFamily: 'Playfair Display, serif', marginBottom: 8 }}>Dosha Quiz</h2>
                    <div style={{ color: '#6b8f71' }}>
                        Question {current + 1} of {QUESTIONS.length}
                    </div>
                </div>
                <div style={{ fontSize: '1.05rem', lineHeight: 1.6, marginBottom: 30 }}>{q.q}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {q.options.map((opt, i) => (
                        <button
                            key={i}
                            className="pd-btn pd-btn-outline"
                            style={{ justifyContent: 'flex-start', padding: '12px 20px' }}
                            onClick={() => handleAnswer(q.dosha[i])}
                        >
                            {opt}
                        </button>
                    ))}
                </div>
                <div style={{ textAlign: 'center', marginTop: 20, fontSize: '0.8rem', color: '#999' }}>
                    ⚠️ Educational tool only
                </div>
            </div>
        </div>
    );
}

