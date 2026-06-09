import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Printer, 
  Edit3, 
  Trash2, 
  Car, 
  User, 
  RefreshCw, 
  CalendarRange, 
  CheckCircle,
  XCircle,
  FileText,
  CalendarDays,
  Sparkles
} from 'lucide-react';
import { Booking, Vehicle, Driver } from '../types';
import { DEPARTMENTS } from '../data/initialData';
import { formatThaiDate, translateStatus, translateVehicleType } from '../utils/bookingUtils';
import ConfirmModal from './ConfirmModal';
import { syncBookingToGoogleCalendar } from '../utils/googleCalendarService';

interface BookingListProps {
  bookings: Booking[];
  vehicles: Vehicle[];
  drivers: Driver[];
  onEdit: (booking: Booking) => void;
  onPrint: (booking: Booking) => void;
  onUpdateStatus: (bookingId: string, status: any) => void;
  onAddNew: () => void;
  isAdmin?: boolean;
  onDeleteBooking?: (bookingId: string) => void;
  onCompleteBookingWithMileage?: (bookingId: string, startMil: number, endMil: number) => void;
  googleUser?: any;
  googleToken?: string | null;
  onGoogleSignIn?: () => Promise<string | null>;
  onGoogleSignOut?: () => Promise<void>;
}

export default function BookingList({
  bookings,
  vehicles,
  drivers,
  onEdit,
  onPrint,
  onUpdateStatus,
  onAddNew,
  isAdmin = false,
  onDeleteBooking,
  onCompleteBookingWithMileage,
  googleUser,
  googleToken,
  onGoogleSignIn,
  onGoogleSignOut
}: BookingListProps) {
  
  // Compact date formatter to fit everything without horizontal scrollbar on standard displays
  const formatThaiDateCompact = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const shortMonths = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];
    const day = date.getDate();
    const month = shortMonths[date.getMonth()];
    const year = String(date.getFullYear() + 543).slice(-2);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${year} (${hours}:${minutes})`;
  };

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

  // Local Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedVehicle, setSelectedVehicle] = useState('ALL');
  const [selectedDriver, setSelectedDriver] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  // Google Calendar Sync States
  const [syncingBookingId, setSyncingBookingId] = useState<string | null>(null);

  const handleApproveAndSyncToGoogleCalendar = async (booking: Booking) => {
    setSyncingBookingId(booking.id);

    let activeToken = googleToken;

    // 1. If not logged in, prompt sign in
    if (!activeToken && onGoogleSignIn) {
      try {
        const pResult = await onGoogleSignIn();
        if (pResult) {
          activeToken = pResult;
        } else {
          setSyncingBookingId(null);
          return; // Aborted
        }
      } catch (err) {
        setSyncingBookingId(null);
        return;
      }
    }

    if (!activeToken) {
      setSyncingBookingId(null);
      return;
    }

    try {
      const vehicle = vehicles.find(v => v.id === booking.vehicleId);
      const driver = booking.driverId === 'self-drive' 
        ? { name: 'ขับขี่ด้วยตนเอง', phone: '-' }
        : drivers.find(d => d.id === booking.driverId);

      // Call actual Google Calendar Event creation API
      await syncBookingToGoogleCalendar(booking, vehicle, driver, activeToken);

      // Save sync status in localStorage
      localStorage.setItem(`pmj_sync_calendar_${booking.id}`, 'true');
      
      // Update status to approved
      onUpdateStatus(booking.id, 'approved');
    } catch (err: any) {
      console.error('Calendar integration error:', err);
      // Fallback approval to ensure user is never locked out
      onUpdateStatus(booking.id, 'approved');
      alert(`อนุมัติใบใช้รถเรียบร้อยแล้ว แต่ซิงค์ Google Calendar ขัดข้อง: ${err.message || 'รหัสผ่านพ้นวาระ'} (โปรดล็อกอิน Google ใหม่อีกครั้ง)`);
    } finally {
      setSyncingBookingId(null);
    }
  };

  // Mileage Entry Modal States
  const [mileageModalBooking, setMileageModalBooking] = useState<Booking | null>(null);
  const [startMilInput, setStartMilInput] = useState('');
  const [endMilInput, setEndMilInput] = useState('');
  const [milError, setMilError] = useState('');

  // Handle open mileage modal
  const handleOpenMileageModal = (booking: Booking) => {
    // Find the vehicle's last mileage to pre-fill start mileage if it isn't set yet
    let defaultStart = booking.startMileage;
    if (defaultStart === undefined || defaultStart === null) {
      const targetVehicle = vehicles.find(v => v.id === booking.vehicleId);
      const vehicleBaseMileage = targetVehicle?.mileage || 0;

      const currentStartTime = new Date(booking.startDate).getTime();

      // 1. Look up prior bookings chronologically
      const priorBookings = bookings.filter(
        b => b.vehicleId === booking.vehicleId && 
             b.id !== booking.id && 
             b.status !== 'cancelled' && 
             b.status !== 'rejected' &&
             new Date(b.startDate).getTime() < currentStartTime
      );
      
      let foundMil = 0;
      if (priorBookings.length > 0) {
        const sorted = [...priorBookings].sort(
          (a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
        );
        for (const pb of sorted) {
          if (pb.endMileage !== undefined && pb.endMileage !== null && pb.endMileage > 0) {
            foundMil = pb.endMileage;
            break;
          }
          if (pb.startMileage !== undefined && pb.startMileage !== null && pb.startMileage > 0) {
            foundMil = pb.startMileage;
            break;
          }
        }
      }

      if (foundMil > 0) {
        defaultStart = foundMil;
      } else {
        // 2. Look up subsequent bookings (fallback for out-of-order logs)
        const subsequentBookings = bookings.filter(
          b => b.vehicleId === booking.vehicleId &&
               b.id !== booking.id &&
               b.status !== 'cancelled' &&
               b.status !== 'rejected' &&
               new Date(b.startDate).getTime() >= currentStartTime
        );

        if (subsequentBookings.length > 0) {
          const sortedSubsequent = [...subsequentBookings].sort(
            (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
          );
          for (const pb of sortedSubsequent) {
            if (pb.startMileage !== undefined && pb.startMileage !== null && pb.startMileage > 0) {
              foundMil = pb.startMileage;
              break;
            }
            if (pb.endMileage !== undefined && pb.endMileage !== null && pb.endMileage > 0) {
              foundMil = pb.endMileage;
              break;
            }
          }
        }

        if (foundMil > 0) {
          defaultStart = foundMil;
        } else {
          // 3. Overall minimum of any completed/mileage bookings for this vehicle
          const anyWithMileage = bookings.filter(
            b => b.vehicleId === booking.vehicleId &&
                 b.id !== booking.id &&
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
            if (minMil !== Infinity && minMil > 0) {
              defaultStart = minMil;
            } else {
              defaultStart = vehicleBaseMileage;
            }
          } else {
            defaultStart = vehicleBaseMileage;
          }
        }
      }
    }
    setMileageModalBooking(booking);
    setStartMilInput(String(defaultStart));
    setEndMilInput(booking.endMileage !== undefined && booking.endMileage !== null ? String(booking.endMileage) : '');
    setMilError('');
  };

  const handleSaveMileageModal = () => {
    if (!mileageModalBooking) return;
    
    const startVal = parseInt(startMilInput, 10);
    const endVal = parseInt(endMilInput, 10);

    if (isNaN(startVal) || startVal < 0) {
      setMilError('กรุณากรอกเลขไมล์เริ่มต้นให้ถูกต้อง');
      return;
    }
    if (isNaN(endVal) || endVal === 0) {
      setMilError('กรุณากรอกเลขไมล์สิ้นสุดการเดินทางปัจจุบัน');
      return;
    }
    if (endVal < startVal) {
      setMilError(`เลขไมล์ขากลับ (${endVal.toLocaleString()} กม.) ต้องห้ามน้อยกว่า เลขไมล์เริ่มต้นออกเดินทางภารกิจ (${startVal.toLocaleString()} กม.)`);
      return;
    }

    if (onCompleteBookingWithMileage) {
      onCompleteBookingWithMileage(mileageModalBooking.id, startVal, endVal);
    } else {
      onUpdateStatus(mileageModalBooking.id, 'completed');
    }
    setMileageModalBooking(null);
  };

  // Filter Bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      // 1. Search term (Permit number, Requester, Destination, Purpose)
      const matchesSearch = 
      b.permitNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.purpose.toLowerCase().includes(searchTerm.toLowerCase());

      // 2. Department
      const matchesDept = selectedDept === 'ALL' || b.department === selectedDept;

      // 3. Vehicle
      const matchesVehicle = selectedVehicle === 'ALL' || b.vehicleId === selectedVehicle;

      // 4. Driver
      const matchesDriver = selectedDriver === 'ALL' || b.driverId === selectedDriver;

      // 5. Status
      const matchesStatus = selectedStatus === 'ALL' || b.status === selectedStatus;

      // 6. Date Range Filter
      let matchesDateRange = true;
      if (b.startDate) {
        const docDateStr = b.startDate.substring(0, 10); // "YYYY-MM-DD"
        if (startDateFilter) {
          matchesDateRange = matchesDateRange && (docDateStr >= startDateFilter);
        }
        if (endDateFilter) {
          matchesDateRange = matchesDateRange && (docDateStr <= endDateFilter);
        }
      }

      return matchesSearch && matchesDept && matchesVehicle && matchesDriver && matchesStatus && matchesDateRange;
    }).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()); // newest first
  }, [bookings, searchTerm, selectedDept, selectedVehicle, selectedDriver, selectedStatus, startDateFilter, endDateFilter]);

  // Handle resets
  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedDept('ALL');
    setSelectedVehicle('ALL');
    setSelectedDriver('ALL');
    setSelectedStatus('ALL');
    setStartDateFilter('');
    setEndDateFilter('');
  };

  return (
    <div className="bg-white border border-slate-200/70 rounded-2xl p-6 shadow-xs space-y-6" id="booking-list-view">
      
      {/* Header and Add New button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1 font-sans">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileText className="text-[#a22055]" size={20} />
            ฐานข้อมูลและบันทึกประวัติการขอใช้รถยนต์ราชการ
          </h2>
          <p className="text-xs text-slate-400">
            ระบบจัดคลังเอกสาร ทะเบียนควบคุม และติดตามผลการปฏิบัติราชการ พมจ.ตรัง
          </p>
        </div>
        <button
          onClick={onAddNew}
          className="px-4 py-2 bg-[#a22055] hover:bg-[#8c1c4a] text-white font-semibold rounded-xl text-xs md:text-sm transition flex items-center gap-1.5 cursor-pointer"
          id="btn-add-new-list"
        >
          <CalendarRange size={14} />
          เขียนใบขอใช้รถใบใหม่
        </button>
      </div>

      {/* Advanced Filters Block */}
      <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-705 uppercase tracking-wider">
          <Filter size={13} className="text-[#a22055]" />
          <span>เครื่องมือค้นหาและกรองข้อมูลขั้นสูง</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          
          {/* Keyword Search */}
          <div className="relative col-span-1 lg:col-span-1">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
              <Search size={14} />
            </div>
            <input
              type="text"
              placeholder="ค้นหาชื่อ, เลขที่, ปลายทาง..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-2 w-full bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-[#a22055] focus:border-[#a22055]"
            />
          </div>

          {/* Department */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none font-medium focus:ring-1 focus:ring-[#a22055] focus:border-[#a22055]"
          >
            <option value="ALL">🔍 ทุกกลุ่มงานสังกัด</option>
            {DEPARTMENTS.map((dept, idx) => (
              <option key={idx} value={dept}>{dept}</option>
            ))}
          </select>

          {/* Vehicle */}
          <select
            value={selectedVehicle}
            onChange={(e) => setSelectedVehicle(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none font-medium focus:ring-1 focus:ring-[#a22055] focus:border-[#a22055]"
          >
            <option value="ALL">🚗 คัดกรองตามรถยนต์</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>{v.plateNumber} ({v.name.split(' ')[0]})</option>
            ))}
          </select>

          {/* Driver */}
          <select
            value={selectedDriver}
            onChange={(e) => setSelectedDriver(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none font-medium focus:ring-1 focus:ring-[#a22055] focus:border-[#a22055]"
          >
            <option value="ALL">👤 คัดกรองตามคนขับ</option>
            <option value="self-drive" className="font-semibold text-[#a22055]">🚙 ขับรถยนต์ด้วยตนเอง</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          {/* Status */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none font-medium focus:ring-1 focus:ring-[#a22055] focus:border-[#a22055]"
          >
            <option value="ALL">🔘 คัดด้วยสถานะอนุมัติ</option>
            <option value="pending">รออนุมัติ (Pending)</option>
            <option value="approved">อนุมัติแล้ว (Approved)</option>
            <option value="completed">เสร็จสิ้น (Completed)</option>
            <option value="rejected">ไม่อนุมัติ (Rejected)</option>
            <option value="cancelled">ยกเลิก (Cancelled)</option>
          </select>

        </div>

        {/* Date Range Picker Sub-row */}
        <div className="pt-3 border-t border-slate-200/50 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-3 text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <CalendarRange size={14} className="text-[#a22055]" />
            <span>กรองช่วงเวลาเดินทาง (วันที่ออกเดินทาง):</span>
          </div>
          
          <div className="md:col-span-6 flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              {/* Start Date Selector */}
              <div className="relative flex-1 min-w-[120px]">
                <input
                  type="date"
                  value={startDateFilter}
                  onChange={(e) => setStartDateFilter(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-[#a22055] focus:border-[#a22055] font-sans font-semibold text-slate-700"
                  title="จากวันที่เลือกเดินทางเริ่มต้น"
                />
              </div>
              
              <span className="text-xs text-slate-400 font-extrabold shrink-0">ถึง</span>
              
              {/* End Date Selector */}
              <div className="relative flex-1 min-w-[120px]">
                <input
                  type="date"
                  value={endDateFilter}
                  onChange={(e) => setEndDateFilter(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-[#a22055] focus:border-[#a22055] font-sans font-semibold text-slate-700"
                  title="ถึงวันที่เลือกเดินทางสิ้นสุด"
                />
              </div>

              {/* Quick Clear specifically for the Date Inputs */}
              {(startDateFilter || endDateFilter) && (
                <button
                  type="button"
                  onClick={() => { setStartDateFilter(''); setEndDateFilter(''); }}
                  className="p-1 px-2.5 text-[10px] text-[#a22055] hover:text-[#8c1c4a] bg-rose-50 rounded-md border border-rose-150 font-sans font-bold hover:bg-rose-100 transition shrink-0"
                >
                  ล้างวันที่
                </button>
              )}
            </div>

            {/* Translation indicator helper */}
            {(startDateFilter || endDateFilter) && (
              <div className="text-[10px] text-slate-450 font-semibold px-1 flex items-center gap-1">
                <span>🔍 กรองจาก:</span>
                <span className="text-[#a22055] font-bold">
                  {startDateFilter ? formatThaiDate(startDateFilter, false) : 'เริ่มต้นแรกสุด'}
                </span>
                <span>ถึง</span>
                <span className="text-[#a22055] font-bold">
                  {endDateFilter ? formatThaiDate(endDateFilter, false) : 'สิ้นสุดตาราง'}
                </span>
              </div>
            )}
          </div>

          {/* Quick presets */}
          <div className="md:col-span-3 flex justify-end gap-1.5 self-center">
            <button
              type="button"
              onClick={() => {
                const todayStr = new Date().toISOString().substring(0, 10);
                setStartDateFilter(todayStr);
                setEndDateFilter(todayStr);
              }}
              className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-[10px] font-bold transition duration-150 cursor-pointer shadow-2xs"
            >
              📅 เฉพาะวันนี้
            </button>
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                const nextWeek = new Date();
                nextWeek.setDate(today.getDate() + 7);
                setStartDateFilter(today.toISOString().substring(0, 10));
                setEndDateFilter(nextWeek.toISOString().substring(0, 10));
              }}
              className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-[10px] font-bold transition duration-150 cursor-pointer shadow-2xs"
            >
              👉 7 วันข้างหน้า
            </button>
          </div>
        </div>

        {/* Resets and results counter */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span>พบเอกสารขอจองสิทธิ์ทั้งหมด <span className="font-semibold text-[#a22055]">{filteredBookings.length}</span> รายการ</span>
            {isAdmin ? (
              <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 border border-emerald-150 px-2.5 py-0.5 rounded shadow-xs text-[10px]">
                🔓 โหมดผู้ดูแลระบบ (ตรวจอนุมัติ/แก้ไข/ลบข้อมูลการจองได้ถาวร)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-medium text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded text-[10px]">
                🔒 โหมดผู้ใช้งานทั่วไป (เข้าสู่ระบบ Admin เพื่อลบข้อมูลหลักฐาน)
              </span>
            )}
          </div>
          {(searchTerm || selectedDept !== 'ALL' || selectedVehicle !== 'ALL' || selectedDriver !== 'ALL' || selectedStatus !== 'ALL' || startDateFilter || endDateFilter) && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-[#a22055] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw size={12} />
              ล้างตัวกรองทั้งหมด
            </button>
          )}
        </div>
      </div>

      {/* Main Table Content */}
      <div className="rounded-xl border border-slate-200/75 overflow-hidden shadow-xs">
        {filteredBookings.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 p-8 space-y-2">
            <Filter size={40} className="text-slate-300" />
            <p className="font-semibold text-slate-600 text-sm">ไม่พบข้อมูลที่ตรงกับตัวเลือกการกรองของท่าน</p>
            <p className="text-xs">ลองปรับเงื่อนไขการค้นหา สังกัด คันรถ หรือคนขับ เพื่อเรียกค้นหาใหม่อีกครั้ง</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-auto">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200/70">
                  <th className="py-2.5 px-2.5">เลขขออนุญาต</th>
                  <th className="py-2.5 px-2.5">ผู้ขอใช้รถ / กลุ่มงาน</th>
                  <th className="py-2.5 px-2.5">จุดหมายปลายทาง / ภารกิจ</th>
                  <th className="py-2.5 px-1.5 text-center">จำนวนคณะ</th>
                  <th className="py-2.5 px-2.5">กำหนดเดินทาง</th>
                  <th className="py-2.5 px-2.5">พาหนะ / พนักงาน</th>
                  <th className="py-2.5 px-2 text-center">สถานะ</th>
                  <th className="py-2.5 px-2 text-right">การจัดการเอกสาร</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-705 text-xs">
                {filteredBookings.map((b) => {
                  const vehicle = vehicles.find(v => v.id === b.vehicleId);
                  const driver = b.driverId === 'self-drive'
                    ? { id: 'self-drive', name: 'ขับรถยนต์ด้วยตนเอง', phone: '-', status: 'available' as const, avatarColor: 'bg-slate-600' }
                    : drivers.find(d => d.id === b.driverId);
                  const statusInfo = translateStatus(b.status);

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/50 transition">
                      {/* Permit Number */}
                      <td className="py-2 px-2.5 font-mono font-bold text-[#a22055] whitespace-nowrap">
                        {b.permitNumber}
                      </td>

                      {/* Requester name */}
                      <td className="py-2 px-2.5 max-w-[140px] truncate">
                        <div className="font-extrabold text-slate-900 truncate" title={b.requesterName}>{b.requesterName}</div>
                        <div className="text-[10px] text-slate-400 font-medium mt-0.5 truncate" title={b.department}>{b.department}</div>
                      </td>

                      {/* Destination / Purpose */}
                      <td className="py-2 px-2.5 max-w-[150px] lg:max-w-[200px] truncate">
                        <div className="font-bold text-slate-800 truncate" title={b.destination}>
                          📍 {b.destination}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate mt-0.5" title={b.purpose}>
                          {b.purpose}
                        </div>
                      </td>

                      {/* Capacity */}
                      <td className="py-2 px-1.5 text-center font-bold text-slate-705 whitespace-nowrap relative group">
                        <span className="cursor-help hover:text-[#a22055] transition border-b border-dotted border-slate-350 pb-0.5">
                          👤 {b.passengersCount} คน
                        </span>
                        {b.passengersList && b.passengersList.filter(name => name.trim() !== '').length > 0 && (
                          <div className="absolute z-60 hidden group-hover:block bg-slate-900 text-white text-[11px] p-2.5 rounded-xl shadow-xl -top-1 left-1/2 -translate-x-1/2 -translate-y-full min-w-[200px] text-left border border-slate-700 pointer-events-none">
                            <p className="font-bold border-b border-slate-700 pb-1 mb-1 text-pink-400">📋 รายชื่อผู้ร่วมเดินทาง:</p>
                            <ul className="space-y-0.5 font-semibold list-decimal list-inside text-slate-250">
                              {b.passengersList.filter(name => name.trim() !== '').map((name, i) => (
                                <li key={i} className="truncate">{name}</li>
                              ))}
                            </ul>
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 border-r border-b border-slate-700 rotate-45"></div>
                          </div>
                        )}
                      </td>

                      {/* Departure and returns */}
                      <td className="py-2 px-2.5 whitespace-nowrap text-[11px]">
                        <div className="font-semibold text-slate-700">{formatThaiDateCompact(b.startDate)}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{b.endDate ? `ถึง ${formatThaiDateCompact(b.endDate)}` : 'เป็นต้นไป'}</div>
                      </td>

                      {/* Car & driver */}
                      <td className="py-2 px-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-1 font-bold text-slate-700">
                          <Car size={11} className="text-[#a22055]" />
                          {vehicle?.plateNumber || 'ไม่ระบุ'}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-450 font-medium mt-0.5 max-w-[120px] truncate">
                          <User size={10} />
                          <span className="truncate">{driver?.name || 'ไม่มีคนขับ'}</span>
                        </div>
                        {b.startMileage !== undefined && b.startMileage !== null && (
                          <div className="text-[9px] font-mono font-bold text-slate-500 mt-1 flex items-center gap-1 bg-slate-100/70 border border-slate-200/50 px-1 py-0.5 rounded w-fit leading-none" title={`เลขไมล์: ${b.startMileage} - ${b.endMileage || 'ยังไม่ระบุ'}`}>
                            <span>⏱️ {b.startMileage.toLocaleString()}</span>
                            <span>→</span>
                            <span className={b.status === 'completed' ? 'text-emerald-700 font-extrabold' : 'text-slate-455 font-medium'}>
                              {b.endMileage !== undefined && b.endMileage !== null ? `${b.endMileage.toLocaleString()}` : 'วิ่งอยู...'}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* State status badge */}
                      <td className="py-2 px-2 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold border ${statusInfo.bgClass} ${statusInfo.colorClass} ${statusInfo.borderClass}`}>
                            {statusInfo.label}
                          </span>
                          {localStorage.getItem(`pmj_sync_calendar_${b.id}`) === 'true' && (
                            <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-150 text-[8px] font-bold">
                              <Sparkles size={8} className="text-[#1a73e8]" />
                              <span>ซิงค์แล้ว</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Core actions */}
                      <td className="py-2 px-2 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1 px-1">
                          {/* Quick approval toggles if pending */}
                          {b.status === 'pending' && (
                            isAdmin ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => onUpdateStatus(b.id, 'approved')}
                                  title="อนุมัติทันที"
                                  className="p-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-md transition cursor-pointer"
                                >
                                  <CheckCircle size={13} />
                                </button>
                                
                                <button
                                  disabled={syncingBookingId !== null}
                                  onClick={() => handleApproveAndSyncToGoogleCalendar(b)}
                                  title="อนุมัติและซิงค์ตารางลง Google Calendar"
                                  className="p-1 px-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-150/50 rounded-md transition cursor-pointer flex items-center gap-1 font-bold text-[10px]"
                                >
                                  {syncingBookingId === b.id ? (
                                    <RefreshCw size={11} className="animate-spin text-blue-505" />
                                  ) : (
                                    <CalendarDays size={12} className="text-[#1a73e8]" />
                                  )}
                                  <span>อนุมัติ & ซิงค์ 📅</span>
                                </button>
                              </div>
                            ) : (
                              <button
                                disabled
                                title="เฉพาะแอดมินเท่านั้น"
                                className="p-1 bg-slate-50 text-slate-300 border border-slate-200 rounded-md cursor-not-allowed opacity-60 flex items-center justify-center"
                              >
                                <CheckCircle size={13} />
                              </button>
                            )
                          )}

                          {/* Sync existing approved event to Google Calendar for Admin */}
                          {b.status === 'approved' && isAdmin && localStorage.getItem(`pmj_sync_calendar_${b.id}`) !== 'true' && (
                            <button
                              disabled={syncingBookingId !== null}
                              onClick={() => handleApproveAndSyncToGoogleCalendar(b)}
                              title="ซิงค์ลง Google Calendar"
                              className="px-1.5 py-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-[10px] font-bold rounded-md transition flex items-center gap-1 cursor-pointer"
                            >
                              {syncingBookingId === b.id ? (
                                <RefreshCw size={11} className="animate-spin text-blue-500" />
                              ) : (
                                <CalendarDays size={12} className="text-[#1a73e8]" />
                              )}
                              <span>ซิงค์ Google 📅</span>
                            </button>
                          )}

                          {/* Complete trip with mileage */}
                          {b.status === 'approved' && (
                            <button
                              onClick={() => handleOpenMileageModal(b)}
                              title="เสร็จสิ้นภารกิจและลงเลขไมล์กิโลเมตรสะสมปัจจุบัน"
                              className="px-1.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-[#0f5132] border border-emerald-250/70 rounded-md transition cursor-pointer flex items-center gap-1 font-bold text-[10px]"
                            >
                              <span>เสร็จงาน / ลงไมล์ 🏁</span>
                            </button>
                          )}

                          {/* Print permit button */}
                          <button
                            onClick={() => onPrint(b)}
                            title="พิมพ์ใบขออนุญาตใช้รถยนต์ราชการ"
                            className="p-1 px-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition flex items-center gap-0.5 font-semibold cursor-pointer"
                          >
                            <Printer size={13} className="text-slate-600" />
                            <span className="text-[10px] text-slate-700">พิมพ์</span>
                          </button>

                          {/* Edit button */}
                          <button
                            onClick={() => onEdit(b)}
                            title="แก้ไขใบขออนุญาต"
                            className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition cursor-pointer"
                          >
                            <Edit3 size={13} />
                          </button>

                          {/* Delete/Cancel action */}
                          {b.status !== 'cancelled' ? (
                            <button
                              onClick={() => {
                                setConfirmState({
                                  isOpen: true,
                                  title: 'ยกเลิกใบขอใช้รถยนต์ราชการ',
                                  message: `คุณต้องการยกเลิกใบขออนุญาตฉบับนี้ใช่หรือไม่?\n(เลขนำส่งเอกสาร ${b.permitNumber} จะถูกคงไว้ในระบบเพื่อสลักลายเซ็นต์ โดยปรับสถานะเป็น "ยกเลิกเดินทาง")`,
                                  confirmText: 'ยืนยันยกเลิกคำขอ',
                                  type: 'warning',
                                  onConfirm: () => {
                                    onUpdateStatus(b.id, 'cancelled');
                                    closeConfirm();
                                  }
                                });
                              }}
                              title="ยกเลิกคำขอใช้รถ"
                              className="p-1 bg-rose-50 hover:bg-rose-100 text-[#a22055] rounded-md transition cursor-pointer"
                            >
                              <XCircle size={13} />
                            </button>
                          ) : (
                            <button
                              onClick={() => onUpdateStatus(b.id, 'pending')}
                              title="กู้คืนเพื่อแก้ไข"
                              className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-705 rounded-md transition cursor-pointer"
                            >
                              <RefreshCw size={11} />
                            </button>
                          )}

                          {/* Permanent Delete button (Admin only) */}
                          {isAdmin ? (
                            <button
                              onClick={() => {
                                setConfirmState({
                                  isOpen: true,
                                  title: '⚠️ ลบประวัติการจองถาวร (สิทธิ์เฉพาะ Admin)',
                                  message: `ยืนยันการลบประวัติคำขอใช้รถยนต์เลขที่นำส่ง "${b.permitNumber}" ออกจากสารระบบถาวร?\n\nการลบนี้จะถูกเคลียร์ออกจากคิวความสิ้นสุดถาวรและไม่สามารถย้อนคืนค่าข้อมูลได้`,
                                  confirmText: 'ลบออกจากระบบอย่างปลอดภัยถาวร',
                                  type: 'danger',
                                  onConfirm: () => {
                                    onDeleteBooking && onDeleteBooking(b.id);
                                    closeConfirm();
                                  }
                                });
                              }}
                              title="ลบข้อมูลถาวรออกจากฐานข้อมูล"
                              className="p-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-md transition cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          ) : (
                            <button
                              disabled
                              title="ลบข้อมูลการจองถาวร (เฉพาะแอดมิน)"
                              className="p-1 bg-slate-50 text-slate-300 rounded-md cursor-not-allowed opacity-60"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Render beautiful custom Confirm Modal */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        type={confirmState.type}
        onConfirm={confirmState.onConfirm}
        onCancel={closeConfirm}
      />

      {/* =======================================
          Custom Odometer Recording Modal 
          ======================================= */}
      {mileageModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in font-sans">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-100 shadow-2xl p-6 space-y-6 animate-scale-up">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <span className="inline-flex px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase tracking-wider">
                  🏁 สรุปสิ้นสุดภารกิจเดินทาง
                </span>
                <h3 className="text-base font-extrabold text-slate-900">
                  บันทึกมาตรเลขไมล์ปัจจุบัน
                </h3>
              </div>
              <button 
                onClick={() => setMileageModalBooking(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Event Summary Box */}
            <div className="bg-slate-50 border border-slate-200/50 rounded-xl p-3.5 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-400">เลขใบขอใช้รถ:</span>
                <span className="font-mono font-bold text-[#a22055]">{mileageModalBooking.permitNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-400">ผู้ขออนุญาต:</span>
                <span className="font-bold text-slate-800">{mileageModalBooking.requesterName}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-400">ยานพาหนะ:</span>
                <span className="font-bold text-slate-800">
                  {vehicles.find(v => v.id === mileageModalBooking.vehicleId)?.plateNumber || mileageModalBooking.vehicleId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-400">สถานที่ปลายทาง:</span>
                <span className="font-bold text-slate-800 text-right truncate max-w-48" title={mileageModalBooking.destination}>
                  📍 {mileageModalBooking.destination}
                </span>
              </div>
            </div>

            {/* Input fields */}
            <div className="space-y-4">
              
              {/* Start Mileage (Always editable to handle out-of-order logs) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-750 block flex justify-between">
                  <span className="text-indigo-805 font-bold">📟 เลขไมล์ออกเดินทาง (กม.)</span>
                  <span className="text-[9px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded font-black">
                    แก้ไขได้ (กรณีสลับคิวบันทึก)
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={startMilInput}
                    onChange={(e) => {
                      setStartMilInput(e.target.value);
                      if (milError) setMilError('');
                    }}
                    placeholder="กรอกเลขไมล์เริ่มต้น"
                    className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono font-black text-slate-800 outline-none focus:ring-2 focus:ring-indigo-50 placeholder-slate-300"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-500">กม.</span>
                </div>
              </div>

              {/* End Mileage */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-750 block flex justify-between">
                  <span className="text-[#a22055] font-black">🏁 ระบุเลขไมล์สะสมหลังเสร็จงาน (กม.)</span>
                  <span className="text-rose-600 font-extrabold text-[10px]">* จำเป็น</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={endMilInput}
                    onChange={(e) => {
                      setEndMilInput(e.target.value);
                      if (milError) setMilError('');
                    }}
                    placeholder="กรอกเลขกิโลเมตรล่าสุด เช่น 134590"
                    className="w-full px-4 py-2.5 bg-white border border-[#a22055] rounded-xl text-sm text-slate-850 outline-none focus:ring-2 focus:ring-rose-100 font-mono font-black placeholder-slate-300"
                    autoFocus
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-[#a22055]">กม.</span>
                </div>
              </div>

              {/* Difference breakdown if valid */}
              {parseInt(startMilInput, 10) >= 0 && parseInt(endMilInput, 10) > parseInt(startMilInput, 10) && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-[11px] flex justify-between items-center font-bold">
                  <span>⚡ คำนวณระยะทางสุทธิ:</span>
                  <span className="font-mono text-xs underline font-black">
                    {(parseInt(endMilInput, 10) - parseInt(startMilInput, 10)).toLocaleString()} กม.
                  </span>
                </div>
              )}

              {/* Error readout */}
              {milError && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-xs font-semibold leading-tight">
                  ⚠️ {milError}
                </div>
              )}

            </div>

            {/* Modal Actions */}
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setMileageModalBooking(null)}
                className="flex-1 py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveMileageModal}
                className="flex-1 py-2 bg-[#a22055] hover:bg-[#8c1c4a] text-white rounded-xl text-xs font-extrabold transition shadow-xs cursor-pointer flex items-center justify-center gap-1"
              >
                💾 บันทึกและสรุปงาน
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
