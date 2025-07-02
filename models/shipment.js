const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const shipmentSchema = new Schema({

    shipment_number: {
        type: String,
        unique: true
    },
    shipment_status: {
        type: String,
        required: true
    },
    companyId: {
        type: Schema.Types.ObjectId,
        ref: "TransportCompany",
    },
    dock_number: {
        type: String
    },
    truckTypeId: {
        type: Schema.Types.ObjectId,
        ref: "TruckTypes",
    },
    plantId: {
        type: Schema.Types.ObjectId,
        ref: "Plants",
    },
    destination_pin_code: {
        type: String,
    },
    destination_city: {
        type: String,
    },
    destination_state: {
        type: String,
    },
    destination_country: {
        type: String,
    },
    expected_arrival_date: {
        type: Date,
    },
    actual_arrival_date: {
        type: Date,
    },
    mobile_number: {
        type: String,
    },
    invoice_number: {
        type: String,
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: "Users",
    },
    updatedBy: {
        type: Schema.Types.ObjectId,
        ref: "Users",
    },
    TruckId: {
        type: Schema.Types.ObjectId,
        ref: "TruckDetails"
    },
    bulkuploadid: {
        type: Schema.Types.ObjectId,
        ref: "bulkupload"
    },
    isbulkupload: {
        type: Boolean
    },
    created_at: {
        type: Date,
        default: Date.now,
    },
    updated_at: {
        type: Date,
        default: Date.now,
    },
    active: {
        type: Boolean
    }
});




module.exports = mongoose.model("Shipments", shipmentSchema);
