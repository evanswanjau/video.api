import mongoose, { Schema, Document } from 'mongoose';

export interface IComment extends Document {
  content: string;
  user: mongoose.Types.ObjectId;
  video: mongoose.Types.ObjectId;
  parentComment?: mongoose.Types.ObjectId;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema: Schema = new Schema({
  content: { type: String, required: true },
  user: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
  video: { type: mongoose.Types.ObjectId, ref: 'Video', required: true },
  parentComment: { type: mongoose.Types.ObjectId, ref: 'Comment', default: null },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, {
  timestamps: true,
});

CommentSchema.index({ video: 1, createdAt: -1 });

export default mongoose.model<IComment>('Comment', CommentSchema);