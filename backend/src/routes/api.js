const express = require('express')
const authMiddleware = require('../middleware/auth')
const currentUser = require('../middleware/currentUser')
const rateLimit = require('../middleware/rateLimit')
const { getMe, updateBio } = require('../controllers/meController')
const {
  getFriends,
  getRequests,
  createRequest,
  acceptRequest,
  declineRequest,
  removeFriend
} = require('../controllers/friendController')
const {
  listConversations,
  openConversation,
  getMessages,
  closeConversation,
  readConversation
} = require('../controllers/conversationController')
const { removeMessage } = require('../controllers/messageController')

const router = express.Router()

router.use(authMiddleware, currentUser)

router.get('/me', getMe)
router.patch('/me/bio', updateBio)

router.get('/friends', getFriends)
router.get('/friends/requests', getRequests)
router.post('/friends/requests', rateLimit({ limit: 15, windowMs: 60_000 }), createRequest)
router.post('/friends/requests/:id/accept', acceptRequest)
router.post('/friends/requests/:id/decline', declineRequest)
router.delete('/friends/:playerId', removeFriend)

router.get('/conversations', listConversations)
router.post('/conversations/open', openConversation)
router.get('/conversations/:id/messages', getMessages)
router.post('/conversations/:id/close', closeConversation)
router.post('/conversations/:id/read', readConversation)

router.delete('/messages/:id', removeMessage)

module.exports = router
