const { deleteMessage } = require('../services/messageService')

// DELETE /api/messages/:id  -> { message }  (soft delete; only the author)
const removeMessage = async (req, res) => {
  const message = await deleteMessage({
    userId: String(req.me._id),
    playerId: req.me.playerId,
    messageId: req.params.id
  })
  res.json({ message })
}

module.exports = { removeMessage }
