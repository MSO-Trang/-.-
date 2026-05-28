import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Save, 
  X, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  Users, 
  MapPin, 
  User, 
  ClipboardList, 
  Award,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  Car,
  Info,
  Phone,
  Check,
  Briefcase,
  Layers,
  Settings,
  ShieldCheck,
  FileText,
  Clock,
  ExternalLink
} from 'lucide-react';
import { Booking, Vehicle, Driver, BookingStatus, Approver, Caretaker } from '../types';
import { DEPARTMENTS, generateNextPermitNumber } from '../data/initialData';
import { findConflicts, formatThaiDate, formatForInput, translateVehicleType } from '../utils/bookingUtils';

interface BookingFormProps {
  bookingToEdit?: Booking;
  bookings: Booking[];
  vehicles: Vehicle[];
  drivers: Driver[];
  approvers: Approver[];
  caretakers: Caretaker[];
  onSave: (booking: Booking) => void;
  onCancel: () => void;
  isAdmin?: boolean;
}

export default function BookingForm({
  bookingToEdit,
  bookings,
  vehicles,
  drivers,
  approvers,
  caretakers,
  onSave,
  onCancel,
  isAdmin = false
}: BookingFormProps) {
  
  const isEditMode = !!bookingToEdit;
  const formRef = useRef<HTMLDivElement>(null);

  const scrollToTop = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Form states
  const [formData, setFormData] = useState({
    permitNumber: '',
    requesterName: '',
    requesterPosition: '',
    department: DEPARTMENTS[0],
    destination: '',
    purpose: '',
    passengersCount: 1,
    startDate: '',
    endDate: '',
    vehicleId: '',
    driverId: '',
    status: 'pending' as BookingStatus,
    approvedBy: '',
    approvedByPosition: '',
    caretakerName: '',
    caretakerPosition: '',
    remarks: '',
    startMileage: '',
    endMileage: ''
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  
  // Custom states for wizard / presentation
  const [formMode, setFormMode] = useState<'stepped' | 'all'>('stepped');
  const [currentStep, setCurrentStep] = useState(1);

  // Helper to find the last recorded mileage of a vehicle
  const getLastVehicleMileage = (vId: string): number => {
    const targetVeh = vehicles.find(v => v.id === vId);
    const baseMileage = targetVeh?.mileage || 0;
    
    if (!bookings || bookings.length === 0) return baseMileage;
    const priorBookings = bookings.filter(
      b => b.vehicleId === vId && b.id !== bookingToEdit?.id && b.status !== 'cancelled' && b.status !== 'rejected'
    );
    if (priorBookings.length === 0) return baseMileage;
    
    // Sort by end date descending
    const sorted = [...priorBookings].sort(
      (a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
    );
    
    for (const b of sorted) {
      if (b.endMileage !== undefined && b.endMileage !== null && b.endMileage > baseMileage) {
        return b.endMileage;
      }
      if (b.startMileage !== undefined && b.startMileage !== null && b.startMileage > baseMileage) {
        return b.startMileage;
      }
    }
    
    // Fallback to max numerical mileage values
    let maxMil = baseMileage;
    for (const b of priorBookings) {
      if (b.endMileage && b.endMileage > maxMil) maxMil = b.endMileage;
      if (b.startMileage && b.startMileage > maxMil) maxMil = b.startMileage;
    }
    return maxMil;
  };

  // Auto-generate run-number or populate for editing
  useEffect(() => {
    if (isEditMode && bookingToEdit) {
      setFormData({
        permitNumber: bookingToEdit.permitNumber,
        requesterName: bookingToEdit.requesterName,
        requesterPosition: bookingToEdit.requesterPosition,
        department: bookingToEdit.department,
        destination: bookingToEdit.destination,
        purpose: bookingToEdit.purpose,
        passengersCount: bookingToEdit.passengersCount,
        startDate: formatForInput(bookingToEdit.startDate),
        endDate: formatForInput(bookingToEdit.endDate),
        vehicleId: bookingToEdit.vehicleId,
        driverId: bookingToEdit.driverId,
        status: bookingToEdit.status,
        approvedBy: bookingToEdit.approvedBy,
        approvedByPosition: bookingToEdit.approvedByPosition,
        caretakerName: bookingToEdit.caretakerName || (caretakers[0]?.name || ''),
        caretakerPosition: bookingToEdit.caretakerPosition || (caretakers[0]?.position || ''),
        remarks: bookingToEdit.remarks || '',
        startMileage: bookingToEdit.startMileage !== undefined ? String(bookingToEdit.startMileage) : String(getLastVehicleMileage(bookingToEdit.vehicleId)),
        endMileage: bookingToEdit.endMileage !== undefined ? String(bookingToEdit.endMileage) : ''
      });
    } else {
      // Create mode: pre-fill dates with today & tomorrow, and auto-run permit number
      const nextNum = generateNextPermitNumber(bookings);
      const now = new Date();
      const defaultStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 30);
      const defaultEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 16, 30);
      
      const defaultVehicleId = vehicles[0]?.id || '';
      const autoStartMileage = defaultVehicleId ? getLastVehicleMileage(defaultVehicleId) : 0;

      setFormData(prev => ({
        ...prev,
        permitNumber: nextNum,
        startDate: formatForInput(defaultStart.toISOString()),
        endDate: formatForInput(defaultEnd.toISOString()),
        vehicleId: defaultVehicleId,
        driverId: drivers[0]?.id || '',
        approvedBy: approvers[0]?.name || '',
        approvedByPosition: approvers[0]?.position || '',
        caretakerName: caretakers[0]?.name || '',
        caretakerPosition: caretakers[0]?.position || '',
        startMileage: autoStartMileage > 0 ? String(autoStartMileage) : '0',
        endMileage: ''
      }));
    }
  }, [bookingToEdit, bookings, isEditMode, vehicles, drivers, approvers, caretakers]);

  // Live validation & overlap detection
  const vehicleConflicts = useMemo(() => {
    if (!formData.vehicleId || !formData.startDate || !formData.endDate) return [];
    return findConflicts(
      bookings,
      formData.vehicleId,
      'vehicle',
      formData.startDate,
      formData.endDate,
      bookingToEdit?.id
    );
  }, [formData.vehicleId, formData.startDate, formData.endDate, bookings, bookingToEdit]);

  const driverConflicts = useMemo(() => {
    if (!formData.driverId || formData.driverId === 'self-drive' || !formData.startDate || !formData.endDate) return [];
    return findConflicts(
      bookings,
      formData.driverId,
      'driver',
      formData.startDate,
      formData.endDate,
      bookingToEdit?.id
    );
  }, [formData.driverId, formData.startDate, formData.endDate, bookings, bookingToEdit]);

  const selectedVehicleObj = useMemo(() => {
    return vehicles.find(v => v.id === formData.vehicleId);
  }, [formData.vehicleId, vehicles]);

  const selectedDriverObj = useMemo(() => {
    if (formData.driverId === 'self-drive') return { name: '🚙 ขับรถยนต์ปฏิบัติหน้าที่ด้วยตัวเอง' };
    return drivers.find(d => d.id === formData.driverId);
  }, [formData.driverId, drivers]);

  // Handle Input Changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Auto-update approver position if changer is approver name
    if (name === 'approvedBy') {
      const selectedApprover = approvers.find(a => a.name === value);
      setFormData(prev => ({
        ...prev,
        approvedBy: value,
        approvedByPosition: selectedApprover?.position || ''
      }));
      return;
    }

    // Auto-update caretaker position if changer is caretaker name
    if (name === 'caretakerName') {
      const selectedCaretaker = caretakers.find(c => c.name === value);
      setFormData(prev => ({
        ...prev,
        caretakerName: value,
        caretakerPosition: selectedCaretaker?.position || ''
      }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: name === 'passengersCount' ? parseInt(value, 10) || 1 : value
    }));

    // Clear specific error on write
    if (errors[name]) {
      setErrors(prev => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (step === 1) {
      if (!formData.startDate) newErrors.startDate = 'กรุณาระบุวัน-เวลาไป';
      if (!formData.endDate) newErrors.endDate = 'กรุณาระบุวัน-เวลากลับ';
      if (formData.startDate && formData.endDate) {
        if (new Date(formData.startDate).getTime() >= new Date(formData.endDate).getTime()) {
          newErrors.endDate = 'วันเวลากลับต้องอยู่หลังวันเวลาเดินทางไป';
        }
      }
      if (!formData.destination.trim()) newErrors.destination = 'กรุณาระบุสถานที่ไปราชการ';
      if (!formData.purpose.trim()) newErrors.purpose = 'กรุณาระบุวัตถุประสงค์การเดินทาง';
    }

    else if (step === 2) {
      if (!formData.requesterName.trim()) newErrors.requesterName = 'กรุณาระบุชื่อผู้ขอใช้รถ';
      if (!formData.requesterPosition.trim()) newErrors.requesterPosition = 'กรุณาระบุตำแหน่งผู้ขอ';
      if (selectedVehicleObj && formData.passengersCount > selectedVehicleObj.capacity) {
        newErrors.passengersCount = `จำนวนผู้โดยสาร (${formData.passengersCount} คน) เกินขีดความสามารถของรถ (${selectedVehicleObj.capacity} ที่นั่ง)`;
      }
    }

    else if (step === 3) {
      if (!formData.vehicleId) newErrors.vehicleId = 'กรุณาเลือกยานพาหนะราชการ';
      if (!formData.driverId) newErrors.driverId = 'กรุณาเลือกพนักงานขับรถหรือเลือกผู้ขับขี่เอง';
    }

    else if (step === 4) {
      if (!formData.permitNumber.trim()) newErrors.permitNumber = 'กรุณาระบุเลขที่ใบขออนุญาต';
    }

    // Apply errors for this step
    setErrors(prev => {
      const copy = { ...prev };
      // Clear current step fields first
      if (step === 1) {
        delete copy.startDate;
        delete copy.endDate;
        delete copy.destination;
        delete copy.purpose;
      } else if (step === 2) {
        delete copy.requesterName;
        delete copy.requesterPosition;
        delete copy.passengersCount;
      } else if (step === 3) {
        delete copy.vehicleId;
        delete copy.driverId;
      } else if (step === 4) {
        delete copy.permitNumber;
      }
      return { ...copy, ...newErrors };
    });

    return Object.keys(newErrors).length === 0;
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.permitNumber.trim()) newErrors.permitNumber = 'กรุณาระบุเลขที่ใบขออนุญาต';
    if (!formData.requesterName.trim()) newErrors.requesterName = 'กรุณาระบุชื่อผู้ขอใช้รถ';
    if (!formData.requesterPosition.trim()) newErrors.requesterPosition = 'กรุณาระบุตำแหน่งผู้ขอ';
    if (!formData.destination.trim()) newErrors.destination = 'กรุณาระบุสถานที่ไปราชการ';
    if (!formData.purpose.trim()) newErrors.purpose = 'กรุณาระบุวัตถุประสงค์การเดินทาง';
    if (!formData.startDate) newErrors.startDate = 'กรุณาระบุวัน-เวลาไป';
    if (!formData.endDate) newErrors.endDate = 'กรุณาระบุวัน-เวลากลับ';
    
    if (formData.startDate && formData.endDate) {
      if (new Date(formData.startDate).getTime() >= new Date(formData.endDate).getTime()) {
        newErrors.endDate = 'วันเวลากลับต้องอยู่หลังวันเวลาเดินทางไป';
      }
    }

    if (!formData.vehicleId) newErrors.vehicleId = 'กรุณาเลือกยานพาหนะ';
    if (!formData.driverId) newErrors.driverId = 'กรุณาเลือกพนักงานขับรถ';
    
    // Validate passengers capacity
    if (selectedVehicleObj && formData.passengersCount > selectedVehicleObj.capacity) {
      newErrors.passengersCount = `จำนวนผู้โดยสาร (${formData.passengersCount} คน) เกินขีดความสามารถของรถ (${selectedVehicleObj.capacity} ที่นั่ง)`;
    }

    // Validate mileage
    if (formData.startMileage && formData.endMileage) {
      const startVal = parseInt(formData.startMileage, 10);
      const endVal = parseInt(formData.endMileage, 10);
      if (!isNaN(startVal) && !isNaN(endVal) && endVal < startVal) {
        newErrors.endMileage = 'เลขไมล์สิ้นสุดสะสมนับเมื่อเสร็จสิ้นภารกิจ ต้องห้ามน้อยกว่าเลขไมล์เริ่มต้นเดินทาง';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      // Find the first error and switch to its step if in stepped mode
      const errorKeys = Object.keys(errors);
      if (errorKeys.length > 0) {
        const firstErrorKey = errorKeys[0];
        
        if (formMode === 'stepped') {
          if (['startDate', 'endDate', 'destination', 'purpose'].includes(firstErrorKey)) {
            setCurrentStep(1);
          } else if (['requesterName', 'requesterPosition', 'passengersCount'].includes(firstErrorKey)) {
            setCurrentStep(2);
          } else if (['vehicleId', 'driverId'].includes(firstErrorKey)) {
            setCurrentStep(3);
          } else {
            setCurrentStep(4);
          }
        }
        
        setTimeout(() => {
          const el = document.getElementsByName(firstErrorKey)[0];
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
      }
      return;
    }

    const payload: Booking = {
      id: isEditMode && bookingToEdit ? bookingToEdit.id : `B-${Date.now()}`,
      permitNumber: formData.permitNumber,
      requesterName: formData.requesterName,
      requesterPosition: formData.requesterPosition,
      department: formData.department,
      destination: formData.destination,
      purpose: formData.purpose,
      passengersCount: formData.passengersCount,
      startDate: new Date(formData.startDate).toISOString(),
      endDate: new Date(formData.endDate).toISOString(),
      vehicleId: formData.vehicleId,
      driverId: formData.driverId,
      status: formData.status,
      approvedBy: formData.approvedBy,
      approvedByPosition: formData.approvedByPosition,
      caretakerName: formData.caretakerName,
      caretakerPosition: formData.caretakerPosition,
      remarks: formData.remarks,
      startMileage: formData.startMileage ? parseInt(formData.startMileage, 10) : undefined,
      endMileage: formData.endMileage ? parseInt(formData.endMileage, 10) : undefined,
      createdAt: isEditMode && bookingToEdit ? bookingToEdit.createdAt : new Date().toISOString()
    };

    onSave(payload);
  };

  const steps = [
    { number: 1, title: 'วันเวลา & แผนเดินทาง', icon: Calendar, desc: 'กำหนดและสถานที่ปลายทาง' },
    { number: 2, title: 'ผู้ขออนุมัติ & คณะเดินทาง', icon: User, desc: 'ระบุผู้ใช้งานและคณะเดินทาง' },
    { number: 3, title: 'เลือกพาหนะ & พลขับ', icon: Car, desc: 'จับคู่รถยนต์ราชการและลบลานชนทับ' },
    { number: 4, title: 'ลงนามผู้ตรวจงาน & บันทึก', icon: ShieldCheck, desc: 'ผู้อนุมัติเอกสารของจังหวัด' }
  ];

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(steps.length, prev + 1));
      setTimeout(scrollToTop, 50);
    }
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
    setTimeout(scrollToTop, 50);
  };

  const handleStepClick = (stepNum: number) => {
    // Jump freely but run step valid check
    if (stepNum > currentStep) {
      // Validate step before letting them jump far ahead
      if (!validateStep(currentStep)) return;
    }
    setCurrentStep(stepNum);
    setTimeout(scrollToTop, 50);
  };

  return (
    <div 
      ref={formRef}
      className="bg-[#fcfdff] border border-slate-100 rounded-3xl p-4 sm:p-6 md:p-8 shadow-md space-y-8 max-w-5xl mx-auto font-sans" 
      id="booking-form"
    >
      {/* Form Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-rose-100">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-50 rounded-2xl text-[#a22055]">
              <ClipboardList size={26} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                {isEditMode ? 'แก้ไขใบอนุมัติการขอใช้รถ' : 'เขียนใบสำรองขอจองรถราชการ'}
              </h2>
              <p className="text-[#a22055] font-bold text-xs uppercase tracking-wider">
                สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดตรัง (สนง.พมจ.ตรัง)
              </p>
            </div>
          </div>
        </div>

        {/* Presentation Toggle & Action Row */}
        <div className="flex flex-wrap items-center gap-3 sm:self-end lg:self-center">
          {/* Display Mode Segmented Control */}
          <div className="bg-slate-100/80 p-1 rounded-xl flex items-center text-xs font-semibold text-slate-600 shadow-inner">
            <button
              type="button"
              onClick={() => setFormMode('stepped')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                formMode === 'stepped' 
                  ? 'bg-white text-[#a22055] shadow-xs font-bold' 
                  : 'hover:text-slate-900'
              }`}
            >
              📝 เขียนทีละขั้นตอน
            </button>
            <button
              type="button"
              onClick={() => {
                setFormMode('all');
                setTimeout(scrollToTop, 50);
              }}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                formMode === 'all' 
                  ? 'bg-white text-[#a22055] shadow-xs font-bold' 
                  : 'hover:text-slate-900'
              }`}
            >
              📜 เปิดทีเดียวทุกส่วน
            </button>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-1.5 text-xs font-bold border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
          >
            <X size={14} />
            กลับหน้าคลัง
          </button>
        </div>
      </div>

      {/* Dynamic Document Number Tag & Details Summary Banner */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <div>
            <span className="text-xs font-medium text-slate-400 block">หมายเลขการจองเอกสารในระบบ</span>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold font-mono text-slate-700 bg-slate-100/70 border border-slate-200 px-2.5 py-0.5 rounded-lg">
                {formData.permitNumber || 'ยังไม่ออกเลข'}
              </span>
              <p className="text-[10px] text-slate-400 font-medium">รันเลขอัตโนมัติตามมาตรฐานระบบสารบรรณกองคลัง พมจ.ตรัง</p>
            </div>
          </div>
        </div>
        {isEditMode && (
          <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-3 py-1 rounded-full flex items-center gap-1">
            <Clock size={12} />
            โหมดประวัติการแก้ไขใบคำเดิม
          </span>
        )}
      </div>

      {/* Wizard Progress Tabs Dashboard (Only rendered when stepped or as navigation guide) */}
      <div className="w-full">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {steps.map((s) => {
            const Icon = s.icon;
            const isCurrent = currentStep === s.number;
            const isCompleted = currentStep > s.number;
            
            return (
              <button
                key={s.number}
                type="button"
                onClick={() => handleStepClick(s.number)}
                className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                  formMode === 'all'
                    ? 'border-slate-100 bg-white opacity-80 cursor-default'
                    : isCurrent
                      ? 'border-[#a22055] bg-pink-50/10 ring-1 ring-[#a22055] shadow-xs'
                      : isCompleted
                        ? 'border-emerald-100 bg-emerald-50/20 text-slate-600 hover:border-emerald-200'
                        : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                    isCurrent
                      ? 'bg-[#a22055] text-white'
                      : isCompleted
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-100 text-slate-500'
                  }`}>
                    {isCompleted ? <Check size={14} strokeWidth={3} /> : s.number}
                  </div>
                  <Icon size={16} className={isCurrent ? 'text-[#a22055]' : isCompleted ? 'text-emerald-500' : 'text-slate-400'} />
                </div>
                <div className="mt-2">
                  <p className={`text-xs font-extrabold ${isCurrent ? 'text-slate-900 border-b-2 border-[#a22055] pb-0.5 inline-block' : 'text-slate-700'}`}>
                    {s.title}
                  </p>
                  <p className="text-[10px] text-slate-400 leading-tight truncate mt-0.5">{s.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* =======================================
            STEP 1: journey timing and destination 
            ======================================= */}
        {(formMode === 'all' || currentStep === 1) && (
          <div className="bg-white border border-slate-100 rounded-2xl p-5 md:p-6 shadow-xs space-y-6 transition-all" id="step-1-journey">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
              <div className="h-6 w-1 rounded-full bg-[#a22055]" />
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-[#a22055]" />
                <h3 className="text-base font-extrabold text-slate-800">
                  ขั้นตอนที่ 1 : วันเวลาเดินทางปฏิบัติราชการ & ปลายทางหลัก
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Departure */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Clock size={13} className="text-slate-400" />
                  <span>วัน-เวลาเดินทางไปราชการ (Departure Date)</span>
                </label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 border rounded-xl text-sm font-semibold text-slate-700 bg-slate-50/50 ${
                      errors.startDate ? 'border-rose-400 focus:ring-rose-200 focus:border-rose-500' : 'border-slate-200 focus:ring-rose-200 focus:border-[#a22055]'
                    } outline-none focus:ring-2`}
                  />
                  {formData.startDate && (
                    <div className="mt-1.5 bg-[#a22055]/5 border border-[#a22055]/10 rounded-lg p-2 flex items-center gap-1.5 text-[11px] font-extrabold text-[#a22055] font-mono leading-none animate-fade-in shadow-2xs">
                      <span>🕒 ออกเดินทาง:</span>
                      <span>{formatThaiDate(new Date(formData.startDate).toISOString())}</span>
                    </div>
                  )}
                </div>
                {errors.startDate && <p className="text-xs text-rose-500 font-semibold">{errors.startDate}</p>}
                <p className="text-[10px] text-slate-400">ระบุวันและเวลาเริ่มออกเดินทางจากจุดรวมพลแรก</p>
              </div>

              {/* Arrival */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Clock size={13} className="text-slate-400" />
                  <span>วัน-เวลาเดินทางกลับ (Return Date)</span>
                </label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 border rounded-xl text-sm font-semibold text-slate-700 bg-slate-50/50 ${
                      errors.endDate ? 'border-rose-400 focus:ring-rose-200 focus:border-rose-500' : 'border-slate-200 focus:ring-rose-200 focus:border-[#a22055]'
                    } outline-none focus:ring-2`}
                  />
                  {formData.endDate && (
                    <div className="mt-1.5 bg-[#a22055]/5 border border-[#a22055]/10 rounded-lg p-2 flex items-center gap-1.5 text-[11px] font-extrabold text-[#a22055] font-mono leading-none animate-fade-in shadow-2xs">
                      <span>🕒 เดินทางกลับ:</span>
                      <span>{formatThaiDate(new Date(formData.endDate).toISOString())}</span>
                    </div>
                  )}
                </div>
                {errors.endDate && <p className="text-xs text-rose-500 font-semibold">{errors.endDate}</p>}
                <p className="text-[10px] text-slate-400">ระบุวันและเวลาที่รถยนต์ราชการจอดเก็บเสร็จสิ้นภารกิจ</p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Destination */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <MapPin size={14} className="text-slate-400" />
                  <span>สถานที่ไปปฏิบัติราชการปลายทาง</span>
                </label>
                <textarea
                  name="destination"
                  value={formData.destination}
                  onChange={handleChange}
                  rows={2}
                  placeholder="เช่น อบต.ควนธานี ต.ควนธานี อ.กันตัง จ.ตรัง เพื่อลงพื้นที่ตรวจเยี่ยมบ้านผู้ประสบปัญหาเฉียบพลัน"
                  className={`w-full px-4 py-2.5 border rounded-xl text-sm text-slate-700 ${
                    errors.destination ? 'border-rose-400 focus:ring-rose-200 focus:border-rose-400 bg-white' : 'border-slate-200 focus:ring-rose-100 focus:border-[#a22055] bg-slate-50/30'
                  } outline-none focus:ring-2`}
                />
                {errors.destination && <p className="text-xs text-rose-500 font-semibold">{errors.destination}</p>}
                <p className="text-[10px] text-slate-400">โปรดกรอกรายละเอียดตำบลและอำเภอปลายทางในจังหวัดตรัง (หรือจังหวัดเป้าหมาย) เพื่อให้ผู้ขับวางแผนเส้นทางสะดวกรวดเร็วยิ่งขึ้น</p>
              </div>

              {/* Purpose */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <FileText size={14} className="text-slate-400" />
                  <span>วัตถุประสงค์ในการใช้รถยนต์ราชการ (ตามโครงการ/คำเชิญส่งงาน)</span>
                </label>
                <textarea
                  name="purpose"
                  value={formData.purpose}
                  onChange={handleChange}
                  rows={2}
                  placeholder="เช่น พัฒนาส่งเสริมอาชีพผู้พิการและเยี่ยมเยียนผู้สูงอายุในสภาวะยากลำบาก คณะเจ้าหน้าที่ พม. ร่วมสภากาชาด"
                  className={`w-full px-4 py-2.5 border rounded-xl text-sm text-slate-700 ${
                    errors.purpose ? 'border-rose-400 focus:ring-rose-200 focus:border-rose-400 bg-white' : 'border-slate-200 focus:ring-rose-100 focus:border-[#a22055] bg-slate-50/30'
                  } outline-none focus:ring-2`}
                />
                {errors.purpose && <p className="text-xs text-rose-500 font-semibold">{errors.purpose}</p>}
                <p className="text-[10px] text-slate-400">ใส่โครงการจัดงาน คำสั่งจังหวัด หรือภารกิจความจำเป็นเพื่อบันทึกประเมินค่าใช้จ่ายนํ้ามันเบิกงบประมาณถัดไป</p>
              </div>
            </div>
          </div>
        )}

        {/* =======================================
            STEP 2: Requester and passengers info 
            ======================================= */}
        {(formMode === 'all' || currentStep === 2) && (
          <div className="bg-white border border-slate-100 rounded-2xl p-5 md:p-6 shadow-xs space-y-6 transition-all" id="step-2-requester">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
              <div className="h-6 w-1 rounded-full bg-[#a22055]" />
              <div className="flex items-center gap-2">
                <User size={18} className="text-[#a22055]" />
                <h3 className="text-base font-extrabold text-slate-800">
                  ขั้นตอนที่ 2 : ข้อมูลผู้ขออนุญาตใช้รถยนต์ & คณะเดินทางปฏิบัติงาน
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Requester Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">ชื่อ-นามสกุล ผู้เสนอขอใช้รถ</label>
                <div className="relative">
                  <input
                    type="text"
                    name="requesterName"
                    value={formData.requesterName}
                    onChange={handleChange}
                    placeholder="เช่น นายอับดุลเลาะ มะแก้ว"
                    className={`w-full px-4 py-2.5 border rounded-xl text-sm text-slate-700 ${
                      errors.requesterName ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200 focus:ring-indigo-100 focus:border-[#a22055]'
                    } outline-none focus:ring-2`}
                  />
                </div>
                {errors.requesterName && <p className="text-xs text-rose-500 font-semibold">{errors.requesterName}</p>}
              </div>

              {/* Requester Position */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">ตำแหน่งทางราชการ</label>
                <input
                  type="text"
                  name="requesterPosition"
                  value={formData.requesterPosition}
                  onChange={handleChange}
                  placeholder="เช่น เจ้าพนักงานพัฒนาสังคมชำนาญงาน"
                  className={`w-full px-4 py-2.5 border rounded-xl text-sm text-slate-700 ${
                    errors.requesterPosition ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200 focus:ring-indigo-100 focus:border-[#a22055]'
                  } outline-none focus:ring-2`}
                />
                {errors.requesterPosition && <p className="text-xs text-rose-500 font-semibold">{errors.requesterPosition}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              {/* Department */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">กลุ่มงานต้นสังกัดผู้เสนอขอ</label>
                <div className="relative">
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100 focus:border-[#a22055] bg-white text-slate-700 font-medium"
                  >
                    {DEPARTMENTS.map((dept, idx) => (
                      <option key={idx} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
                <p className="text-[10px] text-slate-400">เลือกกลุ่มงานที่สังกัดจริงเพื่อคุมงบเบิกงบเดินทางและสถิติยอดความถี่การใช้ยานพาหนะจังหวัด</p>
              </div>

              {/* Passengers Count Widget with +/- Controls */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block flex justify-between items-center">
                  <span>จำนวนผู้เดินทางสุทธิทั้งหมด (รวมผู้ขอแล้ว)</span>
                  {selectedVehicleObj && (
                    <span className="text-[10px] font-bold text-slate-400">
                      รถที่เลือกนั่งได้สูงสุด {selectedVehicleObj.capacity} ที่นั่ง
                    </span>
                  )}
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, passengersCount: Math.max(1, prev.passengersCount - 1) }));
                      }}
                      className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 flex items-center justify-center font-extrabold text-sm cursor-pointer select-none transition-colors shadow-xs"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      name="passengersCount"
                      min="1"
                      max="15"
                      value={formData.passengersCount}
                      onChange={handleChange}
                      className={`w-14 text-center border-0 font-extrabold text-sm bg-transparent outline-none py-0 ${
                        errors.passengersCount ? 'text-rose-600' : 'text-slate-800'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, passengersCount: Math.min(15, prev.passengersCount + 1) }));
                      }}
                      className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 flex items-center justify-center font-extrabold text-sm cursor-pointer select-none transition-colors shadow-xs"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-xs font-bold text-slate-500">คน (คณะบุคลากร)</span>
                </div>
                {errors.passengersCount && <p className="text-xs text-rose-500 font-semibold">{errors.passengersCount}</p>}
                
                {selectedVehicleObj && formData.passengersCount > selectedVehicleObj.capacity && (
                  <div className="p-2.5 bg-rose-50 border border-rose-100 text-rose-700 rounded-lg text-[10px] font-bold flex items-center gap-1.5 mt-1 animate-pulse">
                    <AlertTriangle size={12} className="shrink-0" />
                    จำนวนคน ({formData.passengersCount} ราย) เกินความจุของรถ {selectedVehicleObj.name} ({selectedVehicleObj.capacity} ที่นั่ง)
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =======================================
            STEP 3: Vehicle and Driver visual select 
            ======================================= */}
        {(formMode === 'all' || currentStep === 3) && (
          <div className="bg-white border border-slate-100 rounded-2xl p-5 md:p-6 shadow-xs space-y-8 transition-all" id="step-3-vehicle">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
              <div className="h-6 w-1 rounded-full bg-[#a22055]" />
              <div className="flex items-center gap-2">
                <Car size={18} className="text-[#a22055]" />
                <h3 className="text-base font-extrabold text-slate-800">
                  ขั้นตอนที่ 3 : จัดสรรยานพาหนะและระบุพนักงานประจำรถราชการ
                </h3>
              </div>
            </div>

            {/* Visual Vehicle Cards Selection Grid */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-black text-slate-700 uppercase tracking-widest block flex items-center gap-1.5">
                  <Car size={13} className="text-slate-400" />
                  <span>1. เลือกคลิกแผ่นภาพรถยนต์ราชการ (6 คันในคลังส่วนกลาง)</span>
                </label>
                <p className="text-[10px] text-slate-400 font-semibold hidden sm:block">คลิกภาพเพื่อเปลี่ยนรถคันที่สว่าง</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {vehicles.map((v) => {
                  const conflicts = findConflicts(bookings, v.id, 'vehicle', formData.startDate, formData.endDate, bookingToEdit?.id);
                  const isConflict = conflicts.length > 0;
                  const isSelected = formData.vehicleId === v.id;
                  
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        const autoMil = getLastVehicleMileage(v.id);
                        setFormData(prev => ({ 
                          ...prev, 
                          vehicleId: v.id,
                          startMileage: String(autoMil)
                        }));
                        if (errors.vehicleId) {
                          setErrors(prev => {
                            const copy = { ...prev };
                            delete copy.vehicleId;
                            return copy;
                          });
                        }
                      }}
                      className={`text-left p-4 rounded-2xl border-2 transition-all relative flex flex-col justify-between h-34 cursor-pointer outline-none select-none ${
                        isSelected 
                          ? 'border-[#a22055] bg-[#a22055]/5 shadow-md ring-2 ring-[#a22055]/15' 
                          : isConflict 
                            ? 'border-rose-100 bg-rose-50/20 opacity-70 hover:opacity-100 hover:border-rose-300' 
                            : 'border-slate-100 hover:border-slate-300 bg-white shadow-xs'
                      }`}
                    >
                      <div className="flex justify-between items-start w-full gap-2">
                        <div>
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md leading-none mb-1.5 block w-fit ${
                            isSelected 
                              ? 'bg-[#a22055] text-white' 
                              : 'bg-slate-100 text-slate-500'
                          }`}>
                            {translateVehicleType(v.type)}
                          </span>
                          <h4 className="text-xs sm:text-sm font-black text-slate-800 leading-tight">
                            {v.name}
                          </h4>
                        </div>
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs" style={{ backgroundColor: v.imagePlaceholderColor || '#f1f5f9' }}>
                          <Car size={16} className="text-white" />
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between w-full mt-3 pt-2.5 border-t border-slate-100/70">
                        <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 border border-slate-250/60 px-2 py-0.5 rounded-md">
                          {v.plateNumber}
                        </span>
                        <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                          <Users size={12} />
                          {v.capacity} ที่นั่ง
                        </span>
                      </div>

                      {isConflict && (
                        <div className="absolute top-2 right-2 bg-rose-600 text-white rounded-md px-1.5 py-0.5 text-[9px] font-extrabold flex items-center gap-0.5 shadow-sm animate-pulse">
                          <AlertTriangle size={9} />
                          ชนตารางภารกิจอื่น
                        </div>
                      )}
                      
                      {isSelected && (
                        <div className="absolute -top-1.5 -right-1.5 bg-[#a22055] text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-md border-2 border-white font-extrabold">
                          ✓
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              {errors.vehicleId && <p className="text-xs text-rose-500 font-semibold">{errors.vehicleId}</p>}

              {/* Conflict Alert Box for selected vehicle */}
              {vehicleConflicts.length > 0 && (
                <div className="p-3.5 bg-rose-50/50 border border-rose-100 rounded-xl text-rose-800 space-y-1 text-xs mt-2 relative">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={15} className="text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-extrabold">แจ้งเตือนรถทับซ้อนเวลา!</span> รถยนต์ทะเบียนนี้มีภารกิจเดินทางชนเวลากัน:
                      <ul className="list-decimal pl-4 mt-1 font-semibold text-[11px] text-rose-700 space-y-1">
                        {vehicleConflicts.map(c => (
                          <li key={c.id}>
                            เลขใบคำขอ {c.permitNumber} - เสนอโดย {c.requesterName} ({formatThaiDate(c.startDate)} ถึง {formatThaiDate(c.endDate)})
                          </li>
                        ))}
                      </ul>
                      <p className="text-[10px] text-slate-400 mt-1.5 leading-tight font-medium">เพื่อสวัสดิภาพในการบริหารงาน ท่านควรเปลี่ยนไปใช้รถยนต์คันถัดไปที่ไม่มีตราเตือน ชนตารางจริงคณะตรวจราชการจะไม่ได้รับอนุมัติใบสั่งจ่ายนํ้ามันสวัสดิการได้</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Visual Drivers Selection Grid */}
            <div className="space-y-3 pt-4 border-t border-slate-100/70">
              <div className="flex justify-between items-center">
                <label className="text-xs font-black text-slate-700 uppercase tracking-widest block flex items-center gap-1.5">
                  <User size={13} className="text-slate-400" />
                  <span>2. เลือกแผ่นข้อมูลพลขับ (พนักงานขับรถ 5 ท่าน หรือ ประเด็นขับขี่ด้วยตนเอง)</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                
                {/* Standout Self-Drive Special Card */}
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, driverId: 'self-drive' }));
                    if (errors.driverId) {
                      setErrors(prev => {
                        const copy = { ...prev };
                        delete copy.driverId;
                        return copy;
                      });
                    }
                  }}
                  className={`text-left p-4 rounded-2xl border-2 transition-all relative flex flex-col justify-between h-34 cursor-pointer outline-none select-none ${
                    formData.driverId === 'self-drive'
                      ? 'border-[#a22055] bg-[#a22055]/5 shadow-md ring-2 ring-[#a22055]/15'
                      : 'border-slate-100 hover:border-slate-300 bg-white shadow-xs'
                  }`}
                >
                  <div className="flex justify-between items-start w-full">
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 block w-fit mb-1.5 leading-none">
                        อนุญาตส่วนกลาง
                      </span>
                      <h4 className="text-xs sm:text-sm font-black text-slate-800">🚙 ขับขี่ภารกิจด้วยตนเอง</h4>
                    </div>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-purple-50">
                      <User size={16} className="text-purple-600" />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 leading-tight font-medium">
                    ผู้ขออนุญาตใช้บริการเป็นผู้มีใบขับขี่ที่ถูกต้องและทำภารกิจขับขี่รถยนต์หลวงด้วยตนเอง โดยไม่ต้องจัดสรรหาพลคนขับประจำกองเสริม
                  </p>
                  {formData.driverId === 'self-drive' && (
                    <div className="absolute -top-1.5 -right-1.5 bg-[#a22055] text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-md border-2 border-white font-extrabold">
                      ✓
                    </div>
                  )}
                </button>

                {drivers.map((d) => {
                  const conflicts = findConflicts(bookings, d.id, 'driver', formData.startDate, formData.endDate, bookingToEdit?.id);
                  const isConflict = conflicts.length > 0;
                  const isSelected = formData.driverId === d.id;
                  
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, driverId: d.id }));
                        if (errors.driverId) {
                          setErrors(prev => {
                            const copy = { ...prev };
                            delete copy.driverId;
                            return copy;
                          });
                        }
                      }}
                      className={`text-left p-4 rounded-2xl border-2 transition-all relative flex flex-col justify-between h-34 cursor-pointer outline-none select-none ${
                        isSelected 
                          ? 'border-[#a22055] bg-[#a22055]/5 shadow-md ring-2 ring-[#a22055]/15' 
                          : isConflict 
                            ? 'border-rose-100 bg-rose-50/20 opacity-70 hover:opacity-100 hover:border-rose-300' 
                            : 'border-slate-100 hover:border-slate-300 bg-white shadow-xs'
                      }`}
                    >
                      <div className="flex justify-between items-start w-full gap-2">
                        <div>
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md leading-none mb-1.5 block w-fit ${
                            isSelected 
                              ? 'bg-[#a22055] text-white' 
                              : 'bg-slate-100 text-slate-500'
                          }`}>
                            พลขับเวรส่วนกลาง
                          </span>
                          <h4 className="text-xs sm:text-sm font-black text-slate-800">🎯 {d.name}</h4>
                        </div>
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs" style={{ backgroundColor: d.avatarColor || '#e2e8f0' }}>
                          <span className="text-xs font-black text-slate-700">{d.name.substring(0, 2)}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between w-full mt-3 pt-2.5 border-t border-slate-100/70">
                        <span className="text-[11px] font-mono leading-none text-slate-500 flex items-center gap-1">
                          <Phone size={10} />
                          {d.phone}
                        </span>
                        {isConflict && (
                          <span className="text-[9px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded-md">
                            ติดปฏิทินอื่น
                          </span>
                        )}
                      </div>

                      {isConflict && (
                        <div className="absolute top-2 right-2 bg-rose-600 text-white rounded-md px-1.5 py-0.5 text-[9px] font-extrabold flex items-center gap-0.5 shadow-sm animate-pulse">
                          <AlertTriangle size={9} />
                          ตารางซ้อนทับ
                        </div>
                      )}
                      
                      {isSelected && (
                        <div className="absolute -top-1.5 -right-1.5 bg-[#a22055] text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-md border-2 border-white font-extrabold">
                          ✓
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              {errors.driverId && <p className="text-xs text-rose-500 font-semibold">{errors.driverId}</p>}

              {/* Conflict Alert Box for selected driver */}
              {driverConflicts.length > 0 && (
                <div className="p-3.5 bg-rose-50/50 border border-rose-100 rounded-xl text-rose-800 space-y-1 text-xs mt-2 relative">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={15} className="text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-extrabold">แจ้งเตือนคิวคนขับชนเวลากัน!</span> พนักงานขับรถท่านนี้ติดภารกิจออกตารางช่วงซ้อนทับกัน:
                      <ul className="list-decimal pl-4 mt-1 font-semibold text-[11px] text-rose-700 space-y-1">
                        {driverConflicts.map(c => (
                          <li key={c.id}>
                            เลขใบคำขอ {c.permitNumber} - เสนอโดย {c.requesterName} ({formatThaiDate(c.startDate)} ถึง {formatThaiDate(c.endDate)})
                          </li>
                        ))}
                      </ul>
                      <p className="text-[10px] text-slate-400 mt-1.5 leading-tight font-medium">เสนอแนะให้ระบุเปลี่ยนเป็นผู้ขับขี่รายอื่นหรือใช้โหมด ขับขี่ด้วยตัวเอง หรือติดต่อผู้เสนอจองคิวก่อนหน้าเพื่อหารือเลื่อนตารางเดินทาง</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Mileage Registration Segment */}
              <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 md:p-5 mt-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1 px-2 bg-[#a22055] text-white font-extrabold text-[10px] rounded-md tracking-wide">
                      มาตรเลขไมล์คุมพัสดุ
                    </span>
                    <h4 className="text-xs font-bold text-slate-800">สถิติเลขกิโลเมตรสะสมของยานพาหนะราชการ</h4>
                  </div>
                  {formData.vehicleId && (
                    <span className="text-[10px] bg-rose-50 border border-rose-100/40 px-2 py-0.5 rounded-full font-bold text-[#a22055] self-start sm:self-auto font-mono">
                      แชสซีคันนี้: {formData.vehicleId}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Start Mileage */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between gap-1">
                      <span className="flex items-center gap-1">
                        <span>เลขไมล์เริ่มต้นก่อนออกเดินทาง (กม.)</span>
                        <span className="text-rose-500 font-extrabold">*</span>
                      </span>
                      {!isAdmin && (
                        <span className="text-[9px] bg-amber-50 text-amber-700 font-extrabold px-1.5 py-0.5 rounded border border-amber-250/50">
                          เฉพาะแอดมิน
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      name="startMileage"
                      value={formData.startMileage}
                      onChange={handleChange}
                      disabled={!isAdmin}
                      placeholder={!isAdmin ? "ระบบประมวลผลเลขไมล์อัตโนมัติ" : "กรอกเลขไมล์เริ่มต้น เช่น 135000"}
                      className={`w-full px-4 py-2 border rounded-xl text-xs sm:text-sm text-slate-700 outline-none font-mono font-bold ${
                        !isAdmin 
                          ? 'bg-slate-100/80 border-slate-200 text-slate-400 cursor-not-allowed' 
                          : 'bg-white border-slate-200 focus:ring-2 focus:ring-rose-100 focus:border-[#a22055]'
                      }`}
                    />
                    <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                      <span>✓ ป้องกันการผิดพลาดรันเลขครั้งก่อนอัตโนมัติ:</span>
                      <span className="font-mono underline font-black">{getLastVehicleMileage(formData.vehicleId).toLocaleString()} กม.</span>
                    </p>
                  </div>

                  {/* End Mileage */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between gap-1">
                      <span>เลขไมล์สิ้นสุดการเดินทางสะสม (กม.)</span>
                      {!isAdmin && (
                        <span className="text-[9px] bg-amber-50 text-amber-700 font-extrabold px-1.5 py-0.5 rounded border border-amber-250/50">
                          เฉพาะแอดมิน
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      name="endMileage"
                      value={formData.endMileage}
                      onChange={handleChange}
                      disabled={!isAdmin}
                      placeholder={!isAdmin ? "รอพนักงานขับรถหรือแอดมินลงบันทึกในระบบ" : "บันทึกเมื่อกลับมาถึง เช่น 135450"}
                      className={`w-full px-4 py-2 border rounded-xl text-xs sm:text-sm font-mono font-bold outline-none focus:ring-2 ${
                        !isAdmin 
                          ? 'bg-slate-100/80 border-slate-200 text-slate-400 cursor-not-allowed' 
                          : errors.endMileage 
                            ? 'bg-white border-rose-400 focus:ring-rose-200 text-slate-700' 
                            : 'bg-white border-slate-200 focus:ring-[#a22055] text-slate-700'
                      }`}
                    />
                    {errors.endMileage ? (
                      <p className="text-[10px] text-rose-500 font-extrabold">{errors.endMileage}</p>
                    ) : (
                      <p className="text-[10px] text-slate-400 font-medium font-sans">
                        {!isAdmin 
                          ? "(เฉพาะผู้ใช้งานระดับแอดมินจึงจะมีสิทธิ์ลงบันทึกเลขไมล์ขากลับในหน้านี้)" 
                          : "(เว้นว่างไว้เพื่อบันทึกเมื่อรถขับกลับมาถึงเป้าหมายจังหวัดตรัง)"}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =======================================
            STEP 4: caretakers and approvers 
            ======================================= */}
        {(formMode === 'all' || currentStep === 4) && (
          <div className="bg-white border border-slate-100 rounded-2xl p-5 md:p-6 shadow-xs space-y-6 transition-all" id="step-4-[#a22055]">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
              <div className="h-6 w-1 rounded-full bg-[#a22055]" />
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-[#a22055]" />
                <h3 className="text-base font-extrabold text-slate-800">
                  ขั้นตอนที่ 4 : นายคลังจัดดูแลยานพาหนะ & ตำแหน่งผู้อนุมัติเดินทาง
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              
              {/* Caretaker */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">เจ้าหน้าที่จัดดูแลยานพาหนะ (นายทะเบียนพัสดุ)</label>
                <select
                  name="caretakerName"
                  value={formData.caretakerName}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-150 focus:border-[#a22055] bg-white text-slate-700 font-semibold"
                >
                  {caretakers.map((caretaker, idx) => (
                    <option key={caretaker.id || idx} value={caretaker.name}>{caretaker.name}</option>
                  ))}
                </select>
              </div>

              {/* Caretaker Position */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">ตำแหน่งนายทะเบียนคุมรถ</label>
                <input
                  type="text"
                  name="caretakerPosition"
                  value={formData.caretakerPosition}
                  disabled
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-400 font-bold outline-none"
                />
              </div>

              <div className="hidden lg:block"></div>

              {/* Approver Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">ผู้อนุมัติการเดินทางใช้รถยนต์</label>
                <select
                  name="approvedBy"
                  value={formData.approvedBy}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-150 focus:border-[#a22055] bg-white text-slate-700 font-semibold"
                >
                  {approvers.map((appr, idx) => (
                    <option key={appr.id || idx} value={appr.name}>{appr.name}</option>
                  ))}
                </select>
              </div>

              {/* Approver Position */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">ตำแหน่งข้าราชการผู้มีอำนาจอนุญาต</label>
                <input
                  type="text"
                  name="approvedByPosition"
                  value={formData.approvedByPosition}
                  disabled
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-400 font-bold outline-none"
                />
              </div>

              {/* Status Select (Admin restricted) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block flex items-center justify-between">
                  <span>สถานะใบขอจอง</span>
                  {!isAdmin && <span className="text-rose-600 font-black text-[10px] bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded-lg">Admin Only</span>}
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  disabled={!isAdmin}
                  className={`w-full px-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 font-bold ${
                    !isAdmin 
                      ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200' 
                      : 'bg-white text-[#a22055] border-[#a22055]/30 focus:ring-rose-150 focus:border-[#a22055]'
                  }`}
                >
                  <option value="pending">⏳ เสนอเสนอแฟ้ม: รอการลงนามอนุมัติ (Pending)</option>
                  <option value="approved">✅ สมบูรณ์: ได้รับลงนามอนุมัติใบใช้รถ (Approved)</option>
                  <option value="completed">🚙 สำเร็จแล้ว: เสร็จสิ้นภารกิจและจอดคืนกุญแจ (Completed)</option>
                  <option value="rejected">❌ ไม่อนุมัติ: เนื่องจากตารางชนภารกิจสำคัญ (Rejected)</option>
                  <option value="cancelled">🗑️ ยกเลิกการใช้: คลี่คลายหรือเจ้าตัวยกเลิกเอง (Cancelled)</option>
                </select>
              </div>

            </div>

            {/* Remarks */}
            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-bold text-slate-700 block">บันทึกเพิ่มเติมจากผู้ขอ / หมายเหตุงานคลัง</label>
              <input
                type="text"
                name="remarks"
                value={formData.remarks}
                onChange={handleChange}
                placeholder="ระบุข้อแนะนำเพิ่มเติม เช่น บรรทุกสัมภาระช่วยเหลือสังคม 3 กระสอบ หรือต้องการไปเส้นทางลัดด่วนพิเศษ"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:ring-2 focus:ring-rose-200 focus:border-[#a22055] bg-white"
              />
            </div>

            {/* Beautiful visual confirmation receipt ticket */}
            <div className="bg-slate-50/70 border border-slate-200/60 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-dashed border-slate-200">
                <FileText className="text-[#a22055]" size={18} />
                <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">
                  🎫 ตั๋วสรุปภาพร่างบันทึกคำขอ (Journey Summary Preview)
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5 text-xs">
                <div className="space-y-1">
                  <span className="text-slate-400 font-semibold block">ผู้ยื่นเรื่องและตำแหน่ง:</span>
                  <p className="text-slate-800 font-black">
                    {formData.requesterName || 'ยังไม่กรอก'} ({formData.requesterPosition || 'ยังไม่ระบุตำแหน่ง'})
                  </p>
                  <p className="text-[#a22055] text-[10px] font-bold">{formData.department}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 font-semibold block">สถานที่ปลายทาง:</span>
                  <p className="text-slate-800 font-black truncate">{formData.destination || 'ยังไม่ระบุสถานที่เดินทาง'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 font-semibold block">วันและเวลาปฏิบัติหน้าที่:</span>
                  <p className="text-slate-800 font-black">
                    {formData.startDate ? formatThaiDate(new Date(formData.startDate).toISOString()) : 'ยังไม่ระบุ'} <br /> 
                    ถึง {formData.endDate ? formatThaiDate(new Date(formData.endDate).toISOString()) : 'ยังไม่ระบุ'}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 font-semibold block">จับคู่รถราชการและพลขับ:</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] bg-slate-100 border px-1.5 py-0.5 rounded font-extrabold text-[#a22055]">
                      🚗 {selectedVehicleObj?.name || 'ยังเลือกยานพาหนะ'} ({selectedVehicleObj?.plateNumber || 'คันชั่วคราว'})
                    </span>
                    <span className="text-[10px] bg-slate-100 border px-1.5 py-0.5 rounded font-bold text-slate-600">
                      👨‍✈️ {selectedDriverObj?.name || 'ยังไม่เลือกพลขับ'}
                    </span>
                  </div>
                  {selectedVehicleObj && formData.passengersCount > 0 && (
                    <span className="text-[9px] text-[#a22055] font-extrabold block mt-1">
                      คณะผู้ร่วมทางทั้งหมด {formData.passengersCount} คน (สุทธิขีดรถนั่ง {selectedVehicleObj.capacity} ท่าน)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Global Warnings / Overlaps Banner summary */}
        {(vehicleConflicts.length > 0 || driverConflicts.length > 0) && (
          <div className="p-4 bg-amber-50/80 border border-amber-250/50 rounded-2xl flex items-start gap-3.5 text-amber-900 text-sm">
            <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
            <div className="space-y-1">
              <p className="font-extrabold">เฝ้าระวังเวลาปฏิบัติงานชนตารางซ้ำภารกิจอื่น</p>
              <p className="text-xs leading-relaxed text-amber-800">
                ระบบสืบค้นพบว่ามียานพาหนะหรือพลขับที่ได้รับการจับจองไปปฏิบัติภารกิจอื่นซ้อนทับกันแล้วในห้วงเวลาที่กำหนด ท่านสามารถกดยื่นบันทึกค้างเป็นระดับ <span className="font-extrabold">"รออนุมัติ"</span> ไว้เพื่อปรึกษาหารือดึงแฟ้มส่วนสารบรรณ หรือเพื่อความสะดวกรวดเร็ว แนะนำให้คลิกเปลี่ยนคันรถหรือเปลี่ยนพลขับที่เปิดแสดงป้ายสีขัดขึ้นเพื่อความมั่นคงสมบูรณ์ในการเดินทาง
              </p>
            </div>
          </div>
        )}

        {/* Action button controls */}
        <div className="pt-6 border-t border-slate-100/70 flex flex-wrap items-center justify-between gap-4">
          
          {/* Stepped Back control button */}
          {formMode === 'stepped' ? (
            <button
              type="button"
              onClick={handlePrevStep}
              disabled={currentStep === 1}
              className={`px-4 py-2.5 border rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                currentStep === 1 
                  ? 'opacity-35 cursor-not-allowed border-slate-100 text-slate-300' 
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <ChevronLeft size={16} />
              ย้อนขั้นตอนก่อนหน้า
            </button>
          ) : (
            <div />
          )}

          {/* Stepped Next / Save control buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 text-xs sm:text-sm font-semibold rounded-xl transition cursor-pointer"
            >
              ปิดยกเลิกไม่บันทึก
            </button>
            
            {formMode === 'stepped' && currentStep < steps.length ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="px-5 py-2.5 bg-[#a22055] hover:bg-[#8e1b4a] text-white text-xs sm:text-sm font-black rounded-xl transition-all shadow-sm shadow-[#a22055]/10 flex items-center gap-1.5 cursor-pointer"
              >
                ถัดไป : กรอกขั้นตอน {currentStep + 1}
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#a22055] hover:bg-[#8e1b4a] text-white text-xs sm:text-sm font-black rounded-xl transition-all shadow-md shadow-[#a22055]/15 flex items-center gap-1.5 cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
                id="btn-save-booking"
              >
                <Save size={15} />
                {isEditMode ? 'บันทึกการปรับปรุงใบใช้รถ' : 'ส่งบันทึกขอใช้รถราชการ'}
              </button>
            )}
          </div>

        </div>

      </form>

    </div>
  );
}

