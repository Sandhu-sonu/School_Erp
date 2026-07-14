'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, FileText, Settings, User, CreditCard, X, Shield, Wrench, BarChart2 } from 'lucide-react';

interface SearchResult {
  students: Array<{ id: string; name: string; admissionNumber: string }>;
  parents: Array<{ id: string; fatherName: string; mobile: string }>;
  staff: Array<{ id: string; name: string; employeeCode: string }>;
  receipts: Array<{ id: string; receiptNumber: string; amount: number }>;
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult>({ students: [], parents: [], staff: [], receipts: [] });
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut Ctrl + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setResults({ students: [], parents: [], staff: [], receipts: [] });
    }
  }, [isOpen]);

  // Fetch search results
  useEffect(() => {
    if (query.length < 2) {
      setResults({ students: [], parents: [], staff: [], receipts: [] });
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/system/search?query=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  if (!isOpen) return null;

  const navigateTo = (path: string) => {
    router.push(path);
    setIsOpen(false);
  };

  const hasResults = 
    results.students.length > 0 ||
    results.parents.length > 0 ||
    results.staff.length > 0 ||
    results.receipts.length > 0;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-start justify-center pt-[15vh] p-4">
      <div className="fixed inset-0" onClick={() => setIsOpen(false)} />
      
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[60vh] relative z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Search header */}
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <Search className="h-5 w-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type Ctrl+K to search Students, Parents, Receipts..."
            className="flex-1 bg-transparent text-xs font-semibold focus:outline-none text-slate-800"
          />
          {loading && <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />}
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1 rounded bg-slate-50 text-slate-450 hover:bg-slate-100 text-[10px] uppercase font-bold"
          >
            Esc
          </button>
        </div>

        {/* Results */}
        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {/* Default Quick Actions when no search query */}
          {query.length < 2 && (
            <div className="space-y-2">
              <h5 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Quick Navigation Links</h5>
              <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                <button 
                  onClick={() => navigateTo('/dashboard')}
                  className="p-3 bg-slate-50 rounded-xl hover:bg-slate-100/85 text-slate-700 flex items-center gap-2 text-left"
                >
                  <FileText className="h-4 w-4 text-blue-500" />
                  Dashboard Main
                </button>
                <button 
                  onClick={() => navigateTo('/dashboard/academics/students')}
                  className="p-3 bg-slate-50 rounded-xl hover:bg-slate-100/85 text-slate-700 flex items-center gap-2 text-left"
                >
                  <User className="h-4 w-4 text-purple-500" />
                  Students Center
                </button>
                <button 
                  onClick={() => navigateTo('/dashboard/finance/fees')}
                  className="p-3 bg-slate-50 rounded-xl hover:bg-slate-100/85 text-slate-700 flex items-center gap-2 text-left"
                >
                  <CreditCard className="h-4 w-4 text-green-500" />
                  Collect Fees
                </button>
                <button 
                  onClick={() => navigateTo('/dashboard/system/school-settings')}
                  className="p-3 bg-slate-50 rounded-xl hover:bg-slate-100/85 text-slate-700 flex items-center gap-2 text-left"
                >
                  <Settings className="h-4 w-4 text-slate-500" />
                  School Settings
                </button>
              </div>
            </div>
          )}

          {/* Categorized matches */}
          {query.length >= 2 && !hasResults && !loading && (
            <div className="p-8 text-center text-xs text-slate-400 font-semibold">
              No matching records found in database.
            </div>
          )}

          {query.length >= 2 && hasResults && (
            <div className="space-y-4 text-xs font-semibold text-slate-700">
              {/* Students */}
              {results.students.length > 0 && (
                <div className="space-y-1.5">
                  <h6 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Students</h6>
                  {results.students.map(s => (
                    <button
                      key={s.id}
                      onClick={() => navigateTo(`/dashboard/academics/students/${s.id}`)}
                      className="w-full p-2 hover:bg-slate-50 rounded-lg text-left flex justify-between"
                    >
                      <span>{s.name}</span>
                      <span className="text-[10px] text-slate-400">Adm: {s.admissionNumber}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Parents */}
              {results.parents.length > 0 && (
                <div className="space-y-1.5">
                  <h6 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Parents</h6>
                  {results.parents.map(p => (
                    <button
                      key={p.id}
                      onClick={() => navigateTo(`/dashboard/parents/${p.id}`)}
                      className="w-full p-2 hover:bg-slate-50 rounded-lg text-left flex justify-between"
                    >
                      <span>{p.fatherName}</span>
                      <span className="text-[10px] text-slate-400">{p.mobile}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Staff */}
              {results.staff.length > 0 && (
                <div className="space-y-1.5">
                  <h6 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Staff</h6>
                  {results.staff.map(st => (
                    <button
                      key={st.id}
                      onClick={() => navigateTo(`/dashboard/hr/staff/${st.id}`)}
                      className="w-full p-2 hover:bg-slate-50 rounded-lg text-left flex justify-between"
                    >
                      <span>{st.name}</span>
                      <span className="text-[10px] text-slate-400">Emp Code: {st.employeeCode}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Receipts */}
              {results.receipts.length > 0 && (
                <div className="space-y-1.5">
                  <h6 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Fee Receipts</h6>
                  {results.receipts.map(r => (
                    <button
                      key={r.id}
                      onClick={() => navigateTo(`/dashboard/finance/ledger?receipt=${r.receiptNumber}`)}
                      className="w-full p-2 hover:bg-slate-50 rounded-lg text-left flex justify-between font-mono"
                    >
                      <span>{r.receiptNumber}</span>
                      <span className="text-[10px] text-green-700 font-bold">₹{r.amount}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export default CommandPalette;
