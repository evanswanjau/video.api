import cron from 'node-cron';
import { cleanupWatchHistory } from '../controllers/video';

// Schedule the cleanup to run every day at midnight
cron.schedule('0 0 * * *', async () => {
  console.log('Running watch history cleanup...');
  await cleanupWatchHistory();
});
