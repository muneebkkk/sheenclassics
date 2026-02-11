const mongoose = require('mongoose');
require('dotenv').config();
const readline = require('readline');
const bcrypt = require('bcrypt');
const User = require('./models/User'); // adjust path if needed

// Setup readline for interactive input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('MongoDB Connected\n');
    mainMenu();
}).catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
});

// Main interactive menu
function mainMenu() {
    console.log('=== Admin Tool ===');
    console.log('1. Create new admin');
    console.log('2. List all users');
    console.log('3. Exit');

    rl.question('Choose an option: ', answer => {
        if (answer === '1') createAdminPrompt();
        else if (answer === '2') listUsers();
        else rl.close();
    });
}

// Create a new admin interactively
function createAdminPrompt() {
    rl.question('Enter username: ', username => {
        rl.question('Enter email: ', email => {
            rl.question('Enter password: ', async password => {
                try {
                    const existing = await User.findOne({ email });
                    if (existing) {
                        console.log('User with this email already exists');
                        return mainMenu();
                    }

                    const hashedPassword = await bcrypt.hash(password, 10);

                    const admin = new User({
                        username,
                        email,
                        password: hashedPassword,
                        isAdmin: true
                    });

                    await admin.save();
                    console.log('Admin user created successfully!\n');
                    mainMenu();

                } catch (err) {
                    console.error('Error creating admin:', err);
                    mainMenu();
                }
            });
        });
    });
}

// List all users
async function listUsers() {
    try {
        const users = await User.find({});
        console.log('\n=== Users ===');
        users.forEach(u => {
            console.log(`ID: ${u._id} | Username: ${u.username} | Email: ${u.email} | Admin: ${u.isAdmin}`);
        });
        console.log('');
        mainMenu();
    } catch (err) {
        console.error(err);
        mainMenu();
    }
}

// Handle exit
rl.on('close', () => {
    console.log('Exiting admin tool');
    mongoose.connection.close();
    process.exit(0);
});