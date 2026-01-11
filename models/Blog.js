const mongoose = require('mongoose');

const BlogSchema = new mongoose.Schema({
    id: { type: Number, required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    img: { type: String },
    tags: { type: [String], default: [] },
    link: { type: String }, // External Blog Link
    date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Blog', BlogSchema);
