import { Vehicle, Driver, Booking, Approver, Caretaker, DepartmentHead } from '../types';

export const INITIAL_VEHICLES: Vehicle[] = [
  {
    id: 'V1',
    name: 'Toyota Commuter (รถตู้ส่วนกลาง VIP)',
    type: 'van',
    plateNumber: 'นข 1122 ตรัง',
    capacity: 12,
    status: 'available',
    imagePlaceholderColor: 'bg-indigo-100 text-indigo-700',
    mileage: 124500
  },
  {
    id: 'V2',
    name: 'Toyota Commuter (รถตู้ปฏิบัติการสังคม)',
    type: 'van',
    plateNumber: 'นข 3344 ตรัง',
    capacity: 12,
    status: 'available',
    imagePlaceholderColor: 'bg-blue-100 text-blue-700',
    mileage: 185200
  },
  {
    id: 'V3',
    name: 'Toyota Hilux Revo (รถกระบะ 4 ประตู)',
    type: 'pickup',
    plateNumber: 'กข 5566 ตรัง',
    capacity: 5,
    status: 'available',
    imagePlaceholderColor: 'bg-emerald-100 text-emerald-700',
    mileage: 92100
  },
  {
    id: 'V4',
    name: 'Isuzu D-Max (รถกระบะ 4 ประตู)',
    type: 'pickup',
    plateNumber: 'กข 7788 ตรัง',
    capacity: 5,
    status: 'available',
    imagePlaceholderColor: 'bg-teal-100 text-teal-700',
    mileage: 110400
  },
  {
    id: 'V5',
    name: 'Toyota Fortuner (รถเอนกประสงค์ SUV)',
    type: 'suv',
    plateNumber: 'กข 9999 ตรัง',
    capacity: 7,
    status: 'available',
    imagePlaceholderColor: 'bg-amber-100 text-amber-700',
    mileage: 78300
  },
  {
    id: 'V6',
    name: 'Honda City (รถยนต์นั่งส่วนบุคคล)',
    type: 'sedan',
    plateNumber: 'กข 2244 ตรัง',
    capacity: 4,
    status: 'available',
    imagePlaceholderColor: 'bg-rose-100 text-rose-700',
    mileage: 45200
  }
];

export const INITIAL_DRIVERS: Driver[] = [
  {
    id: 'D1',
    name: 'นายสมคิด รักการขับ',
    phone: '081-123-4567',
    status: 'available',
    avatarColor: 'bg-orange-600 text-white'
  },
  {
    id: 'D2',
    name: 'นายประสิทธิ์ ปลอดภัย',
    phone: '089-987-6543',
    status: 'available',
    avatarColor: 'bg-amber-600 text-white'
  },
  {
    id: 'D3',
    name: 'นายมานะ แข็งขัน',
    phone: '082-222-3333',
    status: 'available',
    avatarColor: 'bg-emerald-600 text-white'
  },
  {
    id: 'D4',
    name: 'นายสุรพล ขยันดี',
    phone: '085-555-1212',
    status: 'available',
    avatarColor: 'bg-blue-600 text-white'
  },
  {
    id: 'D5',
    name: 'นายวิรัช วงศ์สว่าง',
    phone: '086-777-8888',
    status: 'available',
    avatarColor: 'bg-violet-600 text-white'
  }
];

export const DEPARTMENTS = [
  'กลุ่มการพัฒนาและสวัสดิการ',
  'กลุ่มนโยบายและวิชาการ',
  'ศูนย์บริการคนพิการ',
  'ฝ่ายบริหารทั่วไป'
];

export const INITIAL_APPROVERS: Approver[] = [
  { id: 'A1', name: 'นางสาววิมลศรี สินประเสริฐ', position: 'พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดตรัง' },
  { id: 'A2', name: 'นายสุมิตร นิรันดร์', position: 'หัวหน้ากลุ่มอำนวยการ (รักษาการแทนพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดตรัง)' },
  { id: 'A3', name: 'นางกนกพร สัจจารักษ์', position: 'นักวิชาการพัฒนาสังคมชำนาญการพิเศษ (ปฏิบัติราชการแทนพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดตรัง)' }
];

export const INITIAL_CARETAKERS: Caretaker[] = [
  { id: 'C1', name: 'นายเกรียงไกร ชนะสิทธิ์', position: 'เจ้าพนักงานธุรการปฏิบัติงาน' },
  { id: 'C2', name: 'นางสาวสมใจ นึกมั่น', position: 'เจ้าหน้าที่กลุ่มงานอำนวยการ พมจ.ตรัง' }
];

export const INITIAL_DEPARTMENT_HEADS: DepartmentHead[] = [
  { id: 'H1', name: 'นางเสาวลักษณ์ มลสวัสดิ์', position: 'หัวหน้ากลุ่มการพัฒนาสังคมและสวัสดิการ' },
  { id: 'H2', name: 'นายชัยยศ ศุภโชค', position: 'หัวหน้ากลุ่มนโยบายและวิชาการ' },
  { id: 'H3', name: 'นางกนกพร สัจจารักษ์', position: 'ผู้ช่วย ผอ.ศูนย์บริการคนพิการ' },
  { id: 'H4', name: 'นายสุมิตร นิรันดร์', position: 'หัวหน้าฝ่ายบริหารทั่วไป' }
];

export const APPROVERS = [
  { name: 'นางสาววิมลศรี สินประเสริฐ', position: 'พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดตรัง' },
  { name: 'นายสุมิตร นิรันดร์', position: 'หัวหน้ากลุ่มอำนวยการ (รักษาการแทนพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดตรัง)' },
  { name: 'นางกนกพร สัจจารักษ์', position: 'นักวิชาการพัฒนาสังคมชำนาญการพิเศษ (ปฏิบัติราชการแทนพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดตรัง)' }
];

export const INITIAL_BOOKINGS: Booking[] = [
  {
    id: 'B1',
    permitNumber: '001/2569',
    requesterName: 'นางกาญจนา แก้วงาม',
    requesterPosition: 'นักวิชาการพัฒนาสังคมปฏิบัติการ',
    department: 'กลุ่มการพัฒนาและสวัสดิการ',
    destination: 'อบต.ควนธานี อ.กันตัง จ.ตรัง',
    purpose: 'ลงพื้นที่ตรวจประเมินสภาพแวดล้อมและช่วยเหลือผู้สูงอายุกลุ่มเปราะบางเพื่อมอบทุนตกแต่งซ่อมแซมบ้าน',
    passengersCount: 4,
    startDate: '2026-05-22T08:30:00',
    endDate: '2026-05-22T12:00:00',
    vehicleId: 'V1',
    driverId: 'D1',
    status: 'approved',
    approvedBy: 'นางสาววิมลศรี สินประเสริฐ',
    approvedByPosition: 'พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดตรัง',
    caretakerName: 'นายเกรียงไกร ชนะสิทธิ์',
    caretakerPosition: 'เจ้าพนักงานธุรการปฏิบัติงาน',
    createdAt: '2026-05-21T10:00:00'
  },
  {
    id: 'B2',
    permitNumber: '002/2569',
    requesterName: 'นายศักดิ์ดา กลิ่นขจร',
    requesterPosition: 'เจ้าหน้าที่บริหารงานทั่วไป',
    department: 'ฝ่ายบริหารทั่วไป',
    destination: 'ธนาคารกรุงไทย สาขาตรัง และศาลากลางจังหวัดตรัง',
    purpose: 'ยื่นเอกสารการเบิกจ่ายงบประมาณและรับส่งเอกสารสำคัญทางราชการประจำวัน',
    passengersCount: 1,
    startDate: '2026-05-22T13:30:00',
    endDate: '2026-05-22T16:30:00',
    vehicleId: 'V6',
    driverId: 'D3',
    status: 'approved',
    approvedBy: 'นายสุมิตร นิรันดร์',
    approvedByPosition: 'หัวหน้ากลุ่มอำนวยการ (รักษาการแทนพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดตรัง)',
    caretakerName: 'นายเกรียงไกร ชนะสิทธิ์',
    caretakerPosition: 'เจ้าพนักงานธุรการปฏิบัติงาน',
    createdAt: '2026-05-21T14:30:00'
  },
  {
    id: 'B3',
    permitNumber: '003/2569',
    requesterName: 'นางสาวนรีรัตน์ สมัครสมาน',
    requesterPosition: 'นักประเมินสังคมและนักสังคมสงเคราะห์',
    department: 'กลุ่มการพัฒนาและสวัสดิการ',
    destination: 'อ.ห้วยยอด และ อ.รัษฎา จ.ตรัง',
    purpose: 'ตรวจเยี่ยมติดตามการกู้ยืมเงินทุนประกอบอาชีพของคนพิการและผู้ดูแลสตรีกลุ่มเปราะบาง',
    passengersCount: 3,
    startDate: '2026-05-23T09:00:00',
    endDate: '2026-05-23T16:00:00',
    vehicleId: 'V3',
    driverId: 'D2',
    status: 'approved',
    approvedBy: 'นางสาววิมลศรี สินประเสริฐ',
    approvedByPosition: 'พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดตรัง',
    caretakerName: 'นางสาวสมใจ นึกมั่น',
    caretakerPosition: 'เจ้าหน้าที่กลุ่มงานอำนวยการ พมจ.ตรัง',
    createdAt: '2026-05-21T16:00:00'
  },
  {
    id: 'B4',
    permitNumber: '004/2569',
    requesterName: 'นายทรงวิทย์ วรรณรัตน์',
    requesterPosition: 'นักวิชาการคอมพิวเตอร์',
    department: 'กลุ่มนโยบายและวิชาการ',
    destination: 'กระทรวงการพัฒนาสังคมและความมั่นคงของมนุษย์ กรุงเทพฯ',
    purpose: 'เข้าร่วมการประชุมเชิงปฏิบัติการการพัฒนาและประเมินระบบสารสนเทศระดับประเทศ (พม.)',
    passengersCount: 2,
    startDate: '2026-05-24T06:00:00',
    endDate: '2026-05-26T18:00:00',
    vehicleId: 'V5',
    driverId: 'D4',
    status: 'pending',
    approvedBy: 'นางสาววิมลศรี สินประเสริฐ',
    approvedByPosition: 'พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดตรัง',
    caretakerName: 'นายเกรียงไกร ชนะสิทธิ์',
    caretakerPosition: 'เจ้าพนักงานธุรการปฏิบัติงาน',
    createdAt: '2026-05-22T08:00:00'
  }
];

// Helper functions for storage and run numbers
export const getStoredData = () => {
  if (typeof window === 'undefined') {
    return { 
      bookings: INITIAL_BOOKINGS, 
      vehicles: INITIAL_VEHICLES, 
      drivers: INITIAL_DRIVERS,
      approvers: INITIAL_APPROVERS,
      caretakers: INITIAL_CARETAKERS,
      departmentHeads: INITIAL_DEPARTMENT_HEADS
    };
  }
  
  const savedBookings = localStorage.getItem('pmj_trang_bookings');
  const savedVehicles = localStorage.getItem('pmj_trang_vehicles');
  const savedDrivers = localStorage.getItem('pmj_trang_drivers');
  const savedApprovers = localStorage.getItem('pmj_trang_approvers');
  const savedCaretakers = localStorage.getItem('pmj_trang_caretakers');
  const savedDepartmentHeads = localStorage.getItem('pmj_trang_department_heads');
  
  const rawBookings: Booking[] = savedBookings ? JSON.parse(savedBookings) : INITIAL_BOOKINGS;
  
  // Migrate department names to new ones if they contain old naming
  const migratedBookings = rawBookings.map(b => {
    let dept = b.department;
    if (dept === 'กลุ่มคุ้มครองและประสานงาน' || dept === 'กลุ่มส่งเสริมและพัฒนา') {
      dept = 'กลุ่มการพัฒนาและสวัสดิการ';
    } else if (dept === 'กลุ่มนโยบายและยุทธศาสตร์') {
      dept = 'กลุ่มนโยบายและวิชาการ';
    } else if (dept === 'ศูนย์บริการคนพิการจังหวัดตรัง') {
      dept = 'ศูนย์บริการคนพิการ';
    } else if (dept === 'กลุ่มอำนวยการ') {
      dept = 'ฝ่ายบริหารทั่วไป';
    }
    return { ...b, department: dept };
  });
  
  const rawDepartmentHeads: DepartmentHead[] = savedDepartmentHeads ? JSON.parse(savedDepartmentHeads) : INITIAL_DEPARTMENT_HEADS;
  const migratedDepartmentHeads = rawDepartmentHeads.map(h => {
    if (h.position === 'หัวหน้าศูนย์บริการคนพิการ') {
      return { ...h, position: 'ผู้ช่วย ผอ.ศูนย์บริการคนพิการ' };
    }
    return h;
  });
  
  return {
    bookings: migratedBookings,
    vehicles: savedVehicles ? JSON.parse(savedVehicles) : INITIAL_VEHICLES,
    drivers: savedDrivers ? JSON.parse(savedDrivers) : INITIAL_DRIVERS,
    approvers: savedApprovers ? JSON.parse(savedApprovers) : INITIAL_APPROVERS,
    caretakers: savedCaretakers ? JSON.parse(savedCaretakers) : INITIAL_CARETAKERS,
    departmentHeads: migratedDepartmentHeads
  };
};

export const saveStoredData = (
  bookings: Booking[], 
  vehicles: Vehicle[], 
  drivers: Driver[], 
  approvers?: Approver[], 
  caretakers?: Caretaker[],
  departmentHeads?: DepartmentHead[]
) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('pmj_trang_bookings', JSON.stringify(bookings));
  localStorage.setItem('pmj_trang_vehicles', JSON.stringify(vehicles));
  localStorage.setItem('pmj_trang_drivers', JSON.stringify(drivers));
  if (approvers) localStorage.setItem('pmj_trang_approvers', JSON.stringify(approvers));
  if (caretakers) localStorage.setItem('pmj_trang_caretakers', JSON.stringify(caretakers));
  if (departmentHeads) localStorage.setItem('pmj_trang_department_heads', JSON.stringify(departmentHeads));
};

export const generateNextPermitNumber = (bookings: Booking[]): string => {
  const currentYear = 2569; // Or dynamic from Thai calendar year
  
  // Cleanly extract numbers from current year's bookings
  const pattern = new RegExp(`^(\\d+)/${currentYear}$`);
  let maxNum = 0;
  
  bookings.forEach(b => {
    const match = b.permitNumber.match(pattern);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) {
        maxNum = num;
      }
    }
  });
  
  const nextNum = maxNum + 1;
  const paddedNum = String(nextNum).padStart(3, '0');
  return `${paddedNum}/${currentYear}`;
};
