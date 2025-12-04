

function validatePassword(newPassword, user) {
  const errors = [];

  const name = user.name.toLowerCase();
  const email = user.email.toLowerCase();
  const newPass = newPassword.toLowerCase();

  // Split name into parts
  const nameParts = name.split(" ").filter(Boolean);

  // Get email username (before @)
  const emailUser = email.split("@")[0];

  // 1️⃣ Check length
  if (newPassword.length < 8) {
    errors.push("Password must be at least 8 characters long.");
  }

  // 2️⃣ Uppercase letter
  if (!/[A-Z]/.test(newPassword)) {
    errors.push("Password must contain at least one uppercase letter.");
  }

  // 3️⃣ Lowercase letter
  if (!/[a-z]/.test(newPassword)) {
    errors.push("Password must contain at least one lowercase letter.");
  }

  // 4️⃣ Number
  if (!/[0-9]/.test(newPassword)) {
    errors.push("Password must contain at least one number.");
  }

  // 5️⃣ Special character
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
    errors.push("Password must contain at least one special character.");
  }

  // 6️⃣ Not contain full name, name parts, or email username
  if (
    newPass.includes(name) ||
    newPass.includes(emailUser) ||
    nameParts.some(part => newPass.includes(part))
  ) {
    errors.push("Password should not contain your name or email.");
  }

  // 7️⃣ Optional: No more than 3 consecutive letters from name
  for (let part of nameParts) {
    for (let i = 0; i <= part.length - 4; i++) {
      const sub = part.substring(i, i + 4);
      if (newPass.includes(sub)) {
        errors.push(
          "Password should not contain 4 or more consecutive letters from your name."
        );
        break;
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

module.exports = validatePassword;