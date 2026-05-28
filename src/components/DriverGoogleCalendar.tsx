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
  onCompleteBookingWithMileage?: (bookingId: string, startMil: number, endMil: number) => void;
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
  // Use May 2026 as default to match pre-populated data, but base it on current or target date
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date('2026-05-27T00:00:00'));
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'list'>('month');
  const [selectedDriverId, setSelectedDriverId] = useState<string>('ALL');
  const [selectedEvent, setSelectedEvent] = useState<Booking | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncSuccess, setSyncSuccess] = useState<boolean>(false);

  // Local mileage editor states
  const [localStartMileage, setLocalStartMileage] = useState<string>('');
  const [localEndMileage, setLocalEndMileage] = useState<string>('');
  const [localMileageError, setLocalMileageError] = useState<string>('');

  useEffect(() => {
    if (selectedEvent) {
      setLocalStartMileage(selectedEvent.startMileage !== undefined ? String(selectedEvent.startMileage) : '0');
      setLocalEndMileage(selectedEvent.endMileage !== undefined ? String(selectedEvent.endMileage) : '');
      setLocalMileageError('');
    } else {
      setLocalStartMileage('');
      setLocalEndMileage('');
      setLocalMileageError('');
    }
  }, [selectedEvent]);

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
      } else {
        d.setMonth(d.getMonth() + 1);
      }
      return d;
    });
  };

  const handleToday = () => {
    setCurrentDate(new Date('2026-05-27T00:00:00'));
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
      default: return 'bg-rose-500';
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
              <span>ตาราง Google Calendar พนักงานขับรถ</span>
              <span className="text-[10px] bg-[#1a73e8] text-white px-2 py-0.5 rounded-full font-sans tracking-wide">GOOGLE SYNC ACTIVE</span>
            </h2>
            <p className="text-xs text-slate-405 font-medium mt-0.5">
              ติดตามสัญจรตารางงานรายสัปดาห์/เดือน ของคุณสมคิด และทีมขับ สนง.พมจ.ตรัง
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
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition duration-150 cursor-pointer ${
                viewMode === 'list' ? 'bg-white text-[#1a73e8] shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              รายการสรุป
            </button>
          </div>

          {/* Sync Button */}
          <button
            type="button"
            onClick={handleGoogleCalendarSync}
            disabled={isSyncing}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 shadow-2xs transition-all duration-150 ease-out cursor-pointer ${
              syncSuccess 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-250' 
                : 'bg-white text-[#1a73e8] border-slate-200 hover:bg-slate-50'
            }`}
          >
            {isSyncing ? (
              <>
                <RefreshCw size={14} className="animate-spin text-slate-400" />
                <span>กำลังกรองและตรวจแถว...</span>
              </>
            ) : syncSuccess ? (
              <>
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span>ผสาน Google Calendar สำเร็จ!</span>
              </>
            ) : (
              <>
                <RefreshCw size={14} className="text-[#1a73e8]" />
                <span>ลิงก์ซิงค์ Google Calendar</span>
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
                const isToday = cell.isoStr === '2026-05-27'; // Fixed system context/local mock today
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
                            <span className="font-mono font-bold shrink-0">{formatTime(b.startDate)}</span>
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
            {/* Days header column */}
            <div className="grid grid-cols-7 gap-2 text-center">
              {weekDays.map(cell => {
                const isToday = cell.isoStr === '2026-05-27';
                return (
                  <div 
                    key={cell.isoStr} 
                    className={`p-2.5 rounded-xl border ${
                      isToday 
                        ? 'bg-blue-50 border-[#1a73e8]/30 shadow-xs' 
                        : 'bg-slate-50 border-slate-150'
                    }`}
                  >
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{cell.name}</div>
                    <div className={`text-base font-black font-mono mt-0.5 ${isToday ? 'text-[#1a73e8]' : 'text-slate-700'}`}>
                      {cell.dayNum}
                    </div>
                    {isToday && (
                      <span className="text-[8px] bg-[#1a73e8] text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-tight">Today</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Main Hourly Timeline Columns styled like Google Calendar */}
            <div className="grid grid-cols-7 gap-2 mt-4 bg-slate-50/50 p-2.5 rounded-2xl border border-slate-200/60 min-h-[350px]">
              {weekDays.map(cell => {
                const dayBookings = getDayBookings(cell.isoStr);
                const isToday = cell.isoStr === '2026-05-27';

                return (
                  <div key={cell.isoStr} className={`space-y-2.5 min-h-[300px] flex flex-col justify-start rounded-xl p-1.5 relative ${
                    isToday ? 'bg-blue-50/15' : ''
                  }`}>
                    {dayBookings.length === 0 ? (
                      <div className="flex-1 border border-dashed border-slate-200 rounded-lg flex items-center justify-center text-[10px] text-slate-350 font-bold p-2 text-center select-none bg-white">
                        ไม่มีงานปฏิทิน
                      </div>
                    ) : (
                      dayBookings.map(b => {
                        const driver = b.driverId === 'self-drive' ? { name: 'ขับเอง' } : drivers.find(d => d.id === b.driverId);
                        const v = vehicles.find(veh => veh.id === b.vehicleId);
                        return (
                          <div
                            key={b.id}
                            onClick={() => setSelectedEvent(b)}
                            className={`p-2.5 rounded-xl border flex flex-col justify-between gap-1.5 transition duration-150 hover:shadow-xs text-xs cursor-pointer ${getEventBadgeColor(b.status, b.driverId)}`}
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1 text-[10px] font-extrabold font-mono">
                                <Clock size={11} className="shrink-0" />
                                <span>{b.endDate ? `${formatTime(b.startDate)} - ${formatTime(b.endDate)}` : `${formatTime(b.startDate)} น. เป็นต้นไป`}</span>
                              </div>
                              <h4 className="font-extrabold text-slate-850 line-clamp-2 leading-tight" title={b.destination}>
                                {b.destination}
                              </h4>
                            </div>

                            <div className="pt-1.5 border-t border-slate-100 text-[10px] font-bold text-slate-500 space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <User size={10} className="shrink-0 text-slate-400" />
                                <span className="truncate">{driver?.name}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Car size={10} className="shrink-0 text-slate-400" />
                                <span className="font-mono text-[9px] uppercase leading-none bg-white/50 px-1 py-0.5 rounded border border-slate-200">{v?.plateNumber || '-'}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                );
              })}
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
                const driver = b.driverId === 'self-drive' ? { name: 'ขับรถเอง' } : drivers.find(d => d.id === b.driverId);
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
                      <p className="mt-0.5 text-slate-800 font-extrabold text-[10.5px] truncate" title={selectedEvent.driverId === 'self-drive' ? 'ขับรถยนต์ราชการด้วยตนเอง' : drivers.find(d => d.id === selectedEvent.driverId)?.name || 'รอมอบหมาย'}>
                        {selectedEvent.driverId === 'self-drive' ? 'ขับรถยนต์เอง' : drivers.find(d => d.id === selectedEvent.driverId)?.name || 'รอมอบหมาย'}
                      </p>
                      {selectedEvent.driverId !== 'self-drive' && drivers.find(d => d.id === selectedEvent.driverId)?.phone && (
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
                      🏁 บันทึกเลขไมล์เดินทาง
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-0.5">
                        <label className="text-[9px] font-extrabold text-slate-500 block">ไมล์เริ่มต้น (กม.)</label>
                        <input
                          type="number"
                          value={localStartMileage}
                          onChange={(e) => setLocalStartMileage(e.target.value)}
                          placeholder="0"
                          className="w-full px-2 py-0.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold outline-none"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[9px] font-extrabold text-[#a22055] block">ไมล์ขากลับ (กม.) *</label>
                        <input
                          type="number"
                          value={localEndMileage}
                          onChange={(e) => {
                            setLocalEndMileage(e.target.value);
                            if (localMileageError) setLocalMileageError('');
                          }}
                          placeholder="เลขไมล์"
                          className="w-full px-2 py-0.5 bg-white border border-[#a22055]/30 rounded-lg text-xs font-mono font-bold outline-none"
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
              <div className="bg-slate-50 border-t border-slate-150 px-5 py-3 flex justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const calcEndDate = selectedEvent.endDate || new Date(new Date(selectedEvent.startDate).getTime() + (4 * 60 * 60 * 1000)).toISOString();
                    const gUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('จองรถราชการ: ' + selectedEvent.destination)}&details=${encodeURIComponent(selectedEvent.purpose + ' - ขอโดย ' + selectedEvent.requesterName)}&dates=${encodeURIComponent(selectedEvent.startDate.replace(/[-:]/g, ''))}/${encodeURIComponent(calcEndDate.replace(/[-:]/g, ''))}`;
                    window.open(gUrl, '_blank');
                  }}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-bold rounded-xl text-slate-600 transition flex items-center gap-1 cursor-pointer"
                >
                  <ExternalLink size={11} />
                  เปิดใน Google Calendar
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="px-3 py-1.5 bg-slate-850 hover:bg-slate-900 text-white text-[10px] font-bold rounded-xl transition cursor-pointer"
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
