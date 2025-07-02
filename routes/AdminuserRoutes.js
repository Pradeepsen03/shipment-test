const express = require('express');
const { registerUser, getUserById, getAllUsers, deleteUserById, editUserDetails } = require('../controllers/AdminCreateUsers');
const { loginUser, refreshAccessToken } = require('../controllers/AdminAuthController');
const verifyToken = require('../utils/VerifyToken'); // Import the verifyToken middleware

const router = express.Router();

// POST route to register a new user
router.post('/registeruser', verifyToken, registerUser);
router.post('/updateuser', verifyToken, editUserDetails);

// GET route to get user details by ID
router.get('/:id', verifyToken, getUserById);

// Delete route to get user details by ID
router.get('/delete/:id', verifyToken, deleteUserById);

// POST route to login a user and get access & refresh tokens
router.post('/login', loginUser);

// POST route to refresh the access token using the refresh token
router.post('/refresh', verifyToken, refreshAccessToken);

// GET route to fetch all users
router.get('/', getAllUsers);

module.exports = router;
