import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../../utils/config';
import { getStoredAuthSession } from '../../utils/authStorage';

const LEVELS = [
    { name: 'Beginner', min: 0, icon: '🌱', color: '#6b8f71' },
    { name: 'Wellness Explorer', min: 100, icon: '🌿', color: '#40916c' },
    { name: 'Health Champion', min: 500, icon: '🏆', color: '#2d6a4f' },
    { name: 'Fitness Master', min: 1000, icon: '⚡', color: '#f4a261' },
    { name: 'Elite Care Member', min: 2500, icon: '👑', color: '#e76f51' },
];

const QUIZZES = [
    { id: 'nutrition', title: 'Nutrition Basics', icon: '🥗', difficulty: 'Easy', coins: 10, questions: [
        { q: 'Which vitamin is produced by the body using sunlight?', options: ['Vitamin A', 'Vitamin B12', 'Vitamin D', 'Vitamin K'], answer: 2 },
        { q: 'How many glasses of water should you drink daily?', options: ['4-5', '6-7', '8-10', '12+'], answer: 2 },
        { q: 'Which food is highest in iron?', options: ['Bananas', 'Spinach', 'Carrots', 'Apples'], answer: 1 },
    ]},
    { id: 'mental', title: 'Mental Wellness', icon: '🧠', difficulty: 'Medium', coins: 15, questions: [
        { q: 'How many hours of sleep do adults generally need?', options: ['4-5', '6-7', '7-9', '10-12'], answer: 2 },
        { q: 'Which activity is best for reducing stress?', options: ['Scrolling social media', 'Deep breathing', 'Eating junk food', 'Working more hours'], answer: 1 },
        { q: 'What is mindfulness?', options: ['Being forgetful', 'Focusing on present moment', 'Multitasking efficiently', 'Avoiding problems'], answer: 1 },
    ]},
    { id: 'emergency', title: 'Emergency Awareness', icon: '🚨', difficulty: 'Hard', coins: 20, questions: [
        { q: 'What is the first step in CPR?', options: ['Give breaths', 'Check for response', 'Start compressions', 'Call a doctor'], answer: 1 },
        { q: 'Normal human body temperature is:', options: ['36°C / 96.8°F', '37°C / 98.6°F', '38°C / 100.4°F', '35°C / 95°F'], answer: 1 },
        { q: 'Signs of a stroke include:', options: ['Runny nose', 'Sudden numbness on one side', 'Mild headache', 'Hunger'], answer: 1 },
    ]},
];

const ACTIVITY_ICONS = {
    appointment_booked: '📅',
    health_quiz: '🧠',
    daily_login: '📆',
    referral_success: '🤝',
    subscription_purchase: '⭐',
    diet_plan: '🥗',
    default: '🪙',
};

export default function PopCoinDashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeQuiz, setActiveQuiz] = useState(null);
    const [quizStep, setQuizStep] = useState(0);
    const [quizAnswers, setQuizAnswers] = useState([]);
    const [quizDone, setQuizDone] = useState(false);
    const [quizResult, setQuizResult] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const { token } = getStoredAuthSession();

    const fetchDashboard = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/gamification/dashboard`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const json = await res.json();
            if (res.ok && json.data) setData(json.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [token]);

    useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

    const currentLevel = LEVELS.slice().reverse().find(l => (data?.balance || 0) >= l.min) || LEVELS[0];
    const nextLevel = LEVELS.find(l => l.min > (data?.balance || 0));
    const progress = nextLevel
        ? Math.min(100, (((data?.balance || 0) - currentLevel.min) / (nextLevel.min - currentLevel.min)) * 100)
        : 100;

    const startQuiz = (quiz) => {
        setActiveQuiz(quiz);
        setQuizStep(0);
        setQuizAnswers([]);
        setQuizDone(false);
        setQuizResult(null);
    };

    const answerQuestion = (idx) => {
        const newAnswers = [...quizAnswers, idx];
        setQuizAnswers(newAnswers);
        if (quizStep + 1 < activeQuiz.questions.length) {
            setQuizStep(quizStep + 1);
        } else {
            submitQuiz(newAnswers);
        }
    };

    const submitQuiz = async (answers) => {
        setSubmitting(true);
        const correct = answers.filter((a, i) => a === activeQuiz.questions[i].answer).length;
        try {
            const res = await fetch(`${API_BASE_URL}/api/gamification/quiz/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ score: correct, total: activeQuiz.questions.length })
            });
            const json = await res.json();
            setQuizResult({ correct, total: activeQuiz.questions.length, coins: json.data?.coins_earned || 0, level_up: json.data?.level_up });
        } catch (e) { setQuizResult({ correct, total: activeQuiz.questions.length, coins: 0 }); }
        finally { setSubmitting(false); setQuizDone(true); fetchDashboard(); }
    };

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
            <div style={{ color: '#2d6a4f', fontSize: '1rem' }}>Loading your rewards…</div>
        </div>
    );

    return (
        <div style={{ fontFamily: "'Inter', sans-serif", maxWidth: 900, margin: '0 auto', padding: '0 4px' }}>
            <style>{`
                @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
                @keyframes floatCoin { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
                @keyframes fadeSlide { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
                .pc-card { background:rgba(255,255,255,0.7); backdrop-filter:blur(12px); border:1px solid rgba(45,106,79,0.12); border-radius:20px; padding:24px; margin-bottom:20px; animation:fadeSlide 0.4s ease both; box-shadow:0 4px 24px rgba(45,106,79,0.07); }
                .pc-quiz-card { cursor:pointer; transition:all 0.25s; }
                .pc-quiz-card:hover { transform:translateY(-4px); box-shadow:0 12px 40px rgba(45,106,79,0.15); border-color:rgba(45,106,79,0.3); }
                .pc-opt-btn { width:100%; text-align:left; padding:14px 18px; border-radius:14px; border:1.5px solid rgba(45,106,79,0.15); background:rgba(255,255,255,0.8); cursor:pointer; font-size:0.9rem; color:#1a2e1a; transition:all 0.2s; margin-bottom:10px; }
                .pc-opt-btn:hover { border-color:#2d6a4f; background:rgba(45,106,79,0.06); transform:translateX(4px); }
                .diff-easy { background:rgba(82,183,136,0.15); color:#2d6a4f; }
                .diff-medium { background:rgba(244,162,97,0.15); color:#b85c00; }
                .diff-hard { background:rgba(231,111,81,0.15); color:#c0392b; }
            `}</style>

            {/* Hero */}
            <div style={{
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)',
                borderRadius: 24, padding: '32px 28px', marginBottom: 20,
                boxShadow: '0 8px 40px rgba(15,52,96,0.3)', position: 'relative', overflow: 'hidden'
            }}>
                <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,215,0,0.05)', pointerEvents: 'none' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20 }}>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 8 }}>Your Pop Coin Balance</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div style={{ fontSize: '3rem', animation: 'floatCoin 2.5s ease-in-out infinite', filter: 'drop-shadow(0 0 12px rgba(255,215,0,0.6))' }}>🪙</div>
                            <div style={{ fontSize: '3.5rem', fontWeight: 900, background: 'linear-gradient(135deg, #ffd700, #ffb700)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                {(data?.balance || 0).toLocaleString()}
                            </div>
                        </div>
                        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: '1.4rem' }}>{currentLevel.icon}</span>
                            <span style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>{currentLevel.name}</span>
                        </div>
                    </div>

                    {/* Level Progress */}
                    <div style={{ minWidth: 200 }}>
                        <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
                            {nextLevel ? `${nextLevel.min - (data?.balance || 0)} coins to ${nextLevel.name}` : 'Max Level Reached!'}
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 999, height: 10, overflow: 'hidden' }}>
                            <div style={{ width: `${progress}%`, height: '100%', borderRadius: 999, background: 'linear-gradient(90deg, #ffd700, #ffb700)', transition: 'width 1s ease' }} />
                        </div>
                        <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {LEVELS.map(l => (
                                <div key={l.name} style={{
                                    display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20,
                                    background: currentLevel.name === l.name ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.06)',
                                    border: currentLevel.name === l.name ? '1px solid rgba(255,215,0,0.4)' : '1px solid transparent',
                                    fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)'
                                }}>
                                    <span>{l.icon}</span>{l.name}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Earn Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 20 }}>
                {[
                    { icon: '📅', label: 'Book Appointment', coins: '+15' },
                    { icon: '🧠', label: 'Complete Quiz', coins: '+10–30' },
                    { icon: '📆', label: 'Daily Login', coins: '+5' },
                    { icon: '🤝', label: 'Referral', coins: '+100' },
                    { icon: '⭐', label: 'Subscribe', coins: '+50' },
                    { icon: '🔥', label: '7-Day Streak', coins: '+50' },
                ].map(item => (
                    <div key={item.label} style={{
                        background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(45,106,79,0.1)', borderRadius: 16, padding: '16px 14px',
                        textAlign: 'center', transition: 'transform 0.2s', cursor: 'default'
                    }}>
                        <div style={{ fontSize: '1.8rem', marginBottom: 6 }}>{item.icon}</div>
                        <div style={{ fontSize: '0.75rem', color: '#5a755a', marginBottom: 4 }}>{item.label}</div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: '#2d6a4f' }}>{item.coins}</div>
                        <div style={{ fontSize: '0.7rem', color: '#888' }}>Pop Coins</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Daily Quizzes */}
                <div>
                    <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.15rem', color: '#1a2e1a', marginBottom: 14 }}>🧠 Daily Health Quizzes</h3>
                    {activeQuiz ? (
                        <div className="pc-card">
                            {!quizDone ? (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                        <div style={{ fontSize: '0.82rem', color: '#6b8f71' }}>{activeQuiz.icon} {activeQuiz.title}</div>
                                        <div style={{ fontSize: '0.78rem', color: '#888' }}>Q{quizStep + 1}/{activeQuiz.questions.length}</div>
                                    </div>
                                    <div style={{ background: 'rgba(45,106,79,0.05)', borderRadius: 12, padding: '12px 14px', marginBottom: 16, fontSize: '0.92rem', fontWeight: 600, color: '#1a2e1a', lineHeight: 1.5 }}>
                                        {activeQuiz.questions[quizStep].q}
                                    </div>
                                    {activeQuiz.questions[quizStep].options.map((opt, i) => (
                                        <button key={i} className="pc-opt-btn" onClick={() => answerQuestion(i)} disabled={submitting}>{opt}</button>
                                    ))}
                                </>
                            ) : quizResult ? (
                                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                                    <div style={{ fontSize: '3rem', marginBottom: 8 }}>{quizResult.correct === quizResult.total ? '🎉' : '✅'}</div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#2d6a4f', marginBottom: 4 }}>
                                        {quizResult.correct}/{quizResult.total} Correct!
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 900, background: 'linear-gradient(135deg,#ffd700,#f4a261)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 12 }}>
                                        +{quizResult.coins} 🪙
                                    </div>
                                    {quizResult.level_up && <div style={{ color: '#2d6a4f', fontWeight: 700, marginBottom: 12 }}>⬆️ Level Up!</div>}
                                    <button onClick={() => setActiveQuiz(null)} style={{ padding: '10px 24px', borderRadius: 12, background: '#2d6a4f', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700 }}>Back to Quizzes</button>
                                </div>
                            ) : null}
                        </div>
                    ) : (
                        QUIZZES.map(quiz => (
                            <div key={quiz.id} className="pc-card pc-quiz-card" onClick={() => startQuiz(quiz)} style={{ marginBottom: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <span style={{ fontSize: '1.8rem' }}>{quiz.icon}</span>
                                        <div>
                                            <div style={{ fontWeight: 700, color: '#1a2e1a', fontSize: '0.9rem' }}>{quiz.title}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#888', marginTop: 2 }}>{quiz.questions.length} questions</div>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', padding: '3px 8px', borderRadius: 20, marginBottom: 4 }}
                                            className={`diff-${quiz.difficulty.toLowerCase()}`}>{quiz.difficulty}</div>
                                        <div style={{ fontWeight: 800, color: '#f4a261', fontSize: '0.9rem' }}>+{quiz.coins} 🪙</div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Transaction History */}
                <div>
                    <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.15rem', color: '#1a2e1a', marginBottom: 14 }}>📜 Recent Activity</h3>
                    <div className="pc-card" style={{ padding: '16px 20px' }}>
                        {!data?.recent_transactions?.length ? (
                            <div style={{ textAlign: 'center', color: '#999', padding: '20px 0', fontSize: '0.88rem' }}>
                                No activity yet. Start earning coins!
                            </div>
                        ) : data.recent_transactions.map((txn, i) => (
                            <div key={txn.id} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '12px 0', borderBottom: i < data.recent_transactions.length - 1 ? '1px solid rgba(45,106,79,0.08)' : 'none'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ fontSize: '1.4rem' }}>{ACTIVITY_ICONS[txn.activity] || ACTIVITY_ICONS.default}</div>
                                    <div>
                                        <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#1a2e1a' }}>{txn.description || txn.activity}</div>
                                        <div style={{ fontSize: '0.72rem', color: '#999', marginTop: 2 }}>
                                            {txn.createdAt ? new Date(txn.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}
                                        </div>
                                    </div>
                                </div>
                                <div style={{
                                    fontWeight: 800, fontSize: '0.95rem',
                                    color: txn.type === 'earned' ? '#2d6a4f' : '#c0392b'
                                }}>
                                    {txn.type === 'earned' ? '+' : ''}{txn.amount} 🪙
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Streaks */}
                    {data?.streaks?.length > 0 && (
                        <>
                            <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.15rem', color: '#1a2e1a', margin: '20px 0 14px' }}>🔥 Active Streaks</h3>
                            <div className="pc-card" style={{ padding: '16px 20px' }}>
                                {data.streaks.map(s => (
                                    <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
                                        <div>
                                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1a2e1a', textTransform: 'capitalize' }}>
                                                {s.activityType.replace(/_/g, ' ')}
                                            </div>
                                            <div style={{ fontSize: '0.72rem', color: '#999' }}>Longest: {s.longestStreak} days</div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{ fontSize: '1.3rem' }}>🔥</span>
                                            <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#e76f51' }}>{s.currentStreak}</span>
                                            <span style={{ fontSize: '0.75rem', color: '#888' }}>days</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Redeem Store */}
            <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.15rem', color: '#1a2e1a', margin: '20px 0 14px' }}>🛍️ Rewards Store</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 30 }}>
                {[
                    { icon: '💎', title: 'Subscription Discount', desc: '10% off any plan', cost: 200 },
                    { icon: '🤖', title: 'Premium AI Query', desc: '5 extra AI report scans', cost: 100 },
                    { icon: '👨‍⚕️', title: 'Free Consultation', desc: 'Chat with specialist', cost: 500 },
                    { icon: '🧘', title: 'Wellness Pack', desc: 'Personalized diet plan', cost: 150 },
                ].map(item => (
                    <div key={item.title} className="pc-card" style={{ marginBottom: 0 }}>
                        <div style={{ fontSize: '2rem', marginBottom: 8 }}>{item.icon}</div>
                        <div style={{ fontWeight: 700, color: '#1a2e1a', fontSize: '0.9rem', marginBottom: 4 }}>{item.title}</div>
                        <div style={{ fontSize: '0.77rem', color: '#6b8f71', marginBottom: 12 }}>{item.desc}</div>
                        <button
                            disabled={(data?.balance || 0) < item.cost}
                            style={{
                                width: '100%', padding: '10px', borderRadius: 12, border: 'none', cursor: (data?.balance || 0) >= item.cost ? 'pointer' : 'not-allowed',
                                background: (data?.balance || 0) >= item.cost ? 'linear-gradient(135deg, #2d6a4f, #40916c)' : 'rgba(0,0,0,0.06)',
                                color: (data?.balance || 0) >= item.cost ? '#fff' : '#aaa', fontWeight: 700, fontSize: '0.84rem', transition: 'all 0.2s'
                            }}
                        >
                            Redeem · {item.cost} 🪙
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
