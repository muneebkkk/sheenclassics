const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User'); // make sure path is correct
const bcrypt = require('bcrypt');

async function createAdmin(username, email, password) {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        // Check if user already exists
        const existing = await User.findOne({ email });
        if (existing) {
            console.log('User with this email already exists');
            process.exit(0);
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create admin user
        const admin = new User({
            username,
            email,
            password: hashedPassword,
            isAdmin: true
        });

        await admin.save();
        console.log('Admin user created successfully');
        process.exit(0);

    } catch (err) {
        console.error('Error creating admin:', err);
        process.exit(1);
    }
}

// ✅ Example usage
// Replace these with the username/email/password you want
createAdmin('Salman Adil', 'msalmanadil44@gmail.com', 'Salman123');