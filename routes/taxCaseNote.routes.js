const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth');
const controller = require('../controllers/taxCaseNoteController');

router.use(protect);

router.post('/:taxCaseId', controller.createNote);
router.get('/:taxCaseId', controller.getNotes);
router.patch('/read/:noteId', controller.markAsRead);

module.exports = router;