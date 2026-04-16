// API Configuration
// For local development use 'http://127.0.0.1:8000/api'
// For production, this should be replaced with your actual backend URL

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000/api";

export default API_BASE;
