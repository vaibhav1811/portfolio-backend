const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
    name: { type: String, default: "Vaibhav Kumar" },
    bio: { type: String },
    email: { type: String },
    phone: { type: String },
    address: { type: String }
});

module.exports = mongoose.model('Settings', SettingsSchema);
