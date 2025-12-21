
import { GoogleGenAI, Type } from "@google/genai";
import { Book } from "./types";

/**
 * AI LIBRARIAN (Chat)
 * Optimized for ZERO latency and high reliability.
 */
export const getAiRecommendation = async (query: string, inventory: Book[]) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    // Create a compact catalog list for context
    const bookList = inventory.map(b => `${b.title} by ${b.author} [ID: ${b.id}, ${b.isAvailable ? 'Available' : 'Issued'}]`).join(' | ');
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are VAYMN, a world-class professional librarian.
      CATALOG: [${bookList}]
      USER REQUEST: "${query}"
      
      RULES:
      1. Be helpful, concise, and professional.
      2. If a user asks for a book we HAVE, confirm availability.
      3. If we DON'T have it, suggest a similar book from our CATALOG first.
      4. Keep the response under 40 words.`,
      config: { 
        temperature: 0.2, // Lower temperature = more stable/predictable responses
        thinkingConfig: { thinkingBudget: 0 } // Disable thinking to prevent "Busy" errors
      }
    });
    
    return { 
      text: response.text || "I'm ready to help you find your next book. What are you looking for?",
      links: [] 
    };
  } catch (error) { 
    console.error("Librarian Error:", error);
    return { text: "I'm currently performing an inventory check. Please ask me about a specific title in a moment." }; 
  }
};

/**
 * AI INSIGHT: Generates a summary for a specific book.
 */
export const getBookInsight = async (title: string, author: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY ?? "" });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Write a compelling 2-sentence summary for the book "${title}" by ${author}. Highlight the main theme.`,
      config: { thinkingConfig: { thinkingBudget: 0 } }
    });
    return response.text || "A fascinating addition to our library collection.";
  } catch (e) { 
    return "This book is highly recommended by our curators."; 
  }
};

/**
 * ADMIN: AI META GENERATOR
 */
export const getBookDetails = async (title: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY ?? "" });
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
            description: { type: Type.STRING },
          },
          required: ["author", "genre", "description"]
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (e) { return null; }
};

/**
 * ADMIN: AI COVER GENERATOR
 */
export const generateBookCover = async (title: string, description: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { 
        parts: [{ 
          text: `Create a professional, high-resolution book cover for "${title}". 
          Description: ${description}. 
          Style: Modern, elegant, clean typography, minimalist illustration.` 
        }] 
      },
      config: { 
        imageConfig: { 
          aspectRatio: "3:4" 
        } 
      }
    });

    // Correctly find the image part in the multi-part response
    let base64Data = "";
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          base64Data = part.inlineData.data;
          break;
        }
      }
    }

    return base64Data ? `data:image/png;base64,${base64Data}` : null;
  } catch (e) { 
    console.error("Cover Generation Error:", e);
    return null; 
  }
};
