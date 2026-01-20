import { GoogleGenAI } from "@google/genai";
import { Xitique, XitiqueStatus } from '../types';
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
    `${i + 1}. ${p.name} receives on ${p.payoutDate ? formatDate(p.payoutDate) : 'TBD'} ${p.customContribution ? `(Contribuição Personalizada: ${p.customContribution})` : ''}`
  ).join('\n');

  // Specific instruction if the group is in RISK mode due to unequal contributions
  const riskContext = xitique.status === XitiqueStatus.RISK 
    ? "ALERTA: Este grupo está marcado com status de 'RISCO' (RISK). Alguns membros têm valores de contribuição desiguais. Você DEVE fornecer uma recomendação específica de como resolver matematicamente essa discrepância para que o pote final seja justo." 
    : "";

  const prompt = `
    ${AI_PROMPT_PREFIX}

    Nome do Grupo: ${xitique.name}
    Status Atual: ${xitique.status}
    Contribuição Base: ${xitique.amount} por pessoa.
    Frequência: ${xitique.frequency}
    Total de Participantes: ${xitique.participants.length}
    
    Cronograma de Rotação:
    ${participantList}

    ${riskContext}

    Por favor forneça:
    1. Uma "Avaliação de Justiça" simplificada (Boa, Moderada, Precisa de Atenção).
    2. Uma explicação amigável de quem se beneficia um pouco mais (recebedores iniciais) vs quem é o "herói poupador" (recebedores tardios).
    3. Uma dica para gerenciar este grupo sem problemas. ${xitique.status === XitiqueStatus.RISK ? "Foque esta dica em resolver o risco financeiro." : ""}
    
    Mantenha curto (menos de 150 palavras). Formate com cabeçalhos claros ou tópicos.
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