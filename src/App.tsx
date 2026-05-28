import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, 
  Calendar, 
  Car, 
  User, 
  FileText, 
  PlusCircle, 
  Clock, 
  Building2, 
  FileCheck,
  AlertCircle,
  Settings
} from 'lucide-react';
import { Booking, Vehicle, Driver, Approver, Caretaker } from './types';
import { getStoredData, saveStoredData } from './data/initialData';
import { MSDHS_LOGO_BASE64 } from './data/logoBase64';
import Dashboard from './components/Dashboard';
import BookingForm from './components/BookingForm';
import BookingList from './components/BookingList';
import Schedules from './components/Schedules';
import PrintPermit from './components/PrintPermit';
import AdminPanel from './components/AdminPanel';
import AdminLogin from './components/AdminLogin';
import { initAuth, googleSignIn as loginGoogle, googleSignOut as logoutGoogle } from './utils/googleCalendarService';

export default function App() {
  
  // App views: 'dashboard' | 'bookings' | 'form' | 'schedules' | 'print' | 'admin'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'bookings' | 'form' | 'schedules' | 'print' | 'admin'>('dashboard');
  
  // App primary data pools
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [approvers, setApprovers] = useState<Approver[]>([]);
  const [caretakers, setCaretakers] = useState<Caretaker[]>([]);
  
  // Selection states
  const [editingBooking, setEditingBooking] = useState<Booking | undefined>(undefined);
  const [printingBooking, setPrintingBooking] = useState<Booking | undefined>(undefined);

  // Google Auth states for Workspace calendar sync
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [isSignGoogleLoading, setIsSignGoogleLoading] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleToken(token);
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    setIsSignGoogleLoading(true);
    try {
      const res = await loginGoogle();
      if (res) {
        setGoogleUser(res.user);
        setGoogleToken(res.accessToken);
        triggerToast('เชื่อมต่อบัญชี Google ของ พมจ.ตรัง สำเร็จ!', 'success');
        return res.accessToken;
      }
    } catch (err: any) {
      console.error('Failed to login with Google:', err);
      triggerToast('เชื่อมต่อ Google ล้มเหลว: ' + (err.message || ''), 'info');
    } finally {
      setIsSignGoogleLoading(false);
    }
    return null;
  };

  const handleGoogleSignOut = async () => {
    try {
      await logoutGoogle();
      setGoogleUser(null);
      setGoogleToken(null);
      triggerToast('ตัดการเชื่อมต่อบัญชี Google เรียบร้อย', 'info');
    } catch (err) {
      console.error(err);
    }
  };

  // Status message state
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  // Admin login states
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('pmj_trang_admin_logged_in') === 'true';
  });

  const handleAdminLogin = () => {
    setIsAdminLoggedIn(true);
    localStorage.setItem('pmj_trang_admin_logged_in', 'true');
    triggerToast('เข้าสู่ระบบผู้ดูแลระบบ (Admin) สำเร็จ ยินดีต้อนรับ!', 'success');
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    localStorage.setItem('pmj_trang_admin_logged_in', 'false');
    triggerToast('ออกจากระบบผู้ดูแลระบบเรียบร้อยแล้ว', 'info');
  };

  // Delete Booking Callback (Admin only)
  const handleDeleteBooking = (bookingId: string) => {
    const target = bookings.find(b => b.id === bookingId);
    if (!target) return;
    const updated = bookings.filter(b => b.id !== bookingId);
    setBookings(updated);
    saveStoredData(updated, vehicles, drivers, approvers, caretakers);
    triggerToast(`ลบข้อมูลการจองคำขอใช้รถเลขที่ ${target.permitNumber} ออกจากสารระบบเรียบร้อยแล้ว`, 'info');
  };

  // Load data on component mount and handle url deep print link for iframe printing
  useEffect(() => {
    const { bookings: savedB, vehicles: savedV, drivers: savedD, approvers: savedA, caretakers: savedC } = getStoredData();
    setBookings(savedB);
    setVehicles(savedV);
    setDrivers(savedD);
    setApprovers(savedA || []);
    setCaretakers(savedC || []);
  }, []);

  // Sync tab with URL hash for print preview stability
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/print/')) {
        const id = hash.replace('#/print/', '');
        if (bookings.length > 0) {
          const found = bookings.find(b => b.id === id);
          if (found) {
            setPrintingBooking(found);
            setActiveTab('print');
          }
        }
      }
    };

    if (bookings.length > 0) {
      handleHashChange();
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [bookings]);

  // Clean hash when navigating away from print tab
  useEffect(() => {
    if (activeTab !== 'print' && window.location.hash.startsWith('#/print/')) {
      window.location.hash = '';
    }
  }, [activeTab]);

  // Show Toast Helper
  const triggerToast = (text: string, type: 'success' | 'info' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => {
      setToastMsg(null);
    }, 4500);
  };

  // Save Booking Callback
  const handleSaveBooking = (booking: Booking) => {
    let updatedBookings: Booking[] = [];
    const isEdit = bookings.some(b => b.id === booking.id);

    if (isEdit) {
      updatedBookings = bookings.map(b => b.id === booking.id ? booking : b);
      triggerToast(`ทำการบันทึกและรันใบจองเลขที่ ${booking.permitNumber} เรียบร้อยแล้ว`, 'success');
    } else {
      updatedBookings = [booking, ...bookings];
      triggerToast(`สร้างคำขอจองคิวรถยนต์สำเร็จ! เลขนำส่งเอกสารคือ ${booking.permitNumber}`, 'success');
    }

    setBookings(updatedBookings);
    saveStoredData(updatedBookings, vehicles, drivers, approvers, caretakers);
    setEditingBooking(undefined);
    setActiveTab('bookings');
  };

  // Quick State Toggler Callback
  const handleUpdateStatus = (bookingId: string, status: 'pending' | 'approved' | 'completed' | 'cancelled' | 'rejected') => {
    const updated = bookings.map(b => {
      if (b.id === bookingId) {
        return { ...b, status };
      }
      return b;
    });
    setBookings(updated);
    saveStoredData(updated, vehicles, drivers, approvers, caretakers);
    
    const relevant = updated.find(b => b.id === bookingId);
    let ThaiStatus = 'ยกเลิกการเดินทาง';
    if (status === 'approved') ThaiStatus = 'อนุมัติการใช้ยานพาหนะ';
    if (status === 'pending') ThaiStatus = 'ตั้งสถานะกลับเป็นรออนุมัติ';
    if (status === 'completed') ThaiStatus = 'เสร็จสิ้นภารกิจ';
    
    triggerToast(`ปรับสถานะเอกสาร ${relevant?.permitNumber || ''} เป็น "${ThaiStatus}" สำเร็จ`, 'info');
  };

  const handleCompleteBookingWithMileage = (bookingId: string, startMil: number, endMil: number) => {
    let targetVehicleId = '';
    const updated = bookings.map(b => {
      if (b.id === bookingId) {
        targetVehicleId = b.vehicleId;
        return { 
          ...b, 
          status: 'completed' as const, 
          startMileage: startMil, 
          endMileage: endMil 
        };
      }
      return b;
    });

    let updatedVehicles = vehicles;
    if (targetVehicleId && endMil) {
      updatedVehicles = vehicles.map(v => {
        if (v.id === targetVehicleId) {
          return { ...v, mileage: Math.max(v.mileage || 0, endMil) };
        }
        return v;
      });
      setVehicles(updatedVehicles);
    }

    setBookings(updated);
    saveStoredData(updated, updatedVehicles, drivers, approvers, caretakers);
    
    const relevant = updated.find(b => b.id === bookingId);
    triggerToast(`บันทึกเลขไมล์เดินทางเสร็จสิ้น (${startMil.toLocaleString()} → ${endMil.toLocaleString()} กม.) ของเอกสารสลักหลัง ${relevant?.permitNumber || ''} เรียบร้อยแล้ว`, 'success');
  };

  // Triggering Print
  const handlePrintBooking = (booking: Booking) => {
    setPrintingBooking(booking);
    setActiveTab('print');
    window.location.hash = `#/print/${booking.id}`;
  };

  // Edit Triggering
  const handleEditBooking = (booking: Booking) => {
    setEditingBooking(booking);
    setActiveTab('form');
  };

  // Nav helper for forms
  const handleStartCreateMode = () => {
    setEditingBooking(undefined);
    setActiveTab('form');
  };

  // Save Vehicle
  const handleSaveVehicle = (vehicle: Vehicle) => {
    let updatedVehicles: Vehicle[] = [];
    const isEdit = vehicles.some(v => v.id === vehicle.id);
    if (isEdit) {
      updatedVehicles = vehicles.map(v => v.id === vehicle.id ? vehicle : v);
      triggerToast(`อัปเดตข้อมูลรถยนต์ทะเบียน ${vehicle.plateNumber} สำเร็จ`, 'success');
    } else {
      updatedVehicles = [...vehicles, vehicle];
      triggerToast(`เพิ่มรถยนต์ใหม่ทะเบียน ${vehicle.plateNumber} เข้าระบบสำเร็จ`, 'success');
    }
    setVehicles(updatedVehicles);
    saveStoredData(bookings, updatedVehicles, drivers, approvers, caretakers);
  };

  // Delete Vehicle
  const handleDeleteVehicle = (id: string) => {
    const target = vehicles.find(v => v.id === id);
    const updatedVehicles = vehicles.filter(v => v.id !== id);
    setVehicles(updatedVehicles);
    saveStoredData(bookings, updatedVehicles, drivers, approvers, caretakers);
    if (target) {
      triggerToast(`ลบรถยนต์ทะเบียน ${target.plateNumber} เรียบร้อยแล้ว`, 'info');
    }
  };

  // Save Driver
  const handleSaveDriver = (driver: Driver) => {
    let updatedDrivers: Driver[] = [];
    const isEdit = drivers.some(d => d.id === driver.id);
    if (isEdit) {
      updatedDrivers = drivers.map(d => d.id === driver.id ? driver : d);
      triggerToast(`อัปเดตข้อมูลคนขับ ${driver.name} สำเร็จ`, 'success');
    } else {
      updatedDrivers = [...drivers, driver];
      triggerToast(`เพิ่มคนขับ ${driver.name} เข้าระบบสำเร็จ`, 'success');
    }
    setDrivers(updatedDrivers);
    saveStoredData(bookings, vehicles, updatedDrivers, approvers, caretakers);
  };

  // Delete Driver
  const handleDeleteDriver = (id: string) => {
    const target = drivers.find(d => d.id === id);
    const updatedDrivers = drivers.filter(d => d.id !== id);
    setDrivers(updatedDrivers);
    saveStoredData(bookings, vehicles, updatedDrivers, approvers, caretakers);
    if (target) {
      triggerToast(`ลบคนขับ ${target.name} เรียบร้อยแล้ว`, 'info');
    }
  };

  // Save Approver
  const handleSaveApprover = (approver: Approver) => {
    let updatedApprovers: Approver[] = [];
    const isEdit = approvers.some(a => a.id === approver.id);
    if (isEdit) {
      updatedApprovers = approvers.map(a => a.id === approver.id ? approver : a);
      triggerToast(`อัปเดตข้อมูลผู้อนุมัติ ${approver.name} สำเร็จ`, 'success');
    } else {
      updatedApprovers = [...approvers, approver];
      triggerToast(`เพิ่มผู้อนุมัติ ${approver.name} สำเร็จ`, 'success');
    }
    setApprovers(updatedApprovers);
    saveStoredData(bookings, vehicles, drivers, updatedApprovers, caretakers);
  };

  // Delete Approver
  const handleDeleteApprover = (id: string) => {
    const target = approvers.find(a => a.id === id);
    const updatedApprovers = approvers.filter(a => a.id !== id);
    setApprovers(updatedApprovers);
    saveStoredData(bookings, vehicles, drivers, updatedApprovers, caretakers);
    if (target) {
      triggerToast(`ลบผู้อนุมัติ ${target.name} เรียบร้อยแล้ว`, 'info');
    }
  };

  // Save Caretaker
  const handleSaveCaretaker = (caretaker: Caretaker) => {
    let updatedCaretakers: Caretaker[] = [];
    const isEdit = caretakers.some(c => c.id === caretaker.id);
    if (isEdit) {
      updatedCaretakers = caretakers.map(c => c.id === caretaker.id ? caretaker : c);
      triggerToast(`อัปเดตข้อมูลเจ้าหน้าที่จัดดูแลยานพาหนะ ${caretaker.name} สำเร็จ`, 'success');
    } else {
      updatedCaretakers = [...caretakers, caretaker];
      triggerToast(`เพิ่มเจ้าหน้าที่จัดดูแลยานพาหนะ ${caretaker.name} สำเร็จ`, 'success');
    }
    setCaretakers(updatedCaretakers);
    saveStoredData(bookings, vehicles, drivers, approvers, updatedCaretakers);
  };

  // Delete Caretaker
  const handleDeleteCaretaker = (id: string) => {
    const target = caretakers.find(c => c.id === id);
    const updatedCaretakers = caretakers.filter(c => c.id !== id);
    setCaretakers(updatedCaretakers);
    saveStoredData(bookings, vehicles, drivers, approvers, updatedCaretakers);
    if (target) {
      triggerToast(`ลบเจ้าหน้าที่จัดดูแลยานพาหนะ ${target.name} เรียบร้อยแล้ว`, 'info');
    }
  };

  // Helper formatting for global clock
  const [currentClock, setCurrentClock] = useState('');
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      setCurrentClock(`${hours}:${minutes}:${seconds} น.`);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50/75 flex flex-col font-sans antialiased text-slate-800">
      
      {/* Top Professional Header Bar - Hidden during A4 Printing */}
      <header className="bg-white border-b border-slate-100 shrink-0 sticky top-0 z-40 print:hidden shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          
          {/* Logo and Thai Agency Name */}
          <div className="flex items-center gap-3">
            <img 
              src={MSDHS_LOGO_BASE64}
              alt="โลโก้สำนักงาน พมจ.ตรัง"
              className="w-11 h-11 object-contain shrink-0 filter drop-shadow-xs"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div>
              <span className="text-[10px] text-[#a22055] font-bold block leading-none uppercase tracking-widest font-sans">สำนักงานพมจ.ตรัง</span>
              <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-normal mt-0.5">
                ระบบควบคุมและจองใช้รถยนต์ราชการส่วนกลาง
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Clock Widget */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200/60 text-slate-600 rounded-full">
              <Clock size={13} className="text-[#a22055] shrink-0 animate-pulse" />
              <span className="text-xs font-medium font-mono whitespace-nowrap">เวลาปัจจุบัน: {currentClock || 'กำลังโหลด...'}</span>
            </div>

            {/* Google Calendar Connection Status */}
            {isAdminLoggedIn && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-blue-50/50 border border-blue-150/50 rounded-full text-xs">
                {googleToken ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                    <span className="text-blue-700 font-bold whitespace-nowrap">ปฏิทิน Google เชื่อมต่อแล้ว: {googleUser?.displayName || 'พมจ.ตรัง'}</span>
                    <button 
                      onClick={handleGoogleSignOut} 
                      className="text-[10px] text-slate-400 hover:text-red-500 font-bold underline ml-1 cursor-pointer"
                      title="ยกเลิกการซิงค์ตาราง"
                    >
                      ยกเลิก
                    </button>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-slate-250"></span>
                    <button 
                      onClick={handleGoogleSignIn}
                      disabled={isSignGoogleLoading}
                      className="text-slate-600 font-bold hover:text-[#1a73e8] flex items-center gap-1 cursor-pointer"
                    >
                      <span>🔄 ซิงค์ Google Calendar</span>
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Admin Session Badge / Action Button */}
            {isAdminLoggedIn ? (
              <div className="flex items-center gap-2">
                <span className="hidden md:inline-flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-800 border border-emerald-250 font-bold px-3 py-1.5 rounded-full shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  ผู้ตรวจสอบระบบ (Admin)
                </span>
                <button
                  onClick={handleAdminLogout}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-250 hover:text-[#a22055] hover:border-[#a22055] text-xs font-semibold rounded-lg transition shrink-0 cursor-pointer"
                  title="ออกจากระบบผู้ดูแล"
                >
                  ออกจากระบบ
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setActiveTab('admin');
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-pink-50 hover:bg-pink-100 text-[#a22055] border border-pink-205 text-xs font-extrabold rounded-lg transition shrink-0 cursor-pointer shadow-xs"
              >
                🔐 เข้าสู่ระบบ Admin
              </button>
            )}
          </div>

        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-5 print:p-0 print:m-0 print:max-w-full">
        
        {/* Navigation Rail / Tab Ribbon - Minimalist and Clean */}
        <div className="bg-white border border-slate-200/75 p-1 rounded-xl shadow-xs flex flex-wrap gap-1 items-center shrink-0 print:hidden">
          
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition ${
              activeTab === 'dashboard'
                ? 'bg-[#a22055] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-[#a22055]'
            }`}
          >
            <BarChart3 size={15} />
            หน้าแรก (Dashboard)
          </button>

          <button
            onClick={() => setActiveTab('bookings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition ${
              activeTab === 'bookings'
                ? 'bg-[#a22055] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-[#a22055]'
            }`}
          >
            <FileText size={15} />
            คลังใบขอใช้รถ
          </button>

          <button
            onClick={handleStartCreateMode}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition ${
              activeTab === 'form' && !editingBooking
                ? 'bg-[#a22055] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-[#a22055]'
            }`}
          >
            <PlusCircle size={15} />
            เขียนใบขอใช้รถยนต์ใหม่
          </button>

          <button
            onClick={() => setActiveTab('schedules')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition ${
              activeTab === 'schedules'
                ? 'bg-[#a22055] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-[#a22055]'
            }`}
          >
            <Calendar size={15} />
            ตารางเวลาคนขับและรถยนต์
          </button>

          <button
            onClick={() => setActiveTab('admin')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition ${
              activeTab === 'admin'
                ? 'bg-[#a22055] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-[#a22055]'
            }`}
          >
            <Settings size={15} />
            ตั้งค่าพาหนะ/คนขับ
          </button>

          {editingBooking && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 rounded-lg text-xs font-semibold border border-amber-200 ml-auto">
              <AlertCircle size={12} className="text-amber-600" />
              กำลังแก้ไขใบขอด่วน: {editingBooking.permitNumber}
            </div>
          )}

        </div>

        {/* Global Floating Toast for successful submissions */}
        {toastMsg && (
          <div 
            className="fixed bottom-6 right-6 z-50 p-4 bg-slate-900 text-white rounded-xl shadow-lg flex items-center gap-3 max-w-sm border border-slate-800 animate-slide-up print:hidden"
            id="toast-notification"
          >
            <div className="p-2 bg-emerald-500/15 text-emerald-400 rounded-xl">
              <FileCheck size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400">แจ้งเตือนจากระบบ พมจ.</p>
              <p className="text-xs font-medium text-slate-200 leading-normal mt-0.5">{toastMsg.text}</p>
            </div>
          </div>
        )}

        {/* Module Area mounting subviews smoothly */}
        <div className="flex-1 flex flex-col print:p-0">
          {activeTab === 'dashboard' && (
            <Dashboard 
              bookings={bookings}
              vehicles={vehicles}
              drivers={drivers}
              onNavigate={(tab) => {
                setActiveTab(tab);
                setEditingBooking(undefined);
              }}
              onSelectBooking={handlePrintBooking}
              onCreateBooking={handleStartCreateMode}
              isAdmin={isAdminLoggedIn}
              onAdminLogin={handleAdminLogin}
              onUpdateStatus={handleUpdateStatus}
              onEditBooking={handleEditBooking}
              onCompleteBookingWithMileage={handleCompleteBookingWithMileage}
            />
          )}

          {activeTab === 'bookings' && (
            <BookingList 
              bookings={bookings}
              vehicles={vehicles}
              drivers={drivers}
              onEdit={handleEditBooking}
              onPrint={handlePrintBooking}
              onUpdateStatus={handleUpdateStatus}
              onAddNew={handleStartCreateMode}
              isAdmin={isAdminLoggedIn}
              onDeleteBooking={handleDeleteBooking}
              onCompleteBookingWithMileage={handleCompleteBookingWithMileage}
              googleUser={googleUser}
              googleToken={googleToken}
              onGoogleSignIn={handleGoogleSignIn}
              onGoogleSignOut={handleGoogleSignOut}
            />
          )}

          {activeTab === 'form' && (
            <BookingForm 
              bookingToEdit={editingBooking}
              bookings={bookings}
              vehicles={vehicles}
              drivers={drivers}
              approvers={approvers}
              caretakers={caretakers}
              onSave={handleSaveBooking}
              onCancel={() => {
                setEditingBooking(undefined);
                setActiveTab('bookings');
              }}
              isAdmin={isAdminLoggedIn}
            />
          )}

          {activeTab === 'schedules' && (
            <Schedules 
              bookings={bookings}
              vehicles={vehicles}
              drivers={drivers}
              onSelectBooking={handlePrintBooking}
            />
          )}

          {activeTab === 'print' && printingBooking && (
            <PrintPermit 
              booking={printingBooking}
              vehicles={vehicles}
              drivers={drivers}
              onBack={() => {
                setPrintingBooking(undefined);
                setActiveTab('bookings');
                window.location.hash = '';
              }}
            />
          )}

          {activeTab === 'admin' && (
            isAdminLoggedIn ? (
              <AdminPanel 
                vehicles={vehicles}
                drivers={drivers}
                approvers={approvers}
                caretakers={caretakers}
                onSaveVehicle={handleSaveVehicle}
                onDeleteVehicle={handleDeleteVehicle}
                onSaveDriver={handleSaveDriver}
                onDeleteDriver={handleDeleteDriver}
                onSaveApprover={handleSaveApprover}
                onDeleteApprover={handleDeleteApprover}
                onSaveCaretaker={handleSaveCaretaker}
                onDeleteCaretaker={handleDeleteCaretaker}
                onLogout={handleAdminLogout}
              />
            ) : (
              <AdminLogin 
                onLoginSuccess={handleAdminLogin}
                onCancel={() => setActiveTab('dashboard')}
              />
            )
          )}
        </div>

      </main>

      {/* Corporate signature fine prints */}
      <footer className="py-6 text-center text-xs text-slate-400 border-t border-slate-100 shrink-0 print:hidden bg-white mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2569 สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดตรัง. สงวนลิขสิทธิ์ความปลอดภัยคลังสารสนเทศ</p>
          <div className="flex items-center gap-1.5 font-bold text-slate-500">
            <Building2 size={13} />
            กระทรวงการพัฒนาสังคมและความมั่นคงของมนุษย์ (พม.)
          </div>
        </div>
      </footer>

    </div>
  );
}
