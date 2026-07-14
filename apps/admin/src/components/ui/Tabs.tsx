'use client';

import React, { useState } from 'react';

interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface TabsProps {
  items: TabItem[];
  defaultActiveId?: string;
  onChange?: (id: string) => void;
}

export function Tabs({ items, defaultActiveId, onChange }: TabsProps) {
  const [activeId, setActiveId] = useState(defaultActiveId || items[0]?.id);

  const handleTabClick = (id: string) => {
    setActiveId(id);
    if (onChange) onChange(id);
  };

  return (
    <div className="space-y-4">
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2">
        {items.map((item) => {
          const isActive = activeId === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={`py-2 px-4 text-xs font-bold transition-all border-b-2 whitespace-nowrap focus:outline-none ${
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <div className="animate-in fade-in duration-200">
        {items.find((item) => item.id === activeId)?.content}
      </div>
    </div>
  );
}
export default Tabs;
