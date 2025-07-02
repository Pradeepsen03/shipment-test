const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const plantSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true
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
    pin_code: {
        type: String,
    },
    created_at: {
        type: Date,
        default: Date.now,
    },
    updated_at: {
        type: Date,
        default: Date.now,
    }
});

module.exports = mongoose.model("Plants", plantSchema);