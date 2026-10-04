// Shared TypeScript types for the TuaVois ERP

export type UserRole = 'ADMIN' | 'STAFF' | 'MANAGER' | 'SALES_CONSULTANT' | 'OPERATIONS_STAFF' | 'ACCOUNTANT' | 'SUPERADMIN';
export type UserScope = 'COMPANY' | 'GLOBAL';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
export type ProspectStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'QUOTATION_SENT' | 'NEGOTIATION' | 'WON' | 'LOST';
export type QuotationStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CONVERTED';
export type InvoiceStatus = 'DRAFT' | 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'MPESA' | 'CARD' | 'OTHER';
export type TripStatus = 'PLANNED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type VoucherType = 'HOTEL' | 'TRANSFER' | 'SERVICE';
export type VoucherStatus = 'DRAFT' | 'SENT' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
export type NotificationType = 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR' | 'PAYMENT' | 'TRIP' | 'INVOICE' | 'QUOTATION';
export type DiscountType = 'AMOUNT' | 'PERCENTAGE';
export type ActivityType = 'ACTIVITY' | 'ACCOMMODATION' | 'MEALS' | 'TRANSPORT' | 'FLIGHT' | 'OTHER';
export type ServiceType = 'HOTEL' | 'FLIGHT' | 'TRANSFER' | 'TRAIN' | 'OTHER';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: PaginationMeta;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  department?: string;
  status: UserStatus;
  roleId: string;
  role: { id: string; name: string };
  permissions: string[];
  lastLoginAt?: string;
  createdAt: string;
}

export interface Company {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  website?: string;
  logoUrl?: string;
  currency: string;
  taxRate: number;
  taxName: string;
  status?: 'ACTIVE' | 'SUSPENDED';
  kraPin?: string;
  bankDetails?: string;
}

export interface AuthState {
  token: string;
  company: Company | null;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    department?: string;
    companyId: string | null;
    scope?: UserScope;
    permissions: string[];
  };
}

export interface Client {
  id: string;
  clientNumber: string;
  fullName: string;
  company?: string;
  phone: string;
  email?: string;
  idNumber?: string;
  nationality?: string;
  address?: string;
  notes?: string;
  assignedStaffId?: string;
  assignedStaff?: { id: string; name: string };
  _count?: { quotations: number; invoices: number; trips: number };
  createdAt: string;
  updatedAt: string;
}

export interface Prospect {
  id: string;
  prospectNumber: string;
  fullName: string;
  company?: string;
  phone: string;
  email?: string;
  nationality?: string;
  status: ProspectStatus;
  leadSource?: string;
  travelInterest?: string;
  estimatedValue?: number;
  currency: string;
  notes?: string;
  assignedStaffId?: string;
  assignedStaff?: { id: string; name: string };
  convertedToClientId?: string;
  convertedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuotationItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  sortOrder?: number;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  clientId: string;
  client?: { id: string; fullName: string; company?: string };
  travelStartDate?: string;
  travelEndDate?: string;
  destination?: string;
  pax: number;
  currency: string;
  exchangeRate: number;
  validUntil?: string;
  subtotal: number;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  grandTotal: number;
  notes?: string;
  terms?: string;
  status: QuotationStatus;
  items: QuotationItem[];
  createdBy?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  id?: string;
  description: string;
  quantity: number;
  pax: number;
  unitPrice: number;
  total: number;
  sortOrder?: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  client?: { id: string; fullName: string; company?: string };
  tripId?: string;
  trip?: { id: string; name: string };
  invoiceDate: string;
  dueDate: string;
  currency: string;
  exchangeRate: number;
  subtotal: number;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  grandTotal: number;
  amountPaid: number;
  creditApplied: number;
  balance: number;
  notes?: string;
  terms?: string;
  status: InvoiceStatus;
  quotationId?: string;
  items: InvoiceItem[];
  payments?: Payment[];
  createdBy?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  paymentNumber: string;
  invoiceId: string;
  invoice?: { id: string; invoiceNumber: string };
  clientId: string;
  client?: { id: string; fullName: string };
  amount: number;
  currency: string;
  exchangeRate: number;
  baseAmount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  reference?: string;
  notes?: string;
  receivedById?: string;
  receivedBy?: { id: string; name: string };
  receipt?: Receipt;
  createdAt: string;
}

export interface Receipt {
  id: string;
  receiptNumber: string;
  paymentId: string;
  payment?: Payment;
  invoiceId: string;
  invoice?: { id: string; invoiceNumber: string };
  amount: number;
  currency: string;
  balanceAfter: number;
  createdAt: string;
}

export interface Trip {
  id: string;
  tripNumber: string;
  name: string;
  clientId: string;
  client?: { id: string; fullName: string; company?: string };
  destination: string;
  startDate: string;
  endDate: string;
  assignedStaffId?: string;
  assignedStaff?: { id: string; name: string };
  status: TripStatus;
  estimatedRevenue: number;
  estimatedCost: number;
  actualRevenue: number;
  actualCost: number;
  currency: string;
  notes?: string;
  participants?: TripParticipant[];
  expenses?: TripExpense[];
  _count?: { participants: number; expenses: number; vouchers: number };
  createdAt: string;
  updatedAt: string;
}

export interface TripParticipant {
  id: string;
  tripId: string;
  fullName: string;
  idNumber?: string;
  phone?: string;
  email?: string;
  nationality?: string;
  dateAdded?: string;
  paidDeposit?: boolean;
  adults?: number;
  kids?: number;
  dateOfBirth?: string;
  emergencyContact?: string;
  specialRequirements?: string;
  notes?: string;
  createdAt: string;
}

export interface TripExpense {
  id: string;
  tripId: string;
  description: string;
  category: string;
  vendor?: string;
  amount: number;
  currency: string;
  exchangeRate: number;
  baseAmount: number;
  date: string;
  reference?: string;
  notes?: string;
  createdAt: string;
}

export interface ItineraryActivity {
  id?: string;
  dayId?: string;
  title: string;
  description?: string;
  time?: string;
  location?: string;
  type: ActivityType;
  sortOrder: number;
}

export interface ItineraryDay {
  id?: string;
  itineraryId?: string;
  dayNumber: number;
  title?: string;
  date?: string;
  sortOrder: number;
  activities: ItineraryActivity[];
}

export interface Itinerary {
  id: string;
  itineraryNumber: string;
  tripName: string;
  clientId: string;
  client?: { id: string; fullName: string };
  tripId?: string;
  trip?: { id: string; name: string };
  departureDate: string;
  returnDate: string;
  departureLocation?: string;
  pickupLocation?: string;
  destination: string;
  numTravellers: number;
  introduction?: string;
  inclusiveOf?: string;
  exclusiveOf?: string;
  importantInfo?: string;
  termsConditions?: string;
  days: ItineraryDay[];
  _count?: { days: number };
  createdAt: string;
  updatedAt: string;
}

export interface Voucher {
  id: string;
  voucherNumber: string;
  type: VoucherType;
  status: VoucherStatus;
  supplierConfirmedAt?: string;
  supplierConfirmationRef?: string;
  clientId: string;
  client?: { id: string; fullName: string };
  tripId?: string;
  trip?: { id: string; name: string };
  guestNames?: string;
  notes?: string;
  hotelDetails?: HotelVoucher;
  transferDetails?: TransferVoucher;
  services?: VoucherService[];
  createdAt: string;
  updatedAt: string;
}

export interface HotelVoucher {
  id: string;
  hotel: string;
  address?: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  roomType?: string;
  rooms: number;
  mealPlan?: string;
  bookingReference?: string;
  checkedInAt?: string;
  checkedOutAt?: string;
  specialRequests?: string;
}

export interface TransferVoucher {
  id: string;
  date: string;
  pickupTime?: string;
  pickupLocation: string;
  dropoffLocation: string;
  vehicleType?: string;
  vehicleRegistration?: string;
  driverName?: string;
  driverPhone?: string;
  fare?: number;
  currency: string;
  passengers: number;
  flightOrTrainDetails?: string;
  instructions?: string;
}

export interface VoucherService {
  id?: string;
  serviceType: ServiceType;
  description: string;
  date?: string;
  location?: string;
  reference?: string;
  notes?: string;
  sortOrder: number;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  entityType?: string;
  entityId?: string;
  createdAt: string;
}

export interface DashboardData {
  role?: string;
  permissions?: string[];
  widgets?: any;
  financialSummary: {
    totalInvoiceValue: number;
    totalPaid: number;
    totalOutstanding: number;
    overdueCount: number;
    monthlyCollected: number;
    previousMonthlyCollected: number;
    monthlyCollectedChangePercent: number;
  };
  invoiceStats: Record<InvoiceStatus, { count: number; total: number }>;
  tripStats: Record<TripStatus, number>;
  clientCount: number;
  prospectCount: number;
  overdueInvoices: Invoice[];
  recentPayments: Payment[];
  recentQuotations: Quotation[];
  upcomingTrips: Trip[];
  monthlyRevenue: Array<{ month: string; revenue: number; collected: number }>;
  monthlyExpenses?: Array<{ month: string; expenses: number }>;
  ownerFinancials?: { estimatedRevenue: number; estimatedCost: number; actualRevenue: number; actualCost: number; estimatedProfit: number; actualProfit: number; expenses: number; expenseCount: number };
}
