'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Trash2, Edit2, Bus, User, Phone, CheckCircle, XCircle } from 'lucide-react';

interface Stop {
  id: string;
  routeId: string;
  name: string;
  fare: number;
  orderNo: number;
}

interface Route {
  id: string;
  name: string;
  vehicleNumber: string;
  driverName: string;
  driverMobile: string;
  active: boolean;
  stops: Stop[];
}

export default function RoutesPage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form states for Route
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [routeName, setRouteName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverMobile, setDriverMobile] = useState('');
  const [showRouteForm, setShowRouteForm] = useState(false);

  // Form states for Stop
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [stopName, setStopName] = useState('');
  const [stopFare, setStopFare] = useState('');
  const [stopOrder, setStopOrder] = useState('');
  const [showStopForm, setShowStopForm] = useState(false);
  const [editingStop, setEditingStop] = useState<Stop | null>(null);

  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/transport/routes');
      if (!res.ok) throw new Error('Failed to fetch routes');
      const data = await res.json();
      setRoutes(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const body = {
      id: editingRoute?.id,
      name: routeName,
      vehicleNumber,
      driverName,
      driverMobile,
      active: editingRoute ? editingRoute.active : true,
    };

    try {
      const method = editingRoute ? 'PUT' : 'POST';
      const res = await fetch('/api/transport/routes', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save route');
      }

      await fetchRoutes();
      resetRouteForm();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleRouteActive = async (route: Route) => {
    try {
      const res = await fetch('/api/transport/routes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...route,
          active: !route.active,
        }),
      });

      if (!res.ok) throw new Error('Failed to toggle status');
      await fetchRoutes();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteRoute = async (id: string) => {
    if (!confirm('Are you sure you want to delete this route? All associated stops will be deleted.')) return;
    try {
      const res = await fetch(`/api/transport/routes?id=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete route');
      await fetchRoutes();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSaveStop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRouteId) return;
    setError('');

    const body = {
      id: editingStop?.id,
      routeId: selectedRouteId,
      name: stopName,
      fare: Number(stopFare),
      orderNo: Number(stopOrder),
    };

    try {
      const method = editingStop ? 'PUT' : 'POST';
      const res = await fetch('/api/transport/stops', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save stop');
      }

      await fetchRoutes();
      resetStopForm();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteStop = async (id: string) => {
    if (!confirm('Are you sure you want to delete this stop?')) return;
    try {
      const res = await fetch(`/api/transport/stops?id=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete stop');
      await fetchRoutes();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const resetRouteForm = () => {
    setEditingRoute(null);
    setRouteName('');
    setVehicleNumber('');
    setDriverName('');
    setDriverMobile('');
    setShowRouteForm(false);
  };

  const resetStopForm = () => {
    setEditingStop(null);
    setStopName('');
    setStopFare('');
    setStopOrder('');
    setShowStopForm(false);
  };

  const openEditRoute = (route: Route) => {
    setEditingRoute(route);
    setRouteName(route.name);
    setVehicleNumber(route.vehicleNumber);
    setDriverName(route.driverName);
    setDriverMobile(route.driverMobile);
    setShowRouteForm(true);
  };

  const openAddStop = (routeId: string) => {
    setSelectedRouteId(routeId);
    setEditingStop(null);
    setStopName('');
    setStopFare('');
    // Automatically set next order number
    const route = routes.find(r => r.id === routeId);
    const nextOrder = route && route.stops.length > 0
      ? Math.max(...route.stops.map(s => s.orderNo)) + 1
      : 1;
    setStopOrder(String(nextOrder));
    setShowStopForm(true);
  };

  const openEditStop = (routeId: string, stop: Stop) => {
    setSelectedRouteId(routeId);
    setEditingStop(stop);
    setStopName(stop.name);
    setStopFare(String(stop.fare));
    setStopOrder(String(stop.orderNo));
    setShowStopForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Transport Routes & Stops</h1>
          <p className="text-xs text-slate-500">Manage bus routes, vehicle assignments, and intermediate stops.</p>
        </div>
        <button
          onClick={() => { resetRouteForm(); setShowRouteForm(true); }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold"
        >
          <Plus className="h-4 w-4" /> Add Route
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-xs">
          {error}
        </div>
      )}

      {/* Add / Edit Route Form Modal */}
      {showRouteForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <form onSubmit={handleSaveRoute} className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b pb-2">
              {editingRoute ? 'Edit Transport Route' : 'Add New Transport Route'}
            </h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Route Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Route A - North Sector"
                  value={routeName}
                  onChange={(e) => setRouteName(e.target.value)}
                  className="erp-input w-full"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Vehicle Registration Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PB-65-A-1234"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  className="erp-input w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Driver Name</label>
                  <input
                    type="text"
                    required
                    placeholder="John Doe"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="erp-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Driver Mobile</label>
                  <input
                    type="text"
                    required
                    placeholder="9876543210"
                    value={driverMobile}
                    onChange={(e) => setDriverMobile(e.target.value)}
                    className="erp-input w-full"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-3">
              <button
                type="button"
                onClick={resetRouteForm}
                className="px-3 py-1.5 border rounded text-xs text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold"
              >
                Save Route
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add / Edit Stop Form Modal */}
      {showStopForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <form onSubmit={handleSaveStop} className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b pb-2">
              {editingStop ? 'Edit Stop' : 'Add New Stop'}
            </h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Stop Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sector 15 Crossing"
                  value={stopName}
                  onChange={(e) => setStopName(e.target.value)}
                  className="erp-input w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Monthly Fare (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="1200"
                    value={stopFare}
                    onChange={(e) => setStopFare(e.target.value)}
                    className="erp-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Order Number</label>
                  <input
                    type="number"
                    required
                    placeholder="1"
                    value={stopOrder}
                    onChange={(e) => setStopOrder(e.target.value)}
                    className="erp-input w-full"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-3">
              <button
                type="button"
                onClick={resetStopForm}
                className="px-3 py-1.5 border rounded text-xs text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold"
              >
                Save Stop
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-500 text-xs">Loading transport routes...</div>
      ) : routes.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-200 rounded-lg text-slate-400 text-xs bg-white">
          No transport routes created yet. Add a route to begin.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {routes.map((route) => (
            <div key={route.id} className="erp-card flex flex-col space-y-4">
              {/* Route Details Card Header */}
              <div className="flex justify-between items-start border-b pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-800">{route.name}</h2>
                    <button
                      onClick={() => handleToggleRouteActive(route)}
                      title="Click to toggle status"
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${
                        route.active ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                      }`}
                    >
                      {route.active ? <CheckCircle className="h-2.5 w-2.5" /> : <XCircle className="h-2.5 w-2.5" />}
                      {route.active ? 'ACTIVE' : 'INACTIVE'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[10px] text-slate-500 font-medium">
                    <span className="flex items-center gap-1"><Bus className="h-3 w-3 text-slate-400" /> {route.vehicleNumber}</span>
                    <span className="flex items-center gap-1"><User className="h-3 w-3 text-slate-400" /> {route.driverName}</span>
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3 text-slate-400" /> {route.driverMobile}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openEditRoute(route)}
                    className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-50"
                    title="Edit Route"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteRoute(route.id)}
                    className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-slate-50"
                    title="Delete Route"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Stops Table */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Intermediate Stops ({route.stops.length})</h4>
                  <button
                    onClick={() => openAddStop(route.id)}
                    className="flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-800 font-bold"
                  >
                    <Plus className="h-3 w-3" /> Add Stop
                  </button>
                </div>

                {route.stops.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-slate-100 rounded text-slate-400 text-[10px] bg-slate-50/50">
                    No stops linked to this route.
                  </div>
                ) : (
                  <div className="border border-slate-100 rounded overflow-hidden bg-white">
                    <table className="min-w-full divide-y divide-slate-100 text-[11px]">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="px-3 py-1.5 text-left font-bold text-slate-500 w-12">Seq</th>
                          <th className="px-3 py-1.5 text-left font-bold text-slate-500">Stop Name</th>
                          <th className="px-3 py-1.5 text-right font-bold text-slate-500 w-28">Monthly Fare</th>
                          <th className="px-3 py-1.5 text-center font-bold text-slate-500 w-20">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {route.stops.map((stop) => (
                          <tr key={stop.id} className="hover:bg-slate-50/50">
                            <td className="px-3 py-1.5 font-bold text-slate-500">{stop.orderNo}</td>
                            <td className="px-3 py-1.5 font-medium text-slate-700 flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-slate-400" />
                              {stop.name}
                            </td>
                            <td className="px-3 py-1.5 text-right font-bold text-green-700">
                              ₹{Number(stop.fare).toFixed(2)}
                            </td>
                            <td className="px-3 py-1.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => openEditStop(route.id, stop)}
                                  className="text-slate-400 hover:text-blue-600 p-0.5"
                                  title="Edit Stop"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteStop(stop.id)}
                                  className="text-slate-400 hover:text-red-600 p-0.5"
                                  title="Delete Stop"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
