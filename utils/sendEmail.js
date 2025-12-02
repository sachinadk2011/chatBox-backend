const resend = require('resend');

const resendClient = new resend.Resend(process.env.RESEND_API_KEY);

const sendEmail = async(userEmail, otpcode) => {
  try {
    const email = await resendClient.emails.send({
        from: process.env.RESEND_EMAIL_FROM,
        to: userEmail,
        subject: "Verification Email",
        html: `<html>
  <body style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
    <div style="max-width: 500px; margin: auto; background: #fff; padding: 30px; border-radius: 8px; text-align: center; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
      <h2 style="color: #333;">ChatWave Verification Code</h2>
      <p style="font-size: 18px; margin: 20px 0; color: #555;">
        Your code is:
        <span style="font-weight: bold; font-size: 24px; color: #1a73e8;">${otpcode}</span>
      </p>
      <p style="font-size: 14px; color: #888;">This code will expire in 10 minutes.</p>
    </div>
  </body>
</html>
`,
    });
    console.log('Email sent successfully:', email);
  } catch (error) {
    console.error('Error sending email:', error);
    return error.error;
  }
}

module.exports = sendEmail;