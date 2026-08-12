const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendSavedSearchAlert(toEmail, property) {
  try {
    await resend.emails.send({
      from: 'Vishwa Developers <onboarding@resend.dev>',
      to: toEmail,
      subject: `New match: ${property.title}`,
      html: `
        <h2>${property.title}</h2>
        <p>${property.location}</p>
        <p><strong>${property.price}</strong></p>
        <p><a href="${process.env.BASE_URL}/property-details.html?id=${property.id}">View this property &rarr;</a></p>
        <hr>
        <p style="color:#888;font-size:12px;">You're receiving this because you saved a search on Vishwa Developers.</p>
      `
    });
    return true;
  } catch (err) {
    console.error('Email send failed:', err.message);
    return false;
  }
}

async function sendPasswordResetEmail(toEmail, token) {
  try {
    await resend.emails.send({
      from: 'Vishwa Developers <onboarding@resend.dev>',
      to: toEmail,
      subject: 'Reset your password - Vishwa Developers',
      html: `
        <h2>Password Reset Request</h2>
        <p>You requested to reset your password. Click the link below to set a new one:</p>
        <p><a href="${process.env.BASE_URL}/reset-password.html?token=${token}">Reset Password</a></p>
        <p>If you did not request this, please ignore this email.</p>
      `
    });
    return true;
  } catch (err) {
    console.error('Password reset email failed:', err.message);
    return false;
  }
}

module.exports = { sendSavedSearchAlert, sendPasswordResetEmail };
