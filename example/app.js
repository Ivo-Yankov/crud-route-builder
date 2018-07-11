const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const routes = require('./routes');
const mongoose = require('mongoose');
const app = express();

//Set up default mongoose connection
const mongoDB = 'mongodb://localhost:27017/crud-example';
mongoose.connect(mongoDB);

app.set('view engine', 'jade');
app.use(bodyParser.json());
app.use('/', routes);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.send(err);
});

module.exports = app;
