import mongoose, { Schema, Document } from 'mongoose';

export interface IReport extends Document {
  contentType: 'video' | 'comment';
  content: mongoose.Types.ObjectId;
  reason: string;
  description?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema: Schema = new Schema(
  {
    contentType: {
      type: String,
      enum: ['Video', 'Comment'],
      required: true,
    },
    content: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'contentType',
      required: true,
    },
    reason: {
      type: String,
      required: true,
      enum: [
        'inappropriate',
        'spam',
        'harassment',
        'violence',
        'copyright',
        'other',
      ],
    },
    description: {
      type: String,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
      default: 'pending',
    },
  },
  { timestamps: true },
);

ReportSchema.index({ contentType: 1, content: 1, reporter: 1 });
ReportSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model<IReport>('Report', ReportSchema);
