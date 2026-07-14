'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Plus, Edit2, Trash2, BookOpen, AlertCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { UserRole, RolePermissions } from '@school-erp/utils';

interface SectionItem {
  id: string;
  name: string;
  _count: {
    enrollments: number;
  };
}

interface FeePlanItem {
  id: string;
  sessionId: string;
  session: {
    name: string;
  };
}

interface ClassItem {
  id: string;
  name: string;
  sequence: number;
  sections: SectionItem[];
  feePlans: FeePlanItem[];
  _count: {
    enrollments: number;
  };
}

export default function ClassesSectionsPage() {
  const { data: sessionData } = useSession();
  const userRole = sessionData?.user?.role as UserRole | undefined;
  const canWrite = userRole && RolePermissions[userRole]?.academics === 'write';

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [className, setClassName] = useState('');
  const [classSequence, setClassSequence] = useState(1);

  const [addingSectionTo, setAddingSectionTo] = useState<ClassItem | null>(null);
  const [sectionName, setSectionName] = useState('');

  const fetchClasses = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/academics/classes');
      if (res.ok) {
        const data = await res.json();
        setClasses(data);
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to fetch classes');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userRole) {
      fetchClasses();
    }
  }, [userRole]);

  useEffect(() => {
    if (classes.length > 0 && !editingClass) {
      setClassSequence(classes.length + 1);
    }
  }, [classes, editingClass]);

  const handleCreateOrUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className || classSequence === undefined) return;
    setError(null);

    const action = editingClass ? 'updateClass' : 'createClass';
    const body: any = { action, name: className, sequence: classSequence };
    if (editingClass) body.id = editingClass.id;

    try {
      const res = await fetch('/api/academics/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setClassName('');
        setEditingClass(null);
        await fetchClasses();
      } else {
        const errData = await res.json();
        setError(errData.error || 'Operation failed');
      }
    } catch (err: any) {
      setError(err.message || 'Operation failed');
    }
  };

  const handleDeleteClass = async (id: string) => {
    if (!confirm('Are you sure you want to delete this class?')) return;
    setError(null);
    try {
      const res = await fetch('/api/academics/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteClass', id }),
      });

      if (res.ok) {
        await fetchClasses();
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to delete class');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete class');
    }
  };

  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addingSectionTo || !sectionName) return;
    setError(null);

    try {
      const res = await fetch('/api/academics/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createSection',
          classId: addingSectionTo.id,
          name: sectionName,
        }),
      });

      if (res.ok) {
        setSectionName('');
        setAddingSectionTo(null);
        await fetchClasses();
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to add section');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add section');
    }
  };

  const handleDeleteSection = async (id: string) => {
    if (!confirm('Are you sure you want to delete this section?')) return;
    setError(null);
    try {
      const res = await fetch('/api/academics/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteSection', id }),
      });

      if (res.ok) {
        await fetchClasses();
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to delete section');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete section');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Classes & Sections Management</h1>
          <p className="text-xs text-slate-500">Configure school academic class levels, map classroom sections, and monitor student capacity.</p>
        </div>
        <button
          type="button"
          onClick={fetchClasses}
          className="erp-btn-secondary flex items-center gap-1 text-xs"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Reload</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {canWrite && (
          <div className="space-y-6">
            <div className="erp-card h-fit">
              <h2 className="text-xs font-bold uppercase text-slate-700 border-b pb-2 mb-3 flex items-center gap-1.5">
                <Plus className="h-4 w-4 text-blue-600" />
                {editingClass ? 'Edit Class' : 'Create Class'}
              </h2>
              <form onSubmit={handleCreateOrUpdateClass} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Class Name</label>
                  <input
                    type="text"
                    className="erp-input"
                    placeholder="e.g. Class 1, Nursery"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sequence Order</label>
                  <input
                    type="number"
                    className="erp-input"
                    value={classSequence}
                    onChange={(e) => setClassSequence(Number(e.target.value))}
                    required
                    min={1}
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    className="erp-btn-primary flex-1 text-xs font-semibold"
                  >
                    <span>{editingClass ? 'Save Changes' : 'Create Class'}</span>
                  </button>
                  {editingClass && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingClass(null);
                        setClassName('');
                      }}
                      className="erp-btn-secondary flex-1 text-xs font-semibold"
                    >
                      <span>Cancel</span>
                    </button>
                  )}
                </div>
              </form>
            </div>

            {addingSectionTo && (
              <div className="erp-card h-fit">
                <h2 className="text-xs font-bold uppercase text-slate-700 border-b pb-2 mb-3 flex items-center gap-1.5">
                  <Plus className="h-4 w-4 text-green-600" />
                  Add Section to {addingSectionTo.name}
                </h2>
                <form onSubmit={handleCreateSection} className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Section Name</label>
                    <input
                      type="text"
                      className="erp-input"
                      placeholder="e.g. A, B, Rose"
                      value={sectionName}
                      onChange={(e) => setSectionName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      className="erp-btn-primary flex-1 text-xs font-semibold"
                    >
                      <span>Add Section</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAddingSectionTo(null);
                        setSectionName('');
                      }}
                      className="erp-btn-secondary flex-1 text-xs font-semibold"
                    >
                      <span>Cancel</span>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        <div className={`erp-card ${canWrite ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <h2 className="text-xs font-bold uppercase text-slate-700 border-b pb-2 mb-3 flex items-center gap-1.5">
            <BookOpen className="h-4 w-4 text-slate-500" />
            Class Matrix Breakdown
          </h2>
          <div className="overflow-x-auto border border-slate-200 rounded">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr className="bg-slate-50">
                  <th className="erp-table-header">Class Level</th>
                  <th className="erp-table-header">Sequence</th>
                  <th className="erp-table-header text-right">Students</th>
                  <th className="erp-table-header">Sections Mapping</th>
                  <th className="erp-table-header">Fee Plan Linkage</th>
                  {canWrite && <th className="erp-table-header text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {isLoading ? (
                  <tr>
                    <td colSpan={canWrite ? 6 : 5} className="text-center py-8 text-slate-400 text-xs">Loading classes...</td>
                  </tr>
                ) : classes.length === 0 ? (
                  <tr>
                    <td colSpan={canWrite ? 6 : 5} className="text-center py-8 text-slate-400 text-xs">No classes created yet.</td>
                  </tr>
                ) : (
                  classes.map((cls) => (
                    <tr key={cls.id} className="hover:bg-slate-50/50">
                      <td className="erp-table-cell font-bold text-slate-800">{cls.name}</td>
                      <td className="erp-table-cell font-mono">{cls.sequence}</td>
                      <td className="erp-table-cell text-right font-bold text-blue-700">{cls._count.enrollments}</td>
                      <td className="erp-table-cell">
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {cls.sections.length === 0 ? (
                            <span className="text-[10px] text-slate-400">No sections</span>
                          ) : (
                            cls.sections.map((sec) => (
                              <span
                                key={sec.id}
                                className="inline-flex items-center gap-1 pl-2 pr-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium border border-slate-200"
                              >
                                <span>Sec {sec.name}</span>
                                <span className="font-bold text-blue-600 bg-white border border-slate-200 rounded-full px-1 text-[9px] min-w-[12px] text-center">
                                  {sec._count.enrollments}
                                </span>
                                {canWrite && (
                                  <button
                                    onClick={() => handleDeleteSection(sec.id)}
                                    className="text-red-500 hover:text-red-700 font-bold ml-1 text-[11px]"
                                    title="Delete Section"
                                  >
                                    &times;
                                  </button>
                                )}
                              </span>
                            ))
                          )}
                          {canWrite && (
                            <button
                              onClick={() => {
                                setAddingSectionTo(cls);
                                setSectionName('');
                              }}
                              className="text-blue-600 hover:text-blue-800 text-[10px] font-bold"
                            >
                              + Add Sec
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="erp-table-cell">
                        {cls.feePlans.length > 0 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                            Linked ({cls.feePlans[0]?.session.name})
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                            Missing Fee Plan
                          </span>
                        )}
                      </td>
                      {canWrite && (
                        <td className="erp-table-cell text-right space-x-1.5">
                          <button
                            onClick={() => {
                              setEditingClass(cls);
                              setClassName(cls.name);
                              setClassSequence(cls.sequence);
                            }}
                            className="text-blue-600 hover:text-blue-800 inline-block"
                            title="Edit Class"
                          >
                            <Edit2 className="h-3.5 w-3.5 inline" />
                          </button>
                          <button
                            onClick={() => handleDeleteClass(cls.id)}
                            className="text-red-600 hover:text-red-800 inline-block"
                            title="Delete Class"
                          >
                            <Trash2 className="h-3.5 w-3.5 inline" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
