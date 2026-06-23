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
  Gauge,
  ChevronLeft,
  ChevronRight,
  Search,
  LogOut,
  Sun,
  Moon,
  Shield,
  Key
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

  // Sidebar customizations matching the classic dashboard design
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('pmj_trang_sidebar_collapsed') === 'true';
  });
  const [sidebarTheme, setSidebarTheme] = useState<'light' | 'dark'>(() => {
    localStorage.removeItem('pmj_trang_sidebar_theme');
    return 'light';
  });
  const [sidebarSearch, setSidebarSearch] = useState<string>('');

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('pmj_trang_sidebar_collapsed', String(next));
      return next;
    });
  };

  const toggleSidebarTheme = () => {
    setSidebarTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('pmj_trang_sidebar_theme', next);
      return next;
    });
  };

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

  // Synchronize document body class for global dark mode
  useEffect(() => {
    if (sidebarTheme === 'dark') {
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
      document.body.style.backgroundColor = '#0d0e11';
    } else {
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
      document.body.style.backgroundColor = '#e0dedf';
    }
  }, [sidebarTheme]);

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
    <div className={`min-h-screen flex flex-col md:flex-row font-sans antialiased transition-all duration-300 ${
      sidebarTheme === 'dark' 
        ? 'dark-theme bg-[#0d0e11] text-slate-200' 
        : 'light-theme bg-[#f8fafc] text-slate-800'
    }`}>
      
      {/* Desktop Edge-to-Edge Navigation Sidebar - Persistent, Full Height, No gaps */}
      <aside className={`hidden md:flex flex-col h-screen sticky top-0 shrink-0 border-r transition-all duration-300 select-none print:hidden z-50
        ${isSidebarCollapsed ? 'w-20' : 'w-60'}
        ${sidebarTheme === 'dark' 
          ? 'bg-[#18191c] border-slate-800/80 text-slate-100 shadow-xl' 
          : 'bg-white border-slate-200/75 text-[#334155] shadow-xs'}
      `}>
        <div className="flex flex-col h-full p-4 relative select-none">
          
          {/* Collapse toggle arrow floating button on the right edge */}
          <button
            onClick={toggleSidebarCollapse}
            className={`absolute top-7 -right-3.5 z-50 w-7 h-7 rounded-full border flex items-center justify-center cursor-pointer transition-all duration-300 shadow-xs hover:scale-110 active:scale-95
              ${sidebarTheme === 'dark'
                ? 'bg-[#18191c] border-slate-700 text-slate-300 hover:bg-[#25262a]'
                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
            title={isSidebarCollapsed ? 'ขยายแถบเมนู' : 'ย่อแถบเมนู'}
          >
            {isSidebarCollapsed ? <ChevronRight size={14} className="stroke-[3px]" /> : <ChevronLeft size={14} className="stroke-[3px]" />}
          </button>

          {/* Sidebar Branding Title block */}
          <div className={`flex items-center gap-3 px-1 py-1 mb-4 shrink-0 transition-all duration-200 ${isSidebarCollapsed ? 'justify-center' : 'justify-start'}`}>
            <div className="w-10 h-10 rounded-xl bg-[#aa4e6e] text-white flex items-center justify-center shadow-xs font-sans shrink-0 transform transition duration-300 hover:rotate-6">
              <span className="text-base font-extrabold tracking-tight">พม</span>
            </div>
            {!isSidebarCollapsed && (
              <div className="flex flex-col truncate animate-fade-in animate-duration-300">
                <span className={`text-[#aa4e6e] font-extrabold tracking-tight text-sm`}>พมจ.ตรัง</span>
                <span className={`text-[10px] font-bold ${sidebarTheme === 'dark' ? 'text-slate-400' : 'text-slate-400'} mt-0.5 tracking-wider`}>ระบบบริการขอใช้รถ</span>
              </div>
            )}
          </div>

          {/* Search Input Filter */}
          <div className={`mb-3 shrink-0 ${isSidebarCollapsed ? 'flex justify-center' : ''}`}>
            <div className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition duration-200 border ${
              sidebarTheme === 'dark' 
                ? 'bg-[#222326] border-slate-800 text-slate-100' 
                : 'bg-slate-50 border-slate-100 text-slate-600'
            }`}>
              <Search size={15} className="shrink-0 text-slate-400" />
              {!isSidebarCollapsed && (
                <input 
                  type="text" 
                  placeholder="ค้นหาเมนู..." 
                  value={sidebarSearch}
                  onChange={(e) => setSidebarSearch(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs w-full placeholder-slate-400/80 font-bold focus:ring-0 p-0"
                />
              )}
            </div>
          </div>

          {/* Primary Menu Items List */}
          <div className="flex flex-col gap-1.5 flex-1 select-none overflow-y-auto pr-0.5" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {[
              { id: 'dashboard', label: 'หน้าแรก (Dashboard)', icon: <BarChart3 size={17} /> },
              { id: 'bookings', label: 'คลังใบขอใช้รถ', icon: <FileText size={17} /> },
              { id: 'form', label: 'เขียนใบขอใช้รถ', icon: <PlusCircle size={17} /> },
              { id: 'schedules', label: 'ตารางรถและคนขับ', icon: <Calendar size={17} /> },
              { id: 'mileage', label: 'บันทึกเลขไมล์เดินทาง', icon: <Gauge size={17} /> },
              { id: 'admin', label: 'ตั้งค่าพาหนะ/คนขับ', icon: <Settings size={17} /> },
            ]
            .filter(item => item.label.toLowerCase().includes(sidebarSearch.toLowerCase()))
            .map(item => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as any);
                    if (item.id !== 'form') {
                      setEditingBooking(undefined);
                    }
                  }}
                  className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-xs md:text-sm font-bold transition duration-200 cursor-pointer select-none w-full shrink-0 ${
                    isSidebarCollapsed ? 'justify-center font-normal' : 'justify-start'
                  } ${
                    isActive
                      ? 'bg-[#aa4e6e] text-white shadow-md shadow-[#aa4e6e]/15'
                      : sidebarTheme === 'dark'
                        ? 'text-slate-400 hover:bg-[#222326] hover:text-[#aa4e6e]'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-[#aa4e6e]'
                  }`}
                  title={item.label}
                >
                  <div className="shrink-0 animate-scale-in">
                    {item.icon}
                  </div>
                  {!isSidebarCollapsed && (
                    <span className="truncate">{item.label}</span>
                  )}
                </button>
              );
            })}

            {editingBooking && (
              <div className={`flex items-center gap-2 mt-2 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs font-semibold shrink-0 ${
                isSidebarCollapsed ? 'justify-center' : 'justify-start'
              }`}>
                <AlertCircle size={14} className="text-amber-500 shrink-0" />
                {!isSidebarCollapsed && (
                  <span className="truncate text-amber-500">แก้ไขด่วน #9499</span>
                )}
              </div>
            )}
          </div>

          {/* Footer Admin Action Toggles (Logout alignment) */}
          <div className={`mt-auto pt-3 border-t ${
            sidebarTheme === 'dark' ? 'border-slate-800/80' : 'border-slate-100'
          }`}>
            {/* User Role / Status Banner */}
            <div className={`mb-2 p-2.5 rounded-2xl border transition duration-200 shrink-0 ${
              isAdminLoggedIn
                ? sidebarTheme === 'dark'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-xs shadow-emerald-900/5'
                  : 'bg-emerald-50/80 border-emerald-200 text-emerald-800 shadow-2xs shadow-emerald-100/30'
                : sidebarTheme === 'dark'
                  ? 'bg-[#222326]/65 border-slate-800 text-slate-400'
                  : 'bg-slate-50 border-slate-150 text-slate-600 shadow-3xs'
            }`}>
              {isSidebarCollapsed ? (
                <div className="flex justify-center" title={isAdminLoggedIn ? 'สถานะ: แอดมิน (Admin)' : 'สถานะ: ผู้ใช้งานทั่วไป (General)'}>
                  {isAdminLoggedIn ? (
                    <div className="relative flex items-center justify-center">
                      <Shield size={18} className="text-emerald-500" />
                      <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-white animate-pulse"></span>
                    </div>
                  ) : (
                    <div className="relative flex items-center justify-center">
                      <User size={18} className="text-slate-400" />
                      <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-slate-400 border border-white"></span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    isAdminLoggedIn
                      ? sidebarTheme === 'dark' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-500/15 text-emerald-600'
                      : sidebarTheme === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-slate-200/55 text-slate-500'
                  }`}>
                    {isAdminLoggedIn ? <Shield size={16} /> : <User size={16} />}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400/80">
                      ระดับผู้ใช้งาน
                    </span>
                    <span className="text-xs font-bold truncate flex items-center gap-1.5 mt-0.5">
                      {isAdminLoggedIn ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          แอดมิน (Admin)
                        </>
                      ) : (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                          ผู้ใช้งานทั่วไป
                        </>
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {isAdminLoggedIn ? (
              <button
                onClick={handleAdminLogout}
                className={`flex items-center gap-3.5 w-full px-3.5 py-2.5 rounded-xl text-xs md:text-sm font-bold transition duration-200 hover:bg-rose-500/15 text-[#aa4e6e] ${
                  isSidebarCollapsed ? 'justify-center' : 'justify-start'
                } cursor-pointer`}
                title="ออกจากระบบผู้ดูแล"
              >
                <LogOut size={16} className="shrink-0" />
                {!isSidebarCollapsed && <span className="truncate">ออกจากระบบ Admin</span>}
              </button>
            ) : (
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-3.5 w-full px-3.5 py-2.5 rounded-xl text-xs md:text-sm font-bold transition duration-200 ${
                  isSidebarCollapsed ? 'justify-center' : 'justify-start'
                } ${
                  sidebarTheme === 'dark'
                    ? 'text-slate-400 hover:bg-[#222326] hover:text-white'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-[#aa4e6e]'
                } cursor-pointer`}
                title="เข้าสู่ระบบ Admin"
              >
                <User size={16} className="shrink-0" />
                {!isSidebarCollapsed && <span className="truncate">เข้าสู่ระบบ Admin</span>}
              </button>
            )}

          </div>

        </div>
      </aside>

      {/* Main Right-side Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        
        {/* Top Professional Header Bar - Hidden during A4 Printing */}
        <header className="bg-white border-b border-slate-150 shrink-0 sticky top-0 z-40 print:hidden shadow-3xs">
          <div className="w-full px-4 sm:px-6 lg:px-8 min-h-18 py-3 flex flex-col md:flex-row items-center justify-between gap-4">
            
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
              </div>
            </div>

          </div>
        </header>

        {/* Dynamic Content View Area */}
        <main className="flex-1 py-6 px-4 sm:px-6 lg:px-8 flex flex-col gap-6 print:p-0 print:m-0 w-full max-w-5xl mx-auto min-h-0">
          
          {/* Mobile Horizontal Navigation Ribbon (Scrollable) - Only visible on smartphones */}
          <div className="md:hidden flex flex-col gap-2 w-full print:hidden">
            <div className={`p-2 rounded-2xl shadow-xs border flex items-center justify-between transition-all duration-200 ${
              sidebarTheme === 'dark' 
                ? 'bg-[#18191c] border-slate-800/80 text-white' 
                : 'bg-white border-slate-200/75 text-slate-850'
            }`}>
              <span className="text-[11px] font-extrabold text-slate-400 font-sans tracking-wide">ระดับผู้ใช้งาน</span>
              {isAdminLoggedIn ? (
                <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/15 rounded-xl text-xs font-bold font-sans">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  แอดมิน (Admin)
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-500/10 text-slate-500 border border-slate-500/10 rounded-xl text-xs font-bold font-sans">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                  ผู้ใช้ทั่วไป
                </span>
              )}
            </div>
            <div className={`border p-1.5 rounded-2xl shadow-xs flex flex-row gap-1 w-full overflow-x-auto select-none ${
              sidebarTheme === 'dark' 
                ? 'bg-[#18191c] border-slate-800/80 text-white' 
                : 'bg-white border-slate-200/75 text-slate-800'
            }`}>
              {[
                { id: 'dashboard', label: 'หน้าแรก', icon: <BarChart3 size={15} /> },
                { id: 'bookings', label: 'คลังรถ', icon: <FileText size={15} /> },
                { id: 'form', label: 'เขียนขอรถ', icon: <PlusCircle size={15} /> },
                { id: 'schedules', label: 'ตารางวิ่ง', icon: <Calendar size={15} /> },
                { id: 'mileage', label: 'เลขไมล์', icon: <Gauge size={15} /> },
                { id: 'admin', label: 'ตั้งค่า', icon: <Settings size={15} /> },
              ].map(item => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id as any);
                      if (item.id !== 'form') {
                        setEditingBooking(undefined);
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition duration-200 cursor-pointer shrink-0 ${
                      isActive
                        ? 'bg-[#aa4e6e] text-white shadow-xs'
                        : sidebarTheme === 'dark'
                          ? 'text-slate-400 hover:bg-slate-800'
                          : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
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
    </div>
  );
}
