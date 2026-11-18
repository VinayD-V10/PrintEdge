import React from 'react';
import {
  FileText,
  Download,
  Plus,
  ArrowRight,
  FolderLock,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { Order, User } from '../types/printease';

interface Props {
  orders: Order[];
  currentUser?: User | null;
  onSelectOrder: (orderId: string) => void;
  onViewReceipt: (order: Order) => void;
  onNewPrint: () => void;
  onRefreshOrders?: () => void;
  onPrintExistingFile?: (fileName: string, pageCount: number, fileId: string) => void;
  initialTab?: 'orders' | 'files';
}

export const CustomerOrdersView: React.FC<Props> = ({
  orders,
  onSelectOrder,
  onViewReceipt,
  onNewPrint,
}) => {
  const handleRepeatPrint = (order: Order) => {
    try {
      const draft = {
        options: order.options,
        customerName: order.customer_name,
        customerEmail: order.customer_email,
        customerPhone: order.customer_phone,
        uploadedFileData: order.file_deleted
          ? null
          : {
              file_id: order.file_id,
              original_name: order.file_name,
              mime_type: order.mime_type,
              file_size: order.file_size,
              page_count: order.page_count,
            },
      };
      localStorage.setItem('printease_order_draft', JSON.stringify(draft));
      if (order.file_deleted) {
        alert(
          `Print settings from #${order.order_id} restored. Please re-upload your file.`
        );
      }
    } catch (e) {
      console.warn('Could not store repeat draft:', e);
    }
    onNewPrint();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5 mb-12">
      {/* Header Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <FileText className="w-5 h-5 text-[#C48B28] shrink-0" />
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight truncate">
            My Orders
          </h2>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-black bg-[#C48B28]/15 text-[#422C09]">
            {orders.length}
          </span>
        </div>

        <button
          onClick={onNewPrint}
          className="btn-smooth btn-dual-shimmer px-4 py-2 text-[#FFF5E1] text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5 text-[#FFF5E1]" />
          <span>Upload Document</span>
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="bg-[#FFF5E1]/90 rounded-3xl border border-[#C48B28]/30 p-8 sm:p-12 text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-[#C48B28]/15 text-[#C48B28] flex items-center justify-center mx-auto mb-3">
            <FileText className="w-7 h-7" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-[#422C09] mb-4">No Orders Found</h3>
          <button
            onClick={onNewPrint}
            className="btn-smooth btn-dual-shimmer px-6 py-3 text-[#FFF5E1] font-bold text-sm rounded-xl transition-colors cursor-pointer"
          >
            Upload Document
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {orders.map((order) => {
            const isReady = order.order_status === 'READY_FOR_PICKUP';
            const isCompleted = order.order_status === 'COMPLETED';

            return (
              <div
                key={order.id}
                className={`bg-white rounded-2xl border p-5 sm:p-6 transition-all hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isReady
                    ? 'border-emerald-400 bg-emerald-50/20 ring-2 ring-emerald-400/20'
                    : 'border-[#C48B28]/30'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-base font-black text-[#C48B28]">
                      #{order.order_id}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider ${
                        isCompleted
                          ? 'bg-slate-100 text-slate-700'
                          : isReady
                          ? 'bg-emerald-500 text-white animate-pulse'
                          : order.order_status === 'PRINTING'
                          ? 'bg-[#C48B28] text-[#FFF5E1]'
                          : 'bg-[#C48B28]/20 text-[#422C09]'
                      }`}
                    >
                      {String(order.order_status || '').replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-slate-400">
                      • {new Date(order.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>

                    {/* Storage preference badge */}
                    {order.retention_choice === 'PERMANENT' ? (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200 flex items-center gap-1">
                        <FolderLock className="w-3 h-3 text-emerald-600" />
                        <span>Permanently Stored</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 text-[10px] font-bold border border-rose-200 flex items-center gap-1">
                        <Trash2 className="w-3 h-3 text-rose-600" />
                        <span>Delete After Printing</span>
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900 truncate max-w-full sm:max-w-md">
                      {order.file_name}
                    </div>

                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>{order.page_count} Pages</span>
                      <span>• {order.options.copies} Copies</span>
                      <span>• {order.options.paper_size} {order.options.color_type === 'MIXED' ? `Color P${order.options.custom_color_pages || 'Mixed'}` : order.options.color_type}</span>
                      <span>• {order.options.binding_type === 'STAPLE' ? 'Glass Sheet Binding' : order.options.binding_type === 'SPIRAL' ? 'Spiral Binding' : 'No Binding'}</span>
                      <span className="font-bold text-slate-800">
                        Total: ₹{order.price_breakdown.final_total} ({order.payment_status} ✓)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 shrink-0">
                  <button
                    onClick={() => handleRepeatPrint(order)}
                    className="p-2.5 sm:px-3 text-xs font-bold text-[#422C09] hover:text-[#C48B28] bg-white hover:bg-[#FFF5E1] border border-[#C48B28]/40 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    title="Repeat print"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-[#C48B28]" />
                    <span>Repeat</span>
                  </button>

                  <button
                    onClick={() => onViewReceipt(order)}
                    className="p-2.5 sm:px-3 text-xs font-bold text-[#422C09] hover:text-[#C48B28] bg-[#FFF5E1] hover:bg-[#FDF6E8] border border-[#C48B28]/40 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="View Receipt"
                  >
                    <Download className="w-4 h-4 text-[#C48B28]" />
                    <span>Receipt</span>
                  </button>

                  <button
                    onClick={() => onSelectOrder(order.order_id)}
                    className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                      isReady
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-[#C48B28] hover:bg-[#A9741D] text-[#FFF5E1]'
                    }`}
                  >
                    <span>Track</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
