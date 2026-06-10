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
import { Booking, Vehicle, Driver, BookingStatus, Approver, Caretaker, DepartmentHead } from '../types';
import { DEPARTMENTS, generateNextPermitNumber } from '../data/initialData';
import { findConflicts, formatThaiDate, formatForInput, translateVehicleType } from '../utils/bookingUtils';

interface BookingFormProps {
  bookingToEdit?: Booking;
  bookings: Booking[];
  vehicles: Vehicle[];
  drivers: Driver[];
  approvers: Approver[];
  caretakers: Caretaker[];
  departmentHeads: DepartmentHead[];
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
  departmentHeads = [],
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
    passengersList: [] as string[],
    startDate: '',
    endDate: '',
    vehicleId: '',
    driverId: '',
    status: 'pending' as BookingStatus,
    approvedBy: '',
    approvedByPosition: '',
    caretakerName: '',
    caretakerPosition: '',
    departmentHeadName: '',
    departmentHeadPosition: '',
    departmentHeadRank: '',
    remarks: '',
    startMileage: '',
    endMileage: ''
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  
  const [isCustomDeptHead, setIsCustomDeptHead] = useState(false);
  const [selectedDeptHeadId, setSelectedDeptHeadId] = useState('');
  
  const [startThaiDate, setStartThaiDate] = useState('');
  const [start24Time, setStart24Time] = useState('');
  const [endThaiDate, setEndThaiDate] = useState('');
  const [end24Time, setEnd24Time] = useState('');
  const [activeField, setActiveField] = useState<string | null>(null);

  // Helper converters
  const toThaiBEDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear() + 543;
    return `${d}/${m}/${y}`;
  };

  const toTimeStr = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}.${m}`;
  };

  const parseToISODateTime = (dateThaiBE: string, time24: string): string => {
    try {
      const dateParts = dateThaiBE.trim().split('/');
      if (dateParts.length !== 3) return '';
      const d = parseInt(dateParts[0], 10);
      const m = parseInt(dateParts[1], 10) - 1; // 0-indexed month
      const yBE = parseInt(dateParts[2], 10);
      if (isNaN(d) || isNaN(m) || isNaN(yBE)) return '';
      if (dateParts[2].trim().length < 4) return ''; // Do not parse until the year is fully 4 digits BE
      const yAD = yBE - 543;

      // parsing time24: "HH.MM" or "HH:MM"
      const timeParts = time24.trim().split(/[:\.]/);
      const h = timeParts[0] ? parseInt(timeParts[0], 10) : 0;
      const min = timeParts[1] ? parseInt(timeParts[1], 10) : 0;
      if (isNaN(h) || isNaN(min)) return '';

      const dateObj = new Date(yAD, m, d, h, min, 0);
      if (isNaN(dateObj.getTime())) return '';

      const yearStr = String(dateObj.getFullYear()).padStart(4, '0');
      const monthStr = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dayStr = String(dateObj.getDate()).padStart(2, '0');
      const hourStr = String(dateObj.getHours()).padStart(2, '0');
      const minStr = String(dateObj.getMinutes()).padStart(2, '0');
      return `${yearStr}-${monthStr}-${dayStr}T${hourStr}:${minStr}`;
    } catch {
      return '';
    }
  };

  // Helper formatting for live input typing
  const formatThaiDateInput = (val: string, prevVal: string): string => {
    if (val.length < prevVal.length) {
      return val; // Allow deletion/backspace
    }
    
    // Clean all non-digit and non-slash characters first
    let clean = val.replace(/[^0-9/]/g, '');
    
    // Split by slash
    const parts = clean.split('/');
    if (parts.length > 3) parts.splice(3); // maximum 3 parts
    
    // Limit first part (Day) to 2 digits
    if (parts[0] && parts[0].length > 2) {
      const extra = parts[0].slice(2);
      parts[0] = parts[0].slice(0, 2);
      if (!parts[1]) parts[1] = extra;
      else parts[1] = extra + parts[1];
    }
    // Limit second part (Month) to 2 digits
    if (parts[1] && parts[1].length > 2) {
      const extra = parts[1].slice(2);
      parts[1] = parts[1].slice(0, 2);
      if (!parts[2]) parts[2] = extra;
      else parts[2] = extra + parts[2];
    }
    // Limit third part (Year) to 4 digits
    if (parts[2] && parts[2].length > 4) {
      parts[2] = parts[2].slice(0, 4);
    }

    // Auto-insert slash when user finishes typing a section
    if (parts[0] && parts[0].length === 2 && parts.length === 1) {
      return parts[0] + '/';
    }
    if (parts[1] && parts[1].length === 2 && parts.length === 2) {
      return parts[0] + '/' + parts[1] + '/';
    }

    // Otherwise reconstruct the string
    return parts.join('/');
  };

  const formatTimeInput = (val: string, prevVal: string): string => {
    if (val.length < prevVal.length) {
      return val; // Allow deletion/backspace
    }
    
    // Clean all non-digit and non-dot/non-colon characters
    // Convert colons ":" to dots "." so it's uniform
    let clean = val.replace(/:/g, '.').replace(/[^0-9.]/g, '');
    
    // Split by dot
    const parts = clean.split('.');
    if (parts.length > 2) parts.splice(2); // maximum 2 parts
    
    // Limit first part (Hour) to 2 digits
    if (parts[0] && parts[0].length > 2) {
      const extra = parts[0].slice(2);
      parts[0] = parts[0].slice(0, 2);
      if (!parts[1]) parts[1] = extra;
      else parts[1] = extra + parts[1];
    }
    // Limit second part (Minutes) to 2 digits
    if (parts[1] && parts[1].length > 2) {
      parts[1] = parts[1].slice(0, 2);
    }

    // Auto-insert dot when user finishes typing Hour
    if (parts[0] && parts[0].length === 2 && parts.length === 1) {
      return parts[0] + '.';
    }

    // Otherwise reconstruct
    return parts.join('.');
  };

  // Sync to local states when formData changes from outside/initial
  useEffect(() => {
    if (formData.startDate) {
      if (activeField !== 'startDate' && activeField !== 'startTime') {
        setStartThaiDate(toThaiBEDate(formData.startDate));
        setStart24Time(toTimeStr(formData.startDate));
      }
    }
  }, [formData.startDate, activeField]);

  useEffect(() => {
    if (formData.endDate) {
      if (activeField !== 'endDate' && activeField !== 'endTime') {
        setEndThaiDate(toThaiBEDate(formData.endDate));
        setEnd24Time(toTimeStr(formData.endDate));
      }
    }
  }, [formData.endDate, activeField]);

  const handleStartThaiDateChange = (val: string) => {
    const formattedDate = formatThaiDateInput(val, startThaiDate);
    setStartThaiDate(formattedDate);
    const isoStr = parseToISODateTime(formattedDate, start24Time);
    if (isoStr) {
      setFormData(prev => ({ ...prev, startDate: isoStr }));
      if (errors.startDate) {
        setErrors(prev => {
          const copy = { ...prev };
          delete copy.startDate;
          return copy;
        });
      }
    } else {
      setFormData(prev => ({ ...prev, startDate: '' }));
    }
  };

  const handleStart24TimeChange = (val: string) => {
    const formattedTime = formatTimeInput(val, start24Time);
    setStart24Time(formattedTime);
    const isoStr = parseToISODateTime(startThaiDate, formattedTime);
    if (isoStr) {
      setFormData(prev => ({ ...prev, startDate: isoStr }));
      if (errors.startDate) {
        setErrors(prev => {
          const copy = { ...prev };
          delete copy.startDate;
          return copy;
        });
      }
    } else {
      setFormData(prev => ({ ...prev, startDate: '' }));
    }
  };

  const handleEndThaiDateChange = (val: string) => {
    const formattedDate = formatThaiDateInput(val, endThaiDate);
    setEndThaiDate(formattedDate);
    const isoStr = parseToISODateTime(formattedDate, end24Time);
    if (isoStr) {
      setFormData(prev => ({ ...prev, endDate: isoStr }));
      if (errors.endDate) {
        setErrors(prev => {
          const copy = { ...prev };
          delete copy.endDate;
          return copy;
        });
      }
    } else {
      setFormData(prev => ({ ...prev, endDate: '' }));
    }
  };

  const handleEnd24TimeChange = (val: string) => {
    const formattedTime = formatTimeInput(val, end24Time);
    setEnd24Time(formattedTime);
    const isoStr = parseToISODateTime(endThaiDate, formattedTime);
    if (isoStr) {
      setFormData(prev => ({ ...prev, endDate: isoStr }));
      if (errors.endDate) {
        setErrors(prev => {
          const copy = { ...prev };
          delete copy.endDate;
          return copy;
        });
      }
    } else {
      setFormData(prev => ({ ...prev, endDate: '' }));
    }
  };
  
  // Custom states for wizard / presentation
  const [formMode, setFormMode] = useState<'step' | 'all'>('all');
  const [currentStep, setCurrentStep] = useState(1);

  const handleSelectDestinationTag = (tag: string) => {
    setFormData(prev => ({ ...prev, destination: tag }));
    setErrors(prev => {
      const copy = { ...prev };
      delete copy.destination;
      return copy;
    });
  };

  const handleSelectPurposeTag = (tag: string) => {
    setFormData(prev => ({ ...prev, purpose: tag }));
    setErrors(prev => {
      const copy = { ...prev };
      delete copy.purpose;
      return copy;
    });
  };

  // Helper to find the last recorded mileage of a vehicle
  const getLastVehicleMileage = (vId: string): number => {
    const targetVeh = vehicles.find(v => v.id === vId);
    const baseMileage = targetVeh?.mileage || 0;
    
    if (!bookings || bookings.length === 0) return baseMileage;
    
    const chosenStartStr = formData?.startDate || (bookingToEdit?.startDate) || '';
    const chosenStartTime = chosenStartStr ? new Date(chosenStartStr).getTime() : Infinity;

    // 1. Prior Bookings chronologically
    const priorBookings = bookings.filter(
      b => b.vehicleId === vId && 
           b.id !== bookingToEdit?.id && 
           b.status !== 'cancelled' && 
           b.status !== 'rejected' &&
           (chosenStartTime === Infinity || new Date(b.startDate).getTime() < chosenStartTime)
    );

    if (priorBookings.length > 0) {
      const sorted = [...priorBookings].sort(
        (a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
      );
      
      for (const b of sorted) {
        if (b.endMileage !== undefined && b.endMileage !== null && b.endMileage > 0) {
          return b.endMileage;
        }
        if (b.startMileage !== undefined && b.startMileage !== null && b.startMileage > 0) {
          return b.startMileage;
        }
      }

      let maxMil = 0;
      for (const b of priorBookings) {
        if (b.endMileage && b.endMileage > maxMil) maxMil = b.endMileage;
        if (b.startMileage && b.startMileage > maxMil) maxMil = b.startMileage;
      }
      if (maxMil > 0) return maxMil;
    }

    // 2. Subsequent Bookings (if no prior bookings exist or none have mileage recorded)
    const subsequentBookings = bookings.filter(
      b => b.vehicleId === vId &&
           b.id !== bookingToEdit?.id &&
           b.status !== 'cancelled' &&
           b.status !== 'rejected' &&
           (chosenStartTime !== Infinity && new Date(b.startDate).getTime() >= chosenStartTime)
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

    // 3. Overall minimum of any completed/mileage bookings for this vehicle
    const anyWithMileage = bookings.filter(
      b => b.vehicleId === vId &&
           b.id !== bookingToEdit?.id &&
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

  // Auto-generate run-number or populate for editing
  useEffect(() => {
    if (isEditMode && bookingToEdit) {
      const currentName = bookingToEdit.departmentHeadName || '';
      const currentPosition = bookingToEdit.departmentHeadPosition || '';
      const foundHead = departmentHeads.find(h => h.name === currentName);
      const isCustom = !foundHead || currentPosition.startsWith('แทน');
      
      setIsCustomDeptHead(isCustom);
      if (isCustom) {
        const originalPos = currentPosition.replace(/^แทน\s*/, '');
        const matchedHead = departmentHeads.find(h => h.position === originalPos) || departmentHeads[0];
        setSelectedDeptHeadId(matchedHead?.id || '');
      } else {
        setSelectedDeptHeadId(foundHead?.id || (departmentHeads[0]?.id || ''));
      }

      setFormData({
        permitNumber: bookingToEdit.permitNumber,
        requesterName: bookingToEdit.requesterName,
        requesterPosition: bookingToEdit.requesterPosition,
        department: bookingToEdit.department,
        destination: bookingToEdit.destination,
        purpose: bookingToEdit.purpose,
        passengersCount: bookingToEdit.passengersCount,
        passengersList: bookingToEdit.passengersList || [],
        startDate: formatForInput(bookingToEdit.startDate),
        endDate: formatForInput(bookingToEdit.endDate),
        vehicleId: bookingToEdit.vehicleId,
        driverId: bookingToEdit.driverId,
        status: bookingToEdit.status,
        approvedBy: bookingToEdit.approvedBy,
        approvedByPosition: bookingToEdit.approvedByPosition,
        caretakerName: bookingToEdit.caretakerName || (caretakers[0]?.name || ''),
        caretakerPosition: bookingToEdit.caretakerPosition || (caretakers[0]?.position || ''),
        departmentHeadName: bookingToEdit.departmentHeadName || (departmentHeads[0]?.name || ''),
        departmentHeadPosition: bookingToEdit.departmentHeadPosition || (departmentHeads[0]?.position || ''),
        departmentHeadRank: bookingToEdit.departmentHeadRank || (foundHead?.rank || (departmentHeads[0]?.rank || '')),
        remarks: bookingToEdit.remarks || '',
        startMileage: bookingToEdit.startMileage !== undefined ? String(bookingToEdit.startMileage) : String(getLastVehicleMileage(bookingToEdit.vehicleId)),
        endMileage: bookingToEdit.endMileage !== undefined ? String(bookingToEdit.endMileage) : ''
      });
    } else {
      // Create mode: pre-fill dates starting from current time
      const nextNum = generateNextPermitNumber(bookings);
      const now = new Date();
      const defaultStart = now;
      
      const defaultVehicleId = vehicles[0]?.id || '';
      const autoStartMileage = defaultVehicleId ? getLastVehicleMileage(defaultVehicleId) : 0;

      setIsCustomDeptHead(false);
      setSelectedDeptHeadId(departmentHeads[0]?.id || '');

      setFormData(prev => ({
        ...prev,
        permitNumber: nextNum,
        startDate: formatForInput(defaultStart.toISOString()),
        endDate: '',
        vehicleId: defaultVehicleId,
        driverId: drivers[0]?.id || '',
        approvedBy: approvers[0]?.name || '',
        approvedByPosition: approvers[0]?.position || '',
        caretakerName: caretakers[0]?.name || '',
        caretakerPosition: caretakers[0]?.position || '',
        departmentHeadName: departmentHeads[0]?.name || '',
        departmentHeadPosition: departmentHeads[0]?.position || '',
        departmentHeadRank: departmentHeads[0]?.rank || '',
        startMileage: autoStartMileage > 0 ? String(autoStartMileage) : '0',
        endMileage: ''
      }));
    }
  }, [bookingToEdit, bookings, isEditMode, vehicles, drivers, approvers, caretakers, departmentHeads]);

  // Live validation & overlap detection
  const vehicleConflicts = useMemo(() => {
    if (!formData.vehicleId || !formData.startDate) return [];
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
    if (!formData.driverId || formData.driverId === 'self-drive' || !formData.startDate) return [];
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

  const handleCustomDeptHeadToggle = (checked: boolean) => {
    setIsCustomDeptHead(checked);
    
    if (checked) {
      const parentHead = departmentHeads.find(h => h.id === selectedDeptHeadId) || departmentHeads[0];
      if (parentHead) {
        const basePosition = parentHead.position;
        const newPos = basePosition.startsWith('แทน') ? basePosition : `แทน${basePosition}`;
        setFormData(prev => ({
          ...prev,
          departmentHeadName: '',
          departmentHeadPosition: newPos,
          departmentHeadRank: parentHead.rank || ''
        }));
      }
    } else {
      const parentHead = departmentHeads.find(h => h.id === selectedDeptHeadId) || departmentHeads[0];
      if (parentHead) {
        setFormData(prev => ({
          ...prev,
          departmentHeadName: parentHead.name,
          departmentHeadPosition: parentHead.position,
          departmentHeadRank: parentHead.rank || ''
        }));
      }
    }
  };

  const handleCustomParentHeadClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSelectedDeptHeadId(newId);
    const selectedHead = departmentHeads.find(h => h.id === newId);
    if (selectedHead) {
      const basePosition = selectedHead.position;
      const newPos = basePosition.startsWith('แทน') ? basePosition : `แทน${basePosition}`;
      setFormData(prev => ({
        ...prev,
        departmentHeadPosition: newPos,
        departmentHeadRank: selectedHead.rank || ''
      }));
    }
  };

  const handleCustomDeptHeadNameChange = (val: string) => {
    setFormData(prev => ({
      ...prev,
      departmentHeadName: val
    }));
  };

  // Handle Input Changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Auto-update department head if department changes
    if (name === 'department') {
      let matchedHead: any = undefined;
      if (value.includes('พัฒนา') || value.includes('สวัสดิการ')) {
        matchedHead = departmentHeads.find(h => h.id === 'H1' || h.name === 'นางเสาวลักษณ์ มลสวัสดิ์' || h.position.includes('พัฒนา') || h.position.includes('สวัสดิการ'));
      } else if (value.includes('นโยบาย') || value.includes('วิชาการ')) {
        matchedHead = departmentHeads.find(h => h.id === 'H2' || h.name === 'นายชัยยศ ศุภโชค' || h.position.includes('นโยบาย') || h.position.includes('วิชาการ'));
      } else if (value.includes('คนพิการ')) {
        matchedHead = departmentHeads.find(h => h.id === 'H3' || h.name === 'นางกนกพร สัจจารักษ์' || h.position.includes('คนพิการ'));
      } else if (value.includes('บริหารทั่วไป') || value.includes('อำนวยการ') || value.includes('กลาง')) {
        matchedHead = departmentHeads.find(h => h.id === 'H4' || h.name === 'นายสุมิตร นิรันดร์' || h.position.includes('บริหารทั่วไป') || h.position.includes('อำนวยการ') || h.position.includes('กลาง'));
      }
      
      if (matchedHead) {
        setSelectedDeptHeadId(matchedHead.id || '');
        const basePosition = matchedHead.position;
        const baseRank = matchedHead.rank || '';
        if (isCustomDeptHead) {
          const newPos = basePosition.startsWith('แทน') ? basePosition : `แทน${basePosition}`;
          setFormData(prev => ({
            ...prev,
            department: value,
            departmentHeadPosition: newPos,
            departmentHeadRank: baseRank
          }));
        } else {
          setFormData(prev => ({
            ...prev,
            department: value,
            departmentHeadName: matchedHead.name,
            departmentHeadPosition: basePosition,
            departmentHeadRank: baseRank
          }));
        }
      } else {
        setFormData(prev => ({
          ...prev,
          department: value
        }));
      }

      if (errors[name]) {
        setErrors(prev => {
          const copy = { ...prev };
          delete copy[name];
          return copy;
        });
      }
      return;
    }

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

    // Auto-update departmentHead position if changer is departmentHeadName
    if (name === 'departmentHeadName') {
      const selectedHead = departmentHeads.find(h => h.name === value);
      setFormData(prev => ({
        ...prev,
        departmentHeadName: value,
        departmentHeadPosition: selectedHead?.position || '',
        departmentHeadRank: selectedHead?.rank || ''
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
      if (!formData.startDate) {
        const validStartFormat = /^\d{2}\/\d{2}\/\d{4}$/.test(startThaiDate);
        if (startThaiDate && !validStartFormat) {
          newErrors.startDate = 'กรุณาระบุวันที่ไปราชการในรูปแบบ วว/ดด/ปปปป (พ.ศ.) เช่น 28/05/2569';
        } else {
          newErrors.startDate = 'กรุณาระบุวัน-เวลาไปราชการให้ครบถ้วนถูกต้อง';
        }
      }
      if (endThaiDate || end24Time) {
        if (!formData.endDate) {
          const validEndFormat = /^\d{2}\/\d{2}\/\d{4}$/.test(endThaiDate);
          if (endThaiDate && !validEndFormat) {
            newErrors.endDate = 'กรุณาระบุวันที่กลับในรูปแบบ วว/ดด/ปปปป (พ.ศ.) เช่น 28/05/2569';
          } else {
            newErrors.endDate = 'กรุณาระบุวัน-เวลาเดินทางกลับให้ครบถ้วนถูกต้อง';
          }
        }
      }
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

  const validateForm = (): { isValid: boolean; errors: { [key: string]: string } } => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.permitNumber.trim()) newErrors.permitNumber = 'กรุณาระบุเลขที่ใบขออนุญาต';
    if (!formData.requesterName.trim()) newErrors.requesterName = 'กรุณาระบุชื่อผู้ขอใช้รถ';
    if (!formData.requesterPosition.trim()) newErrors.requesterPosition = 'กรุณาระบุตำแหน่งผู้ขอ';
    if (!formData.destination.trim()) newErrors.destination = 'กรุณาระบุสถานที่ไปราชการ';
    if (!formData.purpose.trim()) newErrors.purpose = 'กรุณาระบุวัตถุประสงค์การเดินทาง';
    if (!formData.startDate) newErrors.startDate = 'กรุณาระบุวัน-เวลาไป';
    if (endThaiDate || end24Time) {
      if (!formData.endDate) {
        newErrors.endDate = 'กรุณาระบุวัน-เวลากลับให้ครบถ้วนถูกต้อง';
      }
    }
    
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
    return {
      isValid: Object.keys(newErrors).length === 0,
      errors: newErrors
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = validateForm();
    if (!result.isValid) {
      const errorKeys = Object.keys(result.errors);
      if (errorKeys.length > 0) {
        const firstErrorKey = errorKeys[0];
        
        // Auto-navigate to correct step
        if (formMode === 'step') {
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
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.focus?.();
          }
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
      passengersList: formData.passengersList || [],
      startDate: new Date(formData.startDate).toISOString(),
      endDate: formData.endDate ? new Date(formData.endDate).toISOString() : '',
      vehicleId: formData.vehicleId,
      driverId: formData.driverId,
      status: formData.status,
      approvedBy: formData.approvedBy,
      approvedByPosition: formData.approvedByPosition,
      caretakerName: formData.caretakerName,
      caretakerPosition: formData.caretakerPosition,
      departmentHeadName: formData.departmentHeadName,
      departmentHeadPosition: formData.departmentHeadPosition,
      departmentHeadRank: formData.departmentHeadRank,
      remarks: formData.remarks,
      startMileage: formData.startMileage ? parseInt(formData.startMileage, 10) : undefined,
      endMileage: formData.endMileage ? parseInt(formData.endMileage, 10) : undefined,
      createdAt: isEditMode && bookingToEdit ? bookingToEdit.createdAt : new Date().toISOString()
    };

    onSave(payload);
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
            <div className="p-2.5 bg-rose-50 rounded-2xl text-[#aa4e6e]">
              <ClipboardList size={26} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                {isEditMode ? 'แก้ไขใบอนุมัติการขอใช้รถ' : 'เขียนใบสำรองขอจองรถราชการ'}
              </h2>
              <p className="text-[#aa4e6e] font-bold text-xs uppercase tracking-wider">
                สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดตรัง (สนง.พมจ.ตรัง)
              </p>
            </div>
          </div>
        </div>

        {/* Presentation Toggle & Action Row */}
        <div className="flex flex-wrap items-center gap-4 sm:self-end lg:self-center">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-2 text-xs font-bold border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
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

      <form onSubmit={handleSubmit} className="space-y-8">
        

        
        {/* =======================================
            STEP 1: journey timing and destination 
            ======================================= */}
        {(formMode === 'all' || currentStep === 1) && (
          <div className="bg-white border border-slate-100 rounded-2xl p-5 md:p-6 shadow-xs space-y-6 transition-all" id="step-1-journey">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
              <div className="h-6 w-1 rounded-full bg-[#aa4e6e]" />
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-[#aa4e6e]" />
                <h3 className="text-base font-extrabold text-slate-800">
                  ส่วนที่ 1 : วันเวลาเดินทางปฏิบัติราชการ & ปลายทางหลัก
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Departure */}
              <div className="space-y-1.5 animate-fade-in">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Clock size={13} className="text-[#aa4e6e]" />
                  <span>วัน-เวลาเดินทางไปราชการ (วว/ดด/ปปปป(พ.ศ.) เวลา 24 น.)</span>
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {/* Date format input */}
                  <div className="col-span-3 relative flex items-center">
                    <input
                      type="text"
                      placeholder="วว/ดด/ปปปป (พ.ศ.)"
                      value={startThaiDate}
                      onFocus={() => setActiveField('startDate')}
                      onBlur={() => setActiveField(null)}
                      onChange={(e) => handleStartThaiDateChange(e.target.value)}
                      className={`w-full pl-3 pr-8 py-2.5 border rounded-xl text-xs font-semibold text-slate-700 bg-slate-50/50 ${
                        errors.startDate ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200 focus:ring-rose-200 focus:border-[#aa4e6e]'
                      } outline-none focus:ring-2`}
                    />
                    <div className="absolute right-2.5 flex items-center justify-center cursor-pointer hover:text-[#aa4e6e] w-6 h-6 rounded-md hover:bg-slate-100 transition">
                      <Calendar size={13} className="text-slate-450 pointer-events-none" />
                      <input
                        type="date"
                        onChange={(e) => {
                          if (e.target.value) {
                            const [y, m, d] = e.target.value.split('-');
                            const yBE = parseInt(y, 10) + 543;
                            handleStartThaiDateChange(`${d}/${m}/${yBE}`);
                          }
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </div>
                  </div>
                  {/* Time 24 hr format input */}
                  <div className="col-span-2 relative flex items-center">
                    <input
                      type="text"
                      placeholder="เวลา (24 น.)"
                      value={start24Time}
                      onFocus={() => setActiveField('startTime')}
                      onBlur={() => setActiveField(null)}
                      onChange={(e) => handleStart24TimeChange(e.target.value)}
                      className={`w-full pl-3 pr-8 py-2.5 border rounded-xl text-xs font-semibold text-slate-700 bg-slate-50/50 ${
                        errors.startDate ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200 focus:ring-rose-200 focus:border-[#aa4e6e]'
                      } outline-none focus:ring-2`}
                    />
                    <div className="absolute right-2.5 flex items-center justify-center cursor-pointer hover:text-[#aa4e6e] w-6 h-6 rounded-md hover:bg-slate-100 transition">
                      <Clock size={13} className="text-slate-450 pointer-events-none" />
                      <input
                        type="time"
                        onChange={(e) => {
                          if (e.target.value) {
                            handleStart24TimeChange(e.target.value);
                          }
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </div>
                  </div>
                </div>

                {errors.startDate && <p className="text-xs text-rose-500 font-semibold">{errors.startDate}</p>}
                <p className="text-[10px] text-slate-400">ป้อน วัน/เดือน/ปีพ.ศ. (เช่น 28/05/2569) และเวลา (เช่น 08:30) หรือกดรูปไอคอนเพื่อแสดงปฏิทิน</p>
              </div>

              {/* Arrival */}
              <div className="space-y-1.5 animate-fade-in">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Clock size={13} className="text-[#aa4e6e]" />
                  <span>วัน-เวลาเดินทางกลับ (วว/ดด/ปปปป(พ.ศ.) เวลา 24 น.)</span>
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {/* Date format input */}
                  <div className="col-span-3 relative flex items-center">
                    <input
                      type="text"
                      placeholder="วว/ดด/ปปปป (พ.ศ.)"
                      value={endThaiDate}
                      onFocus={() => setActiveField('endDate')}
                      onBlur={() => setActiveField(null)}
                      onChange={(e) => handleEndThaiDateChange(e.target.value)}
                      className={`w-full pl-3 pr-8 py-2.5 border rounded-xl text-xs font-semibold text-slate-700 bg-slate-50/50 ${
                        errors.endDate ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200 focus:ring-rose-200 focus:border-[#aa4e6e]'
                      } outline-none focus:ring-2`}
                    />
                    <div className="absolute right-2.5 flex items-center justify-center cursor-pointer hover:text-[#aa4e6e] w-6 h-6 rounded-md hover:bg-slate-100 transition">
                      <Calendar size={13} className="text-slate-450 pointer-events-none" />
                      <input
                        type="date"
                        onChange={(e) => {
                          if (e.target.value) {
                            const [y, m, d] = e.target.value.split('-');
                            const yBE = parseInt(y, 10) + 543;
                            handleEndThaiDateChange(`${d}/${m}/${yBE}`);
                          }
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </div>
                  </div>
                  {/* Time 24 hr format input */}
                  <div className="col-span-2 relative flex items-center">
                    <input
                      type="text"
                      placeholder="เวลา (24 น.)"
                      value={end24Time}
                      onFocus={() => setActiveField('endTime')}
                      onBlur={() => setActiveField(null)}
                      onChange={(e) => handleEnd24TimeChange(e.target.value)}
                      className={`w-full pl-3 pr-8 py-2.5 border rounded-xl text-xs font-semibold text-slate-700 bg-slate-50/50 ${
                        errors.endDate ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200 focus:ring-rose-200 focus:border-[#aa4e6e]'
                      } outline-none focus:ring-2`}
                    />
                    <div className="absolute right-2.5 flex items-center justify-center cursor-pointer hover:text-[#aa4e6e] w-6 h-6 rounded-md hover:bg-slate-100 transition">
                      <Clock size={13} className="text-slate-450 pointer-events-none" />
                      <input
                        type="time"
                        onChange={(e) => {
                          if (e.target.value) {
                            handleEnd24TimeChange(e.target.value);
                          }
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </div>
                  </div>
                </div>

                {errors.endDate && <p className="text-xs text-rose-500 font-semibold">{errors.endDate}</p>}
                <p className="text-[10px] text-slate-400">ป้อน วัน/เดือน/ปีพ.ศ. (เช่น 28/05/2569) และเวลา (เช่น 16:30) หรือกดรูปไอคอนเพื่อแสดงปฏิทิน</p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Destination */}
              <div className="space-y-1.5 align-left">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <MapPin size={14} className="text-slate-400" />
                  <span>สถานที่ไปปฏิบัติราชการปลายทาง</span>
                </label>
                <textarea
                  name="destination"
                  value={formData.destination}
                  onChange={handleChange}
                  rows={1}
                  placeholder=""
                  className={`w-full px-4 py-1.5 border rounded-xl text-sm text-slate-700 ${
                    errors.destination ? 'border-rose-400 focus:ring-rose-200 focus:border-rose-400 bg-white' : 'border-slate-200 focus:ring-rose-100 focus:border-[#aa4e6e] bg-slate-50/30'
                  } outline-none focus:ring-2`}
                />
                {errors.destination && <p className="text-xs text-rose-500 font-semibold">{errors.destination}</p>}
              </div>

              {/* Purpose */}
              <div className="space-y-1.5 align-left">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <FileText size={14} className="text-slate-400" />
                  <span>วัตถุประสงค์ในการใช้รถยนต์ราชการ (ตามโครงการ/คำเชิญส่งงาน)</span>
                </label>
                <textarea
                  name="purpose"
                  value={formData.purpose}
                  onChange={handleChange}
                  rows={1}
                  placeholder=""
                  className={`w-full px-4 py-1.5 border rounded-xl text-sm text-slate-700 ${
                    errors.purpose ? 'border-rose-400 focus:ring-rose-200 focus:border-rose-400 bg-white' : 'border-slate-200 focus:ring-rose-100 focus:border-[#aa4e6e] bg-slate-50/30'
                  } outline-none focus:ring-2`}
                />
                {errors.purpose && <p className="text-xs text-rose-500 font-semibold">{errors.purpose}</p>}
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
              <div className="h-6 w-1 rounded-full bg-[#aa4e6e]" />
              <div className="flex items-center gap-2">
                <User size={18} className="text-[#aa4e6e]" />
                <h3 className="text-base font-extrabold text-slate-800">
                  ส่วนที่ 2 : ข้อมูลผู้ขออนุญาตใช้รถยนต์ & คณะเดินทางปฏิบัติงาน
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
                    placeholder="เช่น นายมัง คุดคัด"
                    className={`w-full px-4 py-2.5 border rounded-xl text-sm text-slate-700 ${
                      errors.requesterName ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200 focus:ring-indigo-100 focus:border-[#aa4e6e]'
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
                    errors.requesterPosition ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200 focus:ring-indigo-100 focus:border-[#aa4e6e]'
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
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100 focus:border-[#aa4e6e] bg-white text-slate-700 font-medium"
                  >
                    {DEPARTMENTS.map((dept, idx) => (
                      <option key={idx} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
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

                {/* รายชื่อผู้เดินทางร่วมเพิ่มเติม 1-13 คน */}
                {formData.passengersCount > 1 && (
                  <div className="mt-4 pt-4 border-t border-slate-100 animate-fade-in">
                    <h5 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-2.5">
                      👥 รายชื่อผู้เข้าร่วมเดินทางร่วม ({Math.min(13, formData.passengersCount - 1)} คน)
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {Array.from({ length: Math.min(13, formData.passengersCount - 1) }).map((_, idx) => {
                        const val = formData.passengersList?.[idx] || '';
                        return (
                          <div key={idx} className="relative">
                            <span className="absolute left-3 top-2.5 text-[10px] text-slate-400 font-bold font-mono">
                              {idx + 1}.
                            </span>
                            <input
                              type="text"
                              placeholder={`ชื่อ-นามสกุล ผู้ร่วมเดินทางคนที่ ${idx + 1}`}
                              value={val}
                              onChange={(e) => {
                                const listStr = [...(formData.passengersList || [])];
                                listStr[idx] = e.target.value;
                                setFormData(prev => ({ ...prev, passengersList: listStr }));
                              }}
                              className="w-full text-xs font-semibold pl-8 pr-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-rose-200 focus:border-[#aa4e6e] transition text-slate-800"
                            />
                          </div>
                        );
                      })}
                    </div>
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
              <div className="h-6 w-1 rounded-full bg-[#aa4e6e]" />
              <div className="flex items-center gap-2">
                <Car size={18} className="text-[#aa4e6e]" />
                <h3 className="text-base font-bold text-slate-800 font-sans">
                  ส่วนที่ 3 : จัดสรรยานพาหนะและระบุพนักงานประจำรถราชการ
                </h3>
              </div>
            </div>

            {/* Visual Vehicle Cards Selection Grid */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-widest block flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center bg-[#aa4e6e]/10 text-[#aa4e6e] text-[10px] w-5 h-5 rounded-full font-bold">
                    1
                  </span>
                  <span>เลือกยานพาหนะราชการ (6 คันในคลังส่วนกลาง)</span>
                </label>
                <div className="flex items-center gap-4 text-[10px] text-slate-400 font-semibold pl-6 sm:pl-0">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> ว่างพร้อมใช้
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> มีภารกิจทับ
                  </span>
                </div>
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
                      className={`text-left p-4.5 rounded-2xl border-2 transition-all relative flex flex-col justify-between min-h-[145px] hover:shadow-xs active:scale-[0.98] cursor-pointer outline-none select-none ${
                        isSelected 
                          ? 'border-[#aa4e6e] bg-[#aa4e6e]/5 shadow-sm ring-1 ring-[#aa4e6e]/20 border-l-4' 
                          : isConflict 
                            ? 'border-slate-100 bg-slate-50/50 opacity-80 hover:opacity-100 hover:border-rose-300' 
                            : 'border-slate-100 hover:border-[#aa4e6e]/30 bg-white shadow-2xs'
                      }`}
                    >
                      <div className="flex justify-between items-start w-full gap-2">
                        <div className="space-y-1">
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md leading-none block w-fit ${
                            isSelected 
                              ? 'bg-[#aa4e6e] text-white' 
                              : 'bg-slate-100 text-slate-500'
                          }`}>
                            {translateVehicleType(v.type)}
                          </span>
                          <h4 className="text-xs sm:text-[13px] font-semibold text-slate-800 leading-snug">
                            {v.name}
                          </h4>
                        </div>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-2xs border border-white" style={{ backgroundColor: v.imagePlaceholderColor || '#f1f5f9' }}>
                          <Car size={14} className="text-white" />
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-2">
                        <div className="inline-flex bg-white border border-slate-300 rounded-md px-2 py-0.5 shadow-3xs">
                          <span className="text-[10px] font-bold text-slate-800 font-sans tracking-tight">
                            {v.plateNumber}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                          <Users size={11} className="text-slate-400" />
                          {v.capacity} ที่นั่ง
                        </span>
                      </div>
                      
                      <div className="mt-3 pt-2 border-t border-slate-100/70 flex items-center justify-between">
                        {isConflict ? (
                          <span className="text-[10px] font-semibold px-1.5 py-1 rounded-md bg-rose-50 text-rose-600 border border-rose-100/60 flex items-center gap-1 leading-none">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                            ติดภารกิจอื่น
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-1.5 py-1 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100/60 flex items-center gap-1 leading-none">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-550" />
                            ว่างพร้อมใช้
                          </span>
                        )}
                        
                        {isSelected && (
                          <span className="text-[10px] font-semibold text-[#aa4e6e] flex items-center gap-1">
                            ✓ เลือกอยู่
                          </span>
                        )}
                      </div>
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
            <div className="space-y-4 pt-6 border-t border-slate-100/70">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <label className="text-xs font-black text-slate-700 uppercase tracking-widest block flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center bg-[#aa4e6e]/10 text-[#aa4e6e] text-[10px] w-5 h-5 rounded-full font-black">
                    2
                  </span>
                  <span>เลือกผู้ปฏิบัติงานขับรถยนต์ (พลขับ หรือเลือกขับขี่ตนเอง)</span>
                </label>
                <div className="flex items-center gap-4 text-[10px] text-slate-400 font-semibold pl-6 sm:pl-0">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> ว่างพร้อมขับ
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> คิวไม่ว่าง
                  </span>
                </div>
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
                  className={`text-left p-4.5 rounded-2xl border-2 transition-all relative flex flex-col justify-between min-h-[145px] hover:shadow-xs active:scale-[0.98] cursor-pointer outline-none select-none ${
                    formData.driverId === 'self-drive'
                      ? 'border-[#aa4e6e] bg-[#aa4e6e]/5 shadow-sm ring-1 ring-[#aa4e6e]/20 border-l-4'
                      : 'border-slate-100 hover:border-[#aa4e6e]/30 bg-white shadow-2xs'
                  }`}
                >
                  <div className="flex justify-between items-start w-full">
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 block w-fit mb-1.5 leading-none">
                        อนุญาตส่วนกลาง
                      </span>
                      <h4 className="text-xs sm:text-[13px] font-extrabold text-slate-800">
                        🚙 ขับขี่ภารกิจด้วยตนเอง
                      </h4>
                    </div>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-purple-50 border border-purple-150">
                      <User size={14} className="text-purple-600" />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 leading-tight font-medium">
                    ผู้ขออนุญาตใช้บริการทำหน้าที่ขับขี่ด้วยตนเองโดยไม่ต้องจัดสรรพลขับของหน่วยงาน
                  </p>
                  
                  <div className="mt-3 pt-2 border-t border-slate-100/70 flex items-center justify-between">
                    <span className="text-[10px] font-extrabold px-1.5 py-1 rounded-md bg-purple-50/70 text-purple-700 border border-purple-100/50 flex items-center gap-1 leading-none">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                      พร้อมขับขี่เอง
                    </span>
                    {formData.driverId === 'self-drive' && (
                      <span className="text-[10px] font-extrabold text-[#aa4e6e] flex items-center gap-1">
                        ✓ เลือกอยู่
                      </span>
                    )}
                  </div>
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
                      className={`text-left p-4.5 rounded-2xl border-2 transition-all relative flex flex-col justify-between min-h-[145px] hover:shadow-xs active:scale-[0.98] cursor-pointer outline-none select-none ${
                        isSelected 
                          ? 'border-[#aa4e6e] bg-[#aa4e6e]/5 shadow-sm ring-1 ring-[#aa4e6e]/20 border-l-4' 
                          : isConflict 
                            ? 'border-slate-100 bg-slate-50/50 opacity-80 hover:opacity-100 hover:border-rose-300' 
                            : 'border-slate-100 hover:border-[#aa4e6e]/30 bg-white shadow-2xs'
                      }`}
                    >
                      <div className="flex justify-between items-start w-full gap-2">
                        <div className="space-y-1">
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md leading-none block w-fit ${
                            isSelected 
                              ? 'bg-[#aa4e6e] text-white' 
                              : 'bg-slate-100 text-slate-500'
                          }`}>
                            พลขับเวรส่วนกลาง
                          </span>
                          <h4 className="text-xs sm:text-[13px] font-extrabold text-slate-800 leading-snug">
                            🎯 {d.name}
                          </h4>
                        </div>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-2xs border border-white" style={{ backgroundColor: d.avatarColor || '#e2e8f0' }}>
                          <span className="text-[10px] font-black text-slate-700">{d.name.substring(0, 2)}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1.5 mt-2 text-[10px] font-mono text-slate-500">
                        <Phone size={11} className="text-slate-400" />
                        <span>{d.phone}</span>
                      </div>
                      
                      <div className="mt-3 pt-2 border-t border-slate-100/70 flex items-center justify-between">
                        {isConflict ? (
                          <span className="text-[10px] font-extrabold px-1.5 py-1 rounded-md bg-rose-50 text-rose-600 border border-rose-100/60 flex items-center gap-1 leading-none">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                            ติดงานเวรอื่น
                          </span>
                        ) : (
                          <span className="text-[10px] font-extrabold px-1.5 py-1 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100/60 flex items-center gap-1 leading-none">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-550" />
                            คิวว่างพร้อมขับ
                          </span>
                        )}
                        
                        {isSelected && (
                          <span className="text-[10px] font-extrabold text-[#aa4e6e] flex items-center gap-1">
                            ✓ เลือกอยู่
                          </span>
                        )}
                      </div>
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
            </div>


            </div>
          )}

        {/* =======================================
            STEP 4: caretakers and approvers 
            ======================================= */}
        {(formMode === 'all' || currentStep === 4) && (
          <div className="bg-white border border-slate-100 rounded-2xl p-5 md:p-6 shadow-xs space-y-6 transition-all" id="step-4-[#aa4e6e]">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
              <div className="h-6 w-1 rounded-full bg-[#aa4e6e]" />
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-[#aa4e6e]" />
                <h3 className="text-base font-extrabold text-slate-800">
                  ส่วนที่ 4 : นายคลังจัดดูแลยานพาหนะ & ตำแหน่งผู้อนุมัติเดินทาง
                </h3>
              </div>
            </div>

            <div className="space-y-6">
              
              {/* เจ้าหน้าที่จัดดูแลยานพาหนะ */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 rounded-xl bg-slate-50/50 border border-slate-100">
                {/* Caretaker */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">เจ้าหน้าที่จัดดูแลยานพาหนะ (นายทะเบียนพัสดุ)</label>
                  <select
                    name="caretakerName"
                    value={formData.caretakerName}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-150 focus:border-[#aa4e6e] bg-white text-slate-700 font-semibold"
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
              </div>

              {/* หัวหน้ากลุ่ม/ฝ่าย */}
              <div className="p-5 rounded-xl bg-pink-50/10 border border-pink-100/40 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-pink-100/40 pb-3">
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-bold text-[#aa4e6e] flex items-center gap-1.5">
                      <span>หัวหน้ากลุ่ม / ฝ่าย (ผู้เห็นควรอนุมัติ)</span>
                      <span className="text-[10px] font-semibold text-pink-600 bg-pink-50 border border-pink-100 px-1.5 py-0.5 rounded-md">ฝ่ายลงความเห็น</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium">ระบุผู้พิจารณาอนุมัติใช้รถเห็นควรขั้นต้น</p>
                  </div>
                  
                  {/* Toggle to sign instead */}
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#aa4e6e] bg-white border border-pink-100 hover:border-pink-200 px-3 py-1.5 rounded-lg select-none shadow-sm transition">
                    <input
                      type="checkbox"
                      checked={isCustomDeptHead}
                      onChange={(e) => handleCustomDeptHeadToggle(e.target.checked)}
                      className="rounded text-[#aa4e6e] focus:ring-[#aa4e6e] h-4 w-4 border-slate-300"
                    />
                    <span>มีผู้ลงนามปฏิบัติหน้าที่แทน (เซ็นแทน)</span>
                  </label>
                </div>

                {/* CONDITIONAL RENDERING ON STATUS */}
                {!isCustomDeptHead ? (
                  /* NORMAL MODE: Dropdown selector */
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700 block">เลือกหัวหน้ากลุ่ม / ฝ่าย</label>
                      <select
                        name="departmentHeadName"
                        value={formData.departmentHeadName}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 border border-pink-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-pink-150 focus:border-[#aa4e6e] bg-white text-slate-700 font-semibold"
                      >
                        {departmentHeads.map((head, idx) => (
                          <option key={head.id || idx} value={head.name}>{head.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700 block">
                        หัวหน้ากลุ่ม / ฝ่าย (ตำแหน่งผู้อนุมัติร่วม)
                      </label>
                      <input
                        type="text"
                        name="departmentHeadPosition"
                        value={formData.departmentHeadPosition}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 border border-pink-200 rounded-xl text-sm font-bold outline-none font-sans bg-white text-slate-700 focus:ring-2 focus:ring-pink-150 focus:border-[#aa4e6e]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700 block">
                        ตำแหน่งทางราชการ (ระดับ / ประเภทตำแหน่ง)
                      </label>
                      <input
                        type="text"
                        name="departmentHeadRank"
                        value={formData.departmentHeadRank}
                        onChange={handleChange}
                        placeholder="เช่น นักพัฒนาสังคมชำนาญการพิเศษ"
                        className="w-full px-4 py-2.5 border border-pink-200 rounded-xl text-sm font-bold outline-none font-sans bg-white text-slate-700 focus:ring-2 focus:ring-pink-150 focus:border-[#aa4e6e]"
                      />
                    </div>
                  </div>
                ) : (
                  /* SIGNING INSTEAD (CUSTOM) MODE */
                  <div className="space-y-4">
                    <div className="p-3 bg-pink-50/30 rounded-lg text-xs font-semibold text-pink-700 border border-pink-100/30 flex items-center gap-1.5">
                      💡 <span>ระบบจะช่วยพิมพ์คำว่า <strong>"แทน"</strong> นำหน้าชื่อตำแหน่งเดิมเพื่อความถูกต้องตามแบบฟอร์มกฎหมายราชการให้โดยอัตโนมัติ</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* 1. Target head who we are signing instead of */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-700 block">ปฏิบัติหน้าที่แทนตำแหน่งของ</label>
                        <select
                          value={selectedDeptHeadId}
                          onChange={handleCustomParentHeadClassChange}
                          className="w-full px-4 py-2.5 border border-pink-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-pink-150 focus:border-[#aa4e6e] bg-white text-slate-700 font-semibold"
                        >
                          {departmentHeads.map((head, idx) => (
                            <option key={head.id || idx} value={head.id}>{head.name} ({head.position})</option>
                          ))}
                        </select>
                      </div>

                      {/* 2. Custom name text input */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-700 block">ชื่อ-นามสกุล ผู้ปฏิบัติราชการแทน (ผู้เซ็นแทน)</label>
                        <input
                          type="text"
                          value={formData.departmentHeadName}
                          onChange={(e) => handleCustomDeptHeadNameChange(e.target.value)}
                          placeholder="เช่น นายอู๊ด ใจดี"
                          className="w-full px-4 py-2.5 border border-pink-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-pink-150 focus:border-[#aa4e6e] bg-white text-slate-700 font-bold"
                        />
                      </div>

                      {/* 3. Result Position with "แทน" automatically prepended */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-700 block">
                          ตำแหน่งหัวหน้ากลุ่ม/ฝ่ายที่เซ็นแทน
                        </label>
                        <input
                          type="text"
                          name="departmentHeadPosition"
                          value={formData.departmentHeadPosition}
                          onChange={handleChange}
                          className="w-full px-4 py-2.5 border border-pink-200 rounded-xl text-sm font-extrabold outline-none bg-white text-rose-700 focus:ring-2 focus:ring-pink-150 focus:border-[#aa4e6e]"
                        />
                      </div>

                      {/* 4. Rank of the signing person */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-700 block">
                          ตำแหน่งทางราชการของผู้เซ็นแทน
                        </label>
                        <input
                          type="text"
                          name="departmentHeadRank"
                          value={formData.departmentHeadRank}
                          onChange={handleChange}
                          placeholder="เช่น นักพัฒนาสังคมชำนาญการพิเศษ"
                          className="w-full px-4 py-2.5 border border-pink-200 rounded-xl text-sm font-bold outline-none bg-white text-slate-700 focus:ring-2 focus:ring-pink-150 focus:border-[#aa4e6e]"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ผู้อนุมัติการเดินทาง */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 rounded-xl bg-slate-50/50 border border-slate-100">
                {/* Approver Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-indigo-900 block flex items-center gap-1.5">
                    <span>ผู้อนุมัติการเดินทางใช้รถยนต์ (ผู้มีอำนาจอนุญาต)</span>
                    <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md border border-indigo-150">ผู้ลงนามอนุมัติ</span>
                  </label>
                  <select
                    name="approvedBy"
                    value={formData.approvedBy}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-150 focus:border-[#aa4e6e] bg-white text-slate-700 font-semibold"
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
              </div>

              {/* สถานะใบขอจอง */}
              <div className="p-4 rounded-xl bg-[#aa4e6e]/5 border border-[#aa4e6e]/10">
                {/* Status Select (Admin restricted) */}
                <div className="space-y-1.5 max-w-xl">
                  <label className="text-xs font-bold text-slate-700 block flex items-center justify-between">
                    <span className="font-extrabold text-[#aa4e6e]">สถานะใบขอจองยานพาหนะ</span>
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
                        : 'bg-white text-[#aa4e6e] border-[#aa4e6e]/30 focus:ring-rose-150 focus:border-[#aa4e6e]'
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
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:ring-2 focus:ring-rose-200 focus:border-[#aa4e6e] bg-white"
              />
            </div>

            {/* Beautiful visual confirmation receipt ticket */}
            <div className="bg-slate-50/70 border border-slate-200/60 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-dashed border-slate-200">
                <FileText className="text-[#aa4e6e]" size={18} />
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
                  <p className="text-[#aa4e6e] text-[10px] font-bold">{formData.department}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 font-semibold block">สถานที่ปลายทาง:</span>
                  <p className="text-slate-800 font-black truncate">{formData.destination || 'ยังไม่ระบุสถานที่เดินทาง'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 font-semibold block">วันและเวลาปฏิบัติหน้าที่:</span>
                  <p className="text-slate-800 font-black">
                    {formData.startDate ? (
                      formData.endDate ? (
                        <>
                          {formatThaiDate(formData.startDate)} <br />
                          ถึง {formatThaiDate(formData.endDate)}
                        </>
                      ) : (
                        `${formatThaiDate(formData.startDate)} เป็นต้นไป`
                      )
                    ) : (
                      'ยังไม่ระบุ'
                    )}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 font-semibold block">จับคู่รถราชการและพลขับ:</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] bg-slate-100 border px-1.5 py-0.5 rounded font-extrabold text-[#aa4e6e]">
                      🚗 {selectedVehicleObj?.name || 'ยังเลือกยานพาหนะ'} ({selectedVehicleObj?.plateNumber || 'คันชั่วคราว'})
                    </span>
                    <span className="text-[10px] bg-slate-100 border px-1.5 py-0.5 rounded font-bold text-slate-600">
                      👨‍✈️ {selectedDriverObj?.name || 'ยังไม่เลือกพลขับ'}
                    </span>
                  </div>
                  {selectedVehicleObj && formData.passengersCount > 0 && (
                    <span className="text-[9px] text-[#aa4e6e] font-extrabold block mt-1">
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
        <div className="pt-6 border-t border-slate-100/70 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 border border-slate-200 text-slate-450 hover:text-slate-700 hover:bg-slate-50 text-xs sm:text-sm font-semibold rounded-xl transition cursor-pointer"
          >
            ปิดยกเลิกไม่บันทึก
          </button>
          
          <button
            type="submit"
            className="px-6 py-2.5 bg-[#aa4e6e] hover:bg-[#8e1b4a] text-white text-xs sm:text-sm font-black rounded-xl transition-all shadow-md shadow-[#aa4e6e]/15 flex items-center gap-1.5 cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
            id="btn-save-booking"
          >
            <Save size={15} />
            {isEditMode ? 'บันทึกการปรับปรุงใบใช้รถ' : 'ส่งบันทึกขอใช้รถราชการ'}
          </button>
        </div>

      </form>

    </div>
  );
}

