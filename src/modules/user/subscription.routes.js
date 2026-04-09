const express = require('express');
const router = express.Router();
const { protect } = require('../../shared/middleware/auth.middleware');

router.get('/', protect, (req, res) => {
    res.json({ success: true, message: 'Subscription routes working' });
});

module.exports = router;













