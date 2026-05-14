// Dynamically determine the API Base URL
// If the app is running on a live domain, use the production API.
// Otherwise, fall back to localhost for development.

const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

export const API_BASE_URL = isLocal 
    ? 'http://localhost:5002' 
    : 'https://api.vaidyamedx.in';

console.log(`Connected to Backend: ${API_BASE_URL}`);
