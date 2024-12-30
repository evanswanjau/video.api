import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import Tag from '../models/Tag';
import tagRoutes from '../routes/tag';

// Set up the Express app
const app = express();
app.use(express.json());
app.use('/api/tags', tagRoutes);

// Connect to a test database
beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI || '');
});

// Clean up the test database before each test
beforeEach(async () => {
  await Tag.deleteMany({});
});

// Clean up the test database
afterAll(async () => {
  if (mongoose.connection.db) {
    await mongoose.connection.db.dropDatabase();
  }
  await mongoose.connection.close();
});

describe('POST /api/tags', () => {
  it('should create a new tag', async () => {
    const response = await request(app)
      .post('/api/tags')
      .send({ name: 'test-tag' });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('name', 'test-tag');
  });

  it('should not create a duplicate tag', async () => {
    await new Tag({ name: 'test-tag' }).save();

    const response = await request(app)
      .post('/api/tags')
      .send({ name: 'test-tag' });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('message', 'Tag already exists');
  });
});

describe('GET /api/tags', () => {
  it('should get all tags', async () => {
    await new Tag({ name: 'tag1' }).save();
    await new Tag({ name: 'tag2' }).save();

    const response = await request(app).get('/api/tags');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
  });

  it('should get a tag by ID', async () => {
    const tag = await new Tag({ name: 'test-tag' }).save();

    const response = await request(app).get(`/api/tags/${tag._id}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('name', 'test-tag');
  });
});

describe('PUT /api/tags/:id', () => {
  it('should update a tag by ID', async () => {
    const tag = await new Tag({ name: 'old-tag' }).save();

    const response = await request(app)
      .put(`/api/tags/${tag._id}`)
      .send({ name: 'new-tag' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('name', 'new-tag');
  });
});

describe('DELETE /api/tags/:id', () => {
  it('should delete a tag by ID', async () => {
    const tag = await new Tag({ name: 'test-tag' }).save();

    const response = await request(app).delete(`/api/tags/${tag._id}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message', 'Tag deleted successfully');
  });
});

describe('POST /api/tags/bulk', () => {
  it('should add tags in bulk', async () => {
    const response = await request(app)
      .post('/api/tags/bulk')
      .send({ tags: 'tag1, tag2, tag3' });

    expect(response.status).toBe(201);
    expect(response.body.newTags).toHaveLength(3);
  });
});

describe('GET /api/tags/search', () => {
  it('should search tags by name', async () => {
    await new Tag({ name: 'tag1' }).save();
    await new Tag({ name: 'tag2' }).save();
    await new Tag({ name: 'another-twag' }).save();

    const response = await request(app).get('/api/tags/search?query=tag');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body[0]).toHaveProperty('name', 'tag1');
    expect(response.body[1]).toHaveProperty('name', 'tag2');
  });

  it('should return an empty array if no tags match the query', async () => {
    await new Tag({ name: 'tag1' }).save();

    const response = await request(app).get(
      '/api/tags/search?query=nonexistent',
    );

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(0);
  });
});
