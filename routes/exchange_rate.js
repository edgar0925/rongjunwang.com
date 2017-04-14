var express = require('express');
var router = express.Router();

/* GET exchange rate. */
router.get('/', function(req, res, next) {
  res.send('rate exchange');
});



module.exports = router;