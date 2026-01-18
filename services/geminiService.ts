import { GoogleGenAI } from "@google/genai";
import { Xitique } from '../types';
import { AI_PROMPT_PREFIX } from '../constants';
import { formatDate } from './dateUtils';

// Initialize Gemini
// NOTE: In a real production app, you would proxy this through a backend to protect the key.
// For this frontend-only demo, we rely on the env var.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeFairness = async (xitique: Xitique): Promise<string> => {
  if (!process.env.API_KEY) {
    return "AI Analysis unavailable: API Key not configured.";
  }

  const participantList = xitique.participants.map((p, i) => 
    `${i + 1}. ${p.name} receives on ${p.payoutDate ? formatDate(p.payoutDate) : 'TBD'}`
  ).join('\n');

  const prompt = `
    ${AI_PROMPT_PREFIX}

    Group Name: ${xitique.name}
    Contribution: ${xitique.amount} per person.
    Frequency: ${xitique.frequency}
    Total Participants: ${xitique.participants.length}
    
    Rotation Schedule:
    ${participantList}

    Please provide:
    1. A simplified "Fairness Rating" (Good, Moderate, Needs Attention).
    2. A friendly explanation of who benefits slightly more (early receivers) vs who is the "hero saver" (late receivers).
    3. One tip for managing this group smoothly.
    
    Keep it short (under 150 words). Format with clear headers or bullet points.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Could not generate analysis.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Unable to connect to the smart assistant. Please check your internet connection.";
  }
};
