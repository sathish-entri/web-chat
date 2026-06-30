const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
  const token = generateToken(user._id);

  const userData = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    websites: user.websites,
    isOnline: user.isOnline,
    createdAt: user.createdAt,
  };

  res.status(statusCode).json({
    success: true,
    message,
    token,
    user: userData,
  });
};

module.exports = { generateToken, sendTokenResponse };
