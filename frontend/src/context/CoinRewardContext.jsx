import React, { createContext, useContext, useState, useCallback } from 'react';

const CoinRewardContext = createContext(null);

export function CoinRewardProvider({ children }) {
    const [popup, setPopup] = useState(null); // { amount, message, level_up, new_level }

    const showReward = useCallback((amount, message = '', extra = {}) => {
        setPopup({ amount, message, ...extra, id: Date.now() });
        setTimeout(() => setPopup(null), 3500);
    }, []);

    return (
        <CoinRewardContext.Provider value={{ showReward }}>
            {children}
            {popup && <CoinRewardPopupUI key={popup.id} popup={popup} />}
        </CoinRewardContext.Provider>
    );
}

export function useCoinReward() {
    const ctx = useContext(CoinRewardContext);
    if (!ctx) throw new Error('useCoinReward must be used within CoinRewardProvider');
    return ctx;
}

function CoinRewardPopupUI({ popup }) {
    return (
        <div style={{
            position: 'fixed', bottom: 32, right: 32, zIndex: 9999,
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
            border: '1px solid rgba(255, 215, 0, 0.4)',
            borderRadius: 20, padding: '20px 28px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 30px rgba(255, 215, 0, 0.15)',
            display: 'flex', flexDirection: 'column', gap: 8, minWidth: 260,
            animation: 'coinPopIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}>
            <style>{`
                @keyframes coinPopIn {
                    from { transform: translateY(40px) scale(0.8); opacity: 0; }
                    to { transform: translateY(0) scale(1); opacity: 1; }
                }
                @keyframes coinSpin {
                    from { transform: rotateY(0deg); }
                    to { transform: rotateY(360deg); }
                }
                @keyframes coinFloat {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-6px); }
                }
            `}</style>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                    fontSize: '2.5rem', animation: 'coinFloat 1.5s ease-in-out infinite',
                    filter: 'drop-shadow(0 0 8px rgba(255,215,0,0.8))'
                }}>🪙</div>
                <div>
                    <div style={{
                        fontSize: '1.6rem', fontWeight: 900,
                        background: 'linear-gradient(135deg, #ffd700, #ffb700)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        letterSpacing: '-0.5px'
                    }}>
                        +{popup.amount} Pop Coins!
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
                        {popup.message || 'Keep up the great work!'}
                    </div>
                </div>
            </div>

            {popup.level_up && (
                <div style={{
                    background: 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,183,0,0.1))',
                    border: '1px solid rgba(255,215,0,0.3)', borderRadius: 12, padding: '8px 12px',
                    display: 'flex', alignItems: 'center', gap: 8, marginTop: 4
                }}>
                    <span style={{ fontSize: '1.2rem' }}>⬆️</span>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: '#ffd700', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Level Up!</div>
                        <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.9)' }}>{popup.new_level}</div>
                    </div>
                </div>
            )}
        </div>
    );
}
