'use client';

import React, { useState, useEffect } from 'react';
import { Search, Bus, MapPin, Plus, Trash2, ShieldAlert, Phone, Users, Check, RefreshCw } from 'lucide-react';

interface RosterItem {
  id: string;
  studentId: string;
  routeId: string;
  stopId: string;
  monthlyFare: number;
  activeFrom: string;
  student: {
    id: string;
    name: string;
    admissionNumber: string;
  };
  route: {
    name: string;
    vehicleNumber: string;
  };
  stop: {
    name: string;
    fare: number;
  };
}

interface SearchResult {
  id: string;
  name: string;
  admissionNumber: string;
  className: string;
  sectionName: string;
  activeTransport: {
    id: string;
    routeId: string;
    stopId: string;
    monthlyFare: number;
    route: { name: string };
    stop: { name: string };
  } | null;
}

interface Route {
  id: string;
  name: string;
  stops: {
    id: string;
    name: string;
    fare: number;
  }[];
}

export default function StudentTransportPage() {
  // Lists
  const [roster, setRoster] = useState<RosterItem[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Student Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  // Auto-search debouncer as user types (from length >= 1)
  useEffect(() => {
    if (searchQuery.trim().length < 1) {
      setSearchResults([]);
      setSearched(false);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setSearching(true);
      setError('');
      try {
        const res = await fetch(`/api/transport/students?search=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
          setSearched(true);
        }
      } catch (err: any) {
        console.error(err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Assignment Modal/Panel
  const [selectedStudent, setSelectedStudent] = useState<SearchResult | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [selectedStopId, setSelectedStopId] = useState('');

  useEffect(() => {
    fetchRoster();
    fetchRoutes();
  }, []);

  const fetchRoster = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/transport/students?roster=true');
      if (!res.ok) throw new Error('Failed to fetch roster');
      const data = await res.json();
      setRoster(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoutes = async () => {
    try {
      const res = await fetch('/api/transport/routes');
      if (!res.ok) throw new Error('Failed to fetch routes');
      const data = await res.json();
      // Only show active routes
      setRoutes(data.filter((r: any) => r.active));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setError('');
    try {
      const res = await fetch(`/api/transport/students?search=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) throw new Error('Failed to search students');
      const data = await res.json();
      setSearchResults(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  };

  const handleAssignTransport = async () => {
    if (!selectedStudent || !selectedRouteId || !selectedStopId) return;

    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/transport/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          routeId: selectedRouteId,
          stopId: selectedStopId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to assign transport');
      }

      setSuccess(`Transport successfully assigned to ${selectedStudent.name}!`);
      setSelectedStudent(null);
      setSelectedRouteId('');
      setSelectedStopId('');
      setSearchQuery('');
      setSearchResults([]);
      await fetchRoster();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRemoveTransport = async (studentId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to remove transport for ${studentName}? This will issue a CREDIT adjustment.`)) return;

    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/transport/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove',
          studentId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to remove transport');
      }

      setSuccess(`Transport successfully unlinked for ${studentName}.`);
      await fetchRoster();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const selectedRouteStops = routes.find((r) => r.id === selectedRouteId)?.stops || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Student Transport Desk</h1>
        <p className="text-xs text-slate-500">Allocate stops, unlink services, and view active transport rosters.</p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-xs">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded text-xs flex items-center gap-1.5 font-semibold">
          <Check className="h-4 w-4" /> {success}
        </div>
      )}

      {/* Row 1: Allocation and Search */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student Search and Selection Card */}
        <div className="erp-card lg:col-span-2 space-y-4">
          <h2 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Assign Transport Service</h2>
          
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search student by Name or Admission Number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="erp-input w-full pl-9"
              />
              {searching && (
                <div className="absolute right-3 top-2.5">
                  <RefreshCw className="h-3.5 w-3.5 text-slate-400 animate-spin" />
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={searching}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold shrink-0"
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
          </form>

          {searched && searchResults.length === 0 && (
            <p className="text-xs text-slate-400 italic text-center py-4 bg-slate-50 border border-dashed rounded">
              No students found matching your search query.
            </p>
          )}

          {searchResults.length > 0 && (
            <div className="border border-slate-100 rounded overflow-hidden max-h-60 overflow-y-auto">
              <table className="min-w-full divide-y divide-slate-100 text-xs">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-3 py-2 text-left font-bold text-slate-500">Admission No</th>
                    <th className="px-3 py-2 text-left font-bold text-slate-500">Name</th>
                    <th className="px-3 py-2 text-left font-bold text-slate-500">Class</th>
                    <th className="px-3 py-2 text-left font-bold text-slate-500">Current Status</th>
                    <th className="px-3 py-2 text-center font-bold text-slate-500">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {searchResults.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2 font-bold text-slate-700">{student.admissionNumber}</td>
                      <td className="px-3 py-2 font-semibold text-slate-800">{student.name}</td>
                      <td className="px-3 py-2 text-slate-500">{student.className} - {student.sectionName}</td>
                      <td className="px-3 py-2">
                        {student.activeTransport ? (
                          <span className="text-[10px] font-bold bg-cyan-50 text-cyan-700 px-1.5 py-0.5 rounded border border-cyan-200 flex items-center gap-1 w-max">
                            <Bus className="h-3 w-3" /> Linked to {student.activeTransport.stop.name}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-semibold">No transport</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => {
                            setSelectedStudent(student);
                            setSelectedRouteId(student.activeTransport?.routeId || '');
                            setSelectedStopId(student.activeTransport?.stopId || '');
                          }}
                          className="px-2 py-1 bg-slate-100 hover:bg-blue-600 hover:text-white rounded text-[11px] font-semibold text-slate-700"
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Transport Assignment details panel */}
        <div className="erp-card space-y-4">
          <h2 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Assignment Details</h2>
          {selectedStudent ? (
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded border border-slate-100">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Selected Student</p>
                <h4 className="text-sm font-bold text-slate-800 mt-0.5">{selectedStudent.name}</h4>
                <p className="text-[11px] text-slate-500 font-medium">Class: {selectedStudent.className} | Adm: {selectedStudent.admissionNumber}</p>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Select Route</label>
                <select
                  value={selectedRouteId}
                  onChange={(e) => { setSelectedRouteId(e.target.value); setSelectedStopId(''); }}
                  className="erp-input w-full"
                >
                  <option value="">-- Choose Route --</option>
                  {routes.map((route) => (
                    <option key={route.id} value={route.id}>{route.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Select Stop (Fare Snapshot)</label>
                <select
                  value={selectedStopId}
                  onChange={(e) => setSelectedStopId(e.target.value)}
                  disabled={!selectedRouteId}
                  className="erp-input w-full"
                >
                  <option value="">-- Choose Stop --</option>
                  {selectedRouteStops.map((stop) => (
                    <option key={stop.id} value={stop.id}>
                      {stop.name} - (₹{Number(stop.fare).toFixed(2)}/mo)
                    </option>
                  ))}
                </select>
              </div>

              {selectedStopId && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-800 space-y-1.5">
                  <div className="flex items-start gap-1">
                    <ShieldAlert className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" />
                    <div>
                      <p className="font-bold">Financial Immutability Snapshots:</p>
                      <p className="font-medium mt-0.5">
                        This allocation will generate a <strong>DEBIT</strong> FeeAdjustment of <strong>₹{Number(selectedRouteStops.find(s => s.id === selectedStopId)?.fare || 0).toFixed(2)}</strong>.
                        It will not modify the base totalFee snapshot.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="flex-1 px-3 py-2 border rounded text-slate-600 hover:bg-slate-50 text-center font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAssignTransport}
                  disabled={!selectedRouteId || !selectedStopId}
                  className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-center font-bold disabled:opacity-50"
                >
                  Link Transport
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs border border-dashed border-slate-200 rounded">
              Search and select a student to configure transport assignment.
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Roster */}
      <div className="erp-card space-y-3">
        <h2 className="text-xs font-bold uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
          <Users className="h-4 w-4 text-slate-400" />
          Active Transport Roster ({roster.length} students)
        </h2>

        {loading ? (
          <div className="text-center py-8 text-slate-500 text-xs">Loading transport roster...</div>
        ) : roster.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-200 rounded text-slate-400 text-xs bg-white">
            No students currently registered for transport.
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-100 rounded bg-white">
            <table className="min-w-full divide-y divide-slate-100 text-xs">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-4 py-2.5 text-left font-bold text-slate-500">Student Name</th>
                  <th className="px-4 py-2.5 text-left font-bold text-slate-500">Admission No</th>
                  <th className="px-4 py-2.5 text-left font-bold text-slate-500">Route</th>
                  <th className="px-4 py-2.5 text-left font-bold text-slate-500">Stop Point</th>
                  <th className="px-4 py-2.5 text-right font-bold text-slate-500">Monthly Fare</th>
                  <th className="px-4 py-2.5 text-left font-bold text-slate-500">Assigned Since</th>
                  <th className="px-4 py-2.5 text-center font-bold text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {roster.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2.5 font-bold text-slate-800">{item.student.name}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-600">{item.student.admissionNumber}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-700 flex items-center gap-1">
                      <Bus className="h-3.5 w-3.5 text-slate-400" />
                      {item.route.name} <span className="text-[10px] text-slate-400">({item.route.vehicleNumber})</span>
                    </td>
                    <td className="px-4 py-2.5 font-medium text-slate-700">
                      <MapPin className="h-3 w-3 text-slate-400 inline mr-1" />
                      {item.stop.name}
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold text-green-700">₹{Number(item.monthlyFare).toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-slate-500">{new Date(item.activeFrom).toLocaleDateString()}</td>
                    <td className="px-4 py-2.5 text-center">
                      <button
                        onClick={() => handleRemoveTransport(item.studentId, item.student.name)}
                        className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-slate-50"
                        title="Remove Transport Assignment"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
