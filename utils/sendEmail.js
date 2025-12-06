const resend = require('resend');

const resendClient = new resend.Resend(process.env.RESEND_API_KEY);

const sendEmail = async(userEmail, otpcode) => {
  try {
    const email = await resendClient.emails.send({
      from: process.env.RESEND_EMAIL_FROM,
      to: userEmail,
      subject: "Verification Email",
      html: `<html>
  <body style="font-family: Arial, sans-serif; background-color: #f4f4f7; margin: 0; padding: 0;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f7; padding: 40px 0;">
      <tr>
        <td align="center">
          <table width="500" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); overflow: hidden;">
            <tr>
              <td style="padding: 30px; text-align: center;">
                <!-- Logo -->
                <img src="https://res.cloudinary.com/df4pswtdc/image/upload/w_100,h_100,c_fit/chat_waves%20logo/vyxmokk7tiorkopsxlei.png" 
                     alt="ChatWave Logo" width="80" height="80" style="margin-bottom: 20px;" />

                <!-- Heading -->
                <h2 style="font-size: 22px; color: #1a73e8; margin: 0 0 10px;">ChatWave Verification Code</h2>

                <!-- Message -->
                <p style="font-size: 16px; color: #555; margin: 0 0 25px;">
                  Please use the code below to verify your account. It will expire in 10 minutes.
                </p>

                <!-- Code box -->
                <div style="font-size: 24px; font-weight: bold; color: #1a73e8; letter-spacing: 4px; background-color: #f0f4ff; padding: 15px 20px; border-radius: 6px; display: inline-block;">
                  ${otpcode}
                </div>

                <!-- Footer -->
                <p style="font-size: 12px; color: #888; margin-top: 25px;">
                  If you did not request this code, please ignore this email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>

  `,

    });
    console.log('Email sent successfully:', email);
    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    throw new { success: false, error: error.message || error.error || "Error sending email" };
  }
}

module.exports = sendEmail;