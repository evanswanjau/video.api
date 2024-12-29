import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  username: string;
  emailActivated: boolean;
  role: string;
  status: string;
  acceptMarketing: boolean;
  acceptTerms: boolean;
  credits: number;
  subscriptionTier: mongoose.Types.ObjectId;
  subscriptionEndDate?: Date;
  lastCreditRefresh: Date;
  nextCreditRefreshDate: Date;
}

const userSchema: Schema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: { type: String, required: true, minlength: 6 },
    username: { type: String, trim: true, unique: true },
    emailActivated: { type: Boolean, default: false },
    role: { type: String, default: 'user' },
    status: { type: String, default: 'active' },
    acceptMarketing: { type: Boolean, default: false },
    acceptTerms: { type: Boolean, default: false },
    credits: { type: Number, default: 5 },
    subscriptionTier: {
      type: mongoose.Types.ObjectId,
      ref: 'SubscriptionTier',
    },
    subscriptionEndDate: { type: Date },
    lastCreditRefresh: { type: Date, default: Date.now },
    nextCreditRefreshDate: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model<IUser>('User', userSchema);
