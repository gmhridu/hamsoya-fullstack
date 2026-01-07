import { Resend } from "resend";

interface ResendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendResendEmail = async (options: ResendEmailOptions) => {
  try {
    const result = await resend.emails.send({
      from: "Hamsoya <noreply@hamsoya.com>",
      to: [options.to],
      subject: options.subject,
      html: options.html,
    });
    console.log(`✅ Resend email sent successfully. ID: ${result.data?.id}`);
    return result;
  } catch (error) {
    console.error("❌ Failed to send Resend email:", error);
    throw error;
  }
};

export const sendOTPVerificationEmail = async (
  email: string,
  name: string,
  otp: string
) => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email - Hamsoya</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h1 style="color: #333; text-align: center; margin-bottom: 30px;">Verify Your Email</h1>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">Hi ${name},</p>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">Your verification code is:</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 24px; font-weight: bold; color: #4CAF50; background-color: #f0f8f0; padding: 15px 25px; border-radius: 5px; border: 2px dashed #4CAF50;">${otp}</span>
          </div>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">Please use this code to verify your email address.</p>
          <p style="color: #999; font-size: 14px; margin-top: 30px;">If you didn't request this code, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 14px; text-align: center;">Best regards,<br>Hamsoya Team</p>
        </div>
      </body>
    </html>
  `;

  await sendResendEmail({
    to: email,
    subject: "Verify Your Email - Hamsoya",
    html,
  });
};
