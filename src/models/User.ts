import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  username: string;
  firstName: string;
  lastName: string;
  country: string;
  profilePhoto?: string;
  emailActivated: boolean;
  role: 'admin' | 'user';
  status: 'active' | 'inactive';
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
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    username: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    country: {
      type: String,
      required: true,
      trim: true,
    },
    profilePhoto: {
      type: String,
      default: 'default-profile.png',
    },
    emailActivated: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ['admin', 'user'],
      default: 'user',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'banned'],
      default: 'active',
    },
    acceptMarketing: {
      type: Boolean,
      default: false,
    },
    acceptTerms: {
      type: Boolean,
      default: false,
    },
    credits: {
      type: Number,
      default: 5,
    },
    subscriptionTier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionTier',
    },
    subscriptionEndDate: {
      type: Date,
    },
    lastCreditRefresh: {
      type: Date,
      default: Date.now,
    },
    nextCreditRefreshDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.password;
        return ret;
      },
    },
  },
);

userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

userSchema.index({ email: 1, username: 1 });
userSchema.index({ status: 1 });
userSchema.index({ role: 1 });

export default mongoose.model<IUser>('User', userSchema);
