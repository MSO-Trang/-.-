import React, { useState } from 'react';
import { Shield, Eye, EyeOff, Lock, User, AlertCircle, ArrowLeft } from 'lucide-react';

interface AdminLoginProps {
  onLoginSuccess: () => void;
  onCancel?: () => void;
}

export default function AdminLogin({ onLoginSuccess, onCancel }: AdminLoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simulate small latency for realistic & polished feel
    setTimeout(() => {
      if (username.trim().toLowerCase() === 'admin' && password === 'admin1234') {
        onLoginSuccess();
      } else {
        setError('ชื่อผู้ใช้หรือรหัสผ่านผู้ดูแลระบบไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง');
        setIsLoading(false);
      }
    }, 600);
  };

  return (
    <div className="max-w-md w-full mx-auto bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-md space-y-6 animate-fade-in my-8">
      
      {/* Visual Seal Header */}
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-full bg-pink-50 border border-pink-100 flex items-center justify-center text-[#a22055] mx-auto shadow-xs">
          <Shield size={28} className="animate-pulse" />
        </div>
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 font-sans">
            เข้าสู่ระบบผู้ดูแลระบบ (Admin)
          </h2>
          <p className="text-xs text-slate-500 max-w-[280px] mx-auto mt-0.5">
            ยืนยันสิทธิ์เพื่อความปลอดภัยในการเพิ่ม ลบ และปรับปรุงข้อมูลสารสนเทศทั้งหมดของหน่วยงาน
          </p>
        </div>
      </div>

      {/* Form Area */}
      <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans text-slate-705">
        
        {/* Username Field */}
        <div className="space-y-1.5">
          <label className="block font-bold text-slate-800">ชื่อผู้ใช้งาน (Username)</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
              <User size={14} />
            </span>
            <input 
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="กรอกชื่อผู้ใช้ เช่น admin"
              disabled={isLoading}
              className="pl-9 pr-3 py-2 w-full bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-[#a22055] focus:border-[#a22055] focus:bg-white transition"
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block font-bold text-slate-800">รหัสผ่านสำหรับเจ้าหน้าที่ (Password)</label>
          </div>
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
              <Lock size={14} />
            </span>
            <input 
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="กรอกรหัสผ่านผู้ดูแล"
              disabled={isLoading}
              className="pl-9 pr-10 py-2 w-full bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-[#a22055] focus:border-[#a22055] focus:bg-white transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-650"
            >
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        {/* Error notification block */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 rounded-lg flex items-start gap-2.5 leading-normal animate-shake">
            <AlertCircle size={14} className="text-rose-600 shrink-0 mt-0.5" />
            <p className="font-semibold text-[11px]">{error}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-2 pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-2.5 bg-[#a22055] hover:bg-[#8c1c4a] text-white font-extrabold rounded-xl text-xs md:text-sm tracking-wide shadow-xs transition duration-200 cursor-pointer flex items-center justify-center ${
              isLoading ? 'opacity-80 cursor-wait' : ''
            }`}
          >
            {isLoading ? 'กำลังสแกนสิทธิ์ตรวจสอบ...' : 'Login'}
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-650 border border-slate-200 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1 cursor-pointer"
            >
              <ArrowLeft size={13} />
              ย้อนกลับหน้าแรก
            </button>
          )}
        </div>

      </form>

    </div>
  );
}
