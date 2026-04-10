const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// Verify transporter
transporter.verify((error, success) => {
    if (error) {
        console.error('Email transporter error:', error);
    } else {
        console.log('✅ Email server is ready');
    }
});

// Send email
const sendEmail = async (options) => {
    try {
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
    } catch (error) {
        console.error('Email send error:', error);
        throw new Error('Failed to send email');
    }
};

// Welcome email
const sendWelcomeEmail = async (user) => {
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #005A9C; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; }
                .button { 
                    background-color: #FF6B35; 
                    color: white; 
                    padding: 12px 24px; 
                    text-decoration: none; 
                    border-radius: 4px;
                    display: inline-block;
                    margin: 20px 0;
                }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Welcome to TaxVault Canada! 🇨🇦</h1>
                </div>
                <div class="content">
                    <h2>Hi ${user.name},</h2>
                    <p>Thanks for joining TaxVault Canada! We're excited to help you organize your taxes year-round.</p>
                    
                    <h3>Getting Started:</h3>
                    <ul>
                        <li>📸 Snap your first receipt</li>
                        <li>📍 Enable mileage tracking</li>
                        <li>📊 View your tax dashboard</li>
                        <li>👔 Connect with your CA (optional)</li>
                    </ul>
                    
                    <a href="${process.env.FRONTEND_URL}/dashboard" class="button">Go to Dashboard</a>
                    
                    <p>Your data is securely stored on Canadian servers with bank-level encryption.</p>
                    
                    <p>Questions? Just reply to this email!</p>
                    
                    <p>Best regards,<br>The TaxVault Team</p>
                </div>
                <div class="footer">
                    <p>© 2024 TaxVault Canada. All rights reserved.</p>
                    <p>100 Queen Street, Suite 100, Toronto, ON M5H 2N2</p>
                </div>
            </div>
        </body>
        </html>
    `;

    return sendEmail({
        email: user.email,
        subject: 'Welcome to TaxVault Canada!',
        html
    });
};

// Password reset email
const sendPasswordResetEmail = async (user, resetToken) => {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #005A9C; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; }
                .button { 
                    background-color: #FF6B35; 
                    color: white; 
                    padding: 12px 24px; 
                    text-decoration: none; 
                    border-radius: 4px;
                    display: inline-block;
                    margin: 20px 0;
                }
                .warning { color: #ED6A5E; font-weight: bold; }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Password Reset Request</h1>
                </div>
                <div class="content">
                    <h2>Hi ${user.name},</h2>
                    <p>We received a request to reset your TaxVault Canada password.</p>
                    
                    <p>Click the button below to reset your password. This link is valid for 10 minutes.</p>
                    
                    <a href="${resetUrl}" class="button">Reset Password</a>
                    
                    <p class="warning">If you didn't request this, please ignore this email or contact support if you're concerned.</p>
                    
                    <p>Stay secure,<br>The TaxVault Team</p>
                </div>
                <div class="footer">
                    <p>© 2024 TaxVault Canada. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    return sendEmail({
        email: user.email,
        subject: 'TaxVault Canada - Password Reset',
        html
    });
};

// CA invitation email
const sendCAInvitationEmail = async (userEmail, caName, invitationToken) => {
    const acceptUrl = `${process.env.FRONTEND_URL}/ca-invitation/${invitationToken}`;
    
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #005A9C; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; }
                .button { 
                    background-color: #FF6B35; 
                    color: white; 
                    padding: 12px 24px; 
                    text-decoration: none; 
                    border-radius: 4px;
                    display: inline-block;
                    margin: 20px 0;
                }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>CA Access Invitation</h1>
                </div>
                <div class="content">
                    <h2>Hello,</h2>
                    <p><strong>${caName}</strong> has invited you to access their tax documents on TaxVault Canada.</p>
                    
                    <p>As their Chartered Accountant, you'll be able to:</p>
                    <ul>
                        <li>📁 View and download organized receipts</li>
                        <li>📊 Access expense summaries</li>
                        <li>📈 Review mileage logs</li>
                        <li>✅ Request missing documents</li>
                    </ul>
                    
                    <a href="${acceptUrl}" class="button">Accept Invitation</a>
                    
                    <p>If you don't have a TaxVault account yet, you'll be able to create one when you click the link.</p>
                    
                    <p>Questions? Contact support.</p>
                    
                    <p>Best regards,<br>The TaxVault Team</p>
                </div>
                <div class="footer">
                    <p>© 2024 TaxVault Canada. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    return sendEmail({
        email: userEmail,
        subject: `${caName} invited you to TaxVault Canada`,
        html
    });
};

// Tax deadline reminder
const sendDeadlineReminder = async (user) => {
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #ED6A5E; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; }
                .button { 
                    background-color: #FF6B35; 
                    color: white; 
                    padding: 12px 24px; 
                    text-decoration: none; 
                    border-radius: 4px;
                    display: inline-block;
                    margin: 20px 0;
                }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>⏰ Tax Deadline Reminder</h1>
                </div>
                <div class="content">
                    <h2>Hi ${user.name},</h2>
                    <p>The tax deadline is approaching! Here's your current status:</p>
                    
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p><strong>📸 Receipts:</strong> ${user.receiptCount || 0} uploaded</p>
                        <p><strong>📍 Mileage:</strong> ${user.mileageKm || 0} km tracked</p>
                        <p><strong>📄 Documents:</strong> ${user.documentCount || 0}/10 required</p>
                    </div>
                    
                    <p>Don't wait until the last minute!</p>
                    
                    <a href="${process.env.FRONTEND_URL}/dashboard" class="button">Complete Your Profile</a>
                    
                    <p>Stay organized,<br>The TaxVault Team</p>
                </div>
                <div class="footer">
                    <p>© 2024 TaxVault Canada. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    return sendEmail({
        email: user.email,
        subject: '⏰ Tax Deadline Reminder - TaxVault Canada',
        html
    });
};

module.exports = {
    sendEmail,
    sendWelcomeEmail,
    sendPasswordResetEmail,
    sendCAInvitationEmail,
    sendDeadlineReminder
};












