import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import commentRoutes from '../routes/comment';
import Video from '../models/Video';
import User from '../models/User';
import Comment from '../models/Comment';

const app = express();
app.use(express.json());
app.use('/api/comments', commentRoutes);

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI || '');
});

beforeEach(async () => {
  await User.deleteMany({});
  await Video.deleteMany({});
  await Comment.deleteMany({});
});

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

describe('Comment API', () => {
  it('should add a comment to a video', async () => {
    const user: any = new User({
      username: 'testuser',
      email: 'testuser@example.com',
      password: 'password123',
      role: 'admin',
    });
    await user.save();

    const token = generateToken(user._id.toString(), user.role);

    const video: any = new Video({
      title: 'Test Video',
      description: 'Test Description',
      filename: 'test_video.mp4',
      filepath: 'uploads/videos/test_video.mp4',
      size: 12345,
      mimetype: 'video/mp4',
      duration: 120,
      user: user._id,
      tags: [],
      comments: [],
    });
    await video.save();

    const response = await request(app)
      .post('/api/comments')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Test Comment', videoId: video._id });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('content', 'Test Comment');
    expect(response.body).toHaveProperty('user', user._id.toString());
    expect(response.body).toHaveProperty('video', video._id.toString());
  });

  it('should add a reply to a comment', async () => {
    const user: any = new User({
      username: 'testuser',
      email: 'testuser@example.com',
      password: 'password123',
      role: 'admin',
    });
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '1h' },
    );

    const video: any = new Video({
      title: 'Test Video',
      description: 'Test Description',
      filename: 'test_video.mp4',
      filepath: 'uploads/videos/test_video.mp4',
      size: 12345,
      mimetype: 'video/mp4',
      duration: 120,
      user: user._id,
      tags: [],
      comments: [],
    });
    await video.save();

    const comment: any = new Comment({
      content: 'Test Comment',
      user: user._id,
      video: video._id,
    });
    await comment.save();

    const response = await request(app)
      .post('/api/comments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        content: 'Test Reply',
        videoId: video._id,
        parentCommentId: comment._id,
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('content', 'Test Reply');
    expect(response.body).toHaveProperty('user', user._id.toString());
    expect(response.body).toHaveProperty('video', video._id.toString());
    expect(response.body).toHaveProperty(
      'parentComment',
      comment._id.toString(),
    );
  });

  it('should update a comment', async () => {
    const user: any = new User({
      username: 'testuser',
      email: 'testuser@example.com',
      password: 'password123',
      role: 'admin',
    });
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '1h' },
    );

    const video = new Video({
      title: 'Test Video',
      description: 'Test Description',
      filename: 'test_video.mp4',
      filepath: 'uploads/videos/test_video.mp4',
      size: 12345,
      mimetype: 'video/mp4',
      duration: 120,
      user: user._id,
      tags: [],
      comments: [],
    });
    await video.save();

    const comment = new Comment({
      content: 'Old Comment',
      user: user._id,
      video: video._id,
    });
    await comment.save();

    const response = await request(app)
      .put(`/api/comments/${comment._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Updated Comment' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('content', 'Updated Comment');
  });

  it('should delete a comment', async () => {
    const user: any = new User({
      username: 'testuser',
      email: 'testuser@example.com',
      password: 'password123',
      role: 'admin',
    });
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '1h' },
    );

    const video = new Video({
      title: 'Test Video',
      description: 'Test Description',
      filename: 'test_video.mp4',
      filepath: 'uploads/videos/test_video.mp4',
      size: 12345,
      mimetype: 'video/mp4',
      duration: 120,
      user: user._id,
      tags: [],
      comments: [],
    });
    await video.save();

    const comment = new Comment({
      content: 'Test Comment',
      user: user._id,
      video: video._id,
    });
    await comment.save();

    const response = await request(app)
      .delete(`/api/comments/${comment._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty(
      'message',
      'Comment deleted successfully',
    );
  });

  it('should get comments for a video', async () => {
    const user: any = new User({
      username: 'testuser',
      email: 'testuser@example.com',
      password: 'password123',
      role: 'admin',
    });
    await user.save();

    const video = new Video({
      title: 'Test Video',
      description: 'Test Description',
      filename: 'test_video.mp4',
      filepath: 'uploads/videos/test_video.mp4',
      size: 12345,
      mimetype: 'video/mp4',
      duration: 120,
      user: user._id,
      tags: [],
      comments: [],
    });
    await video.save();

    const comment1 = new Comment({
      content: 'Comment 1',
      user: user._id,
      video: video._id,
    });
    await comment1.save();

    const comment2 = new Comment({
      content: 'Comment 2',
      user: user._id,
      video: video._id,
    });
    await comment2.save();

    const response = await request(app).get(`/api/comments/video/${video._id}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body[0]).toHaveProperty('content', 'Comment 1');
    expect(response.body[1]).toHaveProperty('content', 'Comment 2');
  });

  it('should get replies for a comment', async () => {
    const user: any = new User({
      username: 'testuser',
      email: 'testuser@example.com',
      password: 'password123',
      role: 'admin',
    });
    await user.save();

    const video = new Video({
      title: 'Test Video',
      description: 'Test Description',
      filename: 'test_video.mp4',
      filepath: 'uploads/videos/test_video.mp4',
      size: 12345,
      mimetype: 'video/mp4',
      duration: 120,
      user: user._id,
      tags: [],
      comments: [],
    });
    await video.save();

    const comment = new Comment({
      content: 'Test Comment',
      user: user._id,
      video: video._id,
    });
    await comment.save();

    const reply1 = new Comment({
      content: 'Reply 1',
      user: user._id,
      video: video._id,
      parentComment: comment._id,
    });
    await reply1.save();

    const reply2 = new Comment({
      content: 'Reply 2',
      user: user._id,
      video: video._id,
      parentComment: comment._id,
    });
    await reply2.save();

    const response = await request(app).get(
      `/api/comments/replies/${comment._id}`,
    );

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body[0]).toHaveProperty('content', 'Reply 1');
    expect(response.body[1]).toHaveProperty('content', 'Reply 2');
  });
});
