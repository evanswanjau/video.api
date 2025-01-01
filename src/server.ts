import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import videoRoutes from './routes/video';
import userRoutes from './routes/user';
import tagRoutes from './routes/tag';
import commentRoutes from './routes/comment';

dotenv.config();

const app = express();
const port = process.env.PORT || 8000;

// Middleware to parse JSON
app.use(express.json());
app.use(cors());

// Connect to MongoDB Atlas
const mongoUri = process.env.MONGO_URI || '';
mongoose
  .connect(mongoUri)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch((err) => console.error('Error connecting to MongoDB Atlas:', err));

app.get('/', (req, res) => {
  res.send('Server is running successfully');
});

app.use('/api/videos/', videoRoutes);
app.use('/api/users/', userRoutes);
app.use('/api/tags/', tagRoutes);
app.use('/api/comments/', commentRoutes);

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port} 🚀`);
});
