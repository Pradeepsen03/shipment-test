// routes/userRoutes.js
const express = require('express');
const { getAllRoles } = require('../controllers/Roles');
const router = express.Router();
// GET route to fetch all users
router.get('/', getAllRoles); // This is the new route to get all roles
module.exports = router;
