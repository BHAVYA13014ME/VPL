const nodemailer = require('nodemailer');

// Create reusable transporter object using Gmail SMTP
const createTransporter = () => {
  // For development/testing, use a test account or Gmail
  // For production, use a proper email service like SendGrid, Mailgun, etc.

  // If no email credentials, create a test account (for development)
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️ Email credentials not configured. Email functionality will be simulated.');
    return null;
  }

  // Remove spaces from app password if any
  const appPassword = process.env.EMAIL_PASS.replace(/\s/g, '');

  console.log('📧 Configuring email with:', process.env.EMAIL_USER);

  // Use Gmail service for simpler config
  const config = {
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: appPassword,
    },
  };

  const transport = nodemailer.createTransport(config);

  // Verify connection on startup
  transport.verify((error, success) => {
    if (error) {
      console.error('❌ Email transporter verification failed:', error.message);
    } else {
      console.log('✅ Email transporter ready to send emails');
    }
  });

  return transport;
};

const transporter = createTransporter();

/**
 * Send an email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text body
 * @param {string} options.html - HTML body
 */
const sendEmail = async ({ to, subject, text, html }) => {
  const timestamp = new Date().toISOString();
  console.log('\n' + '='.repeat(60));
  console.log('📧 EMAIL SEND ATTEMPT');
  console.log('='.repeat(60));
  console.log('Time:', timestamp);
  console.log('To:', to);
  console.log('Subject:', subject);
  console.log('Has HTML:', !!html);
  console.log('-'.repeat(60));

  // If no transporter (no email config), log and simulate success
  if (!transporter) {
    console.log('⚠️ SIMULATED MODE - No SMTP config');
    console.log('   Content Preview:', text?.substring(0, 150) + '...');
    console.log('   Status: SIMULATED');
    console.log('='.repeat(60) + '\n');
    return { simulated: true, message: 'Email simulated (no SMTP config)' };
  }

  try {
    const mailOptions = {
      from: `"EduVerse" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    };

    console.log('🚀 Sending via SMTP...');
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ EMAIL SENT SUCCESSFULLY');
    console.log('   Message ID:', info.messageId);
    console.log('   Response:', info.response);
    console.log('='.repeat(60) + '\n');
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ EMAIL SEND FAILED');
    console.error('   Error:', error.message);
    console.error('   Code:', error.code);
    console.error('='.repeat(60) + '\n');
    throw error;
  }
};

/**
 * Send password reset email
 * @param {string} email - User's email
 * @param {string} resetToken - Password reset token
 * @param {string} userName - User's name for personalization
 */
const sendPasswordResetEmail = async (email, resetToken, userName = 'User') => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
  
  const subject = 'Password Reset Request - EduVerse';
  
  const text = `
Hello ${userName},

You requested to reset your password for your EduVerse account.

Click the link below to reset your password:
${resetUrl}

This link will expire in 1 hour.

If you didn't request this password reset, please ignore this email or contact support if you have concerns.

Best regards,
The EduVerse Team
  `;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f0f23;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #1a1a2e; border-radius: 16px; overflow: hidden; margin-top: 40px; margin-bottom: 40px;">
    <tr>
      <td style="padding: 40px; text-align: center;">
        <!-- Logo -->
        <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #f39c12 0%, #e74c3c 100%); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 24px;">
          <span style="font-size: 24px; color: white;">📚</span>
        </div>
        
        <h1 style="color: white; font-size: 24px; margin: 0 0 8px 0;">Password Reset Request</h1>
        <p style="color: rgba(255,255,255,0.6); font-size: 16px; margin: 0 0 32px 0;">
          Hello ${userName}, we received a request to reset your password.
        </p>
        
        <!-- Reset Button -->
        <a href="${resetUrl}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #f39c12 0%, #e74c3c 100%); color: white; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
          Reset Password
        </a>
        
        <p style="color: rgba(255,255,255,0.5); font-size: 14px; margin: 32px 0 0 0;">
          This link will expire in 1 hour.
        </p>
        
        <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 32px 0;">
        
        <p style="color: rgba(255,255,255,0.4); font-size: 12px; margin: 0;">
          If you didn't request this password reset, you can safely ignore this email.
        </p>
        <p style="color: rgba(255,255,255,0.4); font-size: 12px; margin: 8px 0 0 0;">
          Or copy this link: <a href="${resetUrl}" style="color: #f39c12;">${resetUrl}</a>
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px; background-color: rgba(0,0,0,0.2); text-align: center;">
        <p style="color: rgba(255,255,255,0.4); font-size: 12px; margin: 0;">
          © 2026 EduVerse. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return sendEmail({ to: email, subject, text, html });
};

/**
 * Send welcome email to new users
 * @param {string} email - User's email
 * @param {string} userName - User's name
 */
const sendWelcomeEmail = async (email, userName) => {
  const subject = 'Welcome to EduVerse! 🎉';
  
  const text = `
Hello ${userName},

Welcome to EduVerse! We're excited to have you join our learning community.

Get started by:
- Exploring our course catalog
- Setting up your profile
- Connecting with other learners

If you have any questions, feel free to reach out to our support team.

Happy learning!
The EduVerse Team
  `;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to EduVerse</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f0f23;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #1a1a2e; border-radius: 16px; overflow: hidden; margin-top: 40px; margin-bottom: 40px;">
    <tr>
      <td style="padding: 40px; text-align: center;">
        <!-- Logo -->
        <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #f39c12 0%, #e74c3c 100%); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 24px;">
          <span style="font-size: 24px; color: white;">📚</span>
        </div>
        
        <h1 style="color: white; font-size: 28px; margin: 0 0 8px 0;">Welcome to EduVerse! 🎉</h1>
        <p style="color: rgba(255,255,255,0.6); font-size: 16px; margin: 0 0 32px 0;">
          Hello ${userName}, we're thrilled to have you in our learning community!
        </p>
        
        <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 24px; margin-bottom: 24px; text-align: left;">
          <p style="color: #f39c12; font-size: 14px; font-weight: 600; margin: 0 0 16px 0;">GET STARTED:</p>
          <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 0 0 12px 0;">✅ Explore our course catalog</p>
          <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 0 0 12px 0;">✅ Set up your profile</p>
          <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 0;">✅ Connect with other learners</p>
        </div>
        
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/courses" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #f39c12 0%, #e74c3c 100%); color: white; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
          Start Learning
        </a>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px; background-color: rgba(0,0,0,0.2); text-align: center;">
        <p style="color: rgba(255,255,255,0.4); font-size: 12px; margin: 0;">
          © 2026 EduVerse. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return sendEmail({ to: email, subject, text, html });
};

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
};
