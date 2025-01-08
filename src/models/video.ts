import mongoose, { Document, Schema } from 'mongoose';
import { ITag } from './Tag';
import { IComment } from './Comment';

interface IVideo extends Document {
  title: string;
  description: string;
  filename: string;
  filepath: string;
  size: number;
  mimetype: string;
  status: string;
  duration: number;
  user: mongoose.Schema.Types.ObjectId;
  tags: ITag['_id'][];
  comments: IComment['_id'][];
  thumbnail: string;
  views: number;
  likes: number;
  dislikes: number;
  createdAt: Date;
  updatedAt: Date;
}

const videoSchema: Schema = new Schema<IVideo>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    filename: {
      type: String,
      required: true,
      trim: true,
    },
    filepath: {
      type: String,
      required: true,
      trim: true,
    },
    size: {
      type: Number,
      required: true,
    },
    mimetype: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'active', 'suspended'],
      default: 'pending',
    },
    duration: {
      type: Number,
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tags: [{ type: mongoose.Types.ObjectId, ref: 'Tag' }],
    comments: [{ type: mongoose.Types.ObjectId, ref: 'Comment' }],
    thumbnail: { type: String },
    views: {
      type: Number,
      default: 0,
    },
    likes: {
      type: Number,
      default: 0,
    },
    dislikes: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

// Create a Model.
const Video = mongoose.model<IVideo>('Video', videoSchema);

export default Video;
