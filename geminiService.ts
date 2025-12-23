
import { GoogleGenAI, Type } from "@google/genai";
import { Book } from "./types";

/**
 * HELPER: Unified AI Client Initialization
 */
const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === 'undefined' || apiKey === '') {
    throw new Error("MISSING_KEY");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * AI LIBRARIAN (Chat)
 */
export const getAiRecommendation = async (query: string, inventory: Book[]) => {
  try {
    const ai = getAiClient();
    const bookList = inventory.map(b => `${b.title} by ${b.author} [ID: ${b.id}, ${b.isAvailable ? 'Available' : 'Issued'}]`).join(' | ');
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are VAYMN, a world-class librarian.
      CATALOG: [${bookList}]
      USER REQUEST: "${query}"
      RULES: Concise (40 words), professional, confirm availability if we have it.`,
      config: { 
        temperature: 0.2,
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    
    return { text: response.text || "I'm ready to help you find your next book.", links: [] };
  } catch (error: any) { 
    console.error("VAYMN AI Error:", error);
    return { text: "The librarian is currently off-duty. Please ensure your AI configuration is active and redeploy if necessary." }; 
  }
};

/**
 * AI INSIGHT: Summaries
 */
export const getBookInsight = async (title: string, author: string) => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Provide a 2-sentence professional summary for "${title}" by ${author}.`,
      config: { thinkingConfig: { thinkingBudget: 0 } }
    });
    return response.text || "Highly recommended for your collection.";
  } catch (e) { 
    return "No AI insight available at this time."; 
  }
};

/**
 * ADMIN: AI META GENERATOR
 */
export const getBookDetails = async (title: string) => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate library metadata (author, genre, description) for: "${title}".`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            author: { type: Type.STRING },
            genre: { type: Type.STRING },
            description: { type: Type.STRING },
          },
          required: ["author", "genre", "description"]
        }
      }
    });
    
    const text = response.text;
    if (!text) return null;
    return JSON.parse(text.trim());
  } catch (e) { 
    console.error("Metadata Generation Error:", e);
    return null; 
  }
};

/**
 * ADMIN: AI COVER GENERATOR
 */
export const generateBookCover = async (title: string, description: string) => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { 
        parts: [{ text: `A clean, professional, high-resolution book cover for "${title}". Description: ${description}. Style: Modern, cinematic graphic design.` }] 
      },
      config: { imageConfig: { aspectRatio: "3:4" } }
    });

    // Safe access using optional chaining
    const parts = response.candidates?.[0]?.content?.parts;
    
    if (parts) {
      for (const part of parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (e) { 
    console.error("Cover Generation Error:", e);
    return null; 
  }
};
