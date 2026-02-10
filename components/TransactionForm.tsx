
import React, { useState } from 'react';
import { TransactionType, Transaction } from '../types';

interface Props {
  onAdd: (transaction: Omit<Transaction, 'id'>) => void;
  onClose: () => void;
}

export const TransactionForm: React.FC<Props> = ({ onAdd, onClose }) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<TransactionType>('GASTO_FIXO');
  const [cardName, setCardName] = useState('');
  const [installments, setInstallments] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !date) return;

    onAdd({
      description,
      amount: parseFloat(amount),
      date,
      type,
      category: type,
      isPaid: type === 'RECEITA',
      dueDate: date,
      cardName: type === 'GASTO_CARTAO' ? cardName : undefined,
      installments: type === 'GASTO_CARTAO' ? installments : undefined
    });
    onClose();
  };

  const getHeaderColor = () => {
    switch (type) {
      case 'RECEITA': return 'bg-[#92D050] text-gray-900';
      case 'GASTO_FIXO': return 'bg-[#FF6600] text-white';
      case 'GASTO_CARTAO': return 'bg-[#7030A0] text-white';
      default: return 'bg-blue-600 text-white';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
      <div className="bg-[#F8F9FA] rounded-2xl overflow-hidden w-full max-w-lg shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/20 transform animate-in zoom-in-95 duration-300">
        
        {/* Modal Header */}
        <div className={`${getHeaderColor()} p-6 flex justify-between items-center transition-colors duration-500`}>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight">Novo Registro</h2>
            <p className="text-[10px] opacity-80 font-bold uppercase tracking-widest mt-1">Lançamento Financeiro</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-black/10 rounded-full transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          
          {/* Tipo Selector - Visual buttons instead of dropdown */}
          <div className="space-y-2">
            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Tipo de Movimentação</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'RECEITA', label: 'Receita', color: 'peer-checked:bg-[#92D050]' },
                { id: 'GASTO_FIXO', label: 'Fixo', color: 'peer-checked:bg-[#FF6600]' },
                { id: 'GASTO_CARTAO', label: 'Cartão', color: 'peer-checked:bg-[#7030A0]' },
                { id: 'GASTO_DIVERSO', label: 'Diverso', color: 'peer-checked:bg-blue-500' },
              ].map((item) => (
                <label key={item.id} className="cursor-pointer">
                  <input 
                    type="radio" 
                    name="type" 
                    className="hidden peer" 
                    checked={type === item.id}
                    onChange={() => setType(item.id as TransactionType)}
                  />
                  <div className={`text-center py-2 px-1 rounded-lg border-2 border-gray-200 text-xs font-bold text-gray-500 transition-all peer-checked:text-white peer-checked:border-transparent ${item.color}`}>
                    {item.label}
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-4 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1">Descrição do Lançamento</label>
              <input 
                type="text" 
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl p-3 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-semibold"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Salário Mensal, Aluguel Apto, Compras Super..."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1">Valor (R$)</label>
                <div className="relative">
                  <span className="absolute left-3 top-3.5 text-gray-400 font-bold">R$</span>
                  <input 
                    type="number" 
                    step="0.01"
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl p-3 pl-10 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold text-lg"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0,00"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1">Data/Vencimento</label>
                <input 
                  type="date" 
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl p-3 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-semibold"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Seção Condicional: Cartões */}
          {type === 'GASTO_CARTAO' && (
            <div className="space-y-4 bg-purple-50 p-6 rounded-xl border border-purple-100 animate-in slide-in-from-top-4 duration-500">
              <h4 className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em] mb-2 text-center">Configurações do Cartão</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black text-purple-700 uppercase mb-1">Selecione o Cartão</label>
                  <select 
                    className="w-full bg-white border-2 border-purple-200 rounded-xl p-3 focus:border-purple-500 outline-none font-bold text-purple-900"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    required
                  >
                    <option value="">Escolher...</option>
                    <option value="BaneseCard">BaneseCard</option>
                    <option value="Nubank Davi">Nubank Davi</option>
                    <option value="Torra">Torra</option>
                    <option value="Iti Tuy">Iti Tuy</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-black text-purple-700 uppercase mb-1">Parcelas (ex: 2/6)</label>
                  <input 
                    type="text" 
                    className="w-full bg-white border-2 border-purple-200 rounded-xl p-3 focus:border-purple-500 outline-none font-bold placeholder:text-purple-200"
                    value={installments}
                    onChange={(e) => setInstallments(e.target.value)}
                    placeholder="1/1"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 bg-white border-2 border-gray-200 text-gray-500 py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-95"
            >
              CANCELAR
            </button>
            <button 
              type="submit"
              className="flex-1 bg-gray-900 text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-black transition-all shadow-xl shadow-gray-200 active:scale-95"
            >
              CONFIRMAR
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
