import React, { useState } from 'react';
import { 
  Car, 
  User, 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  ShieldAlert, 
  Users, 
  Phone,
  Settings,
  PlusCircle,
  Truck,
  Check,
  AlertTriangle,
  UserPlus,
  Award,
  FileSignature
} from 'lucide-react';
import { Vehicle, Driver, Approver, Caretaker } from '../types';
import ConfirmModal from './ConfirmModal';

interface AdminPanelProps {
  vehicles: Vehicle[];
  drivers: Driver[];
  approvers: Approver[];
  caretakers: Caretaker[];
  onSaveVehicle: (vehicle: Vehicle) => void;
  onDeleteVehicle: (id: string) => void;
  onSaveDriver: (driver: Driver) => void;
  onDeleteDriver: (id: string) => void;
  onSaveApprover: (approver: Approver) => void;
  onDeleteApprover: (id: string) => void;
  onSaveCaretaker: (caretaker: Caretaker) => void;
  onDeleteCaretaker: (id: string) => void;
  onLogout?: () => void;
}

export default function AdminPanel({
  vehicles,
  drivers,
  approvers,
  caretakers,
  onSaveVehicle,
  onDeleteVehicle,
  onSaveDriver,
  onDeleteDriver,
  onSaveApprover,
  onDeleteApprover,
  onSaveCaretaker,
  onDeleteCaretaker,
  onLogout
}: AdminPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<'vehicles' | 'drivers' | 'approvers' | 'caretakers'>('vehicles');

  // Confirmation State
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    type?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const closeConfirm = () => {
    setConfirmState(prev => ({ ...prev, isOpen: false }));
  };

  // Form states
  const [vehicleForm, setVehicleForm] = useState<Partial<Vehicle> | null>(null);
  const [driverForm, setDriverForm] = useState<Partial<Driver> | null>(null);
  const [approverForm, setApproverForm] = useState<Partial<Approver> | null>(null);
  const [caretakerForm, setCaretakerForm] = useState<Partial<Caretaker> | null>(null);
  
  // Validation errors
  const [vehicleErrors, setVehicleErrors] = useState<{ [key: string]: string }>({});
  const [driverErrors, setDriverErrors] = useState<{ [key: string]: string }>({});
  const [approverErrors, setApproverErrors] = useState<{ [key: string]: string }>({});
  const [caretakerErrors, setCaretakerErrors] = useState<{ [key: string]: string }>({});

  const resetAllForms = () => {
    setVehicleForm(null);
    setDriverForm(null);
    setApproverForm(null);
    setCaretakerForm(null);
    setVehicleErrors({});
    setDriverErrors({});
    setApproverErrors({});
    setCaretakerErrors({});
  };

  // Help translate status for Display
  const translateVehicleType = (type: 'van' | 'pickup' | 'suv' | 'sedan') => {
    switch(type) {
      case 'van': return 'รถตู้ (Van)';
      case 'pickup': return 'รถกระบะ (Pickup)';
      case 'suv': return 'รถเอนกประสงค์ (SUV)';
      case 'sedan': return 'รถยนต์นั่งบุคคล (Sedan)';
      default: return type;
    }
  };

  const getVehicleStatusLabel = (status: 'available' | 'busy' | 'maintenance') => {
    switch (status) {
      case 'available': return { label: 'ว่างพร้อมใช้งาน', css: 'bg-emerald-50 text-emerald-700 border-emerald-250' };
      case 'busy': return { label: 'ติดภารกิจเดินทาง', css: 'bg-orange-50 text-orange-700 border-orange-200' };
      case 'maintenance': return { label: 'อยู่ระหว่างซ่อมบำรุง', css: 'bg-amber-50 text-amber-700 border-amber-250 animate-pulse' };
    }
  };

  const getDriverStatusLabel = (status: 'available' | 'busy' | 'off') => {
    switch (status) {
      case 'available': return { label: 'สแตนบายพร้อมปฏิบัติงาน', css: 'bg-emerald-50 text-emerald-700 border-emerald-250' };
      case 'busy': return { label: 'ติดภารกิจขับรถ', css: 'bg-orange-50 text-orange-700 border-orange-200' };
      case 'off': return { label: 'ลาพักผ่อน / ไม่มาปฏิบัติงาน', css: 'bg-slate-100 text-slate-500 border-slate-200' };
    }
  };

  // Vehicle Submit
  const handleVehicleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleForm) return;

    const errors: { [key: string]: string } = {};
    if (!vehicleForm.name?.trim()) errors.name = 'กรุณากรอกชื่อเรียกยานพาหนะ';
    if (!vehicleForm.plateNumber?.trim()) errors.plateNumber = 'กรุณากรอกเลขทะเบียนรถ';
    if (!vehicleForm.capacity || Number(vehicleForm.capacity) <= 0) errors.capacity = 'กรุณากรอกขนาดที่นั่งให้ถูกต้อง';

    if (Object.keys(errors).length > 0) {
      setVehicleErrors(errors);
      return;
    }

    const randomColors = [
      'bg-indigo-100 text-indigo-700',
      'bg-blue-100 text-blue-700',
      'bg-emerald-100 text-emerald-700',
      'bg-teal-100 text-teal-700',
      'bg-amber-100 text-amber-700',
      'bg-rose-100 text-rose-700',
      'bg-violet-100 text-violet-700'
    ];

    const completedVehicle: Vehicle = {
      id: vehicleForm.id || `V${Date.now()}`,
      name: vehicleForm.name || '',
      type: (vehicleForm.type || 'van') as 'van' | 'pickup' | 'suv' | 'sedan',
      plateNumber: vehicleForm.plateNumber || '',
      capacity: Number(vehicleForm.capacity) || 4,
      status: (vehicleForm.status || 'available') as 'available' | 'busy' | 'maintenance',
      imagePlaceholderColor: vehicleForm.imagePlaceholderColor || randomColors[Math.floor(Math.random() * randomColors.length)],
      mileage: vehicleForm.mileage !== undefined ? Number(vehicleForm.mileage) : 0
    };

    onSaveVehicle(completedVehicle);
    setVehicleForm(null);
    setVehicleErrors({});
  };

  // Driver Submit
  const handleDriverSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverForm) return;

    const errors: { [key: string]: string } = {};
    if (!driverForm.name?.trim()) errors.name = 'กรุณากรอกชื่อและนามสกุลคนขับ';
    if (!driverForm.phone?.trim() || !/^\d{2,3}-\d{3}-\d{4}$/.test(driverForm.phone)) {
      errors.phone = 'กรุณากรอกรูปแบบเบอร์โทรให้ถูกต้อง (เช่น 081-234-5678)';
    }

    if (Object.keys(errors).length > 0) {
      setDriverErrors(errors);
      return;
    }

    const avatarColors = [
      'bg-orange-600 text-white',
      'bg-amber-600 text-white',
      'bg-emerald-600 text-white',
      'bg-blue-600 text-white',
      'bg-violet-600 text-white',
      'bg-rose-600 text-white',
      'bg-indigo-600 text-white'
    ];

    const completedDriver: Driver = {
      id: driverForm.id || `D${Date.now()}`,
      name: driverForm.name || '',
      phone: driverForm.phone || '',
      status: (driverForm.status || 'available') as 'available' | 'busy' | 'off',
      avatarColor: driverForm.avatarColor || avatarColors[Math.floor(Math.random() * avatarColors.length)]
    };

    onSaveDriver(completedDriver);
    setDriverForm(null);
    setDriverErrors({});
  };

  // Approver Submit
  const handleApproverSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!approverForm) return;

    const errors: { [key: string]: string } = {};
    if (!approverForm.name?.trim()) errors.name = 'กรุณากรอกชื่อและนามสกุลผู้อนุมัติ';
    if (!approverForm.position?.trim()) errors.position = 'กรุณากรอกตำแหน่งทางราชการ';

    if (Object.keys(errors).length > 0) {
      setApproverErrors(errors);
      return;
    }

    const completedApprover: Approver = {
      id: approverForm.id || `A${Date.now()}`,
      name: approverForm.name || '',
      position: approverForm.position || ''
    };

    onSaveApprover(completedApprover);
    setApproverForm(null);
    setApproverErrors({});
  };

  // Caretaker Submit
  const handleCaretakerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!caretakerForm) return;

    const errors: { [key: string]: string } = {};
    if (!caretakerForm.name?.trim()) errors.name = 'กรุณากรอกชื่อและนามสกุลเจ้าหน้าที่จัดดูแล';
    if (!caretakerForm.position?.trim()) errors.position = 'กรุณากรอกตำแหน่งราชการ';

    if (Object.keys(errors).length > 0) {
      setCaretakerErrors(errors);
      return;
    }

    const completedCaretaker: Caretaker = {
      id: caretakerForm.id || `C${Date.now()}`,
      name: caretakerForm.name || '',
      position: caretakerForm.position || ''
    };

    onSaveCaretaker(completedCaretaker);
    setCaretakerForm(null);
    setCaretakerErrors({});
  };

  return (
    <div className="space-y-6" id="admin-panel-view">
      
      {/* Date Navigation Bar and View Select */}
      <div className="bg-white border border-pink-100 rounded-lg p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Settings className="text-pink-600 animate-spin-slow" size={24} />
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-950 font-sans flex items-center gap-2">
              แผงผู้ดูแลระบบ: สนง.พมจ.ตรัง
              <span className="px-2 py-0.5 text-[10px] bg-pink-100 text-pink-700 border border-pink-200 font-extrabold rounded">สิทธิ์แอดมิน</span>
            </h2>
            <p className="text-xs text-slate-500">จัดการคลังยานพาหนะและทะเบียนรายชื่อพนักงานขับรถส่วนกลาง เพื่อความแม่นยำในการจองใช้สิทธิ์</p>
          </div>
        </div>
        
        {/* Subtab switcher */}
        <div className="flex flex-wrap md:flex-nowrap items-center gap-3 shrink-0">
          <div className="flex flex-wrap bg-pink-50/40 p-1 rounded-lg border border-pink-100 shadow-inner gap-1 md:gap-0">
            <button
              onClick={() => {
                setActiveSubTab('vehicles');
                resetAllForms();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                activeSubTab === 'vehicles' 
                  ? 'bg-white text-pink-600 shadow-sm border border-pink-150' 
                  : 'text-slate-600 hover:text-pink-700'
              }`}
            >
              <Car size={14} />
              คลังรถยนต์ราชการ ({vehicles.length})
            </button>
            <button
              onClick={() => {
                setActiveSubTab('drivers');
                resetAllForms();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                activeSubTab === 'drivers' 
                  ? 'bg-white text-pink-600 shadow-sm border border-pink-150' 
                  : 'text-slate-600 hover:text-pink-700'
              }`}
            >
              <Users size={14} />
              ทะเบียนคนขับ ({drivers.length})
            </button>
            <button
              onClick={() => {
                setActiveSubTab('approvers');
                resetAllForms();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                activeSubTab === 'approvers' 
                  ? 'bg-white text-pink-600 shadow-sm border border-pink-150' 
                  : 'text-slate-600 hover:text-pink-700'
              }`}
            >
              <Award size={14} />
              ผู้อนุมัติโครงการ ({approvers.length})
            </button>
            <button
              onClick={() => {
                setActiveSubTab('caretakers');
                resetAllForms();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                activeSubTab === 'caretakers' 
                  ? 'bg-white text-pink-600 shadow-sm border border-pink-150' 
                  : 'text-slate-600 hover:text-pink-700'
              }`}
            >
              <FileSignature size={14} />
              เจ้าหน้าที่จัดดูแลฯ ({caretakers.length})
            </button>
          </div>

          {onLogout && (
            <button
              onClick={(e) => {
                e.preventDefault();
                setConfirmState({
                  isOpen: true,
                  title: 'ยืนยันการออกจากระบบสิทธิ์แอดมิน',
                  message: 'คุณต้องการยืนยันการออกจากระบบสิทธิ์แอดมินใช่หรือไม่?',
                  confirmText: 'ออกจากระบบทันที',
                  type: 'warning',
                  onConfirm: () => {
                    onLogout();
                    closeConfirm();
                  }
                });
              }}
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-[#a22055] border border-rose-250 hover:border-[#a22055] text-xs font-black rounded-lg transition cursor-pointer flex items-center gap-1.5 shadow-xs shrink-0 font-sans"
              title="ออกจากระบบทันที"
            >
              🚪 ออกจากระบบ
            </button>
          )}
        </div>
      </div>

      {activeSubTab === 'vehicles' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* List of Vehicles */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-pink-100 rounded-lg p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-950 flex items-center gap-2">
                  <Car size={18} className="text-pink-600" />
                  รายชื่อรถยนต์ทั้งหมดและสถานะแบบเรียลไทม์
                </h3>
                <button
                  onClick={() => {
                    setDriverForm(null);
                    setVehicleForm({
                      name: '',
                      type: 'van',
                      plateNumber: '',
                      capacity: 10,
                      status: 'available',
                      mileage: 0
                    });
                  }}
                  className="px-3 py-1.5 bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold rounded-lg transition flex items-center gap-1 shadow-sm border border-pink-500 cursor-pointer"
                >
                  <Plus size={14} />
                  เพิ่มรถใหม่
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {vehicles.map((v) => {
                  const statusInfo = getVehicleStatusLabel(v.status);
                  return (
                    <div 
                      key={v.id} 
                      className="border border-pink-100 hover:border-pink-200 bg-white rounded-lg p-4 transition flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 border border-slate-200 px-2 py-0.5 rounded">
                            {v.plateNumber}
                          </span>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 border rounded-full ${statusInfo.css}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-slate-900 text-sm h-10 line-clamp-2 mt-2 font-sans">{v.name}</h4>
                        <div className="mt-2 text-xs text-slate-500 space-y-0.5">
                          <p>ประเภท: {translateVehicleType(v.type)}</p>
                          <p>ขนาดความจุ: {v.capacity} ที่นั่ง</p>
                          <p className="flex items-center gap-1.5 mt-1 pt-1 border-t border-dashed border-pink-100 font-semibold text-slate-700">
                            <span>⏱️ ไมล์สะสม:</span>
                            <span className="font-mono text-xs font-extrabold text-pink-600">{(v.mileage || 0).toLocaleString()} กม.</span>
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-105 flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setDriverForm(null);
                            setVehicleForm(v);
                          }}
                          className="p-1.5 hover:bg-pink-50/50 border border-slate-200 text-slate-650 hover:text-pink-700 rounded transition flex items-center gap-1 text-xs font-bold cursor-pointer"
                          title="แก้ไขรายละเอียดรถ"
                        >
                          <Edit2 size={13} />
                          แก้ไข
                        </button>
                        <button
                          onClick={() => {
                            setConfirmState({
                              isOpen: true,
                              title: 'ยืนยันลบรถยนต์ออกจากระบบ',
                              message: `คุณต้องการยืนยันการลบรถยนต์แผ่นป้ายทะเบียน "${v.plateNumber}" หรือไม่?\n\nหากมีงานจองของรถคันนี้ ระบบอาจจะยังนำเสนอข้อมูลแผงทะเบียนเดิมเพื่อความสมบูรณ์ทางสารบรรณ`,
                              confirmText: 'ลบรถยนต์',
                              type: 'danger',
                              onConfirm: () => {
                                onDeleteVehicle(v.id);
                                if (vehicleForm?.id === v.id) setVehicleForm(null);
                                closeConfirm();
                              }
                            });
                          }}
                          className="p-1.5 hover:bg-red-50 border border-red-100 text-red-655 hover:text-red-800 rounded transition flex items-center gap-1 text-xs font-bold cursor-pointer"
                          title="ลบรถยนต์ออกจากคลัง"
                        >
                          <Trash2 size={13} />
                          ลบ
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Form Side panel */}
          <div className="lg:col-span-1">
            {vehicleForm ? (
              <form onSubmit={handleVehicleSubmit} className="bg-pink-50/55 text-slate-850 border border-pink-100 rounded-lg p-5 shadow-sm space-y-4 animate-fade-in">
                <div className="flex items-center justify-between border-b border-pink-100 pb-3">
                  <h3 className="text-sm font-bold text-pink-700 flex items-center gap-1.5 font-sans">
                    <PlusCircle size={16} />
                    {vehicleForm.id ? 'แก้ไขข้อมูลรถยนต์ราชการ' : 'เพิ่มรถยนต์ราชการคันใหม่'}
                  </h3>
                  <button 
                    type="button" 
                    onClick={() => {
                      setVehicleForm(null);
                      setVehicleErrors({});
                    }}
                    className="p-1 hover:bg-pink-100/50 rounded text-slate-400 hover:text-pink-700 transition cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-3.5 text-xs text-slate-700">
                  
                  {/* Name Input */}
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-800">ชื่อยี่ห้อและรุ่นรถยนต์</label>
                    <input 
                      type="text"
                      value={vehicleForm.name || ''}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, name: e.target.value })}
                      placeholder="เช่น Toyota Commuter (รถตู้ VIP)"
                      className="w-full bg-white text-slate-900 py-2 px-3 border border-pink-200 rounded outline-none focus:ring-1 focus:ring-pink-500 font-medium"
                    />
                    {vehicleErrors.name && (
                      <p className="text-[10px] text-red-500 font-semibold">{vehicleErrors.name}</p>
                    )}
                  </div>

                  {/* Plate Number */}
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-800">เลขทะเบียนแผ่นป้าย</label>
                    <input 
                      type="text"
                      value={vehicleForm.plateNumber || ''}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, plateNumber: e.target.value })}
                      placeholder="เช่น นข 1122 ตรัง"
                      className="w-full bg-white text-slate-900 py-2 px-3 border border-pink-200 rounded outline-none focus:ring-1 focus:ring-pink-500 font-bold"
                    />
                    {vehicleErrors.plateNumber && (
                      <p className="text-[10px] text-red-500 font-semibold">{vehicleErrors.plateNumber}</p>
                    )}
                  </div>

                  {/* Columns for Type and Capacity */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block font-bold text-slate-800">ประเภท</label>
                      <select
                        value={vehicleForm.type || 'van'}
                        onChange={(e) => setVehicleForm({ ...vehicleForm, type: e.target.value as any })}
                        className="w-full bg-white text-slate-900 py-2 px-2.5 border border-pink-200 rounded outline-none focus:ring-1 focus:ring-pink-500 h-9 font-medium"
                      >
                        <option value="van">รถตู้ (Van)</option>
                        <option value="pickup">รถกระบะ (Pickup)</option>
                        <option value="suv">รถอเนกประสงค์ (SUV)</option>
                        <option value="sedan">รถยนต์เก๋ง (Sedan)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block font-bold text-slate-800">ความจุทีนั่ง</label>
                      <input 
                        type="number"
                        min="1"
                        max="50"
                        value={vehicleForm.capacity || 1}
                        onChange={(e) => setVehicleForm({ ...vehicleForm, capacity: Number(e.target.value) })}
                        className="w-full bg-white text-slate-900 py-2 px-3 border border-pink-200 rounded outline-none focus:ring-1 focus:ring-pink-500 h-9 font-bold"
                      />
                      {vehicleErrors.capacity && (
                        <p className="text-[10px] text-red-500 font-semibold">{vehicleErrors.capacity}</p>
                      )}
                    </div>
                  </div>

                  {/* Current Status */}
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-800">สถานะความพร้อม</label>
                    <select
                      value={vehicleForm.status || 'available'}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, status: e.target.value as any })}
                      className="w-full bg-white text-slate-900 py-2 px-2.5 border border-pink-200 rounded outline-none focus:ring-1 focus:ring-pink-500 font-medium"
                    >
                      <option value="available">ว่าง / พร้อมให้บริการ (Available)</option>
                      <option value="busy">ติดปฏิบัติภารกิจเดินทาง (Busy)</option>
                      <option value="maintenance">อยู่ระหว่างการนำรถไปซ่อมบำรุง (Maintenance)</option>
                    </select>
                  </div>

                  {/* Accumulated Mileage field */}
                  <div className="space-y-1 bg-pink-50/20 border border-pink-100 p-2.5 rounded-lg">
                    <label className="block font-bold text-pink-800">⏱️ เลขไมล์สะสมล่าสุด (กิโลเมตร)</label>
                    <input 
                      type="number"
                      min="0"
                      value={vehicleForm.mileage !== undefined ? vehicleForm.mileage : 0}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, mileage: Number(e.target.value) })}
                      placeholder="เช่น 124500"
                      className="w-full bg-white text-slate-900 py-2 px-3 border border-pink-200 rounded outline-none focus:ring-1 focus:ring-pink-500 font-bold font-mono text-sm leading-normal"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">เลขไมล์สะสมของรถคันนี้ ระบบจะอัปเดตอัตโนมัติเมื่อพนักงานขับรถกด "บันทึกเสร็จงาน 🏁" และป้อนระยะไมล์สิ้นสุดการเดินทาง</p>
                  </div>

                </div>

                <div className="pt-2 border-t border-pink-100 flex items-center justify-end gap-2.5 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setVehicleForm(null);
                      setVehicleErrors({});
                    }}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 rounded font-bold transition cursor-pointer font-sans"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded font-bold transition flex items-center gap-1 border border-pink-550 shadow-sm hover:shadow cursor-pointer font-sans"
                  >
                    <Save size={14} />
                    บันทึกข้อมูลรถยนต์
                  </button>
                </div>
              </form>
            ) : (
              <div className="bg-pink-50/10 border border-pink-100 rounded-lg p-6 text-center space-y-3 shadow-none">
                <Truck className="text-pink-400 mx-auto animate-pulse" size={42} />
                <h4 className="text-sm font-bold text-slate-900 font-sans">แก้ไขหรือเพิ่มส่วนคลัง</h4>
                <p className="text-xs text-slate-500 leading-relaxed md:max-w-[250px] mx-auto font-sans">
                  คลิกที่ปุ่มเพิ่มด้านบน หรือกดปุ่มแก้ไขยานพาหนะแต่ละคัน เพื่อกรอกฟอร์มหรือปรับเปลี่ยนทรัพยากร
                </p>
              </div>
            )}
          </div>

        </div>
      )}

      {activeSubTab === 'drivers' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* List of Drivers */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-pink-100 rounded-lg p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-950 flex items-center gap-2">
                  <Users size={18} className="text-pink-600" />
                  รายชื่อบุคลากรขับรถยนต์ (สนง.พมจ.ตรัง)
                </h3>
                <button
                  onClick={() => {
                    setVehicleForm(null);
                    setDriverForm({
                      name: '',
                      phone: '',
                      status: 'available'
                    });
                  }}
                  className="px-3 py-1.5 bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold rounded-lg transition flex items-center gap-1 shadow-sm border border-pink-500 cursor-pointer"
                >
                  <UserPlus size={14} />
                  เพิ่มคนขับใหม่
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {drivers.map((d) => {
                  const statusInfo = getDriverStatusLabel(d.status);
                  return (
                    <div 
                      key={d.id} 
                      className="border border-pink-100 hover:border-pink-200 bg-white rounded-lg p-4 transition flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 font-extrabold flex items-center justify-center rounded-lg text-sm ${d.avatarColor || 'bg-slate-600 text-white shadow-sm'}`}>
                              {d.name.substring(3, 4) || d.name[0]} {/* Character after นาย */}
                            </div>
                            <div className="space-y-0.5 font-sans">
                              <h4 className="font-extrabold text-slate-900 text-sm">{d.name}</h4>
                              <p className="text-xs text-slate-500 font-mono flex items-center gap-1">
                                <Phone size={11} className="text-pink-400" />
                                {d.phone}
                              </p>
                            </div>
                          </div>
                          
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 border rounded-full whitespace-nowrap ${statusInfo.css}`}>
                            {statusInfo.label.split(' ')[0]}
                          </span>
                        </div>
                        
                        <div className="mt-3 text-[11px] text-slate-500 bg-pink-50/10 border border-pink-100 rounded px-2.5 py-1">
                          สถานะละเอียด: <span className="font-semibold text-slate-700">{statusInfo.label}</span>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-105 flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setVehicleForm(null);
                            setDriverForm(d);
                          }}
                          className="p-1.5 hover:bg-pink-50/50 border border-slate-200 text-slate-650 hover:text-pink-700 rounded transition flex items-center gap-1 text-xs font-bold cursor-pointer"
                          title="แก้ไขรายละเอียดคนขับ"
                        >
                          <Edit2 size={13} />
                          แก้ไข
                        </button>
                        <button
                          onClick={() => {
                            setConfirmState({
                              isOpen: true,
                              title: 'ยืนยันลบรายชื่อพนักงานขับรถ',
                              message: `คุณต้องการยืนยันการลบรายชื่อพนักงานขับคน "${d.name}" ออกจากระบบจารึกสิทธิ์เดินทางหรือไม่?`,
                              confirmText: 'ลบรายชื่อคนขับ',
                              type: 'danger',
                              onConfirm: () => {
                                onDeleteDriver(d.id);
                                if (driverForm?.id === d.id) setDriverForm(null);
                                closeConfirm();
                              }
                            });
                          }}
                          className="p-1.5 hover:bg-red-50 border border-red-100 text-red-650 hover:text-red-800 rounded transition flex items-center gap-1 text-xs font-bold cursor-pointer"
                          title="ลบรายชื่อออกจากทะเบียนคลัง"
                        >
                          <Trash2 size={13} />
                          ลบ
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Form Side panel */}
          <div className="lg:col-span-1">
            {driverForm ? (
              <form onSubmit={handleDriverSubmit} className="bg-pink-50/55 text-slate-850 border border-pink-100 rounded-lg p-5 shadow-sm space-y-4 animate-fade-in">
                <div className="flex items-center justify-between border-b border-pink-100 pb-3">
                  <h3 className="text-sm font-bold text-pink-700 flex items-center gap-1.5 font-sans">
                    <PlusCircle size={16} />
                    {driverForm.id ? 'แก้ไขข้อมูลพนักงานขับรถ' : 'เพิ่มพนักงานขับรถคนใหม่'}
                  </h3>
                  <button 
                    type="button" 
                    onClick={() => {
                      setDriverForm(null);
                      setDriverErrors({});
                    }}
                    className="p-1 hover:bg-pink-100/50 rounded text-slate-400 hover:text-pink-750 transition cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-3.5 text-xs text-slate-700">
                  
                  {/* Name Input */}
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-800">ชื่อพนักงานขับรถยนต์</label>
                    <input 
                      type="text"
                      value={driverForm.name || ''}
                      onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })}
                      placeholder="เช่น นายประสิทธิ์ ปลอดภัย"
                      className="w-full bg-white text-slate-900 py-2 px-3 border border-pink-200 rounded outline-none focus:ring-1 focus:ring-pink-500 font-medium"
                    />
                    {driverErrors.name && (
                      <p className="text-[10px] text-red-500 font-semibold">{driverErrors.name}</p>
                    )}
                  </div>

                  {/* Phone */}
                  <div className="space-y-1">
                    <label className="block font-sans font-bold text-slate-800">เบอร์โทรศัพท์ (สำรองสายด่วน)</label>
                    <input 
                      type="text"
                      value={driverForm.phone || ''}
                      onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })}
                      placeholder="0xx-xxx-xxxx"
                      className="w-full bg-white text-slate-900 py-2 px-3 border border-pink-200 rounded outline-none focus:ring-1 focus:ring-pink-500 font-mono font-bold"
                    />
                    <span className="text-[9px] text-slate-400">รูปแบบที่ต้องใช้: 081-123-4567 หรือ 075-218-123</span>
                    {driverErrors.phone && (
                      <p className="text-[10px] text-red-505 font-semibold block">{driverErrors.phone}</p>
                    )}
                  </div>

                  {/* Current Status */}
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-800">สถานะงานปฏิบัติภารกิจวันนี้</label>
                    <select
                      value={driverForm.status || 'available'}
                      onChange={(e) => setDriverForm({ ...driverForm, status: e.target.value as any })}
                      className="w-full bg-white text-slate-900 py-2 px-2.5 border border-pink-200 rounded outline-none focus:ring-1 focus:ring-pink-500 font-medium"
                    >
                      <option value="available">สแตนบายว่าง / พร้อมออกรถ (Available)</option>
                      <option value="busy">ติดภารกิจขับรถให้กลุ่มงานอื่น (Busy)</option>
                      <option value="off">ลาพักผ่อน / ลากิจ / นอกเวลางาน (Off)</option>
                    </select>
                  </div>

                </div>

                <div className="pt-2 border-t border-pink-100 flex items-center justify-end gap-2.5 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setDriverForm(null);
                      setDriverErrors({});
                    }}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-650 hover:text-slate-850 rounded font-bold transition cursor-pointer font-sans"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded font-bold transition flex items-center gap-1 border border-pink-550 shadow-sm hover:shadow cursor-pointer font-sans"
                  >
                    <Save size={14} />
                    บันทึกข้อมูลบุคลากร
                  </button>
                </div>
              </form>
            ) : (
              <div className="bg-pink-50/10 border border-pink-100 rounded-lg p-6 text-center space-y-3 shadow-none">
                <Users className="text-pink-400 mx-auto animate-pulse" size={42} />
                <h4 className="text-sm font-bold text-slate-900 font-sans">แก้ไขหรือเพิ่มพลขับ</h4>
                <p className="text-xs text-slate-500 leading-relaxed md:max-w-[250px] mx-auto font-sans">
                  คลิกที่ปุ่มเพิ่มด้านบน หรือกดปุ่มแก้ไขพนักงานเพื่อกรอกแบบฟอร์มตรวจสอบความชำนาญการ
                </p>
              </div>
            )}
          </div>

        </div>
      )}

      {activeSubTab === 'approvers' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* List of Approvers */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-pink-100 rounded-lg p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-950 flex items-center gap-2">
                  <Award size={18} className="text-pink-600" />
                  รายชื่อผู้อนุมัติโครงการ
                </h3>
                <button
                  onClick={() => {
                    resetAllForms();
                    setApproverForm({
                      name: '',
                      position: ''
                    });
                  }}
                  className="px-3 py-1.5 bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold rounded-lg transition flex items-center gap-1 shadow-sm border border-pink-500 cursor-pointer"
                >
                  <Plus size={14} />
                  เพิ่มผู้อนุมัติใหม่
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {approvers.map((appr) => (
                  <div 
                    key={appr.id} 
                    className="border border-pink-100 hover:border-pink-200 bg-white rounded-lg p-4 transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-sans font-bold text-xs text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                          ผู้อนุมัติเอกสาร
                        </span>
                      </div>
                      <h4 className="font-extrabold text-slate-900 text-sm mt-2 font-sans">{appr.name}</h4>
                      <p className="text-xs text-slate-500 mt-1 leading-normal font-medium">{appr.position}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          resetAllForms();
                          setApproverForm(appr);
                        }}
                        className="p-1.5 hover:bg-pink-50/50 border border-slate-200 text-slate-650 hover:text-pink-750 rounded transition flex items-center gap-1 text-xs font-bold cursor-pointer"
                        title="แก้ไขข้อมูลผู้อนุมัติ"
                      >
                        <Edit2 size={13} />
                        แก้ไข
                      </button>
                      <button
                        onClick={() => {
                          setConfirmState({
                            isOpen: true,
                            title: 'ยืนยันลบผู้อนุมัติเอกสาร',
                            message: `คุณต้องการลบผู้อนุมัติ "${appr.name}" ออกจากระบบหรือไม่?\n\nสำหรับเอกสารเดิมที่เคยอนุมัติอิงลายเซ็นต์นี้ไว้แล้ว ประวัติลายเซ็นประทับจะคงอยู่ครบถ้วน`,
                            confirmText: 'ลบผู้อนุมัติ',
                            type: 'danger',
                            onConfirm: () => {
                              onDeleteApprover(appr.id);
                              if (approverForm?.id === appr.id) setApproverForm(null);
                              closeConfirm();
                            }
                          });
                        }}
                        className="p-1.5 hover:bg-red-50 border border-red-100 text-red-650 hover:text-red-800 rounded transition flex items-center gap-1 text-xs font-bold cursor-pointer"
                        title="ลบผู้อนุมัติ"
                      >
                        <Trash2 size={13} />
                        ลบ
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Form Side panel */}
          <div className="lg:col-span-1">
            {approverForm ? (
              <form onSubmit={handleApproverSubmit} className="bg-pink-50/55 text-slate-850 border border-pink-100 rounded-lg p-5 shadow-sm space-y-4 animate-fade-in">
                <div className="flex items-center justify-between border-b border-pink-100 pb-3">
                  <h3 className="text-sm font-bold text-pink-700 flex items-center gap-1.5 font-sans">
                    <PlusCircle size={16} />
                    {approverForm.id ? 'แก้ไขข้อมูลผู้อนุมัติ' : 'เพิ่มผู้อนุมัติใหม่'}
                  </h3>
                  <button 
                    type="button" 
                    onClick={() => {
                      setApproverForm(null);
                      setApproverErrors({});
                    }}
                    className="p-1 hover:bg-pink-100/50 rounded text-slate-400 hover:text-pink-700 transition cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-3.5 text-xs text-slate-700">
                  
                  {/* Name Input */}
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-800">ชื่อ-นามสกุล ผู้อนุมัติ</label>
                    <input 
                      type="text"
                      value={approverForm.name || ''}
                      onChange={(e) => setApproverForm({ ...approverForm, name: e.target.value })}
                      placeholder="เช่น นายสุมิตร นิรันดร์"
                      className="w-full bg-white text-slate-900 py-2 px-3 border border-pink-200 rounded outline-none focus:ring-1 focus:ring-pink-500 font-medium"
                    />
                    {approverErrors.name && (
                      <p className="text-[10px] text-red-500 font-semibold">{approverErrors.name}</p>
                    )}
                  </div>

                  {/* Position Input */}
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-800">ตำแหน่งทางราชการ</label>
                    <input 
                      type="text"
                      value={approverForm.position || ''}
                      onChange={(e) => setApproverForm({ ...approverForm, position: e.target.value })}
                      placeholder="เช่น หัวหน้ากลุ่มอำนวยการ พมจ.ตรัง"
                      className="w-full bg-white text-slate-900 py-2 px-3 border border-pink-200 rounded outline-none focus:ring-1 focus:ring-pink-500 font-medium"
                    />
                    {approverErrors.position && (
                      <p className="text-[10px] text-red-500 font-semibold">{approverErrors.position}</p>
                    )}
                  </div>

                </div>

                <div className="pt-2 border-t border-pink-100 flex items-center justify-end gap-2.5 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setApproverForm(null);
                      setApproverErrors({});
                    }}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-650 hover:text-slate-850 rounded font-bold transition cursor-pointer font-sans"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded font-bold transition flex items-center gap-1 border border-pink-550 shadow-sm hover:shadow cursor-pointer font-sans"
                  >
                    <Save size={14} />
                    บันทึกผู้อนุมัติ
                  </button>
                </div>
              </form>
            ) : (
              <div className="bg-pink-50/10 border border-pink-100 rounded-lg p-6 text-center space-y-3 shadow-none">
                <Award className="text-pink-400 mx-auto animate-pulse" size={42} />
                <h4 className="text-sm font-bold text-slate-900 font-sans">จัดการรายชื่อผู้อนุมัติโครงการ</h4>
                <p className="text-xs text-slate-500 leading-relaxed md:max-w-[250px] mx-auto font-sans">
                  คุณสามารถเพิ่มหรือแก้ไขข้อมูลผู้อนุมัติ เพื่อสลับสิทธิ์การเซ็นอนุมัติผ่านใบจองได้อย่างยืดหยุ่นทางอิเล็กทรอนิกส์
                </p>
              </div>
            )}
          </div>

        </div>
      )}

      {activeSubTab === 'caretakers' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* List of Caretakers */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-pink-100 rounded-lg p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-950 flex items-center gap-2">
                  <FileSignature size={18} className="text-pink-600" />
                  รายชื่อเจ้าหน้าที่จัดดูแลยานพาหนะ (นายทะเบียนคุมรถ)
                </h3>
                <button
                  onClick={() => {
                    resetAllForms();
                    setCaretakerForm({
                      name: '',
                      position: ''
                    });
                  }}
                  className="px-3 py-1.5 bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold rounded-lg transition flex items-center gap-1 shadow-sm border border-pink-500 cursor-pointer"
                >
                  <Plus size={14} />
                  เพิ่มเจ้าหน้าที่ใหม่
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {caretakers.map((caretaker) => (
                  <div 
                    key={caretaker.id} 
                    className="border border-pink-100 hover:border-pink-200 bg-white rounded-lg p-4 transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-sans font-bold text-xs text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                          เจ้าหน้าที่ดูแลรถ
                        </span>
                      </div>
                      <h4 className="font-extrabold text-slate-900 text-sm mt-2 font-sans">{caretaker.name}</h4>
                      <p className="text-xs text-slate-500 mt-1 leading-normal font-medium">{caretaker.position}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          resetAllForms();
                          setCaretakerForm(caretaker);
                        }}
                        className="p-1.5 hover:bg-pink-50/50 border border-slate-200 text-slate-655 hover:text-pink-750 rounded transition flex items-center gap-1 text-xs font-bold cursor-pointer"
                        title="แก้ไขข้อมูลเจ้าหน้าที่"
                      >
                        <Edit2 size={13} />
                        แก้ไข
                      </button>
                      <button
                        onClick={() => {
                          setConfirmState({
                            isOpen: true,
                            title: 'ยืนยันลบเจ้าหน้าที่ดูแลยานพาหนะ',
                            message: `คุณต้องการลบเจ้าหน้าที่จัดดูแลยานพาหนะ "${caretaker.name}" ออกจากระบบพมจ. ใช่หรือไม่?`,
                            confirmText: 'ลบเจ้าหน้าที่',
                            type: 'danger',
                            onConfirm: () => {
                              onDeleteCaretaker(caretaker.id);
                              if (caretakerForm?.id === caretaker.id) setCaretakerForm(null);
                              closeConfirm();
                            }
                          });
                        }}
                        className="p-1.5 hover:bg-red-50 border border-red-100 text-red-655 hover:text-red-800 rounded transition flex items-center gap-1 text-xs font-bold cursor-pointer"
                        title="ลบเจ้าหน้าที่"
                      >
                        <Trash2 size={13} />
                        ลบ
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Form Side panel */}
          <div className="lg:col-span-1">
            {caretakerForm ? (
              <form onSubmit={handleCaretakerSubmit} className="bg-pink-50/55 text-slate-850 border border-pink-100 rounded-lg p-5 shadow-sm space-y-4 animate-fade-in">
                <div className="flex items-center justify-between border-b border-pink-100 pb-3">
                  <h3 className="text-sm font-bold text-pink-700 flex items-center gap-1.5 font-sans">
                    <PlusCircle size={16} />
                    {caretakerForm.id ? 'แก้ไขข้อมูลเจ้าหน้าที่' : 'เพิ่มเจ้าหน้าที่ใหม่'}
                  </h3>
                  <button 
                    type="button" 
                    onClick={() => {
                      setCaretakerForm(null);
                      setCaretakerErrors({});
                    }}
                    className="p-1 hover:bg-pink-100/50 rounded text-slate-400 hover:text-pink-700 transition cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-3.5 text-xs text-slate-700">
                  
                  {/* Name Input */}
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-800">ชื่อ-นามสกุล เจ้าหน้าที่</label>
                    <input 
                      type="text"
                      value={caretakerForm.name || ''}
                      onChange={(e) => setCaretakerForm({ ...caretakerForm, name: e.target.value })}
                      placeholder="เช่น นายเกรียงไกร ชนะสิทธิ์"
                      className="w-full bg-white text-slate-900 py-2 px-3 border border-pink-200 rounded outline-none focus:ring-1 focus:ring-pink-550 font-medium"
                    />
                    {caretakerErrors.name && (
                      <p className="text-[10px] text-red-500 font-semibold">{caretakerErrors.name}</p>
                    )}
                  </div>

                  {/* Position Input */}
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-800">ตำแหน่งงานราชการ</label>
                    <input 
                      type="text"
                      value={caretakerForm.position || ''}
                      onChange={(e) => setCaretakerForm({ ...caretakerForm, position: e.target.value })}
                      placeholder="เช่น เจ้าพนักงานธุรการปฏิบัติงาน พมจ.ตรัง"
                      className="w-full bg-white text-slate-900 py-2 px-3 border border-pink-200 rounded outline-none focus:ring-1 focus:ring-pink-550 font-medium"
                    />
                    {caretakerErrors.position && (
                      <p className="text-[10px] text-red-500 font-semibold">{caretakerErrors.position}</p>
                    )}
                  </div>

                </div>

                <div className="pt-2 border-t border-pink-100 flex items-center justify-end gap-2.5 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setCaretakerForm(null);
                      setCaretakerErrors({});
                    }}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-650 hover:text-slate-850 rounded font-bold transition cursor-pointer font-sans"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded font-bold transition flex items-center gap-1 border border-pink-550 shadow-sm hover:shadow cursor-pointer font-sans"
                  >
                    <Save size={14} />
                    บันทึกเจ้าหน้าที่
                  </button>
                </div>
              </form>
            ) : (
              <div className="bg-pink-50/10 border border-pink-100 rounded-lg p-6 text-center space-y-3 shadow-none">
                <FileSignature className="text-pink-400 mx-auto animate-pulse" size={42} />
                <h4 className="text-sm font-bold text-slate-900 font-sans">จัดการเจ้าหน้าที่จัดดูแลยานพาหนะ</h4>
                <p className="text-xs text-slate-500 leading-relaxed md:max-w-[250px] mx-auto font-sans">
                  คุณสามารถเพิ่มหรือสลับหน้าที่ นายทะเบียนผู้จัดดูแลรถ คอยตรวจสอบคุณภาพรถและคนขับได้ทันที
                </p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Information footer instruction */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 flex items-start gap-3 shadow-sm font-sans mb-4">
        <ShieldAlert className="text-amber-600 shrink-0 mt-0.5" size={18} />
        <div className="space-y-0.5">
          <h4 className="font-bold text-xs">คำชี้แจงสิทธิ์ความปลอดภัย (Data Integrity Security)</h4>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            การลบหรือแก้ไขข้อมูลรถยนต์/คนขับขี่ข้ามเวลา จะถูกฝากและซิงค์ข้อมูลลงใน Web LocalStorage อัตโนมัติ หากลบข้อมูลรถหรือคนขับที่มีเลขจองสิทธิ์เชื่อมโยงอยู่ จะไม่มีการย้อนกลับไปทำลายประวัติในใบขอใช้รถยนต์ใบเดิม 
            เพื่อป้องกันข้อมูลประวัติราชการสูญหาย โดยแผ่นป้ายทะเบียนในใบขอใช้นั้นจะยังถูกจารึกตามข้อมูลเดิมใน ณ วันส่งเอกสาร
          </p>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        type={confirmState.type}
        onConfirm={confirmState.onConfirm}
        onCancel={closeConfirm}
      />

    </div>
  );
}
