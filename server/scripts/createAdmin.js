require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');
const User = require('../models/User');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper to prompt for input
const question = (query) => {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
};

// Helper to prompt for password (hidden input)
const questionPassword = (query) => {
  return new Promise((resolve) => {
    process.stdout.write(query);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    
    let password = '';
    const onData = (char) => {
      char = char.toString();
      
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004': // Ctrl+D
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.removeListener('data', onData);
          process.stdout.write('\n');
          resolve(password);
          break;
        case '\u0003': // Ctrl+C
          process.exit();
          break;
        case '\u007f': // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.write('\b \b');
          }
          break;
        default:
          password += char;
          process.stdout.write('*');
          break;
      }
    };
    
    process.stdin.on('data', onData);
  });
};

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/campusconnect';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get admin emails from .env
    const ADMIN_EMAILS = process.env.ADMIN_EMAILS;
    
    if (!ADMIN_EMAILS) {
      console.error('❌ ERROR: ADMIN_EMAILS not found in .env file');
      console.log('\nPlease add this to your .env file:');
      console.log('ADMIN_EMAILS=gnana.priyanka@adypu.edu.in');
      process.exit(1);
    }

    const adminEmails = ADMIN_EMAILS.split(',').map(e => e.trim().toLowerCase());
    console.log(`📧 Found ${adminEmails.length} admin email(s) in .env:`);
    adminEmails.forEach((email, index) => {
      console.log(`   ${index + 1}. ${email}`);
    });
    console.log('');

    // Process each admin email
    for (const email of adminEmails) {
      console.log(`\n🔧 Processing: ${email}`);
      
      // Check if user already exists
      const existingUser = await User.findOne({ email });
      
      if (existingUser) {
        if (existingUser.role === 'admin') {
          console.log(`   ⚠️  User already exists and is already an admin`);
          
          const update = await question('   Do you want to update the password? (y/n): ');
          if (update.toLowerCase() === 'y') {
            const password = await questionPassword('   Enter new password (min 6 characters): ');
            
            if (password.length < 6) {
              console.log('   ❌ Password must be at least 6 characters');
              continue;
            }
            
            existingUser.password = password;
            await existingUser.save();
            console.log('   ✅ Password updated successfully');
          }
          continue;
        } else {
          console.log(`   ⚠️  User exists but is not an admin`);
          const promote = await question('   Do you want to promote to admin? (y/n): ');
          
          if (promote.toLowerCase() === 'y') {
            existingUser.role = 'admin';
            await existingUser.save();
            console.log('   ✅ User promoted to admin successfully');
          }
          continue;
        }
      }

      // Create new admin user
      const password = await questionPassword('   Enter password (min 6 characters): ');
      
      if (password.length < 6) {
        console.log('   ❌ Password must be at least 6 characters');
        continue;
      }

      const confirmPassword = await questionPassword('   Confirm password: ');
      
      if (password !== confirmPassword) {
        console.log('   ❌ Passwords do not match');
        continue;
      }

      // Create user
      const user = new User({
        email,
        password,
        role: 'admin'
      });

      await user.save();
      console.log(`   ✅ Admin user created successfully!`);
    }

    console.log('\n✨ All admin users processed!');
    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run the script
createAdmin();