var express = require('express');
var router = express.Router();

var cronJob = require('cron').CronJob;
var request = require("request");
var iconv = require('iconv-lite');
var cheerio = require('cheerio');
var dateUtils = require('date-utils');

// 定时任务，每天早上8点发出
var job = new cronJob('00 00 8 * * *', fetchAll, null, true);

var scope = 0;	// 涨跌幅范围内才播报一次
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

var maxRetryCount = 30;
var count;

function fetchAll(res)
{
	console.log('fetching...');

	count = maxRetryCount;

	for (var name in configures)
	{
		var url = configures[name];
		loadStockPrice(name, url);
	}

	showAllResults(res);
}

function showAllResults(res)
{
	// count--;

	// if (count < 0) 
	// {
	// 	var err = '超时' + maxRetryCount + '秒';
	// 	console.log(err);
	// 	postRobotMessage(res);
	// 	return;
	// };

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
		url = url.substr(2, url.length - 2);
	}
	else if (url.startsWith('hk'))
	{
		unit = '港元';
		url = url.substr(2, url.length - 2);
	}
	var isAlibaba = name == '阿里巴巴（BABA）';

	var newUrl = 'https://xueqiu.com/S/'+url;
	console.log(name+':'+newUrl);

	var options = {
		url: newUrl,
		encoding:null,
		headers: {
			"User-Agent": "Mozilla/5.0 (iPad; CPU OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1",
			"Cookie":"aliyungf_tc=AQAAAFuULzqpVwUAZUp4KoQnu8/vUy/f; s=g312gpw53a; bid=a15ed548e0a303b4178d9b7889139349_j3e8630u; __utmt=1; xq_a_token=781a61987adbf3a6631e26c3c7d4ae5515d5a728; xqat=781a61987adbf3a6631e26c3c7d4ae5515d5a728; xq_r_token=517441b942b7b52d7ddc6534bc93cd8e0504b529; xq_is_login=1; u=7967615343; xq_token_expire=Mon%20Jun%2026%202017%2020%3A05%3A02%20GMT%2B0800%20(CST); Hm_lvt_1db88642e346389874251b5a1eded6e3=1495543502,1496310195; Hm_lpvt_1db88642e346389874251b5a1eded6e3=1496318707; __utma=1.294316794.1495543503.1496310195.1496318549.4; __utmb=1.8.10.1496318549; __utmc=1; __utmz=1.1496310195.3.2.utmcsr=baidu|utmccn=(organic)|utmcmd=organic|utmctr=%E7%BD%91%E6%98%93%E8%82%A1%E7%A5%A8"
		}
	};

	request(options, function(error, response, body) {

		// decode 
		body = iconv.decode(body,'utf-8');
		var arr = body.match(/quote = \{(.*)\}/g);

		if (arr.length > 0)
		{
			body = arr[0].replace('quote = ', '');
		}
		else
		{
			body = null;
		}

		var content = '';
		if (body)
		{
			var base = JSON.parse(body);
			var close = base.current;	// 收盘价
			var netChangeRatio = base.percentage;	// 涨跌幅
			var capitalization = base.marketCapital.substr(0, base.marketCapital.length - 1);	// 市值
			// console.log('收盘价:'+close+',涨幅：'+netChangeRatio+'，市值:'+capitalization+unit);
			// return;
			
			if (Math.abs(netChangeRatio) > scope || isAlibaba) 
			{
				var color = '';
				var ratioText = '';
				// 涨
				if (netChangeRatio >= 0)
				{
					color = upColor;
					ratioText = '涨跌幅';
				}
				else // 跌
				{
					color = downColor;
					ratioText = '涨跌幅';
				}

				content = ' **'+textWithFont(name) +'** '
				+ '最新价' + textWithFont(close) + unit 
				+ '\n' + ratioText + textWithFont(netChangeRatio) 
				+ '%，市值' + textWithFont(capitalization) + '亿' + unit;
			}
			else
			{
				content = '';
			}
		}

		reports[name] = content ? content : '';
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

		if (content && content.length > 0)
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