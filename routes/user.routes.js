const express = require('express');
const router = express.Router();

// Simple test route - no dependencies
router.get('/', (req, res) => {
    res.json({ 
        success: true, 
        message: 'User routes are working!',
        timestamp: new Date()
    });
});

module.exports = router;