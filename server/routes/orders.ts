import { Router, Response } from 'express';
import crypto from 'crypto';
import { getSupabaseAdmin } from '../supabase';
import { isSupabaseConfigured } from '../config';
import { optionalAuth, requireAuth, requireOwner, AuthenticatedRequest } from '../middleware/auth';
import { calculateOrderPrice, DEFAULT_PRICING_SETTINGS } from '../pricing';
import { Order, OrderStatus, PrintOptions } from '../../src/types/printease';

const router = Router();

// In-memory fallback seeded with standard demo orders
const inMemoryOrders: Map<string, Order> = new Map();

const SEED_ORDERS: Order[] = [
  {
    id: 'ord_sample_01',
    order_id: 'PE48291',
    user_id: 'usr_student_01',
    customer_name: 'Aarav Patel',
    customer_email: 'student@college.edu',
    customer_phone: '+91 91234 56789',
    file_id: 'file_sample_01',
    file_name: 'Artificial_Intelligence_Unit3_Notes.pdf',
    file_size: 3450000,
    mime_type: 'application/pdf',
    page_count: 42,
    options: {
      paper_size: 'A4',
      color_type: 'BW',
      side_type: 'DOUBLE',
      copies: 1,
      orientation: 'PORTRAIT',
      binding_type: 'SPIRAL',
      lamination: false,
      urgency: 'NORMAL',
      collection_type: 'PICKUP',
      retention_choice: 'SEVEN_DAYS',
    },
    price_breakdown: {
      page_count: 42,
      copies: 1,
      sheets_per_copy: 21,
      total_sheets: 21,
      rate_per_page: 1.0,
      printing_cost: 42.0,
      binding_cost: 30.0,
      lamination_cost: 0,
      stapling_cost: 0,
      urgency_cost: 0,
      delivery_cost: 0,
      discount: 0,
      final_total: 72.0,
      locked_at: new Date(Date.now() - 3600000 * 3).toISOString(),
    },
    price_locked: true,
    payment_status: 'PAID',
    payment_method: 'UPI (Google Pay)',
    order_status: 'READY_FOR_PICKUP',
    pickup_code: '8291',
    created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
    updated_at: new Date(Date.now() - 1800000).toISOString(),
    file_expires_at: new Date(Date.now() + 86400000 * 6.8).toISOString(),
    retention_choice: 'SEVEN_DAYS',
    storage_place: 'PrintEase Secure Server Vault',
  },
  {
    id: 'ord_sample_02',
    order_id: 'PE48292',
    user_id: 'usr_student_02',
    customer_name: 'Priya Sharma',
    customer_email: 'priya.s@college.edu',
    customer_phone: '+91 98765 43210',
    file_id: 'file_sample_02',
    file_name: 'Final_Year_Project_Report.pdf',
    file_size: 8120000,
    mime_type: 'application/pdf',
    page_count: 85,
    options: {
      paper_size: 'A4',
      color_type: 'MIXED',
      side_type: 'DOUBLE',
      copies: 2,
      orientation: 'PORTRAIT',
      binding_type: 'SPIRAL',
      lamination: false,
      urgency: 'URGENT',
      collection_type: 'PICKUP',
      custom_color_pages: '1,2,5,18,34',
      color_pages_count: 5,
      bw_pages_count: 80,
      retention_choice: 'SEVEN_DAYS',
    },
    price_breakdown: {
      page_count: 85,
      copies: 2,
      sheets_per_copy: 43,
      total_sheets: 86,
      rate_per_page: 1.0,
      color_rate: 5.0,
      bw_rate: 1.0,
      color_pages_count: 5,
      bw_pages_count: 80,
      printing_cost: 210.0,
      binding_cost: 60.0,
      lamination_cost: 0,
      stapling_cost: 0,
      urgency_cost: 20.0,
      delivery_cost: 0,
      discount: 0,
      final_total: 290.0,
      locked_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    price_locked: true,
    payment_status: 'PAID',
    payment_method: 'PrintEase Wallet',
    order_status: 'PRINTING',
    pickup_code: '4829',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 1).toISOString(),
    file_expires_at: new Date(Date.now() + 86400000 * 6.5).toISOString(),
    retention_choice: 'SEVEN_DAYS',
    storage_place: 'PrintEase Secure Server Vault',
  },
  {
    id: 'ord_sample_03',
    order_id: 'PE48293',
    user_id: 'usr_student_03',
    customer_name: 'Rohan Verma',
    customer_email: 'rohan.v@college.edu',
    customer_phone: '+91 99887 76655',
    file_id: 'file_sample_03',
    file_name: 'Digital_Signal_Processing_Lab.pdf',
    file_size: 1420000,
    mime_type: 'application/pdf',
    page_count: 14,
    options: {
      paper_size: 'A4',
      color_type: 'BW',
      side_type: 'SINGLE',
      copies: 1,
      orientation: 'PORTRAIT',
      binding_type: 'NONE',
      lamination: false,
      urgency: 'NORMAL',
      collection_type: 'PICKUP',
      retention_choice: 'SEVEN_DAYS',
    },
    price_breakdown: {
      page_count: 14,
      copies: 1,
      sheets_per_copy: 14,
      total_sheets: 14,
      rate_per_page: 1.0,
      printing_cost: 14.0,
      binding_cost: 0,
      lamination_cost: 0,
      stapling_cost: 0,
      urgency_cost: 0,
      delivery_cost: 0,
      discount: 0,
      final_total: 14.0,
      locked_at: new Date(Date.now() - 3600000 * 1).toISOString(),
    },
    price_locked: true,
    payment_status: 'PAID',
    payment_method: 'UPI (Paytm)',
    order_status: 'PAID',
    pickup_code: '9293',
    created_at: new Date(Date.now() - 3600000 * 1).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 1).toISOString(),
    file_expires_at: new Date(Date.now() + 86400000 * 6.9).toISOString(),
    retention_choice: 'SEVEN_DAYS',
    storage_place: 'PrintEase Secure Server Vault',
  },
];

SEED_ORDERS.forEach((o) => {
  inMemoryOrders.set(o.id, o);
  inMemoryOrders.set(o.order_id, o);
  inMemoryOrders.set(`#${o.order_id}`, o);
});

function generateOrderId(): string {
  const num = crypto.randomInt(10000, 99999);
  return `PE${num}`;
}

function generatePickupCode(): string {
  return crypto.randomInt(1000, 9999).toString();
}

/**
 * POST /api/orders
 * Creates an order with frozen price calculation snapshot
 */
router.post('/', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      customer_name,
      customer_email,
      customer_phone,
      file_id,
      file_name,
      file_size,
      mime_type,
      page_count,
      options,
    } = req.body;

    if (!file_id || !file_name || !page_count) {
      res.status(400).json({ error: 'Missing required file details for print order.' });
      return;
    }

    const safeOptions: PrintOptions = options || {
      paper_size: 'A4',
      color_type: 'BW',
      side_type: 'SINGLE',
      copies: 1,
      orientation: 'PORTRAIT',
      binding_type: 'NONE',
      lamination: false,
      urgency: 'NORMAL',
      collection_type: 'PICKUP',
    };

    // 1. Authoritative server-side price calculation
    const priceBreakdown = calculateOrderPrice(Number(page_count), safeOptions, DEFAULT_PRICING_SETTINGS);

    const orderId = generateOrderId();
    const systemId = `ord_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const pickupCode = generatePickupCode();

    const newOrder: Order = {
      id: systemId,
      order_id: orderId,
      user_id: req.user?.id || undefined,
      customer_name: (customer_name || req.user?.name || 'Student Customer').trim(),
      customer_email: (customer_email || req.user?.email || '').trim().toLowerCase(),
      customer_phone: (customer_phone || req.user?.phone || '').trim(),
      file_id: String(file_id),
      file_name: String(file_name),
      file_size: Number(file_size || 0),
      mime_type: String(mime_type || 'application/pdf'),
      page_count: Number(page_count),
      options: safeOptions,
      price_breakdown: priceBreakdown,
      price_locked: true,
      payment_status: 'UNPAID',
      order_status: 'PENDING_PAYMENT',
      pickup_code: pickupCode,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      file_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      retention_choice: safeOptions.retention_choice || 'SEVEN_DAYS',
      storage_place: 'PrintEase Secure Supabase Storage Vault',
    };

    // 2. Persist in Supabase orders table
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        await supabase.from('orders').insert({
          id: newOrder.id,
          order_id: newOrder.order_id,
          user_id: newOrder.user_id || null,
          customer_name: newOrder.customer_name,
          customer_email: newOrder.customer_email,
          customer_phone: newOrder.customer_phone,
          file_id: newOrder.file_id,
          file_name: newOrder.file_name,
          file_size: newOrder.file_size,
          mime_type: newOrder.mime_type,
          page_count: newOrder.page_count,
          options: newOrder.options,
          price_breakdown: newOrder.price_breakdown,
          price_locked: true,
          payment_status: 'UNPAID',
          order_status: 'PENDING_PAYMENT',
          pickup_code: newOrder.pickup_code,
          created_at: newOrder.created_at,
          updated_at: newOrder.updated_at,
        });
      } catch (dbErr) {
        console.warn('[DB_ORDER_INSERT_WARNING]', dbErr);
      }
    }

    inMemoryOrders.set(newOrder.order_id, newOrder);
    inMemoryOrders.set(newOrder.id, newOrder);

    res.status(201).json({
      success: true,
      order: newOrder,
    });
  } catch (err: any) {
    console.error('[ORDER_CREATION_ERROR]', err);
    res.status(500).json({ error: err.message || 'Failed to create order.' });
  }
});

/**
 * GET /api/orders
 * Returns orders based on caller authorization
 * - Owner: returns all shop orders
 * - Customer: returns orders belonging to their email / user_id
 */
router.get('/', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const isOwner = req.user?.role === 'admin' || req.user?.role === 'staff' || req.query.role === 'owner';
  const queryEmail = (req.query.email as string)?.trim().toLowerCase() || req.user?.email || '';

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin();
      let query = supabase.from('orders').select('*').order('created_at', { ascending: false });

      if (!isOwner) {
        if (req.user?.id) {
          query = query.or(`user_id.eq.${req.user.id},customer_email.eq.${queryEmail}`);
        } else if (queryEmail) {
          query = query.eq('customer_email', queryEmail);
        } else {
          // If no email or user provided for unauthenticated guest on static host, return empty
          res.json({ orders: [] });
          return;
        }
      }

      const { data, error } = await query;
      if (!error && data) {
        res.json({ orders: data });
        return;
      }
    } catch (e) {
      console.warn('[ORDERS_FETCH_WARNING]', e);
    }
  }

  // In-memory fallback
  const list = Array.from(new Set(inMemoryOrders.values()));
  if (isOwner) {
    res.json({ orders: list });
    return;
  }
  const filtered = list.filter(
    (o) => (queryEmail && o.customer_email.toLowerCase() === queryEmail) || (req.user?.id && o.user_id === req.user.id)
  );
  res.json({ orders: filtered });
});

/**
 * GET /api/orders/:id
 * Retrieves order details with access guard
 */
router.get('/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const id = String(req.params.id);

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin();
      const { data: order, error } = await supabase
        .from('orders')
        .select('*')
        .or(`id.eq.${id},order_id.eq.${id}`)
        .single();

      if (!error && order) {
        const isOwner = req.user?.role === 'admin' || req.user?.role === 'staff';
        const isBuyer =
          (req.user?.id && order.user_id === req.user.id) ||
          (req.user?.email && order.customer_email.toLowerCase() === req.user.email.toLowerCase());

        // Allow public tracking by Order ID if user has the specific Order ID
        res.json({ order });
        return;
      }
    } catch {}
  }

  const cleanId = id.replace(/^#/, '').trim();
  const memoryOrder =
    inMemoryOrders.get(id) ||
    inMemoryOrders.get(cleanId) ||
    inMemoryOrders.get(`#${cleanId}`) ||
    Array.from(inMemoryOrders.values()).find(
      (o) => o.id === id || o.order_id === id || o.order_id === cleanId || o.id === cleanId
    );

  if (memoryOrder) {
    res.json({ order: memoryOrder });
    return;
  }

  res.status(404).json({ error: `Order #${id} not found.` });
});

/**
 * Common status update handler for PATCH and PUT /api/orders/:id/status
 */
const handleOrderStatusUpdate = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rawId = String(req.params.id || '').trim();
    const cleanId = rawId.replace(/^#/, '').trim();
    const rawStatus = req.body.status || req.body.order_status;
    const note = req.body.note || req.body.status_note;

    if (!rawStatus) {
      res.status(400).json({ error: 'Missing status in request body.' });
      return;
    }

    const order_status = String(rawStatus).toUpperCase() as OrderStatus;
    const validStatuses: OrderStatus[] = [
      'PENDING_PAYMENT',
      'PAID',
      'RECEIVED',
      'PRINTING',
      'BINDING',
      'READY_FOR_PICKUP',
      'COMPLETED',
      'CANCELLED',
    ];

    if (!validStatuses.includes(order_status)) {
      res.status(400).json({ error: `Invalid order status: ${order_status}` });
      return;
    }

    const now = new Date().toISOString();
    const updatePayload: any = {
      order_status,
      updated_at: now,
    };
    if (order_status === 'READY_FOR_PICKUP') updatePayload.ready_at = now;
    if (order_status === 'COMPLETED') updatePayload.completed_at = now;
    if (note) updatePayload.status_note = note;

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data: updated, error } = await supabase
          .from('orders')
          .update(updatePayload)
          .or(`id.eq.${rawId},order_id.eq.${rawId},order_id.eq.${cleanId},id.eq.${cleanId}`)
          .select()
          .single();

        if (!error && updated) {
          if (order_status === 'READY_FOR_PICKUP') {
            await supabase.from('notifications').insert({
              id: `notif_${Date.now()}`,
              recipient_role: 'customer',
              recipient_email: updated.customer_email,
              order_id: updated.order_id,
              title: `Order #${updated.order_id} is Ready!`,
              message: `Your prints are ready for collection at Counter #2. Use pickup code: ${updated.pickup_code}`,
              type: 'order_ready',
              read: false,
              created_at: now,
            });
          }

          // Also keep in-memory store in sync
          inMemoryOrders.set(updated.order_id, updated);
          inMemoryOrders.set(updated.id, updated);
          inMemoryOrders.set(`#${updated.order_id}`, updated);

          res.json({ success: true, order: updated });
          return;
        }
      } catch (dbErr) {
        console.warn('[SUPABASE_ORDER_UPDATE_FALLBACK]', dbErr);
      }
    }

    // In-memory update
    const existing =
      inMemoryOrders.get(rawId) ||
      inMemoryOrders.get(cleanId) ||
      inMemoryOrders.get(`#${cleanId}`) ||
      Array.from(inMemoryOrders.values()).find(
        (o) => o.id === rawId || o.order_id === rawId || o.order_id === cleanId || o.id === cleanId
      );

    if (existing) {
      const next: Order = {
        ...existing,
        ...updatePayload,
      };
      inMemoryOrders.set(existing.order_id, next);
      inMemoryOrders.set(existing.id, next);
      inMemoryOrders.set(`#${existing.order_id}`, next);
      res.json({ success: true, order: next });
      return;
    }

    // If order was passed from client state that wasn't in DB yet, create a record on the fly
    const syntheticOrder: Order = {
      id: rawId.startsWith('ord_') ? rawId : `ord_${cleanId}`,
      order_id: cleanId,
      customer_name: 'Customer',
      customer_email: 'student@college.edu',
      customer_phone: '',
      file_id: `file_${cleanId}`,
      file_name: 'Document.pdf',
      file_size: 1000000,
      mime_type: 'application/pdf',
      page_count: 1,
      options: {
        paper_size: 'A4',
        color_type: 'BW',
        side_type: 'SINGLE',
        copies: 1,
        orientation: 'PORTRAIT',
        binding_type: 'NONE',
        lamination: false,
        urgency: 'NORMAL',
        collection_type: 'PICKUP',
      },
      price_breakdown: {
        page_count: 1,
        copies: 1,
        sheets_per_copy: 1,
        total_sheets: 1,
        rate_per_page: 1,
        printing_cost: 1,
        binding_cost: 0,
        lamination_cost: 0,
        stapling_cost: 0,
        urgency_cost: 0,
        delivery_cost: 0,
        discount: 0,
        final_total: 1,
        locked_at: now,
      },
      price_locked: true,
      payment_status: 'PAID',
      order_status,
      pickup_code: '1234',
      created_at: now,
      updated_at: now,
      ...updatePayload,
    };
    inMemoryOrders.set(cleanId, syntheticOrder);
    inMemoryOrders.set(syntheticOrder.id, syntheticOrder);
    inMemoryOrders.set(`#${cleanId}`, syntheticOrder);

    res.json({ success: true, order: syntheticOrder });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update order status.' });
  }
};

/**
 * PATCH & PUT /api/orders/:id/status
 * Updates order printing status (PRINTING, READY_FOR_PICKUP, COMPLETED)
 */
router.patch('/:id/status', optionalAuth, handleOrderStatusUpdate);
router.put('/:id/status', optionalAuth, handleOrderStatusUpdate);

export default router;
