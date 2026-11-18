import React, { useState, useEffect, useRef } from 'react';
import {
  Printer,
  Bell,
  User as UserIcon,
  Search,
  BookOpen,
  LogOut,
  Upload,
  TrendingUp,
  PackageCheck,
  ShieldAlert,
  Store,
  ChevronDown,
  Wallet as WalletIcon,
  CreditCard,
  Check,
  Clock,
  SlidersHorizontal,
} from 'lucide-react';
import { User, NotificationItem, ShopStatusInfo } from '../types/printease';
import { StatusBlinkDot } from './StatusBlinkDot';

export type PortalMode = 'customer' | 'shopkeeper';
export type CustomerPage = 'upload' | 'files' | 'track' | 'wallet' | 'orders';
export type ShopkeeperTab = 'queue' | 'kiosk' | 'analytics' | 'payments' | 'security';

interface NavbarProps {
  portal: PortalMode;
  customerPage: CustomerPage;
  shopkeeperTab: ShopkeeperTab;
  onSelectCustomerPage: (page: CustomerPage) => void;
  onSelectShopkeeperTab: (tab: ShopkeeperTab) => void;
  onOpenShopkeeperLogin: () => void;
  onExitToCustomer: () => void;
  onSwitchPortal?: (portal: PortalMode) => void;
  currentUser: User | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenOwnerProfile?: () => void;
  notifications: NotificationItem[];
  onOpenNotifications: () => void;
  unreadCount: number;
  shopStatus?: ShopStatusInfo | null;
  walletBalance?: number;
  onOpenShopStatusControl?: () => void;
  onUpdateShopStatus?: (updated: Partial<ShopStatusInfo>) => Promise<void>;
}

function formatTime12h(time24?: string): string {
  if (!time24 || !time24.includes(':')) return time24 || '09:00';
  const [hStr, mStr] = time24.split(':');
  const h = parseInt(hStr, 10);
  const m = mStr || '00';
  if (Number.isNaN(h)) return time24;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${suffix}`;
}

export const Navbar: React.FC<NavbarProps> = ({
  portal,
  customerPage,
  shopkeeperTab,
  onSelectCustomerPage,
  onSelectShopkeeperTab,
  onSwitchPortal,
  currentUser,
  onOpenAuth,
  onLogout,
  onOpenOwnerProfile,
  unreadCount,
  onOpenNotifications,
  shopStatus,
  walletBalance = 0,
  onOpenShopStatusControl,
  onUpdateShopStatus,
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showOwnerDropdown, setShowOwnerDropdown] = useState(false);
  const [showOwnerStatusPopover, setShowOwnerStatusPopover] = useState(false);
  const [showCustomerTimings, setShowCustomerTimings] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const ownerDropdownRef = useRef<HTMLDivElement>(null);
  const ownerStatusRef = useRef<HTMLDivElement>(null);
  const customerTimingsRef = useRef<HTMLDivElement>(null);

  const isShopOpen = shopStatus ? shopStatus.status === 'OPEN' : true;
  const openingFormatted = formatTime12h(shopStatus?.opening_time || '09:00');
  const closingFormatted = formatTime12h(shopStatus?.closing_time || '20:00');

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setShowUserDropdown(false);
      }
      if (ownerDropdownRef.current && !ownerDropdownRef.current.contains(target)) {
        setShowOwnerDropdown(false);
      }
      if (ownerStatusRef.current && !ownerStatusRef.current.contains(target)) {
        setShowOwnerStatusPopover(false);
      }
      if (customerTimingsRef.current && !customerTimingsRef.current.contains(target)) {
        setShowCustomerTimings(false);
      }
    }
    if (showUserDropdown || showOwnerDropdown || showOwnerStatusPopover || showCustomerTimings) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showUserDropdown, showOwnerDropdown, showOwnerStatusPopover, showCustomerTimings]);

  const handleQuickToggleShopStatus = async (targetStatus: 'OPEN' | 'CLOSED') => {
    if (!onUpdateShopStatus) return;
    setStatusUpdating(true);
    try {
      const isClosed = targetStatus === 'CLOSED';
      await onUpdateShopStatus({
        status: targetStatus,
        mode: isClosed ? 'FORCE_CLOSED' : 'FORCE_OPEN',
        accepting_orders: !isClosed,
        message: !isClosed
          ? 'PrintEase is currently open and accepting orders.'
          : 'PrintEase is currently closed. Orders and payments are paused.',
      });
    } catch (e) {
      console.error('Failed to toggle shop status:', e);
    } finally {
      setStatusUpdating(false);
    }
  };

  // ==========================================
  // 1. SHOPKEEPER / OWNER NAVBAR
  // ==========================================
  if (portal === 'shopkeeper') {
    return (
      <header className="sticky top-0 z-40 bg-[#422C09] text-[#FFF5E1] border-b border-[#C48B28]/30 shadow-md">
        <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20 gap-1.5 sm:gap-2">
            {/* Shopkeeper Brand */}
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-[#C48B28] to-[#EBC176] flex items-center justify-center text-[#FFF5E1] shadow-md shadow-[#C48B28]/30 shrink-0">
                <Store className="w-4 h-4 sm:w-6 sm:h-6" />
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-base sm:text-xl font-black tracking-tight text-[#FFF5E1]">
                  Print<span className="text-[#C48B28]">Ease</span>
                </span>
                <span className="hidden sm:inline px-2 py-0.5 rounded-md bg-[#C48B28]/30 text-[#FFF5E1] border border-[#C48B28]/40 text-[10px] font-black uppercase tracking-wider">
                  Owner Console
                </span>
              </div>
            </div>

            {/* Shopkeeper Desktop Navigation Tabs */}
            <nav className="hidden lg:flex items-center bg-[#352206] p-1 rounded-2xl border border-[#C48B28]/25 gap-1">
              <button
                onClick={() => onSelectShopkeeperTab('queue')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  shopkeeperTab === 'queue'
                    ? 'bg-[#C48B28] text-[#FFF5E1] shadow-sm'
                    : 'text-[#FFF5E1]/80 hover:text-white hover:bg-[#C48B28]/20'
                }`}
              >
                <Printer className="w-4 h-4" />
                <span>Print Queue</span>
              </button>

              <button
                onClick={() => onSelectShopkeeperTab('kiosk')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  shopkeeperTab === 'kiosk'
                    ? 'bg-[#C48B28] text-[#FFF5E1] shadow-sm'
                    : 'text-[#FFF5E1]/80 hover:text-white hover:bg-[#C48B28]/20'
                }`}
              >
                <PackageCheck className="w-4 h-4" />
                <span>Pickup Kiosk</span>
              </button>

              <button
                onClick={() => onSelectShopkeeperTab('analytics')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  shopkeeperTab === 'analytics'
                    ? 'bg-[#C48B28] text-[#FFF5E1] shadow-sm'
                    : 'text-[#FFF5E1]/80 hover:text-white hover:bg-[#C48B28]/20'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>Analytics &amp; Rates</span>
              </button>

              <button
                onClick={() => onSelectShopkeeperTab('security')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  shopkeeperTab === 'security'
                    ? 'bg-[#C48B28] text-[#FFF5E1] shadow-sm'
                    : 'text-[#FFF5E1]/80 hover:text-white hover:bg-[#C48B28]/20'
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Cyber Shield</span>
              </button>
            </nav>

            {/* Right Side Actions for Shopkeeper */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              {/* Top-Header Interactive Shop Status Button matching Analytics & Rates style */}
              <div ref={ownerStatusRef} className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setShowOwnerStatusPopover((prev) => !prev)}
                  className={`px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                    showOwnerStatusPopover
                      ? 'bg-[#C48B28] text-[#FFF5E1] border-[#C48B28] shadow-sm'
                      : 'bg-[#352206] text-[#FFF5E1]/90 hover:text-white hover:bg-[#C48B28]/20 border-[#C48B28]/30'
                  }`}
                  title="Shop Status & Hours"
                  aria-expanded={showOwnerStatusPopover}
                >
                  <StatusBlinkDot isOpen={isShopOpen} size="sm" />
                  <span className="whitespace-nowrap">{isShopOpen ? 'Shop Open' : 'Shop Closed'}</span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-80 shrink-0" />
                </button>

                {showOwnerStatusPopover && (
                  <div className="absolute top-full right-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-1.5rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-50 text-slate-800 animate-fadeIn space-y-3.5">
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4 text-[#C48B28]" />
                        <span className="text-xs font-black uppercase tracking-wider text-[#422C09]">
                          Shop Status Control
                        </span>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1.5 border ${
                          isShopOpen
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                      >
                        <StatusBlinkDot isOpen={isShopOpen} size="sm" />
                        <span>{isShopOpen ? 'OPEN' : 'CLOSED'}</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-slate-400 block font-semibold">Orders &amp; Payments</span>
                        <strong className={isShopOpen ? 'text-emerald-700' : 'text-rose-700'}>
                          {isShopOpen ? 'Accepting' : 'Paused'}
                        </strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-slate-400 block font-semibold">Mode</span>
                        <strong className="font-mono text-slate-800">
                          {shopStatus?.mode || 'AUTO'}
                        </strong>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#FFF5E1]/70 border border-[#C48B28]/30 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-[#5A3C0B] font-semibold">
                        <Clock className="w-3.5 h-3.5 text-[#C48B28]" />
                        <span>Shop Hours</span>
                      </div>
                      <span className="font-mono font-bold text-[#422C09]">
                        {openingFormatted} – {closingFormatted}
                      </span>
                    </div>

                    <div className="space-y-2 pt-1">
                      {onUpdateShopStatus && (
                        <button
                          type="button"
                          disabled={statusUpdating}
                          onClick={async () => {
                            await handleQuickToggleShopStatus(isShopOpen ? 'CLOSED' : 'OPEN');
                            setShowOwnerStatusPopover(false);
                          }}
                          className={`w-full py-2.5 px-3 text-white text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50 ${
                            isShopOpen
                              ? 'bg-rose-600 hover:bg-rose-700'
                              : 'bg-emerald-600 hover:bg-emerald-700'
                          }`}
                        >
                          <StatusBlinkDot isOpen={!isShopOpen} size="sm" />
                          <span>{isShopOpen ? 'Close Shop (Disable Payments)' : 'Open Shop (Enable Payments)'}</span>
                        </button>
                      )}

                      {onOpenShopStatusControl && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowOwnerStatusPopover(false);
                            onOpenShopStatusControl();
                          }}
                          className="w-full py-2 px-3 bg-[#FFF5E1] hover:bg-[#FDF0D5] text-[#422C09] border border-[#C48B28]/40 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5 text-[#C48B28]" />
                          <span>Schedule &amp; Mode</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Notifications */}
              <button
                onClick={onOpenNotifications}
                className="relative p-1.5 sm:p-2 text-[#FFF5E1]/80 hover:text-[#FFF5E1] hover:bg-[#C48B28]/20 rounded-xl transition-colors cursor-pointer shrink-0"
                title="Notifications"
              >
                <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-[#C48B28] text-[#FFF5E1] text-[9px] sm:text-[10px] font-bold flex items-center justify-center animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Owner Profile Dropdown Trigger */}
              <div ref={ownerDropdownRef} className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setShowOwnerDropdown((prev) => !prev)}
                  className="flex items-center gap-1.5 p-1 sm:px-2.5 sm:py-1.5 rounded-xl bg-[#352206] hover:bg-[#4A3008] border border-[#C48B28]/40 text-xs font-bold text-[#FFF5E1] transition-all cursor-pointer shadow-xs"
                  title="Owner Menu"
                  aria-label="Owner Menu"
                  aria-expanded={showOwnerDropdown}
                >
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-tr from-[#C48B28] to-[#EBC176] text-[#422C09] flex items-center justify-center font-black text-xs shrink-0 shadow-xs border border-white/20">
                    {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'V'}
                  </div>
                  <div className="hidden sm:flex flex-col text-left leading-tight">
                    <span className="text-[11px] font-black text-[#EBC176] truncate max-w-[100px]">
                      {currentUser?.name || 'Vinay (Owner)'}
                    </span>
                    <span className="text-[9px] text-[#FFF5E1]/70 font-mono">
                      Shop Owner
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-[#C48B28] shrink-0" />
                </button>

                {showOwnerDropdown && (
                  <div className="absolute top-full right-0 mt-2 w-64 max-w-[calc(100vw-1.5rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 p-3.5 z-50 text-slate-800 animate-fadeIn">
                    <div className="pb-2.5 border-b border-slate-100">
                      <div className="font-extrabold text-sm text-slate-900 truncate">
                        {currentUser?.name || 'Owner'}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono truncate">
                        {currentUser?.email || 'vinay8046d@gmail.com'}
                      </div>
                    </div>

                    <div className="pt-2.5 space-y-1 text-xs">
                      {onOpenOwnerProfile && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowOwnerDropdown(false);
                            onOpenOwnerProfile();
                          }}
                          className="w-full text-left font-bold text-[#422C09] hover:bg-[#FFF5E1] px-3 py-2 rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                        >
                          <UserIcon className="w-4 h-4 text-[#C48B28]" />
                          <span>Owner Profile</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setShowOwnerDropdown(false);
                          onSelectShopkeeperTab('payments');
                        }}
                        className={`w-full text-left font-bold px-3 py-2 rounded-xl transition-colors flex items-center gap-2 cursor-pointer ${
                          shopkeeperTab === 'payments'
                            ? 'bg-[#C48B28]/15 text-[#422C09]'
                            : 'text-[#422C09] hover:bg-[#FFF5E1]'
                        }`}
                      >
                        <CreditCard className="w-4 h-4 text-[#C48B28]" />
                        <span>Payment Modes</span>
                      </button>

                      {onSwitchPortal && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowOwnerDropdown(false);
                            onSwitchPortal('customer');
                          }}
                          className="w-full text-left font-bold text-slate-700 hover:bg-slate-100 px-3 py-2 rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                        >
                          <Store className="w-4 h-4 text-[#C48B28]" />
                          <span>Student App</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setShowOwnerDropdown(false);
                          onLogout();
                        }}
                        className="w-full text-left font-bold text-rose-600 hover:bg-rose-50 px-3 py-2 rounded-xl transition-colors flex items-center gap-2 cursor-pointer mt-1 border-t border-slate-100 pt-2.5"
                      >
                        <LogOut className="w-4 h-4 text-rose-500" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Shopkeeper Fixed Mobile App Bottom Navigation Bar */}
        <nav
          aria-label="Shopkeeper Navigation"
          className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-[#422C09]/95 backdrop-blur-md border-t border-[#C48B28]/35 shadow-2xl px-1 py-1.5 flex items-center justify-between pb-safe"
        >
          <button
            onClick={() => onSelectShopkeeperTab('queue')}
            className={`flex flex-col items-center justify-center min-w-0 flex-1 py-1 gap-0.5 rounded-xl text-[10px] font-bold cursor-pointer transition-all ${
              shopkeeperTab === 'queue'
                ? 'text-[#C48B28] font-black'
                : 'text-[#FFF5E1]/70 hover:text-white'
            }`}
          >
            <div className={`p-1 rounded-lg ${shopkeeperTab === 'queue' ? 'bg-[#C48B28]/25 text-[#C48B28]' : ''}`}>
              <Printer className="w-4 h-4" />
            </div>
            <span className="truncate">Queue</span>
          </button>

          <button
            onClick={() => onSelectShopkeeperTab('kiosk')}
            className={`flex flex-col items-center justify-center min-w-0 flex-1 py-1 gap-0.5 rounded-xl text-[10px] font-bold cursor-pointer transition-all ${
              shopkeeperTab === 'kiosk'
                ? 'text-[#C48B28] font-black'
                : 'text-[#FFF5E1]/70 hover:text-white'
            }`}
          >
            <div className={`p-1 rounded-lg ${shopkeeperTab === 'kiosk' ? 'bg-[#C48B28]/25 text-[#C48B28]' : ''}`}>
              <PackageCheck className="w-4 h-4" />
            </div>
            <span className="truncate">Kiosk</span>
          </button>

          <button
            onClick={() => onSelectShopkeeperTab('analytics')}
            className={`flex flex-col items-center justify-center min-w-0 flex-1 py-1 gap-0.5 rounded-xl text-[10px] font-bold cursor-pointer transition-all ${
              shopkeeperTab === 'analytics'
                ? 'text-[#C48B28] font-black'
                : 'text-[#FFF5E1]/70 hover:text-white'
            }`}
          >
            <div className={`p-1 rounded-lg ${shopkeeperTab === 'analytics' ? 'bg-[#C48B28]/25 text-[#C48B28]' : ''}`}>
              <TrendingUp className="w-4 h-4" />
            </div>
            <span className="truncate">Analytics</span>
          </button>

          {onOpenOwnerProfile && (
            <button
              onClick={() => onOpenOwnerProfile()}
              className="flex flex-col items-center justify-center min-w-0 flex-1 py-1 gap-0.5 rounded-xl text-[10px] font-bold text-[#FFF5E1]/70 hover:text-white cursor-pointer transition-all"
            >
              <div className="p-1 rounded-lg">
                <UserIcon className="w-4 h-4" />
              </div>
              <span className="truncate">Profile</span>
            </button>
          )}
        </nav>
      </header>
    );
  }

  // ==========================================
  // 2. CUSTOMER / STUDENT NAVBAR
  // (Shopkeeper Desk, Cyber Shield, Analytics & PHP strictly HIDDEN)
  // ==========================================
  return (
    <header className="sticky top-0 z-40 bg-[#422C09] text-[#FFF5E1] border-b border-[#C48B28]/30 shadow-md">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-1.5 sm:gap-2">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={() => onSelectCustomerPage('upload')}
              className="flex items-center gap-2 sm:gap-2.5 text-left focus:outline-hidden group cursor-pointer"
            >
              <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-[#C48B28] to-[#EBC176] flex items-center justify-center text-[#422C09] shadow-md group-hover:scale-105 transition-transform duration-300 shrink-0">
                <Printer className="w-4 h-4 sm:w-6 sm:h-6 text-[#422C09]" />
              </div>
              <div>
                <span className="text-base sm:text-2xl font-black tracking-tight text-[#FFF5E1] flex items-center gap-0.5">
                  Print<span className="text-[#C48B28] underline decoration-[#C48B28]/40">Ease</span>
                </span>
                <span className="hidden sm:block text-[11px] font-semibold text-[#FFF5E1]/70 -mt-1 tracking-wide">
                  Your Documents. Our Priority.
                </span>
              </div>
            </button>
          </div>

          {/* Customer Navigation Links: Upload, Track, Wallet, My Orders */}
          <nav className="hidden md:flex items-center bg-[#352206] p-1 rounded-2xl border border-[#C48B28]/25 gap-1 shadow-2xs">
            <button
              onClick={() => onSelectCustomerPage('upload')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                customerPage === 'upload'
                  ? 'bg-[#C48B28] text-[#FFF5E1] shadow-sm'
                  : 'text-[#FFF5E1]/80 hover:text-white hover:bg-[#C48B28]/20'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Upload &amp; Print</span>
            </button>

            <button
              onClick={() => onSelectCustomerPage('track')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                customerPage === 'track'
                  ? 'bg-[#C48B28] text-[#FFF5E1] shadow-sm'
                  : 'text-[#FFF5E1]/80 hover:text-white hover:bg-[#C48B28]/20'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Track Order</span>
            </button>

            {/* Wallet tab in Customer Module (visible in Customer portal, absent in Profile dropdown & Owner Console) */}
            <button
              onClick={() => onSelectCustomerPage('wallet')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                customerPage === 'wallet'
                  ? 'bg-[#C48B28] text-[#FFF5E1] shadow-sm'
                  : 'text-[#FFF5E1]/80 hover:text-white hover:bg-[#C48B28]/20'
              }`}
            >
              <WalletIcon className="w-4 h-4" />
              <span>Wallet</span>
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-md font-mono text-[10px] font-black ${
                  customerPage === 'wallet'
                    ? 'bg-[#FFF5E1] text-[#422C09]'
                    : 'bg-[#C48B28] text-[#FFF5E1]'
                }`}
              >
                ₹{walletBalance.toFixed(0)}
              </span>
            </button>

            <button
              onClick={() => onSelectCustomerPage('orders')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                customerPage === 'orders' || customerPage === 'files'
                  ? 'bg-[#C48B28] text-[#FFF5E1] shadow-sm'
                  : 'text-[#FFF5E1]/80 hover:text-white hover:bg-[#C48B28]/20'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>My Orders</span>
            </button>
          </nav>

          {/* Action Links & Profile */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Interactive Shop Status Button -> Opens Shop Opening Timings */}
            <div ref={customerTimingsRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => setShowCustomerTimings((prev) => !prev)}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-wider border shadow-2xs cursor-pointer transition-all ${
                  isShopOpen
                    ? 'bg-emerald-950/75 hover:bg-emerald-900/80 text-emerald-300 border-emerald-500/50'
                    : 'bg-rose-950/75 hover:bg-rose-900/80 text-rose-300 border-rose-500/50 animate-pulse'
                }`}
                title="View Shop Opening Timings"
                aria-expanded={showCustomerTimings}
              >
                <StatusBlinkDot isOpen={isShopOpen} size="sm" />
                <span>{isShopOpen ? 'OPEN' : 'CLOSED'}</span>
                <ChevronDown className="w-3 h-3 opacity-80" />
              </button>

              {showCustomerTimings && (
                <div className="absolute top-full right-0 mt-2 w-64 sm:w-72 max-w-[calc(100vw-1.5rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-50 text-slate-800 animate-fadeIn space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#C48B28]" />
                      <span className="text-xs font-black uppercase tracking-wider text-[#422C09]">
                        Shop Opening Timings
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        isShopOpen
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {isShopOpen ? 'OPEN' : 'CLOSED'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#FFF5E1]/80 border border-[#C48B28]/30 space-y-1">
                    <div className="text-[11px] font-bold text-[#5A3C0B]/75 uppercase tracking-wider">
                      Daily Counter Hours (IST)
                    </div>
                    <div className="font-mono text-sm font-black text-[#422C09]">
                      {openingFormatted} – {closingFormatted}
                    </div>
                    <div className="text-[11px] font-semibold text-slate-600 pt-0.5">
                      {isShopOpen ? 'Accepting new print orders' : 'Orders paused until shop opens'}
                    </div>
                  </div>

                  {(currentUser?.role === 'admin' || currentUser?.role === 'staff') && onOpenShopStatusControl && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomerTimings(false);
                        onOpenShopStatusControl();
                      }}
                      className="w-full py-2 px-3 bg-[#422C09] hover:bg-[#5A3C0B] text-[#FFF5E1] text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      Manage Shop Hours
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Notification Bell */}
            <button
              onClick={onOpenNotifications}
              className="relative p-1.5 sm:p-2 text-[#FFF5E1]/80 hover:text-[#FFF5E1] hover:bg-[#C48B28]/20 rounded-xl transition-colors cursor-pointer shrink-0"
              title="Notifications"
            >
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-[#C48B28] text-[#FFF5E1] text-[9px] sm:text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Customer User Account */}
            {currentUser ? (
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                {/* Quick Switch to Owner Console if logged in as Admin/Staff */}
                {(currentUser.role === 'admin' || currentUser.role === 'staff') && onSwitchPortal && (
                  <button
                    type="button"
                    onClick={() => onSwitchPortal('shopkeeper')}
                    className="hidden md:flex px-2.5 sm:px-3 py-1.5 bg-[#C48B28] hover:bg-[#A9741D] text-[#FFF5E1] rounded-xl text-xs font-bold transition-all cursor-pointer items-center gap-1.5 shadow-xs"
                    title="Return to Owner Console"
                  >
                    <Store className="w-3.5 h-3.5" />
                    <span>Owner Console</span>
                  </button>
                )}

                {/* Profile Dropdown Trigger */}
                <div ref={dropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                    className="flex items-center gap-1 p-1 sm:px-2.5 sm:py-1.5 bg-[#352206] hover:bg-[#4E320A] border border-[#C48B28]/40 rounded-xl text-xs cursor-pointer transition-all shadow-xs shrink-0"
                    title="Account Profile"
                    aria-expanded={showUserDropdown}
                  >
                    <div className="w-7 h-7 rounded-lg bg-[#C48B28] text-[#FFF5E1] flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                      {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="hidden sm:block text-left leading-tight">
                      <div className="font-extrabold text-[#FFF5E1] text-xs truncate max-w-[100px]">
                        {currentUser.name}
                      </div>
                      <div className="text-[10px] text-[#C48B28] font-mono truncate max-w-[100px]">
                        {currentUser.role === 'admin' || currentUser.role === 'staff' ? 'Shop Owner' : currentUser.email}
                      </div>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-[#C48B28] shrink-0" />
                  </button>

                  {/* Authenticated User Profile Dropdown */}
                  {showUserDropdown && (
                    <div className="absolute top-full right-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-1.5rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-50 text-slate-800 animate-fadeIn">
                      {/* Current User Card */}
                      <div className="pb-3 border-b border-slate-100">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5A3C0B] to-[#7A5212] text-[#FFF5E1] flex items-center justify-center font-black text-base shadow-xs shrink-0">
                              {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div className="min-w-0">
                              <strong className="text-sm text-slate-900 block truncate font-extrabold leading-tight">
                                {currentUser.name}
                              </strong>
                              <span className="text-xs text-slate-500 font-mono block truncate mt-0.5">
                                {currentUser.email}
                              </span>
                            </div>
                          </div>
                          <Check className="w-4 h-4 text-[#C48B28] shrink-0 mt-1" />
                        </div>

                        <div className="mt-3">
                          <span className="px-2.5 py-1 rounded-md bg-[#FFF5E1] text-[#5A3C0B] border border-[#C48B28]/30 text-xs font-bold">
                            {currentUser.role === 'customer' ? 'Customer Account' : `${currentUser.role} Account`}
                          </span>
                        </div>
                      </div>

                      {/* Dropdown Footer Actions */}
                      <div className="pt-3 space-y-2 text-xs">
                        {(currentUser.role === 'admin' || currentUser.role === 'staff') && onSwitchPortal && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowUserDropdown(false);
                              onSwitchPortal('shopkeeper');
                            }}
                            className="w-full text-left text-[#C48B28] hover:text-[#5A3C0B] font-bold cursor-pointer flex items-center gap-1.5 py-1"
                          >
                            <Store className="w-3.5 h-3.5 text-[#C48B28]" />
                            <span>Switch to Owner Console</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setShowUserDropdown(false);
                            onOpenAuth();
                          }}
                          className="w-full text-left text-slate-600 font-bold hover:underline cursor-pointer flex items-center gap-1.5 py-1"
                        >
                          <span>+ Sign In Another Account</span>
                        </button>

                        {/* Customer Single Authoritative Logout in Profile Details */}
                        {onLogout && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowUserDropdown(false);
                              onLogout();
                            }}
                            className="w-full text-left text-rose-600 hover:text-rose-700 font-bold cursor-pointer flex items-center gap-1.5 py-2 pt-2.5 border-t border-slate-100 transition-colors"
                          >
                            <LogOut className="w-3.5 h-3.5 text-rose-500" />
                            <span>Logout from Account</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="btn-smooth btn-dual-shimmer px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-[#FFF5E1] text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <UserIcon className="w-3.5 h-3.5 text-[#FFF5E1]" />
                <span className="hidden xs:inline">Sign In</span>
                <span className="xs:hidden">Login</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Customer Fixed Mobile App Bottom Navigation Bar */}
      <nav
        aria-label="Customer Navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-[#422C09]/95 backdrop-blur-md border-t border-[#C48B28]/35 shadow-2xl px-1 py-1.5 flex items-center justify-between pb-safe"
      >
        <button
          onClick={() => onSelectCustomerPage('upload')}
          className={`flex flex-col items-center justify-center min-w-0 flex-1 py-1 gap-0.5 rounded-xl text-[10px] font-bold cursor-pointer transition-all ${
            customerPage === 'upload'
              ? 'text-[#C48B28] font-black'
              : 'text-[#FFF5E1]/70 hover:text-white'
          }`}
        >
          <div className={`p-1 rounded-lg ${customerPage === 'upload' ? 'bg-[#C48B28]/25 text-[#C48B28]' : ''}`}>
            <Upload className="w-4 h-4" />
          </div>
          <span>Upload</span>
        </button>

        <button
          onClick={() => onSelectCustomerPage('track')}
          className={`flex flex-col items-center justify-center min-w-0 flex-1 py-1 gap-0.5 rounded-xl text-[10px] font-bold cursor-pointer transition-all ${
            customerPage === 'track'
              ? 'text-[#C48B28] font-black'
              : 'text-[#FFF5E1]/70 hover:text-white'
          }`}
        >
          <div className={`p-1 rounded-lg ${customerPage === 'track' ? 'bg-[#C48B28]/25 text-[#C48B28]' : ''}`}>
            <Search className="w-4 h-4" />
          </div>
          <span>Track</span>
        </button>

        <button
          onClick={() => onSelectCustomerPage('wallet')}
          className={`flex flex-col items-center justify-center min-w-0 flex-1 py-1 gap-0.5 rounded-xl text-[10px] font-bold cursor-pointer transition-all relative ${
            customerPage === 'wallet'
              ? 'text-[#C48B28] font-black'
              : 'text-[#FFF5E1]/70 hover:text-white'
          }`}
        >
          <div className={`p-1 rounded-lg relative ${customerPage === 'wallet' ? 'bg-[#C48B28]/25 text-[#C48B28]' : ''}`}>
            <WalletIcon className="w-4 h-4" />
            {walletBalance > 0 && (
              <span className="absolute -top-1 -right-2 px-1 py-0.2 bg-[#C48B28] text-[#FFF5E1] font-mono text-[9px] font-black rounded-full">
                ₹{walletBalance.toFixed(0)}
              </span>
            )}
          </div>
          <span>Wallet</span>
        </button>

        <button
          onClick={() => onSelectCustomerPage('orders')}
          className={`flex flex-col items-center justify-center min-w-0 flex-1 py-1 gap-0.5 rounded-xl text-[10px] font-bold cursor-pointer transition-all ${
            customerPage === 'orders'
              ? 'text-[#C48B28] font-black'
              : 'text-[#FFF5E1]/70 hover:text-white'
          }`}
        >
          <div className={`p-1 rounded-lg ${customerPage === 'orders' ? 'bg-[#C48B28]/25 text-[#C48B28]' : ''}`}>
            <BookOpen className="w-4 h-4" />
          </div>
          <span>Orders</span>
        </button>

        {currentUser ? (
          <button
            onClick={() => setShowUserDropdown((prev) => !prev)}
            className={`flex flex-col items-center justify-center min-w-0 flex-1 py-1 gap-0.5 rounded-xl text-[10px] font-bold cursor-pointer transition-all ${
              showUserDropdown
                ? 'text-[#C48B28] font-black'
                : 'text-[#FFF5E1]/70 hover:text-white'
            }`}
            title="Account"
            aria-label="Account"
          >
            <div className={`p-1 rounded-lg ${showUserDropdown ? 'bg-[#C48B28]/25 text-[#C48B28]' : ''}`}>
              <UserIcon className="w-4 h-4" />
            </div>
            <span>Account</span>
          </button>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex flex-col items-center justify-center min-w-0 flex-1 py-1 gap-0.5 rounded-xl text-[10px] font-bold text-[#EBC176] hover:text-white cursor-pointer transition-all active:scale-95"
            title="Sign In"
            aria-label="Sign In"
          >
            <div className="p-1 rounded-lg text-[#EBC176] bg-[#C48B28]/25 border border-[#C48B28]/35">
              <UserIcon className="w-4 h-4 text-[#EBC176]" />
            </div>
            <span className="font-bold text-[#EBC176]">Login</span>
          </button>
        )}
      </nav>
    </header>
  );
};
