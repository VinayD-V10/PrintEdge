/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Navbar,
  PortalMode,
  CustomerPage,
  ShopkeeperTab,
} from './components/Navbar';
import { HeroHeader } from './components/HeroHeader';
import { UploadAndConfigure } from './components/UploadAndConfigure';
import { OrderReviewModal } from './components/OrderReviewModal';
import { PaymentModal } from './components/PaymentModal';
import { PaymentSuccessModal } from './components/PaymentSuccessModal';
import { ReceiptModal } from './components/ReceiptModal';
import { PickupAlertModal } from './components/PickupAlertModal';
import { OrderTrackingView } from './components/OrderTrackingView';
import { CustomerOrdersView } from './components/CustomerOrdersView';
import { MyWalletView } from './components/MyWalletView';
import { OwnerDashboard } from './components/OwnerDashboard';
import { PickupKioskView } from './components/PickupKioskView';
import { SecurityCommandCenter } from './components/SecurityCommandCenter';
import { AnalyticsDashboardView } from './components/AnalyticsDashboardView';
import { AuthModal } from './components/AuthModal';
import { ShopkeeperAccessModal } from './components/ShopkeeperAccessModal';
import { ShopStatusControlModal } from './components/ShopStatusControlModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import { AuthScreen, AuthMode } from './components/AuthScreen';
import { OwnerProfileModal } from './components/OwnerProfileModal';
import { OwnerPaymentSettings } from './components/OwnerPaymentSettings';
import {
  Order,
  PricingSettings,
  User,
  NotificationItem,
  ShopStatusInfo,
  Wallet,
  WalletTransaction,
} from './types/printease';
import {
  getClientStoredOrders,
  saveClientStoredOrders,
  getCustomerStoredOrders,
  saveCustomerStoredOrders,
  getClientStoredShopStatus,
  saveClientStoredShopStatus,
  getClientStoredWallet,
  saveClientStoredWallet,
  getClientStoredWalletTxs,
  saveClientStoredWalletTxs,
  getClientCurrentUser,
  saveClientCurrentUser,
  DEFAULT_PRICING,
  DEFAULT_WALLET,
} from './data/mockData';
import { playOrderAlertSound } from './utils/audio';
import {
  User as UserIcon,
  Printer,
  Phone,
  MapPin,
} from 'lucide-react';
import { apiFetch } from './config/api';

// Helper: Local storage for acknowledged pickup alerts so they NEVER repeat
const getStoredAcknowledgedPickups = (): Set<string> => {
  try {
    const raw = localStorage.getItem('printease_acknowledged_pickups');
    const list = raw ? JSON.parse(raw) : ['PE48291', 'PE48292', 'PE48293']; // Seed default sample orders as pre-acknowledged
    return new Set<string>(list);
  } catch {
    return new Set<string>(['PE48291', 'PE48292', 'PE48293']);
  }
};

const saveStoredAcknowledgedPickup = (orderId: string) => {
  try {
    const set = getStoredAcknowledgedPickups();
    set.add(orderId);
    localStorage.setItem('printease_acknowledged_pickups', JSON.stringify(Array.from(set)));
  } catch {}
};

// Helper: Local storage for orders created by THIS customer account on this browser
const getOrderOwnerKey = (user?: User | null): string => {
  if (!user) return '';
  return user.id || user.email?.toLowerCase() || '';
};

const getMyPlacedOrderIds = (ownerKey?: string): Set<string> => {
  if (!ownerKey) return new Set<string>();
  try {
    const raw = localStorage.getItem(`printease_my_order_ids_${ownerKey}`);
    return new Set<string>(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set<string>();
  }
};

const registerMyPlacedOrder = (orderId: string, ownerKey?: string) => {
  if (!ownerKey) return;
  try {
    const set = getMyPlacedOrderIds(ownerKey);
    set.add(orderId);
    localStorage.setItem(`printease_my_order_ids_${ownerKey}`, JSON.stringify(Array.from(set)));
  } catch {}
};

const filterOrdersForCustomer = (list: Order[], user: User | null): Order[] => {
  if (!user) return [];
  const ownerKey = getOrderOwnerKey(user);
  const myIds = getMyPlacedOrderIds(ownerKey);
  const userId = user.id;
  const userEmail = user.email?.toLowerCase();

  return list.filter((ord) => {
    if (userId && ord.user_id && ord.user_id === userId) return true;
    if (userEmail && ord.customer_email && ord.customer_email.toLowerCase() === userEmail) return true;
    if (!ord.user_id && !ord.customer_email && myIds.has(ord.order_id)) return true;
    return false;
  });
};

export default function App() {
  // Main Portal: 'customer' (Student) vs 'shopkeeper' (Owner)
  const [portal, setPortal] = useState<PortalMode>(() => {
    const saved = localStorage.getItem('printease_portal_mode');
    return saved === 'shopkeeper' ? 'shopkeeper' : 'customer';
  });

  // Customer sub-screens
  const [customerPage, setCustomerPage] = useState<CustomerPage>('upload');
  const [customerOrdersTab, setCustomerOrdersTab] = useState<'orders' | 'files'>('orders');
  const [navigationKey, setNavigationKey] = useState<number>(0);
  const [trackingOrderId, setTrackingOrderId] = useState<string>('');

  // Smooth universal transition & translation for ALL navigation buttons
  const handleSelectCustomerPage = (page: CustomerPage, subTab?: 'orders' | 'files') => {
    setNavigationKey((prev) => prev + 1);

    if (page === 'files') {
      setCustomerOrdersTab('files');
      setCustomerPage('orders');
      requestAnimationFrame(() => {
        setTimeout(() => {
          const el = document.getElementById('orders-section');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else {
            window.scrollTo({ top: 320, behavior: 'smooth' });
          }
        }, 60);
      });
      return;
    }

    if (page === 'orders') {
      setCustomerOrdersTab(subTab || 'orders');
    }

    setCustomerPage(page);

    requestAnimationFrame(() => {
      setTimeout(() => {
        const targetId = `${page}-section`;
        const el = document.getElementById(targetId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          window.scrollTo({ top: page === 'upload' ? 380 : 0, behavior: 'smooth' });
        }
      }, 60);
    });
  };

  // Shopkeeper sub-tabs
  const [shopkeeperTab, setShopkeeperTab] = useState<ShopkeeperTab>('queue');

  // Shop Open / Closed Status with client storage fallback
  const [shopStatus, setShopStatus] = useState<ShopStatusInfo>(getClientStoredShopStatus);

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const token = localStorage.getItem('printease_token');
    if (!token) return null;
    const stored = getClientCurrentUser();
    return stored || null;
  });

  // User Wallet & Transactions scoped per authenticated user (always starts at ₹0 until deposited)
  const [wallet, setWallet] = useState<Wallet>(() => {
    const token = localStorage.getItem('printease_token');
    const stored = token ? getClientCurrentUser() : null;
    return getClientStoredWallet(stored?.id);
  });
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>(() => {
    const token = localStorage.getItem('printease_token');
    const stored = token ? getClientCurrentUser() : null;
    return getClientStoredWalletTxs(stored?.id);
  });

  const [authInitialMode, setAuthInitialMode] = useState<AuthMode>('user-login');

  const [pricing, setPricing] = useState<PricingSettings>(DEFAULT_PRICING);
  const [orders, setOrders] = useState<Order[]>(() => {
    const token = localStorage.getItem('printease_token');
    const stored = token ? getClientCurrentUser() : null;
    if (portal === 'shopkeeper' && (stored?.role === 'admin' || stored?.role === 'staff')) {
      return getClientStoredOrders();
    }
    return stored ? getCustomerStoredOrders(getOrderOwnerKey(stored)) : [];
  });
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Modals
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null);
  const [successOrder, setSuccessOrder] = useState<Order | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [pickupAlertOrder, setPickupAlertOrder] = useState<Order | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showShopkeeperModal, setShowShopkeeperModal] = useState(false);
  const [showShopStatusModal, setShowShopStatusModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showOwnerProfileModal, setShowOwnerProfileModal] = useState(false);

  // Security Guard: Prevent normal customer accounts from ever viewing shopkeeper console
  useEffect(() => {
    if (currentUser && currentUser.role === 'customer' && portal === 'shopkeeper') {
      setPortal('customer');
      localStorage.setItem('printease_portal_mode', 'customer');
    }
  }, [currentUser, portal]);

  // 1. Fetch Shop Status
  const fetchShopStatus = async () => {
    try {
      const res = await apiFetch('/api/shop-status');
      if (res.ok) {
        const data = await res.json();
        if (data && data.status) {
          setShopStatus(data);
          saveClientStoredShopStatus(data);
        }
      }
    } catch (e) {
      console.warn('Shop status offline mode active:', e);
    }
  };

  // 2. Fetch Wallet (strictly per user; ₹0 until deposited)
  const fetchWallet = async () => {
    if (!currentUser?.id) {
      setWallet({ ...DEFAULT_WALLET, user_id: 'guest', balance: 0 });
      setWalletTransactions([]);
      return;
    }

    // Load per-user cached wallet immediately while fetching
    setWallet(getClientStoredWallet(currentUser.id));
    setWalletTransactions(getClientStoredWalletTxs(currentUser.id));

    try {
      const token = localStorage.getItem('printease_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await apiFetch(`/api/wallet?user_id=${encodeURIComponent(currentUser.id)}`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.wallet) {
          const txs = Array.isArray(data.transactions) ? data.transactions : [];
          const normalizedBalance = Number(data.wallet.balance) === 250 && txs.length === 0
            ? 0
            : Number(data.wallet.balance);
          const cleanWallet: Wallet = {
            ...data.wallet,
            user_id: currentUser.id,
            balance: normalizedBalance,
          };
          setWallet(cleanWallet);
          saveClientStoredWallet(cleanWallet, currentUser.id);
          setWalletTransactions(txs);
          saveClientStoredWalletTxs(txs, currentUser.id);
        }
      }
    } catch (e) {
      console.warn('Wallet offline mode active:', e);
    }
  };

  // Listen for shop status change events across tabs and components
  useEffect(() => {
    const handleStatusEvent = (e: any) => {
      if (e.detail && e.detail.status) {
        setShopStatus(e.detail);
      }
    };
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'printease_shop_status' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && parsed.status) {
            setShopStatus(parsed);
          }
        } catch {}
      }
    };
    window.addEventListener('printease_shop_status_changed', handleStatusEvent);
    window.addEventListener('storage', handleStorageEvent);
    return () => {
      window.removeEventListener('printease_shop_status_changed', handleStatusEvent);
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, []);

  // Sync wallet whenever authenticated user changes
  useEffect(() => {
    fetchWallet();
  }, [currentUser?.id, currentUser?.email]);

  // 3. Initial Load: Pricing, Current User, Shop Status & Wallet
  useEffect(() => {
    // Load pricing
    apiFetch('/api/pricing')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && d.pricing) setPricing(d.pricing);
      })
      .catch((e) => console.warn('Pricing fetch error:', e));

    fetchShopStatus();
    fetchWallet();

    const token = localStorage.getItem('printease_token');
    if (token) {
      const storedUser = getClientCurrentUser();
      if (storedUser) {
        setCurrentUser(storedUser);
      }
      apiFetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => {
          const contentType = r.headers.get('content-type') || '';
          if (r.ok && contentType.includes('application/json')) {
            return r.json();
          }
          return null;
        })
        .then((d) => {
          if (d?.user) {
            setCurrentUser(d.user);
            saveClientCurrentUser(d.user);
          }
        })
        .catch(() => {
          // Do not delete offline session on static hosts
        });
    } else {
      setCurrentUser(null);
    }
  }, []);

  // Save portal preference and sync role-appropriate user session
  const handleSwitchPortal = (newPortal: PortalMode) => {
    if (newPortal === 'shopkeeper' && currentUser?.role !== 'admin' && currentUser?.role !== 'staff') {
      setAuthInitialMode('user-login');
      setCurrentUser(null);
      return;
    }
    setPortal(newPortal);
    localStorage.setItem('printease_portal_mode', newPortal);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 4. Fetch Orders & Notifications with strict per-customer isolation
  const fetchOrdersAndNotifications = async () => {
    if (!currentUser) {
      setOrders([]);
      setNotifications([]);
      return;
    }

    try {
      const token = localStorage.getItem('printease_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // In shopkeeper portal, load all orders; in customer portal load ONLY this customer's orders
      const emailParam = currentUser.email || '';
      const isPrivileged = portal === 'shopkeeper' && (currentUser.role === 'admin' || currentUser.role === 'staff');
      const orderUrl = isPrivileged
        ? '/api/orders?role=owner'
        : `/api/orders?email=${encodeURIComponent(emailParam)}&user_id=${encodeURIComponent(currentUser.id)}`;

      const roleParam = portal === 'shopkeeper' ? 'owner' : 'customer';

      const [ordersRes, notifsRes] = await Promise.all([
        apiFetch(orderUrl, { headers }).catch(() => null),
        apiFetch(`/api/notifications?role=${roleParam}&email=${encodeURIComponent(emailParam)}`).catch(() => null),
      ]);

      if (ordersRes && ordersRes.ok) {
        const ordersData = await ordersRes.json();
        if (Array.isArray(ordersData.orders)) {
          if (isPrivileged) {
            setOrders(ordersData.orders);
            saveClientStoredOrders(ordersData.orders);
          } else {
            const customerOnlyOrders = filterOrdersForCustomer(ordersData.orders, currentUser);
            const ownerKey = getOrderOwnerKey(currentUser);
            setOrders(customerOnlyOrders);
            saveCustomerStoredOrders(customerOnlyOrders, ownerKey);

            // SMART NON-INTRUSIVE PICKUP ALERT:
            const acknowledged = getStoredAcknowledgedPickups();
            const myPlaced = getMyPlacedOrderIds(ownerKey);

            for (const ord of customerOnlyOrders) {
              if (
                ord.order_status === 'READY_FOR_PICKUP' &&
                myPlaced.has(ord.order_id) &&
                !acknowledged.has(ord.order_id)
              ) {
                setPickupAlertOrder(ord);
                saveStoredAcknowledgedPickup(ord.order_id);
                playOrderAlertSound();
                break;
              }
            }
          }
        }
      } else if (!isPrivileged) {
        setOrders(getCustomerStoredOrders(getOrderOwnerKey(currentUser)));
      }

      if (notifsRes && notifsRes.ok) {
        const notifsData = await notifsRes.json();
        if (notifsData.notifications) {
          setNotifications(notifsData.notifications);
        }
      }
    } catch (err) {
      console.warn('Poll error (offline mode active):', err);
    }
  };

  // Regular Polling: orders, notifications, shop status, wallet
  useEffect(() => {
    fetchOrdersAndNotifications();
    fetchShopStatus();

    const timer = setInterval(() => {
      fetchOrdersAndNotifications();
      fetchShopStatus();
    }, 10000);
    return () => clearInterval(timer);
  }, [portal, currentUser?.id, currentUser?.email]);

  // Auth handlers
  const handleAuthSuccess = (user: User, token: string, targetPortal?: PortalMode) => {
    localStorage.setItem('printease_token', token);
    saveClientCurrentUser(user);
    try {
      localStorage.setItem('printease_last_logged_in_user', JSON.stringify({
        name: user.name,
        identifier: user.email || user.phone || user.name,
        role: user.role,
      }));
    } catch {}
    setCurrentUser(user);

    const destPortal = targetPortal || ((user.role === 'admin' || user.role === 'staff') ? 'shopkeeper' : 'customer');
    setPortal(destPortal);
    localStorage.setItem('printease_portal_mode', destPortal);

    if (destPortal === 'shopkeeper') {
      setOrders(getClientStoredOrders());
    } else {
      setOrders(getCustomerStoredOrders(getOrderOwnerKey(user)));
    }
    setWallet(getClientStoredWallet(user.id));
    setWalletTransactions(getClientStoredWalletTxs(user.id));

    fetchOrdersAndNotifications();
    fetchWallet();
  };

  const handleLogout = async () => {
    const token = localStorage.getItem('printease_token');
    if (token) {
      try {
        await apiFetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {}
    }
    localStorage.removeItem('printease_token');
    localStorage.removeItem('printease_order_draft');
    saveClientCurrentUser(null);
    setCurrentUser(null);
    setOrders([]);
    setWallet({ ...DEFAULT_WALLET, user_id: 'guest', balance: 0 });
    setWalletTransactions([]);
    setNotifications([]);
    setAuthInitialMode('user-login');
    setPortal('customer');
    localStorage.setItem('printease_portal_mode', 'customer');
  };

  // Update Shop Status Handler
  const handleUpdateShopStatus = async (updated: Partial<ShopStatusInfo>) => {
    const isClosed = updated.status === 'CLOSED' || updated.mode === 'FORCE_CLOSED';
    const isOpen = updated.status === 'OPEN' || updated.mode === 'FORCE_OPEN';
    const nextStatus = isClosed ? 'CLOSED' : (isOpen ? 'OPEN' : (updated.status || shopStatus.status));
    const nextMode = updated.mode || (isClosed ? 'FORCE_CLOSED' : (isOpen ? 'FORCE_OPEN' : shopStatus.mode));
    const nextAccepting = updated.accepting_orders !== undefined 
      ? updated.accepting_orders 
      : nextStatus === 'OPEN';

    // 1. Optimistic instant local update
    const nextLocal: ShopStatusInfo = {
      ...shopStatus,
      ...updated,
      status: nextStatus,
      mode: nextMode,
      accepting_orders: nextAccepting,
      message: updated.message || (nextStatus === 'CLOSED'
        ? 'PrintEase is currently closed. Orders and payments are paused.'
        : 'Shop is currently OPEN. Ready for print orders!'),
      updated_at: new Date().toISOString(),
    };
    setShopStatus(nextLocal);
    saveClientStoredShopStatus(nextLocal);
    window.dispatchEvent(new CustomEvent('printease_shop_status_changed', { detail: nextLocal }));

    try {
      const token = localStorage.getItem('printease_token');
      const res = await apiFetch('/api/shop-status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ...updated,
          status: nextStatus,
          mode: nextMode,
          accepting_orders: nextAccepting,
          role: 'owner',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.shop_status) {
          setShopStatus(data.shop_status);
          saveClientStoredShopStatus(data.shop_status);
          window.dispatchEvent(new CustomEvent('printease_shop_status_changed', { detail: data.shop_status }));
          return;
        }
      }
    } catch (e) {
      console.warn('Backend shop status sync failed:', e);
    }
  };

  // Pricing update handler for owner
  const handleUpdatePricing = async (newPricing: Partial<PricingSettings>) => {
    try {
      const token = localStorage.getItem('printease_token');
      const res = await apiFetch('/api/pricing', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(newPricing),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.pricing) {
          setPricing(data.pricing);
          return;
        }
      }
    } catch {}

    setPricing((prev) => ({ ...prev, ...newPricing }));
  };

  // Mark notification read
  const handleMarkNotificationRead = async (id: string) => {
    try {
      await apiFetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch {}
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Professional Full-Page Authentication Gate when user is not logged in
  if (!currentUser) {
    return (
      <AuthScreen
        initialMode={authInitialMode}
        onAuthSuccess={handleAuthSuccess}
      />
    );
  }

  return (
    <div className="min-h-screen overflow-x-clip bg-[#FFF5E1] text-[#5A3C0B] flex flex-col antialiased selection:bg-[#5A3C0B] selection:text-[#FFF5E1]">
      {/* Dynamic Navbar: Strict separation between Customer & Shopkeeper */}
      <Navbar
        portal={portal}
        customerPage={customerPage}
        shopkeeperTab={shopkeeperTab}
        onSelectCustomerPage={(p) => handleSelectCustomerPage(p)}
        onSelectShopkeeperTab={(t) => {
          setShopkeeperTab(t);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenShopkeeperLogin={() => setShowShopkeeperModal(true)}
        onExitToCustomer={() => handleSwitchPortal('customer')}
        onSwitchPortal={handleSwitchPortal}
        currentUser={currentUser}
        onOpenAuth={() => setShowAuth(true)}
        onLogout={handleLogout}
        onOpenOwnerProfile={() => setShowOwnerProfileModal(true)}
        unreadCount={unreadCount}
        onOpenNotifications={() => setShowNotifications(true)}
        notifications={notifications}
        shopStatus={shopStatus}
        walletBalance={wallet ? Number(wallet.balance) : 0}
        onOpenShopStatusControl={() => setShowShopStatusModal(true)}
        onUpdateShopStatus={handleUpdateShopStatus}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-5 sm:pt-6 pb-24 sm:pb-12">
        {/* ============================================================== */}
        {/* 1. CUSTOMER PORTAL (Student Flow - Zero Admin Clutter)          */}
        {/* ============================================================== */}
        {portal === 'customer' && (
          <>
            {/* Brand Hero Header */}
            <HeroHeader
              shopStatus={shopStatus}
              onStartUpload={() => handleSelectCustomerPage('upload')}
            />

            {/* Page 1: Upload & Configure with Auto-Price Freeze */}
            {customerPage === 'upload' && (
              <div id="upload-section" key={`upload-${navigationKey}`} className="animate-section-slide transition-all">
                <UploadAndConfigure
                  pricing={pricing}
                  currentUser={currentUser}
                  shopStatus={shopStatus}
                  onOrderCreated={(lockedOrder) => {
                    registerMyPlacedOrder(lockedOrder.order_id, getOrderOwnerKey(currentUser));
                    setReviewOrder(lockedOrder);
                  }}
                  onOpenAuth={() => setShowAuth(true)}
                />
              </div>
            )}

            {/* Page 2: Track Order with Atomic Order ID */}
            {customerPage === 'track' && (
              <div id="track-section" key={`track-${navigationKey}`} className="animate-section-slide transition-all">
                <OrderTrackingView
                  initialOrderId={trackingOrderId}
                  orders={orders}
                  onViewReceipt={(ord) => setReceiptOrder(ord)}
                  onBackToHome={() => handleSelectCustomerPage('upload')}
                />
              </div>
            )}

            {/* Page 3: Digital Wallet (Customer Module) */}
            {customerPage === 'wallet' && (
              <div id="wallet-section" key={`wallet-${navigationKey}`} className="animate-wallet-slide animate-section-slide transition-all">
                <MyWalletView
                  wallet={wallet}
                  transactions={walletTransactions}
                  shopStatus={shopStatus}
                  onRefreshWallet={fetchWallet}
                  onStartPrintJob={() => handleSelectCustomerPage('upload')}
                />
              </div>
            )}

            {/* Page 4: My Orders History & Stored Documents (Unified Interface) */}
            {(customerPage === 'orders' || customerPage === 'files') && (
              <div id="orders-section" key={`orders-${navigationKey}`} className="animate-section-slide transition-all">
                <CustomerOrdersView
                  initialTab={customerOrdersTab}
                  orders={orders}
                  currentUser={currentUser}
                  onSelectOrder={(ordId) => {
                    setTrackingOrderId(ordId);
                    handleSelectCustomerPage('track');
                  }}
                  onViewReceipt={(ord) => setReceiptOrder(ord)}
                  onNewPrint={() => handleSelectCustomerPage('upload')}
                  onPrintExistingFile={(_fileName, _pageCount, _fileId) => handleSelectCustomerPage('upload')}
                  onRefreshOrders={fetchOrdersAndNotifications}
                />
              </div>
            )}
          </>
        )}

        {/* ============================================================== */}
        {/* 2. SHOPKEEPER & OWNER PORTAL (Student Studio is strictly REMOVED) */}
        {/* ============================================================== */}
        {portal === 'shopkeeper' && (
          <div className="space-y-6">
            {/* Tab 1: Live Print Queue, Shop Status Control & Order Handover */}
            {shopkeeperTab === 'queue' && (
              <OwnerDashboard
                orders={orders}
                pricing={pricing}
                onUpdatePricing={handleUpdatePricing}
                onRefreshOrders={fetchOrdersAndNotifications}
                onViewReceipt={(ord) => setReceiptOrder(ord)}
                shopStatus={shopStatus}
                onUpdateShopStatus={handleUpdateShopStatus}
                onLogout={handleLogout}
                currentUser={currentUser}
                onOpenOwnerProfile={() => setShowOwnerProfileModal(true)}
                onNavigateToPayments={() => setShopkeeperTab('payments')}
              />
            )}

            {/* Tab 2: Express Counter Pickup Kiosk */}
            {shopkeeperTab === 'kiosk' && (
              <PickupKioskView
                orders={orders}
                onRefreshOrders={fetchOrdersAndNotifications}
                onViewReceipt={(ord) => setReceiptOrder(ord)}
              />
            )}

            {/* Tab 3: Financial Analytics & Rate Manager */}
            {shopkeeperTab === 'analytics' && (
              <AnalyticsDashboardView
                orders={orders}
                pricing={pricing}
                onUpdatePricing={handleUpdatePricing}
                onViewReceipt={(ord) => setReceiptOrder(ord)}
              />
            )}

            {/* Tab 4: Payment Modes (Separate Page via Owner Dropdown) */}
            {shopkeeperTab === 'payments' && (
              <OwnerPaymentSettings
                currentUser={currentUser}
                onLogout={handleLogout}
              />
            )}

            {/* Tab 5: Cyber Defense Shield & Penetration Test */}
            {shopkeeperTab === 'security' && <SecurityCommandCenter />}
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-[#5A3C0B] text-[#FFF5E1]/80 py-10 border-t border-[#452D07] no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-[#734E11]/40 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#FFF5E1] text-[#5A3C0B] flex items-center justify-center font-bold shadow-md">
                <Printer className="w-5 h-5 text-[#5A3C0B]" />
              </div>
              <div>
                <span className="text-base font-black text-[#FFF5E1]">
                  Print<span className="text-[#FFF5E1]/90 underline decoration-[#FFF5E1]/40">Ease</span>
                </span>
                <p className="text-[11px] text-[#FFF5E1]/70">
                  "Your Documents. Our Priority." — Upload • Pay • Print • Done!
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-[#FFF5E1]/80">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#FFF5E1]" />
                Campus Tech Center Counter #2
              </span>
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#FFF5E1]" />
                +91 98765 43210
              </span>

              <button
                onClick={() => {
                  setCurrentUser(null);
                  setAuthInitialMode('user-login');
                }}
                className="text-[#FFF5E1] hover:underline font-semibold transition-colors cursor-pointer flex items-center gap-1"
                title="Campus Print Portal"
              >
                <UserIcon className="w-3.5 h-3.5 text-[#FFF5E1]" />
                <span>Student &amp; Customer Portal</span>
              </button>
            </div>
          </div>

          <div className="pt-6 flex items-center justify-center sm:justify-start text-[11px] text-[#FFF5E1]/70">
            <span>
              © {new Date().getFullYear()} PrintEase Document Management System.
            </span>
          </div>
        </div>
      </footer>

      {/* ============================================================== */}
      {/* MODALS & OVERLAYS                                              */}
      {/* ============================================================== */}

      {/* 1. Price Freeze & Order Review Modal */}
      {reviewOrder && (
        <OrderReviewModal
          order={reviewOrder}
          shopStatus={shopStatus}
          onClose={() => setReviewOrder(null)}
          onProceedToPayment={(lockedOrder) => {
            setReviewOrder(null);
            setPaymentOrder(lockedOrder);
          }}
        />
      )}

      {/* 2. Payment Modal (Online Gateway + PrintEase Wallet + Shop Closed Protection) */}
      {paymentOrder && (
        <PaymentModal
          order={paymentOrder}
          currentUser={currentUser}
          shopStatus={shopStatus}
          onClose={() => setPaymentOrder(null)}
          onOpenWalletTopup={() => {
            setPaymentOrder(null);
            handleSelectCustomerPage('wallet');
          }}
          onSuccess={(paidOrder) => {
            setPaymentOrder(null);
            const ownerKey = getOrderOwnerKey(currentUser);
            const scopedPaidOrder: Order = {
              ...paidOrder,
              user_id: paidOrder.user_id || currentUser?.id,
              customer_email: paidOrder.customer_email || currentUser?.email,
            };
            registerMyPlacedOrder(scopedPaidOrder.order_id, ownerKey);
            setSuccessOrder(scopedPaidOrder);

            // Instant upload cleanup: remove active draft and reset upload card
            try {
              localStorage.removeItem('printease_order_draft');
              window.dispatchEvent(new CustomEvent('printease_order_paid_cleanup'));
            } catch {}

            setOrders((prev) => {
              const updated = [
                scopedPaidOrder,
                ...prev.filter(
                  (o) =>
                    o.order_id !== scopedPaidOrder.order_id &&
                    o.order_id !== paymentOrder.order_id &&
                    o.id !== scopedPaidOrder.id
                ),
              ];
              if (portal === 'shopkeeper') {
                saveClientStoredOrders(updated);
              } else {
                saveCustomerStoredOrders(updated, ownerKey);
                // Also sync into global shopkeeper local cache for demo fallback
                const shopOrders = getClientStoredOrders();
                saveClientStoredOrders([
                  scopedPaidOrder,
                  ...shopOrders.filter(
                    (o) => o.order_id !== scopedPaidOrder.order_id && o.id !== scopedPaidOrder.id
                  ),
                ]);
              }
              return updated;
            });
            fetchOrdersAndNotifications();
            fetchWallet();
          }}
        />
      )}

      {/* 3. Payment Success Modal */}
      {successOrder && (
        <PaymentSuccessModal
          order={successOrder}
          onClose={() => setSuccessOrder(null)}
          onTrackOrder={(ordId: string) => {
            setSuccessOrder(null);
            setTrackingOrderId(ordId);
            handleSelectCustomerPage('track');
          }}
          onViewReceipt={() => {
            const ord = successOrder;
            setSuccessOrder(null);
            setReceiptOrder(ord);
          }}
        />
      )}

      {/* 4. Digital Receipt & Tax Invoice Modal */}
      {receiptOrder && (
        <ReceiptModal
          order={receiptOrder}
          onClose={() => setReceiptOrder(null)}
        />
      )}

      {/* 5. Pickup Alert Popup (Only for orders the customer actually placed!) */}
      {pickupAlertOrder && (
        <PickupAlertModal
          order={pickupAlertOrder}
          onClose={() => setPickupAlertOrder(null)}
          onPermanentlyDismiss={(ordId) => {
            saveStoredAcknowledgedPickup(ordId);
            setPickupAlertOrder(null);
          }}
          onViewOrder={(ordId: string) => {
            saveStoredAcknowledgedPickup(ordId);
            setPickupAlertOrder(null);
            setTrackingOrderId(ordId);
            setCustomerPage('track');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}

      {/* 6. Customer Sign In / Register Modal */}
      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onAuthSuccess={handleAuthSuccess}
        />
      )}

      {/* 7. Shopkeeper Dedicated Access Modal */}
      {showShopkeeperModal && (
        <ShopkeeperAccessModal
          onClose={() => setShowShopkeeperModal(false)}
          onQuickEnter={() => {
            setShowShopkeeperModal(false);
            handleSwitchPortal('shopkeeper');
          }}
          onSuccess={(user, token) => {
            setShowShopkeeperModal(false);
            handleAuthSuccess(user, token, 'shopkeeper');
          }}
        />
      )}

      {/* 8. Shop Status Control Modal for Owner */}
      {showShopStatusModal && shopStatus && (
        <ShopStatusControlModal
          currentStatus={shopStatus}
          onClose={() => setShowShopStatusModal(false)}
          onUpdateStatus={handleUpdateShopStatus}
        />
      )}


      {/* 10. Notification Center Drawer */}
      {showNotifications && (
        <NotificationDrawer
          notifications={notifications}
          onClose={() => setShowNotifications(false)}
          onMarkRead={handleMarkNotificationRead}
          onSelectOrder={(ordId) => {
            setShowNotifications(false);
            setTrackingOrderId(ordId);
            if (portal === 'customer') {
              setCustomerPage('track');
            } else {
              setShopkeeperTab('queue');
            }
          }}
        />
      )}

      {/* 11. Dedicated Owner Profile Modal */}
      {showOwnerProfileModal && (
        <OwnerProfileModal
          isOpen={showOwnerProfileModal}
          onClose={() => setShowOwnerProfileModal(false)}
          currentUser={currentUser}
          onLogout={handleLogout}
          onSwitchPortal={(p) => {
            setShowOwnerProfileModal(false);
            handleSwitchPortal(p);
          }}
        />
      )}
    </div>
  );
}
