const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const roleSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    slug: {
        type: String,
        required: true,
    },
    is_active: {
        type: Boolean,
        default: true
    }

});

module.exports = mongoose.model("Roles", roleSchema);
