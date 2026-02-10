
export type TransactionType = 'RECEITA' | 'GASTO_FIXO' | 'GASTO_CARTAO' | 'GASTO_DIVERSO';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string; 
  type: TransactionType;
  category: string;
  isPaid: boolean;
  dueDate?: string;
  cardName?: string; // Para agrupar por cartão específico
  installments?: string; // Ex: "2/6"
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  pendingAmount: number;
}
