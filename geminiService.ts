
import { GoogleGenAI, Type } from "@google/genai";
import { Book } from "./types";

export const getAiRecommendation = async (query: string, inventory: Book[]) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    const bookList = inventory.map(b => `${b.title} by ${b.author} [ID: ${b.id}, ${b.isAvailable ? 'Available' : 'Issued'}]`).join(' | ');
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are VAYMN, a world-class professional librarian. CATALOG: [${bookList}] USER REQUEST: "${query}" RULES: 1. Be helpful, concise, and professional. 2. If a user asks for a book we HAVE, confirm availability. 3. If we DON'T have it, suggest a similar book from our CATALOG first. 4. Keep the response under 40 words.`,
      config: { 
        temperature: 0.2,
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    
    return { 
      text: response.text || "I'm ready to help you find your next book.",
      links: [] 
    };
  } catch (error) { 
    return { text: "I'm currently performing an inventory check. Please ask again in a moment." }; 
  }
};

export const getBookInsight = async (title: string, author: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Write a compelling 2-sentence summary for the book "${title}" by ${author}.`,
      config: { thinkingConfig: { thinkingBudget: 0 } }
    });
    return response.text || "A fascinating addition to our library collection.";
  } catch (e) { return "Highly recommended."; }
};

export const getBookDetails = async (title: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
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

export const generateBookCover = async (title: string, description: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { 
        parts: [{ text: `Professional book cover for "${title}". ${description}. Minimalist style.` }] 
      },
      config: { imageConfig: { aspectRatio: "3:4" } }
    });

    let base64Data = "";
    const candidate = response.candidates?.[0];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData?.data) {
          base64Data = part.inlineData.data;
          break;
        }
      }
    }
    return base64Data ? `data:image/png;base64,${base64Data}` : null;
  } catch (e) { return null; }
};
