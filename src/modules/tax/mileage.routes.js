const express = require('express');
const router = express.Router();
const { protect } = require('../../shared/middleware/auth.middleware');

// @desc    Get all mileage entries
// @route   GET /api/mileage
// @access  Private
router.get('/', protect, (req, res) => {
    res.json({
        success: true,
        message: 'Mileage routes working',
        data: []
    });
});

// @desc    Create mileage entry
// @route   POST /api/mileage
// @access  Private
router.post('/', protect, (req, res) => {
    res.json({
        success: true,
        message: 'Mileage entry created',
        data: req.body
    });
});

// @desc    Get single mileage entry
// @route   GET /api/mileage/:id
// @access  Private
router.get('/:id', protect, (req, res) => {
    res.json({
        success: true,
        message: `Getting mileage entry ${req.params.id}`,
        data: { id: req.params.id }
    });
});

// @desc    Update mileage entry
// @route   PUT /api/mileage/:id
// @access  Private
router.put('/:id', protect, (req, res) => {
    res.json({
        success: true,
        message: `Updating mileage entry ${req.params.id}`,
        data: { id: req.params.id, ...req.body }
    });
});

// @desc    Delete mileage entry
// @route   DELETE /api/mileage/:id
// @access  Private
router.delete('/:id', protect, (req, res) => {
    res.json({
        success: true,
        message: `Deleting mileage entry ${req.params.id}`
    });
});

module.exports = router;













