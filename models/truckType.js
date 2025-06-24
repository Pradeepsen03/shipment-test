const mongoose = require("mongoose");
const Schema = mongoose.Schema;
// Truck Type Schema
const truckTypeSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    truck_code: {
        type: String,
        unique: true
    },
    description: {
        type: String
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


truckTypeSchema.pre("save", function (next) {
    const truck = this;
    const objectId = truck._id.toString();
    truck.truck_code = `TRUCKTYPE-${objectId.substring(objectId.length - 6)}`;
    next();
});

module.exports = mongoose.model("TruckTypes", truckTypeSchema);
