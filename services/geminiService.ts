
import { GoogleGenAI } from "@google/genai";
import { Xitique, XitiqueStatus } from '../types';
import { AI_PROMPT_PREFIX } from '../constants';
import { formatDate } from './dateUtils';

// Removed top-level initialization to prevent crash on app load if key/process is missing.
// Initialization now happens inside the function call.

export const analyzeFairness = async (xitique: Xitique): Promise<string> => {
  // Safe access to API Key inside the function
  const apiKey = process.env.API_KEY;

  if (!apiKey || apiKey === 'your_gemini_api_key') {
    return "AI Analysis unavailable: Please configure a valid API_KEY in your .env file.";
  }

  // Initialize client only when needed
  const ai = new GoogleGenAI({ apiKey });

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
    return "Unable to connect to the smart assistant. Please check your internet connection and API Key configuration.";
  }
};