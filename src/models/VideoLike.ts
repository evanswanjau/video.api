import mongoose, { Schema, Document } from 'mongoose';

export interface IVideoLike extends Document {
  video: mongoose.Types.ObjectId;
  user?: mongoose.Types.ObjectId;
  deviceId: string;
  ipAddress: string;
  type: 'like' | 'dislike';
  createdAt: Date;
}

const VideoLikeSchema = new Schema(
  {
    video: {
      type: Schema.Types.ObjectId,
      ref: 'Video',
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    deviceId: {
      type: String,
      required: true,
    },
    ipAddress: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['like', 'dislike'],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

VideoLikeSchema.index(
  {
    video: 1,
    deviceId: 1,
    ipAddress: 1
  },
  { 
    unique: true,
    background: true,
    name: 'video_device_ip_unique' 
  }
);

export default mongoose.model<IVideoLike>('VideoLike', VideoLikeSchema);