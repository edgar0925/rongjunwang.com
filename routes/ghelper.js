var express = require('express');
var router = express.Router();

var request = require("request");
var iconv = require('iconv-lite');

var response;

/* GET exchange rate. */
router.get('/', function(req, res, next) {
	response = res;
	answers(req);
});

/* POST exchange rate. */
router.post('/', function(req, res, next) {
	response = res;
	answers(req);
});

module.exports = router;

function answers(request) 
{
	var body = request.body;

	console.log(body);

	dealToWhatGroupDo();
};

function dealToWhatGroupDo()
{
	var postData = {
		"markdown": {
			"title": "你好",
			"text": "你好"
		},
		"msgtype": "markdown"
	};

	res.json(postData);
}