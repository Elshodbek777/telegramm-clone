import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  userId: string;
  phoneNumber: string;
  displayName: string;
  firstName: string;
  lastName: string;
  username: string;
  bio: string;
  profilePhotoUrl: string;
  isOnline: boolean;
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  userId: { type: String, required: true, unique: true },
  phoneNumber: { type: String, required: true, unique: true },
  displayName: { type: String, default: '' },
  firstName: { type: String, default: '' },
  lastName: { type: String, default: '' },
  username: { type: String, default: '' },
  bio: { type: String, default: '' },
  profilePhotoUrl: { type: String, default: '' },
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
}, {
  timestamps: true,
});

// Index for search
UserSchema.index({ displayName: 'text', firstName: 'text', lastName: 'text', username: 'text', phoneNumber: 'text' });

export const User = mongoose.model<IUser>('User', UserSchema);
