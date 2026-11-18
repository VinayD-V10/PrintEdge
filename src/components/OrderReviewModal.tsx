import React from 'react';
import {
  Lock,
  FileText,
  ArrowRight,
  ArrowLeft,
  X,
} from 'lucide-react';
import { Order, ShopStatusInfo } from '../types/printease';
import { StatusBlinkDot } from './StatusBlinkDot';

interface Props {
  order: Order;
  shopStatus?: ShopStatusInfo | null;
  onClose: () => void;
  onProceedToPayment: (order: Order) => void;
}

export const OrderReviewModal: React.FC<Props> = ({
  order,
  shopStatus,
  onClose,
  onProceedToPayment,
}) => {
  const { price_breakdown: b, options } = order;
  const isShopOpen = shopStatus ? shopStatus.status === 'OPEN' : true;

  const colorLabel =
    options.color_type === 'COLOR'
      ? 'Color Print'
      : options.color_type === 'MIXED'
      ? `Selective Color (${options.custom_color_pages ? `P${options.custom_color_pages}` : 'Mixed'})`
      : 'Black & White';

  const sideLabel = options.side_type === 'DOUBLE' ? 'Double-Sided' : 'Single-Sided';

  const bindingLabel =
    options.binding_type === 'SPIRAL'
      ? 'Spiral Binding'
      : options.binding_type === 'STAPLE'
      ? 'Glass Sheet Binding'
      : 'No Binding (Loose Sheets)';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-xl rounded-t-3xl sm:rounded-3xl shadow-2xl border border-[#C48B28]/30 overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[92vh] pb-safe sm:pb-0">
        {/* Brown & Golden Header with Lock Icon, Title & Top-Right Shop Status */}
        <div className="px-4 py-4 sm:px-6 sm:py-5 bg-gradient-to-r from-[#422C09] via-[#5A3C0B] to-[#422C09] text-[#FFF5E1] border-b border-[#C48B28]/35 shrink-0 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#C48B28]/25 text-[#EBC176] flex items-center justify-center border border-[#C48B28]/40 shrink-0">
                <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <span className="text-[11px] sm:text-xs font-extrabold text-[#EBC176] uppercase tracking-wider truncate">
                Campus Xerox
              </span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 max-w-[66%] sm:max-w-none">
              <div
                className={`inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[11px] font-bold border min-w-0 ${
                  isShopOpen
                    ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/50'
                    : 'bg-rose-500/25 text-rose-200 border-rose-400/50'
                }`}
              >
                <StatusBlinkDot isOpen={isShopOpen} size="sm" />
                <span className="truncate">
                  {isShopOpen ? 'Shop is Open – Payment Available' : 'Shop is Closed – Payment Unavailable'}
                </span>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="p-1 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          <h3 className="text-lg sm:text-xl font-extrabold tracking-tight text-[#FFF5E1] leading-tight">
            Order Summary &amp; Price Lock
          </h3>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto overflow-x-hidden space-y-5">
          {/* Clean Order Summary (7 Essential Fields) */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2.5 border-b border-slate-200 pb-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-[#C48B28] shrink-0" />
                <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                  {order.file_name}
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-[#C48B28]/15 text-[#422C09] text-xs font-bold shrink-0">
                {order.page_count} Pages
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <div className="bg-white px-3 py-2 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Copies</span>
                <span className="font-bold text-slate-800">{options.copies}</span>
              </div>
              <div className="bg-white px-3 py-2 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Paper Size</span>
                <span className="font-bold text-slate-800">{options.paper_size}</span>
              </div>
              <div className="bg-white px-3 py-2 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Colour Mode</span>
                <span className="font-bold text-slate-800">{colorLabel}</span>
              </div>
              <div className="bg-white px-3 py-2 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Sides</span>
                <span className="font-bold text-slate-800">{sideLabel}</span>
              </div>
              <div className="bg-white px-3 py-2 rounded-xl border border-slate-200 col-span-2 sm:col-span-2">
                <span className="text-[11px] text-slate-500 block">Binding</span>
                <span className="font-bold text-slate-800">{bindingLabel}</span>
              </div>
            </div>
          </div>

          {/* Itemized Price Breakdown */}
          <div className="space-y-2 text-sm text-slate-700">
            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="text-slate-600 text-xs sm:text-sm">
                {options.color_type === 'MIXED' ? (
                  <>Printing ({b.color_pages_count || 0} Color + {b.bw_pages_count || 0} B&amp;W × {b.copies} {b.copies === 1 ? 'copy' : 'copies'}):</>
                ) : (
                  <>Base Printing ({b.page_count} pgs × {b.copies} copy @ ₹{b.rate_per_page}/p):</>
                )}
              </span>
              <span className="font-semibold text-slate-900">₹{b.printing_cost.toFixed(2)}</span>
            </div>

            {b.binding_cost > 0 && (
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-600 text-xs sm:text-sm">Binding Service:</span>
                <span className="font-semibold text-slate-900">₹{b.binding_cost.toFixed(2)}</span>
              </div>
            )}

            {b.lamination_cost > 0 && (
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-600 text-xs sm:text-sm">Lamination:</span>
                <span className="font-semibold text-slate-900">₹{b.lamination_cost.toFixed(2)}</span>
              </div>
            )}

            {b.urgency_cost > 0 && (
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-600 text-xs sm:text-sm">Urgent Processing Fee:</span>
                <span className="font-semibold text-slate-900">₹{b.urgency_cost.toFixed(2)}</span>
              </div>
            )}

            {b.discount > 0 && (
              <div className="flex justify-between items-center py-1 border-b border-slate-100 text-emerald-600">
                <span className="text-xs sm:text-sm">Bulk Order Discount:</span>
                <span className="font-semibold">-₹{b.discount.toFixed(2)}</span>
              </div>
            )}

            {/* Final Amount to Pay */}
            <div className="flex justify-between items-baseline pt-3 border-t-2 border-slate-800">
              <span className="text-xs uppercase font-extrabold tracking-wider text-slate-600">
                Final Amount to Pay
              </span>
              <span className="text-2xl sm:text-3xl font-black text-slate-900">
                ₹{b.final_total}
              </span>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs sm:text-sm font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back / Edit Options</span>
          </button>

          {!isShopOpen ? (
            <button
              type="button"
              disabled
              className="px-5 py-3 bg-rose-600 text-white font-black text-xs sm:text-sm rounded-xl cursor-not-allowed flex items-center gap-2 opacity-90 shadow-sm"
            >
              <StatusBlinkDot isOpen={false} size="sm" />
              <span>Shop Closed</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onProceedToPayment(order)}
              className="btn-smooth btn-dual-shimmer px-5 sm:px-6 py-3 text-[#FFF5E1] font-extrabold text-xs sm:text-base rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>Proceed to Payment</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
