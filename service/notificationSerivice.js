const admin = require("../configuration/firebase");
const Session = require("../models/UserSession");

const sendNotification = async (receiverId, payload) => {
  try {
    const sessions = await Session.find({
      userId: receiverId,
      isActive: true,
      fcmToken: { $ne: null },
    });

    const tokens = sessions.map((s) => s.fcmToken).filter(Boolean);

    if (!tokens.length) {
      console.log("No valid FCM tokens found for user:", receiverId);
      return;
    }

    const messageBody =
      payload.types === "text"
        ? payload.message
        : payload.types === "multiple"
        ? "📎 Sent multiple files"
        : payload.types === "video"
        ? "📹 Sent a video"
        : payload.types === "image"
        ? "🖼️ Sent an image"
        : payload.types === "audio"
        ? "🎵 Sent an audio file"
        : "sent you an attachment 📎";

    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: {
        title: payload.sender?.name || "New Message",
        body: messageBody,
      },
      data: {
        senderId: String(payload.sender?._id || payload.sender || ""),
        type: payload.types || "text",
        click_action: "FLUTTER_NOTIFICATION_CLICK", // helps mobile
      },
      webpush: {
        fcmOptions: {
          link: `${process.env.FRONTEND_URL}/chat/${payload.sender?._id || ""}`,
        },
        notification: {
          icon: "https://res.cloudinary.com/df4pswtdc/image/upload/w_100,h_100,c_fit/chat_waves%20logo/vyxmokk7tiorkopsxlei.png",
          badge: "https://res.cloudinary.com/df4pswtdc/image/upload/w_100,h_100,c_fit/chat_waves%20logo/vyxmokk7tiorkopsxlei.png",
        },
      },
    });

    // Clean up invalid/expired tokens
    response.responses.forEach(async (resp, idx) => {
      if (
        !resp.success &&
        (resp.error?.code === "messaging/invalid-registration-token" ||
          resp.error?.code === "messaging/registration-token-not-registered")
      ) {
        console.warn("Removing stale FCM token:", tokens[idx]);
        await Session.updateOne(
          { fcmToken: tokens[idx] },
          { $set: { fcmToken: null } }
        );
      }
    });

    return response;
  } catch (error) {
    console.error("Error sending FCM notification:", error);
    // No res here — just log, don't crash the socket handler
  }
};

module.exports = { sendNotification };