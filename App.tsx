
import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, TransactionType } from './types';
import { TransactionForm } from './components/TransactionForm';
import { syncToGoogleSheets, loadFromGoogleSheets } from './services/googleSheetsService';

const App: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('finansmart_data_v2');
    return saved ? JSON.parse(saved) : [];
  });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [sheetUrl, setSheetUrl] = useState(() => localStorage.getItem('sheet_url') || '');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    localStorage.setItem('finansmart_data_v2', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('sheet_url', sheetUrl);
  }, [sheetUrl]);

  const togglePaid = (id: string) => {
    setTransactions(transactions.map(t => t.id === id ? { ...t, isPaid: !t.isPaid } : t));
  };

  const deleteTransaction = (id: string) => {
    if (confirm('Excluir este registro?')) {
      setTransactions(transactions.filter(t => t.id !== id));
    }
  };

  const handleSync = async () => {
    if (!sheetUrl) {
      alert("Por favor, configure a URL da Planilha primeiro.");
      return;
    }
    setIsSyncing(true);
    try {
      await syncToGoogleSheets(sheetUrl, transactions);
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (e) {
      setSyncStatus('error');
      alert("Erro ao sincronizar. Verifique se a URL do Apps Script está correta e permite acesso.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLoad = async () => {
    if (!sheetUrl) return;
    if (!confirm("Isso irá substituir seus dados locais pelos da planilha. Continuar?")) return;
    setIsSyncing(true);
    try {
      const data = await loadFromGoogleSheets(sheetUrl);
      setTransactions(data);
      alert("Dados carregados com sucesso!");
    } catch (e) {
      alert("Erro ao carregar dados. Verifique a URL do seu Google Apps Script.");
    } finally {
      setIsSyncing(false);
    }
  };

  const isOverdue = (dateStr: string, isPaid: boolean) => {
    if (isPaid) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(dateStr);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
  };

  // Ordenação por data (mais recente primeiro para receitas, cronológica para gastos)
  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [transactions]);

  const grouped = useMemo(() => {
    return {
      receitas: sortedTransactions.filter(t => t.type === 'RECEITA').reverse(),
      gastosFixos: sortedTransactions.filter(t => t.type === 'GASTO_FIXO'),
      gastosCartoes: sortedTransactions.filter(t => t.type === 'GASTO_CARTAO'),
      gastosDiversos: sortedTransactions.filter(t => t.type === 'GASTO_DIVERSO'),
      cartoesDetalhe: {
        'BaneseCard': sortedTransactions.filter(t => t.cardName === 'BaneseCard'),
        'Nubank Davi': sortedTransactions.filter(t => t.cardName === 'Nubank Davi'),
        'Torra': sortedTransactions.filter(t => t.cardName === 'Torra'),
        'Iti Tuy': sortedTransactions.filter(t => t.cardName === 'Iti Tuy'),
      }
    };
  }, [sortedTransactions]);

  const totals = useMemo(() => {
    const income = grouped.receitas.reduce((a, b) => a + b.amount, 0);
    const fixed = grouped.gastosFixos.reduce((a, b) => a + b.amount, 0);
    const cards = grouped.gastosCartoes.reduce((a, b) => a + b.amount, 0);
    const divers = grouped.gastosDiversos.reduce((a, b) => a + b.amount, 0);
    
    const fixedPending = grouped.gastosFixos.filter(t => !t.isPaid).reduce((a, b) => a + b.amount, 0);
    const cardsPending = grouped.gastosCartoes.filter(t => !t.isPaid).reduce((a, b) => a + b.amount, 0);
    
    return {
      income,
      expenses: fixed + cards + divers,
      balance: income - (fixed + cards + divers),
      fixedPending,
      cardsPending
    };
  }, [grouped]);

  const TableHeader = ({ title, color }: { title: string, color: string }) => (
    <div className={`${color} text-center py-1.5 font-bold text-sm uppercase border-x border-t border-black shadow-sm`}>
      {title}
    </div>
  );

  const MoneyCell = ({ val, isRed = false }: { val: number, isRed?: boolean }) => (
    <span className={isRed ? 'text-red-600 font-bold' : ''}>
      R$ {val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
    </span>
  );

  return (
    <div className="bg-[#F0F2F5] min-h-screen p-4 md:p-8 font-sans text-[13px]">
      <header className="max-w-[1400px] mx-auto mb-8 flex flex-col md:flex-row justify-between items-center bg-white p-5 rounded-xl shadow-sm border border-gray-100 gap-4">
        <div className="w-full md:w-auto">
          <h1 className="text-2xl font-black text-gray-800 tracking-tighter">FINANCEIRO <span className="text-blue-600">PRO</span></h1>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mt-1">
            <input 
              type="text" 
              placeholder="Cole a URL do Apps Script aqui..." 
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              className="text-[10px] border border-gray-200 rounded px-2 py-1.5 w-full sm:w-80 outline-none focus:border-blue-400 bg-gray-50 transition-colors"
            />
            {sheetUrl && (
              <button onClick={handleLoad} className="text-[10px] text-blue-600 font-black hover:text-blue-800 transition-colors px-2 py-1 bg-blue-50 rounded">CARREGAR DA PLANILHA</button>
            )}
          </div>
        </div>
        
        <div className="flex w-full md:w-auto gap-3">
          <button 
            onClick={handleSync}
            disabled={isSyncing}
            className={`flex-1 md:flex-none ${syncStatus === 'success' ? 'bg-green-600' : 'bg-gray-800'} text-white px-6 py-3 rounded-lg font-bold hover:opacity-90 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50`}
          >
            <svg className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            {isSyncing ? 'SINCRONIZANDO...' : syncStatus === 'success' ? 'DADOS SALVOS!' : 'SALVAR NA NUVEM'}
          </button>

          <button 
            onClick={() => setIsFormOpen(true)}
            className="flex-1 md:flex-none bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path></svg>
            NOVO LANÇAMENTO
          </button>
        </div>
      </header>

      {/* Alerta de Contas Vencidas */}
      {transactions.some(t => isOverdue(t.date, t.isPaid)) && (
        <div className="max-w-[1400px] mx-auto mb-6 bg-red-100 border-l-4 border-red-500 p-4 rounded-lg flex items-center gap-3 animate-pulse">
           <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
           <span className="text-red-700 font-bold uppercase text-xs">Atenção: Você possui contas com pagamento em atraso!</span>
        </div>
      )}

      <div className="max-w-[1400px] mx-auto grid grid-cols-1 xl:grid-cols-4 gap-6 items-start pb-10">
        
        <div className="space-y-6">
          <section className="bg-white rounded-lg overflow-hidden shadow-sm">
            <TableHeader title="RECEITAS" color="bg-[#92D050]" />
            <table className="w-full border-collapse border-x border-b border-black">
              <thead className="bg-gray-100 border-b border-black text-[11px]">
                <tr>
                  <th className="border-r border-black p-1.5 w-16">Data</th>
                  <th className="border-r border-black p-1.5">Descrição</th>
                  <th className="p-1.5">Valor</th>
                </tr>
              </thead>
              <tbody>
                {grouped.receitas.length === 0 ? (
                  <tr><td colSpan={3} className="p-4 text-center text-gray-400 italic">Nenhuma receita</td></tr>
                ) : grouped.receitas.map(t => (
                  <tr key={t.id} className="border-b border-gray-200 group hover:bg-green-50">
                    <td className="border-r border-black p-1.5 text-center">{new Date(t.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'numeric' })}</td>
                    <td className="border-r border-black p-1.5 font-medium">{t.description}</td>
                    <td className="p-1.5 text-right relative">
                      <MoneyCell val={t.amount} />
                      <button onClick={() => deleteTransaction(t.id)} className="absolute -right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 text-white w-5 h-5 rounded-full text-[10px] flex items-center justify-center">×</button>
                    </td>
                  </tr>
                ))}
                <tr className="bg-[#FFFF00] font-bold border-t border-black">
                  <td colSpan={2} className="border-r border-black p-1.5 text-right uppercase">TOTAL</td>
                  <td className="p-1.5 text-right"><MoneyCell val={totals.income} /></td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="bg-[#D1D5DB] p-5 border border-black rounded-lg shadow-inner">
            <h3 className="text-xs font-black mb-3 text-gray-700 uppercase tracking-widest">Resumo Consolidado</h3>
            <div className="space-y-3 font-bold">
              <div className="flex justify-between items-center bg-white/50 p-3 rounded border border-black/10">
                <span className="text-gray-600">GANHOS</span>
                <MoneyCell val={totals.income} />
              </div>
              <div className="flex justify-between items-center bg-white/50 p-3 rounded border border-black/10">
                <span className="text-gray-600">GASTOS</span>
                <MoneyCell val={totals.expenses} />
              </div>
              <div className={`flex justify-between items-center p-3 rounded border border-black/20 shadow-md ${totals.balance >= 0 ? 'bg-green-500 text-white' : 'bg-red-600 text-white'}`}>
                <span>FICOU</span>
                <MoneyCell val={totals.balance} />
              </div>
            </div>
          </section>
        </div>

        <div className="xl:col-span-1 space-y-6">
          <section className="bg-white rounded-lg overflow-hidden shadow-sm">
            <TableHeader title="GASTOS FIXOS" color="bg-[#FF6600] text-white" />
            <table className="w-full border-collapse border-x border-b border-black">
              <thead className="bg-gray-100 border-b border-black text-[11px]">
                <tr>
                  <th className="border-r border-black p-1.5 w-16">Venc.</th>
                  <th className="border-r border-black p-1.5">Despesa</th>
                  <th className="border-r border-black p-1.5">Valor</th>
                  <th className="p-1.5 w-10">Pago?</th>
                </tr>
              </thead>
              <tbody>
                {grouped.gastosFixos.map(t => (
                  <tr key={t.id} className={`border-b border-gray-200 transition-colors ${isOverdue(t.date, t.isPaid) ? 'bg-red-50' : 'hover:bg-orange-50'}`}>
                    <td className={`border-r border-black p-1.5 text-center font-bold ${isOverdue(t.date, t.isPaid) ? 'text-red-600' : ''}`}>
                      {new Date(t.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'numeric' })}
                    </td>
                    <td className="border-r border-black p-1.5 font-medium">{t.description}</td>
                    <td className="border-r border-black p-1.5 text-right relative group">
                      <MoneyCell val={t.amount} />
                      <button onClick={() => deleteTransaction(t.id)} className="absolute -right-1 top-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 text-[10px]">×</button>
                    </td>
                    <td className="p-1.5 text-center">
                      <input type="checkbox" checked={t.isPaid} onChange={() => togglePaid(t.id)} className="w-4 h-4 cursor-pointer accent-orange-600" title={isOverdue(t.date, t.isPaid) ? "VENCIDO!" : ""} />
                    </td>
                  </tr>
                ))}
                <tr className="bg-[#FFFF00] font-bold border-t border-black">
                  <td colSpan={2} className="border-r border-black p-1.5 text-right uppercase italic">Falta pagar</td>
                  <td colSpan={2} className="p-1.5 text-center"><MoneyCell val={totals.fixedPending} /></td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="bg-white rounded-lg overflow-hidden shadow-sm">
            <TableHeader title="GASTOS COM CARTÕES" color="bg-[#FF6600] text-white" />
            <table className="w-full border-collapse border-x border-b border-black">
              <tbody>
                {(Object.entries(grouped.cartoesDetalhe) as [string, Transaction[]][]).map(([name, items]) => {
                  const cardTotal = items.reduce((a, b) => a + b.amount, 0);
                  const isPaid = items.length > 0 && items.every(i => i.isPaid);
                  const hasOverdue = items.some(i => isOverdue(i.date, i.isPaid));
                  if (cardTotal === 0) return null;
                  return (
                    <tr key={name} className={`border-b border-gray-300 ${hasOverdue ? 'bg-red-50 animate-pulse' : ''}`}>
                      <td className="border-r border-black p-2 text-center font-bold text-gray-400">--</td>
                      <td className="border-r border-black p-2 font-bold">{name}</td>
                      <td className="border-r border-black p-2 text-right font-bold"><MoneyCell val={cardTotal} /></td>
                      <td className="p-2 text-center">
                         <div className={`w-3.5 h-3.5 rounded-full mx-auto shadow-sm ${isPaid ? 'bg-green-500' : hasOverdue ? 'bg-red-600 scale-125' : 'bg-red-400'}`}></div>
                      </td>
                    </tr>
                  )
                })}
                 <tr className="bg-[#FFFF00] font-bold border-t border-black">
                  <td colSpan={2} className="border-r border-black p-2 text-right uppercase italic">Falta pagar</td>
                  <td colSpan={2} className="p-2 text-center"><MoneyCell val={totals.cardsPending} /></td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>

        <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <section className="bg-white rounded-lg overflow-hidden shadow-sm">
              <TableHeader title="BaneseCard" color="bg-[#31859C] text-white" />
              <CardDetailTable items={grouped.cartoesDetalhe['BaneseCard']} isOverdueFn={isOverdue} />
            </section>
            <section className="bg-white rounded-lg overflow-hidden shadow-sm">
              <TableHeader title="Torra" color="bg-[#7030A0] text-white" />
              <CardDetailTable items={grouped.cartoesDetalhe['Torra']} isOverdueFn={isOverdue} />
            </section>
          </div>
          <div className="space-y-6">
            <section className="bg-white rounded-lg overflow-hidden shadow-sm">
              <TableHeader title="Nubank Davi" color="bg-[#7030A0] text-white" />
              <CardDetailTable items={grouped.cartoesDetalhe['Nubank Davi']} isOverdueFn={isOverdue} />
            </section>
            <section className="bg-white rounded-lg overflow-hidden shadow-sm">
              <TableHeader title="Iti Tuy" color="bg-[#FFC000] text-black" />
              <CardDetailTable items={grouped.cartoesDetalhe['Iti Tuy']} isOverdueFn={isOverdue} />
            </section>
          </div>
        </div>

      </div>

      {isFormOpen && (
        <TransactionForm 
          onAdd={(data) => {
            setTransactions([{ ...data, id: Math.random().toString(36).substr(2, 9) }, ...transactions]);
          }} 
          onClose={() => setIsFormOpen(false)} 
        />
      )}
    </div>
  );
};

const CardDetailTable = ({ items, isOverdueFn }: { items: Transaction[], isOverdueFn: (d: string, p: boolean) => boolean }) => {
  const total = items.reduce((a, b) => a + b.amount, 0);
  return (
    <table className="w-full border-collapse border-x border-b border-black">
      <thead className="bg-gray-50 border-b border-black text-[10px] uppercase font-bold text-gray-500">
        <tr>
          <th className="border-r border-black p-1.5">Valor</th>
          <th className="border-r border-black p-1.5">Descrição</th>
          <th className="border-r border-black p-1.5">Data</th>
          <th className="p-1.5">Parc.</th>
        </tr>
      </thead>
      <tbody>
        {items.length === 0 ? (
           Array(4).fill(0).map((_, i) => (
            <tr key={i} className={`h-7 border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-[#F4F1FA]'}`}>
              <td className="border-r border-black p-1.5"></td><td className="border-r border-black p-1.5"></td><td className="border-r border-black p-1.5"></td><td className="p-1.5"></td>
            </tr>
          ))
        ) : (
          items.map((t, idx) => (
            <tr key={t.id} className={`border-b border-gray-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-[#F4F1FA]'} hover:bg-blue-50 transition-colors`}>
              <td className={`border-r border-black p-1.5 text-right font-bold ${isOverdueFn(t.date, t.isPaid) ? 'text-red-600' : 'text-gray-700'}`}>
                R$ {t.amount.toFixed(2)}
              </td>
              <td className="border-r border-black p-1.5 text-gray-600 font-medium">{t.description}</td>
              <td className={`border-r border-black p-1.5 text-center text-[11px] font-bold ${isOverdueFn(t.date, t.isPaid) ? 'text-red-600' : ''}`}>
                {new Date(t.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'numeric' })}
              </td>
              <td className="p-1.5 text-center font-black text-indigo-600">{t.installments || '-'}</td>
            </tr>
          ))
        )}
        <tr className="bg-[#FFFF00] font-black border-t border-black">
          <td className="border-r border-black p-1.5 text-right">R$ {total.toFixed(2)}</td>
          <td colSpan={3} className="bg-white border-none"></td>
        </tr>
      </tbody>
    </table>
  );
};

export default App;
