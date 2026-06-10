export interface Vehicle {
  id: string;
  name: string;
  type: 'van' | 'pickup' | 'suv' | 'sedan';
  plateNumber: string;
  capacity: number;
  status: 'available' | 'busy' | 'maintenance';
  imagePlaceholderColor: string;
  mileage?: number; // เลขไมล์สะสมล่าสุด (กม.)
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  status: 'available' | 'busy' | 'off';
  avatarColor: string;
}

export type BookingStatus = 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';

export interface Booking {
  id: string;
  permitNumber: string; // Dynamic incremental run-number e.g., "001/2569"
  requesterName: string;
  requesterPosition: string;
  department: string; // กลุ่มงาน
  destination: string; // จุดหมายปลายทาง
  purpose: string; // วัตถุประสงค์
  passengersCount: number;
  passengersList?: string[]; // รายชื่อผู้เดินทางร่วม
  startDate: string; // ISO DateTime
  endDate: string; // ISO DateTime
  vehicleId: string;
  driverId: string; // "self-drive", "passenger-drive", or actual driver ID
  customDriverName?: string; // name of passenger or fellow traveler driving
  status: BookingStatus;
  approvedBy: string;
  approvedByPosition: string;
  caretakerName?: string;
  caretakerPosition?: string;
  departmentHeadName?: string;
  departmentHeadPosition?: string;
  departmentHeadRank?: string;
  remarks?: string;
  startMileage?: number;
  endMileage?: number;
  createdAt: string;
}

export interface Approver {
  id: string;
  name: string;
  position: string;
}

export interface Caretaker {
  id: string;
  name: string;
  position: string;
}

export interface DepartmentHead {
  id: string;
  name: string;
  position: string;
  rank?: string;
}

export interface SystemStats {
  totalBookings: number;
  activeBookingsToday: number;
  availableVehicles: number;
  availableDrivers: number;
}
