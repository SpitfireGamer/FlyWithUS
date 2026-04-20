import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

async function testPlainEmail() {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD,
    },
    tls: { rejectUnauthorized: false }
  });

  try {
    console.log('Sending ultra-plain test email to devacc01@gmail.com...');
    const info = await transporter.sendMail({
      from: process.env.SMTP_EMAIL, // No name, just email to look less like a newsletter
      to: 'devacc01@gmail.com',
      subject: 'Test message',
      text: 'Hello, this is a test. The code is: 123456.',
    });
    console.log('✅ Sent! MessageId:', info.messageId);
  } catch (err) {
    console.error('❌ Failed:', err);
  }
}

testPlainEmail();
