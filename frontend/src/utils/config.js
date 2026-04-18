const isProd = process.env.NODE_ENV === 'production';
const fallbackUrl = isProd ? 'https://api.vaidyamedx.in' : 'http://localhost:5000';

export const API_BASE_URL = process.env.REACT_APP_API_URL || fallbackUrl;

