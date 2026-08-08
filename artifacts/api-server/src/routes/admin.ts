import { Router } from "express";
import { body } from "express-validator";
import { authenticate } from "../middleware/auth";
import { requireAdmin, requireManagerRole, requireSuperAdmin, verifyRoleFromDb } from "../middleware/roleCheck";
import { validate } from "../middleware/validate";
import {
  getStats,
  getAllReservations,
  cancelReservation,
  checkInVendor,
  updateStall,
  getVendors,
  deleteVendor,
  toggleLegalHold,
  getPaymentsSummary,
  getAllPayments,
  flagPayment,
  issueRefund,
  announceToVendors,
  getActivityLog,
  getShiftNotes,
  addShiftNote,
  getAdmins,
  createAdminUser,
} from "../controllers/adminController";

const router = Router();

// verifyRoleFromDb re-fetches the caller's role from the database on every
// admin request, so a demoted admin is blocked immediately rather than at
// their token's 24-hour expiry.
router.use(authenticate, verifyRoleFromDb, requireAdmin);

// Dashboard stats
router.get("/stats", getStats);

// Reservations
router.get("/reservations", getAllReservations);
router.delete("/reservations/:id", requireManagerRole, cancelReservation);
router.post("/reservations/:id/checkin", checkInVendor);

// Stalls
router.patch(
  "/stalls/:id",
  requireManagerRole,
  [body("status").notEmpty()],
  validate,
  updateStall
);

// Vendors
router.get("/vendors", getVendors);
router.delete("/vendors/:id", requireManagerRole, deleteVendor);
router.patch("/vendors/:id/legal-hold", requireSuperAdmin, toggleLegalHold);

// Payments
router.get("/payments/summary", getPaymentsSummary);
router.get("/payments", requireManagerRole, getAllPayments);
router.patch("/payments/:id/flag", requireManagerRole, flagPayment);
router.post("/payments/:id/refund", requireSuperAdmin, issueRefund);

// Announcements
router.post(
  "/announce",
  requireManagerRole,
  [body("subject").notEmpty(), body("message").notEmpty()],
  validate,
  announceToVendors
);

// Activity log
router.get("/activity-log", requireManagerRole, getActivityLog);

// Shift notes
router.get("/shift-notes", getShiftNotes);
router.post("/shift-notes", [body("note").notEmpty()], validate, addShiftNote);

// Team management (super_admin only)
router.get("/admins", requireSuperAdmin, getAdmins);
router.post(
  "/admins",
  requireSuperAdmin,
  [
    body("name").notEmpty(),
    body("email").isEmail(),
    body("password").isLength({ min: 8 }),
    body("role").isIn(["admin", "staff"]),
  ],
  validate,
  createAdminUser
);

export default router;
