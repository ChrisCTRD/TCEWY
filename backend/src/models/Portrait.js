const mongoose = require('mongoose');

const PortraitSchema = new mongoose.Schema({
  character:   { type: String, enum: ['neku', 'shiki', 'joshua', 'beat'], required: true },
  prefix:      { type: String, required: true },
  expression:  { type: String, enum: ['default', 'fight', 'annoyed', 'redeyes', 'thoughtful'], required: true },
  index:       { type: Number, min: 0, max: 35, required: true },
  assetId:     { type: String, required: true, unique: true },
  storageKey:  { type: String, required: true },
  contentType: { type: String, required: true },
});
PortraitSchema.index({ character: 1, expression: 1 }, { unique: true });

module.exports = mongoose.model('Portrait', PortraitSchema);