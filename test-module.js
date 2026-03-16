// test-model.js
console.log('Testing User model import...');

try {
    const User = require('./models/User');
    console.log('✅ User model loaded successfully!');
    console.log('User model functions:', Object.keys(User));
} catch (error) {
    console.error('❌ Error loading User model:', error);
}