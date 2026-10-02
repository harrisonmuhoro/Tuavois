import { Router } from 'express';
import * as tripsController from '../controllers/trips.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { expenseSchema, participantSchema, validate, tripSchema } from '../validators';
import { auditLog } from '../middleware/audit.middleware';

const router = Router();
router.use(authenticate);

router.get('/', authorize('trips.view'), tripsController.getTrips);
router.post('/', authorize('trips.create'), validate(tripSchema), auditLog('TRIP_CREATED', 'Trip'), tripsController.createTrip);
router.get('/:id', authorize('trips.view'), tripsController.getTripById);
router.put('/:id', authorize('trips.edit'), validate(tripSchema), auditLog('TRIP_UPDATED', 'Trip'), tripsController.updateTrip);
router.post('/:id/participants', authorize('trips.edit'), validate(participantSchema), auditLog('TRIP_PARTICIPANT_ADDED', 'Trip'), tripsController.addParticipant);
router.put('/:id/participants/:participantId', authorize('trips.edit'), validate(participantSchema), auditLog('TRIP_PARTICIPANT_UPDATED', 'TripParticipant'), tripsController.updateParticipant);
router.delete('/:id/participants/:participantId', authorize('trips.edit'), auditLog('TRIP_PARTICIPANT_REMOVED', 'TripParticipant'), tripsController.removeParticipant);
router.post('/:id/expenses', authorize('trips.edit'), validate(expenseSchema), auditLog('TRIP_EXPENSE_ADDED', 'Trip'), tripsController.addExpense);
router.put('/:id/expenses/:expenseId', authorize('trips.edit'), validate(expenseSchema), auditLog('TRIP_EXPENSE_UPDATED', 'TripExpense'), tripsController.updateExpense);
router.delete('/:id/expenses/:expenseId', authorize('trips.edit'), auditLog('TRIP_EXPENSE_REMOVED', 'TripExpense'), tripsController.removeExpense);

export default router;
