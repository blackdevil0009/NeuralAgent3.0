import React, { useState, useEffect } from 'react';
import { getStoredAuthSession } from '../../../utils/authStorage';
import { API_BASE_URL } from '../../../utils/config';
import { useToast } from '../../../context/ToastContext';

export default function Quiz() {
    const [view, setView] = useState('dashboard'); // 'dashboard', 'quiz', 'results'
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // Quiz state
    const [activeQuiz, setActiveQuiz] = useState({
        category: null,
        level: null,
        questions: [],
        currentIndex: 0,
        isDailyChallenge: false
    });
    const [answers, setAnswers] = useState([]);
    
    // Results state
    const [results, setResults] = useState(null);
    
    const { showToast } = useToast();

    const fetchDashboard = async () => {
        setLoading(true);
        try {
            const { token } = getStoredAuthSession();
            const res = await fetch(`${API_BASE_URL}/api/quiz/dashboard`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setDashboardData(data);
            } else {
                showToast(data.error || 'Failed to load dashboard', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('Network error', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (view === 'dashboard') {
            fetchDashboard();
        }
    }, [view]);

    const startQuiz = async (category, levelId, isDaily = false) => {
        setLoading(true);
        try {
            const { token } = getStoredAuthSession();
            const res = await fetch(`${API_BASE_URL}/api/quiz/start?category_id=${category.id}&level_id=${levelId}&limit=5`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            
            if (res.ok && data.questions && data.questions.length > 0) {
                setActiveQuiz({
                    category,
                    levelId,
                    questions: data.questions,
                    currentIndex: 0,
                    isDailyChallenge: isDaily
                });
                setAnswers([]);
                setView('quiz');
            } else {
                showToast(data.error || 'No questions available for this level.', 'info');
            }
        } catch (err) {
            console.error(err);
            showToast('Network error while starting quiz', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAnswer = (answerText) => {
        const currentQ = activeQuiz.questions[activeQuiz.currentIndex];
        const newAnswers = [...answers, { question_id: currentQ.id, answer: answerText }];
        setAnswers(newAnswers);
        
        if (activeQuiz.currentIndex < activeQuiz.questions.length - 1) {
            setActiveQuiz(prev => ({ ...prev, currentIndex: prev.currentIndex + 1 }));
        } else {
            submitQuiz(newAnswers);
        }
    };

    const submitQuiz = async (finalAnswers) => {
        setLoading(true);
        try {
            const { token } = getStoredAuthSession();
            const payload = {
                category_id: activeQuiz.category.id,
                level_id: activeQuiz.levelId,
                answers: finalAnswers,
                is_daily_challenge: activeQuiz.isDailyChallenge
            };
            
            const res = await fetch(`${API_BASE_URL}/api/quiz/submit`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            
            if (res.ok) {
                setResults(data);
                setView('results');
                if (data.coins_earned > 0) {
                    showToast(`You earned ${data.coins_earned} Pop Coins! 🎉`, 'success');
                }
            } else {
                showToast(data.error || 'Failed to submit quiz', 'error');
                setView('dashboard');
            }
        } catch (err) {
            console.error(err);
            showToast('Network error while submitting quiz', 'error');
            setView('dashboard');
        } finally {
            setLoading(false);
        }
    };

    if (loading && view === 'dashboard') {
        return <div style={{ textAlign: 'center', padding: 50 }}>Loading Wellness Quiz...</div>;
    }

    if (view === 'dashboard' && dashboardData) {
        const { progress, popCoinBalance, unlockedLevels, categories, dailyChallengeAvailable } = dashboardData;
        const currentLevel = progress.currentLevel || unlockedLevels[0];
        const nextLevel = unlockedLevels.length > 0 ? unlockedLevels[unlockedLevels.length - 1] : null; 
        // Note: Actual next level logic would depend on the full list of levels, but we can just show progress score.

        return (
            <div style={{ maxWidth: 800, margin: '0 auto' }}>
                {/* Header Stats */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h2 style={{ fontFamily: 'Playfair Display, serif', margin: 0 }}>Wellness Quiz</h2>
                    <div style={{ background: '#c9a84c', color: '#fff', padding: '8px 16px', borderRadius: 20, fontWeight: 'bold' }}>
                        🪙 {popCoinBalance} Pop Coins
                    </div>
                </div>

                {/* Progress Card */}
                <div className="pd-card" style={{ padding: 24, marginBottom: 24 }}>
                    <h3 style={{ marginTop: 0, color: '#6b8f71' }}>Your Progress: {currentLevel?.name || 'Beginner'}</h3>
                    <div style={{ background: '#f0f0f0', height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 10 }}>
                        <div style={{ 
                            background: '#6b8f71', 
                            height: '100%', 
                            width: `${Math.min(100, (progress.totalScore / (currentLevel?.requiredScoreToUnlock || 100)) * 100)}%` 
                        }} />
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#666' }}>
                        Total Score: {progress.totalScore} | Quizzes Completed: {progress.quizzesCompleted}
                    </div>
                </div>

                {/* Daily Challenge */}
                {dailyChallengeAvailable && (
                    <div className="pd-card" style={{ padding: 24, marginBottom: 24, background: 'linear-gradient(135deg, #e0f2e9 0%, #c8e6d8 100%)', border: '1px solid #6b8f71' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ marginTop: 0, marginBottom: 8, color: '#2c3e32' }}>⭐ Daily Challenge Available!</h3>
                                <p style={{ margin: 0, color: '#4a6b54' }}>Complete a quiz today to earn a 50 Pop Coin bonus.</p>
                            </div>
                            <button 
                                className="pd-btn pd-btn-primary"
                                onClick={() => startQuiz(categories[0], currentLevel?.id || 1, true)}
                            >
                                Play Now
                            </button>
                        </div>
                    </div>
                )}

                {/* Categories */}
                <h3 style={{ fontFamily: 'Playfair Display, serif' }}>Choose a Routine</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                    {categories.map(cat => (
                        <div 
                            key={cat.id} 
                            className="pd-card" 
                            style={{ padding: 20, cursor: 'pointer', transition: 'transform 0.2s' }}
                            onClick={() => startQuiz(cat, currentLevel?.id || 1)}
                            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <h4 style={{ marginTop: 0, marginBottom: 8 }}>{cat.name}</h4>
                            <p style={{ fontSize: '0.85rem', color: '#666', margin: 0 }}>{cat.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (view === 'quiz' && activeQuiz.questions.length > 0) {
        const q = activeQuiz.questions[activeQuiz.currentIndex];
        
        return (
            <div style={{ maxWidth: 600, margin: '0 auto' }}>
                <div className="pd-card" style={{ padding: 40 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 30, color: '#6b8f71' }}>
                        <span style={{ fontWeight: 'bold' }}>{activeQuiz.category.name}</span>
                        <span>Question {activeQuiz.currentIndex + 1} of {activeQuiz.questions.length}</span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div style={{ background: '#f0f0f0', height: 4, borderRadius: 2, marginBottom: 30 }}>
                        <div style={{ 
                            background: '#c9a84c', 
                            height: '100%', 
                            width: `${((activeQuiz.currentIndex) / activeQuiz.questions.length) * 100}%`,
                            transition: 'width 0.3s ease'
                        }} />
                    </div>

                    <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.4rem', lineHeight: 1.5, marginBottom: 30 }}>
                        {q.questionText}
                    </h2>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {q.options && q.options.map((opt, i) => (
                            <button
                                key={i}
                                className="pd-btn pd-btn-outline"
                                style={{ justifyContent: 'flex-start', padding: '16px 20px', textAlign: 'left', whiteSpace: 'normal', height: 'auto' }}
                                onClick={() => handleAnswer(opt)}
                                disabled={loading}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'results' && results) {
        const percentage = Math.round((results.score / results.total_questions) * 100);
        
        return (
            <div style={{ maxWidth: 600, margin: '0 auto' }}>
                <div className="pd-card" style={{ padding: 40, textAlign: 'center' }}>
                    <div style={{ fontSize: '4rem', marginBottom: 20 }}>
                        {percentage >= 80 ? '🏆' : percentage >= 50 ? '🌟' : '📚'}
                    </div>
                    <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '2rem', marginBottom: 10 }}>
                        Quiz Complete!
                    </h2>
                    <div style={{ fontSize: '1.2rem', color: '#6b8f71', marginBottom: 10 }}>
                        You scored {results.score} out of {results.total_questions}
                    </div>
                    
                    {results.coins_earned > 0 && (
                        <div style={{ display: 'inline-block', background: '#fff9e6', color: '#b89433', padding: '8px 24px', borderRadius: 20, fontWeight: 'bold', fontSize: '1.2rem', marginBottom: 30 }}>
                            +{results.coins_earned} Pop Coins 🪙
                        </div>
                    )}
                    
                    <div style={{ textAlign: 'left', marginTop: 20 }}>
                        <h3 style={{ fontFamily: 'Playfair Display, serif' }}>Review</h3>
                        {results.results.map((res, i) => (
                            <div key={i} style={{ 
                                padding: 16, 
                                borderRadius: 8, 
                                marginBottom: 16,
                                background: res.is_correct ? 'rgba(107, 143, 113, 0.1)' : 'rgba(200, 50, 50, 0.05)',
                                borderLeft: `4px solid ${res.is_correct ? '#6b8f71' : '#c83232'}`
                            }}>
                                <div style={{ fontWeight: 'bold', marginBottom: 8, color: res.is_correct ? '#4a6b54' : '#a02828' }}>
                                    {res.is_correct ? '✓ Correct' : '✗ Incorrect'}
                                </div>
                                <div style={{ fontSize: '0.95rem', marginBottom: 8 }}>
                                    <strong>Answer:</strong> {res.correct_answer}
                                </div>
                                {res.explanation && (
                                    <div style={{ fontSize: '0.9rem', color: '#555', fontStyle: 'italic' }}>
                                        💡 {res.explanation}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <button 
                        className="pd-btn pd-btn-primary" 
                        style={{ marginTop: 20, width: '100%' }}
                        onClick={() => {
                            setResults(null);
                            setView('dashboard');
                        }}
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return null;
}
