var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var index = require('./routes/index');
var users = require('./routes/users');
var exchange_rate = require('./routes/exchange_rate');
var financial_report = require('./routes/financial_report');
var stock_price = require('./routes/stock_price');
var ghelper = require('./routes/ghelper');
var new_function = require('./routes/new_function');
var daily_duty = require('./routes/daily_duty');
var weekly_duty = require('./routes/weekly_duty');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
app.use('/users', users);
app.use('/exchange_rate', exchange_rate);
app.use('/financial_report', financial_report);
app.use('/stock_price', stock_price);
app.use('/ghelper', ghelper);
app.use('/new_function', new_function);
app.use('/daily_duty', daily_duty);
app.use('/weekly_duty', weekly_duty);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
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
  res.render('error');
});

module.exports = app;
