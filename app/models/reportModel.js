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
  img: {
    type: String
  },
  data: Object

}, { timestamps: true });

module.exports = mongoose.model('Report', schema);
