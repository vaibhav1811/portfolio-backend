const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const axios = require('axios');
require('dotenv').config();

const Project = require('./models/Project');
const Blog = require('./models/Blog');
const Settings = require('./models/Settings');
const Contact = require('./models/Contact');

const app = express();
const PORT = process.env.PORT || 5000;

// 1. Security Headers (Helmet)
app.use(helmet());

// 2. CORS Configuration (Allows requests from frontend)
app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'https://portfolio-frontend-self-six.vercel.app', // Production Vercel App
        process.env.FRONTEND_URL // Add this in Render Environment Variables later
    ].filter(Boolean), // Filters out undefined if ENV is not set
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Explicitly allow these methods
    allowedHeaders: ['Content-Type', 'Authorization', 'password'] // Explicitly allow headers including your custom 'password' header
}));

// 3. Body Parser (Must be BEFORE sanitization)
app.use(express.json({ limit: '10kb' }));

// 4. Data Sanitization (Temporarily Disabled due to IncomingMessage conflict)
// app.use(mongoSanitize());
// app.use(xss());

// 5. Rate Limiting
const limiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 100,
    message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/portfolio')
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB Connection Error:', err));

// Initial Data Seeding
const seedDatabase = async () => {
    try {
        const count = await Settings.countDocuments();
        if (count === 0) {
            await Settings.create({
                name: "Vaibhav Kumar",
                bio: "Frontend Developer crafting high-performance, visually stunning web experiences.",
                email: "vaibhavsharma993@gmail.com",
                address: "Ghaziabad, India"
            });
            console.log('Database seeded with default settings');
        }
    } catch (err) {
        console.error('Seeding Error:', err);
    }
};
seedDatabase();

// Auth Middleware
const auth = (req, res, next) => {
    const { password } = req.headers;
    if (password === process.env.ADMIN_PASSWORD) {
        next();
    } else {
        res.status(401).json({ message: 'Unauthorized' });
    }
};

// --- API ENDPOINTS ---

// Get all data
app.get('/api/data', async (req, res) => {
    try {
        const settings = await Settings.findOne();
        const projects = await Project.find();
        const blogs = await Blog.find().sort({ date: -1 });
        res.json({ settings, projects, blogs });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// Update Settings
app.put('/api/settings', auth, async (req, res) => {
    try {
        const settings = await Settings.findOneAndUpdate({}, req.body, { new: true, upsert: true });
        res.json({ message: 'Settings updated', settings });
    } catch (err) {
        res.status(500).json({ message: 'Error updating settings' });
    }
});

// Add Project
app.post('/api/projects', auth, async (req, res) => {
    try {
        const newProject = await Project.create({ id: Date.now(), ...req.body });
        res.json({ message: 'Project added', project: newProject });
    } catch (err) {
        res.status(500).json({ message: 'Error adding project' });
    }
});

// Update Project (Not currently used in UI, but good to have)
app.put('/api/projects/:id', auth, async (req, res) => {
    try {
        await Project.findOneAndUpdate({ id: req.params.id }, req.body);
        res.json({ message: 'Project updated' });
    } catch (err) {
        res.status(500).json({ message: 'Error updating project' });
    }
});

// Delete Project
app.delete('/api/projects/:id', auth, async (req, res) => {
    try {
        await Project.findOneAndDelete({ id: req.params.id });
        res.json({ message: 'Project deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting project' });
    }
});

// --- BLOG ENDPOINTS ---

// Get all blogs
app.get('/api/blogs', async (req, res) => {
    try {
        const blogs = await Blog.find().sort({ date: -1 });
        res.json(blogs);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching blogs' });
    }
});

// Add Blog
app.post('/api/blogs', auth, async (req, res) => {
    try {
        const newBlog = await Blog.create({ id: Date.now(), ...req.body });
        res.json({ message: 'Blog posted', blog: newBlog });
    } catch (err) {
        res.status(500).json({ message: 'Error adding blog' });
    }
});

// Delete Blog
app.delete('/api/blogs/:id', auth, async (req, res) => {
    try {
        await Blog.findOneAndDelete({ id: req.params.id });
        res.json({ message: 'Blog deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting blog' });
    }
});

// --- CONTACT ENDPOINTS ---

const sendDiscordNotification = async (data) => {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) return;

    try {
        await axios.post(webhookUrl, {
            embeds: [{
                title: "🚀 New Signal Received",
                color: 0x00f3ff, // Neon Cyan
                fields: [
                    { name: "Name", value: data.name, inline: true },
                    { name: "Email", value: data.email, inline: true },
                    { name: "Message", value: data.message }
                ],
                footer: { text: "Portfolio System Notification" },
                timestamp: new Date()
            }]
        });
    } catch (error) {
        console.error("Discord Webhook Error:", error);
    }
};

// Submit Contact Form (Public)
app.post('/api/contact', async (req, res) => {
    try {
        const newContact = await Contact.create({ id: Date.now(), ...req.body });

        // Send Notification (Non-blocking)
        sendDiscordNotification(newContact);

        res.json({ message: 'Message sent successfully', contact: newContact });
    } catch (err) {
        res.status(500).json({ message: 'Error sending message' });
    }
});

// Get Messages (Admin Only)
app.get('/api/contact', auth, async (req, res) => {
    try {
        const messages = await Contact.find().sort({ date: -1 });
        res.json(messages);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching messages' });
    }
});


// Login
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === process.env.ADMIN_PASSWORD) {
        res.json({ success: true, token: 'admin-token' });
    } else {
        res.status(401).json({ success: false, message: 'Invalid password' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
