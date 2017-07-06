var express = require('express');
var router = express.Router();

var cronJob = require('cron').CronJob;
var request = require("request");
var iconv = require('iconv-lite');
var cheerio = require('cheerio');
var dateUtils = require('date-utils');

// 定时任务，每天早上8点发出
var job_us = new cronJob('00 00 8 * * *', loadStockPrice_us, null, true);
var job_hk = new cronJob('00 01 16 * * *', loadStockPrice_hk, null, true);

var CRequest;
var CResponse;
var ratioLimit_us = 1;	// 涨跌幅范围内才播报一次
var ratioLimit_hk = 0;

var content_us = null;
var content_hk = null;

var configures_us = [
	'BABA', // 阿里巴巴（BABA）
	'BIDU', // 百度（BIDU）
	'JD', 	// 京东（JD）
	'AAPL',	// 苹果（AAPL）
	'GOOGL',// 谷歌A（GOOGL）
	'FB',	// Facebook（FB）
	'AMZN',	// 亚马逊(AMZN)
	'SINA',	// 新浪(SINA)
	'WB',	// 微博（WB）
	'TWTR',	// Twitter（TWTR）
	'TSLA',	// 特斯拉（TSLA）
	'MOMO',	// 陌陌（MOMO）
	'NTES',	// 网易（NTES）
	'PYPL', // PayPal（PYPL）
	'GM',	// 通用汽车（GM）
	'VIPS',	// 唯品会（VIPS）
	'JMEI', // 聚美优品（JMEI）
	'MSFT', // 微软（MSFT）
	'NVDA', // 英伟达（NVDA）
	 ];

var configures_hk = [
	'00700', // 腾讯控股（00700）
	 ];

/* GET */
router.get('/', function(req, res, next) 
{
	CRequest = req;
	CResponse = res;

	fetchAll();
});

/* POST */
router.post('/', function(req, res, next) 
{
	CRequest = req;
	CResponse = res;

	fetchAll();
});

module.exports = router;

var maxRetryCount = 1;

function fetchAll()
{
	if (CRequest.query.t == 'hk')
	{
		loadStockPrice_hk();
	}
	else
	{	
		loadStockPrice_us();
	}
}

function unit(key)
{
	if (key.startsWith('us'))
	{
		return '美元';
	}
	else if (key.startsWith('hk'))
	{
		return '港元';
	}
	else
	{
		return '元';
	}
}

function isAlibaba(key)
{
	return key == 'BABA';
}

function keys_us()
{
	var keys = '';
	for (var index in configures_us)
	{
		keys += 's_us' + configures_us[index] + ',';
	}
	return keys;
}

function keys_hk()
{
	var keys = '';
	for (var index in configures_hk)
	{
		keys += 's_hk' + configures_hk[index] + ',';
	}
	return keys;
}

// key，名称，收盘价，涨跌幅，市值
function getStocks(body, local)
{
	var stocks = [];

	// v_s_usBABA="200~阿里巴巴~BABA.N~144.87~3.88~2.75~16969046~0~3664.29~";
	var lines = body.split('";');

	// console.log(body);

	for (var index in lines)
	{
		var line = lines[index];
		var arr = line.split('="');

		// console.log('*' + arr[1] + '*');

		if (!arr[1])
		{
			continue;
		};

		var values = arr[1].split('~');
		
		// key
		var key = values[2].split('.')[0];

		var stock = {
			'key' : key,
			'name' : values[1],
			'close' : parseFloat(values[3]),
			'ratio' : parseFloat(values[5]),
			'capital' : parseFloat(values[8]?values[8]:values[9]),
		};

		console.log(stock);

		if (isAlibaba(key))
		{
			stocks.unshift(stock);
		}
		else
		{
			stocks.push(stock);
		}
	}
	return stocks;
}

function loadStockPrice_us() 
{
	var random = Math.random();
	var url = 'http://qt.gtimg.cn/?_='+random+'&q='+keys_us();
	console.log(url);

	var options = {
		url: url,
		encoding:null,
		headers: {}
	};

	request(options, function(error, response, body) {

		console.log('us request success!!!');
		// decode 
		body = iconv.decode(body,'gbk');

		// key，名称，收盘价，涨跌幅，市值
		var stocks = getStocks(body);

		var content = '';
		for (var index in stocks)
		{
			var stock = stocks[index];

			if (Math.abs(stock.ratio) >= ratioLimit_us || isAlibaba(stock.key)) 
			{
				var unit = '美元';
				var updown = stock.ratio >= 0 ? '涨↑' : '跌↓';
				content += '**'+ stock.name +'** \n\n'
				+ '> 最新价' + stock.close + unit 
				+ '，' + updown + stock.ratio 
				+ '%，市值' + stock.capital + '亿' + unit + '\n\n';
			}
		}

		content_us = content;
		mergeResults();
	});
};

function loadStockPrice_hk() 
{
	var random = Math.random();
	var url = 'http://qt.gtimg.cn/?_='+random+'&q='+keys_hk();
	console.log(url);

	var options = {
		url: url,
		encoding:null,
		headers: {}
	};

	request(options, function(error, response, body) {

		console.log('us request success!!!');
		// decode 
		body = iconv.decode(body,'gbk');

		// key，名称，收盘价，涨跌幅，市值
		var stocks = getStocks(body);

		var content = '';
		for (var index in stocks)
		{
			var stock = stocks[index];

			if (Math.abs(stock.ratio) >= ratioLimit_hk || isAlibaba(stock.key)) 
			{
				var unit = '港元';
				var updown = stock.ratio >= 0 ? '涨↑' : '跌↓';
				content += '**'+ stock.name +'** \n\n'
				+ '> 最新价' + stock.close + unit 
				+ '，' + updown + stock.ratio 
				+ '%，市值' + stock.capital + '亿' + unit + '\n\n';
			}
		}

		content_hk = content;
		mergeResults();
	});
};

function mergeResults()
{
	// if (content_us != null && content_hk != null)
	// {
	// 	postRobotMessage(content_us + content_hk);
	// };

	if (content_us != null)
	{
		postRobotMessage(content_us);
	}
	else if (content_hk != null)
	{
		postRobotMessage(content_hk);
	};
}

function postRobotMessage(content)
{
	if (content.length == 0)
	{
		CResponse.send('没有股价信息');
		return;
	}

	var postText = '**股价信息：**\n\n' + content;

	console.log(postText);

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
		url: 'https://oapi.dingtalk.com/robot/send?access_token=1ed9af8c0be743a2933c57e0392bcc31484d24cdb26b289b400399b9c4cc6ce8',
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
	CResponse.json(postData);
}