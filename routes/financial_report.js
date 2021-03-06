var express = require('express');
var router = express.Router();

var cronJob = require('cron').CronJob;
var request = require("request");
var iconv = require('iconv-lite');
var cheerio = require('cheerio');
var dateUtils = require('date-utils');

// 定时任务，每天早上8点发出
var job = new cronJob('00 00 8 * * *', fetchAll, null, true);

var maxMonths = 3;	// N月内的发布日才会播报
var dateStep = 7;	// 发布日往前每N天播报一次

var configures = { 
	'阿里巴巴（BABA）' : 'https://www.investing.com/equities/alibaba-earnings',
	'腾讯控股（00700）' : 'https://www.investing.com/equities/tencent-holdings-hk-earnings',
	'百度（BIDU）' : 'https://www.investing.com/equities/baidu.com-earnings',
	'京东（JD）' : 'https://www.investing.com/equities/jd.com-inc-adr-earnings',
	'苹果（AAPL）' : 'https://www.investing.com/equities/apple-computer-inc-earnings',
	'谷歌A（GOOGL）' : 'https://www.investing.com/equities/google-inc-earnings',
	'Facebook（FB）' : 'https://www.investing.com/equities/facebook-inc-earnings',
	'亚马逊(AMZN)' : 'https://www.investing.com/equities/amazon-com-inc-earnings',
	'新浪(SINA)' : 'https://www.investing.com/equities/sina-corp-earnings',
	'微博（WB）' : 'https://www.investing.com/equities/weibo-corp-earnings',
	'Twitter（TWTR）' : 'https://www.investing.com/equities/twitter-inc-earnings',
	'特斯拉（TSLA）' : 'https://www.investing.com/equities/tesla-motors-earnings',
	'陌陌（MOMO）' : 'https://www.investing.com/equities/momo-inc-earnings',
	'网易（NTES）' : 'https://www.investing.com/equities/netease.com-earnings',
	'PayPal（PYPL）' : 'https://www.investing.com/equities/paypal-holdings-inc-earnings',
	'通用汽车（GM）' : 'https://www.investing.com/equities/gen-motors-earnings',
	'唯品会（VIPS）' : 'https://www.investing.com/equities/vipshop-holdings-earnings',
	'聚美优品（JMEI）' : 'https://www.investing.com/equities/jumei-international-holding-ltd-earnings',
	'微软（MSFT）' : 'https://www.investing.com/equities/microsoft-corp-earnings',
	'英伟达（NVDA）' : 'https://www.investing.com/equities/nvidia-corp-earnings',
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
		loadFinancialReport(name, url);
	}

	showAllResults(res);
}

var maxRetryCount = 30;
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

function loadFinancialReport(name, url) {
	
	console.log(name+':'+url);

	var options = {
		url: url,
		encoding:null,
		headers: {
			"User-Agent": "Mozilla/5.0 (iPad; CPU OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1"
		}
	};

	request(options, function(error, response, body) {

		// decode 
		body = iconv.decode(body,'utf-8');

		// console.log(body);

		$ = cheerio.load(body);
		var node = $('tr[name=instrumentEarningsHistory]').first();

		var pulicDateStr = node.attr('event_timestamp').replace(/([0-9]{4})-([0-9]{2})-([0-9]{2})/g, '$1年$2月$3日');
		var pulicDate = new Date(node.attr('event_timestamp').replace(/-/g, '/'));
		var endDateStr = node.children().eq(1).text().replace(/([0-9]{2})\/([0-9]{4})/g, '$2年$1月');
		
		// console.log(pulicDateStr + ', ' + endDateStr);

		// 一周内有财报报告
		var today = Date.today();
		var target = Date.today().addMonths(maxMonths);
		var content = '';
		console.log('今日：' + today.toFormat('YYYY-MM-DD') +', 发布日期：' + pulicDate.toFormat('YYYY-MM-DD') + ', 结束日期：' + target.toFormat('YYYY-MM-DD'));
		if (today.compareTo(pulicDate) == 1 || target.compareTo(pulicDate) == -1)
		{
			content = '';
		}
		else
		{
			console.log(name + ':'+maxMonths+'个月内,' + today.getDaysBetween(pulicDate));
			if (pulicDate.getDaysBetween(today) % dateStep == 0) 
			{
				console.log(name + ':刚好'+dateStep+'天倍数');
				content = name + '将于' + pulicDateStr + '发布截止' + endDateStr + '财报';
			}
		}

		reports[name] = content;
		console.log(reports[name]);
	})
};

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
		console.log('没有财报信息');
		if (res)
		{
			res.send('没有财报信息');
		}
		return;
	}

	var postText = '> 财报信息：\n\n' + reportMsg;

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
		url: 'https://oapi.dingtalk.com/robot/send?access_token=c22f1cbdc4149025f26243e351e786574024a547136ff0eec0b7cb5fb57e066d',
		// 测试
		// url: 'https://oapi.dingtalk.com/robot/send?access_token=a26cf1f7e7537fcf9ea7ed64604348556a430d3d7b5f81f983cf6126eab68195',
		method: "POST",
		json:true,
		headers: {
			"Content-Type": "application/json; charset=utf-8"
		},
		body:postData
	};
	request(postOptions, function(err, httpResponse, body) {
		console.log('发送财报成功');
	});
	if (res)
	{
		res.json(postData);
	}
}

// fetchAll();