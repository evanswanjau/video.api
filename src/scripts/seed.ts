import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { faker } from '@faker-js/faker';
import User from '../models/User';
import Tag from '../models/Tag';
import Video from '../models/Video';
import Comment from '../models/Comment';
import fs from 'fs';

dotenv.config();

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || '');

    // Clear existing data
    await User.deleteMany({});
    await Tag.deleteMany({});
    await Video.deleteMany({});
    await Comment.deleteMany({});

    // Create users
    const users = [];
    for (let i = 0; i < 20; i++) {
      const user = new User({
        username: faker.internet.username(),
        email: faker.internet.email(),
        password: 'password123',
        role: i === 0 ? 'admin' : 'user',
      });
      await user.save();
      users.push(user);
    }

    // Create tags
    const tags = [];
    for (let i = 0; i < 10; i++) {
      const tag = new Tag({ name: faker.lorem.word() });
      await tag.save();
      tags.push(tag);
    }

    // Create videos
    const videos = [];
    const videoFiles = fs.readdirSync('uploads/downloads');

    for (const [index, file] of videoFiles.entries()) {
      const title = file
        .replace(/\.[^/.]+$/, '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
      const video = new Video({
        title: title,
        description: faker.lorem.paragraph(),
        filename: file,
        filepath: `uploads/downloads/${file}`,
        size: faker.number.int({ min: 1000, max: 100000 }),
        mimetype: 'video/mp4',
        duration: faker.number.int({ min: 60, max: 3600 }),
        user: users[faker.number.int({ min: 0, max: 19 })]._id,
        tags: [tags[faker.number.int({ min: 0, max: 9 })]._id],
      });
      await video.save();
      videos.push(video);
    }

    // Create comments and replies
    for (const video of videos) {
      for (let i = 0; i < 20; i++) {
        const comment = new Comment({
          content: faker.lorem.sentence(),
          user: users[faker.number.int({ min: 0, max: 19 })]._id,
          video: video._id,
        });
        await comment.save();

        // Create replies for each comment
        for (let j = 0; j < 5; j++) {
          const reply = new Comment({
            content: faker.lorem.sentence(),
            user: users[faker.number.int({ min: 0, max: 19 })]._id,
            video: video._id,
            parentComment: comment._id,
          });
          await reply.save();
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
