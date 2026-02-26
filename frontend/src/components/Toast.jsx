import React from 'react';

const TYPE_STYLES = {
    success: {
        bg: '#eafaf1',
        border: '#27ae60',
        color: '#1e8449',
        icon: '🌿'
    },
    error: {
        bg: '#fdf2f2',
        border: '#e74c3c',
        color: '#9b2c2c',
        icon: '⚠️'
    },
    info: {
        bg: '#ebf8ff',
        border: '#3182ce',
        color: '#2c5282',
        icon: 'ℹ️'
    },
    warning: {
        bg: '#fffaf0',
        border: '#ed8936',
        color: '#a0522d',
        icon: '🔔'
    }
};

const Toast = ({ message, type = 'info', onClose }) => {
    const style = TYPE_STYLES[type] || TYPE_STYLES.info;

    return (
        <div style={{
            minWidth: '300px',
            maxWidth: '450px',
            padding: '14px 18px',
            background: style.bg,
            borderLeft: `5px solid ${style.border}`,
            borderRadius: '12px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: style.color,
            pointerEvents: 'auto',
            animation: 'toast-slide-in 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            position: 'relative',
        }}>
            <style>
                {`
                    @keyframes toast-slide-in {
                        from { transform: translateX(120%); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                `}
            </style>
            <span style={{ fontSize: '1.2rem' }}>{style.icon}</span>
            <div style={{ fontSize: '0.88rem', fontWeight: 500, flex: 1 }}>
                {message}
            </div>
            <button
                onClick={onClose}
                style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    color: style.color,
                    opacity: 0.6,
                    padding: '4px',
                }}
            >
                ✕
            </button>
        </div>
    );
};

export default Toast;
