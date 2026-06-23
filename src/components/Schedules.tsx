import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Car, 
  User, 
  MapPin, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  AlertTriangle,
  Info,
  Briefcase,
  Users
} from 'lucide-react';
import { Booking, Vehicle, Driver } from '../types';
import { formatThaiDate, isOverlapping, formatTime } from '../utils/bookingUtils';

interface SchedulesProps {
  bookings: Booking[];
  vehicles: Vehicle[];
  drivers: Driver[];
  onSelectBooking: (booking: Booking) => void;
}

export default function Schedules({
  bookings,
  vehicles,
  drivers,
  onSelectBooking
}: SchedulesProps) {
  
  // Date selection state (Defaults to Today's date dynamically)
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [viewType, setViewType] = useState<'vehicles' | 'drivers'>('drivers');

  const todayLabel = useMemo(() => {
    const today = new Date();
    const thaiMonthsShort = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];
    return `${today.getDate()} ${thaiMonthsShort[today.getMonth()]} ${today.getFullYear() + 543}`;
  }, []);

  // Change date helpers
  const handlePrevDay = () => {
    setSelectedDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 1);
      return d;
    });
  };

  const handleNextDay = () => {
    setSelectedDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 1);
      return d;
    });
  };

  const handleResetToToday = () => {
    setSelectedDate(new Date());
  };

  // Get start and end timestamp of selected day
  const dayBounds = useMemo(() => {
    const start = new Date(selectedDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(selectedDate);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }, [selectedDate]);

  // Identify bookings for the selected day
  const bookingsForSelectedDay = useMemo(() => {
    return bookings.filter(b => {
      if (b.status === 'cancelled' || b.status === 'rejected') return false;
      
      const bStart = new Date(b.startDate).getTime();
      const bEnd = b.endDate ? new Date(b.endDate).getTime() : new Date(b.startDate).getTime() + (4 * 60 * 60 * 1000);
      const dayStart = dayBounds.start.getTime();
      const dayEnd = dayBounds.end.getTime();
      
      // Checking intersection of booking time with selected day
      return (bStart <= dayEnd) && (bEnd >= dayStart);
    });
  }, [bookings, dayBounds]);

  // Check overall database for conflicts/overlaps
  const globalConflicts = useMemo(() => {
    const carConflicts: { [key: string]: Booking[] } = {};
    const driverConflicts: { [key: string]: Booking[] } = {};
    
    // Check overlapping approved/pending bookings
    const activeBookings = bookings.filter(b => b.status === 'approved' || b.status === 'pending');
    
    for (let i = 0; i < activeBookings.length; i++) {
      for (let j = i + 1; j < activeBookings.length; j++) {
        const b1 = activeBookings[i];
        const b2 = activeBookings[j];
        
        if (isOverlapping(b1.startDate, b1.endDate, b2.startDate, b2.endDate)) {
          // If same vehicle, add to car conflicts
          if (b1.vehicleId === b2.vehicleId) {
            carConflicts[b1.vehicleId] = carConflicts[b1.vehicleId] || [];
            if (!carConflicts[b1.vehicleId].includes(b1)) carConflicts[b1.vehicleId].push(b1);
            if (!carConflicts[b1.vehicleId].includes(b2)) carConflicts[b1.vehicleId].push(b2);
          }
          // If same driver, add to driver conflicts
          if (b1.driverId === b2.driverId && b1.driverId !== 'self-drive' && b1.driverId !== 'passenger-drive') {
            driverConflicts[b1.driverId] = driverConflicts[b1.driverId] || [];
            if (!driverConflicts[b1.driverId].includes(b1)) driverConflicts[b1.driverId].push(b1);
            if (!driverConflicts[b1.driverId].includes(b2)) driverConflicts[b1.driverId].push(b2);
          }
        }
      }
    }
    
    return { carConflicts, driverConflicts };
  }, [bookings]);

  // Format date display in Thai
  const formattedDayHeader = useMemo(() => {
    const months = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    const days = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    
    const dayName = days[selectedDate.getDay()];
    const dateNum = selectedDate.getDate();
    const monthName = months[selectedDate.getMonth()];
    const yearBe = selectedDate.getFullYear() + 543;
    
    return `วัน${dayName}ที่ ${dateNum} ${monthName} ${yearBe}`;
  }, [selectedDate]);

  return (
    <div className="space-y-6" id="schedules-view">
      
      {/* Date Navigation Bar and View Select */}
      <div className="bg-white border border-slate-200/70 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        
        <div className="flex items-center gap-2">
          <Calendar className="text-[#aa4e6e]" size={20} />
          <div className="space-y-0.5 font-sans">
            <h2 className="text-lg font-bold text-slate-900">แผงควบคุมและจัดแจงเที่ยวรถยนต์ราชการ</h2>
            <p className="text-xs text-slate-400">ตรวจสอบความสอดคล้อง ป้องกันการจองชนเวลา ทั้งยานพาหนะและทีมคนขับ</p>
          </div>
        </div>

        {/* Timeline switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl shadow-xs">
          <button
            onClick={() => setViewType('drivers')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
              viewType === 'drivers' 
                ? 'bg-white text-[#aa4e6e] shadow-xs' 
                : 'text-slate-500 hover:text-slate-850'
            }`}
          >
            <User size={13} />
            <span>ตารางเวลาคนขับ (5 คน)</span>
          </button>
          <button
            onClick={() => setViewType('vehicles')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
              viewType === 'vehicles' 
                ? 'bg-white text-[#aa4e6e] shadow-xs' 
                : 'text-slate-500 hover:text-slate-850'
            }`}
          >
            <Car size={13} />
            <span>ตารางใช้งานรถยนต์ (6 คัน)</span>
          </button>
        </div>

      </div>

      {/* Date Picker Controls */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white rounded-2xl border border-slate-800 p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrevDay}
            className="p-2 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition cursor-pointer"
            title="วันก่อนหน้า"
          >
            <ChevronLeft size={20} />
          </button>
          
          <div className="text-center sm:text-left">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">ตารางปฏิบัติภารกิจราชการพมจ.ตรัง</p>
            <h3 className="text-base font-bold text-white mt-0.5">{formattedDayHeader}</h3>
          </div>

          <button
            onClick={handleNextDay}
            className="p-2 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition cursor-pointer"
            title="วันถัดไป"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <button
          onClick={handleResetToToday}
          className="text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-1.5 rounded-lg border border-slate-700/60 transition cursor-pointer"
        >
          กลับสู่วันนี้ ({todayLabel})
        </button>  
      </div>

      {/* Overlap Global Conflict warning alert */}
      {(Object.keys(globalConflicts.carConflicts).length > 0 || Object.keys(globalConflicts.driverConflicts).length > 0) && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-900 flex items-start gap-3.5 shadow-sm">
          <AlertTriangle className="text-red-650 shrink-0 mt-0.5" size={20} />
          <div className="space-y-1">
            <h4 className="font-bold text-sm">ตรวจพบคิวงานลื่นทับหรือชนกันในฐานข้อมูล!</h4>
            <p className="text-xs leading-relaxed text-red-750">
              ระบบตรวจพบตารางภารกิจของรถหรือพนักงานบางส่วนทับซ้อนเวลากัน ซึ่งจะส่งผลให้ยานพาหนะหรือพนักงานไม่สามารถออกปฏิบัติราชการพร้อมกันในเวลาดังกล่าวได้ กรุณาคลิกเข้าไปตรวจสอบในใบขอใช้รถยนต์ด้านล่างเพื่อสับเปลี่ยนหรือยกเลิกตาราง
            </p>
          </div>
        </div>
      )}

      {/* Timeline view based on type selection */}
      {viewType === 'drivers' ? (
        
        // DRIVERS TIMELINE CARDS
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {(() => {
            const selfDriveBookings = bookingsForSelectedDay.filter(b => b.driverId === 'self-drive');
            const passengerDriveBookings = bookingsForSelectedDay.filter(b => b.driverId === 'passenger-drive');
            const displayDrivers = [...drivers];
            if (selfDriveBookings.length > 0) {
              displayDrivers.push({
                id: 'self-drive',
                name: 'ผู้ใช้รถขับขี่เอง (รวมทีม)',
                phone: 'ไม่ต้องใช้พนักงานขับรถ',
                status: 'available',
                avatarColor: 'bg-slate-700 text-white'
              });
            }
            if (passengerDriveBookings.length > 0) {
              displayDrivers.push({
                id: 'passenger-drive',
                name: 'ผู้ร่วมทริปเดินทางเป็นคนขับ',
                phone: 'รายชื่อทีมเวิร์คสแตนบาย',
                status: 'available',
                avatarColor: 'bg-emerald-600 text-white font-black'
              });
            }
            return displayDrivers.map(d => {
              // Bookings assigned to this driver on the selected day
              const dayBookings = bookingsForSelectedDay.filter(b => b.driverId === d.id);
              const isConflicting = !!globalConflicts.driverConflicts[d.id];

              return (
                <div 
                  key={d.id}
                  className={`bg-white border rounded-lg p-5 shadow-sm flex flex-col justify-between space-y-4 ${
                    isConflicting ? 'border-red-200' : 'border-slate-200'
                  }`}
                >
                  {/* Header */}
                  <div className="space-y-1.5 pb-3 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${d.avatarColor}`}>
                        {d.id === 'self-drive' ? <Car size={14} /> : d.id === 'passenger-drive' ? <Users size={14} /> : d.name.substring(3, 5)}
                      </div>
                      {isConflicting && (
                        <span className="p-1 bg-red-105 text-red-650 rounded-full animate-pulse" title="ตารางเวลาคนขับชนกัน">
                          <AlertTriangle size={15} />
                        </span>
                      )}
                    </div>
                    <h4 className="font-extrabold text-slate-800 text-sm whitespace-nowrap overflow-hidden text-ellipsis">{d.name}</h4>
                    <p className="text-[10px] text-slate-400 font-mono font-medium">{d.phone}</p>
                  </div>

                {/* Day Bookings List inside */}
                <div className="flex-1 space-y-3 min-h-24 font-sans">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">ภารกิจวันตรวจวันนี้ ({dayBookings.length} งาน)</p>
                  {dayBookings.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-400 text-xs italic bg-slate-50 border border-dashed border-slate-200 rounded-lg p-4">
                      ว่าง / ไม่มีภารกิจ
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {dayBookings.map(b => {
                        const vehicle = vehicles.find(v => v.id === b.vehicleId);
                        return (
                          <div
                            key={b.id}
                            onClick={() => onSelectBooking(b)}
                            className={`p-2.5 rounded-lg border text-xs cursor-pointer hover:shadow transition ${
                              b.status === 'approved' 
                                ? 'bg-emerald-50/50 border-emerald-100 text-emerald-900' 
                                : 'bg-amber-50/50 border-amber-100 text-amber-900'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-mono font-bold text-[10px]">{b.permitNumber}</span>
                              <span className="px-1.5 py-0.2 bg-white rounded text-[9px] font-black border border-current">
                                {b.status === 'approved' ? 'อนุมัติ' : 'รอลงนาม'}
                              </span>
                            </div>
                            
                            {/* Mission timeline */}
                            <div className="flex items-center gap-1 font-semibold text-slate-700 mb-1">
                              <Clock size={10} className="text-slate-400 shrink-0" />
                              <span>{b.endDate ? `${formatTime(b.startDate)} - ${formatTime(b.endDate)} น.` : `${formatTime(b.startDate)} น. เป็นต้นไป`}</span>
                            </div>

                            {/* Destination */}
                            <div className="flex items-start gap-1 font-bold text-slate-800 mb-0.5">
                              <MapPin size={10} className="text-[#aa4e6e] shrink-0 mt-0.5" />
                              <span className="truncate">{b.destination.split(' ')[0]}</span>
                            </div>

                            {/* Assigned car */}
                            <div className="text-[10px] font-mono font-bold text-slate-705 bg-slate-50 border border-slate-205 px-1 py-0.5 rounded-sm inline-flex items-center gap-1">
                              <Car size={10} className="text-slate-500 shrink-0" />
                              <span>{vehicle?.plateNumber || '-'}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    dayBookings.length > 0 
                      ? 'bg-pink-50 text-pink-700 border border-pink-100' 
                      : 'bg-emerald-50 text-emerald-700'
                  }`}>
                    {dayBookings.length > 0 ? `ปฏิบัติหน้างาน ${dayBookings.length} ช่วง` : 'กำลังสแตนบายว่าง'}
                  </span>
                </div>

              </div>
            );
          });
        })()}
      </div>
      ) : (
        
        // VEHICLES TIMELINE CARDS
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {vehicles.map(v => {
            const dayBookings = bookingsForSelectedDay.filter(b => b.vehicleId === v.id);
            const isConflicting = !!globalConflicts.carConflicts[v.id];

            return (
              <div 
                key={v.id}
                className={`bg-white border rounded-lg p-5 shadow-sm flex flex-col justify-between space-y-4 ${
                  isConflicting ? 'border-red-200' : 'border-slate-200 hover:border-slate-250 shadow-sm'
                }`}
              >
                {/* Header */}
                <div className="space-y-1 pb-3 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-150 text-slate-755 border border-slate-200 rounded">
                      {v.plateNumber}
                    </span>
                    {isConflicting && (
                      <span className="p-1 bg-red-100 text-red-600 rounded-full animate-pulse" title="คันนี้โดนจองเวลาชนกัน">
                        <AlertTriangle size={14} />
                      </span>
                    )}
                  </div>
                  <h4 className="font-extrabold text-slate-900 text-xs md:text-sm line-clamp-1">{v.name}</h4>
                  <p className="text-[10px] text-slate-400 font-sans">ความจุที่นั่ง: {v.capacity} นั่ง</p>
                </div>

                {/* Day Bookings List inside */}
                <div className="flex-1 space-y-3 min-h-24">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">งานของพาหนะวันนี้ ({dayBookings.length} เที่ยว)</p>
                  {dayBookings.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-400 text-xs italic bg-slate-50 border border-dashed border-slate-200 rounded-lg p-4 font-bold">
                      สแตนบายว่าง
                    </div>
                  ) : (
                    <div className="space-y-2">
                       {dayBookings.map(b => {
                        const driver = b.driverId === 'self-drive'
                          ? { id: 'self-drive', name: 'ขับรถยนต์ด้วยตนเอง', phone: '-', status: 'available' as const, avatarColor: 'bg-slate-600' }
                          : b.driverId === 'passenger-drive'
                            ? { id: 'passenger-drive', name: b.customDriverName ? `ผู้ร่วมทริปขับ (${b.customDriverName})` : 'ผู้ร่วมเดินทางเป็นคนขับ', phone: '-', status: 'available' as const, avatarColor: 'bg-emerald-600' }
                            : drivers.find(d => d.id === b.driverId);
                        return (
                          <div
                            key={b.id}
                            onClick={() => onSelectBooking(b)}
                            className={`p-2.5 rounded-lg border text-xs cursor-pointer hover:shadow transition ${
                              b.status === 'approved' 
                                ? 'bg-emerald-50/50 border-emerald-100 text-emerald-955' 
                                : 'bg-amber-50/50 border-amber-100 text-amber-955'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-mono font-bold text-[10px]">{b.permitNumber}</span>
                              <span className="px-1.5 py-0.2 bg-white rounded text-[9px] font-black border border-current">
                                {b.status === 'approved' ? 'อนุมัติ' : 'รอลงนาม'}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-1 font-semibold text-slate-700 mb-1">
                              <Clock size={10} className="text-slate-400 shrink-0" />
                              <span>{b.endDate ? `${formatTime(b.startDate)} - ${formatTime(b.endDate)} น.` : `${formatTime(b.startDate)} น. เป็นต้นไป`}</span>
                            </div>

                            <div className="flex items-start gap-1 font-bold text-slate-800 mb-0.5">
                              <MapPin size={10} className="text-[#aa4e6e] shrink-0 mt-0.5" />
                              <span className="truncate">{b.destination.split(' ')[0]}</span>
                            </div>

                            <div className="text-[10px] text-slate-605 bg-slate-50 border border-slate-200 px-1 py-0.5 rounded-sm inline-flex items-center gap-1 truncate max-w-full font-bold">
                              <User size={10} className="text-slate-500 shrink-0" />
                              <span>{driver?.name || '-'}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                    dayBookings.length > 0 
                      ? 'bg-slate-100 text-slate-700 border border-slate-200' 
                      : 'bg-emerald-50 text-emerald-705 border border-emerald-100'
                  }`}>
                    {dayBookings.length > 0 ? `วิ่งปฏิบัติราชการ ${dayBookings.length} รอบ` : 'ว่างไม่มีรอบวิ่ง'}
                  </span>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Information card */}
      <div className="bg-slate-55 border border-slate-200 rounded-xl p-4 flex items-start gap-3 text-slate-600 text-xs">
        <Info size={16} className="text-slate-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">เคล็ดลับการ dispatch ยานพาหนะราชการ:</span> ในกรณีที่คณะเจ้าหน้าที่ต้องการลงตรวจเยี่ยมชาวบ้านกลุ่มเปราะบางในเส้นทางใกล้เคียงกัน ให้พยายามพิจารณาเปลี่ยนไปใช้รถตู้ตัวเดียวกันเพื่อความคุ้มค่าพลังงานและประหยัดงบประมาณน้ำมันเชิ้อเพลิง นอกจากนี้ ควรเว้นช่วงเวลาซักล้างอย่างน้อย 30 นาที และหลีกเลี่ยงตารางที่ชนเวลาของคนขับโดยเด็ดขาด 
        </div>
      </div>

    </div>
  );
}
