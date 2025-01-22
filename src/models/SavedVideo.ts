import mongoose, { Schema, Document } from 'mongoose';

interface ISavedVideo extends Document {
  user: Schema.Types.ObjectId;
  video: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SavedVideoSchema: Schema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    video: { type: Schema.Types.ObjectId, ref: 'Video', required: true },
  },
  {
    timestamps: true,
  },
);

// Ensure unique combination of user and video
SavedVideoSchema.index({ user: 1, video: 1 }, { unique: true });

const SavedVideo = mongoose.model<ISavedVideo>('SavedVideo', SavedVideoSchema);
export default SavedVideo;
