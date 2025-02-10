import mongoose, { Schema, Document } from 'mongoose';

export interface IVideoView extends Document {
  video: mongoose.Types.ObjectId;
  user?: mongoose.Types.ObjectId;
  viewedAt: Date;
  deviceId?: string;
  ipAddress?: string;
}

const VideoViewSchema = new Schema(
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
    viewedAt: {
      type: Date,
      default: Date.now,
    },
    deviceId: String,
    ipAddress: String,
  },
  { timestamps: true },
);

VideoViewSchema.index({ video: 1, viewedAt: -1 });
VideoViewSchema.index({ video: 1, user: 1 });

export default mongoose.model<IVideoView>('VideoView', VideoViewSchema);
