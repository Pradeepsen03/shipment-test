// routes/userRoutes.js
const express = require('express');
const { registerTransportCompany, getTransportCompanyById,
    getAllTransportCompany, editTransportCompany,
    getMobileAllCompany
} = require('../controllers/AdminCompany');
const router = express.Router();
// GET route to fetch all users

// POST route to register a new transport company
router.post('/create', registerTransportCompany);

// POST route to update an existing transport company
router.post('/update', editTransportCompany);

// GET route to fetch a transport company by its ID
router.get('/:id', getTransportCompanyById);

// GET route to fetch all transport companies
router.get('/', getAllTransportCompany);

router.post("/mobile",getMobileAllCompany)
module.exports = router;
