'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface AccordionItem {
  id: string;
  title: string;
  children: React.ReactNode;
}

interface AccordionProps {
  items: AccordionItem[];
  allowMultiple?: boolean;
}

export function Accordion({ items, allowMultiple = false }: AccordionProps) {
  const [openIds, setOpenIds] = useState<string[]>([]);

  const handleToggle = (id: string) => {
    if (allowMultiple) {
      setOpenIds(prev =>
        prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      );
    } else {
      setOpenIds(prev => (prev.includes(id) ? [] : [id]));
    }
  };

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-white">
      {items.map((item) => {
        const isOpen = openIds.includes(item.id);
        return (
          <div key={item.id} className="flex flex-col">
            <button
              onClick={() => handleToggle(item.id)}
              className="p-4 flex justify-between items-center text-xs font-bold text-slate-700 bg-slate-50/50 hover:bg-slate-50 transition-colors focus:outline-none"
            >
              <span>{item.title}</span>
              {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
            </button>
            {isOpen && (
              <div className="p-4 border-t border-slate-100 bg-white text-xs text-slate-600 animate-in slide-in-from-top-1 duration-150">
                {item.children}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
export default Accordion;
