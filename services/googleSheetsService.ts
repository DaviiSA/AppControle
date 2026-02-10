
import { Transaction } from '../types';

export const syncToGoogleSheets = async (url: string, transactions: Transaction[]) => {
  try {
    const response = await fetch(url, {
      method: 'POST',
      mode: 'no-cors', // Apps Script requer no-cors para POST simples ou redirecionamento
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transactions),
    });
    return true;
  } catch (error) {
    console.error("Erro ao sincronizar:", error);
    throw error;
  }
};

export const loadFromGoogleSheets = async (url: string): Promise<Transaction[]> => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Falha ao carregar dados');
    return await response.json();
  } catch (error) {
    console.error("Erro ao carregar:", error);
    throw error;
  }
};
