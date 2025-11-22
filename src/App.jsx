import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  LayoutDashboard, Users, ShoppingBag, LogOut, Printer, Shirt, 
  Trash2, Grid3X3, Calendar, CheckCircle, BarChart3, CheckSquare, 
  AlertCircle, X, Loader2, Plus 
} from 'lucide-react';

// --- CONFIGURAÇÃO SUPABASE ---
// A Vercel lerá estas chaves das Variáveis de Ambiente que você configurar no painel dela.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- UTILITÁRIOS ---
const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? '-' : date.toLocaleDateString('pt-BR');
};

const generateShortId = () => Math.floor(10000 + Math.random() * 90000).toString();

// Ordem de tamanhos (Sem XG, conforme solicitado)
const sizeOrder = { 'PP': 1, 'P': 2, 'M': 3, 'G': 4, 'GG': 5, 'G1': 7, 'G2': 8, 'G3': 9 };
const sortSizes = (a, b) => (sizeOrder[a] || 99) - (sizeOrder[b] || 99);

// --- AGRUPAMENTO DE ITENS (GRADE) ---
const groupItemsByGrade = (items) => {
  if (!items || !Array.isArray(items)) return { rows: [], headers: [] };
  const groups = {};
  const allSizes = new Set();

  items.forEach(item => {
    const key = `${item.reference}::${item.color}`;
    if (!groups[key]) {
      groups[key] = { 
        reference: item.reference, 
        color: item.color, 
        sizes: {},
        totalQty: 0
      };
    }
    const qtd = parseInt(item.quantity || 0);
    groups[key].sizes[item.size] = (groups[key].sizes[item.size] || 0) + qtd;
    groups[key].totalQty += qtd;
    allSizes.add(item.size);
  });

  return {
    rows: Object.values(groups).sort((a, b) => a.reference.localeCompare(b.reference)),
    headers: Array.from(allSizes).sort(sortSizes)
  };
};

// --- COMPONENTE: MODAL DE IMPRESSÃO ---
const OrderPrintView = ({ order, onClose, onMarkPrinted }) => {
  const { rows, headers } = useMemo(() => groupItemsByGrade(order.items), [order]);
  const totalGeneral = order.items ? order.items.reduce((a, b) => a + parseInt(b.quantity || 0), 0) : 0;

  const handlePrintAndConfirm = () => {
    window.print();
    // Delay para garantir que a caixa de impressão abriu antes do confirm
    setTimeout(() => {
      if (onMarkPrinted && !order.printed) {
        if(window.confirm("A impressão foi realizada corretamente? \nDeseja marcar este pedido como 'IMPRESSO' no sistema?")) {
          onMarkPrinted(order.id);
        }
      }
    }, 1000);
  };

  return (
    <div className="fixed inset-0 bg-white z-[100] overflow-auto p-4 md:p-8 animate-in fade-in duration-200">
      <div className="max-w-5xl mx-auto border-2 border-black print:border-none bg-white min-h-[29.7cm]">
        {/* Cabeçalho */}
        <div className="flex justify-between items-start p-6 border-b-2 border-black mb-4">
          <div>
            <h1 className="text-4xl font-bold uppercase mb-2 tracking-tighter">PEDIDO #{order.display_id || order.id.slice(0,6)}</h1>
            <p className="text-lg text-slate-600">Emissão: {formatDate(order.created_at)}</p>
            {order.printed && <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded border border-green-200 font-bold uppercase mt-1 inline-block print:hidden">Já Impresso</span>}
          </div>
          <div className="text-right no-print flex gap-2">
            <button onClick={handlePrintAndConfirm} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 shadow-lg flex items-center gap-2">
              <Printer size={20}/> Imprimir e Confirmar
            </button>
            <button onClick={onClose} className="bg-slate-100 text-slate-600 px-6 py-3 rounded-lg font-bold hover:bg-slate-200">
              Fechar
            </button>
          </div>
        </div>

        {/* Dados Cliente/Comercial */}
        <div className="grid grid-cols-2 gap-0 mb-8 border-b border-black">
          <div className="p-6 border-r border-black">
            <h3 className="font-bold uppercase text-xs text-slate-500 mb-2 tracking-wide">Dados do Cliente</h3>
            <p className="text-2xl font-bold mb-1">{order.client_name}</p>
            {order.client_city && <p className="text-sm text-slate-600">{order.client_city} - {order.client_state}</p>}
            <div className="mt-4 pt-4 border-t border-dashed border-slate-300">
              <p><strong>Previsão Entrega:</strong> {formatDate(order.delivery_date)}</p>
            </div>
          </div>
          <div className="p-6">
             <h3 className="font-bold uppercase text-xs text-slate-500 mb-2 tracking-wide">Dados Comerciais</h3>
             <p className="text-xl font-bold">{order.rep_name}</p>
             <p className="text-sm text-slate-500">Representante</p>
             <div className="mt-4 pt-4 border-t border-dashed border-slate-300">
               <p><strong>Condição Pagto:</strong> {order.payment_method}</p>
             </div>
          </div>
        </div>

        {/* Tabela de Grade */}
        <div className="px-6 mb-8">
          <table className="w-full border-collapse border border-black text-sm">
            <thead>
              <tr className="bg-slate-200 print:bg-gray-200">
                <th className="border border-black p-3 text-left w-1/3">REFERÊNCIA</th>
                <th className="border border-black p-3 text-left w-1/4">COR</th>
                {headers.map(size => (
                  <th key={size} className="border border-black p-2 text-center w-12 bg-slate-300 print:bg-gray-300">{size}</th>
                ))}
                <th className="border border-black p-3 text-right font-bold bg-slate-800 text-white print:bg-black print:text-white">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx} className="even:bg-slate-50 print:even:bg-transparent">
                  <td className="border border-black p-3 font-bold text-lg">{row.reference}</td>
                  <td className="border border-black p-3 uppercase">{row.color}</td>
                  {headers.map(size => (
                    <td key={size} className="border border-black p-2 text-center">
                      {row.sizes[size] ? <span className="font-bold text-black text-lg">{row.sizes[size]}</span> : <span className="text-slate-300">-</span>}
                    </td>
                  ))}
                  <td className="border border-black p-3 text-right font-bold bg-slate-100 text-lg">{row.totalQty}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-black text-white print:bg-black print:text-white">
                <td colSpan={2} className="border border-black p-4 text-right font-bold text-xl uppercase">Total de Peças</td>
                {headers.map(size => {
                  const sizeTotal = rows.reduce((acc, r) => acc + (r.sizes[size] || 0), 0);
                  return <td key={size} className="border border-white p-2 text-center font-bold bg-slate-800">{sizeTotal}</td>;
                })}
                <td className="border border-white p-4 text-right font-bold text-2xl bg-black">{totalGeneral}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="px-6 pt-8 mt-auto print:mt-8 text-center text-xs text-slate-400 border-t border-slate-100">
           Documento gerado eletronicamente em {new Date().toLocaleString()} • Confecção System
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE: TELA DE LOGIN ---
const LoginScreen = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); 
    setError('');
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError('Aviso: ' + error.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <div className="text-center mb-8">
          <div className="bg-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200"><Shirt className="text-white w-8 h-8"/></div>
          <h1 className="text-2xl font-bold text-slate-800">Sistema Têxtil</h1>
          <p className="text-slate-500 text-sm mt-1">Gestão de Produção e Vendas</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Email</label>
            <input className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Senha</label>
            <input type="password" className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded flex items-center"><AlertCircle size={16} className="mr-2"/> {error}</div>}
          <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold shadow-md transition transform active:scale-95">{loading ? 'A validar...' : 'Acessar Painel'}</button>
        </form>
      </div>
    </div>
  );
};

// --- DASHBOARD ADMIN ---
const AdminDashboard = ({ profile, products, orders, users, refreshData }) => {
  const [view, setView] = useState('dashboard'); 
  const [printOrder, setPrintOrder] = useState(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedOrders, setSelectedOrders] = useState([]);
  
  // Estados Cadastro
  const [newRep, setNewRep] = useState({ name: '', email: '', password: '' });
  const [prodRef, setProdRef] = useState('');
  const [prodColor, setProdColor] = useState('');
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [deletingId, setDeletingId] = useState(null); // Feedback visual de exclusão

  // Agrupamento de Produtos (Para não repetir linhas na tabela)
  const groupedProducts = useMemo(() => {
    const groups = {};
    products.forEach(p => {
      const key = `${p.ref}::${p.color}`;
      if (!groups[key]) {
        groups[key] = { ref: p.ref, color: p.color, variants: [] };
      }
      groups[key].variants.push(p);
    });
    return Object.values(groups).sort((a, b) => a.ref.localeCompare(b.ref));
  }, [products]);

  // Filtros de Data
  const filteredOrders = useMemo(() => {
    if (!dateRange.start && !dateRange.end) return orders;
    const start = dateRange.start ? new Date(dateRange.start) : new Date('2000-01-01');
    const end = dateRange.end ? new Date(dateRange.end) : new Date();
    end.setHours(23, 59, 59);
    return orders.filter(o => {
      const d = new Date(o.created_at);
      return d >= start && d <= end;
    });
  }, [orders, dateRange]);

  // Métricas
  const metrics = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const totalPieces = filteredOrders.reduce((acc, o) => acc + (o.items?.reduce((a,b)=>a+parseInt(b.quantity || 0),0)||0), 0);
    
    const itemCounts = {};
    filteredOrders.forEach(o => {
      o.items?.forEach(i => {
        const key = `${i.reference} - ${i.color}`;
        itemCounts[key] = (itemCounts[key] || 0) + parseInt(i.quantity || 0);
      });
    });
    const ranking = Object.entries(itemCounts).sort(([,a], [,b]) => b - a).slice(0, 5);
    return { totalOrders, totalPieces, ranking };
  }, [filteredOrders]);

  // Romaneio de Produção
  const productionSummary = useMemo(() => {
    const allItems = [];
    orders.filter(o => selectedOrders.includes(o.id)).forEach(o => {
      if(o.items) allItems.push(...o.items);
    });
    return groupItemsByGrade(allItems);
  }, [orders, selectedOrders]);

  // --- AÇÕES (COM PROTEÇÃO DE CLIQUE) ---
  const handleDeleteRep = async (id) => {
    if(window.confirm("Tem certeza que deseja excluir este representante?")) {
      try { await supabase.from('user_profiles').delete().eq('id', id); refreshData(); } 
      catch(e) { alert('Erro ao excluir: ' + e.message); }
    }
  };

  const handleMarkPrinted = async (orderId) => {
    try {
      await supabase.from('orders').update({ printed: true }).eq('id', orderId);
      refreshData();
    } catch(e) { console.error(e); }
  };

  const handleDeleteVariant = async (e, id) => {
    e.stopPropagation(); // Impede abrir outros menus
    if(window.confirm("Excluir este tamanho específico?")) {
      setDeletingId(id);
      try {
        await supabase.from('products').delete().eq('id', id);
        refreshData();
      } catch(err) { alert('Erro ao excluir: ' + err.message); } 
      finally { setDeletingId(null); }
    }
  };

  const handleDeleteProductGroup = async (e, variants) => {
    e.stopPropagation();
    const refName = variants[0]?.ref || 'Produto';
    if(window.confirm(`ATENÇÃO: Excluir TODA a referência ${refName}? \nIsso removerá todos os tamanhos desta cor.`)) {
      setDeletingId(variants[0].id);
      try {
        const ids = variants.map(v => v.id);
        await supabase.from('products').delete().in('id', ids);
        refreshData();
      } catch(err) { alert('Erro ao excluir grupo: ' + err.message); }
      finally { setDeletingId(null); }
    }
  };

  const handleAddProductGrade = async (e) => {
    e.preventDefault();
    if(!prodRef || !prodColor || selectedSizes.length === 0) return;
    
    const newProducts = selectedSizes.map(size => ({
      ref: prodRef.toUpperCase(),
      color: prodColor.toUpperCase(),
      size: size,
      search_key: `${prodRef} ${prodColor} ${size}`.toUpperCase()
    }));

    const { error } = await supabase.from('products').insert(newProducts);
    if(error) alert(error.message);
    else {
      alert('Grade Cadastrada!');
      setProdRef(''); setProdColor(''); setSelectedSizes([]);
      refreshData();
    }
  };

  const handleAddRep = async (e) => {
    e.preventDefault();
    alert("Para adicionar, utilize o painel Authentication do Supabase e crie o utilizador.");
  };

  if (printOrder) return <OrderPrintView order={printOrder} onClose={() => setPrintOrder(null)} onMarkPrinted={handleMarkPrinted} />;

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header Navigation */}
        <div className="flex flex-wrap gap-4 mb-8 border-b border-slate-200 pb-4 items-center justify-between">
          <div className="flex gap-4 overflow-x-auto">
            <button onClick={() => setView('dashboard')} className={`flex items-center px-4 py-2 rounded-lg font-bold transition ${view === 'dashboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-500 hover:bg-white'}`}>
              <LayoutDashboard size={18} className="mr-2"/> Visão Geral
            </button>
            <button onClick={() => setView('production')} className={`flex items-center px-4 py-2 rounded-lg font-bold transition ${view === 'production' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-500 hover:bg-white'}`}>
              <CheckSquare size={18} className="mr-2"/> Produção
            </button>
            <button onClick={() => setView('products')} className={`flex items-center px-4 py-2 rounded-lg font-bold transition ${view === 'products' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-500 hover:bg-white'}`}>
              <Shirt size={18} className="mr-2"/> Produtos
            </button>
            <button onClick={() => setView('reps')} className={`flex items-center px-4 py-2 rounded-lg font-bold transition ${view === 'reps' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-500 hover:bg-white'}`}>
              <Users size={18} className="mr-2"/> Equipe
            </button>
          </div>
        </div>

        {/* VIEW: DASHBOARD */}
        {view === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Filtros e KPIs */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap items-center gap-4">
                 <div className="flex items-center gap-2 text-slate-500 font-bold text-sm uppercase">
                   <Calendar size={16}/> Filtro de Período:
                 </div>
                 <input type="date" className="border p-2 rounded-lg text-sm" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} />
                 <span className="text-slate-400">até</span>
                 <input type="date" className="border p-2 rounded-lg text-sm" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} />
                 {(dateRange.start || dateRange.end) && (
                   <button onClick={() => setDateRange({start:'', end:''})} className="text-red-500 text-xs font-bold hover:underline">Limpar</button>
                 )}
              </div>

              <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-6 rounded-xl shadow-lg shadow-blue-200">
                <p className="text-blue-100 text-sm font-bold uppercase mb-1">Total Pedidos</p>
                <h3 className="text-4xl font-bold">{metrics.totalOrders}</h3>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-slate-500 text-sm font-bold uppercase">Peças Vendidas</p>
                  <ShoppingBag className="text-green-500" size={20}/>
                </div>
                <h3 className="text-3xl font-bold text-slate-800">{metrics.totalPieces}</h3>
                <p className="text-xs text-slate-400 mt-1">No período selecionado</p>
              </div>
              
              <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-700 flex items-center"><BarChart3 className="mr-2" size={18}/> Ranking de Produtos</h3>
                </div>
                <div className="space-y-3">
                  {metrics.ranking.map(([key, val], idx) => (
                    <div key={key} className="relative pt-1">
                      <div className="flex mb-1 items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 uppercase">{idx+1}. {key}</span>
                        <span className="text-xs font-bold text-blue-600">{val} un</span>
                      </div>
                      <div className="overflow-hidden h-2 text-xs flex rounded bg-slate-100">
                        <div style={{ width: `${(val / metrics.ranking[0][1]) * 100}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"></div>
                      </div>
                    </div>
                  ))}
                  {metrics.ranking.length === 0 && <p className="text-sm text-slate-400 italic">Sem dados para o período.</p>}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-lg text-slate-800">Pedidos Recentes</h3>
                <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded">Mostrando últimos 50</span>
              </div>
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-xs">
                  <tr>
                    <th className="p-4">ID / Data</th>
                    <th className="p-4">Cliente</th>
                    <th className="p-4">Representante</th>
                    <th className="p-4 text-center">Status Impressão</th>
                    <th className="p-4 text-right">Total Peças</th>
                    <th className="p-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.slice(0, 50).map(o => {
                    const qtd = o.items?.reduce((a,b)=>a+parseInt(b.quantity || 0),0)||0;
                    return (
                      <tr key={o.id} className="hover:bg-slate-50 transition">
                        <td className="p-4">
                          <div className="font-bold text-blue-600">#{o.display_id}</div>
                          <div className="text-xs text-slate-400">{formatDate(o.created_at)}</div>
                        </td>
                        <td className="p-4 font-medium">{o.client_name}</td>
                        <td className="p-4 text-slate-500">{o.rep_name}</td>
                        <td className="p-4 text-center">
                          {o.printed ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                              <CheckCircle size={12} className="mr-1"/> Impresso
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500">
                              Pendente
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right font-bold text-slate-700">{qtd}</td>
                        <td className="p-4 text-center">
                          <button 
                            onClick={() => setPrintOrder(o)}
                            className="text-slate-400 hover:text-blue-600 transition p-2 hover:bg-blue-50 rounded-full"
                            title="Imprimir Pedido"
                          >
                            <Printer size={18}/>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW: PRODUCTION (ROMANEIO) */}
        {view === 'production' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[80vh]">
              <div className="p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl flex justify-between items-center">
                 <h3 className="font-bold text-slate-700 flex items-center"><CheckSquare className="mr-2"/> Selecione os Pedidos</h3>
                 <button onClick={() => setSelectedOrders([])} className="text-xs text-blue-600 hover:underline font-bold">Limpar Seleção</button>
              </div>
              <div className="flex-1 overflow-auto p-2">
                <table className="w-full text-sm text-left">
                   <thead className="text-xs text-slate-500 uppercase bg-white sticky top-0">
                     <tr>
                       <th className="p-3 w-10"></th>
                       <th className="p-3">Pedido</th>
                       <th className="p-3">Cliente</th>
                       <th className="p-3 text-right">Peças</th>
                       <th className="p-3 text-center">Impresso?</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y">
                     {orders.map(o => {
                       const isSel = selectedOrders.includes(o.id);
                       const qtd = o.items?.reduce((a,b)=>a+parseInt(b.quantity || 0),0)||0;
                       return (
                         <tr key={o.id} 
                             onClick={() => setSelectedOrders(prev => isSel ? prev.filter(id=>id!==o.id) : [...prev, o.id])}
                             className={`cursor-pointer transition ${isSel ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                         >
                           <td className="p-3">
                             <div className={`w-5 h-5 rounded border flex items-center justify-center ${isSel ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                               {isSel && <CheckCircle size={14} className="text-white"/>}
                             </div>
                           </td>
                           <td className="p-3 font-bold text-slate-700">#{o.display_id}</td>
                           <td className="p-3 text-slate-600">{o.client_name}</td>
                           <td className="p-3 text-right font-bold">{qtd}</td>
                           <td className="p-3 text-center">
                             {o.printed && <CheckCircle size={14} className="text-green-500 inline"/>}
                           </td>
                         </tr>
                       );
                     })}
                   </tbody>
                </table>
              </div>
            </div>

            <div className="bg-slate-800 text-white rounded-xl shadow-xl flex flex-col h-[80vh]">
              <div className="p-6 border-b border-slate-700">
                <h3 className="font-bold text-xl mb-1 text-white flex items-center gap-2"><Grid3X3/> Romaneio Total</h3>
                <p className="text-slate-400 text-sm">{selectedOrders.length} pedidos selecionados</p>
              </div>
              
              <div className="flex-1 overflow-auto p-4">
                {selectedOrders.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50">
                    <Grid3X3 size={48} className="mb-4"/>
                    <p className="text-center max-w-xs">Selecione pedidos à esquerda para calcular o total de produção por cor e tamanho.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {productionSummary.rows.map((row, idx) => (
                      <div key={idx} className="bg-slate-700/50 rounded-lg p-3 border border-slate-600">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="text-yellow-400 font-bold text-lg leading-tight">{row.reference}</div>
                            <div className="text-slate-300 text-sm uppercase">{row.color}</div>
                          </div>
                          <div className="bg-slate-800 px-2 py-1 rounded border border-slate-600 text-xl font-bold">
                            {row.totalQty}
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-600/50">
                           {productionSummary.headers.map(h => (
                             row.sizes[h] ? (
                               <div key={h} className="text-center bg-slate-600 rounded py-1">
                                 <div className="text-[10px] text-slate-400 uppercase font-bold">{h}</div>
                                 <div className="font-bold">{row.sizes[h]}</div>
                               </div>
                             ) : null
                           ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-700 bg-slate-900 rounded-b-xl">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-slate-400 uppercase font-bold text-xs">Total Geral</span>
                  <span className="text-2xl font-bold text-yellow-400">
                    {productionSummary.rows.reduce((a,b) => a + b.totalQty, 0)} <span className="text-sm text-slate-500 font-normal">peças</span>
                  </span>
                </div>
                <button onClick={() => window.print()} disabled={selectedOrders.length===0} className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition flex justify-center items-center gap-2">
                  <Printer size={18}/> Imprimir Relatório
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: PRODUCTS */}
        {view === 'products' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
               <h3 className="font-bold text-lg mb-4 text-slate-700 border-b pb-2">Cadastrar Grade</h3>
               <div className="space-y-4">
                 <div>
                   <label className="text-xs font-bold text-slate-400 uppercase">Referência</label>
                   <input className="w-full p-2 border rounded font-bold text-slate-700" placeholder="Ex: CAMISA-2024" value={prodRef} onChange={e => setProdRef(e.target.value)} />
                 </div>
                 <div>
                   <label className="text-xs font-bold text-slate-400 uppercase">Cor</label>
                   <input className="w-full p-2 border rounded font-bold text-slate-700" placeholder="Ex: PRETO" value={prodColor} onChange={e => setProdColor(e.target.value)} />
                 </div>
                 <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Tamanhos</label>
                    <div className="flex flex-wrap gap-2">
                      {['P','M','G','GG','G1','G2','G3'].map(s => (
                        <button key={s} onClick={() => setSelectedSizes(prev => prev.includes(s) ? prev.filter(i=>i!==s) : [...prev, s])}
                          className={`w-10 h-10 rounded font-bold border transition ${selectedSizes.includes(s) ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-105' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>{s}</button>
                      ))}
                    </div>
                 </div>
                 <button onClick={handleAddProductGrade} className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold shadow mt-4">Salvar Grade</button>
               </div>
            </div>
            <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-lg mb-4 text-slate-700">Catálogo Atual</h3>
              <div className="overflow-auto max-h-[600px] border rounded-lg">
                <table className="w-full text-left text-sm">
                   <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs sticky top-0">
                     <tr>
                       <th className="p-3">Ref</th>
                       <th className="p-3">Cor</th>
                       <th className="p-3">Tamanhos (Clique no X para excluir)</th>
                       <th className="p-3 text-center">Ações</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {groupedProducts.map(group => (
                       <tr key={`${group.ref}-${group.color}`} className="hover:bg-slate-50">
                         <td className="p-3 font-bold text-blue-900">{group.ref}</td>
                         <td className="p-3 uppercase text-slate-600">{group.color}</td>
                         <td className="p-3">
                           <div className="flex flex-wrap gap-2">
                             {group.variants.sort((a,b) => sortSizes(a.size, b.size)).map(v => (
                               <div key={v.id} className="bg-slate-100 border px-2 py-1 rounded text-xs font-bold text-slate-700 flex items-center group relative">
                                 {v.size}
                                 <button 
                                   type="button"
                                   onClick={(e) => handleDeleteVariant(e, v.id)}
                                   className="ml-2 text-slate-400 hover:text-red-500 cursor-pointer z-10 p-1 hover:bg-slate-200 rounded-full transition-colors"
                                   title="Excluir este tamanho"
                                 >
                                   {deletingId === v.id ? <Loader2 className="animate-spin" size={12} /> : <X size={12}/>}
                                 </button>
                               </div>
                             ))}
                           </div>
                         </td>
                         <td className="p-3 text-center">
                            <button 
                              type="button"
                              onClick={(e) => handleDeleteProductGroup(e, group.variants)}
                              className="text-red-300 hover:text-red-600 p-2 rounded hover:bg-red-50 transition z-10 relative"
                              title="Excluir toda esta cor"
                            >
                              {deletingId === group.variants[0].id ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18}/>}
                            </button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: REPS */}
        {view === 'reps' && (
          <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
              <h3 className="font-bold text-lg mb-4 text-slate-700">Adicionar Novo Representante</h3>
              <form onSubmit={handleAddRep} className="flex gap-4 items-end bg-slate-50 p-4 rounded-lg border border-slate-200">
                 <div className="flex-1">
                   <label className="text-xs font-bold text-slate-400 uppercase">Nome</label>
                   <input className="w-full border p-2 rounded mt-1" placeholder="Nome Completo" value={newRep.name} onChange={e => setNewRep({...newRep, name: e.target.value})} />
                 </div>
                 <div className="flex-1">
                   <label className="text-xs font-bold text-slate-400 uppercase">Email (Login)</label>
                   <input className="w-full border p-2 rounded mt-1" placeholder="email@exemplo.com" value={newRep.email} onChange={e => setNewRep({...newRep, email: e.target.value})} />
                 </div>
                 <div className="flex-1">
                   <label className="text-xs font-bold text-slate-400 uppercase">Senha Inicial</label>
                   <input className="w-full border p-2 rounded mt-1" placeholder="******" value={newRep.password} onChange={e => setNewRep({...newRep, password: e.target.value})} />
                 </div>
                 <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-bold shadow">Adicionar</button>
              </form>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="p-4 bg-slate-50 border-b font-bold text-slate-500 text-xs uppercase flex justify-between">
                 <span>Nome</span>
                 <span>Ações</span>
               </div>
               <div className="divide-y divide-slate-100">
                 {users.filter(u=>u.role==='rep').map(u => (
                   <div key={u.id} className="p-4 flex justify-between items-center hover:bg-slate-50">
                     <div>
                       <div className="font-bold text-slate-800">{u.name}</div>
                       <div className="text-sm text-slate-400">{u.email}</div>
                     </div>
                     <div className="flex items-center gap-4">
                        <button 
                          type="button"
                          onClick={() => handleDeleteRep(u.id)}
                          className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-full transition"
                          title="Excluir Representante"
                        >
                          <Trash2 size={18}/>
                        </button>
                     </div>
                   </div>
                 ))}
                 {users.filter(u=>u.role==='rep').length === 0 && <div className="p-8 text-center text-slate-400 italic">Nenhum representante cadastrado.</div>}
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- REP DASHBOARD ---
const RepDashboard = ({ profile, products, clients, myOrders, onCreateOrder, onCreateClient }) => {
  const [tab, setTab] = useState('order');
  const [cart, setCart] = useState([]);
  const [meta, setMeta] = useState({ clientId: '', date: '', pay: '' });
  const [newClient, setNewClient] = useState({ name: '', city: '', state: '' });
  const [printOrder, setPrintOrder] = useState(null);
  
  // Inputs Grade
  const [selRef, setSelRef] = useState('');
  const [selColor, setSelColor] = useState('');
  const [gridQtd, setGridQtd] = useState({});

  // Filtros de Input
  const uniqueRefs = useMemo(() => [...new Set(products.map(p => p.ref))].sort(), [products]);
  const availableColors = useMemo(() => selRef ? [...new Set(products.filter(p => p.ref === selRef).map(p => p.color))].sort() : [], [products, selRef]);
  
  // Tamanhos UNICOS (Correção de chave duplicada)
  const availableSizes = useMemo(() => (selRef && selColor) ? [...new Set(products.filter(p => p.ref === selRef && p.color === selColor).map(p => p.size))].sort(sortSizes) : [], [products, selRef, selColor]);
  
  const cartGrade = useMemo(() => groupItemsByGrade(cart), [cart]);

  const handleAddGridToCart = () => {
    const newItems = [];
    Object.entries(gridQtd).forEach(([size, qtd]) => {
      if (parseInt(qty) > 0) {
        const prod = products.find(p => p.ref === selRef && p.color === selColor && p.size === size);
        // Se achar o produto exato, usa. Senão, cria objeto temporario.
        if (prod) newItems.push({ ...prod, quantity: parseInt(qty) });
      }
    });
    if (newItems.length === 0) return;
    setCart(prev => [...prev, ...newItems]);
    setGridQuantities({}); setSelColor(''); 
  };

  const handleFinishOrder = () => {
    const client = clients.find(c => c.id === meta.clientId);
    if (!client || cart.length === 0) { alert("Selecione cliente e adicione itens."); return; }
    
    onCreateOrder({
      client_id: client.id,
      client_name: client.name,
      client_city: client.city,
      client_state: client.state,
      items: cart,
      delivery_date: meta.date,
      payment_method: meta.pay
    });
    setCart([]); setMeta({ clientId: '', date: '', pay: '' });
  };

  const handleCreateClient = (e) => {
    e.preventDefault();
    if(!newClient.name) return;
    onCreateClient(newClient);
    setNewClient({ name: '', city: '', state: '' });
  };

  if (printOrder) return <OrderPrintView order={printOrder} onClose={() => setPrintOrder(null)} />;

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <div className="flex justify-between items-center mb-6">
           <div><h2 className="text-xl font-bold text-slate-800">Painel de Vendas</h2><p className="text-slate-500 text-sm">{profile.name}</p></div>
           <div className="flex gap-2">
             <button onClick={() => setTab('order')} className={`px-4 py-2 rounded font-bold ${tab === 'order' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Novo Pedido</button>
             <button onClick={() => setTab('history')} className={`px-4 py-2 rounded font-bold ${tab === 'history' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Histórico</button>
             <button onClick={() => setTab('clients')} className={`px-4 py-2 rounded font-bold ${tab === 'clients' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Clientes</button>
           </div>
        </div>
        
        {tab === 'order' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded border">
              <select className="p-2 border rounded w-full" value={meta.clientId} onChange={e => setMeta({...meta, clientId: e.target.value})}>
                <option value="">Selecione Cliente...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input type="date" className="p-2 border rounded w-full" value={meta.date} onChange={e => setMeta({...meta, date: e.target.value})} />
              <input className="p-2 border rounded w-full" placeholder="Condição Pagamento" value={meta.pay} onChange={e => setMeta({...meta, pay: e.target.value})} />
            </div>
            
            <div className="border-2 border-blue-100 rounded-xl p-4 bg-blue-50/50">
              <h3 className="font-bold text-blue-800 mb-3 flex items-center"><Grid3X3 size={18} className="mr-2"/> Grade de Pedido</h3>
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="w-full md:w-1/4">
                  <label className="text-xs font-bold text-slate-500">REF</label>
                  <select className="w-full p-2 border border-blue-300 rounded" value={inputRef} onChange={e => { setInputRef(e.target.value); setInputColor(''); setGridQuantities({}); }}>
                    <option value="">Ref...</option>
                    {uniqueRefs.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="w-full md:w-1/4">
                  <label className="text-xs font-bold text-slate-500">COR</label>
                  <select className="w-full p-2 border border-blue-300 rounded" value={inputColor} onChange={e => setInputColor(e.target.value)} disabled={!inputRef}>
                    <option value="">Cor...</option>
                    {availableColors.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="flex-1 w-full overflow-x-auto">
                  {inputRef && inputColor && (
                    <div className="flex gap-2 pb-1">
                      {availableSizes.map(size => (
                        <div key={size} className="flex flex-col items-center min-w-[3rem]">
                          <label className="text-xs font-bold mb-1">{size}</label>
                          <input type="number" className="w-12 p-1 border border-slate-400 rounded text-center font-bold focus:bg-yellow-50 focus:ring-2 ring-blue-500" 
                            placeholder="0" min="0" 
                            value={gridQuantities[size] || ''} 
                            onChange={e => setGridQuantities(prev => ({ ...prev, [size]: e.target.value }))} 
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={handleAddGridToCart} disabled={!inputRef || !inputColor} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 shadow-lg disabled:opacity-50 h-10">OK</button>
              </div>
            </div>

            {cart.length > 0 && (
              <div className="border rounded-lg overflow-hidden bg-white">
                <div className="bg-slate-800 text-white p-3 font-bold flex justify-between"><span>Itens no Pedido</span><span>Total: {cart.reduce((a,b) => a + parseInt(b.quantity || 0), 0)} pçs</span></div>
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
                    <tr><th className="p-3">Ref</th><th className="p-3">Cor</th>{cartGrade.headers.map(h => <th key={h} className="p-3 text-center w-10">{h}</th>)}<th className="p-3 text-right w-16">Qtd</th><th className="p-3 w-10"></th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {cartGrade.rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 font-bold">{row.reference}</td><td className="p-3">{row.color}</td>
                        {cartGrade.headers.map(h => (<td key={h} className="p-3 text-center text-slate-500">{row.sizes[h] ? <span className="font-bold text-black">{row.sizes[h]}</span> : '-'}</td>))}
                        <td className="p-3 text-right font-bold bg-slate-50">{row.totalQty}</td>
                        <td className="p-3 text-center"><button onClick={() => setCart(cart.filter(i => !(i.reference === row.reference && i.color === row.color)))} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="p-4 bg-slate-50 border-t"><button onClick={handleFinishOrder} className="w-full bg-green-600 text-white py-3 rounded-lg font-bold shadow text-lg hover:bg-green-700">FINALIZAR PEDIDO</button></div>
              </div>
            )}
          </div>
        )}

        {tab === 'history' && (
          <div className="space-y-3">
            {myOrders.map(o => (
              <div key={o.id} className="border p-4 rounded flex justify-between items-center hover:bg-slate-50">
                <div>
                  <span className="font-bold bg-slate-200 px-2 py-1 rounded text-xs mr-2">#{o.display_id}</span>
                  <span className="font-bold">{o.client_name}</span>
                  <span className="text-slate-400 text-sm ml-2">{formatDate(o.created_at)}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-xs font-bold px-2 py-1 rounded ${o.printed ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>{o.printed ? 'IMPRESSO' : 'PENDENTE'}</span>
                  <button onClick={() => setPrintOrder(o)} className="text-blue-600"><Printer size={18}/></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'clients' && (
          <form onSubmit={handleCreateClient} className="space-y-3">
            <input className="border p-2 rounded w-full" placeholder="Nome Cliente" value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})} />
            <div className="flex gap-2">
              <input className="border p-2 rounded w-full" placeholder="Cidade" value={newClient.city} onChange={e => setNewClient({...newClient, city: e.target.value})} />
              <input className="border p-2 rounded w-full" placeholder="Estado" value={newClient.state} onChange={e => setNewClient({...newClient, state: e.target.value})} />
            </div>
            <button className="bg-blue-600 text-white w-full py-2 rounded">Salvar Cliente</button>
            <div className="mt-4">{clients.map(c => <div key={c.id} className="border-b p-2 text-sm">{c.name} ({c.city})</div>)}</div>
          </form>
        )}
      </div>
    </div>
  );
};

// --- APP ROOT ---
export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Dados
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadData(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) loadData(session.user.id);
      else { setProfile(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadData = async (userId) => {
    setLoading(true);
    // Busca perfil do usuário
    const { data: prof } = await supabase.from('user_profiles').select('*').eq('id', userId).single();
    setProfile(prof);

    if (prof) {
      // Carrega dados conforme a permissão (RLS cuidará da segurança no backend, aqui filtramos para UX)
      const { data: p } = await supabase.from('products').select('*');
      const { data: o } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      const { data: c } = await supabase.from('clients').select('*');
      const { data: u } = await supabase.from('user_profiles').select('*');

      if(p) setProducts(p);
      if(o) setOrders(o);
      if(c) setClients(c);
      if(u) setUsers(u);
    }
    setLoading(false);
  };

  // Actions (Wrappers para passar aos componentes)
  const createOrder = async (orderData) => {
    const { error } = await supabase.from('orders').insert({
      ...orderData,
      display_id: generateShortId(),
      rep_id: session.user.id,
      rep_name: profile.name
    });
    if (error) alert('Erro: ' + error.message);
    else { alert('Pedido Enviado!'); loadData(session.user.id); }
  };

  const createClient = async (clientData) => {
    const { error } = await supabase.from('clients').insert({ ...clientData, rep_id: session.user.id });
    if (error) alert('Erro: ' + error.message);
    else { alert('Cliente Salvo!'); loadData(session.user.id); }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={48}/></div>;
  if (!session || !profile) return <LoginScreen onLogin={()=>{}} />;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-10 print:hidden">
        <div className="flex items-center gap-2 font-bold text-lg text-slate-700">
          <div className="bg-blue-600 p-1.5 rounded text-white"><Shirt size={20}/></div>
          Confecção System
        </div>
        <div className="flex gap-4 items-center">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold">{profile.name}</p>
            <p className="text-xs text-slate-500 uppercase">{profile.role}</p>
          </div>
          <button onClick={() => supabase.auth.signOut()} className="bg-slate-100 p-2 rounded hover:bg-red-50 hover:text-red-600"><LogOut size={18}/></button>
        </div>
      </header>

      <main className="print:w-full print:absolute print:top-0 print:left-0 print:bg-white">
        {profile.role === 'admin' ? (
          <AdminDashboard 
            profile={profile} 
            products={products} 
            orders={orders} 
            users={users}
            refreshData={() => loadData(session.user.id)} 
          />
        ) : (
          <RepDashboard 
            profile={profile} 
            products={products} 
            clients={clients} 
            myOrders={orders.filter(o => o.rep_id === session.user.id)}
            onCreateOrder={createOrder}
            onCreateClient={createClient}
          />
        )}
      </main>
    </div>
  );
}
