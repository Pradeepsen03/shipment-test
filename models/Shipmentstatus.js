const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ShipmentstatusSchema = new Schema({
    shipmentID: {
        type: Schema.Types.ObjectId,
        ref: "Shipments"
    },
    shipment_status: {
        type: String,
        required: true
    },
    userID: {
        type: Schema.Types.ObjectId,
        ref: "Users"
    },
    created_at: {
        type: Date,
        default: Date.now,
    },
    updated_at: {
        type: Date,
        default: Date.now,
    },
});


module.exports = mongoose.model("Shipmentstatus", ShipmentstatusSchema);
