import React, { useState, useEffect } from 'react';
import { Printer, ArrowLeft, ShieldCheck, FileCheck2 } from 'lucide-react';
import { Booking, Vehicle, Driver } from '../types';
import { formatThaiDate, formatTime } from '../utils/bookingUtils';
import { MSDHS_LOGO_BASE64 } from '../data/logoBase64';

interface PrintPermitProps {
  booking: Booking;
  vehicles: Vehicle[];
  drivers: Driver[];
  onBack: () => void;
}

export default function PrintPermit({
  booking,
  vehicles,
  drivers,
  onBack
}: PrintPermitProps) {
  
  const [isInIframe, setIsInIframe] = useState(false);

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

  const triggerPrint = () => {
    if (isInIframe) {
      alert("⚠️ เนื่องจากคุณกำลังเข้าใช้งานผ่านเฟรมตัวอย่าง (Sandbox iFrame) ของ AI Studio แอลกอริทึมของเบราว์เซอร์ล็อคไม่ให้ใช้คำสั่งพิมพ์โดยตรง\n\nโปรดคลิกปุ่มสีส้ม 'เปิดในแท็บใหม่เพื่อพิมพ์คำขอใช้รถ' ด้านบนเพื่อเปิดหน้าต่างแยกเต็มจอ แล้วคุณจะสามารถพิมพ์คำขอรถยนต์ใบราชการนี้ได้ทันที!");
    } else {
      window.print();
    }
  };

  return (
    <div className="space-y-4 font-sans" id="print-view-wrapper">
      
      {/* Visual Actions Bar - Hidden during printing */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
        
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
            title="ย้อนกลับ"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <span className="text-[10px] bg-[#a22055]/10 text-[#a22055] font-black px-2.5 py-0.5 rounded-full border border-[#a22055]/20 font-mono">
              เลขใบอนุญาต: {booking.permitNumber}
            </span>
            <h2 className="text-sm font-extrabold text-slate-900 mt-1">พิมพ์ใบขออนุญาตใช้รถยนต์ราชการ (พมจ.ตรัง)</h2>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto items-center">
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
            fontSize: '13.5pt',
            lineHeight: '1.2'
          }}
          id="government-form-paper"
        >
          
          {/* Header row with Ministry logo and Title */}
          <div className="flex flex-col items-center justify-center text-center space-y-1 mb-4 print:mb-2">
            <img 
              src={MSDHS_LOGO_BASE64} 
              alt="ตรากระทรวง พม." 
              className="w-16 h-16 object-contain"
              referrerPolicy="no-referrer"
            />
            <h1 className="text-lg font-bold text-black" style={{ fontSize: '18pt', lineHeight: '1.1' }}>ใบขออนุญาตใช้รถยนต์ราชการ</h1>
            <p className="font-bold text-black" style={{ fontSize: '12.5pt' }}>สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดตรัง</p>
          </div>

          {/* Permit reference details */}
          <div className="flex justify-between border-b border-black pb-2 mb-3.5" style={{ fontSize: '12.5pt' }}>
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
          <div className="space-y-2" style={{ fontSize: '13.5pt', lineHeight: '1.25' }}>
            
            <p className="font-bold leading-normal" style={{ fontSize: '13pt' }}>เรียน ผู้ว่าราชการจังหวัดตรัง</p>
            
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
              <p className="pl-6 italic text-slate-700 bg-slate-50 py-1 px-3.5 rounded text-[11.5pt] border border-dashed border-slate-250 print:bg-white print:border-none print:p-0">
                <strong>(หมายเหตุเพิ่มเติม):</strong> {booking.remarks}
              </p>
            )}

            <div className="pt-2 flex justify-end text-center">
              <div className="w-80 leading-normal">
                <p>ลงชื่อ .............................................................. ผู้ขออนุมัติใช้งาน</p>
                <div className="text-[12.5pt] text-slate-600 mt-1 font-semibold leading-tight">
                  ( {booking.requesterName} )
                  <br />
                  ตำแหน่ง: {booking.requesterPosition}
                </div>
              </div>
            </div>

            {/* Verification & Approvals Row - Squeezed gap and margins for single-page fit */}
            <div className="grid grid-cols-2 gap-4 pt-3.5 border-t border-dashed border-black/40">
              
              {/* Recommendations */}
              <div className="space-y-2 text-black leading-snug" style={{ fontSize: '12.5pt' }}>
                <div className="font-bold border-l-2 border-black pl-2 leading-none">๑. ความเห็นฝ่ายพัสดุและยานพาหนะ</div>
                
                <div className="space-y-1.5 pl-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 border border-black rounded-sm inline-block shrink-0"></span>
                    <span>เห็นควรอนุมัติให้ตามความประสงค์</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 border border-black rounded-sm inline-block shrink-0"></span>
                    <span>เห็นควรสับเปลี่ยนจัดหาคันอื่นทดแทน</span>
                  </div>
                  
                  <div className="pt-2.5 text-center leading-normal">
                    <p>ลงชื่อ ......................................................... ผู้ควบคุมการใช้รถ</p>
                    <p className="font-bold mt-1 mx-auto" style={{ width: '241.812px', height: '22px' }}>
                      ( {booking.caretakerName || '...................................................'} )
                    </p>
                    <p className="text-[11pt] text-slate-500 mx-auto" style={{ width: '243.797px' }}>
                      {booking.caretakerPosition || 'นักวิชาการจัดดูแลยานพาหนะ'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Authority Decision */}
              <div className="space-y-2 text-black leading-snug" style={{ fontSize: '12.5pt' }}>
                <div className="font-bold border-l-2 border-black pl-2 leading-none">๒. คำสั่งผู้มีอำนาจอนุมัติราชการ</div>
                
                <div className="space-y-1.5 pl-2">
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className={`w-3 h-3 border border-black rounded-sm flex items-center justify-center shrink-0 ${booking.status === 'approved' || booking.status === 'completed' ? 'bg-black text-white' : ''}`}>
                      {(booking.status === 'approved' || booking.status === 'completed') ? '✓' : ''}
                    </span>
                    <span>อนุญาต </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-3 h-3 border border-black rounded-sm flex items-center justify-center shrink-0 ${booking.status === 'rejected' ? 'bg-black text-white' : ''}`}>
                      {booking.status === 'rejected' ? '✗' : ''}
                    </span>
                    <span>ไม่อนุมัติ เนื่องจาก.......................................................</span>
                  </div>

                  <div className="pt-2.5 text-center leading-normal">
                    <p>ลงชื่อ ......................................................... ผู้มีอำนาจสั่งใช้รถ</p>
                    <p className="font-bold mt-1 mx-auto" style={{ width: '278.812px' }}>
                      ( {booking.approvedBy} )
                    </p>
                    <p className="text-[11pt] text-slate-500 mx-auto" style={{ width: '288.812px' }}>
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
              <div className="mt-4 pt-3 border-t border-dashed border-slate-300" style={{ fontSize: '10.5pt' }}>
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
            <div className="pt-4 mt-2 text-center text-[11pt] text-slate-400 font-mono border-t border-slate-100 flex justify-between items-center print:pt-3">
              <span style={{ fontSize: '10.5px' }}>ไอทีถอดรหัส: SHA-{booking.id.toUpperCase().substring(0, 8)}</span>
              <span style={{ fontSize: '10.5px' }}>พิมพ์ระบบ พมจ.ตรัง</span>
              <span style={{ fontSize: '10.5px' }}>สถานะจอง: {booking.status === 'approved' || booking.status === 'completed' ? 'อนุมัติผ่านคลังใบราชการแล้ว' : 'อยู่ระหว่างรอการประเมินสิทธิ์'}</span>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
