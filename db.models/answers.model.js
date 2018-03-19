var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var AnswersSchema = new Schema({
    userid: String,
    formid: String,
    answers: Object,
    timestamp: String
});

// Compile model from schema
module.exports = mongoose.model('AnswersModel', AnswersSchema );

