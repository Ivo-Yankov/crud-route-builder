const mongoose = require('mongoose'), Schema = mongoose.Schema;

const itemSchema = Schema({
    name    : String,
    color   : String
});

module.exports = mongoose.model('Item', itemSchema);