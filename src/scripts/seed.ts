import axios from 'axios';
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

const authenticateUser = async (email: string, password: string) => {
  const response = await axios.post(`${API_BASE_URL}/users/signin`, {
    email,
    password,
  });
  return response.data.token;
};

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || '');

    // Clear existing data
    await User.deleteMany({});
    await Tag.deleteMany({});
    await Video.deleteMany({});
    await Comment.deleteMany({});

    const user = {
      username: 'evanswanjau',
      email: 'evanswanjau@gmail.com',
      password: 'password',
      role: 'admin',
    };

    await axios.post(`${API_BASE_URL}/users/signup`, user);

    const token = await authenticateUser(user.email, user.password);

    const headers = {
      Authorization: `Bearer ${token}`,
    };

    // Create users
    const users = [];
    for (let i = 0; i < 20; i++) {
      const user = {
        username: faker.internet.username(),
        email: faker.internet.email(),
        password: 'password123',
        role: i === 0 ? 'admin' : 'user',
      };
      const response = await axios.post(`${API_BASE_URL}/users/signup`, user, {
        headers,
      });
      users.push(response.data);
    }

    // Create tags
    const tags = [];
    for (let i = 0; i < 10; i++) {
      const tag = { name: faker.lorem.word() };
      const response = await axios.post(`${API_BASE_URL}/tags`, tag, {
        headers,
      });
      tags.push(response.data);
    }

    // Create videos
    const videos = [];
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
      formData.append(
        'tags',
        Array.from({ length: 3 }, () => faker.lorem.word()).join(','),
      );
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
        },
      );
      videos.push(response.data);
    }

    // Create comments and replies
    for (const video of videos) {
      for (let i = 0; i < 20; i++) {
        const comment = {
          content: faker.lorem.sentence(),
          user: users[faker.number.int({ min: 0, max: 19 })]._id,
          video: video._id,
        };
        const commentResponse = await axios.post(
          `${API_BASE_URL}/comments`,
          comment,
          { headers },
        );

        // Create replies for each comment
        for (let j = 0; j < 5; j++) {
          const reply = {
            content: faker.lorem.sentence(),
            user: users[faker.number.int({ min: 0, max: 19 })]._id,
            video: video._id,
            parentComment: commentResponse.data._id,
          };
          await axios.post(`${API_BASE_URL}/comments`, reply, { headers });
        }
      }
    }

    console.log('Database seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
