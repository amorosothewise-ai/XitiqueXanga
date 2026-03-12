
import { GoogleGenAI, Type } from "@google/genai";
import { Xitique, XitiqueStatus } from '../types';
import { AI_PROMPT_PREFIX } from '../constants';
import { formatDate } from './dateUtils';
import { supabase } from './supabase';

// --- PERSISTENCE LOGIC ---

export interface StoredAnalysis {
  id: string;
  xitique_id?: string;
  user_id: string;
  type: 'FAIRNESS' | 'GOAL_PLAN';
  input_data: any;
  result: any;
  created_at: string;
}

export const saveAIResult = async (
  userId: string, 
  type: StoredAnalysis['type'], 
  inputData: any, 
  result: any,
  xitiqueId?: string
) => {
  try {
    const { error } = await supabase
      .from('ai_analyses')
      .insert({
        user_id: userId,
        xitique_id: xitiqueId,
        type,
        input_data: inputData,
        result,
        created_at: new Date().toISOString()
      });
    
    if (error) console.warn('Could not save AI result to Supabase:', error.message);
  } catch (err) {
    console.error('Supabase AI Save Error:', err);
  }
};

export const getAIHistory = async (userId: string, type?: StoredAnalysis['type']): Promise<StoredAnalysis[]> => {
  try {
    let query = supabase
      .from('ai_analyses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (type) query = query.eq('type', type);
    
    const { data, error } = await query.limit(10);
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Supabase AI Fetch Error:', err);
    return [];
  }
};

// --- ANALYSIS LOGIC ---

export const analyzeFairness = async (xitique: Xitique, userId?: string): Promise<string> => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return "AI Analysis unavailable: API Key not configured.";
  }

  const ai = new GoogleGenAI({ apiKey });

  const participantList = xitique.participants.map((p, i) => 
    `${i + 1}. ${p.name} recebe em ${p.payoutDate ? formatDate(p.payoutDate) : 'TBD'} ${p.customContribution ? `(Contribuição: ${p.customContribution})` : ''}`
  ).join('\n');

  const riskContext = xitique.status === XitiqueStatus.RISK 
    ? "ALERTA: Este grupo tem contribuições desiguais. Forneça recomendações matemáticas para justiça." 
    : "";

  const prompt = `
    ${AI_PROMPT_PREFIX}
    Nome do Grupo: ${xitique.name}
    Status: ${xitique.status}
    Base: ${xitique.amount}
    Freq: ${xitique.frequency}
    Participantes: ${xitique.participants.length}
    Cronograma:
    ${participantList}
    ${riskContext}
    Forneça:
    1. Avaliação de Justiça (Boa, Moderada, Atenção).
    2. Explicação de benefícios (recebedores iniciais vs tardios).
    3. Dica de gestão.
    Curto (<150 palavras).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    
    const result = response.text || "Could not generate analysis.";
    
    if (userId && result !== "Could not generate analysis.") {
      saveAIResult(userId, 'FAIRNESS', { xitiqueName: xitique.name, participantsCount: xitique.participants.length }, result, xitique.id);
    }

    return result;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Erro ao conectar com o assistente inteligente.";
  }
};

export interface PlanResult {
  targetAmount: number;
  contribution: number;
  frequency: string;
  idealMonth: string;
  explanation: string;
}

export const generateGoalPlan = async (promptText: string, language: string, userId?: string): Promise<PlanResult> => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("API Key missing");

  const ai = new GoogleGenAI({ apiKey });
  
  const systemInstruction = language === 'pt' 
    ? "Você é um consultor financeiro especialista em Xitique. Calcule um plano realista. Retorne APENAS JSON."
    : "You are a financial advisor expert in Xitique. Calculate a realistic plan. Return ONLY JSON.";

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: promptText,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          targetAmount: { type: Type.NUMBER },
          contribution: { type: Type.NUMBER },
          frequency: { type: Type.STRING },
          idealMonth: { type: Type.STRING },
          explanation: { type: Type.STRING }
        },
        required: ["targetAmount", "contribution", "frequency", "idealMonth", "explanation"]
      }
    }
  });

  if (!response.text) throw new Error("No response from AI");
  
  const result = JSON.parse(response.text) as PlanResult;
  
  if (userId) {
    saveAIResult(userId, 'GOAL_PLAN', { prompt: promptText }, result);
  }

  return result;
};

export interface AdjustmentSuggestion {
  participantId: string;
  suggestedContribution: number;
  reason: string;
}

export const suggestAdjustments = async (xitique: Xitique): Promise<AdjustmentSuggestion[]> => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) return [];

  const ai = new GoogleGenAI({ apiKey });

  const participantData = xitique.participants.map(p => ({
    id: p.id,
    name: p.name,
    order: p.order,
    currentContribution: p.customContribution || xitique.amount
  }));

  const prompt = `
    Você é um especialista financeiro para o sistema Xitique (poupança rotativa).
    Este grupo tem contribuições desiguais, o que pode causar injustiça para quem recebe por último.
    
    Dados do Grupo:
    - Valor Base: ${xitique.amount}
    - Participantes: ${JSON.stringify(participantData)}
    
    OBJETIVO: Sugerir ajustes nos valores de contribuição (customContribution) para que o sistema seja matematicamente equilibrado.
    No Xitique Dinâmico, o pote que cada um recebe é a soma de Min(ContribuiçãoDoPagador, ContribuiçãoDoRecebedor).
    
    Retorne APENAS um array JSON de objetos com este formato:
    [{"participantId": "string", "suggestedContribution": number, "reason": "string"}]
    
    Não inclua explicações fora do JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Suggestion Error:", error);
    return [];
  }
};
