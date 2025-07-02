const express = require('express');
const { UserLogin, UserLogout } = require('../controllers/MobileUser');

// Login and Logout API route for mobile App
const router = express.Router();
router.post('/login', UserLogin);

router.post('/logout', UserLogout);

module.exports = router;
