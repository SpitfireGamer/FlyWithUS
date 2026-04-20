/* Quick SMTP test — run with: node test-smtp.js */
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import nodemailer from 'nodemailer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

console.log('=== SMTP DEBUG TEST ===');
console.log('SMTP_EMAIL:', process.env.SMTP_EMAIL);
console.log('SMTP_PASSWORD:', process.env.SMTP_PASSWORD ? `${process.env.SMTP_PASSWORD.slice(0,4)}****` : 'NOT SET');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
  tls: { rejectUnauthorized: false },
  debug: true,   // Enable debug output
  logger: true,   // Log to console
});

console.log('\n--- Verifying connection ---');
try {
  await transporter.verify();
  console.log('✅ SMTP Connection verified!\n');
} catch (err) {
  console.error('❌ SMTP verify failed:', err);
  process.exit(1);
}

console.log('--- Sending test email to devacc01@gmail.com ---');
try {
  const info = await transporter.sendMail({
    from: `"FlyWithUS Test" <${process.env.SMTP_EMAIL}>`,
    to: 'devacc01@gmail.com',
    subject: 'FlyWithUS SMTP Test - ' + new Date().toLocaleTimeString(),
    text: 'If you received this, SMTP is working correctly! Code: 123456',
    html: `
      <div style="padding:20px; background:#080d1a; color:#f5e6c8; border-radius:12px; font-family:Arial;">
        <h2>✅ FlyWithUS SMTP Test</h2>
        <p>If you received this email, Gmail SMTP is working correctly!</p>
        <p style="font-size:24px; font-weight:bold; letter-spacing:4px; padding:16px; background:#0d1628; border-radius:8px; text-align:center;">123456</p>
        <p style="color:#888; font-size:12px;">Sent at: ${new Date().toISOString()}</p>
      </div>
    `,
  });
  
  console.log('\n✅ Email sent!');
  console.log('   Message ID:', info.messageId);
  console.log('   Response:', info.response);
  console.log('   Accepted:', info.accepted);
  console.log('   Rejected:', info.rejected);
  console.log('   Envelope:', JSON.stringify(info.envelope));
} catch (err) {
  console.error('\n❌ Send failed:', err);
}

process.exit(0);
