import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { supabase } from "../config/supabase";
import { logger } from "../lib/logger";
import { logActivity } from "../services/activityLog";
import { sendAnnouncementEmail } from "../services/email";
import { AuthRequest } from "../middleware/auth";

// ─── Stats ──────────────────────────────────────────────────────────────────

export async function getStats(_req: Request, res: Response): Promise<void> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [stallRes, paymentRes, regRes] = await Promise.all([
      supabase.from("stalls").select("status"),
      supabase.from("payments").select("status, amount"),
      supabase.from("users").select("id").eq("role", "vendor").gte("created_at", today.toISOString()),
    ]);

    // activity_log may not exist yet — gracefully return empty
    let activityRes: { data: unknown[] | null } = { data: null };
    try {
      const r = await supabase
        .from("activity_log")
        .select("id, action, admin_name, admin_role, entity_type, created_at")
        .order("created_at", { ascending: false })
        .limit(15);
      activityRes = { data: r.error ? null : (r.data ?? null) };
    } catch {
      /* table not yet created */
    }

    const stalls = (stallRes.data ?? []) as Array<{ status: string }>;
    const payments = (paymentRes.data ?? []) as Array<{ status: string; amount: number | null }>;

    const revenue = payments.filter((p) => p.status === "successful").reduce((s, p) => s + (p.amount ?? 0), 0);
    const pendingPayments = payments.filter((p) => p.status === "pending").length;

    res.json({
      stalls: {
        total: stalls.length,
        available: stalls.filter((s) => s.status === "available").length,
        held: stalls.filter((s) => s.status === "held").length,
        reserved: stalls.filter((s) => s.status === "reserved").length,
        blocked: stalls.filter((s) => s.status === "blocked").length,
      },
      revenue,
      pendingPayments,
      newRegistrationsToday: regRes.data?.length ?? 0,
      recentActivity: activityRes.data ?? [],
    });
  } catch (err) {
    logger.error({ err }, "Admin getStats error");
    res.status(500).json({ error: "Failed to fetch stats" });
  }
}

// ─── Reservations ───────────────────────────────────────────────────────────

export async function getAllReservations(req: Request, res: Response): Promise<void> {
  try {
    const { status, search } = req.query;

    let query = supabase
      .from("reservations")
      .select(`
        id, status, reservation_code, created_at,
        users ( id, name, email, phone ),
        stalls ( stall_number, package, price, exhibitions ( name, venue ) ),
        payments ( status, amount, transaction_reference )
      `)
      .order("created_at", { ascending: false });

    if (status) query = (query as any).eq("status", status);

    const { data, error } = await query;
    if (error) {
      logger.error({ err: error }, "Failed to fetch reservations");
      res.status(500).json({ error: "Failed to fetch reservations" });
      return;
    }

    let results = data ?? [];
    if (search) {
      const q = (search as string).toLowerCase();
      results = results.filter((r: any) =>
        r.users?.name?.toLowerCase().includes(q) ||
        r.users?.email?.toLowerCase().includes(q) ||
        r.reservation_code?.toLowerCase().includes(q)
      );
    }

    res.json({ reservations: results });
  } catch (err) {
    logger.error({ err }, "Admin getAllReservations error");
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function cancelReservation(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const { data: reservation, error: fetchErr } = await supabase
      .from("reservations")
      .select("id, stall_id, status, reservation_code, users(name, email)")
      .eq("id", id)
      .single();

    if (fetchErr || !reservation) {
      res.status(404).json({ error: "Reservation not found" });
      return;
    }

    await supabase.from("reservations").update({ status: "cancelled" }).eq("id", id);

    if (!["expired", "cancelled"].includes(reservation.status)) {
      await supabase.from("stalls").update({ status: "available" }).eq("id", reservation.stall_id);
    }

    void logActivity({
      adminId: req.user!.id,
      adminName: req.user!.name || req.user!.email,
      adminRole: req.user!.role,
      action: "RESERVATION_CANCELLED",
      entityType: "reservation",
      entityId: String(id),
      details: { code: reservation.reservation_code, vendor: (reservation as any).users?.name },
    });

    res.json({ message: "Reservation cancelled" });
  } catch (err) {
    logger.error({ err }, "Admin cancelReservation error");
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function checkInVendor(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const { data: reservation, error } = await supabase
      .from("reservations")
      .select("id, status, reservation_code, users(name, email), stalls(stall_number)")
      .eq("id", id)
      .single();

    if (error || !reservation) {
      res.status(404).json({ error: "Reservation not found" });
      return;
    }
    if (reservation.status !== "confirmed") {
      res.status(400).json({ error: "Only confirmed reservations can be checked in" });
      return;
    }

    const checked_in_at = new Date().toISOString();
    // checked_in_at column may not exist yet — update will be a no-op if column missing
    await supabase.from("reservations").update({ checked_in_at } as any).eq("id", id);

    void logActivity({
      adminId: req.user!.id,
      adminName: req.user!.name || req.user!.email,
      adminRole: req.user!.role,
      action: "VENDOR_CHECKED_IN",
      entityType: "reservation",
      entityId: String(id),
      details: {
        vendor: (reservation as any).users?.name,
        stall: (reservation as any).stalls?.stall_number,
      },
    });

    res.json({ message: "Vendor checked in", checked_in_at });
  } catch (err) {
    logger.error({ err }, "Admin checkInVendor error");
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── Stalls ─────────────────────────────────────────────────────────────────

export async function updateStall(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { status } = req.body;
  const allowed = ["available", "blocked", "reserved", "held"];

  if (!allowed.includes(status)) {
    res.status(400).json({ error: `Invalid status. Allowed: ${allowed.join(", ")}` });
    return;
  }

  try {
    const { data, error } = await supabase
      .from("stalls")
      .update({ status })
      .eq("id", id)
      .select("id, stall_number, status")
      .single();

    if (error) {
      res.status(500).json({ error: "Failed to update stall" });
      return;
    }

    void logActivity({
      adminId: req.user!.id,
      adminName: req.user!.name || req.user!.email,
      adminRole: req.user!.role,
      action: "STALL_STATUS_CHANGED",
      entityType: "stall",
      entityId: String(id),
      details: { stallNumber: data.stall_number, newStatus: status },
    });

    res.json({ stall: data });
  } catch (err) {
    logger.error({ err }, "Admin updateStall error");
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── Vendors ────────────────────────────────────────────────────────────────

export async function getVendors(req: Request, res: Response): Promise<void> {
  try {
    const { search } = req.query;

    let query = supabase
      .from("users")
      .select(`
        id, name, email, phone, created_at,
        reservations ( id, status, reservation_code, stalls ( stall_number, package ) )
      `)
      .eq("role", "vendor")
      .order("created_at", { ascending: false });

    if (search) {
      query = (query as any).or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) {
      res.status(500).json({ error: "Failed to fetch vendors" });
      return;
    }
    res.json({ vendors: data ?? [] });
  } catch (err) {
    logger.error({ err }, "Admin getVendors error");
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── Payments ───────────────────────────────────────────────────────────────

export async function getPaymentsSummary(_req: Request, res: Response): Promise<void> {
  try {
    const { data: payments, error } = await supabase
      .from("payments")
      .select(`
        id, amount, status,
        reservations ( id, stalls ( exhibition_id, exhibitions ( id, name, venue ) ) )
      `);

    if (error) {
      res.status(500).json({ error: "Failed to fetch payment summary" });
      return;
    }

    type ExhibitionBucket = {
      id: string; name: string; venue: string;
      successful: { count: number; total: number };
      pending: { count: number; total: number };
      failed: { count: number; total: number };
    };

    const byExhibition = new Map<string, ExhibitionBucket>();
    let overallRevenue = 0;
    let overallPending = 0;
    let overallFailed = 0;

    for (const p of (payments ?? [])) {
      const exh = (p as any).reservations?.stalls?.exhibitions;
      if (!exh) continue;
      if (!byExhibition.has(exh.id)) {
        byExhibition.set(exh.id, {
          id: exh.id, name: exh.name, venue: exh.venue,
          successful: { count: 0, total: 0 },
          pending: { count: 0, total: 0 },
          failed: { count: 0, total: 0 },
        });
      }
      const bucket = byExhibition.get(exh.id)!;
      const amount = typeof p.amount === "number" ? p.amount : 0;
      if (p.status === "successful") { bucket.successful.count++; bucket.successful.total += amount; overallRevenue += amount; }
      else if (p.status === "pending") { bucket.pending.count++; bucket.pending.total += amount; overallPending += amount; }
      else { bucket.failed.count++; bucket.failed.total += amount; overallFailed += amount; }
    }

    res.json({
      exhibitions: Array.from(byExhibition.values()),
      overall: { revenue: overallRevenue, pending: overallPending, failed: overallFailed },
    });
  } catch (err) {
    logger.error({ err }, "Payments summary error");
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getAllPayments(req: Request, res: Response): Promise<void> {
  try {
    const { status, flagged } = req.query;

    let query = supabase
      .from("payments")
      .select(`
        id, amount, status, transaction_reference, created_at,
        reservations (
          id, reservation_code,
          users ( name, email ),
          stalls ( stall_number )
        )
      `)
      .order("created_at", { ascending: false });

    if (status) query = (query as any).eq("status", status);
    // flagged column only exists after migration — skip filter if not provided

    const { data, error } = await query;
    if (error) {
      res.status(500).json({ error: "Failed to fetch payments" });
      return;
    }
    res.json({ payments: data ?? [] });
  } catch (err) {
    logger.error({ err }, "Admin getAllPayments error");
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function flagPayment(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const { data: payment, error: fetchErr } = await supabase
      .from("payments")
      .select("id, flagged, transaction_reference")
      .eq("id", id)
      .single();

    if (fetchErr || !payment) {
      res.status(404).json({ error: "Payment not found" });
      return;
    }

    const newFlagged = !(payment as any).flagged;
    await supabase.from("payments").update({ flagged: newFlagged }).eq("id", id);

    void logActivity({
      adminId: req.user!.id,
      adminName: req.user!.name || req.user!.email,
      adminRole: req.user!.role,
      action: newFlagged ? "PAYMENT_FLAGGED" : "PAYMENT_UNFLAGGED",
      entityType: "payment",
      entityId: String(id),
      details: { reference: payment.transaction_reference },
    });

    res.json({ flagged: newFlagged });
  } catch (err) {
    logger.error({ err }, "Admin flagPayment error");
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function issueRefund(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const { data: payment, error: fetchErr } = await supabase
      .from("payments")
      .select("id, reservation_id, status, amount, transaction_reference")
      .eq("id", id)
      .single();

    if (fetchErr || !payment) {
      res.status(404).json({ error: "Payment not found" });
      return;
    }
    if (payment.status === "refunded") {
      res.status(409).json({ error: "Already refunded" });
      return;
    }

    await supabase.from("payments").update({ status: "refunded" }).eq("id", id);

    if (payment.reservation_id) {
      const { data: reservation } = await supabase
        .from("reservations")
        .select("id, stall_id")
        .eq("id", payment.reservation_id)
        .single();
      if (reservation) {
        await supabase.from("reservations").update({ status: "cancelled" }).eq("id", payment.reservation_id);
        await supabase.from("stalls").update({ status: "available" }).eq("id", reservation.stall_id);
      }
    }

    void logActivity({
      adminId: req.user!.id,
      adminName: req.user!.name || req.user!.email,
      adminRole: req.user!.role,
      action: "REFUND_ISSUED",
      entityType: "payment",
      entityId: String(id),
      details: { amount: payment.amount, reference: payment.transaction_reference },
    });

    res.json({ message: "Refund processed" });
  } catch (err) {
    logger.error({ err }, "Admin issueRefund error");
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── Announcements ──────────────────────────────────────────────────────────

export async function announceToVendors(req: AuthRequest, res: Response): Promise<void> {
  const { exhibition_id, subject, message } = req.body;
  try {
    let query = supabase
      .from("reservations")
      .select("users ( name, email ), stalls!inner ( exhibition_id )")
      .eq("status", "confirmed");

    if (exhibition_id) query = (query as any).eq("stalls.exhibition_id", exhibition_id);

    const { data, error } = await query;
    if (error) {
      res.status(500).json({ error: "Failed to fetch vendors" });
      return;
    }

    const sends = (data ?? []).map((row: any) => {
      const user = row.users;
      if (user?.email) return sendAnnouncementEmail(user.email, user.name ?? user.email, subject, message);
      return Promise.resolve();
    });

    await Promise.allSettled(sends);

    void logActivity({
      adminId: req.user!.id,
      adminName: req.user!.name || req.user!.email,
      adminRole: req.user!.role,
      action: "ANNOUNCEMENT_SENT",
      details: { subject, recipientCount: sends.length },
    });

    res.json({ message: `Announcement sent to ${sends.length} vendor(s)` });
  } catch (err) {
    logger.error({ err }, "Admin announceToVendors error");
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── Activity Log ────────────────────────────────────────────────────────────

export async function getActivityLog(req: Request, res: Response): Promise<void> {
  try {
    const limit = Math.min(100, parseInt((req.query.limit as string) ?? "50") || 50);
    const page = Math.max(1, parseInt((req.query.page as string) ?? "1") || 1);
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from("activity_log")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      // Table may not exist yet — return empty gracefully
      res.json({ activities: [], total: 0, page, limit });
      return;
    }
    res.json({ activities: data ?? [], total: count ?? 0, page, limit });
  } catch (err) {
    logger.error({ err }, "Admin getActivityLog error");
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── Shift Notes ─────────────────────────────────────────────────────────────

export async function getShiftNotes(_req: Request, res: Response): Promise<void> {
  try {
    const { data, error } = await supabase
      .from("shift_notes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      // Table may not exist yet — return empty gracefully
      res.json({ notes: [] });
      return;
    }
    res.json({ notes: data ?? [] });
  } catch (err) {
    logger.error({ err }, "Admin getShiftNotes error");
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function addShiftNote(req: AuthRequest, res: Response): Promise<void> {
  const { note } = req.body;
  try {
    const { data, error } = await supabase
      .from("shift_notes")
      .insert({
        admin_id: req.user!.id,
        admin_name: req.user!.name || req.user!.email,
        note,
      })
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: "Shift notes table not ready. Please run the database migration first." });
      return;
    }

    void logActivity({
      adminId: req.user!.id,
      adminName: req.user!.name || req.user!.email,
      adminRole: req.user!.role,
      action: "SHIFT_NOTE_ADDED",
      entityType: "shift_note",
      entityId: data.id,
    });

    res.status(201).json({ note: data });
  } catch (err) {
    logger.error({ err }, "Admin addShiftNote error");
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── Team management (super_admin only) ─────────────────────────────────────

export async function getAdmins(_req: Request, res: Response): Promise<void> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, name, email, role, created_at")
      .in("role", ["admin", "super_admin", "staff"])
      .order("created_at", { ascending: true });

    if (error) {
      res.status(500).json({ error: "Failed to fetch admins" });
      return;
    }
    res.json({ admins: data ?? [] });
  } catch (err) {
    logger.error({ err }, "Admin getAdmins error");
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function createAdminUser(req: AuthRequest, res: Response): Promise<void> {
  const { name, email, password, role } = req.body;

  if (!["admin", "staff"].includes(role)) {
    res.status(400).json({ error: "Role must be 'admin' or 'staff'" });
    return;
  }

  try {
    const { data: existing } = await supabase.from("users").select("id").eq("email", email).maybeSingle();
    if (existing) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const password_hash = await bcrypt.hash(password, 12);
    const { data: newUser, error } = await supabase
      .from("users")
      .insert({ name, email, password_hash, role, phone: null })
      .select("id, name, email, role, created_at")
      .single();

    if (error) {
      res.status(500).json({ error: "Failed to create admin user" });
      return;
    }

    void logActivity({
      adminId: req.user!.id,
      adminName: req.user!.name || req.user!.email,
      adminRole: req.user!.role,
      action: "ADMIN_CREATED",
      entityType: "user",
      entityId: newUser.id,
      details: { name, email, role },
    });

    res.status(201).json({ user: newUser });
  } catch (err) {
    logger.error({ err }, "Admin createAdminUser error");
    res.status(500).json({ error: "Internal server error" });
  }
}
