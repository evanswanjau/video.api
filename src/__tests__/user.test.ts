import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Video from '../models/Video';
import User from '../models/User';
import userRoutes from '../routes/user';

// Set up the Express app
const app = express();
app.use(express.json());
app.use('/api/users', userRoutes);

// Connect to a test database
beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI || '');
});

// Clean up the test database before each test
beforeEach(async () => {
  await User.deleteMany({});
  await Video.deleteMany({});
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
// Set up the Express app

// Test SignUp
describe('POST /api/users/signup', () => {
  it('should create a new user and send activation email', async () => {
    const response = await request(app).post('/api/users/signup').send({
      email: 'evanswanjau@gmail.com',
      password: 'password123',
      username: 'testuser',
    });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe(
      'Registration successful! Please check your email to activate your account.',
    );

    const user = await User.findOne({ email: 'evanswanjau@gmail.com' });
    expect(user).not.toBeNull();
  });

  it('should return 409 if email already exists', async () => {
    await new User({
      email: 'evanswanjau@gmail.com',
      password: 'password123',
      username: 'testuser',
    }).save();

    const response = await request(app).post('/api/users/signup').send({
      email: 'evanswanjau@gmail.com',
      password: 'password123',
      username: 'testuser',
    });

    expect(response.status).toBe(409);
    expect(response.body.message).toBe(
      'An account with this email already exists.',
    );
  });
});

// Test SignIn
describe('POST /api/users/signin', () => {
  it('should sign in an existing user', async () => {
    const user = new User({
      email: 'evanswanjau@gmail.com',
      password: await bcrypt.hash('password123', 10),
      username: 'testuser',
    });
    await user.save();

    const response = await request(app).post('/api/users/signin').send({
      email: 'evanswanjau@gmail.com',
      password: 'password123',
    });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
  });

  it('should return 401 if credentials are invalid', async () => {
    const response = await request(app).post('/api/users/signin').send({
      email: 'invalid@example.com',
      password: 'invalidpassword',
    });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('The provided credentials are invalid.');
  });
});

// Test Change Password
describe('POST /api/users/change-password', () => {
  it('should change the password for an authenticated user', async () => {
    const user: any = new User({
      email: 'evanswanjau@gmail.com',
      password: await bcrypt.hash('password123', 10),
      username: 'testuser',
    });
    await user.save();

    const token = generateToken(user._id.toString(), user.role);

    const response = await request(app)
      .post('/api/users/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        oldPassword: 'password123',
        newPassword: 'newpassword123',
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe(
      'Your password has been updated successfully.',
    );

    const updatedUser = await User.findById(user._id);
    const isMatch = await bcrypt.compare(
      'newpassword123',
      updatedUser!.password,
    );
    expect(isMatch).toBe(true);
  });

  it('should return 401 if old password is incorrect', async () => {
    const user: any = new User({
      email: 'evanswanjau@gmail.com',
      password: await bcrypt.hash('password123', 10),
      username: 'testuser',
    });
    await user.save();

    const token = generateToken(user._id.toString(), user.role);

    const response = await request(app)
      .post('/api/users/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        oldPassword: 'wrongpassword',
        newPassword: 'newpassword123',
      });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('The provided credentials are invalid.');
  });
});

// Test Forgot Password
describe('POST /api/users/forgot-password', () => {
  it('should send a password reset link to the user email', async () => {
    const user = new User({
      email: 'evanswanjau@gmail.com',
      password: await bcrypt.hash('password123', 10),
      username: 'testuser',
    });
    await user.save();

    const response = await request(app)
      .post('/api/users/forgot-password')
      .send({
        email: 'evanswanjau@gmail.com',
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe(
      'A password reset link has been sent to your email address.',
    );
  });

  it('should return 404 if email is not found', async () => {
    const response = await request(app)
      .post('/api/users/forgot-password')
      .send({
        email: 'nonexistent@example.com',
      });

    expect(response.status).toBe(404);
    expect(response.body.message).toBe(
      'No user found with the provided email address.',
    );
  });
});
