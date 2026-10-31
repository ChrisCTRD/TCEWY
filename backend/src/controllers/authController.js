const User = require('../models/User')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { PLAYER_ID_REGEX, normalizePlayerId } = require('../utils/validators')

const register = async (req, res) => {
  try {
    const { displayName, email, password } = req.body
    const playerId = normalizePlayerId(req.body.playerId)

    if (!PLAYER_ID_REGEX.test(playerId)) {
      return res.status(400).json({ message: 'Player ID must have 3-20 characters: letters, numbers or underscore' })
    }

    if (typeof displayName !== 'string' || !displayName.trim() ||
        typeof email !== 'string' || !email.trim() ||
        typeof password !== 'string' || !password) {
      return res.status(400).json({ message: 'displayName, email and password are required' })
    }

    const existingUser = await User.findOne({
      $or: [{ playerId }, { email: email.trim().toLowerCase() }]
    })

    if (existingUser) {
      return res.status(400).json({ message: 'Player ID or email already in use' })
    }

    const user = await User.create({
        playerId,
        displayName,
        email,
        password
    })

    res.status(201).json({
      message: 'User created successfully',
      user: {
        playerId: user.playerId,
        displayName: user.displayName,
        role: user.role
      }
    })

  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Internal server error', error })
  }
}

const login = async (req, res) => {
  try {
    const { password } = req.body
    const playerId = normalizePlayerId(req.body.playerId)

    const user = await User.findOne(
      typeof email === 'string' && email.trim()
        ? { email: email.trim().toLowerCase() }
        : { playerId }
    )

    if (!user || typeof password !== 'string') {
      return res.status(401).json({ message: 'Invalid Player ID or password' })
    }

    const passwordMatch = await bcrypt.compare(password, user.password)

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid Player ID or password' })
    }

    const token = jwt.sign(
    { id: user._id, playerId: user.playerId, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
    )

    res.status(200).json({
    message: 'Login successful',
    token,
    user: {
        playerId: user.playerId,
        displayName: user.displayName,
        role: user.role
    }
    })

  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Internal server error', error: error.message })
  }
}

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password')

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    res.status(200).json({ user })

  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message })
  }
}

module.exports = { register, login, getProfile }
