import mongoose, { Schema, Document } from 'mongoose';

export interface IActivity extends Document {
  user: mongoose.Types.ObjectId;
  type: string;
  action: string;
  target: mongoose.Types.ObjectId;
  targetType: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const ActivitySchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['video', 'comment', 'like', 'subscription', 'watch', 'save'],
    },
    action: {
      type: String,
      required: true,
      enum: [
        'create',
        'update',
        'delete',
        'view',
        'like',
        'dislike',
        'save',
        'report',
      ],
    },
    target: {
      type: Schema.Types.ObjectId,
      refPath: 'targetType',
      required: true,
    },
    targetType: {
      type: String,
      required: true,
      enum: ['Video', 'Comment', 'User'],
    },
    metadata: {
      type: Map,
      of: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  },
);

ActivitySchema.index({ user: 1, createdAt: -1 });
ActivitySchema.index({ type: 1, action: 1 });

export default mongoose.model<IActivity>('Activity', ActivitySchema);
