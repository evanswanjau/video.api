import axios, { AxiosError } from 'axios';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { faker } from '@faker-js/faker';
import fs from 'fs';
import FormData from 'form-data';
import User from '../models/User';
import Tag from '../models/Tag';
import Video from '../models/Video';
import Comment from '../models/Comment';

dotenv.config();

const API_BASE_URL = 'http://localhost:8000/api';

interface UserType {
  _id: string;
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
}

interface TagType {
  _id: string;
  name: string;
}

interface VideoType {
  _id: string;
  title: string;
  description: string;
}

const authenticateUser = async (
  email: string,
  password: string,
): Promise<string> => {
  const response = await axios.post(`${API_BASE_URL}/users/signin`, {
    email,
    password,
  });
  return response.data.token;
};

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || '');
    console.log('Connected to MongoDB');

    // Clear existing data
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Tag.deleteMany({});
    await Video.deleteMany({});
    await Comment.deleteMany({});
    console.log('Existing data cleared');

    const adminUser: Omit<UserType, '_id'> = {
      username: 'evanswanjau',
      email: 'evanswanjau@gmail.com',
      password: 'password',
      role: 'admin',
    };

    console.log('Creating admin user...');
    const adminResponse = await axios.post(
      `${API_BASE_URL}/users/signup`,
      adminUser,
    );
    console.log('Admin user created');

    const token = await authenticateUser(adminUser.email, adminUser.password);
    console.log('Authenticated admin user');

    const headers = {
      Authorization: `Bearer ${token}`,
    };

    // Create users
    console.log('Creating users...');
    const users: UserType[] = [];
    for (let i = 0; i < 20; i++) {
      const newUser: Omit<UserType, '_id'> = {
        username: faker.internet.userName(),
        email: faker.internet.email(),
        password: 'password123',
        role: i === 0 ? 'admin' : 'user',
      };
      const response = await axios.post(
        `${API_BASE_URL}/users/signup`,
        newUser,
      );
      users.push(response.data);
    }
    console.log('Users created');

    // Create tags
    console.log('Creating tags...');
    const tags: TagType[] = [];
    for (let i = 0; i < 10; i++) {
      const tag = { name: faker.lorem.word() };
      const response = await axios.post(`${API_BASE_URL}/tags`, tag, {
        headers,
      });
      tags.push(response.data);
    }
    console.log('Tags created');

    // Create videos
    console.log('Creating videos...');
    const videos: VideoType[] = [];
    const videoFiles = fs.readdirSync('uploads/downloads');

    for (const file of videoFiles) {
      const title = file
        .replace(/\.[^/.]+$/, '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());

      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', faker.lorem.paragraph());
      formData.append(
        'duration',
        faker.number.int({ min: 60, max: 3600 }).toString(),
      );

      const randomTags = tags
        .sort(() => 0.5 - Math.random())
        .slice(0, 3)
        .map((tag) => tag._id)
        .join(',');
      formData.append('tags', randomTags);

      formData.append(
        'video',
        fs.createReadStream(`uploads/downloads/${file}`),
      );

      const response = await axios.post(
        `${API_BASE_URL}/videos/upload`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            Authorization: `Bearer ${token}`,
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        },
      );
      videos.push(response.data);
    }
    console.log('Videos created');

    // Create comments and replies
    console.log('Creating comments and replies...');
    for (const video of videos) {
      const commentPromises = [];

      for (let i = 0; i < 20; i++) {
        const randomUser = users[Math.floor(Math.random() * users.length)];
        const comment = {
          content: faker.lorem.sentence(),
          userId: randomUser._id,
          videoId: video._id,
        };

        const commentPromise = axios
          .post(`${API_BASE_URL}/comments`, comment, { headers })
          .then(async (commentResponse) => {
            const replyPromises = [];
            for (let j = 0; j < 5; j++) {
              const randomReplyUser =
                users[Math.floor(Math.random() * users.length)];
              const reply = {
                content: faker.lorem.sentence(),
                userId: randomReplyUser._id,
                videoId: video._id,
                parentCommentId: commentResponse.data._id,
              };
              replyPromises.push(
                axios.post(`${API_BASE_URL}/comments`, reply, { headers }),
              );
            }
            await Promise.all(replyPromises);
          });

        commentPromises.push(commentPromise);
      }

      await Promise.all(commentPromises);
    }
    console.log('Comments and replies created');

    console.log('Database seeded successfully');
    process.exit(0);
  } catch (error) {
    if (error instanceof AxiosError) {
      console.error('API Error:', error.response?.data);
    } else if (error instanceof Error) {
      console.error('Error seeding database:', error.message);
    } else {
      console.error('Unknown error occurred');
    }
    process.exit(1);
  }
};

seedDatabase();
