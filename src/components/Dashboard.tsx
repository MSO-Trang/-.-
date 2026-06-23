import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Car, 
  User, 
  Calendar, 
  Briefcase, 
  MapPin, 
  AlertCircle, 
  Clock, 
  ShieldCheck, 
  ChevronRight,
  TrendingUp,
  FileCheck2,
  CheckCircle2,
  Lock,
  Gauge,
  Fuel,
  Coins,
  Droplet,
  Tag,
  BarChart3,
  Lightbulb,
  Leaf
} from 'lucide-react';
import { Booking, Vehicle, Driver } from '../types';
import { formatThaiDate, translateVehicleType } from '../utils/bookingUtils';
import DriverGoogleCalendar from './DriverGoogleCalendar';

interface DashboardProps {
  bookings: Booking[];
  vehicles: Vehicle[];
  drivers: Driver[];
  onNavigate: (tab: 'bookings' | 'form' | 'schedules') => void;
  onSelectBooking: (booking: Booking) => void;
  onCreateBooking: () => void;
  isAdmin?: boolean;
  onAdminLogin?: () => void;
  onUpdateStatus?: (bookingId: string, status: 'pending' | 'approved' | 'completed' | 'cancelled' | 'rejected') => void;
  onEditBooking?: (booking: Booking) => void;
  onCompleteBookingWithMileage?: (
    bookingId: string, 
    startMil: number, 
    endMil: number,
    fuelCost?: number,
    fuelLiters?: number,
    fuelType?: string
  ) => void;
}

export default function Dashboard({ 
  bookings, 
  vehicles, 
  drivers, 
  onNavigate, 
  onSelectBooking,
  onCreateBooking,
  isAdmin = false,
  onAdminLogin,
  onUpdateStatus,
  onEditBooking,
  onCompleteBookingWithMileage
}: DashboardProps) {
  
  const currentTime = useMemo(() => new Date(), []);

  // Date filter states for statistics
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');
  const [activeQuickFilter, setActiveQuickFilter] = useState<string>('all');

  const formatLocalYYYYMMDD = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const date = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${date}`;
  };

  const handleQuickDateFilter = (filterType: string) => {
    setActiveQuickFilter(filterType);
    const today = new Date();
    
    if (filterType === 'all') {
      setStartDateFilter('');
      setEndDateFilter('');
    } else if (filterType === '7days') {
      const pastDate = new Date();
      pastDate.setDate(today.getDate() - 7);
      setStartDateFilter(formatLocalYYYYMMDD(pastDate));
      setEndDateFilter(formatLocalYYYYMMDD(today));
    } else if (filterType === 'thisMonth') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDateFilter(formatLocalYYYYMMDD(startOfMonth));
      setEndDateFilter(formatLocalYYYYMMDD(today));
    } else if (filterType === 'thisYear') {
      const startOfYear = new Date(today.getFullYear(), 0, 1);
      setStartDateFilter(formatLocalYYYYMMDD(startOfYear));
      setEndDateFilter(formatLocalYYYYMMDD(today));
    }
  };

  // Filtered bookings copy specifically for statistics
  const filteredBookingsForStats = useMemo(() => {
    return bookings.filter(b => {
      const bDate = b.startDate ? b.startDate.slice(0, 10) : '';
      if (startDateFilter && bDate < startDateFilter) return false;
      if (endDateFilter && bDate > endDateFilter) return false;
      return true;
    });
  }, [bookings, startDateFilter, endDateFilter]);

  // Quick state toggler in Dashboard for admin approval
  const [pendingApproveId, setPendingApproveId] = useState<string | null>(null);
  const [passcode, setPasscode] = useState('');
  const [loginError, setLoginError] = useState('');

  const handleQuickApproveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === 'admin1234') {
      if (onAdminLogin) onAdminLogin();
      if (onUpdateStatus && pendingApproveId) {
        onUpdateStatus(pendingApproveId, 'approved');
      }
      setPendingApproveId(null);
      setPasscode('');
      setLoginError('');
    } else {
      setLoginError('รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง (ข้อแนะนำ: บัญชีสาธิตใช้ admin1234)');
    }
  };

  const handleAutoLoginAndApprove = () => {
    if (onAdminLogin) onAdminLogin();
    if (onUpdateStatus && pendingApproveId) {
      onUpdateStatus(pendingApproveId, 'approved');
    }
    setPendingApproveId(null);
    setPasscode('');
    setLoginError('');
  };

  // State for interactive charts
  const [hoveredSliceIndex, setHoveredSliceIndex] = useState<number | null>(null);
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);
  const [hoveredMileageIndex, setHoveredMileageIndex] = useState<number | null>(null);

  // Helper to trim long department names for SVG display
  const getShortDeptName = (fullname: string) => {
    if (fullname.includes('พัฒนาและสวัสดิการ')) return 'กลุ่มพัฒนาฯ';
    if (fullname.includes('นโยบาย')) return 'กลุ่มนโยบายฯ';
    if (fullname.includes('คนพิการ')) return 'ศูนย์คนพิการ';
    if (fullname.includes('บริหารทั่วไป')) return 'งานบริหารฯ';
    return fullname.slice(0, 8);
  };

  // Helper to format plate number for small bar chart space
  const getPlateShort = (plate: string) => {
    return plate.replace(' ตรัง', '');
  };

  // Calculate stats based on bookings
  const stats = useMemo(() => {
    // Approved and active bookings or pending
    const approved = bookings.filter(b => b.status === 'approved');
    const pending = bookings.filter(b => b.status === 'pending');
    
    // Check which vehicles and drivers are currently on the road right now (Active travels)
    const nowTime = currentTime.getTime();
    const activeBookings = approved.filter(b => {
      const s = new Date(b.startDate).getTime();
      const e = b.endDate ? new Date(b.endDate).getTime() : new Date(b.startDate).getTime() + (4 * 60 * 60 * 1000);
      return nowTime >= s && nowTime <= e;
    });

    // Busy elements
    const activeVehicleIds = activeBookings.map(b => b.vehicleId);
    const activeDriverIds = activeBookings.map(b => b.driverId);

    // Calculate count of available vehicles and drivers
    const availableVehiclesCount = vehicles.filter(v => v.status === 'available' && !activeVehicleIds.includes(v.id)).length;
    const availableDriversCount = drivers.filter(d => d.status === 'available' && !activeDriverIds.includes(d.id)).length;

    return {
      total: bookings.length,
      approvedCount: approved.length,
      pendingCount: pending.length,
      activeTravelsCount: activeBookings.length,
      availableVehiclesCount,
      availableDriversCount,
      activeBookings
    };
  }, [bookings, vehicles, drivers, currentTime]);

  // Group bookings by Department for the analytics chart
  const departmentStats = useMemo(() => {
    const counts: { [key: string]: number } = {};
    filteredBookingsForStats.forEach(b => {
      if (b.status !== 'cancelled' && b.status !== 'rejected') {
        counts[b.department] = (counts[b.department] || 0) + 1;
      }
    });
    
    const totalValid = Object.values(counts).reduce((a, b) => a + b, 0);
    return Object.keys(counts).map(dept => {
      const value = counts[dept];
      const percentage = totalValid > 0 ? Math.round((value / totalValid) * 100) : 0;
      return { name: dept, value, percentage };
    }).sort((a, b) => b.value - a.value);
  }, [filteredBookingsForStats]);

  // Vehicle utilization (Count of bookings for each vehicle)
  const vehicleStats = useMemo(() => {
    const counts: { [key: string]: number } = {};
    filteredBookingsForStats.forEach(b => {
      if (b.status === 'approved' || b.status === 'completed') {
        counts[b.vehicleId] = (counts[b.vehicleId] || 0) + 1;
      }
    });

    return vehicles.map(v => {
      const count = counts[v.id] || 0;
      return {
        ...v,
        bookingCount: count
      };
    }).sort((a, b) => b.bookingCount - a.bookingCount);
  }, [filteredBookingsForStats, vehicles]);

  // Vehicle total travel distance (using start and end mileages of completed bookings)
  const vehicleMileageStats = useMemo(() => {
    const distances: { [key: string]: number } = {};
    
    // Initialize for all vehicles
    vehicles.forEach(v => {
      distances[v.id] = 0;
    });

    filteredBookingsForStats.forEach(b => {
      if (b.status === 'completed' && b.startMileage !== undefined && b.startMileage !== null && b.endMileage !== undefined && b.endMileage !== null) {
        const sMil = Number(b.startMileage);
        const eMil = Number(b.endMileage);
        if (!isNaN(sMil) && !isNaN(eMil)) {
          const dist = eMil - sMil;
          if (dist > 0) {
            distances[b.vehicleId] = (distances[b.vehicleId] || 0) + dist;
          }
        }
      }
    });

    return vehicles.map(v => {
      return {
        id: v.id,
        name: v.name,
        plateNumber: v.plateNumber,
        imagePlaceholderColor: v.imagePlaceholderColor || '#f1f5f9',
        totalDistance: distances[v.id] || 0
      };
    }).sort((a, b) => b.totalDistance - a.totalDistance);
  }, [filteredBookingsForStats, vehicles]);

  // Helper summary calculations for Mileage Dashboard
  const mileageSummaryGroup = useMemo(() => {
    let totalKm = 0;
    const sortedStats = [...vehicleMileageStats].sort((a, b) => b.totalDistance - a.totalDistance);
    const maxVehicle = sortedStats[0] || null;
    
    vehicleMileageStats.forEach(v => {
      totalKm += v.totalDistance;
    });

    const activeCount = vehicleMileageStats.filter(v => v.totalDistance > 0).length;
    const avgKm = vehicleMileageStats.length > 0 ? (totalKm / vehicleMileageStats.length) : 0;

    return {
      totalKm,
      maxVehicle,
      avgKm,
      activeCount
    };
  }, [vehicleMileageStats]);

  // Fuel Analytics reports and statistics system
  const fuelSummaryGroup = useMemo(() => {
    let totalFuelCost = 0;
    let totalFuelLiters = 0;
    let tripsWithRefuel = 0;

    // Fuel breakdown by vehicle
    const vehicleFuel: { [key: string]: { cost: number; liters: number; count: number } } = {};
    // Fuel breakdown by type
    const typeFuel: { [key: string]: { cost: number; liters: number; count: number } } = {};

    filteredBookingsForStats.forEach(b => {
      if (b.status === 'completed') {
        const cost = b.fuelCost !== undefined && b.fuelCost !== null ? Number(b.fuelCost) : 0;
        const ltr = b.fuelLiters !== undefined && b.fuelLiters !== null ? Number(b.fuelLiters) : 0;
        const type = b.fuelType || 'ไม่ระบุประเภท';

        if (cost > 0) {
          totalFuelCost += cost;
          tripsWithRefuel += 1;

          // Track by vehicle
          if (!vehicleFuel[b.vehicleId]) {
            vehicleFuel[b.vehicleId] = { cost: 0, liters: 0, count: 0 };
          }
          vehicleFuel[b.vehicleId].cost += cost;
          vehicleFuel[b.vehicleId].count += 1;

          // Track by type
          if (!typeFuel[type]) {
            typeFuel[type] = { cost: 0, liters: 0, count: 0 };
          }
          typeFuel[type].cost += cost;
          typeFuel[type].count += 1;
        }

        if (ltr > 0) {
          totalFuelLiters += ltr;
          if (vehicleFuel[b.vehicleId]) {
            vehicleFuel[b.vehicleId].liters += ltr;
          }
          if (typeFuel[type]) {
            typeFuel[type].liters += ltr;
          }
        }
      }
    });

    // Compute vehicle stats
    const vehicleFuelStats = vehicles.map(v => {
      const fuel = vehicleFuel[v.id] || { cost: 0, liters: 0, count: 0 };
      const vDistance = vehicleMileageStats.find(vStat => vStat.id === v.id)?.totalDistance || 0;
      
      return {
        id: v.id,
        name: v.name,
        plateNumber: v.plateNumber,
        fuelCost: fuel.cost,
        fuelLiters: fuel.liters,
        refuelCount: fuel.count,
        kmTravelled: vDistance,
        // Average km/liter
        kmPerLiter: fuel.liters > 0 ? (vDistance / fuel.liters) : 0,
        // Average baht/km
        bahtPerKm: vDistance > 0 ? (fuel.cost / vDistance) : 0
      };
    }).sort((a, b) => b.fuelCost - a.fuelCost);

    // Compute type stats
    const fuelTypeStats = Object.keys(typeFuel).map(typeName => {
      return {
        name: typeName,
        cost: typeFuel[typeName].cost,
        liters: typeFuel[typeName].liters,
        count: typeFuel[typeName].count
      };
    }).sort((a, b) => b.cost - a.cost);

    return {
      totalFuelCost,
      totalFuelLiters,
      tripsWithRefuel,
      vehicleFuelStats,
      fuelTypeStats,
      averageFuelPrice: totalFuelLiters > 0 ? (totalFuelCost / totalFuelLiters) : 0
    };
  }, [filteredBookingsForStats, vehicles, vehicleMileageStats]);

  // Identify status of each vehicle for "Today"
  const vehiclesWithTodayStatus = useMemo(() => {
    const nowTime = currentTime.getTime();
    return vehicles.map(v => {
      // Find if there's an active booking right now
      const activeBooking = bookings.find(b => 
        b.vehicleId === v.id && 
        b.status === 'approved' && 
        nowTime >= new Date(b.startDate).getTime() && 
        nowTime <= (b.endDate ? new Date(b.endDate).getTime() : new Date(b.startDate).getTime() + (4 * 60 * 60 * 1000))
      );

      // Also check if under maintenance
      let status: 'available' | 'busy' | 'maintenance' = 'available';
      if (v.status === 'maintenance') {
        status = 'maintenance';
      } else if (activeBooking) {
        status = 'busy';
      }

      return {
        ...v,
        currentStatus: status,
        activeBooking
      };
    });
  }, [vehicles, bookings, currentTime]);

  // Identify status of each driver for "Today"
  const driversWithTodayStatus = useMemo(() => {
    const nowTime = currentTime.getTime();
    return drivers.map(d => {
      const activeBooking = bookings.find(b => 
        b.driverId === d.id && 
        b.status === 'approved' && 
        nowTime >= new Date(b.startDate).getTime() && 
        nowTime <= (b.endDate ? new Date(b.endDate).getTime() : new Date(b.startDate).getTime() + (4 * 60 * 60 * 1000))
      );

      let status: 'available' | 'busy' | 'off' = 'available';
      if (d.status === 'off') {
        status = 'off';
      } else if (activeBooking) {
        status = 'busy';
      }

      return {
        ...d,
        currentStatus: status,
        activeBooking
      };
    });
  }, [drivers, bookings, currentTime]);

  // List of drivers not on any active missions with 'available' status today
  const freeDrivers = useMemo(() => {
    return driversWithTodayStatus.filter(d => d.currentStatus === 'available');
  }, [driversWithTodayStatus]);

  return (
    <div className="space-y-6" id="dashboard-view">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-[#5a1231] border border-slate-800/80 rounded-2xl p-6 md:p-8 text-white relative overflow-hidden shadow-xs animate-fade-in animate-duration-300">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] hidden lg:block">
          <Car size={320} />
        </div>
        
        {/* Top-right Button Area */}
        <div className="md:absolute md:top-6 md:right-6 lg:top-8 lg:right-8 z-20 mb-4 md:mb-0 flex justify-start md:justify-end">
          <button
            onClick={onCreateBooking}
            className="w-full md:w-auto px-5 py-3 bg-white hover:bg-slate-50 text-[#aa4e6e] font-black rounded-xl transition flex items-center justify-center gap-2 text-xs md:text-sm shadow-md hover:shadow-lg active:scale-98 cursor-pointer transform hover:-translate-y-0.5"
            id="btn-quick-book"
          >
            <Calendar size={16} className="text-[#aa4e6e] stroke-[2.5]" />
            เขียนจองรถยานพาหนะทันที
          </button>
        </div>

        <div className="relative z-10 max-w-4xl space-y-4 font-sans pr-0 md:pr-48 lg:pr-64">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 border border-white/10 text-rose-100 text-xs rounded-full uppercase tracking-wider backdrop-blur-md">
            <span>สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดตรัง (สนง.พมจ.ตรัง)</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white leading-tight">
            ระบบจองและจัดสรรยานพาหนะราชการส่วนกลาง
          </h1>
          <p className="text-slate-300 text-sm md:text-sm leading-relaxed max-w-2xl">
            ยกระดับประสิทธิภาพและความสะดวกในการจัดสัญจร ยานพาหนะ พนักงานขับรถยนต์ 
            พร้อมทั้งพิมพ์ใบอนุญาตใช้รถยนต์ส่วนกลางราชการด้วยเทคโนโลยี
          </p>
          <div className="pt-2 flex flex-wrap gap-2.5">
            <button
              onClick={() => onNavigate('bookings')}
              className="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white border border-white/15 font-semibold rounded-xl transition text-xs md:text-sm cursor-pointer"
              id="btn-quick-manage"
            >
              ดูรายการใบขออนุญาตทั้งหมด
            </button>
          </div>
        </div>
      </div>

      {/* Driver Google Calendar Section */}
      <DriverGoogleCalendar 
        bookings={bookings} 
        drivers={drivers} 
        vehicles={vehicles} 
        isAdmin={isAdmin}
        onEditBooking={onEditBooking}
        onPrintBooking={onSelectBooking}
        onUpdateStatus={onUpdateStatus}
        onCompleteBookingWithMileage={onCompleteBookingWithMileage}
      />

      {/* Active Travels Right Now */}
      <div className="bg-white border border-slate-200/70 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Clock size={18} className="text-[#aa4e6e]" />
            ตารางและกำหนดการเดินทางภารกิจวันนี้
          </h2>
          <button 
            onClick={() => onNavigate('bookings')}
            className="text-xs text-[#aa4e6e] font-semibold hover:underline cursor-pointer"
          >
            ดูทั้งหมด &rarr;
          </button>
        </div>

        {bookings.filter(b => b.status === 'approved' || b.status === 'pending').length === 0 ? (
          <div className="h-32 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-slate-400 text-xs font-sans">
            <p>ไม่มีภารกิจเดินทางในวันนี้</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 text-[10px] uppercase tracking-wider font-bold">
                  <th className="py-3 px-4">เลขขออนุญาต</th>
                  <th className="py-3 px-4">ผู้ขอ / เจตจำนงกลุ่มงาน</th>
                  <th className="py-3 px-4">จุดหมายปลายทาง</th>
                  <th className="py-3 px-4">กำหนดวัน-เวลาเดินทาง</th>
                  <th className="py-3 px-4">พาหนะควบคุม / คนขับ</th>
                  <th className="py-3 px-4 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody>
                {bookings
                  .filter(b => b.status === 'approved' || b.status === 'pending')
                  .slice(0, 5)
                  .map((b) => {
                    const vehicle = vehicles.find(v => v.id === b.vehicleId);
                    const driver = b.driverId === 'self-drive'
                      ? { id: 'self-drive', name: 'ขับรถยนต์ด้วยตนเอง', phone: '-', status: 'available' as const, avatarColor: 'bg-slate-600' }
                      : b.driverId === 'passenger-drive'
                        ? { id: 'passenger-drive', name: b.customDriverName ? `ผู้ร่วมทริปขับ (${b.customDriverName})` : 'ผู้ร่วมเดินทางเป็นคนขับ', phone: '-', status: 'available' as const, avatarColor: 'bg-slate-600' }
                        : drivers.find(d => d.id === b.driverId);
                    return (
                      <tr key={b.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition text-xs">
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold text-[#aa4e6e]">
                            {b.permitNumber}
                          </span>
                          <div className="mt-1">
                            {b.status === 'pending' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                                ● รออนุมัติ
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-150">
                                ● อนุมัติแล้ว
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-900">{b.requesterName}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">{b.department}</p>
                        </td>
                        <td className="py-3.5 px-4 max-w-xs truncate">
                          <p className="font-bold text-slate-800 truncate">{b.destination}</p>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">{b.purpose}</p>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <p className="text-xs font-semibold text-slate-700">{formatThaiDate(b.startDate)}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{b.endDate ? `ถึง ${formatThaiDate(b.endDate)}` : 'เป็นต้นไป'}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="text-xs font-semibold text-[#aa4e6e]">ทะเบียน {vehicle?.plateNumber || '-'}</p>
                          <div className="text-[11px] text-slate-700 font-bold mt-0.5 flex items-center gap-1">
                            {driver ? (
                              <>
                                <User size={11} className="text-slate-400 shrink-0" />
                                <span className="truncate">{driver.name}</span>
                              </>
                            ) : (
                              <>
                                <AlertCircle size={11} className="text-amber-500 shrink-0" />
                                <span className="truncate text-amber-600">รอมอบหมายพลขับ</span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            {b.status === 'pending' && (
                              <button
                                onClick={() => {
                                  if (isAdmin) {
                                    if (onUpdateStatus) onUpdateStatus(b.id, 'approved');
                                  } else {
                                    setPendingApproveId(b.id);
                                  }
                                }}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-black transition flex items-center gap-1 cursor-pointer border border-emerald-650 shadow-2xs"
                                title="กดอนุมัติใบจองสำหรับสัญจรนี้"
                              >
                                <CheckCircle2 size={13} className="stroke-[2.5]" />
                                อนุมัติ
                              </button>
                            )}
                            <button
                              onClick={() => onSelectBooking(b)}
                              className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200/60 text-slate-705 font-bold rounded-lg transition cursor-pointer"
                            >
                              เปิดใบจอง
                            </button>
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

      {/* Unified Resource Status & Monitoring Section */}
      <div className="bg-slate-50/65 border border-slate-200/80 rounded-3xl p-5 md:p-6 space-y-6 shadow-2xs" id="today-resources-group">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-15 pb-4.5 border-b border-slate-200/60">
          <div className="flex items-center gap-2">
            <div className="h-5 w-1.5 rounded-full bg-[#aa4e6e]" />
            <h2 className="text-sm md:text-base font-extrabold text-slate-800 tracking-tight font-sans">
              แผงประเมินและติดตามความพรั่งพร้อมทรัพยากรรายวัน
            </h2>
          </div>
          <span className="text-[10px] font-black text-[#aa4e6e] bg-[#aa4e6e]/5 border border-[#aa4e6e]/10 px-2.5 py-1 rounded-md font-mono uppercase tracking-wider select-none leading-none w-fit">
            ⚡ LIVE OPERATIONAL STATUS
          </span>
        </div>

        {/* KPI Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1 */}
          <div className="bg-white border border-slate-200/70 rounded-2xl p-5 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">กำลังอยู่ระหว่างปฏิบัติราชการ</p>
              <h3 className="text-2xl font-bold text-slate-900 font-mono tracking-tight">{stats.activeTravelsCount} คัน</h3>
              <p className="text-xs text-rose-600 flex items-center gap-1 font-semibold">
                <Clock size={12} />
                ณ เวลาปัจจุบัน
              </p>
            </div>
            <div className="p-3 bg-rose-50/50 border border-rose-100/50 text-[#aa4e6e] rounded-xl">
              <MapPin size={22} className="stroke-[2.25]" />
            </div>
          </div>

          {/* KPI 2 */}
          <button 
            onClick={() => onNavigate('bookings')}
            className="text-left bg-white border border-slate-200/70 hover:border-slate-300 hover:shadow-xs rounded-2xl p-5 shadow-xs flex items-center justify-between transition cursor-pointer"
          >
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">คำขอจองคิวรถที่รอนุมัติ</p>
              <h3 className="text-2xl font-bold text-[#aa4e6e] font-mono tracking-tight">{stats.pendingCount} รายการ</h3>
              <p className="text-xs text-slate-500">รอเลขาและหัวหน้าลงนาม</p>
            </div>
            <div className="p-3 bg-rose-50/50 border border-[#aa4e6e]/15 text-[#aa4e6e] rounded-xl">
              <FileCheck2 size={22} className="stroke-[2.25]" />
            </div>
          </button>

          {/* KPI 3 */}
          <button 
            onClick={() => onNavigate('schedules')}
            className="text-left bg-white border border-slate-200/70 hover:border-slate-300 hover:shadow-xs rounded-2xl p-5 shadow-xs flex items-center justify-between transition cursor-pointer"
          >
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">พาหนะพร้อมใช้งานจริง (วันนี้)</p>
              <h3 className="text-2xl font-bold text-emerald-600 font-mono tracking-tight">{stats.availableVehiclesCount} / 6 คัน</h3>
              <p className="text-xs text-slate-500">พร้อมออกปฏิบัติภารกิจ</p>
            </div>
            <div className="p-3 bg-emerald-50/50 border border-emerald-100/50 text-emerald-600 rounded-xl">
              <Car size={22} className="stroke-[2.25]" />
            </div>
          </button>

          {/* KPI 4 */}
          <button 
            onClick={() => onNavigate('schedules')}
            className="text-left bg-white border border-slate-200/70 hover:border-slate-300 hover:shadow-xs rounded-2xl p-5 shadow-xs flex items-center justify-between transition cursor-pointer"
          >
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">พนักงานขับสแตนบายรอคำสั่ง</p>
              <h3 className="text-2xl font-bold text-indigo-600 font-mono tracking-tight">{stats.availableDriversCount} / 5 คน</h3>
              <p className="text-xs text-slate-500">พร้อมอำนวยความสะดวก</p>
            </div>
            <div className="p-3 bg-indigo-50/50 border border-indigo-100/50 text-indigo-600 rounded-xl">
              <User size={22} className="stroke-[2.25]" />
            </div>
          </button>
        </div>

        {/* Main Grid: Vehicles & Drivers Today */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Vehicles Section (7 cols) */}
          <div className="lg:col-span-7 bg-white border border-slate-200/70 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Car className="text-[#aa4e6e]" size={18} />
                <h2 className="text-base font-bold text-slate-900">ทะเบียนรถยนต์ราชการส่วนกลาง (6 คัน)</h2>
              </div>
              <span className="text-[11px] font-medium text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full font-sans">อัปเดตอัตโนมัติ</span>
            </div>

            <div className="flex flex-col divide-y divide-slate-100/85">
              {vehiclesWithTodayStatus.map((v) => (
                <div 
                  key={v.id} 
                  className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs first:pt-0 last:pb-0"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="mt-1 shrink-0">
                      {v.currentStatus === 'busy' ? (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#aa4e6e] animate-pulse" title="ปฏิบัติราชการ" />
                      ) : v.currentStatus === 'maintenance' ? (
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500" title="ซ่อมบำรุง" />
                      ) : (
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" title="ว่างปฏิบัติงาน" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-xs bg-slate-105 text-slate-705 px-1.5 py-0.5 rounded border border-slate-200/60 shrink-0">
                          {v.plateNumber}
                        </span>
                        <h4 className="font-bold text-slate-900 truncate">{v.name}</h4>
                        <span className="text-[10px] text-slate-400 font-medium font-sans">
                          ({translateVehicleType(v.type)} · {v.capacity} ที่นั่ง)
                        </span>
                      </div>
                      
                      {/* Current assignment details below */}
                      <div className="mt-1 flex items-center gap-1.5 text-slate-500 text-[11px] flex-wrap">
                        {v.currentStatus === 'busy' && v.activeBooking ? (
                          <span 
                            onClick={() => onSelectBooking(v.activeBooking!)}
                            className="flex items-center gap-1 text-[#aa4e6e] font-bold cursor-pointer hover:underline"
                          >
                            <MapPin size={11} className="shrink-0" />
                            <span className="truncate">จุดหมาย: {v.activeBooking.destination} ({v.activeBooking.requesterName})</span>
                          </span>
                        ) : v.currentStatus === 'maintenance' ? (
                          <span className="text-amber-600 font-semibold flex items-center gap-1">
                            <AlertCircle size={11} className="shrink-0" />
                            <span>อยู่ระหว่างซ่อมบำรุงประจำสัปดาห์</span>
                          </span>
                        ) : (
                          <span className="text-emerald-600/80 font-bold flex items-center gap-0.5">
                            <ShieldCheck size={11} className="shrink-0 text-emerald-500" />
                            <span>พร้อมออกปฏิบัติภารกิจส่วนกลาง</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center justify-between md:justify-end gap-2 w-full md:w-auto mt-1 md:mt-0 pt-2 md:pt-0 border-t border-dashed border-slate-100 md:border-none">
                    <span className="md:hidden text-[10px] text-slate-400 font-medium">สถานะพาหนะ:</span>
                    {v.currentStatus === 'busy' && v.activeBooking ? (
                      <button 
                        onClick={() => onSelectBooking(v.activeBooking!)}
                        className="px-2.5 py-1 bg-rose-50 text-[#aa4e6e] hover:bg-rose-100/70 font-bold rounded-lg border border-rose-100/65 transition cursor-pointer text-[10px]"
                      >
                        ดูใบอนุญาต
                      </button>
                    ) : v.currentStatus === 'maintenance' ? (
                      <span className="text-[10px] bg-amber-50 text-amber-800 font-extrabold px-2.5 py-0.5 rounded-full border border-amber-200/50">
                        ซ่อมบำรุง
                      </span>
                    ) : (
                      <span className="text-[10px] bg-emerald-50 text-emerald-800 font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-100/60">
                        พร้อมใช้งาน
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
 
          {/* Drivers Section (5 cols) */}
          <div className="lg:col-span-5 bg-white border border-slate-200/70 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <User className="text-[#aa4e6e]" size={18} />
                <h2 className="text-base font-bold text-slate-900">พนักงานขับรถ (5 คน)</h2>
              </div>
              <span className="text-[11px] font-medium text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full font-sans">วันนี้</span>
            </div>
 
            <div className="flex flex-col divide-y divide-slate-100/85">
              {driversWithTodayStatus.map((d) => (
                <div 
                  key={d.id}
                  className="py-3.5 flex items-center justify-between gap-3 text-xs first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 text-white ${d.avatarColor}`}>
                      {d.name.replace('นาย', '').charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 truncate text-xs md:text-sm">{d.name}</h4>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5 font-sans">{d.phone}</p>
                    </div>
                  </div>
 
                  <div className="flex items-center gap-2 shrink-0">
                    {d.currentStatus === 'busy' && d.activeBooking ? (
                      <button
                        onClick={() => onSelectBooking(d.activeBooking!)}
                        className="px-2.5 py-1 text-[10px] font-bold bg-rose-50 hover:bg-rose-100/70 text-[#aa4e6e] rounded-lg border border-rose-100/65 transition cursor-pointer"
                      >
                        ติดภารกิจ
                      </button>
                    ) : d.currentStatus === 'off' ? (
                      <span className="px-2.5 py-1 text-[10px] font-bold bg-slate-100 border border-slate-200/55 text-slate-500 rounded-full">
                        ลาพักผ่อน
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100/60">
                        สแตนบาย
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Unified Analytics, Reporting & Statistics Section */}
      <div className="bg-slate-50/65 border border-slate-200/80 rounded-3xl p-5 md:p-6 space-y-6 shadow-2xs mt-8" id="analytics-dashboard-group">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-15 pb-4.5 border-b border-slate-200/60">
          <div className="flex items-center gap-2">
            <div className="h-5 w-1.5 rounded-full bg-[#aa4e6e]" />
            <h2 className="text-sm md:text-base font-extrabold text-slate-800 tracking-tight font-sans">
              ระบบรายงานเชิงสถิติและวิเคราะห์ข้อมูลการสัญจรสะสม
            </h2>
          </div>
          <span className="text-[10px] font-black text-[#aa4e6e] bg-[#aa4e6e]/5 border border-[#aa4e6e]/10 px-2.5 py-1 rounded-md font-mono uppercase tracking-wider select-none leading-none w-fit">
            📈 HISTORICAL ANALYTICS REPORT
          </span>
        </div>

        {/* Date Range Control Card for Analytics */}
        <div className="bg-white border border-slate-200/70 rounded-2xl p-5 shadow-xs font-sans" id="analytics-date-filter-card">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calendar size={16} className="text-[#aa4e6e]" />
                ช่องการควบคุมช่วงวันที่สำหรับรายงานและสถิติวินิจฉัย
              </h3>
              <p className="text-xs text-slate-500 font-sans leading-normal">
                เลือกช่วงวันที่เพื่อกรองแผนภูมิ ปริมาณจอง, ความถี่สัญจรสะสม, ระยะการสัญจรรวม, ยานยนต์สถิติสูงสุด และระยะเฉลี่ยต่อคัน
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Quick Filters */}
              <div className="flex items-center bg-slate-100 rounded-xl p-1" id="quick-date-filters">
                {[
                  { label: 'ทั้งหมด', value: 'all' },
                  { label: '7 วันล่าสุด', value: '7days' },
                  { label: 'เดือนนี้', value: 'thisMonth' },
                  { label: 'ปีนี้', value: 'thisYear' }
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleQuickDateFilter(opt.value)}
                    className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                      activeQuickFilter === opt.value
                        ? 'bg-[#aa4e6e] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Manual Date Input */}
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-400">เริ่มต้น</span>
                  <input
                    type="date"
                    value={startDateFilter}
                    onChange={(e) => {
                      setStartDateFilter(e.target.value);
                      setActiveQuickFilter('custom');
                    }}
                    className="bg-slate-50 border border-slate-200 hover:border-[#aa4e6e]/30 rounded-xl px-2.5 py-1.5 focus:border-[#aa4e6e] focus:bg-white outline-none font-sans font-bold text-slate-700"
                    id="filter-start-date"
                  />
                </div>
                <span className="font-bold text-slate-400">ถึง</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-400">สิ้นสุด</span>
                  <input
                    type="date"
                    value={endDateFilter}
                    onChange={(e) => {
                      setEndDateFilter(e.target.value);
                      setActiveQuickFilter('custom');
                    }}
                    className="bg-slate-50 border border-slate-200 hover:border-[#aa4e6e]/30 rounded-xl px-2.5 py-1.5 focus:border-[#aa4e6e] focus:bg-white outline-none font-sans font-bold text-slate-700"
                    id="filter-end-date"
                  />
                </div>
                
                {(startDateFilter || endDateFilter) && (
                  <button
                    type="button"
                    onClick={() => handleQuickDateFilter('all')}
                    className="text-[#aa4e6e] hover:underline font-bold text-xs shrink-0 cursor-pointer ml-1"
                  >
                    ล้างค่า
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Breakdown & Recent Travel Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Chart (6 cols) */}
          <div className="lg:col-span-6 bg-white border border-slate-200/70 rounded-2xl p-6 shadow-xs space-y-5 flex flex-col justify-between" id="dept-analytics-card">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp size={18} className="text-[#aa4e6e]" />
                  <h2 className="text-base font-bold text-slate-900">ปริมาณจองแยกรวมรายหน่วยงาน/กลุ่มงาน</h2>
                </div>
                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100/40">
                  สถิติจำแนก
                </span>
              </div>

              {departmentStats.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-2xl bg-slate-50 text-slate-400">
                  <p className="text-xs">ไม่มีข้อมูลการจองใช้รถยนต์ในวันนี้</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* SVG Donut and Horizontal Legend Split */}
                  <div className="flex flex-col xl:flex-row items-center gap-6 justify-center xl:justify-around py-2 min-w-0 w-full overflow-hidden">
                    
                    {/* Interactive SVG Donut */}
                    <div className="relative flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 100 100" className="w-44 h-44 xl:w-48 xl:h-48 drop-shadow-[0_2px_8px_rgba(0,0,0,0.04)] origin-center">
                        {/* Base Track */}
                        <circle cx="50" cy="50" r="38" stroke="#f1f5f9" strokeWidth="6" fill="transparent" />
                        
                        {/* Calculate slices dynamically */}
                        {(() => {
                          const totalValidBookings = departmentStats.reduce((sum, item) => sum + item.value, 0);
                          let accumulatedPercent = 0;
                          
                          return departmentStats.map((item, idx) => {
                            const valShare = totalValidBookings > 0 ? (item.value / totalValidBookings) : 0;
                            const startPercent = accumulatedPercent;
                            accumulatedPercent += valShare;
                            
                            const radius = 38;
                            const circumference = 2 * Math.PI * radius;
                            const strokeLength = valShare * circumference;
                            const strokeOffset = circumference - (startPercent * circumference);
                            
                            const colors = [
                              'stroke-[#aa4e6e]',
                              'stroke-amber-500',
                              'stroke-emerald-500',
                              'stroke-indigo-500',
                              'stroke-slate-400'
                            ];
                            const strokeColorClass = colors[idx % colors.length];
                            const isHovered = hoveredSliceIndex === idx;
                            
                            return (
                              <circle
                                key={idx}
                                cx="50"
                                cy="50"
                                r={radius}
                                fill="transparent"
                                className={`${strokeColorClass} transition-all duration-300 cursor-pointer origin-center`}
                                strokeWidth={isHovered ? 8.5 : 6}
                                strokeDasharray={`${strokeLength} ${circumference}`}
                                strokeDashoffset={strokeOffset}
                                transform="rotate(-90 50 50)"
                                style={{
                                  transformOrigin: '50px 50px',
                                  scale: isHovered ? 1.04 : 1,
                                }}
                                onMouseEnter={() => setHoveredSliceIndex(idx)}
                                onMouseLeave={() => setHoveredSliceIndex(null)}
                              />
                            );
                          });
                        })()}

                        {/* Hole elements */}
                        <circle cx="50" cy="50" r="30" fill="#ffffff" className="transition-all duration-300" />
                        
                        {/* Dyn text */}
                        {(() => {
                          const totalValidBookings = departmentStats.reduce((sum, item) => sum + item.value, 0);
                          const hoveredItem = hoveredSliceIndex !== null ? departmentStats[hoveredSliceIndex] : null;
                          
                          return (
                            <>
                              <text x="50" y="44" textAnchor="middle" className="text-[6.5px] font-bold fill-slate-400 uppercase tracking-wider font-sans">
                                {hoveredItem ? getShortDeptName(hoveredItem.name) : 'รวมคำขอจอง'}
                              </text>
                              <text x="50" y="58" textAnchor="middle" className="text-sm font-black fill-slate-800 font-mono leading-none">
                                {hoveredItem ? `${hoveredItem.value} ครั้ง` : `${totalValidBookings} ครั้ง`}
                              </text>
                              <text x="50" y="68" textAnchor="middle" className="text-[6px] font-semibold fill-slate-400 font-sans">
                                {hoveredItem ? `${hoveredItem.percentage}% ของทั้งหมด` : 'ทุกกลุ่มงาน พมจ.'}
                              </text>
                            </>
                          );
                        })()}
                      </svg>
                    </div>

                    {/* Interactive Legend Items */}
                    <div className="flex-1 space-y-2 w-full min-w-0">
                      {(() => {
                        const colors = [
                          'bg-[#aa4e6e]',
                          'bg-amber-500',
                          'bg-emerald-500',
                          'bg-indigo-500',
                          'bg-slate-400'
                        ];
                        return departmentStats.map((item, idx) => {
                          const isHovered = hoveredSliceIndex === idx;
                          const bgColorClass = colors[idx % colors.length];
                          return (
                            <div
                              key={idx}
                              onMouseEnter={() => setHoveredSliceIndex(idx)}
                              onMouseLeave={() => setHoveredSliceIndex(null)}
                              className={`flex items-center justify-between p-2 rounded-xl transition duration-150 border cursor-pointer min-w-0 ${
                                isHovered 
                                  ? 'bg-rose-50/40 border-rose-100/80 shadow-2xs translate-x-1' 
                                  : 'border-transparent hover:bg-slate-50/85'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${bgColorClass}`}></span>
                                <span className={`text-xs font-semibold text-slate-700 truncate ${isHovered ? 'text-slate-900 font-bold' : ''}`} title={item.name}>
                                  {item.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 font-mono text-xs shrink-0 pl-2">
                                <span className={`font-bold ${isHovered ? 'text-[#aa4e6e]' : 'text-slate-800'}`}>{item.value} ครั้ง</span>
                                <span className="text-slate-400 bg-slate-100 px-1 py-0.5 rounded text-[9px] font-bold shrink-0">
                                  {item.percentage}%
                                </span>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>

                  </div>
                </div>
              )}
            </div>

            {/* Card footer */}
            {departmentStats.length > 0 && (
              <div className="pt-4 border-t border-slate-100 mt-4 flex justify-between items-center text-xs text-slate-400 font-sans">
                <span className="font-medium">ประเมินสัดส่วนภาระงานรายแผนก</span>
                <span className="font-semibold text-slate-600">รวมอนุมัติบวกคำขอรอตรวจ: {stats.approvedCount + stats.pendingCount} ครั้ง</span>
              </div>
            )}
          </div>

          {/* Most Utilized Vehicles (6 cols) */}
          <div className="lg:col-span-6 bg-white border border-slate-200/70 rounded-2xl p-6 shadow-xs space-y-4 flex flex-col justify-between" id="vehicle-analytics-card">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Car size={18} className="text-[#aa4e6e]" />
                  <h2 className="text-base font-bold text-slate-900">ความถี่ในการออกวิ่งปฏิบัติราชการสะสม</h2>
                </div>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100/40">
                  จำแนกรายคัน
                </span>
              </div>

              {/* Interactive SVG Bar Column Chart */}
              <div className="py-2 bg-slate-50/40 border border-slate-100 rounded-xl p-4 mb-4">
                {(() => {
                  const maxVal = Math.max(...vehicleStats.map(v => v.bookingCount), 1);
                  return (
                    <div className="w-full">
                      <svg viewBox="0 0 500 170" className="w-full h-auto overflow-visible select-none">
                        {/* Definitions for beautiful linear gradients */}
                        <defs>
                          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#aa4e6e" stopOpacity="1" />
                            <stop offset="100%" stopColor="#ec4899" stopOpacity="0.25" />
                          </linearGradient>
                          <linearGradient id="barGradientHover" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#be185d" stopOpacity="1" />
                            <stop offset="100%" stopColor="#fda4af" stopOpacity="0.4" />
                          </linearGradient>
                        </defs>

                        {/* Grid Ticks */}
                        {[0, 0.5, 1].map((ratio, index) => {
                          const yVal = 135 - ratio * 110;
                          const countVal = Math.round(ratio * maxVal);
                          return (
                            <g key={index} className="opacity-30">
                              <line 
                                x1="35" 
                                y1={yVal} 
                                x2="490" 
                                y2={yVal} 
                                stroke="#94a3b8" 
                                strokeWidth="1" 
                                strokeDasharray="4 4" 
                              />
                              <text 
                                x="18" 
                                y={yVal + 3} 
                                textAnchor="middle" 
                                className="text-[9px] font-extrabold font-mono fill-slate-500"
                              >
                                {countVal}
                              </text>
                            </g>
                          );
                        })}

                        {/* Base line */}
                        <line x1="35" y1="135" x2="490" y2="135" stroke="#cbd5e1" strokeWidth="1.5" />

                        {/* Bars */}
                        {vehicleStats.map((v, idx) => {
                          const isHovered = hoveredBarIndex === idx;
                          const barHeight = maxVal > 0 ? (v.bookingCount / maxVal) * 110 : 0;
                          const displayHeight = Math.max(barHeight, 5); // Give short minimal height so it is touch-responsive
                          const barY = 135 - displayHeight;
                          
                          const segmentWidth = 450 / 6;
                          const barWidth = 26;
                          const x = 38 + idx * segmentWidth + (segmentWidth - barWidth) / 2;

                          return (
                            <g 
                              key={v.id}
                              onMouseEnter={() => setHoveredBarIndex(idx)}
                              onMouseLeave={() => setHoveredBarIndex(null)}
                              className="cursor-pointer"
                            >
                              {/* Hit Area */}
                              <rect
                                x={x - 8}
                                y="10"
                                width={barWidth + 16}
                                height="145"
                                fill="transparent"
                              />

                              {/* Rounded column rect */}
                              <rect
                                x={x}
                                y={barY}
                                width={barWidth}
                                height={displayHeight}
                                rx="5"
                                fill={isHovered ? "url(#barGradientHover)" : "url(#barGradient)"}
                                className="transition-all duration-300"
                                stroke={isHovered ? "#aa4e6e" : "transparent"}
                                strokeWidth={1.2}
                              />

                              {/* Always view count above bars if greater than 0 */}
                              {v.bookingCount > 0 && (
                                <text 
                                  x={x + barWidth / 2} 
                                  y={barY - 6} 
                                  textAnchor="middle" 
                                  className={`text-[10px] font-bold font-mono transition-transform duration-200 ${
                                    isHovered ? "fill-[#aa4e6e] scale-110 font-bold" : "fill-slate-600"
                                  }`}
                                >
                                  {v.bookingCount}
                                </text>
                              )}

                              {/* Shortened Plate Ticks */}
                              <text 
                                x={x + barWidth / 2} 
                                y="152" 
                                textAnchor="middle" 
                                className={`text-[9px] font-bold font-mono transition-colors duration-150 ${
                                  isHovered ? "fill-[#aa4e6e] font-black" : "fill-slate-600"
                                }`}
                              >
                                {getPlateShort(v.plateNumber)}
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  );
                })()}
              </div>

              {/* Hover card message context */}
              <div className="h-9 flex items-center justify-center bg-slate-50 rounded-xl px-4 text-xs font-semibold text-slate-500 font-sans border border-slate-200/50">
                {hoveredBarIndex !== null ? (
                  <p className="animate-fade-in text-[#aa4e6e] flex items-center justify-center gap-1.5">
                    <Car size={13} className="text-[#aa4e6e] shrink-0" />
                    <span className="font-bold">{vehicleStats[hoveredBarIndex].name}</span> สถิติตลอดภารกิจจองสะสม <span className="font-extrabold text-slate-800 font-mono text-sm">{vehicleStats[hoveredBarIndex].bookingCount} ครั้ง</span>
                  </p>
                ) : (
                  <p className="text-slate-400 text-[11px] flex items-center justify-center gap-1">
                    <Lightbulb size={12} className="text-amber-500 shrink-0" />
                    <span>ลองเอาเมาส์ชี้แท่งสีชมพูในแผนภูมิ เพื่อวิเคราะห์รายละเอียดรุ่นรถยนต์แยกรายทะเบียน</span>
                  </p>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Vehicle Mileage Distance Analytics Row (Chart & Stats Block) */}
        <div className="bg-white border border-slate-200/70 rounded-2xl p-6 shadow-xs space-y-6">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp size={18} className="text-[#aa4e6e]" />
                <span>แผนภูมิเปรียบเทียบสถิติระยะทางการเดินทางของยานยนต์ราชการ (กม.)</span>
              </h2>
              <p className="text-xs text-slate-400 font-medium">คำนวณ and แสดงผลระยะเดินทางสะสมเชิงกราฟจากการลงบันทึกเลขไมล์สุทธิขากลับ</p>
            </div>
            <span className="text-[10px] bg-[#aa4e6e]/5 border border-[#aa4e6e]/15 text-[#aa4e6e] font-extrabold px-3 py-1.5 rounded-full whitespace-nowrap self-start sm:self-auto font-sans leading-none flex items-center gap-1">
              <BarChart3 size={11} className="text-[#aa4e6e]" />
              <span>สถิติระยะทางจริง (กม.)</span>
            </span>
          </div>

          {/* Chart Column & Side Summary Card Details */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Horizontal Bar Chart of Mileage (Span 8) */}
            <div className="lg:col-span-8 space-y-4">
              <div className="bg-slate-50/55 border border-slate-200/45 rounded-2xl p-4 sm:p-5">
                <div className="space-y-4">
                  {vehicleMileageStats.map((vmObj, idx) => {
                    const maxDistance = Math.max(...vehicleMileageStats.map(s => s.totalDistance), 100);
                    const percentage = (vmObj.totalDistance / maxDistance) * 100;
                    const isHovered = hoveredMileageIndex === idx;
                    const hasMil = vmObj.totalDistance > 0;

                    return (
                      <div 
                        key={vmObj.id}
                        onMouseEnter={() => setHoveredMileageIndex(idx)}
                        onMouseLeave={() => setHoveredMileageIndex(null)}
                        className={`group relative flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-xl transition duration-150 border ${
                          isHovered 
                            ? 'bg-white border-[#aa4e6e]/20 shadow-xs' 
                            : 'bg-white/40 border-transparent'
                        }`}
                      >
                        {/* Name & Plate Info */}
                        <div className="md:w-1/3 flex items-center gap-2">
                          <span className="text-[10px] font-mono leading-none bg-slate-100 border border-slate-200 px-2 py-1 rounded text-slate-700 font-bold shrink-0">
                            {vmObj.plateNumber}
                          </span>
                          <span className="text-xs font-bold text-slate-700 truncate max-w-[150px] md:max-w-none" title={vmObj.name}>
                            {vmObj.name}
                          </span>
                        </div>

                        {/* Bar fill representation */}
                        <div className="flex-1 h-3.5 bg-slate-100 rounded-full relative overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className={`h-full rounded-full transition-all duration-150 ${
                              isHovered 
                                ? 'bg-gradient-to-r from-emerald-400 to-[#aa4e6e]' 
                                : hasMil 
                                  ? 'bg-[#aa4e6e]/85' 
                                  : 'bg-slate-300'
                            }`}
                          />
                        </div>

                        {/* Numeric Value */}
                        <div className="md:w-28 text-left md:text-right font-mono font-bold text-xs sm:text-sm">
                          <span className={hasMil ? 'text-[#aa4e6e]' : 'text-slate-400 font-normal'}>
                            {hasMil ? `${vmObj.totalDistance.toLocaleString()} กม.` : '0 กม.'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Hint bar */}
              <div className="h-9 flex items-center justify-center bg-slate-50 border border-slate-200/50 rounded-xl px-4 text-xs font-semibold text-slate-500 font-sans">
                {hoveredMileageIndex !== null ? (
                  <p className="animate-fade-in text-[#aa4e6e] flex items-center justify-center gap-1.5">
                    <Gauge size={13} className="text-[#aa4e6e] shrink-0" />
                    <span className="font-bold">{vehicleMileageStats[hoveredMileageIndex].name}</span> ระยะเดินทางสะสมสุทธิ <span className="font-extrabold text-[#aa4e6e] font-mono text-sm">{vehicleMileageStats[hoveredMileageIndex].totalDistance.toLocaleString()} กม.</span>
                  </p>
                ) : (
                  <p className="text-slate-400 text-[11px] flex items-center justify-center gap-1">
                    <Lightbulb size={12} className="text-amber-500 shrink-0" />
                    <span>นำเมาส์วางเหนือแถบสีเพื่อดูรายละเอียดสัญจรเปรียบเทียบในแต่ละแชสซี</span>
                  </p>
                )}
              </div>
            </div>

            {/* Right Column: Key Stats Dashboard (Span 4) */}
            <div className="lg:col-span-4 space-y-4 flex flex-col justify-between">
              
              {/* Total Kilometer Sum Box */}
              <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-5 flex flex-col justify-between h-1/3">
                <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase font-sans">
                  ระยะทางออกสัญจรราชการรวมทั้งสิ้น
                </span>
                <div className="mt-2.5">
                  <span className="text-2xl sm:text-3xl font-mono font-black text-emerald-700">
                    {mileageSummaryGroup.totalKm.toLocaleString()}
                  </span>
                  <span className="text-xs font-bold text-slate-500 ml-1.5 font-sans">กิโลเมตร</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 font-medium">
                  ผลรวมมาตรที่ขับไปจริงของยานพาหนะกองกลางสำนักงาน พมจ.ตรัง
                </p>
              </div>

              {/* Most Utilized Vehicle Card */}
              {mileageSummaryGroup.maxVehicle && mileageSummaryGroup.maxVehicle.totalDistance > 0 ? (
                <div className="bg-[#aa4e6e]/5 border border-[#aa4e6e]/15 rounded-2xl p-5 flex flex-col justify-between h-1/3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#aa4e6e] tracking-wider uppercase font-sans flex items-center gap-1">
                      <TrendingUp size={11} className="text-[#aa4e6e]" />
                      <span>ยานยนต์ที่ออกสัญจรระยะสูงสุด</span>
                    </span>
                    <span className="text-[10px] font-mono leading-none bg-[#aa4e6e] text-white px-2 py-0.5 rounded font-black">
                      {mileageSummaryGroup.maxVehicle.plateNumber}
                    </span>
                  </div>
                  <div className="mt-2.5">
                    <h4 className="text-xs font-bold text-slate-800 line-clamp-1" title={mileageSummaryGroup.maxVehicle.name}>
                      {mileageSummaryGroup.maxVehicle.name}
                    </h4>
                    <div className="mt-1 font-mono font-black text-base text-slate-900">
                      {mileageSummaryGroup.maxVehicle.totalDistance.toLocaleString()} กม.
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 font-medium">
                    ครองอันดับหนึ่งสถิติความถี่และระยะสัญจรดูแลราชการภูมิภาค
                  </p>
                </div>
              ) : (
                <div className="bg-slate-50/50 border border-slate-200/30 rounded-2xl p-5 flex flex-col justify-center items-center text-center h-1/3 text-slate-400 text-xs font-sans">
                  <p>ไม่มีประวัติข้อมูลความถี่สูงสะสม</p>
                </div>
              )}

              {/* Average Kilometer / active vehicle summary */}
              <div className="bg-slate-50 border border-[#aa4e6e]/10 rounded-2xl p-5 flex flex-col justify-between h-1/3">
                <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase font-sans">
                  ระยะเฉลี่ยต่อคันทั้งหมด
                </span>
                <div className="mt-2.5">
                  <span className="text-lg sm:text-xl font-mono font-black text-slate-800">
                    {Math.round(mileageSummaryGroup.avgKm).toLocaleString()}
                  </span>
                  <span className="text-xs font-bold text-slate-500 ml-1.5 font-sans">กม. / คัน</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 font-medium">
                  ค่าเฉลี่ยสัดส่วนสมมาตรกิโลเมตรของรถทั้งหมด {vehicles.length} คันในระบบ
                </p>
              </div>

            </div> {/* Closes Right Column lg:col-span-4 */}

          </div> {/* Closes Grid grid-cols-1 lg:grid-cols-12 */}
        </div> {/* Closes Vehicle Mileage Distance Analytics Card */}

        {/* Fuel Expense & Consumption Analytics Row */}
        <div className="bg-white border border-slate-200/70 rounded-2xl p-6 shadow-xs space-y-6">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Gauge size={18} className="text-amber-600" />
                <span>สถิติการสิ้นเปลืองและรายงานค่าน้ำมันเชื้อเพลิง (Fuel Analytics)</span>
              </h2>
              <p className="text-xs text-slate-400 font-medium font-sans">ภาพรวมวิเคราะห์ประสิทธิภาพ อัตราสิ้นเปลือง และงบประมาณเชื้อเพลิงแยกรายคัน</p>
            </div>
            <span className="text-[10px] bg-amber-50 border border-amber-200/50 text-amber-800 font-extrabold px-3 py-1.5 rounded-full whitespace-nowrap self-start sm:self-auto font-sans leading-none flex items-center gap-1">
              <Fuel size={11} className="text-amber-600" />
              <span>สถิติการใช้พลังงาน</span>
            </span>
          </div>

          {/* Quick Core KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Total Fuel Cost */}
            <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 flex flex-col justify-between font-sans">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">ค่าน้ำมันสะสมทั้งหมด</span>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-mono font-black text-slate-800">
                  {fuelSummaryGroup.totalFuelCost.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-slate-500">บาท</span>
              </div>
              <span className="text-[9px] text-slate-450 mt-1 font-sans">
                จากบันทึกการเติมน้ำมัน {fuelSummaryGroup.tripsWithRefuel} เที่ยว
              </span>
            </div>

            {/* Total Liters */}
            <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 flex flex-col justify-between font-sans">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">จำนวนลิตรที่เติมรวม</span>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-mono font-black text-slate-800">
                  {fuelSummaryGroup.totalFuelLiters.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}
                </span>
                <span className="text-xs font-bold text-slate-500">ลิตร</span>
              </div>
              <span className="text-[9px] text-slate-450 mt-1 font-sans">ปริมาตรรวมเชื้อเพลิงสำรอง</span>
            </div>

            {/* Avg Fuel Price */}
            <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 flex flex-col justify-between font-sans">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">ราคาเฉลี่ยต่อลิตร</span>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-mono font-black text-slate-800">
                  {fuelSummaryGroup.averageFuelPrice > 0 ? fuelSummaryGroup.averageFuelPrice.toFixed(2) : '-'}
                </span>
                <span className="text-xs font-bold text-slate-500">บาท / ลิตร</span>
              </div>
              <span className="text-[9px] text-slate-450 mt-1 font-sans">คำนวณเฉลี่ยถ่วงน้ำหนัก</span>
            </div>

            {/* Average Economy */}
            <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 flex flex-col justify-between font-sans">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">อัตราการวิ่งเฉลี่ย</span>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-mono font-black text-emerald-700">
                  {(() => {
                    const totalKmWithRefuel = fuelSummaryGroup.vehicleFuelStats.reduce((sum, item) => sum + (item.fuelLiters > 0 ? item.kmTravelled : 0), 0);
                    const totalLiters = fuelSummaryGroup.totalFuelLiters;
                    return totalLiters > 0 ? (totalKmWithRefuel / totalLiters).toFixed(1) : '-';
                  })()}
                </span>
                <span className="text-xs font-bold text-emerald-800">กม. / ลิตร</span>
              </div>
              <span className="text-[9px] text-slate-450 mt-1 font-sans">ประสิทธิภาพภาพรวมทุกคัน</span>
            </div>
          </div>

          {/* Detailed Lists Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Left Box: Vehicle breakdown (8 cols) */}
            <div className="lg:col-span-8 space-y-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <BarChart3 size={13} className="text-slate-500 shrink-0" />
                <span>วิเคราะห์อัตราเติมน้ำมันและประสิทธิภาพการประหยัดแยกรายแชสซี</span>
              </h3>

              <div className="bg-slate-50/55 border border-slate-200/45 rounded-2xl p-4 sm:p-5 space-y-4">
                {fuelSummaryGroup.vehicleFuelStats.length === 0 || fuelSummaryGroup.totalFuelCost === 0 ? (
                  <div className="py-12 text-center text-slate-400 space-y-2">
                    <p className="text-xs font-bold text-slate-500">ยังไม่มีข้อมูลการเติมน้ำมันบันทึกในระบบในช่วงที่กำหนด</p>
                    <p className="text-[11px] text-slate-450">ค่าน้ำมัน อัตราสิ้นเปลืองเฉลี่ย และสถิติเชิงลึกจะปรากฏที่นี่ทันทีที่มีผู้ดูแลระบบลงบันทึกในแท็บ 'บันทึกเลขไมล์'</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {fuelSummaryGroup.vehicleFuelStats.map((vf) => {
                      const maxCost = Math.max(...fuelSummaryGroup.vehicleFuelStats.map(s => s.fuelCost), 1);
                      const costPercentage = (vf.fuelCost / maxCost) * 100;
                      const hasFuel = vf.fuelCost > 0;

                      return (
                        <div key={vf.id} className="py-3.5 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          {/* Left info: Plate, Name */}
                          <div className="md:w-1/3 flex items-center gap-2">
                            <span className="text-[10px] font-mono leading-none bg-slate-100 border border-slate-200 px-2 py-1 rounded text-slate-700 font-bold shrink-0">
                              {vf.plateNumber}
                            </span>
                            <div className="min-w-0">
                              <h4 className="text-xs font-extrabold text-slate-800 truncate" title={vf.name}>{vf.name}</h4>
                              <p className="text-[10px] text-slate-400 font-sans mt-0.5">เติมน้ำมัน {vf.refuelCount} ครั้ง ({vf.fuelLiters.toLocaleString(undefined, {maximumFractionDigits:1})} ลิตร)</p>
                            </div>
                          </div>

                          {/* Middle: Progress bar + distance info */}
                          <div className="flex-1 space-y-1">
                            <div className="flex justify-between items-center text-[10px] text-slate-400 font-sans">
                              <span>งบน้ำมันสะสม</span>
                              <span className="font-mono font-bold text-slate-600">{vf.fuelCost.toLocaleString()} บาท</span>
                            </div>
                            <div className="w-full h-2 bg-slate-150 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${costPercentage}%` }}
                                transition={{ duration: 0.6 }}
                                className={`h-full rounded-full ${hasFuel ? 'bg-amber-500' : 'bg-slate-300'}`}
                              />
                            </div>
                          </div>

                          {/* Right: Economy performance stats */}
                          <div className="md:w-36 text-right shrink-0 flex md:flex-col items-center md:items-end justify-between md:justify-center gap-2 border-t md:border-t-0 border-slate-100 pt-2 md:pt-0 pl-1 md:pl-0">
                            <div className="text-[10px] text-slate-400 md:hidden font-bold">ประสิทธิภาพ:</div>
                            <div className="space-y-0.5">
                              {vf.fuelLiters > 0 ? (
                                <div className="text-xs font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-150/40 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                  <Leaf size={11} className="text-emerald-600 shrink-0" />
                                  <span>{vf.kmPerLiter.toFixed(1)}</span>
                                  <span className="text-[9px] font-medium text-emerald-600">กม. / ลิตร</span>
                                </div>
                              ) : (
                                <div className="text-[10px] text-slate-400 font-sans font-medium">ไม่มีข้อมูลลิตร</div>
                              )}
                              {vf.kmTravelled > 0 && vf.fuelCost > 0 && (
                                <div className="text-[10px] font-mono font-bold text-slate-500">
                                  เฉลี่ย {(vf.fuelCost / vf.kmTravelled).toFixed(2)} บาท/กม.
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Box: Fuel type breakdown (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5 border-b border-transparent pb-0.5">
                <Tag size={12} className="text-slate-500 shrink-0" />
                <span>สัดส่วนประเภทน้ำมันเชื้อเพลิง</span>
              </h3>

              <div className="bg-slate-50/55 border border-slate-200/45 rounded-2xl p-5 space-y-4 flex flex-col justify-between min-h-[220px]">
                {fuelSummaryGroup.fuelTypeStats.length === 0 ? (
                  <div className="my-auto text-center text-slate-400 py-6">
                    <p className="text-[11px] font-medium">ยังไม่มีสัดส่วนสารกรองน้ำมัน</p>
                  </div>
                ) : (
                  <div className="space-y-4 my-auto">
                    {fuelSummaryGroup.fuelTypeStats.map((type) => {
                      const totalCost = fuelSummaryGroup.totalFuelCost || 1;
                      const percent = (type.cost / totalCost) * 100;

                      return (
                        <div key={type.name} className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-extrabold text-slate-700 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-indigo-500" />
                              {type.name}
                            </span>
                            <span className="font-mono font-bold text-slate-800">
                              {type.cost.toLocaleString()} บาท ({Math.round(percent)}%)
                            </span>
                          </div>

                          <div className="w-full h-1.5 bg-slate-250 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-indigo-600 rounded-full animate-all" 
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium pl-3.5 font-sans">
                            เติมเฉลี่ย {type.liters > 0 ? (type.cost / type.liters).toFixed(2) : '0'} บาท/ลิตร · รวม {type.count} ครั้ง
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="bg-amber-50/50 border border-amber-100 p-2.5 rounded-xl text-[10px] text-amber-900 font-sans leading-relaxed flex items-start gap-1.5">
                  <Lightbulb size={12} className="text-amber-500 shrink-0 mt-0.5" />
                  <p><b>ประโยชน์ใช้งาน:</b> ข้อมูลสิ้นเปลืองช่วยปรับรอบบริการเช็กระยะ และจัดสรรวงเงินบัตรน้ำมัน Fleet Card กองกลางได้แม่นยำยิ่งขึ้น</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div> {/* Closes #analytics-dashboard-group parent container wrapper */}

      {/* QUICK ADMIN APPROVAL MODAL */}
      <AnimatePresence>
        {pendingApproveId && (
          <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-2xs flex items-center justify-center p-4 z-50 font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 shadow-2xl rounded-2xl max-w-sm w-full overflow-hidden"
            >
              <div className="bg-[#aa4e6e] text-white p-5 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Lock size={15} />
                  <h3 className="text-xs font-black">เข้าสู่ระบบเพื่ออนุมัติคำขอ</h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPendingApproveId(null);
                    setPasscode('');
                    setLoginError('');
                  }}
                  className="font-black text-white px-2 cursor-pointer leading-none text-base"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleQuickApproveSubmit} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 block">กรอกรหัสผ่านผู้ดูแลระบบ (Admin Password)</label>
                  <input
                    type="password"
                    placeholder="กรอกรหัสผ่าน หรือเลือกเข้าสู่ระบบด่วน"
                    value={passcode}
                    onChange={(e) => {
                      setPasscode(e.target.value);
                      setLoginError('');
                    }}
                    autoFocus
                    className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#aa4e6e]/10 focus:border-[#aa4e6e] text-slate-800"
                  />
                  {loginError && <p className="text-[10px] text-rose-500 font-bold mt-1 text-center">{loginError}</p>}
                </div>

                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/50 text-[10px] text-slate-450 font-bold space-y-1 leading-normal">
                  <p className="text-[#aa4e6e] flex items-center gap-1">
                    <Lightbulb size={12} className="text-amber-500 shrink-0" />
                    <span>บัญชีสาธิตสำหรับทดสอบงานจอง:</span>
                  </p>
                  <p>• รหัสผ่าน Admin สำหรับยืนยัน: <span className="underline select-all font-black text-slate-700">admin1234</span></p>
                  <p>• หรือสะดวกข้ามโดยคลิกปุ่มแชร์สิทธิ์ด่วนด้านล่างได้ทันที</p>
                </div>

                <div className="pt-2 flex flex-col gap-1.5">
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#aa4e6e] hover:bg-[#8e3d5a] text-white text-xs font-black rounded-xl shadow-xs transition cursor-pointer"
                  >
                    ยืนยันตัวตนคนอนุมัติ
                  </button>
                  <button
                    type="button"
                    onClick={handleAutoLoginAndApprove}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-1"
                  >
                    <ShieldCheck size={14} className="stroke-[2.5]" />
                    แชร์สิทธิ์แอดมินบวกอนุมัติทันที
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
