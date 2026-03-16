const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

router.get('/', protect, (req, res) => {
    res.json({ success: true, message: 'CA routes working' });
});

module.exports = router;