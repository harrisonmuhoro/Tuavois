import app from './app';
import { processOverdueInvoices } from './utils/overdue-invoices';
import { processUpcomingTripMilestones } from './utils/trip-milestones';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  if (process.env.NODE_ENV !== 'test') {
    const runNotificationJobs = async () => {
      try {
        await processOverdueInvoices();
        await processUpcomingTripMilestones();
      } catch (error) {
        console.error('Notification job failed', error);
      }
    };
    void runNotificationJobs();
    const scheduler = setInterval(() => void runNotificationJobs(), 15 * 60 * 1000);
    scheduler.unref();
  }
});
