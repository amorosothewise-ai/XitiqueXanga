
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
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    
    if (!response.ok) throw new Error("API Error");
    const data = await response.json();
    const result = data.text || "Could not generate analysis.";
    
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
  const currentDate = new Date().toLocaleDateString(language === 'pt' ? 'pt-MZ' : 'en-US', { month: 'long', year: 'numeric' });

  const systemInstruction = language === 'pt' 
    ? `Você é um consultor financeiro especialista em poupança e Xitique. A data atual é ${currentDate}. Se o usuário não fornecer valores exatos de despesas, faça estimativas realistas (ex: sugerir guardar 10% a 30% da renda). Calcule um plano realista para alcançar o objetivo. No campo 'idealMonth', calcule o mês e ano exatos em que a meta será atingida com base na data atual e no número de meses necessários. Retorne APENAS JSON com as chaves: targetAmount (numero), contribution (numero), frequency (string, ex: 'mensal'), idealMonth (string, ex: 'Dezembro 2026'), explanation (string com o racional do cálculo, meses necessários e dicas).`
    : `You are a financial advisor expert in savings and Xitique. The current date is ${currentDate}. If the user doesn't provide exact expenses, make realistic estimates (e.g. suggest saving 10% to 30% of income). Calculate a realistic plan to reach the goal. For 'idealMonth', calculate the exact month and year the goal will be reached based on the current date and required months. Return ONLY JSON with keys: targetAmount (number), contribution (number), frequency (string, e.g. 'monthly'), idealMonth (string, e.g. 'December 2026'), explanation (string with calculation rationale, months needed, and tips).`;

  const prompt = `${systemInstruction}\n\nUser Request: ${promptText}`;

  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });

  if (!response.ok) throw new Error("API Error");
  const data = await response.json();
  
  if (!data.text) throw new Error("No response from AI");
  
  // Clean potential markdown formatting from JSON response
  const cleanedText = data.text.replace(/```json\n?|\n?```/g, '').trim();
  const result = JSON.parse(cleanedText) as PlanResult;
  
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
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) throw new Error("API Error");
    const data = await response.json();
    const text = data.text;
    if (!text) return [];
    
    // Clean potential markdown formatting from JSON response
    const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error("Gemini Suggestion Error:", error);
    return [];
  }
};
