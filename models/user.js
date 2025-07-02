const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true,
    },
    first_name: {
        type: String,
        required: true,
    },
    last_name: {
        type: String
    },
    mobile_no: {
        type: String
    },
    gender: {
        type: String
    },
    avatar: {
        type: String,
    },
    dob: {
        type: Date
    },
    roleid: {
        type: Schema.Types.ObjectId,
        ref: "Roles",
        required: true,
    },
    plantId: {
        type: Schema.Types.ObjectId,
        ref: "Plant",
    },
    push_notifications: [{
        mobile_id: { type: String, required: true },  // Store mobile ID
        token: { type: String, required: true },     // Push notification token
        device: { type: String, default: "android" },  // Device type (e.g., 'android', 'ios')
        created_at: { type: Date, default: Date.now },  // Time of token registration
        islogin:{ type: Boolean , default: false }
    }],
    transport_company_id: {
        type: Schema.Types.ObjectId,
        ref: "TransportCompany",
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

module.exports = mongoose.model("Users", userSchema);
