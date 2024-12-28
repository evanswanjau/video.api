import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import videoRoutes from '../routes/video';
import Video from '../models/video';

// Set up the Express app
const app = express();
app.use(express.json());
app.use('/api/videos', videoRoutes);

// Connect to a test database
beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI || '');
});

// Clean up the test database
afterAll(async () => {
  if (mongoose.connection.db) {
    await mongoose.connection.db.dropDatabase();
  }
  await mongoose.connection.close();
});

// Test the upload video endpoint
describe('POST /api/videos/upload', () => {
  it('should upload a video', async () => {
    const response = await request(app)
      .post('/api/videos/upload')
      .field('title', 'Test Video')
      .field('description', 'Test Description')
      .field('duration', '120')
      .field('user', '60d0fe4f5311236168a109ca')
      .field('tags', 'tag1,tag2,tag3')
      .attach('video', 'uploads/videos/test_video.mp4');

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('title', 'Test Video');
    expect(response.body).toHaveProperty('filename');
    expect(response.body.filename).toMatch(/Test_Video-.*\.mp4/);

    // Cleanup the uploaded test file
    console.log(response.body.filename)
    const filePath = path.resolve('uploads/videos', response.body.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  });
});

// Test the update video endpoint
describe('PUT /api/videos/:id', () => {
  it('should update a video', async () => {
    const video = new Video({
      title: 'Old Title',
      description: 'Old Description',
      filename: 'Old_Title-uuid.mp4',
      filepath: 'uploads/videos/Old_Title-uuid.mp4',
      size: 12345,
      mimetype: 'video/mp4',
      duration: 120,
      user: '60d0fe4f5311236168a109ca',
      tags: ['old'],
    });
    await video.save();

    const response = await request(app)
      .put(`/api/videos/${video._id}`)
      .send({ title: 'New Title' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('title', 'New Title');
  });
});

// Test the delete video endpoint
describe('DELETE /api/videos/:id', () => {
  it('should delete a video', async () => {
    const video = new Video({
      title: 'Test Video',
      description: 'Test Description',
      filename: 'Test_Video-uuid.mp4',
      filepath: 'uploads/videos/Test_Video-uuid.mp4',
      size: 12345,
      mimetype: 'video/mp4',
      duration: 120,
      user: '60d0fe4f5311236168a109ca',
      tags: ['test'],
    });
    await video.save();

    // Create a mock file in the uploads/videos directory
    const mockFilePath = path.resolve('uploads/videos/Test_Video-uuid.mp4');
    fs.writeFileSync(mockFilePath, 'This is a mock video file.');

    const response = await request(app).delete(`/api/videos/${video._id}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty(
      'message',
      'Video deleted successfully',
    );
  });
});

// Test the get all videos endpoint
describe('GET /api/videos', () => {
  it('should get all videos', async () => {
    const response = await request(app).get('/api/videos');

    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
  });
});

// Test the get video by ID endpoint
describe('GET /api/videos/:id', () => {
  it('should get a video by ID', async () => {
    const video = new Video({
      title: 'Test Video',
      description: 'Test Description',
      filename: 'Test_Video-uuid.mp4',
      filepath: 'uploads/videos/Test_Video-uuid.mp4',
      size: 12345,
      mimetype: 'video/mp4',
      duration: 120,
      user: '60d0fe4f5311236168a109ca',
      tags: ['test'],
    });
    await video.save();

    const response = await request(app).get(`/api/videos/${video._id}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('title', 'Test Video');
  });
});
