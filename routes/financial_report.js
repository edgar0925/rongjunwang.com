var express = require('express');
var router = express.Router();

var request = require("request");
var iconv = require('iconv-lite');
var cheerio = require('cheerio');
var dateUtils = require('date-utils');

var configures = { 
	'阿里巴巴（BABA）' : 'https://cn.investing.com/equities/alibaba-earnings',
	'腾讯控股（00700）' : 'https://cn.investing.com/equities/tencent-holdings-hk-earnings',
	// '百度（BIDU）' : 'https://cn.investing.com/equities/baidu.com-earnings',
	// '京东（JD）' : 'https://cn.investing.com/equities/jd.com-inc-adr-earnings',
	// '苹果（AAPL）' : 'https://cn.investing.com/equities/apple-computer-inc-earnings',
	// '谷歌A（GOOGL）' : 'https://cn.investing.com/equities/google-inc-earnings',
	// 'Facebook（FB）' : 'https://cn.investing.com/equities/facebook-inc-earnings',
	// '亚马逊(AMZN)' : 'https://cn.investing.com/equities/amazon-com-inc-earnings',
	// '新浪(SINA)' : 'https://cn.investing.com/equities/sina-corp-earnings',
	// '微博（WB）' : 'https://cn.investing.com/equities/weibo-corp-earnings',
	// 'Twitter（TWTR）' : 'https://cn.investing.com/equities/twitter-inc-earnings',
	// '特斯拉（TSLA）' : 'https://cn.investing.com/equities/tesla-motors-earnings',
	// '陌陌（MOMO）' : 'https://cn.investing.com/equities/momo-inc-earnings',
	// '网易（NTES）' : 'https://cn.investing.com/equities/netease.com-earnings',
	// 'PayPal（PYPL）' : 'https://cn.investing.com/equities/paypal-holdings-inc-earnings',
	// '通用汽车（GM）' : 'https://cn.investing.com/equities/gen-motors-earnings',
	// '唯品会（VIPS）' : 'https://cn.investing.com/equities/vipshop-holdings-earnings',
	// '聚美优品（JMEI）' : 'https://cn.investing.com/equities/jumei-international-holding-ltd-earnings',
	// '微软（MSFT）' : 'https://cn.investing.com/equities/microsoft-corp-earnings',
	// '英伟达（NVDA）' : 'https://cn.investing.com/equities/nvidia-corp-earnings',
	 };

var reports = {};

/* GET exchange rate. */
router.get('/', function(req, res, next) {
	fetchAll(res);
});

/* POST exchange rate. */
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

function showAllResults(res)
{
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
		var target = today.addWeeks(1);
		if (today.compareTo(pulicDate) == 1 || target.compareTo(pulicDate) == -1)
		{
			// return;
		};

		var content = '' + name + '将于' + pulicDateStr + '发布截止' + endDateStr + '财报';
		reports[name] = content;
		console.log(reports[name]);
	})
};

function postRobotMessage(res)
{
	var reportMsg = "> 财报信息：\n\n";
	for (var name in configures)
	{
		var content = reports[name];
		reportMsg += '> ' + content + '\n\n';
		console.log(content);	
	}

	var postText = reportMsg;

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
		// url: 'https://oapi.dingtalk.com/robot/send?access_token=8687430fbad8874d1f7fcad6e1a0f57efa18d8456bf424789dbcba7259586a91',
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
		res.json(postData);
	});
}