import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  User, 
  MapPin, 
  Clock, 
  Check, 
  CheckCircle2, 
  RefreshCw, 
  ExternalLink,
  Plus,
  Info,
  Car
} from 'lucide-react';
import { Booking, Driver, Vehicle } from '../types';
import { formatThaiDate, formatTime } from '../utils/bookingUtils';

interface DriverGoogleCalendarProps {
  bookings: Booking[];
  drivers: Driver[];
  vehicles: Vehicle[];
  isAdmin?: boolean;
  onEditBooking?: (booking: Booking) => void;
  onPrintBooking?: (booking: Booking) => void;
  onUpdateStatus?: (bookingId: string, status: 'pending' | 'approved' | 'completed' | 'cancelled' | 'rejected') => void;
  onCompleteBookingWithMileage?: (
    bookingId: string, 
    startMil: number, 
    endMil: number,
    fuelCost?: number,
    fuelLiters?: number,
    fuelType?: string
  ) => void;
}

export default function DriverGoogleCalendar({
  bookings,
  drivers,
  vehicles,
  isAdmin = false,
  onEditBooking,
  onPrintBooking,
  onUpdateStatus,
  onCompleteBookingWithMileage
}: DriverGoogleCalendarProps) {
  // Use current date as default
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day' | 'list'>('month');
  const [selectedDriverId, setSelectedDriverId] = useState<string>('ALL');
  const [selectedEvent, setSelectedEvent] = useState<Booking | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncSuccess, setSyncSuccess] = useState<boolean>(false);

  // Get today's local date string in YYYY-MM-DD
  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const date = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${date}`;
  }, []);

  // Local mileage editor states
  const [localStartMileage, setLocalStartMileage] = useState<string>('');
  const [localEndMileage, setLocalEndMileage] = useState<string>('');
  const [localMileageError, setLocalMileageError] = useState<string>('');

  useEffect(() => {
    if (selectedEvent) {
      let defaultStart = selectedEvent.startMileage;
      if (defaultStart === undefined || defaultStart === null) {
        const targetVehicle = vehicles.find(v => v.id === selectedEvent.vehicleId);
        const vehicleBaseMileage = targetVehicle?.mileage || 0;

        const currentStartTime = new Date(selectedEvent.startDate).getTime();

        // 1. Look up prior bookings chronologically
        const priorBookings = bookings.filter(
          b => b.vehicleId === selectedEvent.vehicleId && 
               b.id !== selectedEvent.id && 
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
          // 2. Look up subsequent bookings
          const subsequentBookings = bookings.filter(
            b => b.vehicleId === selectedEvent.vehicleId &&
                 b.id !== selectedEvent.id &&
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
            // 3. Fallback: lowest of any completed bookings with mileage
            const anyWithMileage = bookings.filter(
              b => b.vehicleId === selectedEvent.vehicleId &&
                   b.id !== selectedEvent.id &&
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

      setLocalStartMileage(String(defaultStart));
      setLocalEndMileage(selectedEvent.endMileage !== undefined && selectedEvent.endMileage !== null ? String(selectedEvent.endMileage) : '');
      setLocalMileageError('');
    } else {
      setLocalStartMileage('');
      setLocalEndMileage('');
      setLocalMileageError('');
    }
  }, [selectedEvent, bookings, vehicles]);

  // Thai months and days
  const THAI_MONTHS_SHORT = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];
  const THAI_MONTHS_LONG = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  const THAI_DAYS_LONG = [
    'อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'
  ];
  const THAI_DAYS_MINI = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

  // Navigate dates
  const handlePrev = () => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      if (viewMode === 'month') {
        d.setMonth(d.getMonth() - 1);
      } else if (viewMode === 'week') {
        d.setDate(d.getDate() - 7);
      } else if (viewMode === 'day') {
        d.setDate(d.getDate() - 1);
      } else {
        d.setMonth(d.getMonth() - 1);
      }
      return d;
    });
  };

  const handleNext = () => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      if (viewMode === 'month') {
        d.setMonth(d.getMonth() + 1);
      } else if (viewMode === 'week') {
        d.setDate(d.getDate() + 7);
      } else if (viewMode === 'day') {
        d.setDate(d.getDate() + 1);
      } else {
        d.setMonth(d.getMonth() + 1);
      }
      return d;
    });
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Google Calendar style Sync simulations
  const handleGoogleCalendarSync = () => {
    setIsSyncing(true);
    setSyncSuccess(false);
    setTimeout(() => {
      setIsSyncing(false);
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 4500);
    }, 1800);
  };

  // Get days list for monthly calendar layout
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevTotalDays = new Date(year, month, 0).getDate();

    const result = [];

    // Prior month days padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const day = prevTotalDays - i;
      const d = new Date(year, month - 1, day);
      result.push({
        day,
        isCurrentMonth: false,
        date: d,
        isoStr: d.toISOString().substring(0, 10)
      });
    }

    // Current month days
    for (let j = 1; j <= totalDays; j++) {
      const d = new Date(year, month, j);
      result.push({
        day: j,
        isCurrentMonth: true,
        date: d,
        isoStr: d.toISOString().substring(0, 10)
      });
    }

    // Next month days padding
    const totalCells = result.length;
    const remaining = totalCells % 7;
    if (remaining > 0) {
      const pad = 7 - remaining;
      for (let k = 1; k <= pad; k++) {
        const d = new Date(year, month + 1, k);
        result.push({
          day: k,
          isCurrentMonth: false,
          date: d,
          isoStr: d.toISOString().substring(0, 10)
        });
      }
    }

    return result;
  }, [currentDate]);

  // Sync / Get current week bounds
  const weekDays = useMemo(() => {
    const d = new Date(currentDate);
    const dayOfWeek = d.getDay();
    const sundayStr = new Date(d);
    sundayStr.setDate(d.getDate() - dayOfWeek);

    const result = [];
    for (let i = 0; i < 7; i++) {
      const temp = new Date(sundayStr);
      temp.setDate(sundayStr.getDate() + i);
      result.push({
        name: THAI_DAYS_MINI[i],
        dayNum: temp.getDate(),
        date: temp,
        isoStr: temp.toISOString().substring(0, 10)
      });
    }
    return result;
  }, [currentDate]);

  // Bookings aligned per day, sorted by start time chronologically
  const getDayBookings = (isoStr: string) => {
    const dayStart = new Date(`${isoStr}T00:00:00`).getTime();
    const dayEnd = new Date(`${isoStr}T23:59:59`).getTime();

    return bookings.filter(b => {
      if (b.status === 'cancelled' || b.status === 'rejected') return false;
      if (selectedDriverId !== 'ALL' && b.driverId !== selectedDriverId) return false;

      const bStart = new Date(b.startDate).getTime();
      const bEnd = b.endDate ? new Date(b.endDate).getTime() : new Date(b.startDate).getTime() + (4 * 60 * 60 * 1000);

      return (bStart <= dayEnd && bEnd >= dayStart);
    }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  };

  // List view filtered bookings (newest first, filtered by driver & month)
  const filteredListBookings = useMemo(() => {
    const startObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endObj = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);

    return bookings.filter(b => {
      if (b.status === 'cancelled' || b.status === 'rejected') return false;
      if (selectedDriverId !== 'ALL' && b.driverId !== selectedDriverId) return false;

      const bTime = new Date(b.startDate).getTime();
      return bTime >= startObj.getTime() && bTime <= endObj.getTime();
    }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [bookings, currentDate, selectedDriverId]);

  // Helper colors for events
  const getEventBadgeColor = (status: string, driverId: string) => {
    if (status === 'completed') return 'bg-emerald-50 text-emerald-700 border-emerald-150';
    if (status === 'pending') return 'bg-amber-50 text-amber-700 border-amber-150 animate-pulse';
    
    // approved -> color-coded by driver
    switch (driverId) {
      case 'D1': return 'bg-orange-50 text-orange-700 border-orange-150';
      case 'D2': return 'bg-amber-50 text-amber-700 border-amber-150';
      case 'D3': return 'bg-emerald-50 text-[#0f766e] border-teal-150';
      case 'D4': return 'bg-sky-50 text-sky-700 border-sky-150';
      case 'D5': return 'bg-violet-50 text-violet-700 border-violet-150';
      case 'self-drive': return 'bg-slate-50 text-slate-700 border-slate-150';
      case 'passenger-drive': return 'bg-emerald-50 text-emerald-700 border-emerald-150';
      default: return 'bg-rose-50 text-rose-700 border-rose-150';
    }
  };

  const getEventBulletColor = (driverId: string) => {
    switch (driverId) {
      case 'D1': return 'bg-orange-500';
      case 'D2': return 'bg-amber-500';
      case 'D3': return 'bg-emerald-600';
      case 'D4': return 'bg-sky-500';
      case 'D5': return 'bg-violet-500';
      case 'self-drive': return 'bg-slate-500';
      case 'passenger-drive': return 'bg-emerald-500';
      default: return 'bg-rose-505';
    }
  };

  return (
    <div id="driver-google-calendar" className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex flex-col font-sans">
      
      {/* Calendar Header */}
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#1a73e8]/10 rounded-xl">
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-[#1a73e8]" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 4H18V2H16V4H8V2H6V4H5C3.89 4 3.01 4.9 3.01 6L3 20C3 21.1 3.89 22 5 22H19C20.1 22 21 21.1 21 20V6C21 4.9 20.1 4 19 4ZM19 20H5V10H19V20ZM19 8H5V6H19V8ZM9 14H7V12H9V14ZM13 14H11V12H13V14ZM17 14H15V12H17V14ZM9 18H7V16H9V18ZM13 18H11V16H13V18ZM17 18H15V16H17V18V18Z" fill="currentColor"/>
            </svg>
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-1.5 leading-tight">
              <span>ตารางเวลาและกำหนดการพนักงานขับรถ</span>
              <span className="text-[10px] bg-[#aa4e6e] text-white px-2 py-0.5 rounded-full font-sans tracking-wide">INTERNAL CALENDAR</span>
            </h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              ติดตามสัญจรตารางงานรายสัปดาห์/เดือน ของพนักงานขับรถยนต์ สนง.พมจ.ตรัง
            </p>
          </div>
        </div>

        {/* Sync Indicator */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Calendar Presets / Type Toggle */}
          <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition duration-150 cursor-pointer ${
                viewMode === 'month' ? 'bg-white text-[#1a73e8] shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              รายเดือน
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition duration-150 cursor-pointer ${
                viewMode === 'week' ? 'bg-white text-[#1a73e8] shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              รายสัปดาห์
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition duration-150 cursor-pointer ${
                viewMode === 'day' ? 'bg-white text-[#1a73e8] shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              รายวัน
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition duration-150 cursor-pointer ${
                viewMode === 'list' ? 'bg-white text-[#1a73e8] shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              รายการสรุป
            </button>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={handleGoogleCalendarSync}
            disabled={isSyncing}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 shadow-2xs transition-all duration-150 ease-out cursor-pointer ${
              syncSuccess 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-250' 
                : 'bg-white text-[#aa4e6e] border-slate-200 hover:bg-slate-50'
            }`}
          >
            {isSyncing ? (
              <>
                <RefreshCw size={14} className="animate-spin text-slate-400" />
                <span>กำลังโหลดข้อมูลล่าสุด...</span>
              </>
            ) : syncSuccess ? (
              <>
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span>รีเฟรชข้อมูลเสร็จสิ้น!</span>
              </>
            ) : (
              <>
                <RefreshCw size={14} className="text-[#aa4e6e]" />
                <span>รีเฟรชตารางเวลา</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Action Filters Section */}
      <div className="border-b border-slate-150 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
        
        {/* Date Selector Navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleToday}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 shadow-2xs cursor-pointer"
          >
            วันนี้
          </button>
          
          <button
            onClick={handlePrev}
            className="p-1 px-1.5 hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-600 cursor-pointer"
            title="ก่อนหน้า"
          >
            <ChevronLeft size={16} />
          </button>

          <button
            onClick={handleNext}
            className="p-1 px-1.5 hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-600 cursor-pointer"
            title="ถัดไป"
          >
            <ChevronRight size={16} />
          </button>

          {/* Thai date header display */}
          <h3 className="text-sm font-bold text-slate-800 ml-2">
            {viewMode === 'month' && (
              <span>เดือน{THAI_MONTHS_LONG[currentDate.getMonth()]} {currentDate.getFullYear() + 543}</span>
            )}
            {viewMode === 'week' && (
              <span>
                {weekDays[0].dayNum} {THAI_MONTHS_SHORT[weekDays[0].date.getMonth()]} - {weekDays[6].dayNum} {THAI_MONTHS_LONG[weekDays[6].date.getMonth()]} {weekDays[6].date.getFullYear() + 543}
              </span>
            )}
            {viewMode === 'day' && (
              <span>วัน{THAI_DAYS_LONG[currentDate.getDay()]}ที่ {currentDate.getDate()} {THAI_MONTHS_LONG[currentDate.getMonth()]} {currentDate.getFullYear() + 543}</span>
            )}
            {viewMode === 'list' && (
              <span>รายการเดินทางสุทธิเดือน{THAI_MONTHS_LONG[currentDate.getMonth()]} {currentDate.getFullYear() + 543}</span>
            )}
          </h3>
        </div>

        {/* Driver Filter Selector */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-450 font-bold shrink-0">ค้นหาพนักงานขับ:</span>
          <select
            value={selectedDriverId}
            onChange={(e) => setSelectedDriverId(e.target.value)}
            className="w-full sm:w-56 px-3 py-1.5 bg-white border border-slate-250 rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-[#1a73e8] focus:border-[#1a73e8] text-slate-700"
          >
            <option value="ALL">👤 เลือกพนักงานคนขับทั้งหมด (รวม)</option>
            <option value="self-drive">🚗 ขับรถยนต์ด้วยตนเอง</option>
            <option value="passenger-drive">👥 ผู้ร่วมเดินทางเป็นคนขับ</option>
            {drivers.map(d => (
              <option key={d.id} value={d.id}>
                👨‍✈️ {d.name} {d.status === 'busy' ? '(งานชุก)' : '(ว่าง)'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sync Success Tip */}
      <AnimatePresence>
        {syncSuccess && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-emerald-500 text-white text-[11px] font-semibold px-6 py-2 flex items-center justify-between shadow-inner"
          >
            <div className="flex items-center gap-1.5">
              <Check size={14} className="stroke-[3]" />
              <span>ซิงค์ระบบกับ Google Workspace Calendar ของคุณเรียบร้อยแล้ว โดยจะอัปเดตงานจองรถของ พมจ.ตรัง เข้าสู่คลังปฏิทินส่วนตัวแบบ Real-time</span>
            </div>
            <span className="text-[9px] bg-white/20 px-2 py-0.5 rounded font-bold uppercase">เชื่อมต่อแล้ว</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Driver Color Legend */}
      <div className="px-6 py-2 border-b border-slate-100 bg-slate-50/25 flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] text-slate-500 font-bold">
        <span className="text-[10px] text-slate-400 font-semibold uppercase leading-none self-center mr-1">รหัสพนักงานขับ:</span>
        {drivers.map(d => (
          <div key={d.id} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${getEventBulletColor(d.id)}`} />
            <span className="text-slate-600">{d.name.split(' ')[0]}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
          <span className="text-slate-600">ขับเอง</span>
        </div>
      </div>

      {/* CALENDAR RENDERING SHEETS */}
      <div className="flex-1 bg-white p-4">
        
        {/* VIEW 1: MONTH VIEW */}
        {viewMode === 'month' && (
          <div className="space-y-1 animate-fade-in duration-300">
            {/* Days of week titles */}
            <div className="grid grid-cols-7 gap-1 text-center font-bold text-[11px] text-slate-400 uppercase tracking-widest pb-1 border-b border-slate-100">
              {THAI_DAYS_LONG.map((d, index) => (
                <div key={d} className={`py-1 ${index === 0 ? 'text-rose-500' : index === 6 ? 'text-blue-500' : 'text-slate-400'}`}>
                  {d}
                </div>
              ))}
            </div>

            {/* Monthly Day Grid */}
            <div className="grid grid-cols-7 gap-1 border-b border-r border-slate-100 bg-slate-100/50 rounded-b-xl overflow-hidden shadow-xs">
              {monthDays.map((cell, idx) => {
                const dayBookings = getDayBookings(cell.isoStr);
                const isToday = cell.isoStr === todayStr; // Dynamic local current date
                const hasBookings = dayBookings.length > 0;

                return (
                  <div
                    key={`${cell.isoStr}-${idx}`}
                    className={`min-h-[100px] bg-white border-t border-l border-slate-200/55 p-1.5 flex flex-col justify-between transition-colors relative group/day ${
                      !cell.isCurrentMonth ? 'bg-slate-50/60 opacity-60' : ''
                    } ${isToday ? 'bg-blue-50/25 border-l-blue-300 border-t-blue-300' : ''}`}
                  >
                    {/* Day number */}
                    <div className="flex justify-between items-center">
                      <span className={`text-xs font-extrabold font-mono px-1.5 py-0.5 rounded-full ${
                        isToday ? 'bg-[#1a73e8] text-white' : 'text-slate-500 group-hover/day:text-slate-900'
                      }`}>
                        {cell.day}
                      </span>
                      {isToday && (
                        <span className="text-[9px] text-[#1a73e8] font-black tracking-tighter uppercase font-sans animate-pulse">วันนี้</span>
                      )}
                    </div>

                    {/* Bookings events listed as bars */}
                    <div className="mt-1 flex-1 space-y-1 overflow-y-auto max-h-16 scrollbar-thin">
                      {dayBookings.slice(0, 3).map(b => {
                        const driver = drivers.find(d => d.id === b.driverId);
                        const bulletColor = getEventBulletColor(b.driverId);
                        
                        return (
                          <div
                            key={b.id}
                            onClick={() => setSelectedEvent(b)}
                            className={`px-1.5 py-1 text-[10px] leading-tight rounded-md border font-medium truncate cursor-pointer transition duration-100 flex items-center gap-1 group/event hover:shadow-xs hover:border-slate-350 ${getEventBadgeColor(b.status, b.driverId)}`}
                            title={`${formatTime(b.startDate)} - ${b.destination}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${bulletColor}`} />
                            <span className="font-mono font-bold shrink-0">{formatTime(b.startDate)}{b.endDate ? `-${formatTime(b.endDate)}` : ''}</span>
                            <span className="truncate flex-1 font-bold">{b.destination.split(' ')[0]}</span>
                          </div>
                        );
                      })}
                      {dayBookings.length > 3 && (
                        <div className="text-[9px] text-slate-450 font-bold pl-1 text-center bg-slate-50 border border-slate-200 rounded py-0.5 animate-pulse">
                          +{dayBookings.length - 3} งานจองอื่นๆ
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 2: WEEK VIEW */}
        {viewMode === 'week' && (
          <div className="space-y-1 animate-fade-in duration-300">
            {/* Scrollable Container with synchronized header + grid columns */}
            <div className="overflow-x-auto scrollbar-thin rounded-2xl border border-slate-200 bg-white shadow-xs">
              <div className="min-w-[960px] flex flex-col">
                
                {/* 1. Header Row (X-axis) */}
                <div className="flex border-b border-slate-200 bg-slate-50 select-none divide-x divide-slate-150">
                  {/* Time column spacer */}
                  <div className="w-[70px] shrink-0 flex flex-col items-center justify-center text-[10px] uppercase font-black text-slate-500 py-3 bg-slate-100/50">
                    <div>เวลา</div>
                    <div className="text-[9px] text-slate-400 font-mono">(น.)</div>
                  </div>

                  {/* 7 Day Columns headers */}
                  {weekDays.map(cell => {
                    const isToday = cell.isoStr === todayStr;
                    return (
                      <div 
                        key={cell.isoStr} 
                        className={`flex-1 py-2 px-3 flex flex-col items-center justify-center gap-0.5 ${
                          isToday ? 'bg-blue-50/40' : 'bg-slate-50'
                        }`}
                      >
                        <div className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest">{cell.name}</div>
                        <div className="flex items-center gap-1">
                          <span className={`text-sm font-black font-mono leading-none ${isToday ? 'text-[#1a73e8]' : 'text-slate-700'}`}>
                            {cell.dayNum}
                          </span>
                          {isToday && (
                            <span className="text-[7px] font-sans bg-[#1a73e8] text-white px-1 py-0.5 rounded-sm font-black uppercase leading-none">TODAY</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 2. Scrollable Hour Grid Section */}
                {(() => {
                  const HOUR_HEIGHT = 55; // pixels per hour
                  const START_HOUR = 6;
                  const END_HOUR = 20;
                  const HOURS_COUNT = END_HOUR - START_HOUR; // 14 hours
                  const TOTAL_GRID_HEIGHT = HOURS_COUNT * HOUR_HEIGHT;

                  return (
                    <div className="flex relative divide-x divide-slate-150" style={{ height: `${TOTAL_GRID_HEIGHT}px` }}>
                      
                      {/* Grid Background Horizontal lines */}
                      <div className="absolute inset-0 pointer-events-none flex flex-col justify-start z-0">
                        {Array.from({ length: HOURS_COUNT }).map((_, i) => (
                          <div 
                            key={i} 
                            className="border-b border-dashed border-slate-150 w-full" 
                            style={{ height: `${HOUR_HEIGHT}px` }} 
                          />
                        ))}
                      </div>

                      {/* Left Y-axis Time column */}
                      <div className="w-[70px] shrink-0 flex flex-col bg-slate-50/70 select-none relative z-1 font-mono text-[10px] font-black text-slate-400">
                        {Array.from({ length: HOURS_COUNT }).map((_, i) => {
                          const hr = START_HOUR + i;
                          return (
                            <div 
                              key={hr} 
                              className="flex items-start justify-center pt-1 border-r border-slate-200/35 bg-slate-100/10" 
                              style={{ height: `${HOUR_HEIGHT}px` }}
                            >
                              {String(hr).padStart(2, '0')}:00
                            </div>
                          );
                        })}
                      </div>

                      {/* 7 Lanes corresponding to Days */}
                      {weekDays.map(cell => {
                        const dayBookings = getDayBookings(cell.isoStr);
                        const isToday = cell.isoStr === todayStr;

                        // Red Today timeline indicator
                        const now = new Date();
                        const currentHourDecimal = now.getHours() + now.getMinutes() / 60;
                        const showRedLine = isToday && currentHourDecimal >= START_HOUR && currentHourDecimal <= END_HOUR;
                        const redLineTop = (currentHourDecimal - START_HOUR) * HOUR_HEIGHT;

                        // Calculate column event positions with overlap prevention
                        const computedBookings = dayBookings.map((b) => {
                          const start = new Date(b.startDate);
                          const end = b.endDate ? new Date(b.endDate) : new Date(start.getTime() + 4 * 60 * 60 * 1000);
                          const startDecimal = start.getHours() + start.getMinutes() / 60;
                          const endDecimal = end.getHours() + end.getMinutes() / 60;

                          const clampedStart = Math.max(startDecimal, START_HOUR);
                          const clampedEnd = Math.min(endDecimal, END_HOUR);

                          // Find overlapping bookings
                          const overlaps = dayBookings.filter(other => {
                            if (other.id === b.id) return false;
                            const oStart = new Date(other.startDate);
                            const oEnd = other.endDate ? new Date(other.endDate) : new Date(oStart.getTime() + 4 * 60 * 60 * 1000);
                            const oStartDecimal = oStart.getHours() + oStart.getMinutes() / 60;
                            const oEndDecimal = oEnd.getHours() + oEnd.getMinutes() / 60;

                            const oClampedStart = Math.max(oStartDecimal, START_HOUR);
                            const oClampedEnd = Math.min(oEndDecimal, END_HOUR);

                            return (clampedStart < oClampedEnd && clampedEnd > oClampedStart);
                          });

                          let left = 2;
                          let width = 96;

                          if (overlaps.length > 0) {
                            const allIds = [b.id, ...overlaps.map(o => o.id)].sort();
                            const myPos = allIds.indexOf(b.id);
                            const count = allIds.length;
                            width = 96 / count;
                            left = 2 + myPos * (96 / count);
                          }

                          return {
                            booking: b,
                            clampedStart,
                            clampedEnd,
                            left,
                            width
                          };
                        });

                        return (
                          <div 
                            key={cell.isoStr} 
                            className={`flex-1 relative h-full bg-transparent z-1 ${
                              isToday ? 'bg-blue-50/10' : ''
                            }`}
                          >
                            {/* Today vertical current time ribbon inside lane */}
                            {showRedLine && (
                              <div
                                className="absolute left-0 right-0 h-0.5 bg-rose-500 z-10 pointer-events-none"
                                style={{ top: `${redLineTop}px` }}
                              >
                                <div className="absolute -left-1 -translate-y-1/2 w-2 h-2 rounded-full bg-rose-500 border border-white shadow-sm" />
                              </div>
                            )}

                            {/* Booking Cards inside day lane */}
                            {computedBookings.map(({ booking: b, clampedStart, clampedEnd, left, width }) => {
                              if (clampedStart >= clampedEnd) return null;

                              const topOffset = (clampedStart - START_HOUR) * HOUR_HEIGHT;
                              const eventHeight = Math.max((clampedEnd - clampedStart) * HOUR_HEIGHT, 34); // minimum size

                              const badgeColor = getEventBadgeColor(b.status, b.driverId);
                              const driver = b.driverId === 'self-drive' 
                                ? { name: 'ขับเอง' } 
                                : b.driverId === 'passenger-drive'
                                  ? { name: b.customDriverName ? `ผู้ร่วมขับ (${b.customDriverName})` : 'ขับเอง' }
                                  : drivers.find(d => d.id === b.driverId);

                              const v = vehicles.find(veh => veh.id === b.vehicleId);

                              return (
                                <div
                                  key={b.id}
                                  onClick={() => setSelectedEvent(b)}
                                  title={`${formatTime(b.startDate)} - ${b.endDate ? formatTime(b.endDate) : ''} | ${b.destination} | พนักงานขับ: ${driver?.name || '-'}`}
                                  className={`absolute rounded-xl border p-1 text-[9px] shadow-3xs cursor-pointer select-none transition-all group/bar hover:scale-[1.01] hover:z-20 overflow-hidden flex flex-col justify-between leading-normal ${badgeColor}`}
                                  style={{
                                    top: `${topOffset + 2}px`,
                                    height: `${eventHeight - 4}px`,
                                    left: `${left}%`,
                                    width: `${width}%`
                                  }}
                                >
                                  <div className="font-black text-slate-800 line-clamp-2 leading-tight">
                                    📍 {b.destination.split(' ')[0]}
                                  </div>
                                  <div className="flex flex-col gap-0.5 mt-1 border-t border-slate-400/20 pt-1 text-[8px] font-extrabold text-slate-600">
                                    <div className="truncate flex items-center gap-0.5" title={driver?.name}>
                                      👤 {driver?.name ? (driver.name.startsWith('นาย') || driver.name.startsWith('นาง') ? driver.name.replace(/^(นาย|นางสาว|นาง)\s*/, '') : driver.name.split(' ')[0]) : '-'}
                                    </div>
                                    <div className="truncate flex items-center gap-0.5">
                                      🚗 {v?.plateNumber || '-'}
                                    </div>
                                    <div className="font-mono text-[8.5px] scale-95 origin-left tracking-normal opacity-85 shrink-0">
                                      ⏱️ {formatTime(b.startDate)}-{b.endDate ? formatTime(b.endDate) : ''}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}

                    </div>
                  );
                })()}

              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: SUMMARY LIST VIEW */}
        {viewMode === 'list' && (
          <div className="space-y-3 animate-fade-in duration-300 max-h-[420px] overflow-y-auto pr-1">
            {filteredListBookings.length === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 text-slate-400 text-xs font-medium">
                <CalendarIcon size={32} className="text-slate-300 mb-2" />
                <p>ไม่มีรายการกิจกรรมคนขับในเดือนนี้</p>
              </div>
            ) : (
              filteredListBookings.map(b => {
                const driver = b.driverId === 'self-drive' 
                  ? { name: 'ขับรถเอง' } 
                  : b.driverId === 'passenger-drive'
                    ? { name: b.customDriverName ? `ผู้ร่วมเดินทางขับ (${b.customDriverName})` : 'ผู้ร่วมคณะขับขี่' }
                    : drivers.find(d => d.id === b.driverId);
                const v = vehicles.find(veh => veh.id === b.vehicleId);
                return (
                  <div
                    key={b.id}
                    onClick={() => setSelectedEvent(b)}
                    className="p-3.5 bg-white border border-slate-200/55 rounded-2xl hover:border-slate-300 shadow-2xs hover:shadow-xs transition duration-150 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3.5 group"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="p-2 bg-blue-50 text-[#1a73e8] rounded-xl shrink-0 mt-0.5">
                        <CalendarIcon size={15} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-[#1a73e8] transition">
                          {b.destination}
                        </h4>
                        <p className="text-xs text-slate-450 line-clamp-1">{b.purpose}</p>
                        
                        {/* Date and Time period (ช่วงเวลา) */}
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1.5 text-[11px] text-slate-500 font-semibold">
                          <span className="bg-[#1a73e8]/10 text-[#1a73e8] px-2 py-0.5 rounded-md text-[10px]">
                            วันที่ {formatThaiDate(b.startDate, false)}
                          </span>
                          <span className="flex items-center gap-1 font-mono text-xs text-slate-650 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-150">
                            <Clock size={11} className="text-slate-400" />
                            <span>{b.endDate ? `${formatTime(b.startDate)} - ${formatTime(b.endDate)} น.` : `${formatTime(b.startDate)} น. เป็นต้นไป`}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-800">{driver?.name}</p>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">ทะเบียน {v?.plateNumber || '-'}</p>
                      </div>
                      <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border uppercase whitespace-nowrap ${
                        b.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-150' :
                        b.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-150' : 'bg-blue-50 text-blue-700 border-blue-150'
                      }`}>
                        {b.status === 'completed' ? 'เสร็จสิ้น' : b.status === 'pending' ? 'รออนุมัติ' : 'อนุมัติแล้ว'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* VIEW 4: DAILY TIMELINE VIEW */}
        {viewMode === 'day' && (
          <div className="space-y-4 animate-fade-in duration-300">
            {/* Header for the selected day */}
            <div className="bg-[#1a73e8]/5 border border-[#1a73e8]/10 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#1a73e8] text-white flex flex-col items-center justify-center rounded-xl font-sans shrink-0">
                  <span className="text-[10px] font-bold uppercase leading-none">{THAI_DAYS_MINI[currentDate.getDay()]}</span>
                  <span className="text-lg font-black leading-none mt-1">{currentDate.getDate()}</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 leading-tight">
                    วัน{THAI_DAYS_LONG[currentDate.getDay()]}ที่ {currentDate.getDate()} {THAI_MONTHS_LONG[currentDate.getMonth()]} พ.ศ. {currentDate.getFullYear() + 543}
                  </h4>
                  <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                    มีคิวงานตารางเดินทางทั้งสิ้น {getDayBookings(currentDate.toISOString().substring(0, 10)).length} รายการ
                  </p>
                </div>
              </div>
              <button
                onClick={handleToday}
                className="text-xs font-bold text-[#1a73e8] hover:bg-[#1a73e8]/10 bg-white border border-[#1a73e8]/25 px-3 py-1.5 rounded-xl shadow-2xs cursor-pointer"
              >
                กลับไปที่วันนี้ปัจจุบัน
              </button>
            </div>

            {/* Custom Google Calendar Vertical Hour-Timeline (เวลาบนแกน Y แบบ Google Calendar) */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 overflow-hidden shadow-3xs">
              <div className="flex items-center justify-between mb-3 border-b border-slate-150 pb-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1a73e8] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1a73e8]"></span>
                  </span>
                  <h5 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                    แผนผังเวลาปฏิบัติงานรายชั่วโมง (Daily Hourly Timeline Table)
                  </h5>
                </div>
                <span className="text-[10px] font-bold text-slate-400 font-mono">แกน Y บ่งชี้ชั่วโมงการปฏิบัติงาน (06:00 - 20:00 น.)</span>
              </div>

              {/* Scrollable grid area for hours on Y-axis and columns on X-axis */}
              <div className="overflow-x-auto scrollbar-thin rounded-2xl border border-slate-200 bg-white">
                <div className="min-w-[760px] flex flex-col">
                  
                  {/* Column Headers (X-axis) */}
                  <div className="flex border-b border-slate-200 bg-slate-50 select-none divide-x divide-slate-150">
                    {/* Time cell spacer */}
                    <div className="w-[64px] shrink-0 flex items-center justify-center text-[10px] font-black text-slate-500 py-2.5 font-mono uppercase bg-slate-100/50">
                      เวลา (น.)
                    </div>
                    {/* Drivers column headers */}
                    {(() => {
                      const dayIsoStr = currentDate.toISOString().substring(0, 10);
                      const dayBookings = getDayBookings(dayIsoStr);
                      const timelineColumns = [
                        ...drivers.map(d => ({ id: d.id, name: d.name, type: 'driver' })),
                        { id: 'self-drive', name: 'ขับเอง (ไม่มีคนขับกลาง)', type: 'self' },
                        { id: 'passenger-drive', name: 'ผู้ร่วมคณะขับขี่', type: 'passenger' }
                      ];

                      const filteredColumns = selectedDriverId === 'ALL'
                        ? timelineColumns.filter(col => {
                            if (col.type === 'driver') return true;
                            return dayBookings.some(b => b.driverId === col.id);
                          })
                        : timelineColumns.filter(col => col.id === selectedDriverId);

                      return filteredColumns.map(col => (
                        <div key={col.id} className="flex-1 min-w-[140px] px-3 py-2 flex items-center justify-center gap-1.5 bg-slate-50">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${getEventBulletColor(col.id)}`} />
                          <span className="text-xs font-extrabold text-slate-700 truncate" title={col.name}>
                            {col.name.startsWith('นาย') || col.name.startsWith('นาง') ? col.name.replace(/^(นาย|นางสาว|นาง)\s*/, '') : col.name}
                          </span>
                        </div>
                      ));
                    })()}
                  </div>

                  {/* Main Grid: Y-axis time labels on the left & Multi-column vertical content lanes */}
                  {(() => {
                    const dayIsoStr = currentDate.toISOString().substring(0, 10);
                    const dayBookings = getDayBookings(dayIsoStr);
                    const timelineColumns = [
                      ...drivers.map(d => ({ id: d.id, name: d.name, type: 'driver' })),
                      { id: 'self-drive', name: 'ขับเอง (ไม่มีคนขับกลาง)', type: 'self' },
                      { id: 'passenger-drive', name: 'ผู้ร่วมคณะขับขี่', type: 'passenger' }
                    ];

                    const filteredColumns = selectedDriverId === 'ALL'
                      ? timelineColumns.filter(col => {
                          if (col.type === 'driver') return true;
                          return dayBookings.some(b => b.driverId === col.id);
                        })
                      : timelineColumns.filter(col => col.id === selectedDriverId);

                    const HOUR_HEIGHT = 50; // pixels per hour
                    const START_HOUR = 6;
                    const END_HOUR = 20;
                    const HOURS_COUNT = END_HOUR - START_HOUR; // 14 hours total
                    const TOTAL_GRID_HEIGHT = HOURS_COUNT * HOUR_HEIGHT;

                    // Calculate current time line positioning
                    const now = new Date();
                    const currentHourDecimal = now.getHours() + now.getMinutes() / 60;
                    const isTodayFocus = dayIsoStr === now.toISOString().substring(0, 10);
                    const showRedLine = isTodayFocus && currentHourDecimal >= START_HOUR && currentHourDecimal <= END_HOUR;
                    const redLineTop = (currentHourDecimal - START_HOUR) * HOUR_HEIGHT;

                    return (
                      <div className="flex relative divide-x divide-slate-150" style={{ height: `${TOTAL_GRID_HEIGHT}px` }}>
                        
                        {/* Background Grid Lines across the entire container */}
                        <div className="absolute inset-0 pointer-events-none flex flex-col justify-start z-0">
                          {Array.from({ length: HOURS_COUNT }).map((_, i) => (
                            <div 
                              key={i} 
                              className="border-b border-dashed border-slate-150 w-full" 
                              style={{ height: `${HOUR_HEIGHT}px` }} 
                            />
                          ))}
                        </div>

                        {/* Red Current Time horizontal indicator ribbon */}
                        {showRedLine && (
                          <div
                            className="absolute left-[64px] right-0 h-0.5 bg-rose-500 z-10 pointer-events-none"
                            style={{ top: `${redLineTop}px` }}
                          >
                            <div className="absolute -left-1 -translate-y-1/2 w-2 h-2 rounded-full bg-rose-500 border-2 border-white shadow-sm" />
                          </div>
                        )}

                        {/* Left column: Y-axis hour labels */}
                        <div className="w-[64px] shrink-0 flex flex-col bg-slate-50/70 select-none relative z-1 font-mono text-[9px] font-bold text-slate-400">
                          {Array.from({ length: HOURS_COUNT }).map((_, i) => {
                            const hr = START_HOUR + i;
                            return (
                              <div 
                                key={hr} 
                                className="flex items-start justify-center pt-1 border-r border-slate-200/40 bg-slate-100/10" 
                                style={{ height: `${HOUR_HEIGHT}px` }}
                              >
                                {String(hr).padStart(2, '0')}:00
                              </div>
                            );
                          })}
                        </div>

                        {/* Columns ( Lanes ) for bookings */}
                        {filteredColumns.map(col => {
                          const colBookings = dayBookings.filter(b => b.driverId === col.id);

                          return (
                            <div key={col.id} className="flex-1 min-w-[140px] relative h-full bg-transparent z-1">
                              {colBookings.map(b => {
                                const start = new Date(b.startDate);
                                const end = b.endDate ? new Date(b.endDate) : new Date(start.getTime() + 4 * 60 * 60 * 1000);

                                const startHr = start.getHours() + start.getMinutes() / 60;
                                const endHr = end.getHours() + end.getMinutes() / 60;

                                const clampedStart = Math.max(startHr, START_HOUR);
                                const clampedEnd = Math.min(endHr, END_HOUR);

                                if (clampedStart >= clampedEnd) return null;

                                const topOffset = (clampedStart - START_HOUR) * HOUR_HEIGHT;
                                const eventHeight = Math.max((clampedEnd - clampedStart) * HOUR_HEIGHT, 30); // secure min height

                                const badgeColor = getEventBadgeColor(b.status, b.driverId);

                                return (
                                  <div
                                    key={b.id}
                                    onClick={() => setSelectedEvent(b)}
                                    title={`${formatTime(b.startDate)} - ${b.endDate ? formatTime(b.endDate) : 'เป็นต้นไป'} | ไป: ${b.destination}`}
                                    className={`absolute left-1 right-1 rounded-lg border text-[10px] p-1.5 shadow-3xs cursor-pointer select-none transition-all group/bar hover:scale-[1.01] hover:z-20 overflow-hidden flex flex-col justify-between leading-normal ${badgeColor}`}
                                    style={{
                                      top: `${topOffset + 2}px`,
                                      height: `${eventHeight - 4}px`
                                    }}
                                  >
                                    <div className="font-black text-slate-800 truncate leading-tight">
                                      📍 {b.destination}
                                    </div>
                                    <div className="text-[8px] font-black opacity-85 truncate leading-none mt-1">
                                      ⏱️ {formatTime(b.startDate)} - {b.endDate ? formatTime(b.endDate) : ''} น.
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}

                      </div>
                    );
                  })()}

                </div>
              </div>
            </div>

            {/* List of day bookings */}
            <div className="space-y-3 min-h-[250px]">
              {getDayBookings(currentDate.toISOString().substring(0, 10)).length === 0 ? (
                <div className="h-44 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 text-slate-400 text-xs font-medium">
                  <CalendarIcon size={32} className="text-slate-300 mb-2" />
                  <p>ไม่มีรายการกิจกรรมเดินทางในวันนี้</p>
                </div>
              ) : (
                getDayBookings(currentDate.toISOString().substring(0, 10)).map(b => {
                  const driver = b.driverId === 'self-drive' 
                    ? { name: 'ขับเอง' } 
                    : b.driverId === 'passenger-drive'
                      ? { name: b.customDriverName ? `ผู้ร่วมทริปขับ (${b.customDriverName})` : 'ผู้ร่วมปาร์ตี้ขับ' }
                      : drivers.find(d => d.id === b.driverId);
                  const v = vehicles.find(veh => veh.id === b.vehicleId);
                  return (
                    <div
                      key={b.id}
                      onClick={() => setSelectedEvent(b)}
                      className={`p-4 rounded-2xl border transition duration-150 hover:shadow-xs cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${getEventBadgeColor(b.status, b.driverId)}`}
                    >
                      <div className="flex items-start gap-4 min-w-0">
                        <div className="p-2.5 bg-white/85 rounded-xl text-slate-800 border shadow-3xs shrink-0 mt-0.5 flex flex-col items-center justify-center min-w-[80px] min-h-[55px] border-slate-150 py-2 px-1">
                          <Clock size={13} className="text-[#1a73e8] mb-1" />
                          <span className="text-xs font-bold font-mono text-slate-800 text-center leading-tight">
                            {formatTime(b.startDate)}
                          </span>
                          {b.endDate ? (
                            <>
                              <span className="text-[9px] text-[#1a73e8] font-bold leading-none my-0.5 scale-90">ถึง</span>
                              <span className="text-xs font-bold font-mono text-slate-800 text-center leading-tight">
                                {formatTime(b.endDate)}
                              </span>
                            </>
                          ) : (
                            <span className="text-[9px] text-slate-400 font-medium block text-center leading-none mt-0.5">เป็นต้นไป</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase ${
                            b.status === 'completed' ? 'bg-emerald-500 text-white' :
                            b.status === 'pending' ? 'bg-amber-400 text-slate-900 font-extrabold animate-pulse' : 'bg-[#1a73e8] text-white'
                          }`}>
                            {b.status === 'completed' ? 'เสร็จสิ้น' : b.status === 'pending' ? 'รออนุมัติ' : 'อนุมัติแล้ว'}
                          </span>
                          <h4 className="text-sm font-extrabold text-slate-950 mt-1.5 leading-snug truncate">
                            {b.destination}
                          </h4>
                          <p className="text-xs text-slate-600 mt-0.5 leading-relaxed font-semibold truncate">{b.purpose}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap sm:flex-col items-end gap-2 sm:gap-0.5 shrink-0 w-full sm:w-auto border-t sm:border-0 pt-3 sm:pt-0 border-slate-200/50 text-xs">
                        <div className="flex items-center gap-1.5 font-extrabold text-slate-900">
                          <User size={12} className="text-slate-400" />
                          <span>คนขับ: {driver?.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-bold text-slate-600 sm:mt-1">
                          <Car size={12} className="text-slate-400" />
                          <span className="font-mono text-[10px] bg-white/70 px-1.5 py-0.5 rounded border border-slate-200">{v?.name} ({v?.plateNumber || '-'})</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

      </div>

      {/* EVENT POPUP DETAILS MODAL */}
      <AnimatePresence>
        {selectedEvent && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-2xs flex items-center justify-center p-4 z-50 font-sans" id="calendar-event-modal">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 shadow-2xl rounded-2xl max-w-md w-full overflow-hidden"
            >
              {/* Header */}
              <div className="bg-[#1a73e8] text-white px-4.5 py-3 flex justify-between items-center">
                <div className="space-y-0.5">
                  <span className="text-[9px] bg-white/20 border border-white/10 px-2 py-0.5 rounded font-mono font-black tracking-wider">
                    GOOGLE CALENDAR EVENT (พมจ.ตรัง)
                  </span>
                  <h3 className="text-sm font-black truncate max-w-[280px]" title={selectedEvent.destination}>{selectedEvent.destination}</h3>
                </div>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="p-1 rounded-lg hover:bg-white/10 text-white transition leading-none font-bold text-lg"
                >
                  &times;
                </button>
              </div>

              {/* Body */}
              <div className="p-4 space-y-3 text-xs text-slate-600">
                
                {/* Time */}
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 bg-blue-50 text-[#1a73e8] rounded-xl shrink-0 mt-0.5">
                    <Clock size={13} className="stroke-[2.5]" />
                  </div>
                  <div>
                    <h5 className="font-extrabold text-slate-400 text-[10px] uppercase tracking-wider">วันเวลาออกเดินทาง (กำหนดการ)</h5>
                    <p className="mt-0.5 text-slate-800 font-extrabold text-xs">{formatThaiDate(selectedEvent.startDate)}</p>
                    <p className="text-slate-450 text-[10.5px]">{selectedEvent.endDate ? `ถึง ${formatThaiDate(selectedEvent.endDate)}` : 'เป็นต้นไป'}</p>
                  </div>
                </div>

                {/* Driver & Vehicle Details Grid (Side-by-Side to save vertical space) */}
                <div className="grid grid-cols-2 gap-2.5 pt-0.5">
                  {/* Driver Details */}
                  <div className="flex items-start gap-2 bg-slate-50 border border-slate-200/55 rounded-xl p-2 font-sans min-w-0">
                    <div className="p-1 bg-slate-200/60 text-slate-600 rounded-lg shrink-0 mt-0.5">
                      <User size={12} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h5 className="font-extrabold text-slate-400 text-[9.5px] uppercase tracking-wide">พนักงานขับรถ</h5>
                      <p className="mt-0.5 text-slate-800 font-extrabold text-[10.5px] truncate" title={selectedEvent.driverId === 'self-drive' ? 'ขับรถยนต์ราชการด้วยตนเอง' : selectedEvent.driverId === 'passenger-drive' ? `ผู้ร่วมเดินทางขับเอง (${selectedEvent.customDriverName || 'ไม่ระบุชื่อ'})` : drivers.find(d => d.id === selectedEvent.driverId)?.name || 'รอมอบหมาย'}>
                        {selectedEvent.driverId === 'self-drive' 
                          ? 'ขับรถยนต์เอง' 
                          : selectedEvent.driverId === 'passenger-drive' 
                            ? `ผู้ร่วมเดินทางขับ (${selectedEvent.customDriverName || 'ไม่ระบุชื่อ'})` 
                            : drivers.find(d => d.id === selectedEvent.driverId)?.name || 'รอมอบหมาย'}
                      </p>
                      {selectedEvent.driverId !== 'self-drive' && selectedEvent.driverId !== 'passenger-drive' && drivers.find(d => d.id === selectedEvent.driverId)?.phone && (
                        <p className="text-[#1a73e8] text-[9px] font-black mt-0.5 truncate">
                          📞 {drivers.find(d => d.id === selectedEvent.driverId)?.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Vehicle Details */}
                  <div className="flex items-start gap-2 bg-slate-50 border border-slate-200/55 rounded-xl p-2 font-sans min-w-0">
                    <div className="p-1 bg-slate-200/60 text-slate-600 rounded-lg shrink-0 mt-0.5">
                      <Car size={12} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h5 className="font-extrabold text-slate-400 text-[9.5px] uppercase tracking-wide">พาหนะที่จัดสรร</h5>
                      <p className="mt-0.5 text-slate-800 font-extrabold text-[10.5px] truncate" title={vehicles.find(v => v.id === selectedEvent.vehicleId)?.name || 'ไม่ระบุ'}>
                        {vehicles.find(v => v.id === selectedEvent.vehicleId)?.name || 'ไม่ระบุ'}
                      </p>
                      <p className="text-[#a22055] text-[10px] font-black font-mono mt-0.5">
                        ทะเบียน {vehicles.find(v => v.id === selectedEvent.vehicleId)?.plateNumber || '-'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Purpose details */}
                <div className="flex items-start gap-2.5 pt-0.5">
                  <div className="p-1.5 bg-slate-100 text-slate-500 rounded-xl shrink-0 mt-0.5">
                    <MapPin size={13} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="font-extrabold text-slate-400 text-[10px] uppercase tracking-wider">วัตถุประสงค์โดยย่อ</h5>
                    <p className="mt-0.5 text-slate-705 font-bold text-xs leading-normal">{selectedEvent.purpose}</p>
                    <div className="mt-1 bg-slate-50/70 border border-slate-200/30 rounded-lg p-1.5 text-[10px] text-slate-500">
                      <span className="font-bold text-slate-600">ผู้ยื่น:</span> {selectedEvent.requesterName} ({selectedEvent.department})
                    </div>
                  </div>
                </div>

                {/* Mileage input block if approved */}
                {selectedEvent.status === 'approved' && (
                  <div className="bg-rose-50/40 border border-[#a22055]/15 rounded-xl p-2 space-y-1.5 text-slate-705">
                    <span className="inline-flex px-1.5 py-0.5 rounded bg-[#a22055] text-white text-[8px] font-black uppercase tracking-wider">
                      🏁 บันทึกเลขไมล์ขากลับหลังสิ้นสุดภารกิจ
                    </span>
                    
                    <div className="space-y-1.5 relative">
                      <div className="space-y-0.5">
                        <label className="text-[9px] font-extrabold text-indigo-805 block flex justify-between items-center">
                          <span>📟 แก้ไขเลขไมล์เริ่มต้นเดินทาง (กม.)</span>
                          <span className="text-[8px] bg-indigo-100 text-indigo-800 px-1 rounded font-black">แก้ไขได้ (กรณีสลับคิว)</span>
                        </label>
                        <input
                          type="number"
                          value={localStartMileage}
                          onChange={(e) => {
                            setLocalStartMileage(e.target.value);
                            if (localMileageError) setLocalMileageError('');
                          }}
                          placeholder="พิมพ์เลขไมล์เริ่มต้น"
                          className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold outline-none focus:ring-1 focus:ring-indigo-100 placeholder-slate-300"
                        />
                      </div>

                      <div className="space-y-0.5">
                        <label className="text-[9px] font-extrabold text-[#a22055] block">ป้อนเลขไมล์ขากลับสะสมปัจจุบัน (กม.) *</label>
                        <input
                          type="number"
                          value={localEndMileage}
                          onChange={(e) => {
                            setLocalEndMileage(e.target.value);
                            if (localMileageError) setLocalMileageError('');
                          }}
                          placeholder="พิมพ์เลขไมล์ล่าสุดที่มาตรวัดรถ"
                          className="w-full px-2.5 py-1 bg-white border border-[#a22055] rounded-lg text-xs font-mono font-black outline-none"
                          autoFocus
                        />
                      </div>
                    </div>
                    {localMileageError && (
                      <div className="text-[9px] text-red-650 font-bold">{localMileageError}</div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const startVal = parseInt(localStartMileage, 10);
                        const endVal = parseInt(localEndMileage, 10);
                        if (isNaN(startVal) || startVal < 0) {
                          setLocalMileageError('ไมล์เริ่มต้นไม่ถูกต้อง');
                          return;
                        }
                        if (isNaN(endVal) || endVal <= 0) {
                          setLocalMileageError('ไมล์ขากลับไม่ถูกต้อง');
                          return;
                        }
                        if (endVal < startVal) {
                          setLocalMileageError(`ขากลับต้องไม่น้อยกว่าเริ่มต้น (${startVal})`);
                          return;
                        }
                        if (onCompleteBookingWithMileage) {
                          onCompleteBookingWithMileage(selectedEvent.id, startVal, endVal);
                          setSelectedEvent({
                            ...selectedEvent,
                            status: 'completed' as const,
                            startMileage: startVal,
                            endMileage: endVal
                          });
                        }
                      }}
                      className="w-full py-1 bg-[#a22055] hover:bg-[#8e1d4b] text-white rounded-lg font-bold text-[10px] cursor-pointer text-center block"
                    >
                      บันทึกเสร็จงาน 🏁
                    </button>
                  </div>
                )}

                {/* Show recorded mileage details if completed */}
                {selectedEvent.status === 'completed' && selectedEvent.startMileage !== undefined && (
                  <div className="bg-emerald-50/50 border border-emerald-100/75 rounded-xl p-2 space-y-0.5">
                    <span className="inline-flex px-1 bg-emerald-600 text-white text-[8px] font-black uppercase tracking-wider">
                      ⏱️ ระยะทางไมล์รวม
                    </span>
                    <div className="flex justify-between text-[10px] font-medium pt-1">
                      <span className="text-slate-500">เริ่มต้น:</span>
                      <span className="font-mono font-bold text-slate-805">{selectedEvent.startMileage.toLocaleString()} กม.</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-medium">
                      <span className="text-slate-500">สิ้นสุด:</span>
                      <span className="font-mono font-bold text-slate-805">{selectedEvent.endMileage?.toLocaleString()} กม.</span>
                    </div>
                    <div className="flex justify-between text-[10.5px] border-t border-emerald-150/40 pt-1 mt-1 font-bold">
                      <span className="text-emerald-700">รวมระยะที่วิ่ง:</span>
                      <span className="font-mono text-emerald-800">
                        {((selectedEvent.endMileage || 0) - (selectedEvent.startMileage || 0)).toLocaleString()} กม.
                      </span>
                    </div>
                  </div>
                )}

                {/* Action buttons section */}
                <div className="pt-2 border-t border-slate-100 space-y-1">
                  <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                    {isAdmin ? '🛡️ แผงควบคุมผู้ดูแลระบบ (Admin Controls)' : '📋 ชุมชนผู้ใช้งาน (User Actions)'}
                  </div>
                  
                  {isAdmin ? (
                    <div className="grid grid-cols-2 gap-1.5 font-sans">
                      <button
                        type="button"
                        disabled={selectedEvent.status === 'approved' || selectedEvent.status === 'completed'}
                        onClick={() => {
                          if (onUpdateStatus) onUpdateStatus(selectedEvent.id, 'approved');
                          setSelectedEvent(null);
                        }}
                        className={`w-full py-1 border rounded-lg font-bold text-[10.5px] flex items-center justify-center gap-1 transition-all cursor-pointer ${
                          selectedEvent.status === 'approved' || selectedEvent.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100 opacity-70 cursor-not-allowed'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        <span>✅ อนุมัติใบใช้รถ</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (onEditBooking) onEditBooking(selectedEvent);
                          setSelectedEvent(null);
                        }}
                        className="w-full py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg font-bold text-[10.5px] flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span>✏️ แก้ไขคำขอ</span>
                      </button>

                      <button
                        type="button"
                        disabled={selectedEvent.status === 'cancelled' || selectedEvent.status === 'rejected'}
                        onClick={() => {
                          if (onUpdateStatus) onUpdateStatus(selectedEvent.id, 'cancelled');
                          setSelectedEvent(null);
                        }}
                        className={`w-full py-1 border rounded-lg font-bold text-[10.5px] flex items-center justify-center gap-1 transition-all cursor-pointer ${
                          selectedEvent.status === 'cancelled' || selectedEvent.status === 'rejected'
                            ? 'bg-rose-50 text-rose-500 border-rose-100 opacity-70 cursor-not-allowed'
                            : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                        }`}
                      >
                        <span>❌ ยกเลิก/ไม่อนุมัติ</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (onPrintBooking) onPrintBooking(selectedEvent);
                          setSelectedEvent(null);
                        }}
                        className="w-full py-1 bg-blue-50 hover:bg-blue-105 text-[#1a73e8] border border-blue-200 rounded-lg font-bold text-[10.5px] flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span>🖨️ พิมพ์ใบขอใช้รถ</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-1 font-sans">
                      <button
                        type="button"
                        onClick={() => {
                          if (onEditBooking) onEditBooking(selectedEvent);
                          setSelectedEvent(null);
                        }}
                        className="w-full py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span>✏️ แก้ไข</span>
                      </button>

                      <button
                        type="button"
                        disabled={selectedEvent.status === 'cancelled' || selectedEvent.status === 'rejected'}
                        onClick={() => {
                          if (onUpdateStatus) onUpdateStatus(selectedEvent.id, 'cancelled');
                          setSelectedEvent(null);
                        }}
                        className={`w-full py-1 border rounded-lg font-bold text-[10px] flex items-center justify-center gap-0.5 cursor-pointer ${
                          selectedEvent.status === 'cancelled' || selectedEvent.status === 'rejected'
                            ? 'bg-rose-50 text-rose-500 border-rose-100 opacity-70 cursor-not-allowed'
                            : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                        }`}
                      >
                        <span>❌ ยกเลิก</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (onPrintBooking) onPrintBooking(selectedEvent);
                          setSelectedEvent(null);
                        }}
                        className="w-full py-1 bg-blue-50 hover:bg-[#1a73e8]/10 text-[#1a73e8] border border-blue-200 rounded-lg font-bold text-[10px] flex items-center justify-center gap-0.5 cursor-pointer"
                      >
                        <span>🖨️ พิมพ์</span>
                      </button>
                    </div>
                  )}
                </div>

              </div>

              {/* Action columns footer */}
              <div className="bg-slate-50 border-t border-slate-150 px-5 py-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
