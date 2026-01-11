const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
    id: { type: Number, required: true },
    title: { type: String, required: true },
    category: { type: String, default: 'web' },
    img: { type: String },
    desc: { type: String },
    link: { type: String } // External Project Link
});

module.exports = mongoose.model('Project', ProjectSchema);
