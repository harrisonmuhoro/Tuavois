import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

export const validate = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
};

const id = z.string().min(1);
const optionalText = z.string().trim().max(10_000).optional();
const currency = z.string().trim().length(3).toUpperCase();
const date = z.string().date('Invalid date');
const money = z.number().finite().min(0);
const positiveMoney = z.number().finite().positive();

// Auth validators
export const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
  otp: z.string().regex(/^\d{6}$/, 'MFA code must be 6 digits').optional(),
}).strict();

export const mfaCodeSchema = z.object({ code: z.string().regex(/^\d{6}$/, 'MFA code must be 6 digits') }).strict();

// Client validators
export const clientSchema = z.object({
  fullName: z.string().min(2, 'Full name required'),
  company: z.string().optional(),
  phone: z.string().min(10, 'Valid phone required'),
  email: z.string().email().optional().or(z.literal('')),
  idNumber: z.string().optional(),
  nationality: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  assignedStaffId: z.string().optional(),
}).strict();

// Prospect validators
export const prospectSchema = z.object({
  fullName: z.string().min(2, 'Full name required'),
  company: z.string().optional(),
  phone: z.string().min(10, 'Valid phone required'),
  email: z.string().email().optional().or(z.literal('')),
  nationality: z.string().optional(),
  status: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'QUOTATION_SENT', 'NEGOTIATION', 'WON', 'LOST']).optional(),
  leadSource: z.string().optional(),
  travelInterest: z.string().optional(),
  estimatedValue: z.number().min(0).optional(),
  currency: z.string().optional(),
  notes: z.string().optional(),
  assignedStaffId: z.string().optional(),
}).strict();

// Quotation validators
export const quotationItemSchema = z.object({
  description: z.string().min(1, 'Description required'),
  quantity: z.number().min(0),
  unitPrice: z.number().min(0),
  sortOrder: z.number().optional(),
  total: z.number().optional(),
}).strict();

export const quotationSchema = z.object({
  clientId: z.string().min(1, 'Client required'),
  travelStartDate: z.string().optional(),
  travelEndDate: z.string().optional(),
  destination: z.string().optional(),
  quotationType: z.string().trim().max(80).optional(),
  pax: z.number().min(1).default(1),
  currency: z.string().default('KES'),
  exchangeRate: z.number().default(1),
  validUntil: z.string().optional(),
  discountType: z.enum(['AMOUNT', 'PERCENTAGE']).default('AMOUNT'),
  discountValue: z.number().min(0).default(0),
  taxRate: z.number().min(0).default(0),
  notes: z.string().optional(),
  terms: z.string().optional(),
  items: z.array(quotationItemSchema).min(1, 'At least one item required'),
}).strict();

// Invoice validators
export const invoiceItemSchema = z.object({
  description: z.string().min(1, 'Description required'),
  quantity: z.number().min(0),
  pax: z.number().min(1).default(1),
  unitPrice: z.number().min(0),
  sortOrder: z.number().optional(),
  total: z.number().optional(),
}).strict();

export const invoiceSchema = z.object({
  clientId: z.string().min(1, 'Client required'),
  tripId: z.string().optional(),
  invoiceDate: z.string(),
  dueDate: z.string(),
  currency: z.string().default('KES'),
  exchangeRate: z.number().default(1),
  discountType: z.enum(['AMOUNT', 'PERCENTAGE']).default('AMOUNT'),
  discountValue: z.number().min(0).default(0),
  taxRate: z.number().min(0).default(0),
  notes: z.string().optional(),
  terms: z.string().optional(),
  quotationId: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, 'At least one item required'),
}).strict();

// Payment validators
export const paymentSchema = z.object({
  invoiceId: z.string().min(1, 'Invoice required'),
  clientId: z.string().min(1, 'Client required'),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().default('KES'),
  exchangeRate: z.number().default(1),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'MPESA', 'CARD', 'OTHER']),
  paymentDate: z.string(),
  reference: z.string().optional(),
  notes: z.string().optional(),
}).strict();

// Trip validators
export const tripSchema = z.object({
  name: z.string().min(2, 'Trip name required'),
  clientId: z.string().min(1, 'Client required'),
  destination: z.string().min(1, 'Destination required'),
  startDate: z.string(),
  endDate: z.string(),
  assignedStaffId: z.string().optional(),
  estimatedRevenue: z.number().min(0).default(0),
  estimatedCost: z.number().min(0).default(0),
  currency: z.string().default('KES'),
  notes: z.string().optional(),
}).strict();

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(10, 'New password must be at least 10 characters'),
}).strict();

export const statusSchema = z.object({
  status: z.enum(['DRAFT', 'UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED']),
}).strict();

export const creditNoteSchema = z.object({
  invoiceId: id,
  amount: positiveMoney,
  currency: currency.default('KES'),
  reason: optionalText,
  items: z.array(z.object({
    description: z.string().trim().min(1).max(500),
    quantity: positiveMoney.default(1),
    unitPrice: money.default(0),
    total: money.optional(),
  }).strict()).default([]),
}).strict();

export const creditNoteApplicationSchema = z.object({
  amount: positiveMoney.optional(),
}).strict();

export const staffSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  password: z.string().min(10),
  phone: z.string().trim().max(40).optional(),
  department: z.string().trim().max(120).optional(),
  roleId: id,
}).strict();

export const companySettingsSchema = z.object({
  name: z.string().trim().min(2).max(160).optional(),
  email: z.string().trim().email().optional().or(z.literal('')),
  phone: z.string().trim().max(40).optional(),
  address: optionalText,
  website: z.string().trim().url().optional().or(z.literal('')),
  logoUrl: z.string().trim().url().optional().or(z.literal('')),
  currency: currency.optional(),
  taxRate: z.number().finite().min(0).max(100).optional(),
  taxName: z.string().trim().max(50).optional(),
  kraPin: z.string().trim().max(40).optional(),
  bankDetails: optionalText,
}).strict();

export const companyProvisionSchema = z.object({
  company: z.object({
    name: z.string().trim().min(2).max(160),
    email: z.string().trim().email().optional().or(z.literal('')),
    phone: z.string().trim().max(40).optional(),
    address: optionalText,
    website: z.string().trim().url().optional().or(z.literal('')),
    logoUrl: z.string().trim().url().optional().or(z.literal('')),
    taxId: z.string().trim().max(40).optional(),
    currency: currency.default('KES'),
    taxRate: z.number().finite().min(0).max(100).default(16),
    taxName: z.string().trim().max(50).default('VAT'),
    kraPin: z.string().trim().max(40).optional(),
    bankDetails: optionalText,
  }).strict(),
  owner: z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email(),
    password: z.string().min(10),
    phone: z.string().trim().max(40).optional(),
  }).strict(),
}).strict();

export const systemCompanyUpdateSchema = companySettingsSchema.extend({
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
}).strict();

export const systemUserUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().max(40).optional(),
  department: z.string().trim().max(120).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  roleId: id.optional(),
  companyId: id.nullable().optional(),
}).strict();

export const systemUserSuspendSchema = z.object({
  reason: z.string().trim().min(3).max(500),
}).strict();

export const participantSchema = z.object({
  fullName: z.string().trim().min(2).max(160), idNumber: z.string().trim().max(80).optional(),
  phone: z.string().trim().max(40).optional(), email: z.string().trim().email().optional().or(z.literal('')),
  nationality: z.string().trim().max(80).optional(), dateOfBirth: date.optional(), emergencyContact: z.string().trim().max(160).optional(),
  dateAdded: date.optional(), paidDeposit: z.boolean().default(false), adults: z.number().int().min(0).default(1),
  kids: z.number().int().min(0).default(0), specialRequirements: optionalText, notes: optionalText,
}).strict();

export const letterSchema = z.object({
  letterName: z.string().trim().min(2).max(200),
  details: z.string().trim().min(1).max(20000),
}).strict();

export const expenseSchema = z.object({
  description: z.string().trim().min(1).max(500), category: z.string().trim().min(1).max(100), vendor: z.string().trim().max(160).optional(),
  amount: positiveMoney, currency: currency.default('KES'), exchangeRate: positiveMoney.default(1), date,
  reference: z.string().trim().max(160).optional(), notes: optionalText,
}).strict();

const activitySchema = z.object({ title: z.string().trim().min(1).max(300), description: optionalText, time: z.string().trim().max(30).optional(), location: z.string().trim().max(200).optional(), type: z.enum(['ACTIVITY', 'ACCOMMODATION', 'MEALS', 'TRANSPORT', 'FLIGHT', 'OTHER']).default('ACTIVITY') }).strict();
export const itinerarySchema = z.object({
  tripName: z.string().trim().min(2).max(200), clientId: id, tripId: id.optional(), departureDate: date, returnDate: date,
  departureLocation: z.string().trim().max(200).optional(), pickupLocation: z.string().trim().max(200).optional(), destination: z.string().trim().min(1).max(200), numTravellers: z.number().int().positive().default(1),
  introduction: optionalText, inclusiveOf: optionalText, exclusiveOf: optionalText, importantInfo: optionalText, termsConditions: optionalText,
  days: z.array(z.object({ title: z.string().trim().max(300).optional(), date: date.optional(), activities: z.array(activitySchema).default([]) }).strict()).default([]),
}).strict();

const hotelDetailsSchema = z.object({ hotel: z.string().trim().min(1).max(200), address: optionalText, checkIn: date, checkOut: date, nights: z.number().int().positive(), roomType: z.string().trim().max(100).optional(), rooms: z.number().int().positive().default(1), mealPlan: z.string().trim().max(100).optional(), bookingReference: z.string().trim().max(160).optional(), specialRequests: optionalText }).strict();
const transferDetailsSchema = z.object({ date, pickupTime: z.string().trim().max(30).optional(), pickupLocation: z.string().trim().min(1).max(200), dropoffLocation: z.string().trim().min(1).max(200), vehicleType: z.string().trim().max(100).optional(), vehicleRegistration: z.string().trim().max(100).optional(), driverName: z.string().trim().max(160).optional(), driverPhone: z.string().trim().max(40).optional(), fare: money.optional(), currency: currency.default('KES'), passengers: z.number().int().positive().default(1), flightOrTrainDetails: optionalText, instructions: optionalText }).strict();
export const voucherSchema = z.object({ type: z.enum(['HOTEL', 'TRANSFER', 'SERVICE']), clientId: id, tripId: id.optional(), guestNames: optionalText, notes: optionalText, hotelDetails: hotelDetailsSchema.optional(), transferDetails: transferDetailsSchema.optional(), services: z.array(z.object({ serviceType: z.enum(['HOTEL', 'FLIGHT', 'TRANSFER', 'TRAIN', 'OTHER']), description: z.string().trim().min(1).max(500), date: date.optional(), location: z.string().trim().max(200).optional(), reference: z.string().trim().max(160).optional(), notes: optionalText }).strict()).optional() }).strict().superRefine((value, ctx) => { if (value.type === 'HOTEL' && !value.hotelDetails) ctx.addIssue({ code: 'custom', path: ['hotelDetails'], message: 'Hotel details are required' }); if (value.type === 'TRANSFER' && !value.transferDetails) ctx.addIssue({ code: 'custom', path: ['transferDetails'], message: 'Transfer details are required' }); if (value.type === 'SERVICE' && !value.services?.length) ctx.addIssue({ code: 'custom', path: ['services'], message: 'At least one service is required' }); });
export const voucherStatusSchema = z.object({ status: z.enum(['DRAFT', 'SENT', 'CONFIRMED', 'COMPLETED', 'CANCELLED']), supplierConfirmationRef: z.string().trim().max(160).optional() }).strict();
