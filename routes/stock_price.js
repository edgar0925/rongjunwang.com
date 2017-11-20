var express = require('express');
var router = express.Router();

var cronJob = require('cron').CronJob;
var httpRequest = require("request");
var iconv = require('iconv-lite');
var cheerio = require('cheerio');
var dateUtils = require('date-utils');
var mock = require('./http_mock');

// 定时任务，每天早上8点发出
var job_us = new cronJob('00 00 8 * * *', loadStockPrice_us, null, true);
var job_hk = new cronJob('00 30 16 * * *', loadStockPrice_hk, null, true);

var request;
var response = mock.response;
var ratioLimit_us = 1;	// 涨跌幅范围内才播报一次
var ratioLimit_hk = 1;

var configures_us = [
	'BABA', // 阿里巴巴
	'BIDU', // 百度
	'JD', 	// 京东
	'AAPL',	// 苹果
	'GOOGL',// 谷歌A
	'FB',	// Facebook
	'AMZN',	// 亚马逊
	'SINA',	// 新浪
	'WB',	// 微博
	'TWTR',	// Twitter
	'TSLA',	// 特斯拉
	'MOMO',	// 陌陌
	'NTES',	// 网易
	'PYPL', // PayPal
	'GM',	// 通用汽车
	'VIPS',	// 唯品会
	'JMEI', // 聚美优品
	'MSFT', // 微软
	'NVDA', // 英伟达
	'AMD',  // 美国超微
	 ];

var configures_hk = [
	'00700', // 腾讯控股
	'01060', // 阿里影业
	'00241', // 阿里健康
	'01398', // 工商银行
	'03328', // 交通银行
	'01357', // 美图公司
	'00762', // 中国联通
	'00728', // 中国电信
	'02333', // 长城汽车
	'00175', // 吉利汽车
	'00699', // 神舟租车
	'06060', // 众安在线
	 ];

/* GET */
router.get('/', function(req, res, next) 
{
	request = req;
	response = res;

	fetchAll();
});

/* POST */
router.post('/', function(req, res, next) 
{
	request = req;
	response = res;

	fetchAll();
});

module.exports = router;

var maxRetryCount = 1;

function fetchAll()
{
	if (request.query.t == 'hk')
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

function isMust(key)
{
	return key == 'BABA' || key == '00700';
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

		var name = values[1].split('（')[0];

		var stock = {
			'key' : key,
			'name' : name,
			'close' : parseFloat(values[3]),
			'ratio' : parseFloat(values[5]),
			'capital' : parseFloat(values[8]?values[8]:values[9]),
		};

		console.log(stock);

		if (isMust(key))
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

	httpRequest(options, function(error, response, body) {

		console.log('us request success!!!');
		// decode 
		body = iconv.decode(body,'gbk');

		// key，名称，收盘价，涨跌幅，市值
		var stocks = getStocks(body);

		var content = '';
		for (var index in stocks)
		{
			var stock = stocks[index];

			if (Math.abs(stock.ratio) >= ratioLimit_us || isMust(stock.key)) 
			{
				var unit = '美元';
				var updown = stock.ratio >= 0 ? '涨↑' : '跌↓';
				content += '**'+ stock.name +'** \n\n'
				+ '> 最新价' + stock.close + unit 
				+ '，' + updown + stock.ratio 
				+ '%，市值' + stock.capital + '亿' + unit + '\n\n';
			}
		}

		postRobotMessage(content);
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

	httpRequest(options, function(error, response, body) {

		console.log('us request success!!!');
		// decode 
		body = iconv.decode(body,'gbk');

		// key，名称，收盘价，涨跌幅，市值
		var stocks = getStocks(body);

		var content = '';
		for (var index in stocks)
		{
			var stock = stocks[index];

			if (Math.abs(stock.ratio) >= ratioLimit_hk || isMust(stock.key)) 
			{
				var unit = '港元';
				var updown = stock.ratio >= 0 ? '涨↑' : '跌↓';
				content += '**'+ stock.name +'** \n\n'
				+ '> 最新价' + stock.close + unit 
				+ '，' + updown + stock.ratio 
				+ '%，市值' + stock.capital + '亿' + unit + '\n\n';
			}
		}

		postRobotMessage(content);
	});
};

function postRobotMessage(content)
{
	if (content.length == 0)
	{
		response.send('没有股价信息');
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
		url: 'https://oapi.dingtalk.com/robot/send?access_token=c22f1cbdc4149025f26243e351e786574024a547136ff0eec0b7cb5fb57e066d',
		// 测试
		// url: 'https://oapi.dingtalk.com/robot/send?access_token=1ed9af8c0be743a2933c57e0392bcc31484d24cdb26b289b400399b9c4cc6ce8',
		method: "POST",
		json:true,
		headers: {
			"Content-Type": "application/json; charset=utf-8"
		},
		body:postData
	};
	httpRequest(postOptions, function(err, httpResponse, body) {
		console.log('发送股价成功');
	});
	response.json(postData);
}