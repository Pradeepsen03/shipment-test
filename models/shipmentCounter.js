const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const counterSchema = new Schema({
    _id: { type: String, required: true }, // Unique identifier for the counter type
    sequence_value: { type: Number, default: 0 }
});

const Counter = mongoose.model("Counter", counterSchema);

module.exports = Counter;
