const mongoose = require('mongoose');

const PortraitSchema = new mongoose.Schema({
  character:   { type: String, enum: ['neku', 'shiki', 'joshua', 'beat'], required: true },
  prefix:      { type: String, required: true },
  // Estados do sistema (default, fight, annoyed, redeyes, thoughtful) usam o índice 0-4.
  // Qualquer outra expressão é "extra" e usa o índice 5-35. Só minúsculas e números, sem underscore.
  expression:  { type: String, required: true, match: /^[a-z0-9]{1,20}$/ },
  index:       { type: Number, min: 0, max: 35, required: true },
  assetId:     { type: String, required: true, unique: true },
  storageKey:  { type: String, required: true },
  contentType: { type: String, required: true },
});
PortraitSchema.index({ character: 1, expression: 1 }, { unique: true });
PortraitSchema.index({ character: 1, index: 1 }, { unique: true });

module.exports = mongoose.model('Portrait', PortraitSchema);
