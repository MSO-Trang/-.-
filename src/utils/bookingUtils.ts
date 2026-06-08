import { Booking, Vehicle, Driver } from '../types';

/**
 * Checks if two date ranges overlap.
 */
export const isOverlapping = (
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean => {
  const sA = new Date(startA).getTime();
  const eA = endA ? new Date(endA).getTime() : sA + (4 * 60 * 60 * 1000);
  const sB = new Date(startB).getTime();
  const eB = endB ? new Date(endB).getTime() : sB + (4 * 60 * 60 * 1000);
  
  if (isNaN(sA) || isNaN(eA) || isNaN(sB) || isNaN(eB)) return false;
  
  return sA < eB && sB < eA;
};

/**
 * Finds conflicts for a vehicle or driver during a specific period.
 * Returns overlapping bookings except those with 'completed', 'cancelled', or 'rejected' statuses.
 */
export const findConflicts = (
  bookings: Booking[],
  entityId: string,
  entityType: 'vehicle' | 'driver',
  startDate: string,
  endDate: string,
  excludeBookingId?: string
): Booking[] => {
  if (!startDate) return [];
  
  return bookings.filter(b => {
    // Ignore excluded booking (like editing itself) or finished/cancelled bookings
    if (excludeBookingId && b.id === excludeBookingId) return false;
    if (b.status === 'cancelled' || b.status === 'rejected' || b.status === 'completed') return false;
    
    const matchesEntity = entityType === 'vehicle' 
      ? b.vehicleId === entityId 
      : b.driverId === entityId;
      
    return matchesEntity && isOverlapping(startDate, endDate, b.startDate, b.endDate);
  });
};

/**
 * Translates BookingStatus to beautiful Thai text and color classes.
 */
export const translateStatus = (status: string): { label: string; colorClass: string; bgClass: string; borderClass: string } => {
  switch (status) {
    case 'pending':
      return { 
        label: 'รออนุมัติ', 
        colorClass: 'text-amber-700 font-medium', 
        bgClass: 'bg-amber-50',
        borderClass: 'border-amber-200'
      };
    case 'approved':
      return { 
        label: 'อนุมัติแล้ว', 
        colorClass: 'text-emerald-700 font-medium', 
        bgClass: 'bg-emerald-50',
        borderClass: 'border-emerald-200'
      };
    case 'rejected':
      return { 
        label: 'ไม่อนุมัติ', 
        colorClass: 'text-rose-700 font-medium', 
        bgClass: 'bg-rose-50',
        borderClass: 'border-rose-200'
      };
    case 'completed':
      return { 
        label: 'เสร็จสิ้นภารกิจ', 
        colorClass: 'text-blue-700 font-medium', 
        bgClass: 'bg-blue-50',
        borderClass: 'border-blue-200'
      };
    case 'cancelled':
      return { 
        label: 'ยกเลิกการเดินทาง', 
        colorClass: 'text-neutral-500 font-medium', 
        bgClass: 'bg-neutral-50',
        borderClass: 'border-neutral-200'
      };
    default:
      return { 
        label: status, 
        colorClass: 'text-neutral-700', 
        bgClass: 'bg-neutral-50',
        borderClass: 'border-neutral-200'
      };
  }
};

/**
 * Helper to display vehicle type in Thai.
 */
export const translateVehicleType = (type: string): string => {
  switch (type) {
    case 'van':
      return 'รถตู้การบริหาร/คณะบุคคล';
    case 'pickup':
      return 'รถกระบะบรรทุกสัมภาระ/ลงพื้นที่';
    case 'suv':
      return 'รถเอนกประสงค์ SUV';
    case 'sedan':
      return 'รถยนต์นั่งส่วนบุคคล';
    default:
      return type;
  }
};

/**
 * Formats a Date string into Thai Buddhist format, optionally with time.
 */
export const formatThaiDate = (dateStr: string, includeTime = true): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  
  const day = date.getDate();
  const month = thaiMonths[date.getMonth()];
  const year = date.getFullYear() + 543; // Thai BE Year
  
  let formatted = `${day} ${month} ${year}`;
  
  if (includeTime) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    formatted += ` เวลา ${hours}:${minutes} น.`;
  }
  
  return formatted;
};

/**
 * Formats time from ISO date-string (HH:MM)
 */
export const formatTime = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

/**
 * Format date for input calendar fields (YYYY-MM-DDTHH:MM)
 */
export const formatForInput = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
  return adjustedDate.toISOString().slice(0, 16);
};
