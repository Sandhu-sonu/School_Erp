'use client';

import React, { useEffect, useState } from 'react';
import { ToggleLeft, ToggleRight, Loader2, Sparkles, Shield, AlertCircle } from 'lucide-react';

interface Dependency {
  dependsOnModuleKey: string;
}

interface ModuleSetting {
  moduleKey: string;
  moduleName: string;
  type: 'CORE' | 'OPTIONAL' | 'FUTURE';
  status: 'ACTIVE' | 'BETA' | 'COMING_SOON' | 'DEPRECATED';
  enabled: boolean;
  version: string;
  description: string | null;
  dependencies: Dependency[];
}

export default function ModuleManagementPage() {
  const [modules, setModules] = useState<ModuleSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchModules = async () => {
    try {
      const res = await fetch('/api/system/modules');
      const data = await res.json();
      setModules(data);
    } catch (err) {
      console.error(err);
      setMessage({ text: 'Failed to load modules config.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModules();
  }, []);

  const handleToggle = async (key: string, currentStatus: boolean) => {
    setActionLoading(key);
    setMessage(null);
    try {
      const res = await fetch('/api/system/modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleKey: key, enabled: !currentStatus })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update module status.');
      }
      setMessage({ 
        text: `Successfully ${!currentStatus ? 'enabled' : 'disabled'} ${key} module.${data.disabledDependents?.length > 0 ? ` Automatically disabled dependents: ${data.disabledDependents.join(', ')}` : ''}`, 
        type: 'success' 
      });
      // Invalidate sidebar cache & reload
      await fetchModules();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handlePreset = async (preset: string) => {
    setActionLoading(`preset-${preset}`);
    setMessage(null);
    try {
      const res = await fetch('/api/system/modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to apply preset.');
      }
      setMessage({ text: `Successfully applied preset "${preset}". Optional modules updated.`, type: 'success' });
      await fetchModules();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Module Settings Console
          </h1>
          <p className="text-xs text-slate-500 mt-1">Configure active school portal modules, apply preset configurations, and manage dependencies.</p>
        </div>
      </div>

      {/* Preset Profiles panel */}
      <div className="erp-card bg-slate-900 text-slate-300 p-5">
        <h2 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-amber-400" />
          Academic Feature Presets
        </h2>
        <p className="text-[11px] text-slate-400 max-w-2xl mb-4">
          Select a default school profile setup to automatically toggle corresponding modules. 
          You can override individual modules below after applying a preset.
        </p>
        <div className="flex flex-wrap gap-2.5">
          {['Primary School', 'High School', 'Senior Secondary', 'Coaching Institute', 'Play School'].map((preset) => (
            <button
              key={preset}
              disabled={actionLoading !== null}
              onClick={() => handlePreset(preset)}
              className="px-3.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs border border-slate-700 hover:border-slate-600 disabled:opacity-50 transition-colors"
            >
              {actionLoading === `preset-${preset}` ? 'Applying...' : preset}
            </button>
          ))}
        </div>
      </div>

      {/* Status Messages */}
      {message && (
        <div className={`p-4 rounded-lg flex items-start gap-3 border ${
          message.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <p className="text-xs font-medium">{message.text}</p>
        </div>
      )}

      {/* Modules Config Grid table */}
      <div className="erp-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead>
              <tr className="bg-slate-50">
                <th className="erp-table-header">Module</th>
                <th className="erp-table-header">Type</th>
                <th className="erp-table-header">Status</th>
                <th className="erp-table-header">Dependencies</th>
                <th className="erp-table-header">Version</th>
                <th className="erp-table-header text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {modules.map((m) => {
                const isCore = m.type === 'CORE';
                const isFuture = m.type === 'FUTURE';
                const depNames = m.dependencies.map(d => d.dependsOnModuleKey).join(', ');

                return (
                  <tr key={m.moduleKey} className="hover:bg-slate-50/50">
                    <td className="erp-table-cell">
                      <div>
                        <span className="font-semibold text-slate-800 text-xs">{m.moduleName}</span>
                        <p className="text-[10px] text-slate-400 mt-0.5">{m.description || 'No description available.'}</p>
                      </div>
                    </td>
                    <td className="erp-table-cell">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                        isCore ? 'bg-blue-50 text-blue-700' :
                        isFuture ? 'bg-purple-50 text-purple-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {m.type}
                      </span>
                    </td>
                    <td className="erp-table-cell">
                      <span className={`text-[9px] font-bold uppercase ${
                        m.status === 'ACTIVE' ? 'text-green-600' :
                        m.status === 'BETA' ? 'text-amber-600' :
                        'text-slate-400'
                      }`}>
                        {m.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="erp-table-cell text-xs text-slate-500 font-medium">
                      {depNames || 'None'}
                    </td>
                    <td className="erp-table-cell text-xs text-slate-500 font-semibold">
                      {m.version}
                    </td>
                    <td className="erp-table-cell text-right">
                      {isCore ? (
                        <span className="text-[10px] text-slate-400 font-semibold px-2 py-1 rounded bg-slate-50 border border-slate-100">
                          Active & Locked
                        </span>
                      ) : isFuture ? (
                        <span className="text-[10px] text-slate-400 font-semibold px-2 py-1 rounded bg-purple-50/50 border border-purple-100">
                          Coming Soon
                        </span>
                      ) : (
                        <button
                          disabled={actionLoading !== null}
                          onClick={() => handleToggle(m.moduleKey, m.enabled)}
                          className="focus:outline-none transition-opacity disabled:opacity-50"
                        >
                          {m.enabled ? (
                            <ToggleRight className="h-7 w-7 text-green-500" />
                          ) : (
                            <ToggleLeft className="h-7 w-7 text-slate-300" />
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
