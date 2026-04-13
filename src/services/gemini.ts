import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function analyzeHealthScan(images: string[], description: string, medicalHistory: string) {
  try {
    const model = "gemini-3-flash-preview";
    
    const imageParts = images.map(img => ({
      inlineData: {
        mimeType: "image/jpeg",
        data: img.split(',')[1] || img // Handle base64 with or without prefix
      }
    }));

    const prompt = `
      You are a specialized medical AI assistant. A user has provided multiple photos of a health concern (e.g., a rash, tooth issue, or wound) and a description.
      
      User Description: ${description}
      User Medical History: ${medicalHistory}
      
      Please analyze the images and the provided context. 
      1. Provide a preliminary assessment of what the issue might be.
      2. Suggest immediate self-care steps if applicable.
      3. Advise on when to seek urgent medical attention.
      4. Note that this is an AI assessment and they should wait for a doctor's review.
      
      Keep the response professional, empathetic, and clear. Use Markdown for formatting.
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model,
      contents: { parts: [...imageParts, { text: prompt }] },
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "AI analysis failed. Please consult a healthcare professional directly.";
  }
}
