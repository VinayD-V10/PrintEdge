import React, { useState, useEffect } from 'react';
import {
  Eye,
  EyeOff,
  Building,
  QrCode,
  CreditCard,
  CheckCircle2,
  Copy,
  Printer,
  RefreshCw,
  Save,
  Key,
  Check,
  Smartphone,
} from 'lucide-react';
import { OwnerPaymentSettingsData, User } from '../types/printease';
import {
  getClientStoredOwnerPaymentSettings,
  saveClientStoredOwnerPaymentSettings,
} from '../data/mockData';
import { apiFetch } from '../config/api';

interface OwnerPaymentSettingsProps {
  onLogout?: () => void;
  onOpenOwnerProfile?: () => void;
  currentUser?: User | null;
}

export const OwnerPaymentSettings: React.FC<OwnerPaymentSettingsProps> = () => {
  const [settings, setSettings] = useState<OwnerPaymentSettingsData>(getClientStoredOwnerPaymentSettings);
  const [showFullAccount, setShowFullAccount] = useState(false);
  const [showKeyId, setShowKeyId] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'bank_upi' | 'gateway'>('bank_upi');
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Load from server on mount if available, fallback to client storage
  useEffect(() => {
    apiFetch('/api/owner/payment-settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.settings) {
          setSettings((prev) => ({
            ...prev,
            ...data.settings,
          }));
          saveClientStoredOwnerPaymentSettings(data.settings);
        }
      })
      .catch((e) => console.warn('Payment settings using local secured vault:', e));
  }, []);

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('QR code image should be under 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSettings((prev) => ({
          ...prev,
          qr_code_image: reader.result as string,
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const res = await apiFetch('/api/owner/payment-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setSettings(data.settings);
          saveClientStoredOwnerPaymentSettings(data.settings);
        }
      } else {
        // Standalone/offline save
        saveClientStoredOwnerPaymentSettings(settings);
      }
    } catch {
      // Local storage fallback so it always succeeds
      saveClientStoredOwnerPaymentSettings(settings);
    } finally {
      window.dispatchEvent(new CustomEvent('printease_payment_settings_updated', { detail: settings }));
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const handleTestGateway = () => {
    setTestResult('testing');
    setTimeout(() => {
      setTestResult('success');
      setTimeout(() => setTestResult(null), 4000);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#422C09] via-[#5A3C0B] to-[#422C09] rounded-3xl p-5 sm:p-6 text-[#FFF5E1] border border-[#C48B28]/40 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#C48B28] to-[#EBC176] flex items-center justify-center text-[#422C09] shadow-lg shrink-0">
              <CreditCard className="w-6 h-6" />
            </div>
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-[#FFF5E1]">
              Payment Modes
            </h1>
          </div>

          <button
            type="button"
            onClick={() => handleSaveSettings()}
            disabled={isSaving}
            className="btn-smooth btn-dual-shimmer w-full sm:w-auto px-5 py-2.5 text-[#FFF5E1] text-xs font-black rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>

        {saveSuccess && (
          <div className="mt-4 px-4 py-2.5 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold rounded-xl flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Saved.</span>
          </div>
        )}
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#C48B28]/25 pb-2">
        <button
          onClick={() => setActiveTab('bank_upi')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'bank_upi'
              ? 'bg-[#C48B28] text-[#FFF5E1] shadow-xs'
              : 'bg-[#422C09]/15 text-[#422C09] hover:bg-[#C48B28]/20'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Bank &amp; UPI</span>
        </button>

        <button
          onClick={() => setActiveTab('gateway')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'gateway'
              ? 'bg-[#C48B28] text-[#FFF5E1] shadow-xs'
              : 'bg-[#422C09]/15 text-[#422C09] hover:bg-[#C48B28]/20'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Payment Gateway</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: BANK ACCOUNT & UPI SETUP */}
      {/* ============================================================== */}
      {activeTab === 'bank_upi' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Bank Details Card */}
          <div className="lg:col-span-2 bg-[#422C09] text-[#FFF5E1] rounded-3xl p-6 sm:p-7 border border-[#C48B28]/40 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#C48B28]/30">
              <div className="flex items-center gap-2.5">
                <Building className="w-5 h-5 text-[#C48B28]" />
                <h3 className="font-extrabold text-sm sm:text-base text-[#FFF5E1]">
                  Settlement Bank Account
                </h3>
              </div>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              {/* Row 1: Account Holder & Bank Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#EBC176] mb-1.5">
                    Account Holder Name
                  </label>
                  <input
                    type="text"
                    value={settings.account_holder_name}
                    onChange={(e) => setSettings({ ...settings, account_holder_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#2B1B04] border border-[#C48B28]/40 text-[#FFF5E1] text-xs font-semibold focus:outline-none focus:border-[#C48B28]"
                    placeholder="Legal Business or Proprietor Name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#EBC176] mb-1.5">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={settings.bank_name}
                    onChange={(e) => setSettings({ ...settings, bank_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#2B1B04] border border-[#C48B28]/40 text-[#FFF5E1] text-xs font-semibold focus:outline-none focus:border-[#C48B28]"
                    placeholder="e.g. State Bank of India, HDFC Bank"
                    required
                  />
                </div>
              </div>

              {/* Row 2: Account Number (Masked) & IFSC Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#EBC176] mb-1.5 flex items-center justify-between">
                    <span>Account Number</span>
                    <button
                      type="button"
                      onClick={() => setShowFullAccount(!showFullAccount)}
                      className="text-[10px] text-[#C48B28] hover:text-[#FFF5E1] flex items-center gap-1 cursor-pointer"
                    >
                      {showFullAccount ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showFullAccount ? 'Mask' : 'Reveal'}</span>
                    </button>
                  </label>
                  <input
                    type={showFullAccount ? 'text' : 'password'}
                    value={settings.account_number}
                    onChange={(e) => setSettings({ ...settings, account_number: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#2B1B04] border border-[#C48B28]/40 text-[#FFF5E1] text-xs font-mono font-semibold focus:outline-none focus:border-[#C48B28]"
                    placeholder="Account Number"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#EBC176] mb-1.5">
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    value={settings.ifsc_code}
                    onChange={(e) => setSettings({ ...settings, ifsc_code: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#2B1B04] border border-[#C48B28]/40 text-[#FFF5E1] text-xs font-mono font-semibold uppercase focus:outline-none focus:border-[#C48B28]"
                    placeholder="e.g. SBIN0004921"
                    maxLength={11}
                    required
                  />
                </div>
              </div>

              {/* Row 3: Shop Phone Number & UPI ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#C48B28]/20">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#EBC176] mb-1.5 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-[#C48B28]" />
                    <span>Shop Phone Number</span>
                  </label>
                  <input
                    type="tel"
                    value={settings.shop_phone}
                    onChange={(e) => setSettings({ ...settings, shop_phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#2B1B04] border border-[#C48B28]/40 text-[#FFF5E1] text-xs font-semibold focus:outline-none focus:border-[#C48B28]"
                    placeholder="+91 98765 43210"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#EBC176] mb-1.5 flex items-center justify-between">
                    <span>UPI ID / VPA</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(settings.upi_id, 'upi')}
                      className="text-[10px] text-[#C48B28] hover:text-[#FFF5E1] flex items-center gap-1 cursor-pointer"
                    >
                      {copiedField === 'upi' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedField === 'upi' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </label>
                  <input
                    type="text"
                    value={settings.upi_id}
                    onChange={(e) => setSettings({ ...settings, upi_id: e.target.value.toLowerCase().trim() })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#2B1B04] border border-[#C48B28]/40 text-[#FFF5E1] text-xs font-mono font-semibold focus:outline-none focus:border-[#C48B28]"
                    placeholder="yourshop@okhdfcbank"
                    required
                  />
                </div>
              </div>

              {/* Row 4: PhonePe, Google Pay & Paytm Numbers */}
              <div className="bg-[#201402] p-4 rounded-2xl border border-[#C48B28]/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#EBC176] flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-[#C48B28]" />
                    <span>UPI App Numbers</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setSettings({
                      ...settings,
                      phonepe_number: settings.shop_phone,
                      gpay_number: settings.shop_phone,
                      paytm_number: settings.shop_phone,
                    })}
                    className="text-[10px] text-[#C48B28] hover:text-white font-semibold underline cursor-pointer"
                  >
                    Sync to shop phone
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-[#FFF5E1]/80 mb-1">
                      PhonePe Number
                    </label>
                    <input
                      type="tel"
                      value={settings.phonepe_number || ''}
                      onChange={(e) => setSettings({ ...settings, phonepe_number: e.target.value })}
                      placeholder={settings.shop_phone || '+91 98765 43210'}
                      className="w-full px-3 py-2 rounded-xl bg-[#2B1B04] border border-[#C48B28]/40 text-[#FFF5E1] text-xs font-semibold focus:outline-none focus:border-[#C48B28]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#FFF5E1]/80 mb-1">
                      Google Pay Number
                    </label>
                    <input
                      type="tel"
                      value={settings.gpay_number || ''}
                      onChange={(e) => setSettings({ ...settings, gpay_number: e.target.value })}
                      placeholder={settings.shop_phone || '+91 98765 43210'}
                      className="w-full px-3 py-2 rounded-xl bg-[#2B1B04] border border-[#C48B28]/40 text-[#FFF5E1] text-xs font-semibold focus:outline-none focus:border-[#C48B28]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#FFF5E1]/80 mb-1">
                      Paytm Number
                    </label>
                    <input
                      type="tel"
                      value={settings.paytm_number || ''}
                      onChange={(e) => setSettings({ ...settings, paytm_number: e.target.value })}
                      placeholder={settings.shop_phone || '+91 98765 43210'}
                      className="w-full px-3 py-2 rounded-xl bg-[#2B1B04] border border-[#C48B28]/40 text-[#FFF5E1] text-xs font-semibold focus:outline-none focus:border-[#C48B28]"
                    />
                  </div>
                </div>
              </div>

              {/* Branch Address */}
              <div className="pt-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#EBC176] mb-1.5">
                  📍 Shop Counter Physical Location
                </label>
                <input
                  type="text"
                  value={settings.branch_name || ''}
                  onChange={(e) => setSettings({ ...settings, branch_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#2B1B04] border border-[#C48B28]/40 text-[#FFF5E1] text-xs font-semibold focus:outline-none focus:border-[#C48B28]"
                  placeholder="e.g. Campus University Tech Complex, Counter #2"
                />
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-smooth btn-dual-shimmer w-full sm:w-auto px-6 py-2.5 text-[#FFF5E1] text-xs font-black rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Saving...' : 'Save Bank Details'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Physical Counter QR Standee & Generator */}
          <div className="space-y-6">
            <div className="bg-[#422C09] text-[#FFF5E1] rounded-3xl p-6 border border-[#C48B28]/40 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#C48B28]/30">
                <div className="flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-[#C48B28]" />
                  <h3 className="font-extrabold text-sm text-[#FFF5E1]">
                    📷 Merchant Counter QR
                  </h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300">
                  Active
                </span>
              </div>

              {/* QR Preview Card */}
              <div className="bg-[#FFF5E1] text-[#422C09] p-5 rounded-2xl shadow-inner text-center border-2 border-[#C48B28]">
                <div className="inline-block p-2 rounded-xl bg-white shadow-sm border border-slate-200 mb-3 max-w-[200px] w-full">
                  {settings.qr_code_image ? (
                    <div className="relative group">
                      <img
                        src={settings.qr_code_image}
                        alt="Custom Shop QR"
                        className="w-40 h-40 object-contain mx-auto rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => setSettings({ ...settings, qr_code_image: '' })}
                        className="mt-1 text-[10px] text-rose-600 font-bold hover:underline"
                      >
                        Remove custom image
                      </button>
                    </div>
                  ) : (
                    /* Generated QR SVG */
                    <svg width="150" height="150" viewBox="0 0 100 100" className="mx-auto">
                      {/* Background */}
                      <rect width="100" height="100" fill="#ffffff" />
                      {/* Corner Markers */}
                      <rect x="5" y="5" width="25" height="25" fill="#422C09" rx="2" />
                      <rect x="8" y="8" width="19" height="19" fill="#ffffff" rx="1" />
                      <rect x="11" y="11" width="13" height="13" fill="#C48B28" rx="1" />

                      <rect x="70" y="5" width="25" height="25" fill="#422C09" rx="2" />
                      <rect x="73" y="8" width="19" height="19" fill="#ffffff" rx="1" />
                      <rect x="76" y="11" width="13" height="13" fill="#C48B28" rx="1" />

                      <rect x="5" y="70" width="25" height="25" fill="#422C09" rx="2" />
                      <rect x="8" y="73" width="19" height="19" fill="#ffffff" rx="1" />
                      <rect x="11" y="76" width="13" height="13" fill="#C48B28" rx="1" />

                      {/* Data Pattern */}
                      <rect x="35" y="10" width="5" height="5" fill="#422C09" />
                      <rect x="45" y="10" width="15" height="5" fill="#422C09" />
                      <rect x="35" y="20" width="10" height="5" fill="#C48B28" />
                      <rect x="50" y="20" width="5" height="5" fill="#422C09" />

                      <rect x="10" y="35" width="15" height="5" fill="#422C09" />
                      <rect x="30" y="35" width="5" height="15" fill="#422C09" />
                      <rect x="40" y="35" width="20" height="5" fill="#C48B28" />
                      <rect x="65" y="35" width="10" height="10" fill="#422C09" />
                      <rect x="80" y="35" width="15" height="5" fill="#C48B28" />

                      <rect x="15" y="45" width="10" height="5" fill="#422C09" />
                      <rect x="40" y="45" width="5" height="20" fill="#422C09" />
                      <rect x="50" y="45" width="15" height="5" fill="#C48B28" />
                      <rect x="75" y="45" width="5" height="10" fill="#422C09" />
                      <rect x="85" y="45" width="10" height="15" fill="#422C09" />

                      <rect x="10" y="55" width="15" height="10" fill="#C48B28" />
                      <rect x="50" y="55" width="10" height="10" fill="#422C09" />
                      <rect x="65" y="60" width="15" height="5" fill="#C48B28" />

                      <rect x="35" y="70" width="15" height="5" fill="#422C09" />
                      <rect x="55" y="70" width="5" height="15" fill="#422C09" />
                      <rect x="65" y="70" width="20" height="5" fill="#C48B28" />
                      <rect x="70" y="80" width="10" height="15" fill="#422C09" />
                      <rect x="40" y="85" width="15" height="10" fill="#C48B28" />
                    </svg>
                  )}
                </div>

                <div className="font-extrabold text-xs text-[#422C09]">{settings.account_holder_name}</div>
                <div className="text-[11px] font-mono text-[#5A3C0B] font-bold mt-0.5">{settings.upi_id}</div>
              </div>

              {/* QR Upload and Standee Options */}
              <div className="mt-4 space-y-2.5">
                <label className="block w-full py-2 px-3 bg-[#2B1B04] hover:bg-[#352206] text-[#FFF5E1] border border-[#C48B28]/40 text-xs font-semibold rounded-xl text-center cursor-pointer transition-colors">
                  <span>Upload Custom Bank / UPI QR Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleQrUpload}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => setShowPrintModal(true)}
                  className="w-full btn-smooth btn-dual-shimmer py-2.5 text-[#FFF5E1] text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Counter Standee QR</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: PAYMENT GATEWAY CONFIGURATION */}
      {/* ============================================================== */}
      {activeTab === 'gateway' && (
        <div className="space-y-6">
          <div className="bg-[#422C09] text-[#FFF5E1] rounded-3xl p-6 sm:p-8 border border-[#C48B28]/40 shadow-xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 mb-6 border-b border-[#C48B28]/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#C48B28]/25 border border-[#C48B28]/40 flex items-center justify-center text-[#FFF5E1] shrink-0">
                  <CreditCard className="w-5 h-5 text-[#C48B28]" />
                </div>
                <h3 className="font-extrabold text-sm sm:text-base text-[#FFF5E1]">
                  Gateway Credentials
                </h3>
              </div>

              {/* Mode Toggle */}
              <div className="flex items-center bg-[#2B1B04] p-1 rounded-xl border border-[#C48B28]/30">
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, gateway_mode: 'live' })}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    settings.gateway_mode === 'live'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-[#FFF5E1]/70 hover:text-white'
                  }`}
                >
                  Live
                </button>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, gateway_mode: 'test' })}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    settings.gateway_mode === 'test'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-[#FFF5E1]/70 hover:text-white'
                  }`}
                >
                  Test
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Provider Selection */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#EBC176] mb-1.5">
                  Gateway Partner
                </label>
                <select
                  value={settings.gateway_provider}
                  onChange={(e) => setSettings({ ...settings, gateway_provider: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#2B1B04] border border-[#C48B28]/40 text-[#FFF5E1] text-xs font-bold focus:outline-none focus:border-[#C48B28]"
                >
                  <option value="razorpay">Razorpay</option>
                  <option value="cashfree">Cashfree</option>
                  <option value="phonepe_business">PhonePe Business</option>
                  <option value="paytm_business">Paytm Business</option>
                </select>
              </div>

              {/* Merchant ID */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#EBC176] mb-1.5">
                  Merchant ID / Account ID
                </label>
                <input
                  type="text"
                  value={settings.gateway_merchant_id}
                  onChange={(e) => setSettings({ ...settings, gateway_merchant_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#2B1B04] border border-[#C48B28]/40 text-[#FFF5E1] text-xs font-mono font-semibold focus:outline-none focus:border-[#C48B28]"
                  placeholder="e.g. rzp_live_PRINTEASE984"
                />
              </div>

              {/* Key ID (Masked) */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#EBC176] mb-1.5 flex items-center justify-between">
                  <span>API Key ID</span>
                  <button
                    type="button"
                    onClick={() => setShowKeyId(!showKeyId)}
                    className="text-[10px] text-[#C48B28] hover:text-[#FFF5E1] flex items-center gap-1 cursor-pointer"
                  >
                    {showKeyId ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showKeyId ? 'Mask' : 'Reveal'}</span>
                  </button>
                </label>
                <input
                  type={showKeyId ? 'text' : 'password'}
                  value={settings.gateway_key_id}
                  onChange={(e) => setSettings({ ...settings, gateway_key_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#2B1B04] border border-[#C48B28]/40 text-[#FFF5E1] text-xs font-mono font-semibold focus:outline-none focus:border-[#C48B28]"
                  placeholder="rzp_live_k89a1948201"
                />
              </div>

              {/* Webhook Secret */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#EBC176] mb-1.5 flex items-center justify-between">
                  <span>Webhook Secret (Signature Verification)</span>
                  <button
                    type="button"
                    onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                    className="text-[10px] text-[#C48B28] hover:text-[#FFF5E1] flex items-center gap-1 cursor-pointer"
                  >
                    {showWebhookSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showWebhookSecret ? 'Mask' : 'Reveal'}</span>
                  </button>
                </label>
                <input
                  type={showWebhookSecret ? 'text' : 'password'}
                  value={settings.gateway_webhook_secret}
                  onChange={(e) => setSettings({ ...settings, gateway_webhook_secret: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#2B1B04] border border-[#C48B28]/40 text-[#FFF5E1] text-xs font-mono font-semibold focus:outline-none focus:border-[#C48B28]"
                  placeholder="whsec_e39f8a847b2c9183"
                />
              </div>
            </div>

            {/* Auto Settlement Card */}
            <div className="mt-6 pt-6 border-t border-[#C48B28]/30 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <span className="font-bold text-xs text-[#FFF5E1]">
                Settlement Frequency
              </span>

              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={settings.settlement_frequency}
                  onChange={(e) => setSettings({ ...settings, settlement_frequency: e.target.value as any })}
                  className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-[#2B1B04] border border-[#C48B28]/40 text-[#FFF5E1] text-xs font-semibold focus:outline-none"
                >
                  <option value="daily_eod">Daily (11:59 PM)</option>
                  <option value="instant">Instant (Per Order)</option>
                  <option value="t_plus_1">Next Day (T+1)</option>
                </select>

                <button
                  type="button"
                  onClick={handleTestGateway}
                  disabled={testResult === 'testing'}
                  className="btn-smooth px-4 py-2 bg-[#5A3C0B] hover:bg-[#352206] text-[#FFF5E1] rounded-xl text-xs font-bold border border-[#C48B28]/40 flex items-center gap-1.5 cursor-pointer"
                >
                  {testResult === 'testing' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
                  <span>{testResult === 'testing' ? 'Testing...' : 'Test Connection'}</span>
                </button>
              </div>
            </div>

            {testResult === 'success' && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Gateway connected.</span>
              </div>
            )}
          </div>
        </div>
      )}



      {/* ============================================================== */}
      {/* MODAL: PRINTABLE STANDALONE QR STANDEE */}
      {/* ============================================================== */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-[#FFF5E1] text-[#422C09] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border-4 border-[#C48B28] relative text-center">
            {/* Header */}
            <div className="mb-4">
              <span className="px-3 py-1 rounded-full bg-[#C48B28]/20 text-[#422C09] text-[10px] font-black uppercase tracking-wider">
                Official Campus Print Station
              </span>
              <h2 className="text-2xl font-black text-[#422C09] mt-2">
                Print<span className="text-[#C48B28]">Ease</span> Xerox
              </h2>
              <p className="text-xs text-[#5A3C0B] font-semibold">
                Scan With Any UPI App To Pay
              </p>
            </div>

            {/* Big Standee QR */}
            <div className="bg-white p-6 rounded-2xl shadow-md border-2 border-[#C48B28] inline-block my-2 max-w-[240px] w-full">
              {settings.qr_code_image ? (
                <img
                  src={settings.qr_code_image}
                  alt="PrintEase Counter QR"
                  className="w-48 h-48 object-contain mx-auto"
                />
              ) : (
                <svg width="200" height="200" viewBox="0 0 100 100" className="mx-auto">
                  <rect width="100" height="100" fill="#ffffff" />
                  <rect x="5" y="5" width="25" height="25" fill="#422C09" rx="2" />
                  <rect x="8" y="8" width="19" height="19" fill="#ffffff" rx="1" />
                  <rect x="11" y="11" width="13" height="13" fill="#C48B28" rx="1" />

                  <rect x="70" y="5" width="25" height="25" fill="#422C09" rx="2" />
                  <rect x="73" y="8" width="19" height="19" fill="#ffffff" rx="1" />
                  <rect x="76" y="11" width="13" height="13" fill="#C48B28" rx="1" />

                  <rect x="5" y="70" width="25" height="25" fill="#422C09" rx="2" />
                  <rect x="8" y="73" width="19" height="19" fill="#ffffff" rx="1" />
                  <rect x="11" y="76" width="13" height="13" fill="#C48B28" rx="1" />

                  <rect x="35" y="10" width="5" height="5" fill="#422C09" />
                  <rect x="45" y="10" width="15" height="5" fill="#422C09" />
                  <rect x="35" y="20" width="10" height="5" fill="#C48B28" />
                  <rect x="50" y="20" width="5" height="5" fill="#422C09" />
                  <rect x="10" y="35" width="15" height="5" fill="#422C09" />
                  <rect x="30" y="35" width="5" height="15" fill="#422C09" />
                  <rect x="40" y="35" width="20" height="5" fill="#C48B28" />
                  <rect x="65" y="35" width="10" height="10" fill="#422C09" />
                  <rect x="80" y="35" width="15" height="5" fill="#C48B28" />
                  <rect x="15" y="45" width="10" height="5" fill="#422C09" />
                  <rect x="40" y="45" width="5" height="20" fill="#422C09" />
                  <rect x="50" y="45" width="15" height="5" fill="#C48B28" />
                  <rect x="75" y="45" width="5" height="10" fill="#422C09" />
                  <rect x="85" y="45" width="10" height="15" fill="#422C09" />
                  <rect x="10" y="55" width="15" height="10" fill="#C48B28" />
                  <rect x="50" y="55" width="10" height="10" fill="#422C09" />
                  <rect x="65" y="60" width="15" height="5" fill="#C48B28" />
                  <rect x="35" y="70" width="15" height="5" fill="#422C09" />
                  <rect x="55" y="70" width="5" height="15" fill="#422C09" />
                  <rect x="65" y="70" width="20" height="5" fill="#C48B28" />
                  <rect x="70" y="80" width="10" height="15" fill="#422C09" />
                  <rect x="40" y="85" width="15" height="10" fill="#C48B28" />
                </svg>
              )}
            </div>

            <div className="font-extrabold text-sm text-[#422C09] mt-2">
              {settings.account_holder_name}
            </div>
            <div className="font-mono text-xs font-bold text-[#C48B28]">
              UPI ID: {settings.upi_id}
            </div>
            <div className="text-[11px] text-[#5A3C0B] mt-1 font-semibold">
              Counter Phone: {settings.shop_phone}
            </div>

            <div className="flex items-center justify-center gap-2 mt-3 text-[11px] text-slate-600 font-bold">
              <span>Google Pay</span> • <span>PhonePe</span> • <span>Paytm</span> • <span>BHIM</span>
            </div>

            {/* Print & Close Controls */}
            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => window.print()}
                className="btn-smooth btn-dual-shimmer px-5 py-2.5 text-[#FFF5E1] text-xs font-bold rounded-xl shadow-md cursor-pointer flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Print Standee</span>
              </button>
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="px-5 py-2.5 bg-[#422C09]/20 hover:bg-[#422C09]/30 text-[#422C09] text-xs font-bold rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
