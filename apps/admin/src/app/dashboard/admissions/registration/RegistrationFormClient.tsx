'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, UserPlus, Check, AlertCircle, Sparkles, ChevronRight, ChevronLeft } from 'lucide-react';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';

interface ClassOption {
  id: string;
  name: string;
  sections: { id: string; name: string }[];
}

export default function RegistrationFormClient({ classes }: { classes: ClassOption[] }) {
  const router = useRouter();

  // Stepper state
  const [step, setStep] = useState(1);

  // Search Parents state
  const [parentSearch, setParentSearch] = useState('');
  const [parentsList, setParentsList] = useState<any[]>([]);
  const [searchingParents, setSearchingParents] = useState(false);
  
  // Selected Parent
  const [selectedParent, setSelectedParent] = useState<any | null>(null);
  
  // New Parent Form toggler & fields
  const [showNewParentForm, setShowNewParentForm] = useState(false);
  const [parentFields, setParentFields] = useState({
    fatherName: '',
    motherName: '',
    mobile: '',
    alternateMobile: '',
    occupation: '',
    address: '',
    remarks: '',
  });

  // Student Fields
  const [studentFields, setStudentFields] = useState({
    name: '',
    dob: '',
    gender: 'MALE',
    photo: '',
    classId: '',
    sectionId: '',
    admissionDate: new Date().toISOString().substring(0, 10),
  });

  // UI States
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  // Debounced parent search query
  useEffect(() => {
    if (parentSearch.trim().length < 3) {
      setParentsList([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingParents(true);
      try {
        const res = await fetch(`/api/parents?search=${encodeURIComponent(parentSearch)}`);
        if (res.ok) {
          const data = await res.json();
          setParentsList(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setSearchingParents(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [parentSearch]);

  const selectedClass = classes.find((c) => c.id === studentFields.classId);
  const sections = selectedClass ? selectedClass.sections : [];

  const handleRegisterStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    let parentId = selectedParent?.id;

    setSubmitting(true);
    try {
      if (!parentId && showNewParentForm) {
        if (!parentFields.fatherName || !parentFields.mobile) {
          setError("Father's Name and Mobile are required to register a parent.");
          setSubmitting(false);
          return;
        }

        const parentRes = await fetch('/api/parents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parentFields),
        });
        const parentData = await parentRes.json();
        if (!parentRes.ok) {
          setError(parentData.error || 'Failed to register parent profile.');
          setSubmitting(false);
          return;
        }
        parentId = parentData.id;
        setSelectedParent(parentData);
        setShowNewParentForm(false);
      }

      if (!parentId) {
        setError('Please select or create a parent profile first in Step 1.');
        setSubmitting(false);
        return;
      }

      const payload = {
        ...studentFields,
        parentId: parentId,
      };

      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        let photoFailed = false;
        if (photoFile) {
          const formData = new FormData();
          formData.append('photo', photoFile);
          try {
            const photoRes = await fetch(`/api/students/${data.id}/photo`, {
              method: 'POST',
              body: formData,
            });
            if (!photoRes.ok) {
              photoFailed = true;
              const photoData = await photoRes.json();
              setError(`Student admitted successfully, but photo upload failed: ${photoData.error || 'Unknown error'}`);
            }
          } catch (photoErr: any) {
            photoFailed = true;
            setError(`Student admitted successfully, but photo upload failed: ${photoErr.message}`);
          }
        }
        if (!photoFailed) {
          setSuccess(`✅ Student successfully admitted. Admission No: ${data.admissionNumber}`);
        }
        setTimeout(() => {
          router.refresh();
          router.push(`/dashboard/academics/students/${data.id}`);
        }, 2000);
      } else {
        setError(data.error || 'Failed to admit student.');
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred during registration.');
    } finally {
      setSubmitting(false);
    }
  };

  const nextStep = () => {
    if (step === 1 && !selectedParent && !showNewParentForm) {
      setError('Please search and select a parent profile, or check New Parent registration.');
      return;
    }
    setError(null);
    setStep(prev => Math.min(prev + 1, 4));
  };

  const prevStep = () => {
    setError(null);
    setStep(prev => Math.max(prev - 1, 1));
  };

  return (
    <div className="space-y-6 text-xs font-semibold text-slate-700">
      {/* Messages */}
      {error && (
        <div className="rounded-xl bg-red-50 p-3 border border-red-200 flex items-start gap-2">
          <AlertCircle className="h-4.5 w-4.5 text-red-650 shrink-0" />
          <span className="text-xs text-red-800 font-semibold">{error}</span>
        </div>
      )}
      {success && (
        <div className="rounded-xl bg-green-50 p-3 border border-green-200 flex items-start gap-2">
          <Check className="h-4.5 w-4.5 text-green-600 shrink-0" />
          <span className="text-xs text-green-800 font-semibold">{success}</span>
        </div>
      )}

      {/* Stepper progress indicator */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
        {[
          { num: 1, label: 'Parent Linkage' },
          { num: 2, label: 'Student Info' },
          { num: 3, label: 'Academic Specs' },
          { num: 4, label: 'Review & Admit' }
        ].map((s) => (
          <div key={s.num} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
              step >= s.num ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'
            }`}>
              {s.num}
            </div>
            <span className={`hidden sm:inline text-[10px] uppercase font-bold tracking-wider ${
              step === s.num ? 'text-slate-800' : 'text-slate-400'
            }`}>
              {s.label}
            </span>
            {s.num < 4 && <ChevronRight className="h-4 w-4 text-slate-300" />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* STEP 1: Parent Linkage */}
          {step === 1 && (
            <Card title="Step 1: Link Guardian Profile" className="p-5">
              <div className="border-b pb-3 mb-4 flex justify-between items-center">
                <span className="text-slate-500 font-bold uppercase text-[10px] tracking-wide">Primary Parent linkage</span>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewParentForm(!showNewParentForm);
                    setSelectedParent(null);
                  }}
                  className="text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 focus:outline-none cursor-pointer"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  {showNewParentForm ? 'Search Parent' : 'Register New Parent'}
                </button>
              </div>

              {!showNewParentForm ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Search Parent Record</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search by father name or mobile..."
                        value={parentSearch}
                        onChange={(e) => setParentSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                        disabled={submitting}
                      />
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    </div>
                  </div>

                  {searchingParents && <div className="text-xs text-slate-400">Querying database...</div>}

                  {parentsList.length > 0 && (
                    <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white overflow-hidden max-h-48 overflow-y-auto">
                      {parentsList.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSelectedParent(p);
                            setParentsList([]);
                            setParentSearch('');
                          }}
                          className="w-full text-left p-3 hover:bg-slate-50 text-xs flex justify-between items-center"
                        >
                          <div>
                            <span className="font-bold text-slate-800">{p.fatherName}</span>
                            {p.motherName && <span className="text-slate-400 text-[10px] ml-1">({p.motherName})</span>}
                          </div>
                          <span className="font-mono text-slate-500 font-semibold">{p.mobile}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedParent && (
                    <div className="bg-slate-50 p-4 border border-slate-200 rounded-2xl flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-800">{selectedParent.fatherName}</h4>
                        {selectedParent.motherName && <p className="text-[10px] text-slate-400 mt-0.5">Mother: {selectedParent.motherName}</p>}
                        <p className="text-[10px] text-slate-400 font-mono mt-1">Mobile: {selectedParent.mobile}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedParent(null)}
                        className="text-[10px] text-red-650 hover:underline font-bold"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Father Name *"
                    required
                    value={parentFields.fatherName}
                    onChange={(e) => setParentFields({ ...parentFields, fatherName: e.target.value })}
                  />
                  <Input
                    label="Mother Name"
                    value={parentFields.motherName}
                    onChange={(e) => setParentFields({ ...parentFields, motherName: e.target.value })}
                  />
                  <Input
                    label="Mobile Number *"
                    required
                    maxLength={10}
                    value={parentFields.mobile}
                    onChange={(e) => setParentFields({ ...parentFields, mobile: e.target.value })}
                  />
                  <Input
                    label="Occupation"
                    value={parentFields.occupation}
                    onChange={(e) => setParentFields({ ...parentFields, occupation: e.target.value })}
                  />
                  <div className="col-span-2">
                    <Input
                      label="Home Address"
                      value={parentFields.address}
                      onChange={(e) => setParentFields({ ...parentFields, address: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* STEP 2: Student Info */}
          {step === 2 && (
            <Card title="Step 2: Student Details" className="p-5">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Student Full Name *"
                  required
                  value={studentFields.name}
                  onChange={(e) => setStudentFields({ ...studentFields, name: e.target.value })}
                />
                <Input
                  label="Date of Birth *"
                  type="date"
                  required
                  value={studentFields.dob}
                  onChange={(e) => setStudentFields({ ...studentFields, dob: e.target.value })}
                />
                <Select
                  label="Gender"
                  options={[
                    { value: 'MALE', label: 'Male' },
                    { value: 'FEMALE', label: 'Female' },
                    { value: 'OTHER', label: 'Other' }
                  ]}
                  value={studentFields.gender}
                  onChange={(e) => setStudentFields({ ...studentFields, gender: e.target.value })}
                />
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Upload Photo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                    className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:uppercase file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                  />
                </div>
              </div>
            </Card>
          )}

          {/* STEP 3: Academic Specs */}
          {step === 3 && (
            <Card title="Step 3: Academic Assignments" className="p-5">
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Admitting Class Level *"
                  required
                  options={[
                    { value: '', label: 'Select class' },
                    ...classes.map(c => ({ value: c.id, label: c.name }))
                  ]}
                  value={studentFields.classId}
                  onChange={(e) => setStudentFields({ ...studentFields, classId: e.target.value, sectionId: '' })}
                />
                <Select
                  label="Class Section"
                  options={[
                    { value: '', label: 'Select section' },
                    ...sections.map(s => ({ value: s.id, label: s.name }))
                  ]}
                  value={studentFields.sectionId}
                  onChange={(e) => setStudentFields({ ...studentFields, sectionId: e.target.value })}
                />
                <Input
                  label="Admission Date *"
                  type="date"
                  required
                  value={studentFields.admissionDate}
                  onChange={(e) => setStudentFields({ ...studentFields, admissionDate: e.target.value })}
                />
              </div>
            </Card>
          )}

          {/* STEP 4: Review & Submit */}
          {step === 4 && (
            <Card title="Step 4: Review Admission Details" className="p-5">
              <div className="space-y-4">
                <div className="border-b pb-2">
                  <h4 className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Guardian Summary</h4>
                  {showNewParentForm ? (
                    <div className="mt-2 grid grid-cols-2 gap-2 text-slate-700">
                      <div><span className="text-[9px] text-slate-450 uppercase">Father</span>: {parentFields.fatherName}</div>
                      <div><span className="text-[9px] text-slate-455 uppercase font-mono">Mobile</span>: {parentFields.mobile}</div>
                    </div>
                  ) : (
                    <div className="mt-2 grid grid-cols-2 gap-2 text-slate-700">
                      <div><span className="text-[9px] text-slate-450 uppercase">Father</span>: {selectedParent?.fatherName}</div>
                      <div><span className="text-[9px] text-slate-455 uppercase font-mono">Mobile</span>: {selectedParent?.mobile}</div>
                    </div>
                  )}
                </div>

                <div className="border-b pb-2">
                  <h4 className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Student Summary</h4>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-slate-700">
                    <div><span className="text-[9px] text-slate-450 uppercase">Name</span>: {studentFields.name}</div>
                    <div><span className="text-[9px] text-slate-450 uppercase">DOB</span>: {studentFields.dob}</div>
                    <div><span className="text-[9px] text-slate-455 uppercase">Gender</span>: {studentFields.gender}</div>
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Class Summary</h4>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-slate-700">
                    <div><span className="text-[9px] text-slate-455 uppercase">Class Level</span>: {selectedClass?.name || '-'}</div>
                    <div><span className="text-[9px] text-slate-455 uppercase font-mono">Admission Date</span>: {studentFields.admissionDate}</div>
                  </div>
                </div>

                <Button 
                  onClick={handleRegisterStudent} 
                  disabled={submitting} 
                  fullWidth 
                  className="mt-6"
                >
                  {submitting ? 'Admitting Student...' : 'Complete Admission Intake'}
                </Button>
              </div>
            </Card>
          )}

          {/* Stepper Navigation buttons */}
          <div className="flex justify-between items-center pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={prevStep}
              disabled={step === 1 || submitting}
            >
              <ChevronLeft className="h-4 w-4 mr-1.5" />
              Back
            </Button>

            {step < 4 ? (
              <Button
                type="button"
                onClick={nextStep}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1.5" />
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
