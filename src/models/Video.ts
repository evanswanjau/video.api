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
  status: 'draft' | 'scheduled' | 'published' | 'review' | 'suspended';
  duration: number;
  user: mongoose.Schema.Types.ObjectId;
  tags: ITag['_id'][];
  comments: IComment['_id'][];
  thumbnail: string;
  views: number;
  likes: number;
  dislikes: number;
  scheduledFor?: Date;
  publishedAt?: Date;
  visibility: 'public' | 'private' | 'unlisted';
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
      enum: ['draft', 'scheduled', 'published', 'review', 'suspended'],
      default: 'published',
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
    scheduledFor: {
      type: Date,
      validate: {
        validator: function (this: IVideo, value: Date) {
          if (this.status !== 'scheduled') return true;
          return value && value > new Date();
        },
        message: 'Scheduled date must be in the future',
      },
    },
    publishedAt: {
      type: Date,
      default: function (this: IVideo) {
        return this.status === 'published' ? new Date() : null;
      },
    },
    visibility: {
      type: String,
      enum: ['public', 'private', 'unlisted'],
      default: 'public',
    },
  },
  {
    timestamps: true,
  },
);

videoSchema.index({ isScheduled: 1, scheduledFor: 1 });

videoSchema.pre('save', function (next) {
  if (this.status === 'scheduled' && this.scheduledFor) {
    this.publishedAt = null;
  } else if (this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

videoSchema.virtual('isReadyToPublish').get(function (this: IVideo) {
  return (
    this.status === 'scheduled' &&
    this.scheduledFor &&
    new Date() >= this.scheduledFor
  );
});

videoSchema.index({ title: 'text', description: 'text' });

const Video = mongoose.model<IVideo>('Video', videoSchema);

export default Video;
