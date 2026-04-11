const nodemailer = require('nodemailer');

const hasEmailConfig =
  process.env.EMAIL_HOST &&
  process.env.EMAIL_PORT &&
  process.env.EMAIL_USER &&
  process.env.EMAIL_PASS;

const transporter = hasEmailConfig
  ? nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: Number(process.env.EMAIL_PORT) === 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })
  : null;

if (transporter) {
  transporter.verify((error) => {
    if (error) {
      console.error('❌ Email transporter error:', error.message);
    } else {
      console.log('✅ Email server is ready');
    }
  });
} else {
  console.warn('⚠️ Email disabled: missing SMTP environment variables');
}

const sendEmail = async (options) => {
  if (!transporter) {
    console.warn('⚠️ Email skipped: transporter not configured');
    return null;
  }

  const mailOptions = {
    from: `"TaxVault Canada" <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    text: options.text,
    html: options.html
  };

  const info = await transporter.sendMail(mailOptions);
  console.log('Email sent:', info.messageId);
  return info;
};