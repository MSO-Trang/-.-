import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Car, 
  User, 
  Calendar, 
  MapPin, 
  ArrowRight, 
  Gauge, 
  Edit3, 
  TrendingUp, 
  RotateCcw,
  RefreshCw,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Booking, Vehicle, Driver } from '../types';

interface MileageTrackerProps {
  bookings: Booking[];
  vehicles: Vehicle[];
  drivers: Driver[];
  onCompleteBookingWithMileage: (bookingId: string, startMil: number, endMil: number) => void;
  isAdmin: boolean;
}

export default function MileageTracker({
  bookings,
  vehicles,
  drivers,
  onCompleteBookingWithMileage,
  isAdmin
}: MileageTrackerProps) {
  
  const [activeSubTab, setActiveSubTab] = useState<'pending' | 'completed'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVehicleFilter, setSelectedVehicleFilter] = useState<string>('all');
  
  // State for actively editing booking's mileage
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
  const [startMilInput, setStartMilInput] = useState('');
  const [endMilInput, setEndMilInput] = useState('');
  const [inputError, setInputError] = useState('');

  // Helper: Find vehicle's latest expected mileage chronologically, supporting out-of-order bookings
  const getLastVehicleMileage = (vehicleId: string, currentBookingId: string): number => {
    const targetVehicle = vehicles.find(v => v.id === vehicleId);
    const baseMileage = targetVehicle?.mileage || 0;

    const currentBooking = bookings.find(b => b.id === currentBookingId);
    if (!currentBooking) return baseMileage;

    const currentStartTime = new Date(currentBooking.startDate).getTime();

    // 1. Look up prior bookings chronologically
    const priorBookings = bookings.filter(
      b => b.vehicleId === vehicleId && 
           b.id !== currentBookingId && 
           b.status !== 'cancelled' && 
           b.status !== 'rejected' &&
           new Date(b.startDate).getTime() < currentStartTime
    );
    
    if (priorBookings.length > 0) {
      const sorted = [...priorBookings].sort(
        (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
      );
      
      for (const b of sorted) {
        if (b.endMileage !== undefined && b.endMileage !== null && b.endMileage > 0) {
          return b.endMileage;
        }
        if (b.startMileage !== undefined && b.startMileage !== null && b.startMileage > 0) {
          return b.startMileage;
        }
      }
    }

    // 2. Look up subsequent bookings (fallback for out-of-order entries)
    const subsequentBookings = bookings.filter(
      b => b.vehicleId === vehicleId &&
           b.id !== currentBookingId &&
           b.status !== 'cancelled' &&
           b.status !== 'rejected' &&
           new Date(b.startDate).getTime() >= currentStartTime
    );

    if (subsequentBookings.length > 0) {
      const sortedSubsequent = [...subsequentBookings].sort(
        (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );
      for (const b of sortedSubsequent) {
        if (b.startMileage !== undefined && b.startMileage !== null && b.startMileage > 0) {
          return b.startMileage;
        }
        if (b.endMileage !== undefined && b.endMileage !== null && b.endMileage > 0) {
          return b.endMileage;
        }
      }
    }

    // 3. Fallback: lowest of any completed bookings with mileage
    const anyWithMileage = bookings.filter(
      b => b.vehicleId === vehicleId &&
           b.id !== currentBookingId &&
           b.status !== 'cancelled' &&
           b.status !== 'rejected' &&
           ((b.startMileage !== undefined && b.startMileage !== null && b.startMileage > 0) ||
            (b.endMileage !== undefined && b.endMileage !== null && b.endMileage > 0))
    );

    if (anyWithMileage.length > 0) {
      let minMil = Infinity;
      for (const b of anyWithMileage) {
        if (b.startMileage && b.startMileage < minMil) minMil = b.startMileage;
        if (b.endMileage && b.endMileage < minMil) minMil = b.endMileage;
      }
      if (minMil !== Infinity && minMil > 0) return minMil;
    }

    return baseMileage;
  };

  // Setup/Open Editing Form for a trip
  const handleStartEditing = (booking: Booking) => {
    setEditingBookingId(booking.id);
    
    // Determine expected start mileage
    const expectedStart = booking.startMileage !== undefined && booking.startMileage !== null
      ? booking.startMileage 
      : getLastVehicleMileage(booking.vehicleId, booking.id);
      
    setStartMilInput(String(expectedStart));
    setEndMilInput(booking.endMileage !== undefined && booking.endMileage !== null ? String(booking.endMileage) : '');
    setInputError('');
  };

  // Close Quick Form
  const handleCancelEditing = () => {
    setEditingBookingId(null);
    setStartMilInput('');
    setEndMilInput('');
    setInputError('');
  };

  // Submit/Save changes
  const handleSaveMileage = (bookingId: string) => {
    const startVal = parseInt(startMilInput, 10);
    const endVal = parseInt(endMilInput, 10);

    if (isNaN(startVal) || startVal < 0) {
      setInputError('กรุณากรอกเลขไมล์เริ่มต้นกิโลเมตรเป็นตัวเลขที่ถูกต้อง');
      return;
    }
    if (isNaN(endVal) || endVal < 0) {
      setInputError('กรุณากรอกเลขไมล์เมื่อสิ้นสุดเดินทางให้ถูกต้อง');
      return;
    }
    if (endVal < startVal) {
      setInputError(`เลขไมล์ขากลับ (${endVal.toLocaleString()} กม.) ต้องห้ามน้อยกว่า เลขไมล์เริ่มต้นเดินทาง (${startVal.toLocaleString()} กม.)`);
      return;
    }

    onCompleteBookingWithMileage(bookingId, startVal, endVal);
    handleCancelEditing();
  };

  // Classify and filter bookings
  const pendingMileageBookings = useMemo(() => {
    // Books approved or completed but without valid mileage stats
    return bookings.filter(b => {
      const isApproved = b.status === 'approved';
      const isCompletedWithoutMileage = b.status === 'completed' && (b.endMileage === undefined || b.endMileage === null);
      return (isApproved || isCompletedWithoutMileage);
    });
  }, [bookings]);

  const completedMileageBookings = useMemo(() => {
    // Books completed and having both mileages present
    return bookings.filter(b => b.status === 'completed' && b.startMileage !== undefined && b.endMileage !== undefined);
  }, [bookings]);

  // Apply search/vehicle filters to selected collection
  const filteredBookings = useMemo(() => {
    const activeList = activeSubTab === 'pending' ? pendingMileageBookings : completedMileageBookings;
    
    return activeList.filter(b => {
      const vehicle = vehicles.find(v => v.id === b.vehicleId);
      const driver = drivers.find(d => d.id === b.driverId);
      
      // Vehicle license filter
      if (selectedVehicleFilter !== 'all' && b.vehicleId !== selectedVehicleFilter) {
        return false;
      }

      // Search match
      if (!searchQuery.trim()) return true;
      const term = searchQuery.toLowerCase();
      
      return (
        b.permitNumber.toLowerCase().includes(term) ||
        b.requesterName.toLowerCase().includes(term) ||
        (b.destination && b.destination.toLowerCase().includes(term)) ||
        (vehicle && vehicle.plateNumber.toLowerCase().includes(term)) ||
        (driver && driver.name.toLowerCase().includes(term))
      );
    });
  }, [activeSubTab, pendingMileageBookings, completedMileageBookings, searchQuery, selectedVehicleFilter, vehicles, drivers]);

  // Helper to format date beautifully
  const formatThaiDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }) + ' น.';
    } catch {
      return dateStr;
    }
  };

  // Interactive Live Calculation
  const currentNetDistance = useMemo(() => {
    const s = parseInt(startMilInput, 10);
    const e = parseInt(endMilInput, 10);
    if (!isNaN(s) && !isNaN(e) && e >= s) {
      return e - s;
    }
    return null;
  }, [startMilInput, endMilInput]);

  return (
    <div className="space-y-6 w-full animate-fade-in font-sans">
      
      {/* Page Header */}
      <div className="bg-white border border-slate-200/60 rounded-2xl p-5 md:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-pink-50 text-[#aa4e6e] rounded-xl">
            <Gauge size={22} className="stroke-[2.2]" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-800 tracking-tight leading-none">
              บันทึกเลขไมล์หลังเสร็จสิ้นการเดินทาง
            </h2>
            <p className="text-xs text-slate-400 font-medium mt-1">
              ลงรายงานระยะกิโลเมตรเริ่มต้นและสิ้นสุดของยานพาหนะ คณะเดินทางจะอัปเดตสถิติตามจริงอัตโนมัติ
            </p>
          </div>
        </div>

        {/* Quick Stats Summary */}
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-150 p-2.5 rounded-xl self-start md:self-auto shrink-0">
          <div className="text-center px-3 border-r border-slate-200">
            <div className="text-xs text-slate-400 font-semibold leading-none">ค้างบันทึก</div>
            <div className="text-sm font-black text-[#aa4e6e] mt-1">{pendingMileageBookings.length} รายการ</div>
          </div>
          <div className="text-center px-2">
            <div className="text-xs text-slate-400 font-semibold leading-none">เสร็จสิ้นแล้ว</div>
            <div className="text-sm font-black text-emerald-700 mt-1">{completedMileageBookings.length} คัน</div>
          </div>
        </div>
      </div>

      {/* Tab Selectors & Filter Row */}
      <div className="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-xs space-y-4">
        
        {/* Sub Tabs */}
        <div className="flex border-b border-slate-100 pb-1 gap-2">
          <button
            onClick={() => {
              setActiveSubTab('pending');
              handleCancelEditing();
            }}
            className={`px-4 py-2 border-b-2 text-xs sm:text-sm font-extrabold flex items-center gap-2 cursor-pointer transition ${
              activeSubTab === 'pending'
                ? 'border-[#aa4e6e] text-[#aa4e6e]'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <span>⏳ ค้างลงบันทึกเลขไมล์</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold leading-none ${
              activeSubTab === 'pending' ? 'bg-pink-100 text-[#aa4e6e]' : 'bg-slate-100 text-slate-500'
            }`}>
              {pendingMileageBookings.length}
            </span>
          </button>
          
          <button
            onClick={() => {
              setActiveSubTab('completed');
              handleCancelEditing();
            }}
            className={`px-4 py-2 border-b-2 text-xs sm:text-sm font-extrabold flex items-center gap-2 cursor-pointer transition ${
              activeSubTab === 'completed'
                ? 'border-[#aa4e6e] text-[#aa4e6e]'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <span>✅ บันทึกเสร็จเรียบร้อย</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold leading-none ${
              activeSubTab === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
            }`}>
              {completedMileageBookings.length}
            </span>
          </button>
        </div>

        {/* Searching & Filter Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Search Query */}
          <div className="relative md:col-span-2">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search size={14} />
            </span>
            <input
              type="text"
              placeholder="ค้นหาตามเลขใบขอรถ, ชื่อผู้ใช้, สถานที่ปลายทาง, หรือ พนักงานขับรถ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm outline-none focus:bg-white focus:border-[#aa4e6e] focus:ring-2 focus:ring-rose-50"
            />
          </div>

          {/* Vehicle Dropdown Filter */}
          <div className="relative">
            <select
              value={selectedVehicleFilter}
              onChange={(e) => setSelectedVehicleFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm outline-none focus:bg-white focus:border-[#aa4e6e] appearance-none cursor-pointer"
            >
              <option value="all">🚗 กรองตามรถทุกคัน</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>
                  {v.plateNumber} ({v.name})
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
              <Car size={13} />
            </div>
          </div>
        </div>
      </div>

      {/* Main List */}
      <div className="space-y-4">
        {filteredBookings.length === 0 ? (
          <div className="bg-white border border-slate-200/50 rounded-2xl p-12 text-center shadow-xs">
            <Gauge className="mx-auto text-slate-350 stroke-[1.5] animate-bounce mb-3" size={40} />
            <p className="text-sm font-extrabold text-slate-700">ไม่พบเที่ยวเดินทางราชการในหมวดหมู่นี้</p>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              ลองเปลี่ยนคำค้นหา หรือกรองตามสภาพตัวแทนคันอื่น หรืออาจยังไม่มีแฟ้มคิวใบจองในช่วงเวลาที่กำหนด
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredBookings.map((b) => {
              const vehicle = vehicles.find(v => v.id === b.vehicleId);
              const driver = drivers.find(d => d.id === b.driverId);
              const isCurrentlyEditing = editingBookingId === b.id;

              return (
                <div 
                  key={b.id}
                  className={`bg-white border rounded-2xl shadow-xs transition-all duration-300 overflow-hidden ${
                    isCurrentlyEditing 
                      ? 'border-[#aa4e6e] ring-2 ring-rose-50' 
                      : 'border-slate-200/70 hover:border-slate-350'
                  }`}
                >
                  <div className="p-4 sm:p-5 flex flex-col lg:flex-row gap-5 justify-between">
                    
                    {/* Basic details container */}
                    <div className="space-y-3 flex-1">
                      {/* Badge / Header line */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="p-1 px-2.5 bg-slate-100 text-slate-700 font-bold text-[10px] rounded-lg border border-slate-200/60 leading-none">
                          {b.permitNumber}
                        </span>
                        
                        <span className={`p-1 px-2.5 rounded-lg font-bold text-[10px] leading-none ${
                          b.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-250/50'
                            : b.status === 'approved'
                              ? 'bg-blue-50 text-blue-800 border border-blue-200/50'
                              : 'bg-amber-50 text-amber-800 border border-amber-200/50'
                        }`}>
                          {b.status === 'completed' ? '🏁 สัญจรกิจเสร็จแล้ว' : '🔵 ผ่านอนุมัติ (รอนำออกสนาม)'}
                        </span>

                        <span className="text-[10px] text-slate-400 font-medium font-sans">
                          สร้างใบจองเมื่อ: {formatThaiDate(b.createdAt)}
                        </span>
                      </div>

                      {/* Content Section */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                        {/* Column 1: Passengers/Purpose */}
                        <div className="space-y-1.5">
                          <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#aa4e6e]"></span>
                            <span>{b.requesterName} ({b.department})</span>
                          </h3>
                          <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5 pl-3">
                            <MapPin size={12} className="text-[#aa4e6e] shrink-0" />
                            <span className="truncate" title={b.destination}>📍 {b.destination}</span>
                          </div>
                          <div className="text-xs text-slate-400 font-medium pl-3 whitespace-normal break-words">
                            วัตถุประสงค์: <span className="text-slate-500 font-bold">{b.purpose}</span>
                          </div>
                        </div>

                        {/* Column 2: Vehicle & Driver */}
                        <div className="space-y-1.5 sm:border-l sm:border-slate-100 sm:pl-4">
                          <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <Car size={13} className="text-slate-400 shrink-0" />
                            <span>ยานพาหนะ: {vehicle?.plateNumber || b.vehicleId} ({vehicle?.name || 'ไม่มีชื่อ'})</span>
                          </div>
                          <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <User size={13} className="text-slate-400 shrink-0" />
                            <span>พนักงานขับรถ: {driver?.name || 'ไม่ได้จัดพนักงาน'}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                            <Calendar size={13} className="text-slate-400 shrink-0" />
                            <span>{formatThaiDate(b.startDate)} - {formatThaiDate(b.endDate)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Current Mileage status info blocks if not in editing mode */}
                      {!isCurrentlyEditing && (
                        <div className="pt-2 flex flex-wrap gap-3">
                          {b.startMileage !== undefined && b.startMileage !== null ? (
                            <div className="bg-slate-50 border border-slate-200/50 rounded-xl p-2 px-3 flex items-center gap-2 text-xs">
                              <span className="text-slate-400 font-medium">ไมล์เริ่มต้น:</span>
                              <span className="font-mono font-bold text-slate-700">{b.startMileage.toLocaleString()} กม.</span>
                            </div>
                          ) : (
                            <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-2 px-3 flex items-center gap-1.5 text-xs text-rose-850">
                              <AlertCircle size={12} className="text-rose-500" />
                              <span className="font-bold">รอประเมินไมล์เริ่ม</span>
                            </div>
                          )}

                          {b.endMileage !== undefined && b.endMileage !== null ? (
                            <div className="bg-slate-50 border border-slate-200/50 rounded-xl p-2 px-3 flex items-center gap-2 text-xs">
                              <span className="text-slate-400 font-medium">ไมล์สิ้นสุด:</span>
                              <span className="font-mono font-bold text-slate-700">{b.endMileage.toLocaleString()} กม.</span>
                            </div>
                          ) : (
                            <div className="bg-amber-50/60 border border-amber-200/40 rounded-xl p-2 px-3 flex items-center gap-1.5 text-xs text-amber-800">
                              <Info size={12} className="text-amber-500" />
                              <span className="font-bold">รอระบุไมล์ขากลับ</span>
                            </div>
                          )}

                          {b.startMileage !== undefined && b.endMileage !== undefined && (
                            <div className="bg-emerald-50 border border-emerald-150 rounded-xl p-2 px-3 flex items-center gap-2 text-xs text-emerald-800">
                              <span className="font-medium">เดินทางรวมสุทธิ:</span>
                              <span className="font-mono font-black">{(b.endMileage - b.startMileage).toLocaleString()} กิโลเมตร</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Operational Action Button right cluster */}
                    <div className="lg:w-48 flex items-center lg:justify-end shrink-0">
                      {!isCurrentlyEditing ? (
                        <button
                          onClick={() => handleStartEditing(b)}
                          className={`w-full lg:w-auto px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                            b.status === 'completed'
                              ? 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-350 text-slate-700'
                              : 'bg-[#aa4e6e] hover:bg-[#803551] text-white border-transparent'
                          }`}
                        >
                          <Edit3 size={13} />
                          {b.status === 'completed' ? 'แก้ไขเลขไมล์' : 'บันทึกเลขไมล์เดินทาง 🏁'}
                        </button>
                      ) : (
                        <div className="text-[11px] text-[#aa4e6e] font-extrabold bg-pink-100/50 border border-pink-200 rounded-lg p-2 text-center w-full">
                          ⚙️ กำลังทำการลงกิโลเมตร
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Form Expanded Row Panel directly inside card for lightning-fast logs */}
                  <AnimatePresence>
                    {isCurrentlyEditing && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="border-t border-slate-100 bg-slate-50/75 p-4 sm:p-5 space-y-4"
                      >
                        <div className="flex border-l-4 border-[#aa4e6e] pl-3">
                          <h4 className="text-xs font-bold text-slate-800">กรอกเลขมาตรวัดกิโลเมตรสุทธิ</h4>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Start Mileage Form Field (Always editable to handle out-of-order entry) */}
                          <div className="space-y-1.5 flex flex-col justify-center">
                            <label className="text-xs font-bold block text-slate-700 flex items-center justify-between">
                              <span>📟 เลขไมล์เริ่มต้นเดินทาง (กม.)</span>
                              <span className="text-[9px] bg-indigo-105 text-indigo-805 px-1.5 py-0.5 rounded font-black">
                                แก้ไขได้ (กรณีสลับคิวบันทึกก่อนหลัง)
                              </span>
                            </label>
                            <input
                              type="number"
                              value={startMilInput}
                              onChange={(e) => {
                                setStartMilInput(e.target.value);
                                if (inputError) setInputError('');
                              }}
                              placeholder="กรอกตัวเลขไมล์เริ่มต้นออกเดินทาง"
                              className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm font-mono font-black leading-normal outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                            />
                            <p className="text-[10px] text-slate-400 font-medium">
                              (ระบบเซ็ตอัตโนมัติ: {getLastVehicleMileage(b.vehicleId, b.id).toLocaleString()} กม.)
                            </p>
                          </div>

                          {/* End Mileage Form Field */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-705 block text-[#aa4e6e] flex items-center justify-between">
                              <span>🏁 ระบุเลขไมล์สะสมหลังเสร็จสิ้นภารกิจ (กม.) *</span>
                              <span className="text-[10px] bg-pink-100 text-[#aa4e6e] px-1.5 py-0.5 rounded font-black">จำเป็น</span>
                            </label>
                            <input
                              type="number"
                              value={endMilInput}
                              onChange={(e) => {
                                setEndMilInput(e.target.value);
                                if (inputError) setInputError('');
                              }}
                              placeholder="กรอกตัวเลขไมล์สะสมปัจจุบัน เช่น 134590"
                              className="w-full px-4 py-3 border border-[#aa4e6e] bg-white rounded-xl text-sm font-mono font-black leading-normal outline-none focus:ring-2 focus:ring-rose-100"
                              autoFocus
                            />
                            <p className="text-[10px] text-slate-400 font-medium font-sans">
                              * ป้อนพารามิเตอร์เลขกิโลเมตรล่าสุดจากมาตรวัดเมื่อเดินทางกลับมาถึงปลายทางเสร็จงานเรียบร้อย
                            </p>
                          </div>
                        </div>

                        {/* Error Warning indicator */}
                        {inputError && (
                          <div className="bg-rose-50 border border-rose-250/70 p-3 rounded-xl flex items-start gap-2 text-rose-800 text-xs shadow-xs">
                            <AlertCircle size={15} className="text-rose-600 shrink-0 mt-0.5" />
                            <span className="font-bold">{inputError}</span>
                          </div>
                        )}

                        {/* Sum block feedback */}
                        {currentNetDistance !== null && (
                          <div className="bg-emerald-50 border border-emerald-150 p-3.5 rounded-xl flex items-center justify-between text-xs text-emerald-800">
                            <div className="flex items-center gap-1.5 font-bold">
                              <TrendingUp size={15} className="text-emerald-600" />
                              <span>ระยะสัญจรประมาณการสุทธิจากการคำนวณ:</span>
                            </div>
                            <span className="font-mono text-sm font-black underline">
                              + {currentNetDistance.toLocaleString()} กิโลเมตร
                            </span>
                          </div>
                        )}

                        {/* Submission triggers */}
                        <div className="flex items-center justify-end gap-2.5 pt-2">
                          <button
                            type="button"
                            onClick={handleCancelEditing}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-250 text-slate-600 text-xs font-bold rounded-xl cursor-pointer"
                          >
                            ยกเลิก
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveMileage(b.id)}
                            className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black rounded-xl cursor-pointer flex items-center gap-1.5 shadow-xs"
                          >
                            <CheckCircle2 size={13} />
                            บันทึกเสร็จงาน 🏁
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
