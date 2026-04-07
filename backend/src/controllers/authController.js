const User = require('../models/User')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const register = async (req, res) => {
  try {
    const { playerId, displayName, email, password } = req.body

    const existingUser = await User.findOne({
      $or: [{ playerId }, { email }]
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
    const { playerId, password } = req.body

    const user = await User.findOne({ playerId })

    if (!user) {
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