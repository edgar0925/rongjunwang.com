var express = require('express');
var router = express.Router();

var request = require("request");
var iconv = require('iconv-lite');

/* GET exchange rate. */
router.get('/', function(req, res, next) {
	loadExchangeRate(res);
});

/* GET exchange rate. */
router.post('/', function(req, res, next) {
	loadExchangeRate(res);
});

module.exports = router;

function loadExchangeRate(res) {

	var options = {
		url: 'http://data.bank.hexun.com/other/cms/foreignexchangejson.ashx',
		encoding:null
	};

	request(options, function(error, response, body) {

		body = iconv.decode(body,'gb2312');
		body = body.substring('ForeignexchangeData('.length, body.length - 1);
		body = '{"results":' + body + '}';

		body = body.replace(/(currency)(:)/g, '"$1"$2');
		body = body.replace(/currencyUnit/g, '"$&"');
		body = body.replace(/bank/g, '"$&"');
		body = body.replace(/code/g, '"$&"');
		body = body.replace(/cenPrice/g, '"$&"');
		body = body.replace(/buyPrice1/g, '"$&"');
		body = body.replace(/sellPrice1/g, '"$&"');
		body = body.replace(/buyPrice2/g, '"$&"');
		body = body.replace(/sellPrice2/g, '"$&"');
		body = body.replace(/releasedate/g, '"$&"');
		body = body.replace(/\'/g, '"');

		var results = JSON.parse(body).results;

		var array = [];

		for (var index in results)
		{
			var obj = results[index];
			var name = obj.bank;
			var code = obj.code;

			if (code == 'USD' && ('中国银行' == obj.bank || '招商银行' == obj.bank))
			{
				array.push(obj);
			}
		}

		postRobotMessage(array, res);
	})
};

function postRobotMessage(objs, res)
{
	var postText = "";

	for (var index in objs)
	{
		var obj = objs[index];
		var name = obj.bank;
		var cenPrice = (parseFloat(obj.cenPrice) / 100).toFixed(4);
		var releasedate = obj.releasedate;

		postText += "> "+ name + " " + releasedate +"\n\n";
		postText += "> 实时汇率（中间价）："+ cenPrice + "\n\n\n\n";
	}

	console.log(postText);


	var postData = {
		"markdown": {
			"title": "美元/人民币",
			"text": postText
		},
		"msgtype": "markdown"
	};

	var postOptions = {
		// 钱庄
		url: 'https://oapi.dingtalk.com/robot/send?access_token=8687430fbad8874d1f7fcad6e1a0f57efa18d8456bf424789dbcba7259586a91',
		// 测试
		// url: 'https://oapi.dingtalk.com/robot/send?access_token=a26cf1f7e7537fcf9ea7ed64604348556a430d3d7b5f81f983cf6126eab68195',
		method: "POST",
		json:true,
		headers: {
			"Content-Type": "application/json; charset=utf-8"
		},
		body:postData
	};
	// request(postOptions, function(err, httpResponse, body) {
	// 	console.log(body);
	// });

	res.json(postData);
}