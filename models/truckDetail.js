const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const truckDetailSchema = new Schema({
    driver_name: {
        type: String,
        required: true
    },
    mobile_number: {
        type: String,
        required: true
    },
    truck_number: {
        type: String,
        required: true
    },
    created_by: {
        type: Schema.Types.ObjectId,
        ref: "Users",
        required: true
    },
    updated_by: {
        type: Schema.Types.ObjectId,
        ref: "Users",
        required: true
    },
    arrival_date: {
        type: Date
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    }
})

module.exports = mongoose.model("TruckDetails", truckDetailSchema);