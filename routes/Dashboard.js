// routes/userRoutes.js
const express = require('express');
const {
    getGIGOTimeWithShipmentData, gettruck,
    getAvrageloadingtime, getLogisticMetrics,
    getAvrageTimeWithLogisticMetrics ,getSupplierComplianceMetrics
} = require('../controllers/Dashboard');
const router = express.Router();

router.get('/gigotimedays', getGIGOTimeWithShipmentData);
router.get('/truck', gettruck);
router.get('/truckloadingtime', getAvrageloadingtime);


router.get('/logisticmetrics', getLogisticMetrics);

router.post('/avragetimelogisticmetrics', getAvrageTimeWithLogisticMetrics);
router.get('/supplierandnonsupplier', getSupplierComplianceMetrics);
module.exports = router;
