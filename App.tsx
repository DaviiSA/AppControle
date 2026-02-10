
import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, TransactionType } from './types';
import { TransactionForm } from './components/TransactionForm';
import { syncToGoogleSheets, loadFromGoogleSheets } from './services/googleSheetsService';

type ViewState = 'home' | 'dashboard';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('home');
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
    if (confirm('Deseja realmente excluir este registro?')) {
      setTransactions(transactions.filter(t => t.id !== id));
    }
  };

  const handleSync = async () => {
    if (!sheetUrl) {
      alert("Configure a URL da Planilha nas configurações.");
      return;
    }
    setIsSyncing(true);
    try {
      await syncToGoogleSheets(sheetUrl, transactions);
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (e) {
      setSyncStatus('error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLoad = async () => {
    if (!sheetUrl) return;
    if (!confirm("Isso substituirá seus dados locais pelos da nuvem. Continuar?")) return;
    setIsSyncing(true);
    try {
      const data = await loadFromGoogleSheets(sheetUrl);
      setTransactions(data);
    } catch (e) {
      alert("Erro ao carregar dados.");
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

  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [transactions]);

  const grouped = useMemo(() => ({
    receitas: sortedTransactions.filter(t => t.type === 'RECEITA').reverse(),
    gastosFixos: sortedTransactions.filter(t => t.type === 'GASTO_FIXO'),
    gastosCartoes: sortedTransactions.filter(t => t.type === 'GASTO_CARTAO'),
    cartoes: {
      'BaneseCard': sortedTransactions.filter(t => t.cardName === 'BaneseCard'),
      'Nubank Davi': sortedTransactions.filter(t => t.cardName === 'Nubank Davi'),
      'Torra': sortedTransactions.filter(t => t.cardName === 'Torra'),
      'Iti Tuy': sortedTransactions.filter(t => t.cardName === 'Iti Tuy'),
    } as Record<string, Transaction[]>
  }), [sortedTransactions]);

  const totals = useMemo(() => {
    const income = grouped.receitas.reduce((a, b) => a + b.amount, 0);
    const expenses = transactions.filter(t => t.type !== 'RECEITA').reduce((a, b) => a + b.amount, 0);
    const fixedPending = grouped.gastosFixos.filter(t => !t.isPaid).reduce((a, b) => a + b.amount, 0);
    const cardsPending = grouped.gastosCartoes.filter(t => !t.isPaid).reduce((a, b) => a + b.amount, 0);
    return { income, expenses, balance: income - expenses, fixedPending, cardsPending };
  }, [transactions, grouped]);

  // View: Tela Inicial (Home)
  if (currentView === 'home') {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
        <header className="p-6 flex justify-between items-center max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-indigo-200 shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <span className="text-2xl font-black tracking-tight text-slate-800">Finan<span className="text-indigo-600">Smart</span></span>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
          <div className="max-w-4xl w-full text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <h1 className="text-5xl md:text-7xl font-black text-slate-900 leading-tight tracking-tighter">
              Sua vida financeira <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">em total equilíbrio.</span>
            </h1>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto font-medium">
              Controle suas receitas, gastos fixos e cartões de crédito em um só lugar. Simples, moderno e integrado com a nuvem.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto pt-4">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Saldo Atual</span>
                <span className={`text-2xl font-black ${totals.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  R$ {totals.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Despesas</span>
                <span className="text-2xl font-black text-slate-800">
                  R$ {totals.expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Pendências</span>
                <span className="text-2xl font-black text-rose-500">
                  R$ {(totals.fixedPending + totals.cardsPending).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
              <button 
                onClick={() => setCurrentView('dashboard')}
                className="bg-indigo-600 text-white px-10 py-5 rounded-3xl font-black text-lg hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-200 flex items-center justify-center gap-3"
              >
                ACESSAR DASHBOARD
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
              </button>
              <button 
                onClick={() => setIsFormOpen(true)}
                className="bg-white text-slate-800 border-2 border-slate-100 px-10 py-5 rounded-3xl font-black text-lg hover:bg-slate-50 transition-all flex items-center justify-center gap-3"
              >
                NOVO LANÇAMENTO
              </button>
            </div>
          </div>
        </main>

        <footer className="p-8 text-center text-slate-400 text-xs font-bold uppercase tracking-[0.3em]">
          Gerenciamento Financeiro Inteligente • Cloud Sync
        </footer>

        {isFormOpen && (
          <TransactionForm 
            onAdd={(data) => setTransactions([{ ...data, id: Math.random().toString(36).substr(2, 9) }, ...transactions])} 
            onClose={() => setIsFormOpen(false)} 
          />
        )}
      </div>
    );
  }

  // View: Dashboard (Visual que já criamos, melhorado)
  return (
    <div className="bg-[#F8FAFC] min-h-screen font-sans text-slate-900 pb-20 animate-in fade-in duration-500">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 backdrop-blur-md bg-white/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <button onClick={() => setCurrentView('home')} className="flex items-center gap-2 group">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-indigo-200 shadow-lg group-hover:scale-105 transition-transform">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
              <span className="text-xl font-black tracking-tight text-slate-800">Finan<span className="text-indigo-600">Smart</span></span>
            </button>

            <div className="hidden lg:flex items-center gap-4">
              <div className="relative group">
                <input 
                  type="text" 
                  placeholder="URL do Apps Script..." 
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  className="text-xs border border-slate-200 rounded-2xl px-5 py-2.5 w-72 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all bg-slate-50"
                />
                {sheetUrl && (
                  <button onClick={handleLoad} className="absolute right-2 top-1.5 text-[10px] bg-white px-3 py-1.5 rounded-xl border border-slate-200 font-black hover:bg-slate-50 shadow-sm transition-all active:scale-95">RECARREGAR ↓</button>
                )}
              </div>
              <button 
                onClick={handleSync}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-black transition-all shadow-sm active:scale-95 ${syncStatus === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-900 text-white hover:bg-black'}`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-amber-400 animate-pulse' : syncStatus === 'success' ? 'bg-emerald-500' : 'bg-indigo-400'}`}></div>
                {isSyncing ? 'Salvando...' : syncStatus === 'success' ? 'Salvo com Sucesso' : 'Sincronizar Nuvem'}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsFormOpen(true)}
                className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-xs tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path></svg>
                NOVO
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <SummaryCard title="Entradas" amount={totals.income} icon="trending-up" color="emerald" />
          <SummaryCard title="Saídas" amount={totals.expenses} icon="trending-down" color="rose" />
          <SummaryCard title="Meu Saldo" amount={totals.balance} icon="wallet" color="indigo" highlight />
        </div>

        {/* Overdue Alert */}
        {transactions.some(t => isOverdue(t.date, t.isPaid)) && (
          <div className="mb-10 bg-rose-50 border border-rose-100 p-6 rounded-3xl flex items-center gap-5 shadow-xl shadow-rose-50 border-l-8 border-l-rose-500">
            <div className="w-12 h-12 bg-rose-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-rose-200 shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            </div>
            <div>
              <p className="text-rose-900 font-black text-lg tracking-tight">Vencimentos Pendentes!</p>
              <p className="text-rose-600 text-sm font-medium">Você tem contas atrasadas que precisam de atenção imediata.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          <div className="lg:col-span-8 space-y-8">
            {/* Receitas Table */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden transition-all hover:shadow-md">
              <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Histórico de Receitas</h3>
                <span className="text-[11px] font-black text-emerald-600 bg-emerald-100/50 px-4 py-1.5 rounded-full">R$ {totals.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="overflow-x-auto px-4 pb-4">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-50">
                      <th className="px-6 py-5">Dia</th>
                      <th className="px-6 py-5">Origem</th>
                      <th className="px-6 py-5 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {grouped.receitas.map(t => (
                      <tr key={t.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="px-6 py-4 text-xs font-bold text-slate-400">{new Date(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</td>
                        <td className="px-6 py-4 font-black text-slate-700">{t.description}</td>
                        <td className="px-6 py-4 text-right relative">
                           <span className="text-emerald-600 font-black">R$ {t.amount.toFixed(2)}</span>
                           <button onClick={() => deleteTransaction(t.id)} className="ml-4 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-all">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                           </button>
                        </td>
                      </tr>
                    ))}
                    {grouped.receitas.length === 0 && (
                      <tr><td colSpan={3} className="py-10 text-center text-slate-300 font-bold italic text-sm uppercase tracking-widest">Nenhuma receita lançada</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Gastos Fixos Table */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden transition-all hover:shadow-md">
              <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Gastos Fixos Mensais</h3>
                <span className="text-[11px] font-black text-rose-600 bg-rose-100/50 px-4 py-1.5 rounded-full">PENDENTE: R$ {totals.fixedPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="overflow-x-auto px-4 pb-4">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-50">
                      <th className="px-6 py-5">Data</th>
                      <th className="px-6 py-5">Descrição</th>
                      <th className="px-6 py-5 text-right">Valor</th>
                      <th className="px-6 py-5 text-center">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {grouped.gastosFixos.map(t => (
                      <tr key={t.id} className={`hover:bg-slate-50 transition-colors group ${isOverdue(t.date, t.isPaid) ? 'bg-rose-50/20' : ''}`}>
                        <td className={`px-6 py-4 text-xs font-black ${isOverdue(t.date, t.isPaid) ? 'text-rose-500' : 'text-slate-400'}`}>
                          {new Date(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        </td>
                        <td className="px-6 py-4 font-black text-slate-700">{t.description}</td>
                        <td className="px-6 py-4 text-right font-black text-slate-800">R$ {t.amount.toFixed(2)}</td>
                        <td className="px-6 py-4 text-center">
                          <button 
                            onClick={() => togglePaid(t.id)}
                            className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${t.isPaid ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : isOverdue(t.date, t.isPaid) ? 'bg-rose-500 text-white shadow-lg shadow-rose-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                          >
                            {t.isPaid ? 'Pago' : isOverdue(t.date, t.isPaid) ? 'Pagar Já' : 'Pagar'}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {grouped.gastosFixos.length === 0 && (
                      <tr><td colSpan={4} className="py-10 text-center text-slate-300 font-bold italic text-sm uppercase tracking-widest">Nenhum gasto fixo</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Credit Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {Object.entries(grouped.cartoes).map(([name, items]) => {
                const cardItems = items as Transaction[];
                if (cardItems.length === 0) return null;
                const cardTotal = cardItems.reduce((a, b) => a + b.amount, 0);
                const hasOverdue = cardItems.some(i => isOverdue(i.date, i.isPaid));
                
                return (
                  <div key={name} className={`bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden transition-all hover:-translate-y-1 hover:shadow-xl ${hasOverdue ? 'ring-2 ring-rose-500 ring-offset-4 ring-offset-[#F8FAFC]' : ''}`}>
                    <div className="p-6 bg-slate-900 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-7 bg-slate-700 rounded-lg border border-slate-600 relative overflow-hidden flex items-center justify-center">
                           <div className="w-3 h-3 bg-amber-400 rounded-full blur-[1px]"></div>
                        </div>
                        <h4 className="text-white font-black text-xs uppercase tracking-widest">{name}</h4>
                      </div>
                      <span className="text-white font-black text-sm">R$ {cardTotal.toFixed(2)}</span>
                    </div>
                    <div className="p-6 space-y-4">
                      {cardItems.map(item => (
                        <div key={item.id} className="flex justify-between items-start text-xs border-b border-slate-50 pb-3 last:border-0">
                          <div className="flex flex-col gap-1">
                            <span className="font-black text-slate-700">{item.description}</span>
                            <div className="flex gap-2 items-center">
                              <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold uppercase tracking-widest">{item.installments || 'À vista'}</span>
                              <span className="text-[9px] text-slate-400 font-bold">{new Date(item.date).toLocaleDateString('pt-BR')}</span>
                            </div>
                          </div>
                          <div className="text-right flex flex-col items-end gap-1">
                            <span className="font-black text-slate-900">R$ {item.amount.toFixed(2)}</span>
                            <div className={`w-2 h-2 rounded-full ${item.isPaid ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : isOverdue(item.date, item.isPaid) ? 'bg-rose-500 animate-pulse' : 'bg-slate-200'}`}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-4 space-y-8 sticky top-28">
             {/* Score Card */}
             <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-indigo-200 relative overflow-hidden">
               <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
               <h4 className="text-[10px] font-black uppercase tracking-[0.3em] mb-6 text-indigo-100">Eficiência Financeira</h4>
               
               <div className="space-y-6 relative z-10">
                 <div className="flex items-end justify-between">
                   <div className="flex flex-col">
                     <span className="text-3xl font-black">{Math.max(0, 100 - Math.min(100, (totals.expenses / (totals.income || 1) * 100))).toFixed(0)}</span>
                     <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Score de Economia</span>
                   </div>
                   <div className="text-right">
                     <span className="text-sm font-bold block">{((totals.income - totals.expenses) / (totals.income || 1) * 100).toFixed(0)}%</span>
                     <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Margem Livre</span>
                   </div>
                 </div>

                 <div className="w-full bg-white/20 h-4 rounded-full overflow-hidden p-1">
                   <div className="bg-white h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${Math.min(100, (totals.expenses / (totals.income || 1) * 100))}%` }}></div>
                 </div>

                 <div className="p-4 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-sm">
                   <p className="text-xs font-medium leading-relaxed italic text-indigo-50">
                     {totals.balance > 0 
                      ? "Você está retendo uma boa parte da sua renda. Continue assim para atingir seus objetivos!" 
                      : "Suas despesas estão elevadas. Revise seus gastos fixos e evite novas compras no cartão."}
                   </p>
                 </div>
               </div>
             </div>

             {/* Action Center */}
             <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
               <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">Menu do Sistema</h4>
               <div className="grid grid-cols-1 gap-3">
                 <button onClick={() => setIsFormOpen(true)} className="w-full flex items-center justify-between p-4 rounded-[1.5rem] bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 transition-all group font-black text-xs uppercase tracking-widest border border-transparent hover:border-indigo-100">
                   Novo Registro
                   <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-all">
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path></svg>
                   </div>
                 </button>
                 <button onClick={handleSync} className="w-full flex items-center justify-between p-4 rounded-[1.5rem] bg-slate-50 hover:bg-emerald-50 hover:text-emerald-600 transition-all group font-black text-xs uppercase tracking-widest border border-transparent hover:border-emerald-100">
                   Salvar Agora
                   <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:bg-emerald-500 group-hover:text-white transition-all">
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                   </div>
                 </button>
               </div>
             </div>
          </div>

        </div>
      </main>

      {isFormOpen && (
        <TransactionForm 
          onAdd={(data) => setTransactions([{ ...data, id: Math.random().toString(36).substr(2, 9) }, ...transactions])} 
          onClose={() => setIsFormOpen(false)} 
        />
      )}
    </div>
  );
};

const SummaryCard = ({ title, amount, icon, color, highlight = false }: { title: string, amount: number, icon: string, color: string, highlight?: boolean }) => {
  const colors: Record<string, string> = {
    emerald: 'text-emerald-600 bg-emerald-50',
    rose: 'text-rose-600 bg-rose-50',
    indigo: 'text-indigo-600 bg-indigo-50',
  };

  const icons: Record<string, React.ReactElement> = {
    'trending-up': <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>,
    'trending-down': <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6"></path></svg>,
    'wallet': <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>,
  };

  return (
    <div className={`p-8 rounded-[2.5rem] border transition-all hover:shadow-xl hover:-translate-y-1 ${highlight ? 'bg-white border-indigo-100 shadow-2xl shadow-indigo-50' : 'bg-white border-slate-100 shadow-sm'}`}>
      <div className="flex justify-between items-center mb-6">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{title}</span>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${colors[color]}`}>
          {icons[icon]}
        </div>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-slate-400 text-sm font-bold">R$</span>
        <span className={`text-3xl font-black tracking-tighter ${highlight && amount < 0 ? 'text-rose-600' : highlight ? 'text-indigo-600' : 'text-slate-800'}`}>
          {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  );
};

export default App;
