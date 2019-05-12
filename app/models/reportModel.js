const mongoose = require('mongoose');


const schema = new mongoose.Schema({
  reportType: {
    type: String,
    required: true
  },
  registration: {
    type: String,
    required: true
  },
  data: {
    type: Object,
    required: true
  }

}, { timestamps: true });

module.exports = mongoose.model('Report', schema);
