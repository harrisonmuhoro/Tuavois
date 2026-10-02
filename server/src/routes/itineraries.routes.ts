import { Router } from 'express';
import * as itinerariesController from '../controllers/itineraries.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { itinerarySchema, validate } from '../validators';
import { auditLog } from '../middleware/audit.middleware';

const router = Router();
router.use(authenticate);

router.get('/templates', authorize('trips.view'), itinerariesController.getTemplates);
router.post('/templates', authorize('trips.edit'), itinerariesController.createTemplate);
router.delete('/templates/:id', authorize('trips.edit'), itinerariesController.deleteTemplate);
router.get('/', authorize('trips.view'), itinerariesController.getItineraries);
router.post('/', authorize('trips.edit'), validate(itinerarySchema), auditLog('ITINERARY_CREATED', 'Itinerary'), itinerariesController.createItinerary);
router.get('/:id', authorize('trips.view'), itinerariesController.getItineraryById);
router.put('/:id', authorize('trips.edit'), validate(itinerarySchema), auditLog('ITINERARY_UPDATED', 'Itinerary'), itinerariesController.updateItinerary);

export default router;
