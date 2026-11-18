import React, { useState, useEffect } from 'react';
import {
  X,
  User as UserIcon,
  Mail,
  Phone,
  Store,
  LogOut,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { User } from '../types/printease';

interface OwnerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onLogout: () => void;
  onSwitchPortal?: (portal: 'customer' | 'shopkeeper') => void;
}

export const OwnerProfileModal: React.FC<OwnerProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogout,
  onSwitchPortal,
}) => {
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setShowConfirmLogout(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const ownerName = currentUser?.name || 'Vinay (Owner)';
  const ownerEmail = currentUser?.email || 'vinay8046d@gmail.com';
  const ownerPhone = currentUser?.phone || '+91 80887 11191';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md sm:max-w-lg rounded-3xl shadow-2xl border border-[#C48B28]/30 overflow-hidden my-auto animate-scaleUp transition-all duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Banner */}
        <div className="relative bg-gradient-to-r from-[#422C09] via-[#5A3C0B] to-[#422C09] px-5 sm:px-6 py-5 text-[#FFF5E1]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-[#C48B28]/25 text-[#EBC176] border border-[#C48B28]/35">
                <Store className="w-4 h-4" />
              </span>
              <span className="text-xs font-black uppercase tracking-wider text-[#EBC176]">
                Owner Profile
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-[#FFF5E1]/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close Profile"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-4 flex items-center gap-3.5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-[#C48B28] to-[#F3D492] text-[#422C09] flex items-center justify-center text-xl sm:text-2xl font-black shadow-lg border-2 border-white/20 shrink-0">
              {ownerName.charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-[#FFF5E1] truncate">
                  {ownerName}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-[#C48B28] text-[#422C09] text-[10px] font-black tracking-wide shrink-0">
                  OWNER
                </span>
              </div>
              <p className="text-xs text-[#FFF5E1]/75 flex items-center gap-1.5 mt-0.5 truncate">
                <Mail className="w-3.5 h-3.5 text-[#C48B28] shrink-0" />
                <span className="truncate">{ownerEmail}</span>
              </p>
              <p className="text-xs text-[#FFF5E1]/75 flex items-center gap-1.5 mt-0.5">
                <Phone className="w-3.5 h-3.5 text-[#C48B28] shrink-0" />
                <span>{ownerPhone}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-4">
          {onSwitchPortal && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onSwitchPortal('customer');
              }}
              className="w-full p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs sm:text-sm font-bold flex items-center justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-[#C48B28]" />
                <span>Student App</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500" />
            </button>
          )}

          {/* Logout */}
          <div className="pt-2 border-t border-slate-200">
            {!showConfirmLogout ? (
              <button
                type="button"
                onClick={() => setShowConfirmLogout(true)}
                className="w-full py-3.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 rounded-2xl text-xs sm:text-sm font-black border border-rose-300 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.99]"
              >
                <LogOut className="w-4 h-4 text-rose-600" />
                <span>Logout</span>
              </button>
            ) : (
              <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-2xl space-y-3 animate-fadeIn">
                <div className="flex items-center gap-2 text-xs text-rose-900 font-bold">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Confirm logout?</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onLogout();
                    }}
                    className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Yes, Logout</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConfirmLogout(false)}
                    className="flex-1 py-2.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

