const generateOtp = () => {
  return String(Math.floor(100000 + Math.random() * 900000));
};

const GenerateOtpExpiry = ()=>{
  const now = new Date();
  const expiry = new Date(now.getTime() + 10 * 60 * 1000);
  return expiry;
}

module.exports = { generateOtp, GenerateOtpExpiry };