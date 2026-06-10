import React, { useState, useEffect } from 'react';
import { Printer, ArrowLeft, ShieldCheck, FileCheck2 } from 'lucide-react';
import { Booking, Vehicle, Driver, DepartmentHead } from '../types';
import { formatThaiDate, formatTime } from '../utils/bookingUtils';
import { MSDHS_LOGO_BASE64 } from '../data/logoBase64';
import garudaLogo from '../assets/images/regenerated_image_1780642619586.png';

interface PrintPermitProps {
  booking: Booking;
  vehicles: Vehicle[];
  drivers: Driver[];
  departmentHeads?: DepartmentHead[];
  onBack: () => void;
}

export default function PrintPermit({
  booking,
  vehicles,
  drivers,
  departmentHeads,
  onBack
}: PrintPermitProps) {
  
  const [isInIframe, setIsInIframe] = useState(false);

  // Find the department head to get their rank configured in admin panel
  const matchedHead = departmentHeads?.find(h => h.name === booking.departmentHeadName);
  const headRank = booking.departmentHeadRank || matchedHead?.rank || '';
  const headPos = booking.departmentHeadPosition || matchedHead?.position || '';
  // Show only civil service rank (e.g. 'นักพัฒนาสังคมชำนาญการพิเศษ') if available, otherwise fallback to group position title
  const displayPosition = headRank || headPos || '...................................................';

  useEffect(() => {
    try {
      setIsInIframe(window.self !== window.top);
    } catch (e) {
      setIsInIframe(true);
    }
  }, []);

  const vehicle = vehicles.find(v => v.id === booking.vehicleId);
  const driver = booking.driverId === 'self-drive'
    ? { id: 'self-drive', name: 'ขับรถยนต์ด้วยตนเอง (ผู้ขออนุญาตเป็นผู้ขับขี่)', phone: 'ผู้ใช้รถขับเอง' }
    : drivers.find(d => d.id === booking.driverId);
  
  // Format creation date (the date requested/created)
  const createdDateThai = formatThaiDate(booking.createdAt, false);
  const startDateThaiOnly = formatThaiDate(booking.startDate, false);
  const endDateThaiOnly = formatThaiDate(booking.endDate, false);

  // Helper to convert any english number string to Thai numerals (เลขไทย)
  const toThaiNumerals = (numStr: string | undefined | null): string => {
    if (!numStr) return '...........';
    const mapping: { [key: string]: string } = {
      '0': '๐',
      '1': '๑',
      '2': '๒',
      '3': '๓',
      '4': '๔',
      '5': '๕',
      '6': '๖',
      '7': '๗',
      '8': '๘',
      '9': '๙'
    };
    return numStr.toString().split('').map(char => mapping[char] || char).join('');
  };

  const triggerPrint = () => {
    if (isInIframe) {
      alert("⚠️ เนื่องจากคุณกำลังเข้าใช้งานผ่านเฟรมตัวอย่าง (Sandbox iFrame) ของ AI Studio แอลกอริทึมของเบราว์เซอร์ล็อคไม่ให้ใช้คำสั่งพิมพ์โดยตรง\n\nโปรดคลิกปุ่มสีส้ม 'เปิดในแท็บใหม่เพื่อพิมพ์คำขอใช้รถ' ด้านบนเพื่อเปิดหน้าต่างแยกเต็มจอ แล้วคุณจะสามารถพิมพ์คำขอรถยนต์ใบราชการนี้ได้ทันที!");
    } else {
      window.print();
    }
  };

  const [activeTemplate, setActiveTemplate] = useState<'permit' | 'memo'>('permit');

  return (
    <div className="space-y-4 font-sans" id="print-view-wrapper">
      
      {/* Visual Actions Bar - Hidden during printing */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col xl:flex-row items-center justify-between gap-4 print:hidden">
        
        <div className="flex flex-col md:flex-row md:items-center gap-4 w-full xl:w-auto">
          <button
            onClick={onBack}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer self-start md:self-auto"
            title="ย้อนกลับ"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10.5px] bg-[#aa4e6e]/10 text-[#aa4e6e] font-black px-2.5 py-0.5 rounded-full border border-[#aa4e6e]/20 font-mono">
                เลขคิวจอง: {booking.permitNumber}
              </span>
              <span className="text-[10.5px] bg-sky-50 text-sky-700 font-black px-2 py-0.5 rounded border border-sky-200">
                สไตล์: {activeTemplate === 'permit' ? 'ใบขออนุญาตใช้รถ' : 'บันทึกข้อความ (แบบ ๓)'}
              </span>
            </div>
            <h2 className="text-sm font-extrabold text-slate-900 mt-1">พิมพ์ใบขอใช้และบันทึกรถยนต์ราชการ (สนง.พมจ.ตรัง)</h2>
          </div>
        </div>

        {/* Template Select Switcher */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl items-center w-full md:w-auto gap-1">
          <button
            onClick={() => setActiveTemplate('permit')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition duration-150 cursor-pointer ${
              activeTemplate === 'permit'
                ? 'bg-[#aa4e6e] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <FileCheck2 size={14} />
            แบบที่ 1: ใบขออนุญาต
          </button>
          <button
            onClick={() => setActiveTemplate('memo')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition duration-150 cursor-pointer ${
              activeTemplate === 'memo'
                ? 'bg-[#aa4e6e] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <ShieldCheck size={14} />
            แบบที่ 2: บันทึกข้อความ (แบบ ๓)
          </button>
        </div>

        <div className="flex flex-wrap gap-2 w-full xl:w-auto items-center justify-end">
          {isInIframe && (
            <a
              href={`${window.location.origin}${window.location.pathname}#/print/${booking.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-xl transition shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer"
            >
              เปิดในแท็บใหม่เพื่อพิมพ์คำขอ ↗
            </a>
          )}
          <button
            onClick={triggerPrint}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl transition shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer"
          >
            <Printer size={15} />
            สั่งพิมพ์ (PDF / Printer)
          </button>
        </div>

      </div>

      {/* Frame Warning Alert Block */}
      {isInIframe && (
        <div className="bg-amber-50 border border-amber-250 rounded-2xl p-4 flex items-start gap-3 text-amber-900 print:hidden animate-fade-in text-xs font-sans">
          <div className="p-2 bg-amber-100 text-amber-600 rounded-lg shrink-0">
            <Printer size={16} className="animate-pulse" />
          </div>
          <div className="space-y-0.5 my-auto">
            <h4 className="font-extrabold text-amber-950">💡 คำแนะนำสำหรับการพิมพ์เอกสารใบขอใช้รถยนต์ราชการ</h4>
            <p className="text-slate-650 leading-relaxed font-semibold">
              เนื่องจากแอปพลิเคชันทำงานอยู่ในหน้าต่างจำลอง (iFrame) ฟังก์ชั่นของเจ้าของเบราว์เซอร์จะป้องกันคำสั่งพิมพ์โดยตรง 
              กรุณากดปุ่ม <strong>"เปิดในแท็บใหม่เพื่อพิมพ์คำขอ"</strong> ด้านบน เพื่อการสั่งพิมพ์และบันทึก PDF แบบจัดเต็มความคมชัด!
            </p>
          </div>
        </div>
      )}

      {/* Printable Government Document Layout Container */}
      <div className="bg-slate-100/60 p-4 md:p-6 rounded-2xl border border-slate-200/60 flex justify-center shadow-inner print:bg-white print:border-none print:p-0 print:shadow-none">
        
        {/* Actual A4 Page Style Document (TH Sarabun setup) */}
        <div 
          className="bg-white w-[210mm] min-h-[297mm] p-[18mm] text-black border border-slate-300 shadow-md relative overflow-hidden font-sarabun leading-tight print:shadow-none print:border-none print:p-0 print:w-full print:min-h-[297mm] flex flex-col"
          style={{ 
            fontFamily: '"TH Sarabun New", "TH SarabunPSK", "Sarabun", sans-serif',
            fontSize: '14.5pt',
            lineHeight: '1.25'
          }}
          id="government-form-paper"
        >
          
          {activeTemplate === 'permit' ? (
            /* ================== TEMPLATE 1: DEFAULT GOVERNMENT PERMIT ================== */
            <div className="flex flex-col h-full">
              {/* Header row with Ministry logo and Title */}
              <div className="flex flex-col items-center justify-center text-center space-y-1 mb-4 print:mb-2">
                <img 
                  src={MSDHS_LOGO_BASE64} 
                  alt="ตรากระทรวง พม." 
                  className="w-16 h-16 object-contain"
                  referrerPolicy="no-referrer"
                />
                <h1 className="text-lg font-bold text-black" style={{ fontSize: '14.5pt', lineHeight: '1.1' }}>ใบขออนุญาตใช้รถยนต์ราชการ</h1>
                <p className="font-bold text-black" style={{ fontSize: '14.5pt' }}>สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดตรัง</p>
              </div>

              {/* Permit reference details */}
              <div className="flex justify-between border-b border-black pb-2 mb-3.5" style={{ fontSize: '14.5pt' }}>
                <div>
                  <strong>เลขที่ใบขออนุญาต:</strong> {booking.permitNumber}
                </div>
                <div className="text-right leading-snug">
                  <strong>เขียนที่:</strong> สำนักงาน พมจ.ตรัง ศาลากลางจังหวัดตรัง 92000
                  <br />
                  <strong>วันที่:</strong> {createdDateThai}
                </div>
              </div>

              {/* Form Core Contents with tight spaces */}
              <div className="space-y-2 flex-grow" style={{ fontSize: '14.5pt', lineHeight: '1.25' }}>
                
                <p className="font-bold leading-normal" style={{ fontSize: '14.5pt' }}>เรียน ผู้ว่าราชการจังหวัดตรัง</p>
                
                <p className="indent-12 text-justify leading-normal">
                  ด้วยข้าพเจ้า <span className="font-bold border-b border-dotted border-black px-2">{booking.requesterName}</span> ตำแหน่ง <span className="font-bold border-b border-dotted border-black px-2">{booking.requesterPosition}</span> สังกัดกลุ่มงาน <span className="font-semibold border-b border-dotted border-black px-2">{booking.department}</span> มีความประสงค์จะใช้รถยนต์ส่วนกลาง/ราชการ เพื่อเดินทางไปปฏิบัติหน้าที่ราชการ ดังมีตารางกำหนดการดังนี้:-
                </p>

                <div className="pl-6 space-y-1.5">
                  <div>
                    <strong className="text-black">๑. วัตถุประสงค์ในการปฏิบัติหน้าที่ครั้งนี้:</strong>
                    <p className="pl-6 text-justify border-b border-dotted border-black/50 pb-0.5 leading-normal italic text-slate-800">
                      {booking.purpose}
                    </p>
                  </div>

                  <div>
                    <strong className="text-black">๒. จุดหมาย:</strong>
                    <p className="pl-6 text-justify border-b border-dotted border-black/50 pb-0.5 font-bold text-black leading-normal">
                       {booking.destination}
                    </p>
                  </div>
                </div>

                <p className="indent-12 leading-normal">
                  ผู้เดินทางทั้งสิ้นจำนวน <span className="font-bold border-b border-dotted border-black px-2">{booking.passengersCount}</span> คน รวมเจ้าหน้าที่ผู้ควบคุมการประสานเดินทางความร่วมมือ
                </p>

                <p className="indent-12 text-justify leading-normal font-medium">
                  โดยมีช่วงระยะเวลากำหนดการเดินทาง นับตั้งแต่ <span className="font-bold border-b border-dotted border-black px-1.5">{startDateThaiOnly}</span> เวลา{' '}
                  {booking.endDate ? (
                    <>
                      <span className="font-bold border-b border-dotted border-black px-1.5">{formatTime(booking.startDate)} น.</span> และเดินทางกลับถึงวันที่{' '}
                      <span className="font-bold border-b border-dotted border-black px-1.5">{endDateThaiOnly}</span> เวลา{' '}
                      <span className="font-bold border-b border-dotted border-black px-1.5">{formatTime(booking.endDate)} น.</span>
                    </>
                  ) : (
                    <span className="font-bold border-b border-dotted border-black px-1.5">{formatTime(booking.startDate)} น. เป็นต้นไป</span>
                  )}
                </p>

                <p className="indent-12 text-justify leading-normal font-medium">
                  ในการเดินทางขอความเห็นชอบจัดรถยนต์ส่วนกลางราชการ หมายเลขทะเบียน <span className="font-bold border-b border-dotted border-black px-2">{vehicle?.plateNumber || '.............................'}</span> ชนิด/ยี่ห้อ <span className="font-bold border-b border-dotted border-black px-2">{vehicle?.name || '...........................................'}</span> พร้อมด้วยพนักงานขับรถควบคุมดูแลความปลอดภัยที่ได้รับมอบหมาย คือ <span className="font-bold border-b border-dotted border-black px-2">{driver?.name || '...................................................'}</span> เบอร์โทรติดต่อของคนขับรถ <span className="font-bold border-b border-dotted border-black px-2">{driver?.phone || '................................'}</span>
                </p>

                {booking.remarks && (
                  <p className="pl-6 italic text-slate-700 bg-slate-50 py-1 px-3.5 rounded text-[14.5pt] border border-dashed border-slate-250 print:bg-white print:border-none print:p-0">
                    <strong>(หมายเหตุเพิ่มเติม):</strong> {booking.remarks}
                  </p>
                )}

                <div className="pt-2 flex justify-end text-center p-2">
                  <div className="w-80 leading-normal">
                    <p className="flex items-baseline justify-center">
                      <span className="w-24 text-right pr-1 shrink-0">ลงชื่อ</span>
                      <span className="w-[140px] overflow-hidden whitespace-nowrap text-center text-slate-400 select-none">......................................................................</span>
                      <span className="w-24 text-left pl-1 shrink-0 font-sans">ผู้ขออนุมัติใช้งาน</span>
                    </p>
                    <div className="text-[14.5pt] text-slate-600 mt-1 font-bold leading-tight">
                      ( {booking.requesterName} )
                      <br />
                      ตำแหน่ง: {booking.requesterPosition}
                    </div>
                  </div>
                </div>

                {/* Verification & Approvals Row - Squeezed gap and margins for single-page fit */}
                <div className="grid grid-cols-2 gap-4 pt-3.5 border-t border-dashed border-black/40">
                  
                  {/* Recommendations */}
                  <div className="space-y-2 text-black leading-snug" style={{ fontSize: '14.5pt' }}>
                    <div className="font-bold border-l-2 border-black pl-2 leading-none">๑. ความเห็นฝ่ายพัสดุและยานพาหนะ</div>
                    
                    <div className="space-y-1.5 pl-2">
                      <div className="flex items-center gap-1.5 font-sans text-xs">
                        <span className="w-2.5 h-2.5 border border-black rounded-sm inline-block shrink-0"></span>
                        <span>เห็นควรอนุมัติให้ตามความประสงค์</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-sans text-xs">
                        <span className="w-2.5 h-2.5 border border-black rounded-sm inline-block shrink-0"></span>
                        <span>เห็นควรสับเปลี่ยนจัดหาคันอื่นทดแทน</span>
                      </div>
                      
                      <div className="pt-2 text-center leading-normal">
                        <p className="flex items-baseline justify-center">
                          <span className="w-24 text-right pr-1 shrink-0">ลงชื่อ</span>
                          <span className="w-[140px] overflow-hidden whitespace-nowrap text-center text-slate-400 select-none">......................................................................</span>
                          <span className="w-24 text-left pl-1 shrink-0 truncate font-sans">ผู้ควบคุมการใช้รถ</span>
                        </p>
                        <p className="font-bold mt-1 mx-auto text-center" style={{ width: '180px', fontSize: '14.5pt' }}>
                          ( {booking.caretakerName || '..........................................................'} )
                        </p>
                        <p className="text-[14.5pt] text-slate-500 mx-auto text-center leading-tight mt-0.5" style={{ width: '180px' }}>
                          {booking.caretakerPosition || 'นักวิชาการจัดดูแลยานพาหนะ'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Authority Decision */}
                  <div className="space-y-2 text-black leading-snug" style={{ fontSize: '14.5pt' }}>
                    <div className="font-bold border-l-2 border-black pl-2 leading-none">๒. คำสั่งผู้มีอำนาจอนุมัติราชการ</div>
                    
                    <div className="space-y-1.5 pl-2">
                      <div className="flex items-center gap-1.5 font-bold font-sans text-xs">
                        <span className={`w-3 h-3 border border-black rounded-sm flex items-center justify-center shrink-0 ${booking.status === 'approved' || booking.status === 'completed' ? 'bg-black text-white' : ''}`}>
                          {(booking.status === 'approved' || booking.status === 'completed') ? '✓' : ''}
                        </span>
                        <span>อนุญาต </span>
                      </div>
                      <div className="flex items-center gap-1.5 font-sans text-xs">
                        <span className={`w-3 h-3 border border-black rounded-sm flex items-center justify-center shrink-0 ${booking.status === 'rejected' ? 'bg-black text-white' : ''}`}>
                          {booking.status === 'rejected' ? '✗' : ''}
                        </span>
                        <span>ไม่อนุมัติ เนื่องจาก.......................................................</span>
                      </div>

                      <div className="pt-2 text-center leading-normal">
                        <p className="flex items-baseline justify-center">
                          <span className="w-24 text-right pr-1 shrink-0">ลงชื่อ</span>
                          <span className="w-[140px] overflow-hidden whitespace-nowrap text-center text-slate-400 select-none">......................................................................</span>
                          <span className="w-24 text-left pl-1 shrink-0 truncate font-sans font-semibold">ผู้มีอำนาจสั่งใช้รถ</span>
                        </p>
                        <p className="font-bold mt-1 mx-auto text-center" style={{ width: '180px', fontSize: '14.5pt' }}>
                          ( {booking.approvedBy} )
                        </p>
                        <p className="text-[14.5pt] text-slate-500 mx-auto text-center leading-tight mt-0.5 animate-pulse" style={{ width: '180px' }}>
                          {booking.approvedByPosition}
                        </p>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Flexible spacer to push passenger list and footer to the bottom */}
                <div className="flex-grow min-h-[16px]"></div>

                {/* Passenger List Box if any exists */}
                {booking.passengersList && booking.passengersList.filter(name => name.trim() !== '').length > 0 && (
                  <div className="mt-4 pt-3 border-t border-dashed border-slate-300" style={{ fontSize: '14.5pt' }}>
                    <p className="font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                      <span> รายชื่อผู้เข้าร่วมเดินทาง ({booking.passengersList.filter(name => name.trim() !== '').length} คน):</span>
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 text-slate-700 font-medium">
                      {booking.passengersList.filter(name => name.trim() !== '').map((name, idx) => (
                        <div key={idx} className="truncate">
                           <span className="font-bold text-slate-400 font-mono mr-1">{idx + 1}.</span> {name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bottom-most footer metadata */}
                <div className="pt-4 mt-2 text-center text-[14.5pt] text-slate-400 font-mono border-t border-slate-100 flex justify-between items-center print:pt-3">
                  <span style={{ fontSize: '10.5px' }}>ไอทีถอดรหัส: SHA-{booking.id.toUpperCase().substring(0, 8)}</span>
                  <span style={{ fontSize: '10.5px' }}>พิมพ์ระบบ พมจ.ตรัง</span>
                  <span style={{ fontSize: '10.5px' }}>สถานะจอง: {booking.status === 'approved' || booking.status === 'completed' ? 'อนุมัติผ่านคลังใบราชการแล้ว' : 'อยู่ระหว่างรอการประเมินสิทธิ์'}</span>
                </div>

              </div>
            </div>
          ) : (
            /* ================== TEMPLATE 2: THAI GOVT MEMORANDUM (แบบ ๓) ================== */
            <div className="flex flex-col h-full text-black leading-snug">
              
              {/* Header block with Garuda and Title */}
              <div className="relative flex items-end justify-between pb-1 mb-3 h-[91px] shrink-0">
                <div className="absolute left-0 top-0">
                  <img 
                    src={garudaLogo} 
                    alt="ตราครุฑ" 
                    className="object-contain"
                    style={{ width: '91px', height: '91px' }}
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="w-full text-center">
                  <h1 className="font-bold text-black font-sans leading-none" style={{ fontSize: '26pt', letterSpacing: '0.5px' }}>บันทึกข้อความ</h1>
                </div>
                <div className="absolute right-0 top-0 font-bold" style={{ fontSize: '14.5pt' }}>
                  แบบ ๓
                </div>
              </div>

              {/* Memo Info block: ส่วนราชการ, ที่, วันที่, เรื่อง */}
              <div className="space-y-1.5 pb-2 mb-3 text-black" style={{ fontSize: '14.5pt' }}>
                <div className="flex items-baseline">
                  <span className="font-bold shrink-0">ส่วนราชการ</span>
                  <span className="ml-2 font-normal border-b border-dotted border-black/40 flex-grow pl-1 pb-0.5">
                    สำนักงานพัฒนาสังคมฯ จังหวัดตรัง ({booking.department || 'ฝ่ายบริหารทั่วไป'} โทร. ๐ ๗๕๒๑ ๘๓๖๖)
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-baseline">
                    <span className="font-bold shrink-0">ที่</span>
                    <span className="ml-2 font-normal border-b border-dotted border-black/40 flex-grow pl-1 pb-0.5">
                      ตง ๐๐๐๕/{toThaiNumerals(booking.permitNumber ? booking.permitNumber.split('/')[0] : '')}
                    </span>
                  </div>
                  <div className="flex items-baseline">
                    <span className="font-bold shrink-0">วันที่</span>
                    <span className="ml-2 font-normal border-b border-dotted border-black/40 flex-grow pl-1 pb-0.5">
                      {createdDateThai}
                    </span>
                  </div>
                </div>
                <div className="flex items-baseline">
                  <span className="font-bold shrink-0">เรื่อง</span>
                  <span className="ml-2 font-bold border-b border-dotted border-black/40 flex-grow pl-1 pb-0.5 text-black">
                    ขออนุญาตใช้รถยนต์ส่วนกลาง
                  </span>
                </div>
              </div>

              {/* Addressed To */}
              <div className="mb-2" style={{ fontSize: '14.5pt' }}>
                <span className="font-bold">เรียน</span> <span className="ml-1 font-semibold">ผู้ว่าราชการจังหวัดตรัง</span>
              </div>

              {/* Paragraph details with indent */}
              <div className="space-y-2 text-justify flex-grow" style={{ fontSize: '14.5pt', lineHeight: '1.25' }}>
                <p className="leading-relaxed" style={{ textIndent: '2.5em' }}>
                  ด้วยข้าพเจ้า <span className="font-bold border-b border-dotted border-black px-1.5">{booking.requesterName}</span> ตำแหน่ง <span className="font-bold border-b border-dotted border-black px-1.5">{booking.requesterPosition}</span> สังกัดกลุ่มงาน <span className="font-semibold border-b border-dotted border-black px-1.5">{booking.department}</span> มีความประสงค์ขอใช้รถยนต์ส่วนกลาง/ราชการ เพื่อเดินทางไปปฏิบัติราชการพื้นที่ <span className="font-bold border-b border-dotted border-black px-1.5">{booking.destination}</span> เพื่อ <span className="font-medium border-b border-dotted border-black px-1.5">{booking.purpose}</span> โดยมีคนนั่งจำนวน <span className="font-bold border-b border-dotted border-black px-1.5">{booking.passengersCount}</span> คน คือ <span className="font-semibold border-b border-dotted border-black px-1">{booking.passengersList && booking.passengersList.filter(n => n.trim() !== '').length > 0 ? `ข้าพเจ้าและผู้ร่วมทาง ได้แก่ ${booking.passengersList.filter(n => n.trim() !== '').join(', ')}` : 'ข้าพเจ้าลำพัง'}</span> ในวันที่ <span className="font-bold border-b border-dotted border-black px-1.5">{startDateThaiOnly}</span> เวลา <span className="font-bold border-b border-dotted border-black px-1">{formatTime(booking.startDate)} น.</span> {booking.endDate ? (
                    <>
                      ถึงวันที่ <span className="font-bold border-b border-dotted border-black px-1.5">{endDateThaiOnly}</span> เวลา <span className="font-bold border-b border-dotted border-black px-1">{formatTime(booking.endDate)} น.</span>
                    </>
                  ) : 'เป็นต้นไป'}
                </p>

                <p className="leading-normal" style={{ textIndent: '2.5em' }}>
                  จึงเรียนมาเพื่อโปรดพิจารณา
                </p>

                {/* Requester signature block right aligned */}
                <div className="pt-2 flex justify-end text-center">
                  <div className="w-80 leading-normal" style={{ fontSize: '14.5pt' }}>
                    <p className="flex items-baseline justify-center">
                      <span className="w-16 text-right pr-1 shrink-0 select-none">(ลงชื่อ)</span>
                      <span className="w-[140px] overflow-hidden whitespace-nowrap text-center text-slate-400 select-none">......................................................................</span>
                      <span className="w-24 text-left pl-1 shrink-0 font-sans">ผู้ขออนุญาต</span>
                    </p>
                    <div className="font-bold mt-1 text-black leading-tight">
                      ( {booking.requesterName} )
                      <br />
                      <span className="text-[14.5pt] text-slate-600 font-semibold">ตำแหน่ง: {booking.requesterPosition}</span>
                    </div>
                  </div>
                </div>

                {/* Recommendations opinion row (เห็นควรอนุญาต) */}
                <div className="space-y-1.5 mt-3 pl-2 pb-3.5">
                  <div className="pl-4 flex justify-between items-end">
                    <div className="text-[14.5pt] text-slate-500 font-medium font-sans">
                    </div>
                    <div className="w-80 leading-normal text-center ml-auto" style={{ fontSize: '14.5pt' }}>
                      <p className="font-bold text-black mb-2 text-center">เห็นควรอนุญาต</p>
                      <p className="flex items-baseline justify-center">
                        <span className="w-16 text-right pr-1 shrink-0 select-none">(ลงชื่อ)</span>
                        <span className="w-[140px] overflow-hidden whitespace-nowrap text-center text-slate-400 select-none">......................................................................</span>
                        <span className="text-left pl-1 shrink-0 font-sans min-w-24">
                          {(booking.departmentHeadPosition?.startsWith('แทน') || booking.departmentHeadPosition?.includes('แทน'))
                            ? (booking.department ? `แทนหัวหน้า${booking.department}` : 'แทนหัวหน้ากลุ่ม/ฝ่าย')
                            : (booking.department ? `หัวหน้า${booking.department}` : 'หัวหน้ากลุ่ม/ฝ่าย')
                          }
                        </span>
                      </p>
                      <p className="font-bold mt-1 text-black">
                        ( {booking.departmentHeadName || '......................................................................'} )
                      </p>
                      <p className="text-[14.5pt] text-slate-500 mt-0.5">
                        ตำแหน่ง {displayPosition ? (displayPosition.startsWith('ตำแหน่ง') ? displayPosition.replace(/^ตำแหน่ง\s*/, '') : displayPosition) : '...................................................'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bordered box style matching page image: บันทึกการใช้ยานพาหนะและการอนุญาต */}
                <div className="border border-black rounded-lg p-3.5 mt-3 supplementary-box relative bg-transparent flex flex-col justify-between" style={{ fontSize: '14.5pt' }}>
                  
                  {/* Absolute box item right-corner info card */}
                  <div className="absolute right-3 top-3 border border-black p-2 w-44 leading-normal text-left shrink-0 rounded font-sans" style={{ fontSize: '11pt' }}>
                    <p className="flex items-center overflow-hidden w-full">
                      <span className="shrink-0">เลขที่รับ</span>
                      <span className="text-slate-400 ml-1 select-none overflow-hidden whitespace-nowrap flex-grow">................................................</span>
                      <span className="shrink-0 text-slate-400">/</span>
                      <span className="text-slate-400 select-none overflow-hidden whitespace-nowrap w-12">............................</span>
                    </p>
                    <p className="flex items-center overflow-hidden w-full mt-1">
                      <span className="shrink-0">ว.ด.ป.</span>
                      <span className="text-slate-400 ml-1 select-none overflow-hidden whitespace-nowrap flex-grow">................................................</span>
                    </p>
                    <p className="flex items-center overflow-hidden w-full mt-1">
                      <span className="shrink-0">เวลา</span>
                      <span className="text-slate-400 ml-1 select-none overflow-hidden whitespace-nowrap flex-grow">................................................</span>
                    </p>
                  </div>

                  {/* เรียน ผู้ว่าราชการราชการ */}
                  <div className="mb-2">
                    <h3 className="font-bold underline text-center text-[14.5pt] tracking-wide mb-2.5 w-[60%]">บันทึกการใช้ยานพาหนะและการอนุญาต</h3>
                    <span className="font-bold text-black pl-1">เรียน</span> <span className="font-semibold pl-1.5">ผู้ว่าราชการจังหวัดตรัง</span>
                  </div>

                  {/* Allocations */}
                  <div className="space-y-0.5 pl-3 leading-normal font-medium">
                    <p>
                      เห็นควรอนุญาตให้ใช้รถยนต์ส่วนกลางหมายเลขทะเบียน <span className="font-bold border-b border-dotted border-black px-2">{vehicle?.plateNumber || '...................................................'}</span>
                    </p>
                    <p>
                      โดยมี <span className="font-bold border-b border-dotted border-black px-2">{driver?.name || '................................................................................'}</span> เป็นพนักงานขับรถยนต์
                    </p>
                  </div>

                  {/* Split columns for signature */}
                  <div className="grid grid-cols-2 gap-4 mt-3 mb-2">
                    {/* Left side caretaker */}
                    <div className="text-center leading-normal">
                      <p className="flex items-baseline justify-center">
                        <span className="w-12 text-right pr-1 shrink-0 select-none">ลงชื่อ</span>
                        <span className="w-[140px] overflow-hidden whitespace-nowrap text-center text-slate-400 select-none">......................................................................</span>
                        <span className="w-24 text-left pl-1 shrink-0 truncate font-sans text-[14.5pt]">ผู้ควบคุมใช้รถ</span>
                      </p>
                      <p className="font-bold mt-1 text-black" style={{ fontSize: '14.5pt' }}>
                        ( {booking.caretakerName || '..........................................................'} )
                      </p>
                      <p className="text-[14.5pt] text-slate-500 mt-0.5">
                        {booking.caretakerPosition || 'นักวิชาการจัดดูแลยานพาหนะ'}
                      </p>
                    </div>

                    {/* Right side General division manager */}
                    <div className="text-center leading-normal border-l border-dotted border-black/25">
                      <p className="flex items-baseline justify-center">
                        <span className="w-12 text-right pr-1 shrink-0 select-none">ลงชื่อ</span>
                        <span className="w-[140px] overflow-hidden whitespace-nowrap text-center text-slate-400 select-none">......................................................................</span>
                        <span className="w-24 text-left pl-1 shrink-0 truncate font-sans text-[14.5pt]">หน.ฝ่ายบริหารทั่วไป</span>
                      </p>
                      <p className="font-bold mt-1 text-black">
                        ( นางดาลินี   ศรีสุข )
                      </p>
                      <p className="text-[14.5pt] text-slate-500 mt-0.5 font-sans">
                        ตำแหน่ง นักพัฒนาสังคมชำนาญการ
                      </p>
                    </div>
                  </div>

                  {/* Radio tick checkboxes */}
                  <div className="space-y-1 pl-3 border-t border-dashed border-black/45 pt-2.5">
                    <div className="flex items-center gap-2 font-bold font-sans text-[14.5pt]">
                      <span className={`w-3.5 h-3.5 border border-black rounded-sm flex items-center justify-center shrink-0 ${booking.status === 'approved' || booking.status === 'completed' ? 'bg-black text-white' : ''}`}>
                        {(booking.status === 'approved' || booking.status === 'completed') ? '✓' : ''}
                      </span>
                      <span>อนุญาต </span>
                    </div>
                    <div className="flex items-center gap-2 font-sans text-[14.5pt]">
                      <span className={`w-3.5 h-3.5 border border-black rounded-sm flex items-center justify-center shrink-0 ${booking.status === 'rejected' ? 'bg-black text-white' : ''}`}>
                        {booking.status === 'rejected' ? '✗' : ''}
                      </span>
                      <span className="text-black font-semibold">ไม่อนุญาต เนื่องจาก .............................................................................................................................</span>
                    </div>
                  </div>

                  {/* Final authority signature block */}
                  <div className="pt-3 text-center leading-normal max-w-sm mx-auto mt-1">
                    <p className="flex items-baseline justify-center">
                      <span className="w-12 text-right pr-1 shrink-0 select-none">ลงชื่อ</span>
                      <span className="w-[140px] overflow-hidden whitespace-nowrap text-center text-slate-400 select-none">......................................................................</span>
                      <span className="w-24 text-left pl-1 shrink-0 truncate font-sans">ผู้มีอำนาจสั่งใช้รถ</span>
                    </p>
                    <p className="font-bold mt-1 text-black" style={{ fontSize: '14.5pt' }}>
                      ( {booking.approvedBy} )
                    </p>
                    <p className="text-[14.5pt] text-slate-600 mt-0.5 font-bold leading-tight">
                      {booking.approvedByPosition === 'พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดตรัง' ? (
                        <>
                          พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดตรัง ปฏิบัติราชการแทน
                          <br />
                          ผู้ว่าราชการจังหวัดตรัง
                        </>
                      ) : booking.approvedByPosition}
                    </p>
                  </div>

                </div>

                {/* Footer status line inside printed form */}
                <div className="pt-3 mt-1 text-center text-[14.5pt] text-slate-400 font-mono border-t border-slate-100 flex justify-between items-center print:pt-2">
                  <span>พมจ.ตรัง แบบ ๓: บันทึกขอใช้รถราชการ</span>
                  <span className="font-bold">ID: {booking.id.toUpperCase().substring(0, 8)}</span>
                </div>

              </div>

            </div>
          )}
          
        </div>
        
      </div>
      
    </div>
  );
}
