const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const bulkuploadLogSchema = new Schema({
    bulkuploadid: {
        type: Schema.Types.ObjectId,
        ref: "bulkupload",
        required: true
    },
    massage: {
        type: String
    },
    records: {
        type: Schema.Types.Mixed
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

module.exports = mongoose.model("bulkuploadLog", bulkuploadLogSchema);