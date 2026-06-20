import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { handleError } from '../../utils/error_handlers';
import { API_BASE_URL } from '../../utils/config';

export default function HealthDashboard() {
    const [greeting, setGreeting] = useState('');
    const [userObj, setUserObj] = useState({});
    const [userName, setUserName] = useState('Friend');
    const [upcoming, setUpcoming] = useState([]);
    const [vitals, setVitals] = useState([]);
    const [symptoms, setSymptoms] = useState([]);
    const [activity, setActivity] = useState([]);
    const [activeEmergencies, setActiveEmergencies] = useState([]);
    const [activeSub, setActiveSub] = useState(null);
    const [fetchingSub, setFetchingSub] = useState(true);
    const [loading, setLoading] = useState(true);
    const [fetchingDash, setFetchingDash] = useState(true);

    useEffect(() => {
        const h = new Date().getHours();
        setGreeting(h < 12 ? '🌅 Good Morning' : h < 17 ? '☀️ Good Afternoon' : '🌙 Good Evening');
        try {
            const u = JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}');
            setUserObj(u);
            if (u.name) setUserName(u.name.split(' ')[0]);
        } catch { }

        const fetchUpcoming = async () => {
            try {
                const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                const res = await fetch(`${API_BASE_URL}/api/appointments`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const json = await res.json();
                if (res.ok) {
                    const all = json.data?.appointments || [];
                    const filtered = all
                        .filter(a => a.status === 'Scheduled' || a.status === 'Upcoming')
                        .sort((a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate))
                        .slice(0, 2);
                    setUpcoming(filtered);
                }
            } catch (err) {
                handleError(err, 'Failed to fetch upcoming appointments');
            } finally {
                setLoading(false);
            }
        };

        const fetchDashboardData = async () => {
            try {
                const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                const res = await fetch(`${API_BASE_URL}/api/patient/dashboard-data`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const json = await res.json();
                if (res.ok) {
                    const dashData = json.data || {};
                    setVitals(dashData.vitals || []);
                    setSymptoms(dashData.symptoms || []);
                    setActivity(dashData.activity || []);
                }
            } catch (err) {
                console.error("Failed to fetch dashboard metrics", err);
            } finally {
                setFetchingDash(false);
            }
        };

        const fetchEmergencies = async () => {
            try {
                const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                const res = await fetch(`${API_BASE_URL}/api/emergencies/my`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const json = await res.json();
                if (res.ok) {
                    const all = json.data?.emergencies || [];
                    setActiveEmergencies(all.filter(e => e.status !== 'resolved'));
                }
            } catch (err) {
                console.error("Failed to fetch active emergencies:", err);
            }
        };

        const fetchSubscription = async () => {
            try {
                const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                const res = await fetch(`${API_BASE_URL}/api/patient/subscriptions/my`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const json = await res.json();
                if (res.ok && json.data && json.data.plan_name) {
                    setActiveSub(json.data);
                }
            } catch (err) {
                console.error("Failed to fetch subscription:", err);
            } finally {
                setFetchingSub(false);
            }
        };

        fetchUpcoming();
        fetchDashboardData();
        fetchEmergencies();
        fetchSubscription();
    }, []);

    // Helper to format date
    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return {
            day: d.getDate().toString().padStart(2, '0'),
            month: d.toLocaleString('en-IN', { month: 'short' })
        };
    };

    const loadRazorpay = () => {
        return new Promise((resolve) => {
            if (window.Razorpay) { resolve(true); return; }
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const handleSubscribe = async (planTitle) => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) return;

        const res = await loadRazorpay();
        if (!res) {
            alert("Razorpay SDK failed to load. Check your connection.");
            return;
        }

        try {
            const req = await fetch(`${API_BASE_URL}/api/patient/subscriptions/create-order`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ planName: planTitle })
            });
            const data = await req.json();

            if (!req.ok || !data.success) {
                alert(data.message || "Failed to create order");
                return;
            }

            const order = data.data;

            const options = {
                key: order.razorpay_key_id, 
                amount: order.amount,
                currency: order.currency,
                name: "Vaidyamed-X",
                description: `Subscription - ${planTitle}`,
                order_id: order.id,
                handler: async function (response) {
                    try {
                        const verifyReq = await fetch(`${API_BASE_URL}/api/patient/subscriptions/verify`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature
                            })
                        });
                        const verifyData = await verifyReq.json();
                        if (verifyData.success) {
                            alert("Subscription activated successfully!");
                            window.location.reload();
                        } else {
                            alert(verifyData.message || "Verification failed");
                        }
                    } catch (e) {
                        console.error(e);
                        alert("Verification error.");
                    }
                },
                theme: { color: "#2d6a4f" }
            };
            
            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (response) {
                alert("Payment failed: " + response.error.description);
            });
            rzp.open();
            
        } catch (err) {
            handleError(err, "Failed to initiate subscription");
        }
    };

    return (
        <div>
            {/* Hero greeting banner */}
            <div className="pd-health-hero">
                <div>
                    <h2>{greeting}, {userName}! 🌿</h2>
                    <p>Here's your health overview for today — stay balanced, stay healthy.</p>
                    <div className="pd-dosha-bars" style={{ marginTop: 14 }}>
                        <div className="pd-dosha-row">
                            <span style={{ width: 46 }}>Vata</span>
                            <div className="pd-dosha-bar-track"><div className="pd-dosha-bar-fill pd-dosha-bar-vata" style={{ width: '40%' }} /></div>
                            <span>40%</span>
                        </div>
                        <div className="pd-dosha-row">
                            <span style={{ width: 46 }}>Pitta</span>
                            <div className="pd-dosha-bar-track"><div className="pd-dosha-bar-fill pd-dosha-bar-pitta" style={{ width: '35%' }} /></div>
                            <span>35%</span>
                        </div>
                        <div className="pd-dosha-row">
                            <span style={{ width: 46 }}>Kapha</span>
                            <div className="pd-dosha-bar-track"><div className="pd-dosha-bar-fill pd-dosha-bar-kapha" style={{ width: '25%' }} /></div>
                            <span>25%</span>
                        </div>
                    </div>
                </div>
                <div className="pd-health-hero-right">
                    <div className="pd-dosha-score">78</div>
                    <div className="pd-dosha-label">Overall Health Score</div>
                    <div style={{ marginTop: 10 }}>
                        <span className="pd-pill pd-pill-green">Vata-Pitta</span>
                    </div>
                </div>
            </div>

            {/* Active Emergency Alerts */}
            {activeEmergencies.length > 0 && (
                <div style={{
                    margin: '24px 0', padding: '20px 24px', borderRadius: 20,
                    background: 'linear-gradient(135deg, #c0392b, #e74c3c)',
                    color: '#fff', boxShadow: '0 10px 30px rgba(192,57,43,0.3)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    animation: 'pulse 2s infinite'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                        <div style={{ fontSize: '2.5rem' }}>🚨</div>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Active Emergency Alert
                            </div>
                            <div style={{ opacity: 0.9, fontSize: '0.95rem', marginTop: 4 }}>
                                {activeEmergencies[0].status === 'pending' 
                                    ? 'Broadcasting to all available senior consultants...' 
                                    : 'A doctor is currently responding to your case.'}
                            </div>
                        </div>
                    </div>
                    <Link to="/patient/emergency" style={{ 
                        background: '#fff', color: '#c0392b', padding: '10px 20px', 
                        borderRadius: 50, fontWeight: 700, textDecoration: 'none',
                        fontSize: '0.9rem', boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                    }}>
                        View Details
                    </Link>
                </div>
            )}

            {/* Upgrade Pricing Cards if no active sub */}
            {!fetchingSub && !activeSub && (
                <div style={{ margin: '24px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
                        <div>
                            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.4rem', fontFamily: 'Playfair Display, serif', color: '#1e3c2c' }}>
                                ✨ Upgrade to Vaidyamed-X Premium
                            </h3>
                            <p style={{ margin: 0, fontSize: '0.95rem', color: '#5a755a' }}>
                                Choose a plan and unlock AI Report Analysis, Priority Doctor Connectivity, and Advanced Wellness tracking.
                            </p>
                        </div>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                        {[
                            { title: "Basic", displayPeriod: "1 Month", price: "₹149", highlight: false },
                            { title: "Standard", displayPeriod: "3 Months", price: "₹349", highlight: true, badge: "Popular" },
                            { title: "Premium", displayPeriod: "6 Months", price: "₹649", highlight: false }
                        ].map((plan, i) => (
                            <div key={i} style={{
                                background: plan.highlight ? 'linear-gradient(135deg, #1e3c2c, #2d6a4f)' : '#fff',
                                color: plan.highlight ? '#fff' : '#1e3c2c',
                                padding: '24px', borderRadius: '16px', border: plan.highlight ? 'none' : '1px solid #e2f0e6',
                                position: 'relative', overflow: 'hidden', boxShadow: plan.highlight ? '0 10px 30px rgba(45,106,79,0.2)' : '0 4px 15px rgba(0,0,0,0.03)',
                                display: 'flex', flexDirection: 'column'
                            }}>
                                {plan.badge && (
                                    <div style={{
                                        position: 'absolute', top: 16, right: -30, background: '#e9c46a', color: '#1e3c2c',
                                        fontSize: '0.7rem', fontWeight: 800, padding: '4px 30px', transform: 'rotate(45deg)', textTransform: 'uppercase'
                                    }}>
                                        {plan.badge}
                                    </div>
                                )}
                                <h4 style={{ margin: '0 0 10px 0', fontSize: '1.1rem', opacity: plan.highlight ? 0.9 : 0.7 }}>{plan.displayPeriod}</h4>
                                <div style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '20px' }}>{plan.price}</div>
                                
                                <button 
                                    onClick={() => handleSubscribe(plan.title)}
                                    style={{
                                        marginTop: 'auto', padding: '12px', borderRadius: '8px', border: 'none',
                                        background: plan.highlight ? '#fff' : '#e2f0e6',
                                        color: plan.highlight ? '#1e3c2c' : '#2d6a4f',
                                        fontWeight: 700, cursor: 'pointer', transition: 'all 0.3s ease'
                                    }}
                                    onMouseOver={(e) => {
                                        e.target.style.transform = 'translateY(-2px)';
                                        e.target.style.boxShadow = plan.highlight ? '0 5px 15px rgba(255,255,255,0.2)' : '0 5px 15px rgba(45,106,79,0.1)';
                                    }}
                                    onMouseOut={(e) => {
                                        e.target.style.transform = 'translateY(0)';
                                        e.target.style.boxShadow = 'none';
                                    }}
                                >
                                    Subscribe Now
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Vitals Grid */}
            <h3 className="pd-section-title">📊 Today's Vitals</h3>
            {fetchingDash ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#666' }}>⚡ Synchronizing health metrics…</div>
            ) : vitals.length === 0 ? (
                <div className="pd-card" style={{ padding: 40, textAlign: 'center', color: '#888', marginBottom: 24 }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>📡</div>
                    <p style={{ fontWeight: 600, color: '#555' }}>No health metrics yet.</p>
                    <p style={{ fontSize: '0.88rem', marginBottom: 16 }}>Upload a medical report and run AI analysis to sync your vitals here.</p>
                    <Link to="/patient/reports" className="pd-btn pd-btn-primary" style={{ display: 'inline-flex' }}>
                        📄 Upload a Report
                    </Link>
                </div>
            ) : (
                <div className="pd-grid-3" style={{ marginBottom: 24 }}>
                    {vitals.map(v => (
                        <div className="pd-stat-card" key={v.label}>
                            <div className={`pd-stat-icon ${v.color}`}>{v.icon}</div>
                            <div>
                                <div className="pd-stat-value">{v.value}<small style={{ fontSize: '0.70rem', fontWeight: 400, marginLeft: 3 }}>{v.unit}</small></div>
                                <div className="pd-stat-label">{v.label}</div>
                                <div className={`pd-stat-change ${v.dir}`}>{v.dir === 'up' ? '▲' : '▼'} {v.change}</div>
                            </div>
                        </div>
                    ))}
                    <Link to="/patient/wellness" className="pd-stat-card" style={{ textDecoration: 'none', height: '100%' }}>
                        <div className="pd-stat-icon green" style={{ fontSize: '1.8rem' }}>🌿</div>
                        <div>
                            <div className="pd-stat-value" style={{ fontSize: '1.2rem' }}>Health Wellness</div>
                            <div className="pd-stat-label">Dosha quiz, diet plans & reminders</div>
                            <div className="pd-stat-change up" style={{ fontSize: '0.85rem' }}>New</div>
                        </div>
                    </Link>
                </div>
            )}

            {/* Lower 2 cols */}
            <div className="pd-grid-2">
                {/* Analyzed Symptoms */}
                <div className="pd-card">
                    <h3 className="pd-section-title">🩺 Analyzed Symptoms</h3>
                    {symptoms.length === 0 ? (
                        <div style={{ padding: '20px 0', textAlign: 'center', color: '#999' }}>No symptoms analyzed from reports.</div>
                    ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {symptoms.map((s, i) => (
                                <span key={i} className={`pd-pill ${s.severity === 'Critical' ? 'pd-pill-red' : s.severity === 'Moderate' ? 'pd-pill-gold' : 'pd-pill-green'}`}>
                                    {s.symptom}
                                </span>
                            ))}
                        </div>
                    )}

                    <h3 className="pd-section-title" style={{ marginTop: 30 }}>🕐 Recent Activity</h3>
                    <ul className="pd-timeline">
                        {activity.concat([{ title: 'Dashboard synced with AI', time: 'Just now', dot: '#52b788' }]).map((a, i) => (
                            <li key={i}>
                                <div className="pd-tl-dot" style={{ background: a.dot }} />
                                <div>
                                    <div className="pd-tl-title">{a.title}</div>
                                    <div className="pd-tl-time">{a.time}</div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Upcoming appointments */}
                <div className="pd-card">
                    <h3 className="pd-section-title">📅 Upcoming Appointments</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '20px 0', color: '#6b8f71', fontSize: '0.88rem' }}>⏳ Fetching your schedule…</div>
                        ) : upcoming.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '20px 0', color: '#999', fontSize: '0.88rem' }}>No upcoming appointments.</div>
                        ) : upcoming.map((u, i) => {
                            const { day, month } = formatDate(u.appointmentDate);
                            return (
                                <div key={u.id} style={{
                                    display: 'flex', gap: 14, alignItems: 'center', padding: '12px 16px',
                                    background: 'rgba(45,106,79,0.05)', borderRadius: 12,
                                    border: '1px solid rgba(45,106,79,0.10)'
                                }}>
                                    <div style={{
                                        background: 'rgba(45,106,79,0.10)', borderRadius: 10,
                                        padding: '8px 10px', textAlign: 'center', flexShrink: 0
                                    }}>
                                        <div style={{ fontSize: '0.65rem', color: '#6b8f71', textTransform: 'uppercase' }}>
                                            {month}
                                        </div>
                                        <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.3rem', color: '#2d6a4f', lineHeight: 1 }}>
                                            {day}
                                        </div>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{u.doctorName}</div>
                                        <div style={{ fontSize: '0.76rem', color: '#6b8f71' }}>{u.spec}</div>
                                        <div style={{ fontSize: '0.76rem', color: '#6b8f71', marginTop: 2 }}>⏰ {u.appointmentTime.substring(0, 5)} · {u.type}</div>
                                    </div>
                                    <span className={`pd-pill ${u.type === 'Chat Consultation' ? 'pd-pill-blue' : 'pd-pill-green'}`}>{u.type}</span>
                                </div>
                            );
                        })}
                        <Link to="/patient/appointments" className="pd-btn pd-btn-outline" style={{ justifyContent: 'center', marginTop: 4 }}>
                            View All Appointments
                        </Link>
                    </div>
                </div>
            </div>

            {/* Ayurvedic tip */}
            <div style={{
                marginTop: 20, background: 'linear-gradient(135deg,#f4faf6,#eaf5ee)',
                border: '1px solid rgba(45,106,79,0.14)', borderRadius: 16, padding: '18px 22px',
                display: 'flex', gap: 14, alignItems: 'center'
            }}>
                <span style={{ fontSize: '2rem' }}>🌿</span>
                <div>
                    <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '0.95rem', color: '#2d6a4f', marginBottom: 3 }}>
                        Ayurvedic Tip of the Day
                    </div>
                    <div style={{ fontSize: '0.84rem', color: '#5a755a', lineHeight: 1.7 }}>
                        Start your morning with warm water and a teaspoon of honey mixed with fresh ginger to balance Vata and Pitta doshas.
                    </div>
                </div>
            </div>

            {/* Refer & Earn */}
            <div style={{
                marginTop: 20, background: '#fff',
                border: '1px solid rgba(45,106,79,0.14)', borderRadius: 16, padding: '24px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.03)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                    <div style={{ flex: '1 1 300px' }}>
                        <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.4rem', color: '#1a2e1a', marginBottom: '8px' }}>
                            🎁 Refer & Earn Rewards
                        </h3>
                        <p style={{ fontSize: '0.9rem', color: '#5a755a', lineHeight: 1.6, marginBottom: '16px' }}>
                            Invite friends to Vaidyamed-X. Get <strong>1 Month Premium FREE</strong> when 5 users subscribe using your code.
                        </p>
                        
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <div style={{ 
                                background: '#f4faf6', border: '1px dashed #2d6a4f', padding: '10px 16px', 
                                borderRadius: '8px', fontSize: '1.1rem', fontWeight: 700, color: '#2d6a4f',
                                letterSpacing: '1px'
                            }}>
                                {userObj.referral_code || 'VMX-INVITE'}
                            </div>
                            <button 
                                onClick={() => {
                                    navigator.clipboard.writeText(userObj.referral_code || 'VMX-INVITE');
                                    alert('Referral code copied!');
                                }}
                                style={{ 
                                    background: '#2d6a4f', color: '#fff', border: 'none', padding: '10px 16px',
                                    borderRadius: '8px', cursor: 'pointer', fontWeight: 600
                                }}>
                                Copy
                            </button>
                        </div>
                    </div>
                    
                    <div style={{ flex: '1 1 300px', background: '#f8fdf9', padding: '20px', borderRadius: '12px', border: '1px solid #e2f0e6' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontSize: '0.9rem', color: '#3d5c3d', fontWeight: 600 }}>Your Progress ({(userObj.referrals_count || 0) % 5}/5)</span>
                            <span style={{ fontSize: '0.9rem', color: '#2d6a4f', fontWeight: 700 }}>{userObj.referral_rewards || 0} Rewards Earned</span>
                        </div>
                        <div style={{ width: '100%', height: '10px', background: '#e0e0e0', borderRadius: '5px', overflow: 'hidden', marginBottom: '12px' }}>
                            <div style={{ 
                                width: `${((userObj.referrals_count || 0) % 5) * 20}%`, 
                                height: '100%', 
                                background: 'linear-gradient(90deg, #2d6a4f, #52b788)',
                                transition: 'width 0.5s ease'
                            }} />
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <a href={`https://wa.me/?text=Join Vaidyamed-X — Smart AI-Powered Healthcare Platform. Use my referral code ${userObj.referral_code || 'VMX-INVITE'} and explore the future of healthcare.`} target="_blank" rel="noreferrer" style={{ flex: 1, textAlign: 'center', background: '#25D366', color: '#fff', padding: '8px', borderRadius: '6px', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>
                                WhatsApp
                            </a>
                            <a href={`https://t.me/share/url?url=https://vaidyamedx.com&text=Join Vaidyamed-X! Use my referral code ${userObj.referral_code || 'VMX-INVITE'}`} target="_blank" rel="noreferrer" style={{ flex: 1, textAlign: 'center', background: '#0088cc', color: '#fff', padding: '8px', borderRadius: '6px', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>
                                Telegram
                            </a>
                        </div>
                    </div>
                </div>
            </div>
            <style>{`
                @keyframes pulse {
                    0% { opacity: 0.9; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.01); }
                    100% { opacity: 0.9; transform: scale(1); }
                }
            `}</style>
        </div>
    );
}
