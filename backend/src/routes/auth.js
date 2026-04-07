const express = require('express');
const router = express.Router()
const authMiddleware = require('../middlewares/auth')
const { register, login, getProfile } = require('../controllers/authController')

router.post('/register', register)
router.post('/login', login)
router.get('/profile', authMiddleware, getProfile)
module.exports = router