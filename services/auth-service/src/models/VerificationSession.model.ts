import mongoose, { Schema, Document } from 'mongoose';

export interface IVerificationSession extends Document {
  verificationId: string;
  phoneNumber: string;
  code: string;
  expiresAt: Date;
  attempts: number;
  createdAt: Date;
}

const VerificationSessionSchema = new Schema<IVerificationSession>({
  verificationId: { type: String, required: true, unique: true },
  phoneNumber: { type: String, required: true },
  code: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
}, {
  timestamps: true,
});

// Auto-delete expired sessions
VerificationSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const VerificationSession = mongoose.model<IVerificationSession>('VerificationSession', VerificationSessionSchema);
