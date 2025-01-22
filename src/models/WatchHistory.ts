import mongoose, { Schema, Document } from 'mongoose';

interface IWatchHistory extends Document {
  user: Schema.Types.ObjectId;
  video: Schema.Types.ObjectId;
  watchedAt: Date;
}

const WatchHistorySchema: Schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  video: { type: Schema.Types.ObjectId, ref: 'Video', required: true },
  watchedAt: { type: Date, default: Date.now },
});

const WatchHistory = mongoose.model<IWatchHistory>('WatchHistory', WatchHistorySchema);

export default WatchHistory;
