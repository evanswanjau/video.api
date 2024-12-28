import express from 'express';
import mongoose from 'mongoose';
import videoRoutes from './routes/video';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 8000;

// Middleware to parse JSON
app.use(express.json());

// Connect to MongoDB Atlas
const mongoUri = process.env.MONGO_URI || '';
mongoose
  .connect(mongoUri)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch((err) => console.error('Error connecting to MongoDB Atlas:', err));

app.use('/api/videos/', videoRoutes);

// Start the server
app.listen(port, () => {
  console.log(`Api is running on port ${port} 🚀`);
});
