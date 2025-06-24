const jwt = require('jsonwebtoken');

// Function to generate JWT (access token)
const generateJWT = (userId) => {
  console.log("Generating JWT for user ID:", userId);

  // Ensure JWT_SECRET and JWT_EXPIRATION are available from environment variables
  const secretKey = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRATION || '60d'; // Default expiration if not set

  // Check if the secret is available
  if (!secretKey) {
    throw new Error('JWT_SECRET is not set in environment variables');
  }

  // Generate the JWT
  return jwt.sign({ id: userId }, secretKey, {
    expiresIn: expiresIn,
  });
};

module.exports = { generateJWT };
