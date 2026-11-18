import { Router, Request, Response } from 'express';
import { getSupabaseAdmin } from '../supabase';
import { config, isSupabaseConfigured } from '../config';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth';
import { ShopStatusInfo, ShopMode } from '../../src/types/printease';

const router = Router();

export const DEFAULT_SHOP_STATUS: ShopStatusInfo = {
  status: 'OPEN',
  mode: 'AUTO',
  opening_time: '09:00',
  closing_time: '20:00',
  message: 'Shop is currently OPEN. Ready for print orders!',
  accepting_orders: true,
  updated_at: new Date().toISOString(),
  updated_by: 'system',
};

// In-memory fallback if database table not yet seeded
let inMemoryShopStatus: ShopStatusInfo = { ...DEFAULT_SHOP_STATUS };

/**
 * Computes shop status dynamically for AUTO mode and enforces strict flags
 */
function evaluateCurrentShopStatus(shop: ShopStatusInfo): ShopStatusInfo {
  // If explicitly closed or force closed, always enforce CLOSED
  if (shop.mode === 'FORCE_CLOSED' || shop.status === 'CLOSED') {
    return {
      ...shop,
      status: 'CLOSED',
      accepting_orders: false,
      message: shop.message || 'PrintEase is currently closed. Orders and payments are paused.',
    };
  }

  // If force open, always enforce OPEN
  if (shop.mode === 'FORCE_OPEN') {
    return {
      ...shop,
      status: 'OPEN',
      accepting_orders: true,
      message: shop.message || 'Shop is currently OPEN. Ready for print orders!',
    };
  }

  // AUTO mode: check Indian Standard Time (IST) against opening and closing hours
  const now = new Date();
  const istString = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false });
  const [currH, currM] = istString.split(':').map(Number);
  const currentMinutes = (currH || 0) * 60 + (currM || 0);

  const [openH, openM] = (shop.opening_time || '09:00').split(':').map(Number);
  const openMinutes = (openH || 0) * 60 + (openM || 0);

  const [closeH, closeM] = (shop.closing_time || '20:00').split(':').map(Number);
  const closeMinutes = (closeH || 0) * 60 + (closeM || 0);

  const isOpenByTime = currentMinutes >= openMinutes && currentMinutes < closeMinutes;

  return {
    ...shop,
    status: isOpenByTime ? 'OPEN' : 'CLOSED',
    accepting_orders: isOpenByTime,
    message: isOpenByTime
      ? 'Shop is currently OPEN. Ready for print orders!'
      : 'PrintEase is currently closed. Orders will resume during shop hours.',
  };
}

/**
 * GET /api/shop-status
 * Public endpoint: reads current status of the print shop
 */
router.get('/', async (_req: Request, res: Response) => {
  let current: ShopStatusInfo = inMemoryShopStatus;

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from('shop_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        current = {
          status: data.status,
          mode: data.mode,
          opening_time: data.opening_time,
          closing_time: data.closing_time,
          message: data.message,
          accepting_orders: data.accepting_orders,
          updated_at: data.updated_at,
          updated_by: data.updated_by,
        };
      }
    } catch (e) {
      console.warn('[SHOP_STATUS_FETCH_WARNING]', e);
    }
  }

  res.json(evaluateCurrentShopStatus(current));
});

/**
 * PUT /api/shop-status
 * Owner endpoint: updates shop hours, open/closed mode, and banners
 */
router.put('/', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const update = req.body || {};

    // Allow authorization via verified owner role, owner email, or shopkeeper portal header/body
    const isOwner =
      req.user?.role === 'admin' ||
      req.user?.role === 'staff' ||
      req.user?.email === config.ownerEmail ||
      req.user?.email === 'vinay8046d@gmail.com' ||
      update.role === 'owner' ||
      req.headers['x-portal-mode'] === 'shopkeeper';

    if (!isOwner) {
      res.status(403).json({ error: 'Owner or Administrator privileges required to change shop status.' });
      return;
    }

    const isClosed = update.status === 'CLOSED' || update.mode === 'FORCE_CLOSED';
    const isOpen = update.status === 'OPEN' || update.mode === 'FORCE_OPEN';

    const finalStatus: 'OPEN' | 'CLOSED' = isClosed
      ? 'CLOSED'
      : (isOpen ? 'OPEN' : (update.status || inMemoryShopStatus.status || 'OPEN'));
    const finalMode: ShopMode = update.mode || (isClosed ? 'FORCE_CLOSED' : (isOpen ? 'FORCE_OPEN' : inMemoryShopStatus.mode || 'AUTO'));
    const finalAccepting = isClosed
      ? false
      : (isOpen ? true : (update.accepting_orders !== undefined ? Boolean(update.accepting_orders) : (finalStatus === 'OPEN')));
    const finalMessage = update.message || (finalStatus === 'CLOSED'
      ? 'PrintEase is currently closed. Orders and payments are paused.'
      : 'Shop is currently OPEN. Ready for print orders!');

    const nextStatus: ShopStatusInfo = {
      ...inMemoryShopStatus,
      ...update,
      status: finalStatus,
      mode: finalMode,
      accepting_orders: finalAccepting,
      message: finalMessage,
      updated_at: new Date().toISOString(),
      updated_by: req.user?.email || 'owner',
    };

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { error } = await supabase
          .from('shop_settings')
          .upsert(
            {
              id: 'default_shop',
              status: nextStatus.status,
              mode: nextStatus.mode,
              opening_time: nextStatus.opening_time,
              closing_time: nextStatus.closing_time,
              message: nextStatus.message,
              accepting_orders: nextStatus.accepting_orders,
              updated_at: nextStatus.updated_at,
              updated_by: nextStatus.updated_by,
            },
            { onConflict: 'id' }
          );

        if (error) {
          console.warn('[SUPABASE_SHOP_SETTINGS_UPSERT_WARN]', error);
        }
      } catch (dbErr) {
        console.warn('[SUPABASE_SHOP_SETTINGS_ERROR]', dbErr);
      }
    }

    inMemoryShopStatus = nextStatus;
    res.json({ success: true, shop_status: inMemoryShopStatus });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update shop status.' });
  }
});

export default router;
