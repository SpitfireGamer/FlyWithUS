/* ═══════════════════════════════════════════════════════════════
   EMAIL UTILITY — Using EmailJS API (Secure Mode)
   ═══════════════════════════════════════════════════════════════ */

export function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendVerificationEmail(toEmail, code, userName) {
  const serviceId = process.env.EMAILJS_SERVICE_ID;
  const templateId = process.env.EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.EMAILJS_PUBLIC_KEY;
  const privateKey = process.env.EMAILJS_PRIVATE_KEY;

  const htmlBody = `
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; background: #080d1a; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #f5e6c8; font-size: 24px; margin: 0;">FlyWithUS</h1>
        <p style="color: rgba(234,229,220,0.3); font-size: 12px; letter-spacing: 3px; text-transform: uppercase; margin-top: 4px;">EMAIL VERIFICATION</p>
      </div>
      <div style="background: #0d1628; border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 32px; text-align: center;">
        <p style="color: rgba(234,229,220,0.7); font-size: 14px; margin: 0 0 8px;">Hello ${userName || 'there'},</p>
        <p style="color: rgba(234,229,220,0.5); font-size: 13px; margin: 0 0 24px;">Enter this code to verify your email address:</p>
        <div style="background: rgba(234,229,220,0.05); border: 1px solid rgba(74,139,181,0.3); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #f5e6c8;">${code}</span>
        </div>
        <p style="color: rgba(234,229,220,0.3); font-size: 12px; margin: 0;">This code expires in 10 minutes</p>
      </div>
    </div>
  `;

  if (!serviceId || !templateId || !publicKey) {
    console.log(`\n══════════════════════════════════════`);
    console.log(`  📧 OTP (Console Fallback)`);
    console.log(`  To: ${toEmail}`);
    console.log(`  Code: ${code}`);
    console.log(`══════════════════════════════════════\n`);
    return true;
  }

  // We pass these variables into the EmailJS template.
  const payload = {
    service_id: serviceId,
    template_id: templateId,
    user_id: publicKey,
    accessToken: privateKey,
    template_params: {
      to_email: toEmail,
      to_name: userName || 'Customer',
      code: code,
      message: htmlBody
    }
  };

  try {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Mailer] ❌ EmailJS API Error:', errorText);
      return false;
    }

    console.log(`[Mailer] ✅ OTP Delivered via EmailJS to ${toEmail}`);
    return true;
  } catch (err) {
    console.error('[Mailer] ❌ Request Error:', err.message);
    return false;
  }
}
