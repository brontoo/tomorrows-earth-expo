import { Resend } from 'resend';
import { ENV } from './env';

const resend = ENV.resendApiKey ? new Resend(ENV.resendApiKey) : null;

export async function sendVerificationEmail(email: string, token: string, name: string) {
  const verificationLink = `${ENV.appUrl}/verify-email?token=${token}`;
  
  // In development, if no API key is provided, just log the link
  if (!ENV.resendApiKey) {
    console.log("-----------------------------------------");
    console.log(`[Email Mock] To: ${email}`);
    console.log(`[Email Mock] Subject: Verify your email`);
    console.log(`[Email Mock] Body: Hello ${name}, please verify your email by clicking here: ${verificationLink}`);
    console.log("-----------------------------------------");
    return;
  }

  try {
    if (!resend) throw new Error("Resend not initialized");
    await resend.emails.send({
      from: "Tomorrow's Earth Expo <onboarding@resend.dev>", // Replace with your domain when ready
      to: email,
      subject: "Verify your email",
      html: `
        <h1>Hello ${name},</h1>
        <p>Thank you for joining the Tomorrow's Earth Expo!</p>
        <p>Please verify your email address by clicking the link below:</p>
        <a href="${verificationLink}" style="padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Verify Email</a>
        <p>If the button above doesn't work, you can copy and paste this link into your browser:</p>
        <p>${verificationLink}</p>
        <p>This link will expire in 24 hours.</p>
      `,
    });
    console.log(`[Email] Verification email sent to ${email}`);
  } catch (error) {
    console.error(`[Email] Failed to send verification email to ${email}:`, error);
    throw new Error("Failed to send verification email");
  }
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetLink = `${ENV.appUrl}/reset-password?token=${token}`;

  if (!ENV.resendApiKey) {
    console.log("-----------------------------------------");
    console.log(`[Email Mock] To: ${email}`);
    console.log(`[Email Mock] Subject: Reset your password`);
    console.log(`[Email Mock] Body: Reset your password here: ${resetLink}`);
    console.log("-----------------------------------------");
    return;
  }

  try {
    if (!resend) throw new Error("Resend not initialized");
    await resend.emails.send({
      from: "Tomorrow's Earth Expo <onboarding@resend.dev>",
      to: email,
      subject: "Reset your password",
      html: `
        <h1>Password Reset Request</h1>
        <p>You requested a password reset for your account.</p>
        <p>Click the link below to set a new password:</p>
        <a href="${resetLink}" style="padding: 10px 20px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p>If you didn't request this, you can safely ignore this email.</p>
      `,
    });
  } catch (error) {
    console.error(`[Email] Failed to send password reset email to ${email}:`, error);
  }
}
