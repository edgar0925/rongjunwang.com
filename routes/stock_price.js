var express = require('express');
var router = express.Router();

var cronJob = require('cron').CronJob;
var request = require("request");
var iconv = require('iconv-lite');
var cheerio = require('cheerio');
var dateUtils = require('date-utils');

// 定时任务，每天早上8点发出
var job = new cronJob('00 00 8 * * *', fetchAll, null, true);

var scope = 1;	// 涨跌幅范围内才播报一次
var nameColor = '#0099ff';	// 名称颜色
var upColor = '#f24957';	// 涨颜色
var downColor = '#1dbf60';	// 跌颜色

var configures = { 
	'阿里巴巴（BABA）' : 'usBABA',
	'腾讯控股（00700）' : 'hk00700',
	'百度（BIDU）' : 'usBIDU',
	'京东（JD）' : 'usJD',
	'苹果（AAPL）' : 'usAAPL',
	'谷歌A（GOOGL）' : 'usGOOGL',
	'Facebook（FB）' : 'usFB',
	'亚马逊(AMZN)' : 'usAMZN',
	'新浪(SINA)' : 'usSINA',
	'微博（WB）' : 'usWB',
	'Twitter（TWTR）' : 'usTWTR',
	'特斯拉（TSLA）' : 'usTSLA',
	'陌陌（MOMO）' : 'usMOMO',
	'网易（NTES）' : 'usNTES',
	'PayPal（PYPL）' : 'usPYPL',
	'通用汽车（GM）' : 'usGM',
	'唯品会（VIPS）' : 'usVIPS',
	'聚美优品（JMEI）' : 'usJMEI',
	'微软（MSFT）' : 'usMSFT',
	'英伟达（NVDA）' : 'usNVDA',
	 };

var reports = {};

/* GET */
router.get('/', function(req, res, next) {
	fetchAll(res);
});

/* POST */
router.post('/', function(req, res, next) {
	fetchAll(res);
});

module.exports = router;

function fetchAll(res)
{
	console.log('fetching...');
	for (var name in configures)
	{
		var url = configures[name];
		loadStockPrice(name, url);
	}

	showAllResults(res);
}

var maxRetryCount = 10;
var count  = maxRetryCount;

function showAllResults(res)
{
	count--;

	if (count < 0) 
	{
		var err = '超时' + maxRetryCount + '秒';
		console.log(err);
		if (res)
		{
			res.send(err);
		}
		return;
	};

	var reportSize = Object.getOwnPropertyNames(reports).length;
	var configureSize = Object.getOwnPropertyNames(configures).length;

	console.log(reportSize + ":" + configureSize);

	if (reportSize == configureSize)
	{
		postRobotMessage(res);
	}
	else
	{
		setTimeout(function(){
			showAllResults(res);
		}, 1 * 1000);
	}
}

function loadStockPrice(name, url) 
{
	var unit = '元';
	if (url.startsWith('us'))
	{
		unit = '美元';
	}
	else if (url.startsWith('hk'))
	{
		unit = '港元';
	}
	var isAlibaba = name == '阿里巴巴（BABA）';

	var newUrl = "https://gupiao.baidu.com/api/stocks/stockbets?from=h5&os_ver=0&cuid=xxx&vv=2.2&format=json&stock_code=" + url;
	console.log(name+':'+newUrl);

	var options = {
		url: newUrl,
		encoding:null,
		headers: {
			"User-Agent": "Mozilla/5.0 (iPad; CPU OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1"
		}
	};

	request(options, function(error, response, body) {

		// decode 
		body = iconv.decode(body,'utf-8');
		// console.log(body);

		var snapShot = JSON.parse(body).snapShot;
		var close = snapShot.close.toFixed(3);	// 收盘价
		var netChangeRatio = snapShot.netChangeRatio.toFixed(2);	// 涨跌幅
		var capitalization = (snapShot.capitalization/100000000).toFixed(2);	// 市值
		
		var content = '';
		if (Math.abs(netChangeRatio) > scope || isAlibaba) 
		{
			var color = '';
			// 涨
			if (netChangeRatio > 0)
			{
				color = upColor;
			}
			else // 跌
			{
				color = downColor;
			}

			content = textWithFont(name) 
			+ '最新价' + textWithFont(close) + unit 
			+ '，涨跌幅' + textWithFont(netChangeRatio) 
			+ '%，市值' + textWithFont(capitalization) + '亿' + unit;
		}
		else
		{
			content = '';
		}

		reports[name] = content;
		console.log(reports[name]);
	})
};

function textWithFont(text, color, size, font)
{
	if (color || size || font)
	{
		var fontPart = font ? ' face="'+font+'"' : '';
		var sizePart = size ? ' size='+size : '';
		var colorPart = color ? ' color='+color : '';
		return '<font '+fontPart + sizePart + colorPart +' >'+text+'</font>';
	}
	else
	{
		return text;
	}
}

function postRobotMessage(res)
{
	var reportMsg = '';
	for (var name in configures)
	{
		var content = reports[name];

		if (content.length > 0)
		{
			reportMsg += '> ' + content + '\n\n';
			console.log(content);
		}	
	}

	if (reportMsg.length == 0)
	{
		console.log('没有股价信息');
		if (res)
		{
			res.send('没有股价信息');
		}
		return;
	}

	var postText = '> 股价信息：\n\n' + reportMsg;

	console.log(reportMsg);

	var postData = {
		"markdown": {
			"title": "股票事件播报",
			"text": postText
		},
		"msgtype": "markdown"
	};

	var postOptions = {
		// 钱庄
		// url: 'https://oapi.dingtalk.com/robot/send?access_token=c22f1cbdc4149025f26243e351e786574024a547136ff0eec0b7cb5fb57e066d',
		// 测试
		url: 'https://oapi.dingtalk.com/robot/send?access_token=a26cf1f7e7537fcf9ea7ed64604348556a430d3d7b5f81f983cf6126eab68195',
		method: "POST",
		json:true,
		headers: {
			"Content-Type": "application/json; charset=utf-8"
		},
		body:postData
	};
	request(postOptions, function(err, httpResponse, body) {
		console.log('发送股价成功');
	});
	if (res)
	{
		res.json(postData);
	}
}

// fetchAll();