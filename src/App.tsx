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
  Settings,
  Gauge
} from 'lucide-react';
import { Booking, Vehicle, Driver, Approver, Caretaker, DepartmentHead } from './types';
import { getStoredData, saveStoredData } from './data/initialData';
import { MSDHS_LOGO_BASE64 } from './data/logoBase64';
import Dashboard from './components/Dashboard';
import BookingForm from './components/BookingForm';
import BookingList from './components/BookingList';
import Schedules from './components/Schedules';
import PrintPermit from './components/PrintPermit';
import AdminPanel from './components/AdminPanel';
import AdminLogin from './components/AdminLogin';
import MileageTracker from './components/MileageTracker';
import { initAuth, googleSignIn as loginGoogle, googleSignOut as logoutGoogle } from './utils/googleCalendarService';
import { 
  testConnection, 
  bootstrapFirestoreIfEmpty, 
  saveBookingToFirestore, 
  deleteBookingFromFirestore, 
  saveVehicleToFirestore, 
  deleteVehicleFromFirestore, 
  saveDriverToFirestore, 
  deleteDriverFromFirestore, 
  saveApproverToFirestore, 
  deleteApproverFromFirestore, 
  saveCaretakerToFirestore, 
  deleteCaretakerFromFirestore, 
  saveDepartmentHeadToFirestore,
  deleteDepartmentHeadFromFirestore,
  watchBookings, 
  watchVehicles, 
  watchDrivers, 
  watchApprovers, 
  watchCaretakers,
  watchDepartmentHeads 
} from './utils/firebaseService';

export default function App() {
  
  // App views: 'dashboard' | 'bookings' | 'form' | 'schedules' | 'print' | 'admin' | 'mileage'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'bookings' | 'form' | 'schedules' | 'print' | 'admin' | 'mileage'>('dashboard');
  
  // App primary data pools
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [approvers, setApprovers] = useState<Approver[]>([]);
  const [caretakers, setCaretakers] = useState<Caretaker[]>([]);
  const [departmentHeads, setDepartmentHeads] = useState<DepartmentHead[]>([]);
  
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
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

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
    deleteBookingFromFirestore(bookingId);
    triggerToast(`ลบข้อมูลการจองคำขอใช้รถเลขที่ ${target.permitNumber} ออกจากสารระบบเรียบร้อยแล้ว`, 'info');
  };

  // Real-time synchronization with Firestore
  useEffect(() => {
    // 1. Warm-up Firestore connection
    testConnection();

    // 2. Load immediate cached backup from LocalStorage
    const { bookings: savedB, vehicles: savedV, drivers: savedD, approvers: savedA, caretakers: savedC, departmentHeads: savedH } = getStoredData();
    setBookings(savedB);
    setVehicles(savedV);
    setDrivers(savedD);
    setApprovers(savedA || []);
    setCaretakers(savedC || []);
    setDepartmentHeads(savedH || []);

    // 3. Setup real-time listeners for all entities
    const unsubBookings = watchBookings((updatedBookings) => {
      const sorted = [...updatedBookings].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setBookings(sorted);
      localStorage.setItem('pmj_trang_bookings', JSON.stringify(sorted));
    });

    const unsubVehicles = watchVehicles((updatedVehicles) => {
      setVehicles(updatedVehicles);
      localStorage.setItem('pmj_trang_vehicles', JSON.stringify(updatedVehicles));
    });

    const unsubDrivers = watchDrivers((updatedDrivers) => {
      setDrivers(updatedDrivers);
      localStorage.setItem('pmj_trang_drivers', JSON.stringify(updatedDrivers));
    });

    const unsubApprovers = watchApprovers((updatedApprovers) => {
      setApprovers(updatedApprovers);
      localStorage.setItem('pmj_trang_approvers', JSON.stringify(updatedApprovers));
    });

    const unsubCaretakers = watchCaretakers((updatedCaretakers) => {
      setCaretakers(updatedCaretakers);
      localStorage.setItem('pmj_trang_caretakers', JSON.stringify(updatedCaretakers));
    });

    const unsubDepartmentHeads = watchDepartmentHeads((updatedHeads) => {
      setDepartmentHeads(updatedHeads);
      localStorage.setItem('pmj_trang_department_heads', JSON.stringify(updatedHeads));
    });

    // 4. Bootstrap Firestore on first-ever load if it's currently empty
    bootstrapFirestoreIfEmpty(savedB, savedV, savedD, savedA || [], savedC || [], savedH || []);

    return () => {
      unsubBookings();
      unsubVehicles();
      unsubDrivers();
      unsubApprovers();
      unsubCaretakers();
      unsubDepartmentHeads();
    };
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
  const triggerToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => {
      setToastMsg(null);
    }, 4500);
  };

  // Automated cascade updating for vehicle bookings to sync up subsequent trip mileages
  const cascadeMileageForVehicle = async (vehicleId: string, bookingIdThatWasSaved: string, updatedBookingObj: Booking, currentBookings: Booking[]) => {
    try {
      // 1. Create a copy of the current bookings and apply the updated booking
      const bookingsCopy = currentBookings.map(b => b.id === bookingIdThatWasSaved ? { ...updatedBookingObj } : { ...b });
      if (!bookingsCopy.some(b => b.id === bookingIdThatWasSaved)) {
        bookingsCopy.push({ ...updatedBookingObj });
      }

      // 2. Filter bookings for this vehicle that are NOT cancelled/rejected
      const vehicleBookings = bookingsCopy.filter(b => b.vehicleId === vehicleId && b.status !== 'cancelled' && b.status !== 'rejected');

      // 3. Sort chronologically by startDate
      const sorted = [...vehicleBookings].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

      const bookingsToSave: Booking[] = [];
      
      // 4. Cascade modifications
      for (let i = 0; i < sorted.length; i++) {
        const current = sorted[i];
        let changed = false;

        if (i > 0) {
          const prev = sorted[i - 1];
          if (prev.endMileage !== undefined && prev.endMileage !== null) {
            if (current.startMileage !== prev.endMileage) {
              current.startMileage = prev.endMileage;
              changed = true;

              if (current.endMileage !== undefined && current.endMileage !== null && current.endMileage < current.startMileage) {
                current.endMileage = current.startMileage;
              }
            }
          }
        }

        if (changed) {
          bookingsToSave.push(current);
        }
      }

      // 5. Save all cascaded bookings
      for (const b of bookingsToSave) {
        await saveBookingToFirestore(b);
      }

      // Update local state immediately so user sees changes instantly
      let updatedLocalBookings = currentBookings.map(b => {
        if (b.id === bookingIdThatWasSaved) {
          return { ...updatedBookingObj };
        }
        const cascaded = bookingsToSave.find(cb => cb.id === b.id);
        if (cascaded) {
          return { ...cascaded };
        }
        return b;
      });

      if (!updatedLocalBookings.some(b => b.id === bookingIdThatWasSaved)) {
        updatedLocalBookings.push({ ...updatedBookingObj });
      }

      const sortedByCreatedAt = [...updatedLocalBookings].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setBookings(sortedByCreatedAt);

      // 6. Update vehicle's overall mileage based on the absolute highest 'endMileage' among ALL completed bookings for this vehicle
      const completedForVehicle = sorted.filter(b => b.status === 'completed' && b.endMileage !== undefined && b.endMileage !== null);
      if (completedForVehicle.length > 0) {
        const maxEndMileage = Math.max(...completedForVehicle.map(b => b.endMileage || 0));
        const v = vehicles.find(v => v.id === vehicleId);
        if (v && v.mileage !== maxEndMileage) {
          await saveVehicleToFirestore({ ...v, mileage: maxEndMileage });
          setVehicles(prevVehicles => prevVehicles.map(veh => veh.id === v.id ? { ...veh, mileage: maxEndMileage } : veh));
        }
      }
    } catch (err) {
      console.error('Error cascading mileage updates:', err);
    }
  };

  // Save Booking Callback
  const handleSaveBooking = async (booking: Booking) => {
    const isEdit = bookings.some(b => b.id === booking.id);
    try {
      await saveBookingToFirestore(booking);
      if (booking.vehicleId) {
        await cascadeMileageForVehicle(booking.vehicleId, booking.id, booking, bookings);
      }
      if (isEdit) {
        triggerToast(`ทำการบันทึกและรันใบจองเลขที่ ${booking.permitNumber} เรียบร้อยแล้ว`, 'success');
      } else {
        triggerToast(`สร้างคำขอจองคิวรถยนต์สำเร็จ! เลขนำส่งเอกสารคือ ${booking.permitNumber}`, 'success');
      }
      setEditingBooking(undefined);
      setActiveTab('bookings');
    } catch (err: any) {
      console.error(err);
      triggerToast(`ไม่สามารถบันทึกคิวจองรถได้: ${err.message || err}`, 'error');
    }
  };

  // Quick State Toggler Callback
  const handleUpdateStatus = async (bookingId: string, status: 'pending' | 'approved' | 'completed' | 'cancelled' | 'rejected') => {
    const b = bookings.find(b => b.id === bookingId);
    if (!b) return;
    const updated = { ...b, status };
    try {
      await saveBookingToFirestore(updated);
      if (b.vehicleId) {
        await cascadeMileageForVehicle(b.vehicleId, updated.id, updated, bookings);
      }
      let ThaiStatus = 'ยกเลิกการเดินทาง';
      if (status === 'approved') ThaiStatus = 'อนุมัติการใช้ยานพาหนะ';
      if (status === 'pending') ThaiStatus = 'ตั้งสถานะกลับเป็นรออนุมัติ';
      if (status === 'completed') ThaiStatus = 'เสร็จสิ้นภารกิจ';
      
      triggerToast(`ปรับสถานะเอกสาร ${b.permitNumber} เป็น "${ThaiStatus}" สำเร็จ`, 'info');
    } catch (err: any) {
      console.error(err);
      triggerToast(`ปรับสถานะล้มเหลว: ${err.message || err}`, 'error');
    }
  };

  const handleCompleteBookingWithMileage = async (bookingId: string, startMil: number, endMil: number) => {
    const b = bookings.find(b => b.id === bookingId);
    if (!b) return;
    const updated = { 
      ...b, 
      status: 'completed' as const, 
      startMileage: startMil, 
      endMileage: endMil 
    };
    try {
      await saveBookingToFirestore(updated);
      if (b.vehicleId) {
        await cascadeMileageForVehicle(b.vehicleId, updated.id, updated, bookings);
      }
      
      triggerToast(`บันทึกเลขไมล์เดินทางเสร็จสิ้น (${startMil.toLocaleString()} → ${endMil.toLocaleString()} กม.) ของเอกสารสลักหลัง ${b.permitNumber} เรียบร้อยแล้ว`, 'success');
    } catch (err: any) {
      console.error(err);
      triggerToast(`บันทึกเลขไมล์ล้มเหลว: ${err.message || err}`, 'error');
    }
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
  const handleSaveVehicle = async (vehicle: Vehicle) => {
    const isEdit = vehicles.some(v => v.id === vehicle.id);
    try {
      await saveVehicleToFirestore(vehicle);
      if (isEdit) {
        triggerToast(`อัปเดตข้อมูลรถยนต์ทะเบียน ${vehicle.plateNumber} สำเร็จ`, 'success');
      } else {
        triggerToast(`เพิ่มรถยนต์ใหม่ทะเบียน ${vehicle.plateNumber} เข้าระบบสำเร็จ`, 'success');
      }
    } catch (err: any) {
      triggerToast(`บันทึกข้อมูลรถยนต์ล้มเหลว: ${err.message || err}`, 'error');
    }
  };

  // Delete Vehicle
  const handleDeleteVehicle = async (id: string) => {
    const target = vehicles.find(v => v.id === id);
    try {
      await deleteVehicleFromFirestore(id);
      if (target) {
        triggerToast(`ลบรถยนต์ทะเบียน ${target.plateNumber} เรียบร้อยแล้ว`, 'info');
      }
    } catch (err: any) {
      triggerToast(`ลบรถยนต์ล้มเหลว: ${err.message || err}`, 'error');
    }
  };

  // Save Driver
  const handleSaveDriver = async (driver: Driver) => {
    const isEdit = drivers.some(d => d.id === driver.id);
    try {
      await saveDriverToFirestore(driver);
      if (isEdit) {
        triggerToast(`อัปเดตข้อมูลคนขับ ${driver.name} สำเร็จ`, 'success');
      } else {
        triggerToast(`เพิ่มคนขับ ${driver.name} เข้าระบบสำเร็จ`, 'success');
      }
    } catch (err: any) {
      triggerToast(`บันทึกข้อมูลคูขับล้มเหลว: ${err.message || err}`, 'error');
    }
  };

  // Delete Driver
  const handleDeleteDriver = async (id: string) => {
    const target = drivers.find(d => d.id === id);
    try {
      await deleteDriverFromFirestore(id);
      if (target) {
        triggerToast(`ลบคนขับ ${target.name} เรียบร้อยแล้ว`, 'info');
      }
    } catch (err: any) {
      triggerToast(`ลบคนขับล้มเหลว: ${err.message || err}`, 'error');
    }
  };

  // Save Approver
  const handleSaveApprover = async (approver: Approver) => {
    const isEdit = approvers.some(a => a.id === approver.id);
    try {
      await saveApproverToFirestore(approver);
      if (isEdit) {
        triggerToast(`อัปเดตข้อมูลผู้อนุมัติ ${approver.name} สำเร็จ`, 'success');
      } else {
        triggerToast(`เพิ่มผู้อนุมัติ ${approver.name} สำเร็จ`, 'success');
      }
    } catch (err: any) {
      triggerToast(`บันทึกข้อมูลล้มเหลว: ${err.message || err}`, 'error');
    }
  };

  // Delete Approver
  const handleDeleteApprover = async (id: string) => {
    const target = approvers.find(a => a.id === id);
    try {
      await deleteApproverFromFirestore(id);
      if (target) {
        triggerToast(`ลบผู้อนุมัติ ${target.name} เรียบร้อยแล้ว`, 'info');
      }
    } catch (err: any) {
      triggerToast(`ลบผู้อนุมัติล้มเหลว: ${err.message || err}`, 'error');
    }
  };

  // Save Caretaker
  const handleSaveCaretaker = async (caretaker: Caretaker) => {
    const isEdit = caretakers.some(c => c.id === caretaker.id);
    try {
      await saveCaretakerToFirestore(caretaker);
      if (isEdit) {
        triggerToast(`อัปเดตข้อมูลเจ้าหน้าที่จัดดูแลยานพาหนะ ${caretaker.name} สำเร็จ`, 'success');
      } else {
        triggerToast(`เพิ่มเจ้าหน้าที่จัดดูแลยานพาหนะ ${caretaker.name} สำเร็จ`, 'success');
      }
    } catch (err: any) {
      triggerToast(`บันทึกข้อมูลล้มเหลว: ${err.message || err}`, 'error');
    }
  };

  // Delete Caretaker
  const handleDeleteCaretaker = async (id: string) => {
    const target = caretakers.find(c => c.id === id);
    try {
      await deleteCaretakerFromFirestore(id);
      if (target) {
        triggerToast(`ลบเจ้าหน้าที่จัดดูแลยานพาหนะ ${target.name} เรียบร้อยแล้ว`, 'info');
      }
    } catch (err: any) {
      triggerToast(`ลบข้อมูลล้มเหลว: ${err.message || err}`, 'error');
    }
  };

  // Save DepartmentHead
  const handleSaveDepartmentHead = async (head: DepartmentHead) => {
    const isEdit = departmentHeads.some(h => h.id === head.id);
    try {
      await saveDepartmentHeadToFirestore(head);
      if (isEdit) {
        triggerToast(`อัปเดตข้อมูลหัวหน้ากลุ่ม/ฝ่าย ${head.name} สำเร็จ`, 'success');
      } else {
        triggerToast(`เพิ่มหัวหน้ากลุ่ม/ฝ่าย ${head.name} สำเร็จ`, 'success');
      }
    } catch (err: any) {
      triggerToast(`บันทึกข้อมูลล้มเหลว: ${err.message || err}`, 'error');
    }
  };

  // Delete DepartmentHead
  const handleDeleteDepartmentHead = async (id: string) => {
    const target = departmentHeads.find(h => h.id === id);
    try {
      await deleteDepartmentHeadFromFirestore(id);
      if (target) {
        triggerToast(`ลบหัวหน้ากลุ่ม/ฝ่าย ${target.name} เรียบร้อยแล้ว`, 'info');
      }
    } catch (err: any) {
      triggerToast(`ลบข้อมูลล้มเหลว: ${err.message || err}`, 'error');
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-18 py-3 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo and Thai Agency Name */}
          <div className="flex items-center gap-3">
            <img 
              src={MSDHS_LOGO_BASE64}
              alt="โลโก้สำนักงาน พมจ.ตรัง"
              className="w-11 h-11 object-contain shrink-0 filter drop-shadow-xs transition duration-300 hover:scale-105"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="md:border-l md:border-slate-200/80 md:pl-3.5 py-0.5">
              <span className="text-[10px] text-[#aa4e6e] font-extrabold block leading-none uppercase tracking-widest font-sans">สำนักงานพมจ.ตรัง</span>
              <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-normal mt-0.5">
                ระบบควบคุมและจองใช้รถยนต์ราชการส่วนกลาง
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 justify-center md:justify-end">
            {/* Quick Access Action Tabs - High Visibility Duo */}
            <div className="flex items-center gap-1 p-1 bg-slate-50 border border-slate-200/50 rounded-xl shadow-xs shrink-0">
              <button
                onClick={handleStartCreateMode}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition duration-200 cursor-pointer select-none ${
                  activeTab === 'form' && !editingBooking
                    ? 'bg-[#aa4e6e] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-white hover:text-[#aa4e6e] hover:shadow-2xs'
                }`}
              >
                <PlusCircle size={14} className={activeTab === 'form' && !editingBooking ? 'text-white' : 'text-[#aa4e6e]'} />
                <span>เขียนใบขอใช้รถยนต์ใหม่</span>
              </button>

              <button
                onClick={() => setActiveTab('mileage')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition duration-200 cursor-pointer select-none ${
                  activeTab === 'mileage'
                    ? 'bg-[#aa4e6e] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-white hover:text-[#aa4e6e] hover:shadow-2xs'
                }`}
              >
                <Gauge size={14} className={activeTab === 'mileage' ? 'text-white' : 'text-[#aa4e6e]'} />
                <span>บันทึกเลขไมล์ขากลับ</span>
              </button>
            </div>

            {/* Status Pills Container - Grouped for Orderliness */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Clock Widget */}
              <div className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200/50 text-slate-600 rounded-xl text-xs font-medium font-sans">
                <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse shrink-0"></span>
                <span className="font-mono whitespace-nowrap">เวลาปัจจุบัน: {currentClock || 'กำลังโหลด...'}</span>
              </div>



              {/* Admin Session Badge / Action Button */}
              {isAdminLoggedIn ? (
                <div className="flex items-center gap-2">
                  <span className="hidden md:inline-flex items-center gap-1.5 text-xs bg-slate-50 text-slate-600 border border-slate-200/50 font-bold px-3 py-1.5 rounded-xl shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                    ผู้ตรวจสอบระบบ (Admin)
                  </span>
                  <button
                    onClick={handleAdminLogout}
                    className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-[#aa4e6e] border border-rose-200/80 text-xs font-bold rounded-xl transition duration-200 shrink-0 cursor-pointer shadow-2xs"
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
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-50 hover:bg-white text-slate-600 hover:text-[#aa4e6e] border border-slate-200/50 hover:border-pink-200 text-xs font-bold rounded-xl transition duration-200 shrink-0 cursor-pointer shadow-3xs hover:shadow-2xs"
                >
                  🔐 เข้าสู่ระบบ Admin
                </button>
              )}
            </div>
          </div>

        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-5 print:p-0 print:m-0 print:max-w-full">
        
        {/* Navigation Rail / Tab Ribbon - Minimalist and Clean */}
        <div className="bg-white border border-slate-200/75 p-1 rounded-xl shadow-xs flex flex-wrap gap-1 items-center shrink-0 print:hidden justify-center sm:justify-start">
          
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition ${
              activeTab === 'dashboard'
                ? 'bg-[#aa4e6e] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-[#aa4e6e]'
            }`}
          >
            <BarChart3 size={15} />
            หน้าแรก (Dashboard)
          </button>

          <button
            onClick={() => setActiveTab('bookings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition ${
              activeTab === 'bookings'
                ? 'bg-[#aa4e6e] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-[#aa4e6e]'
            }`}
          >
            <FileText size={15} />
            คลังใบขอใช้รถ
          </button>

          <button
            onClick={() => setActiveTab('schedules')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition ${
              activeTab === 'schedules'
                ? 'bg-[#aa4e6e] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-[#aa4e6e]'
            }`}
          >
            <Calendar size={15} />
            ตารางเวลาคนขับและรถยนต์
          </button>

          <button
            onClick={() => setActiveTab('admin')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition ${
              activeTab === 'admin'
                ? 'bg-[#aa4e6e] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-[#aa4e6e]'
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
            className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-lg flex items-center gap-3 max-w-sm border animate-slide-up print:hidden ${
              toastMsg.type === 'error'
                ? 'bg-[#3b0712] border-[#9f1239] text-rose-100'
                : 'bg-slate-900 border-slate-800 text-white'
            }`}
            id="toast-notification"
          >
            <div className={`p-2 rounded-xl ${
              toastMsg.type === 'error'
                ? 'bg-rose-500/20 text-rose-400'
                : 'bg-emerald-500/15 text-emerald-400'
            }`}>
              {toastMsg.type === 'error' ? <AlertCircle size={18} /> : <FileCheck size={18} />}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400">
                {toastMsg.type === 'error' ? 'แจ้งพพบข้อผิดพลาด' : 'แจ้งเตือนจากระบบ พมจ.'}
              </p>
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
              departmentHeads={departmentHeads}
              onSave={handleSaveBooking}
              onCancel={() => {
                setEditingBooking(undefined);
                setActiveTab('bookings');
              }}
              isAdmin={isAdminLoggedIn}
            />
          )}

          {activeTab === 'mileage' && (
            <MileageTracker
              bookings={bookings}
              vehicles={vehicles}
              drivers={drivers}
              onCompleteBookingWithMileage={handleCompleteBookingWithMileage}
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
              departmentHeads={departmentHeads}
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
                departmentHeads={departmentHeads}
                bookings={bookings}
                onSaveVehicle={handleSaveVehicle}
                onDeleteVehicle={handleDeleteVehicle}
                onSaveDriver={handleSaveDriver}
                onDeleteDriver={handleDeleteDriver}
                onSaveApprover={handleSaveApprover}
                onDeleteApprover={handleDeleteApprover}
                onSaveCaretaker={handleSaveCaretaker}
                onDeleteCaretaker={handleDeleteCaretaker}
                onSaveDepartmentHead={handleSaveDepartmentHead}
                onDeleteDepartmentHead={handleDeleteDepartmentHead}
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
