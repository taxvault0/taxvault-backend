const express = require('express');
const router = express.Router();

const { protect } = require('../../shared/middleware/auth.middleware');
const taxCaseNoteController = require('./tax-case-note.controller');

router.use(protect);

router.post('/:taxCaseId', taxCaseNoteController.createNote);
router.get('/:taxCaseId', taxCaseNoteController.getNotes);
router.patch('/read/:noteId', taxCaseNoteController.markAsRead);

module.exports = router;













