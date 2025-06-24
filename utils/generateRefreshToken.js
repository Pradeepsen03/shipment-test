const jwt = require('jsonwebtoken');

// Function to generate a refresh token
const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '7d', // Refresh token expires in 7 days
  });
};

module.exports = { generateRefreshToken };
