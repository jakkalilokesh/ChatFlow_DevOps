'use strict';

const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST || 'smtp.gmail.com',
      port:   parseInt(process.env.SMTP_PORT || '587', 10),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: { rejectUnauthorized: false },
    });
  }
  return transporter;
}

const emailTemplates = {
  verification: (username, link) => ({
    subject: '✅ Verify your ChatFlow account',
    html: `
      <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;background:#0a0f1e;color:#f9fafb;padding:32px;border-radius:16px">
        <div style="text-align:center;margin-bottom:24px">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#6c63ff"/><stop offset="100%" stop-color="#4ecdc4"/>
            </linearGradient></defs>
            <path d="M4 8C4 5.79 5.79 4 8 4h24c2.21 0 4 1.79 4 4v18c0 2.21-1.79 4-4 4H22l-6 6v-6H8c-2.21 0-4-1.79-4-4V8z" fill="url(#g)"/>
            <path d="M23 10l-6 10h5l-2 10 8-12h-6l3-8h-2z" fill="white" fill-opacity="0.9"/>
          </svg>
          <h1 style="color:#6c63ff;margin:8px 0 0">ChatFlow</h1>
        </div>
        <h2 style="margin-bottom:8px">Welcome, ${username}! 👋</h2>
        <p style="color:#9ca3af;line-height:1.6">Click the button below to verify your email address and start chatting with your team.</p>
        <div style="text-align:center;margin:24px 0">
          <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#6c63ff,#4ecdc4);color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:600;font-size:16px">
            Verify Email Address
          </a>
        </div>
        <p style="color:#6b7280;font-size:12px;text-align:center">Link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
      </div>`,
  }),

  passwordReset: (username, link) => ({
    subject: '🔑 Reset your ChatFlow password',
    html: `
      <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;background:#0a0f1e;color:#f9fafb;padding:32px;border-radius:16px">
        <div style="text-align:center;margin-bottom:24px">
          <h1 style="color:#6c63ff;margin:0">ChatFlow</h1>
        </div>
        <h2>Password Reset Request 🔑</h2>
        <p style="color:#9ca3af;line-height:1.6">Hi ${username}, someone requested a password reset for your account. Click below to set a new password.</p>
        <div style="text-align:center;margin:24px 0">
          <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#ef4444,#f97316);color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:600;font-size:16px">
            Reset Password
          </a>
        </div>
        <p style="color:#6b7280;font-size:12px;text-align:center">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
      </div>`,
  }),

  welcomeBack: (username) => ({
    subject: '👋 Welcome back to ChatFlow!',
    html: `
      <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;background:#0a0f1e;color:#f9fafb;padding:32px;border-radius:16px">
        <h1 style="color:#6c63ff">ChatFlow</h1>
        <h2>Your account is verified! 🎉</h2>
        <p style="color:#9ca3af">Hi ${username}, your email has been verified. You can now enjoy all ChatFlow features.</p>
        <div style="text-align:center;margin:24px 0">
          <a href="${process.env.FRONTEND_URL}/login" style="display:inline-block;background:linear-gradient(135deg,#6c63ff,#4ecdc4);color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:600">
            Start Chatting
          </a>
        </div>
      </div>`,
  }),
};

async function sendEmail(to, templateName, data) {
  try {
    const { subject, html } = emailTemplates[templateName](...data);
    const info = await getTransporter().sendMail({
      from: process.env.SMTP_FROM || `ChatFlow <noreply@chatflow.app>`,
      to,
      subject,
      html,
    });
    logger.info('Email sent', { messageId: info.messageId, to, template: templateName });
    return info;
  } catch (err) {
    logger.error('Email send failed', { err: err.message, to, template: templateName });
    throw err;
  }
}

module.exports = { sendEmail };
