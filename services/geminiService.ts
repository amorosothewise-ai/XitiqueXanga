
import { GoogleGenAI, Type } from "@google/genai";
import { Xitique, XitiqueStatus } from '../types';
import { AI_PROMPT_PREFIX } from '../constants';
import { formatDate } from './dateUtils';
import { db } from './firebase';
import { collection, addDoc, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './firestoreError';

// --- PERSISTENCE LOGIC ---

export interface StoredAnalysis {
  id: string;
  xitiqueId?: string;
  userId: string;
  type: 'FAIRNESS' | 'GOAL_PLAN';
  prompt: any;
  result: any;
  timestamp: string;
}

export const saveAIResult = async (
  userId: string, 
  type: StoredAnalysis['type'], 
  inputData: any, 
  result: any,
  xitiqueId?: string
) => {
  try {
    const aiAnalysesRef = collection(db, 'ai_analyses');
    try {
      await addDoc(aiAnalysesRef, {
        userId: userId,
        xitiqueId: xitiqueId || null,
        type,
        prompt: inputData,
        result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
       handleFirestoreError(error, OperationType.CREATE, 'ai_analyses');
    }
  } catch (err) {
    console.error('Firebase AI Save Error:', err);
  }
};

export const getAIHistory = async (userId: string, type?: StoredAnalysis['type']): Promise<StoredAnalysis[]> => {
  try {
    const aiAnalysesRef = collection(db, 'ai_analyses');
    const constraints: any[] = [
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(10)
    ];
    
    if (type) {
      constraints.push(where('type', '==', type));
    }
    
    const q = query(aiAnalysesRef, ...constraints);
    
    let snapshot;
    try {
      snapshot = await getDocs(q);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'ai_analyses');
    }
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StoredAnalysis));
  } catch (err) {
    console.error('Firebase AI Fetch Error:', err);
    return [];
  }
};

// --- ANALYSIS LOGIC ---

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  return new GoogleGenAI({ apiKey });
};

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
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
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
  goalName: string;
  targetAmount: number;
  contribution: number;
  frequency: string;
  idealMonth: string;
  explanation: string;
}

export const generateGoalPlan = async (promptText: string, language: string, userId?: string): Promise<PlanResult> => {
  const currentDate = new Date().toLocaleDateString(language === 'pt' ? 'pt-MZ' : 'en-US', { month: 'long', year: 'numeric' });

  const systemInstruction = language === 'pt' 
    ? `Você é um consultor financeiro especialista em poupança e Xitique. A data atual é ${currentDate}. 
    
    1. EXTRACÇÃO: Analise o pedido do utilizador para extrair:
       - Objetivo (goalName)
       - Valor total necessário (targetAmount, em meticais)
       - Prazo final (deadline, ex: dezembro de 2026).
       Se o usuário não fornecer valores exatos, faça estimativas realistas para o objetivo informado.

    2. CÁLCULO: Calcule uma contribuição mensal ou semanal realista para atingir o valor no prazo.
    3. IDEAL: Converta o prazo em uma data legível (idealMonth).
    
    Retorne JSON com as chaves: goalName (string), targetAmount (numero), contribution (numero), frequency (string), idealMonth (string), explanation (string com o racional, meses necessários e dicas financeiras).`
    : `You are a financial advisor expert in savings and Xitique. The current date is ${currentDate}.
    
    1. EXTRACTION: Analyze the user's request to extract:
       - Goal (goalName)
       - Target amount (targetAmount, in meticais)
       - Deadline (deadline, e.g., December 2026).
       If the user doesn't provide exact values, make realistic estimates for the goal described.

    2. CALCULATION: Calculate a realistic monthly or weekly contribution to reach the goal within the deadline.
    3. IDEAL: Convert the deadline into a readable date (idealMonth).

    Return JSON with keys: goalName (string), targetAmount (number), contribution (number), frequency (string), idealMonth (string), explanation (string with calculation rationale, months needed, and financial tips).`;

  const prompt = `${systemInstruction}\n\nUser Request: ${promptText}`;

  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
            goalName: { type: Type.STRING },
            targetAmount: { type: Type.NUMBER },
            contribution: { type: Type.NUMBER },
            frequency: { type: Type.STRING },
            idealMonth: { type: Type.STRING },
            explanation: { type: Type.STRING },
        },
        required: ["goalName", "targetAmount", "contribution", "frequency", "idealMonth", "explanation"],
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  
  const result = JSON.parse(text) as PlanResult;
  
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
  `;

  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    participantId: { type: Type.STRING },
                    suggestedContribution: { type: Type.NUMBER },
                    reason: { type: Type.STRING }
                },
                required: ["participantId", "suggestedContribution", "reason"]
            }
        }
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
