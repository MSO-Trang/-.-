import React from 'react';
import { AlertTriangle, Trash2, X, LogOut, Check } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'ยืนยันกดยืนยัน',
  cancelText = 'ยกเลิก',
  type = 'warning',
  onConfirm,
  onCancel
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300 animate-fade-in"
        onClick={onCancel}
      />
      
      {/* Modal Container */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full relative z-10 shadow-xl space-y-4 animate-scale-up font-sans">
        
        {/* Header Icon */}
        <div className="flex items-start gap-3.5">
          <div className={`p-3 rounded-full shrink-0 ${
            type === 'danger' 
              ? 'bg-rose-50 border border-rose-100 text-rose-600' 
              : type === 'warning'
              ? 'bg-amber-50 border border-amber-100 text-amber-600'
              : 'bg-blue-50 border border-blue-100 text-blue-600'
          }`}>
            {type === 'danger' ? (
              <Trash2 size={22} className="animate-pulse" />
            ) : type === 'warning' ? (
              <AlertTriangle size={22} className="animate-bounce" />
            ) : (
              <LogOut size={22} />
            )}
          </div>
          
          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-slate-900 leading-snug">
              {title}
            </h3>
            <p className="text-xs text-slate-500 leading-normal whitespace-pre-line">
              {message}
            </p>
          </div>
        </div>

        {/* Buttons Action bar */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 text-xs">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-slate-50 hover:bg-slate-150 text-slate-650 border border-slate-200 font-bold rounded-xl transition cursor-pointer"
          >
            {cancelText}
          </button>
          
          <button
            type="button"
            onClick={() => {
              onConfirm();
            }}
            className={`px-4.5 py-2 text-white font-extrabold rounded-xl transition cursor-pointer shadow-xs ${
              type === 'danger'
                ? 'bg-rose-600 hover:bg-rose-500 border border-rose-550'
                : type === 'warning'
                ? 'bg-amber-500 hover:bg-amber-450 border border-amber-550'
                : 'bg-slate-700 hover:bg-slate-650'
            }`}
          >
            {confirmText}
          </button>
        </div>

      </div>
    </div>
  );
}
