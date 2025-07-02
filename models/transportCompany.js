const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const transportComapnySchema = new Schema({
    company_name: {
        type: String,
        required: true,
        unique: true
    },
    sap_id: {
        type: String,
    },
    city: {
        type: String,
        required: true
    },
    state: {
        type: String,
    },
    country: {
        type: String,
    },
    munshiId: {
        type: Schema.Types.ObjectId,
        ref: "Users"
    },
    bulkuploadid: {
        type: Schema.Types.ObjectId,
        ref: "bulkupload"
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

module.exports = mongoose.model("TransportCompany", transportComapnySchema);