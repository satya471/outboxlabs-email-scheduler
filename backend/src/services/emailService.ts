import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: "smtp.ethereal.email",
  port: 587,
  secure: false,
  auth: {
    user: process.env.ETHEREAL_USER,
    pass: process.env.ETHEREAL_PASS,
  },
});

export async function sendEmail(
  to: string,
  subject: string,
  text: string,
  sender?: string
) {
  const info = await transporter.sendMail({
    from: sender || process.env.EMAIL_FROM || "sender@example.com",
    to,
    subject,
    text,
  });

  console.log("Email sent:", info.messageId);

  return info;
}