'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, Server, Database, Cpu, Activity, ShieldAlert, BarChart3, TrendingUp, Users } from 'lucide-react';

interface HealthData {
  status: string;
  pgVersion: string;
  prismaVersion: string;
  nodeVersion: string;
  appVersion: string;
  buildNumber: string;
  dbLatencyMs: number;
  memoryUsageMb: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
  };
  uploadsFolderSizeBb: number;
  backupsFolderSizeBb: number;
  diskSpacePercentUsed: number;
  activeConnections: number;
  activeSessions: number;
  activeParentSessions: number;
  systemUptimeSeconds: number;
  totals: {
    students: number;
    staff: number;
    parents: number;
  };
}

export default function SystemHealthPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await fetch('/api/system/health');
        if (!res.ok) throw new Error('Failed to retrieve system health.');
        const healthData = await res.json();
        setData(healthData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchHealth();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-semibold text-center">
        Error loading system indicators. Please check database connectivity.
      </div>
    );
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">System Health Monitor</h1>
        <p className="text-xs text-slate-500">Real-time indicators of database load, latency, memory utilization, and active session counts.</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Connection Status */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded bg-green-50 text-green-600">
            <Server className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">System Status</span>
            <span className="text-sm font-bold text-green-700 flex items-center gap-1.5 mt-0.5">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping shrink-0" />
              ONLINE (UP)
            </span>
          </div>
        </div>

        {/* DB Latency */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded bg-blue-50 text-blue-600">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Database Latency</span>
            <span className="text-sm font-bold text-slate-800 mt-0.5">{data.dbLatencyMs} ms</span>
          </div>
        </div>

        {/* Memory RSS */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded bg-purple-50 text-purple-600">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Node Memory RSS</span>
            <span className="text-sm font-bold text-slate-800 mt-0.5">{data.memoryUsageMb.rss} MB</span>
          </div>
        </div>

        {/* Uptime */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded bg-amber-50 text-amber-600">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">System Uptime</span>
            <span className="text-sm font-bold text-slate-800 mt-0.5">{formatUptime(data.systemUptimeSeconds)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Runtime Settings Card */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <BarChart3 className="h-4.5 w-4.5 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-700">Environment Specs</h3>
          </div>
          <div className="p-4 flex-1 divide-y divide-slate-100 text-xs font-medium space-y-3">
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">PostgreSQL Version</span>
              <span className="text-slate-800 font-bold truncate max-w-xs">{data.pgVersion}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Prisma Client Version</span>
              <span className="text-slate-800 font-bold">{data.prismaVersion}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Node Runtime Engine</span>
              <span className="text-slate-800 font-bold">{data.nodeVersion}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Active Database Connections</span>
              <span className="text-slate-800 font-bold">{data.activeConnections}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Storage Usage (%)</span>
              <span className="text-slate-850 font-bold">{data.diskSpacePercentUsed}% Used</span>
            </div>
          </div>
        </div>

        {/* Storage details card */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <TrendingUp className="h-4.5 w-4.5 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-700">Storage Allocation</h3>
          </div>
          <div className="p-4 flex-1 space-y-4 text-xs font-medium">
            <div>
              <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Photo Uploads Folder</span>
              <p className="text-base font-bold text-slate-800 mt-1">{formatSize(data.uploadsFolderSizeBb)}</p>
            </div>
            <div>
              <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Backup Archives Folder</span>
              <p className="text-base font-bold text-slate-800 mt-1">{formatSize(data.backupsFolderSizeBb)}</p>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Active Parent Sessions</span>
              <p className="text-base font-bold text-slate-800 mt-1">{data.activeParentSessions} Session(s)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Roster counts */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-slate-700 flex items-center gap-2">
          <Users className="h-4.5 w-4.5 text-blue-600" />
          Active Roster Totals
        </h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Students</span>
            <p className="text-lg font-bold text-slate-800 mt-1">{data.totals.students}</p>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Staff</span>
            <p className="text-lg font-bold text-slate-800 mt-1">{data.totals.staff}</p>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Parents</span>
            <p className="text-lg font-bold text-slate-800 mt-1">{data.totals.parents}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
