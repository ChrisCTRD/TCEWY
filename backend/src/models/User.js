const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    playerId: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        minlength: 3,
        maxlength: 20,
        match: [/^[a-z0-9_]+$/, 'playerId may only contain letters, numbers and underscore']
    },
    displayName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['Player', 'Reaper', 'Composer'],
        default: 'Player'
    },
    bio: {
        type: String,
        default: '',
        trim: true,
        maxlength: 200
    },
    portrait: {
        type: String,
        default: 'neku_default'
    },
    icon: {
        type: String,
        default: 'icon_default'
    },
    background: {
        type: String,
        default: 'shibuya_scramble'
    }
}, {
    timestamps: true
})

userSchema.pre('save', async function() {
  if (!this.isModified('password')) return
  this.password = await bcrypt.hash(this.password, 10)
})

module.exports = mongoose.model('User', userSchema)
