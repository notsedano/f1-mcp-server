// Gemini AI Configuration
export const GEMINI_CONFIG = {
  apiKey: import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.REACT_APP_GEMINI_API_KEY || '',
  generationConfig: {
    temperature: 0.1,
    topP: 0.8,
    topK: 40,
    maxOutputTokens: 1000,
  },
}; 