import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import videoRoutes from '../routes/video';
import Video from '../models/Video';
import User from '../models/User';
import Tag from '../models/Tag';

// Set up the Express app
const app = express();
app.use(express.json());
app.use('/api/videos', videoRoutes);

// Connect to a test database
beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI || '');
});

// Clean up the test database before each test
beforeEach(async () => {
  await User.deleteMany({});
  await Video.deleteMany({});
  await Tag.deleteMany({});
});

// Clean up the test database
afterAll(async () => {
  if (mongoose.connection.db) {
    await mongoose.connection.db.dropDatabase();
  }
  await mongoose.connection.close();
});

// Helper function to generate a JWT token
const generateToken = (id: string, role: string) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET as string, {
    expiresIn: '1h',
  });
};

// Test the upload video endpoint
describe('POST /api/videos/upload', () => {
  (process.env.CI ? it.skip : it)(
    'should upload a video',
    async () => {
      const user: any = new User({
        username: 'testuser',
        email: 'testuser@example.com',
        password: 'password123',
        role: 'admin',
      });
      await user.save();

      const token = generateToken(user._id.toString(), user.role);

      const tag1 = new Tag({ name: 'tag1' });
      const tag2 = new Tag({ name: 'tag2' });
      const tag3 = new Tag({ name: 'tag3' });
      await tag1.save();
      await tag2.save();
      await tag3.save();

      const response = await request(app)
        .post('/api/videos/upload')
        .set('Authorization', `Bearer ${token}`)
        .field('title', 'Test Video')
        .field('description', 'Test Description')
        .field('duration', '120')
        .field('tags', 'tag1, tag2, tag3')
        .attach('video', 'uploads/videos/test_video.mp4');

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('title', 'Test Video');
      expect(response.body).toHaveProperty('filename');
      expect(response.body.filename).toMatch(/Test_Video-.*\.mp4/);
      expect(response.body.tags).toHaveLength(3);

      const tags = await Tag.find({ _id: { $in: response.body.tags } });
      expect(tags.map((tag) => tag.name)).toEqual(['tag1', 'tag2', 'tag3']);

      // Cleanup the uploaded test file
      const filePath = path.resolve('uploads/videos', response.body.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    },
    300000,
  );
});

// Test the update video endpoint
describe('PUT /api/videos/:id', () => {
  it('should update a video', async () => {
    const user: any = new User({
      username: 'testuser',
      email: 'testuser@example.com',
      password: 'password123',
      role: 'admin',
    });
    await user.save();

    const token = generateToken(user._id.toString(), user.role);

    const video = new Video({
      title: 'Old Title',
      description: 'Old Description',
      filename: 'Old_Title-uuid.mp4',
      filepath: 'uploads/videos/Old_Title-uuid.mp4',
      size: 12345,
      mimetype: 'video/mp4',
      duration: 120,
      user: user._id,
      tags: [],
    });
    await video.save();

    const response = await request(app)
      .put(`/api/videos/${video._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'New Title', tags: 'new1, new2' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('title', 'New Title');
    expect(response.body.tags).toHaveLength(2);
  }, 300000);
});

// Test the delete video endpoint
describe('DELETE /api/videos/:id', () => {
  (process.env.CI ? it.skip : it)(
    'should delete a video',
    async () => {
      const user: any = new User({
        username: 'testuser',
        email: 'testuser@example.com',
        password: 'password123',
        role: 'admin',
      });
      await user.save();

      const token = generateToken(user._id.toString(), user.role);

      const video = new Video({
        title: 'Test Video',
        description: 'Test Description',
        filename: 'Test_Video-uuid.mp4',
        filepath: 'uploads/videos/Test_Video-uuid.mp4',
        size: 12345,
        mimetype: 'video/mp4',
        duration: 120,
        user: user._id,
      });
      await video.save();

      // Create a mock file in the uploads/videos directory
      const mockFilePath = path.resolve('uploads/videos/Test_Video-uuid.mp4');
      fs.writeFileSync(mockFilePath, 'This is a mock video file.');

      const response = await request(app)
        .delete(`/api/videos/${video._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        'message',
        'Video deleted successfully',
      );

      // Ensure the file has been deleted
      expect(fs.existsSync(mockFilePath)).toBe(false);
    },
    300000,
  );
});

// Test the get all videos endpoint
describe('GET /api/videos', () => {
  it('should get all videos', async () => {
    const response = await request(app).get('/api/videos');

    expect(response.status).toBe(200);
    expect(response.body.videos).toBeInstanceOf(Array);
  }, 300000);
});

// Test the get video by ID endpoint
describe('GET /api/videos/:id', () => {
  it('should get a video by ID', async () => {
    const user = new User({
      username: 'testuser',
      email: 'testuser@example.com',
      password: 'password123',
      role: 'admin',
    });
    await user.save();

    const video = new Video({
      title: 'Test Video',
      description: 'Test Description',
      filename: 'Test_Video-uuid.mp4',
      filepath: 'uploads/videos/Test_Video-uuid.mp4',
      size: 12345,
      mimetype: 'video/mp4',
      duration: 120,
      user: user._id,
    });
    await video.save();

    const response = await request(app).get(`/api/videos/${video._id}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('title', 'Test Video');
  }, 300000);
});

// Test the get videos by user ID endpoint
describe('GET /api/videos/user/:id', () => {
  it('should get videos by user ID', async () => {
    const user: any = new User({
      username: 'testuser',
      email: 'testuser@example.com',
      password: 'password123',
      role: 'admin',
    });
    await user.save();

    const video1 = new Video({
      title: 'Test Video 1',
      description: 'Test Description 1',
      filename: 'Test_Video_1-uuid.mp4',
      filepath: 'uploads/videos/Test_Video_1-uuid.mp4',
      size: 12345,
      mimetype: 'video/mp4',
      duration: 120,
      user: user._id,
    });
    await video1.save();

    const video2 = new Video({
      title: 'Test Video 2',
      description: 'Test Description 2',
      filename: 'Test_Video_2-uuid.mp4',
      filepath: 'uploads/videos/Test_Video_2-uuid.mp4',
      size: 12345,
      mimetype: 'video/mp4',
      duration: 120,
      user: user._id,
    });
    await video2.save();

    const response = await request(app).get(
      `/api/videos/user/${user._id.toString()}`,
    );

    expect(response.status).toBe(200);
    expect(response.body.videos).toHaveLength(2);
    expect(response.body.videos[0]).toHaveProperty('title', 'Test Video 1');
    expect(response.body.videos[1]).toHaveProperty('title', 'Test Video 2');
  });
});

// Test the search videos endpoint
describe('GET /api/videos/search', () => {
  it('should search for videos by title', async () => {
    const user = new User({
      username: 'testuser',
      email: 'testuser@example.com',
      password: 'password123',
      role: 'admin',
    });
    await user.save();

    const video1 = new Video({
      title: 'Search Test Video 1',
      description: 'Test Description 1',
      filename: 'Search_Test_Video_1-uuid.mp4',
      filepath: 'uploads/videos/Search_Test_Video_1-uuid.mp4',
      size: 12345,
      mimetype: 'video/mp4',
      duration: 120,
      user: user._id,
    });
    await video1.save();

    const video2 = new Video({
      title: 'Another Video',
      description: 'Test Description 2',
      filename: 'Another_Video-uuid.mp4',
      filepath: 'uploads/videos/Another_Video-uuid.mp4',
      size: 12345,
      mimetype: 'video/mp4',
      duration: 120,
      user: user._id,
    });
    await video2.save();

    const response = await request(app)
      .get('/api/videos/search')
      .query({ query: 'Search Test' });

    expect(response.status).toBe(200);
    expect(response.body.videos).toHaveLength(1);
    expect(response.body.videos[0]).toHaveProperty(
      'title',
      'Search Test Video 1',
    );
  });

  it('should search videos by tags', async () => {
    const user: any = new User({
      username: 'testuser',
      email: 'testuser@example.com',
      password: 'password123',
      role: 'admin',
    });
    await user.save();

    const tag1 = new Tag({ name: 'tag1' });
    const tag2 = new Tag({ name: 'tag2' });
    const tag3 = new Tag({ name: 'tag3' });
    await tag1.save();
    await tag2.save();
    await tag3.save();

    const video1 = new Video({
      title: 'Video 1',
      description: 'Description 1',
      filename: 'Video_1-uuid.mp4',
      filepath: 'uploads/videos/Video_1-uuid.mp4',
      size: 12345,
      mimetype: 'video/mp4',
      duration: 120,
      user: user._id,
      tags: [tag1._id, tag2._id],
    });
    await video1.save();

    const video2 = new Video({
      title: 'Video 2',
      description: 'Description 2',
      filename: 'Video_2-uuid.mp4',
      filepath: 'uploads/videos/Video_2-uuid.mp4',
      size: 12345,
      mimetype: 'video/mp4',
      duration: 120,
      user: user._id,
      tags: [tag2._id, tag3._id],
    });
    await video2.save();

    const response = await request(app).get(
      `/api/videos/search?tags=${tag2._id}`,
    );

    expect(response.status).toBe(200);
    expect(response.body.videos).toHaveLength(2);
    expect(response.body.videos[0]).toHaveProperty('tags');
    expect(response.body.videos[1]).toHaveProperty('tags');
  });
});

// Test the like video endpoint
describe('POST /api/videos/like/:id', () => {
  it('should like a video', async () => {
    const user: any = new User({
      username: 'testuser',
      email: 'testuser@example.com',
      password: 'password123',
      role: 'user',
    });
    await user.save();

    const video = new Video({
      title: 'Test Video',
      description: 'Test Description',
      filename: 'Test_Video-uuid.mp4',
      filepath: 'uploads/videos/Test_Video-uuid.mp4',
      size: 12345,
      mimetype: 'video/mp4',
      duration: 120,
      user: user._id,
      likes: 0,
      dislikes: 0,
    });
    await video.save();

    const response = await request(app).post(`/api/videos/like/${video._id}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message', 'Video liked successfully');

    const updatedVideo = await Video.findById(video._id);
    expect(updatedVideo?.likes).toBe(1);
  });
});

// Test the dislike video endpoint
describe('POST /api/videos/dislike/:id', () => {
  it('should dislike a video', async () => {
    const user: any = new User({
      username: 'testuser',
      email: 'testuser@example.com',
      password: 'password123',
      role: 'user',
    });
    await user.save();

    const video = new Video({
      title: 'Test Video',
      description: 'Test Description',
      filename: 'Test_Video-uuid.mp4',
      filepath: 'uploads/videos/Test_Video-uuid.mp4',
      size: 12345,
      mimetype: 'video/mp4',
      duration: 120,
      user: user._id,
      likes: 0,
      dislikes: 0,
    });
    await video.save();

    const response = await request(app).post(
      `/api/videos/dislike/${video._id}`,
    );

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty(
      'message',
      'Video disliked successfully',
    );

    const updatedVideo = await Video.findById(video._id);
    expect(updatedVideo?.dislikes).toBe(1);
  });
});
