const express = require('express');
const {createTruckType, getAllTruckTypes, editTruckType, getTruckById}=require('../controllers/TrucksType')
const router = express.Router();

router.post('/createtrucktype', createTruckType);
router.get('/getalltrucktype', getAllTruckTypes);
router.post('/updatetruck', editTruckType);
router.get('/gettruckdetails/:id', getTruckById);
// truck routes 
// router.post('/createtruck', AddTruckDetails);
// router.post('/assigndocknumber', assignDockNumber);
// router.get('/getintruck/:shipmentId/', getInTruck);




module.exports = router;
