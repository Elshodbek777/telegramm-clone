import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

let twilioClient: twilio.Twilio | null = null;

if (accountSid && authToken) {
  twilioClient = twilio(accountSid, authToken);
}

export async function sendVerificationCode(phoneNumber: string, code: string): Promise<boolean> {
  // In development mode, just log the code
  if (process.env.NODE_ENV === 'development' || !twilioClient) {
    console.log(`📱 SMS to ${phoneNumber}: Your verification code is ${code}`);
    return true;
  }

  try {
    await twilioClient.messages.create({
      body: `Your Telegram Clone verification code is: ${code}. Valid for 5 minutes.`,
      from: twilioPhoneNumber,
      to: phoneNumber,
    });
    return true;
  } catch (error) {
    console.error('SMS sending error:', error);
    return false;
  }
}
