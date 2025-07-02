// routes/userRoutes.js
const express = require('express');
const { getAllPlants, createOrUpdatePlant, getPlantById} = require('../controllers/Plant');
const router = express.Router();
router.get('/', getAllPlants); // This is the new route to get all plants
router.post('/', createOrUpdatePlant); // This is the new route to create and update plants
router.get('/:plantId', getPlantById); // This is the new route to get plant by id 

module.exports = router;
