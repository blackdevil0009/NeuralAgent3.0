import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';


const root = ReactDOM.createRoot(document.getElementById('root'));

// Global Resilience: Automatically fix broken images (e.g. blocked placeholders)
window.addEventListener('error', (e) => {
    if (e.target.tagName === 'IMG') {
        e.target.onerror = null; // Prevent loops
        e.target.src = '/placeholder-img.png';
        e.target.style.opacity = '0.5';
        e.target.style.width = '48px';
    }
}, true);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
