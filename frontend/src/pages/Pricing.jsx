import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/header';
import Footer from '../components/footer';
import { handleError } from '../utils/error_handlers';
import { API_BASE_URL } from '../utils/config';
import './pricing.css';

/* ── Scroll reveal hook ───────────────────────── */
function useReveal() {
    const refs = useRef([]);
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((e) => {
                    if (e.isIntersecting) {
                        e.target.classList.add('visible');
                        observer.unobserve(e.target);
                    }
                });
            },
            { threshold: 0.12 }
        );
        refs.current.forEach((el) => el && observer.observe(el));
        return () => observer.disconnect();
    }, []);
    return (i) => (el) => { refs.current[i] = el; };
}

const PLANS = [
    {
        title: "Basic",
        displayPeriod: "1 Month",
        price: "₹149",
        period: "/ Month",
        desc: "Perfect for monthly users who want full access to essential healthcare features.",
        features: [
            "AI Health Assistant",
            "Doctor Connectivity",
            "Health Monitoring",
            "Diet & Wellness Plans",
            "Emergency Support",
            "Report Analysis",
            "Pop Coin Rewards"
        ],
        highlight: false
    },
    {
        title: "Standard",
        displayPeriod: "3 Months",
        price: "₹349",
        period: "/ 3 Months",
        desc: "Best value for regular users with extended premium healthcare access.",
        features: [
            "All Monthly Plan Features",
            "Priority AI Assistance",
            "Advanced Health Tracking",
            "Extended Wellness Insights",
            "Better Savings on Subscription"
        ],
        highlight: true,
        badge: "Most Popular"
    },
    {
        title: "Premium",
        displayPeriod: "6 Months",
        price: "₹649",
        period: "/ 6 Months",
        desc: "Ideal for long-term healthcare management and smart wellness tracking.",
        features: [
            "All Premium Features",
            "Long-Term Health Monitoring",
            "Smart Healthcare Recommendations",
            "Priority Support",
            "Maximum Subscription Savings"
        ],
        highlight: false
    }
];

export default function Pricing() {
    const navigate = useNavigate();
    const ref = useReveal();
    
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
        if (!token) {
            navigate('/register');
            return;
        }

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
                            navigate('/patient/dashboard');
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
        <div className="pricing-page">
            <Header />

            {/* ──────────── HERO ──────────── */}
            <section className="pricing-hero" id="pricing-hero">
                <div className="pricing-hero-inner">
                    <div className="pricing-hero-badge">
                        <span className="pulse-dot" />
                        Vaidyamed-X Premium
                    </div>

                    <h1 className="pricing-hero-title">
                        Simple & Affordable
                        <span className="ph-gradient"> Pricing Plans</span>
                    </h1>

                    <p className="pricing-hero-desc">
                        Choose a healthcare plan that fits your needs with smart AI-powered healthcare services from <strong>Vaidyamed-X</strong>.
                    </p>
                </div>
            </section>

            {/* ──────────── PRICING PLANS ──────────── */}
            <section className="pricing-plans-section" id="pricing-plans">
                <div className="pricing-plans-inner">
                    <div className="pricing-grid">
                        {PLANS.map((plan, i) => (
                            <div 
                                className={`pricing-card pricing-reveal ${plan.highlight ? 'highlight' : ''}`} 
                                ref={ref(i)} 
                                key={i}
                                style={{ transitionDelay: `${i * 0.1}s` }}
                            >
                                {plan.badge && <div className="pricing-card-badge">{plan.badge}</div>}
                                <h3 className="pricing-card-title">{plan.displayPeriod}</h3>
                                <div className="pricing-card-price-wrap">
                                    <span className="pricing-card-price">{plan.price}</span>
                                    <span className="pricing-card-period">{plan.period}</span>
                                </div>
                                <p className="pricing-card-desc">{plan.desc}</p>
                                <ul className="pricing-card-features">
                                    {plan.features.map((f, j) => (
                                        <li key={j}>
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                            </svg>
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                                <button className={`pricing-card-btn ${plan.highlight ? 'primary' : 'secondary'}`} onClick={() => handleSubscribe(plan.title)}>
                                    {localStorage.getItem('token') || sessionStorage.getItem('token') ? 'Subscribe Now' : 'Get Started'}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ──────────── REFERRAL & FUTURE ──────────── */}
            <section className="pricing-info-section" id="pricing-info">
                <div className="pricing-info-inner pricing-reveal" ref={ref(10)}>
                    <div className="pi-block">
                        <div className="pi-icon">🎁</div>
                        <h2>Referral Rewards</h2>
                        <p>
                            Invite friends to Vaidyamed-X and earn rewards. <br/>
                            If 5 users subscribe through your referral, you receive <strong>1 Month Premium Access Free</strong>.
                        </p>
                    </div>

                    <div className="pi-block">
                        <div className="pi-icon">🌟</div>
                        <h2>Future of Smart Healthcare</h2>
                        <p>
                            Experience affordable, AI-powered, and connected healthcare with Vaidyamed-X. Join our growing community today.
                        </p>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}
