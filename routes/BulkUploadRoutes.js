// routes/userRoutes.js
const express = require('express');
const { BulkuploadTransportCompany, getCompanyMunshiBulkuploads,
    getSuccessRecordsByBulkId, getErrorRecordsByBulkId
} = require('../controllers/bulkupload/TransportCompany');

const { getAllShipments, BulkuploadShipments, getShipmentBulkuploads,
    getSuccessShipmentRecordsByBulkId, getErrorShipmentRecordsByBulkId
} = require("../controllers/bulkupload/ShipmentBulkUpload")
const router = express.Router();

router.post('/company', BulkuploadTransportCompany);
router.post('/company/upload', getCompanyMunshiBulkuploads);
router.post('/company/succes', getSuccessRecordsByBulkId);
router.post('/company/error', getErrorRecordsByBulkId);



// shipment
router.get('/getallshipment', getAllShipments);

router.post('/shipment', BulkuploadShipments);
router.post('/shipment/upload', getShipmentBulkuploads);
router.post('/shipment/succes', getSuccessShipmentRecordsByBulkId);
router.post('/shipment/error', getErrorRecordsByBulkId);

module.exports = router;
