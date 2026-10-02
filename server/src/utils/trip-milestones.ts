import prisma from '../config/database';

/** Creates idempotent reminders for assigned staff for upcoming trip start/end milestones. */
export const processUpcomingTripMilestones = async (): Promise<number> => {
  const now = new Date();
  const horizon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const trips = await prisma.trip.findMany({
    where: { assignedStaffId: { not: null }, status: { in: ['PLANNED', 'CONFIRMED'] }, OR: [{ startDate: { gte: now, lte: horizon } }, { endDate: { gte: now, lte: horizon } }] },
    select: { id: true, tripNumber: true, destination: true, startDate: true, endDate: true, assignedStaffId: true },
  });
  let created = 0;
  for (const trip of trips) {
    if (!trip.assignedStaffId) continue;
    const milestones = [
      ...(trip.startDate >= now && trip.startDate <= horizon ? [{ title: 'Trip starting soon', message: `Trip ${trip.tripNumber} to ${trip.destination} starts on ${trip.startDate.toLocaleDateString()}.` }] : []),
      ...(trip.endDate >= now && trip.endDate <= horizon ? [{ title: 'Trip ending soon', message: `Trip ${trip.tripNumber} to ${trip.destination} ends on ${trip.endDate.toLocaleDateString()}.` }] : []),
    ];
    for (const milestone of milestones) {
      const existing = await prisma.notification.findFirst({ where: { userId: trip.assignedStaffId, entityType: 'Trip', entityId: trip.id, type: 'TRIP', title: milestone.title } });
      if (existing) continue;
      await prisma.notification.create({ data: { userId: trip.assignedStaffId, title: milestone.title, message: milestone.message, type: 'TRIP', entityType: 'Trip', entityId: trip.id } });
      created += 1;
    }
  }
  return created;
};
