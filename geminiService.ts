import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Book } from "./types";

/**
 * AI LIBRARIAN (Chat)
 */
export const getAiRecommendation = async (query: string, inventory: Book[]) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const bookList = inventory.map(b => `${b.title} by ${b.author} [ID: ${b.id}, ${b.isAvailable ? 'Available' : 'Issued'}]`).join(' | ');
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are VAYMN, a world-class multilingual smart librarian.
      CATALOG: [${bookList}]
      USER REQUEST: "${query}"
      RULES:
      1. Detect the user's language (English, Hindi, or Marathi) and respond in that same language.
      2. Keep responses concise (under 50 words).
      3. If a book is available in the CATALOG, guide them to it.
      4. Be extremely polite and helpful.`,
      config: { 
        temperature: 0.3,
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    
    return { text: response.text || "I am here to help.", links: [] };
  } catch (error: any) { 
    console.error("VAYMN AI Error:", error);
    return { text: "I'm having trouble connecting right now. Please try again." }; 
  }
};

/**
 * AI VOICE (TTS)
 */
export const getAiVoice = async (text: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Speak this as a helpful library assistant: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (e) {
    console.error("TTS Error", e);
    return null;
  }
};

/**
 * ADMIN: AI META GENERATOR
 */
export const getBookDetails = async (title: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate library metadata for: "${title}".`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            author: { type: Type.STRING },
            genre: { type: Type.STRING },
            language: { type: Type.STRING, description: "Language of the book (English, Marathi, or Hindi)" },
            description: { type: Type.STRING },
          },
          required: ["author", "genre", "description", "language"]
        }
      }
    });
    const text = response.text;
    return text ? JSON.parse(text.trim()) : null;
  } catch (e) { 
    return null; 
  }
};
