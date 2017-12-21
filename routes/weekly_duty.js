var express = require('express');
var router = express.Router();

var cronJob = require('cron').CronJob;
var request = require("request");
var dateUtils = require('date-utils');
var fs = require('fs');

// 定时任务，每天早上8点发出
var job = new cronJob('00 30 10 * * *', dosomething, null, true);

var CRequest;	// Current Reqest
var CResponse;	// Current Response

var names = [
	'周佚',	
	'云信',	
	'彦昊',	
	'驽良',	
	'胡争',	
	'木锤',	
	'金涛',	
	'见招',	
	'伏希',	
	'弘煜',	
	'新鹏',	
	'晓毒',	
	'库珀',	
	'鱼非',	
	'玄瑾',	
	'须莫',	
	'远觉',	
	'舒绎',	
	 ];

var mobiles = [
	'15658806290', /* '周佚' */	
	'18657107753', /* '云信' */	
	'18668229123', /* '彦昊' */	
	'17682334718', /* '驽良' */	
	'13933520376', /* '胡争' */	
	'17681801180', /* '木锤' */	
	'18221752371', /* '金涛' */	
	'15217330131', /* '见招' */	
	'18768143018', /* '伏希' */	
	'18658865993', /* '弘煜' */	
	'15120054901', /* '新鹏' */	
	'15669981121', /* '晓毒' */	
	'15608005942', /* '库珀' */	
	'15942673001', /* '鱼非' */	
	'18601124465', /* '玄瑾' */	
	'17682333123', /* '须莫' */	
	'18910266710', /* '远觉' */	
	'15927164270', /* '舒绎' */
	 ];

/* GET */
router.get('/', function(req, res, next) 
{
	CRequest = req;
	CResponse = res;

	dosomething();
});

/* POST */
router.post('/', function(req, res, next)
{
	CRequest = req;
	CResponse = res;

	dosomething();
});

module.exports = router;

/* 功能实现 */
function dosomething()
{
	console.log('dosomething...');

	if (CRequest)
	{
		var idx = CRequest.query.idx;
		if (idx)
		{
			saveSequenceOfToday(idx);
			CResponse.send('重置位置：'+names[idx]);
			return ;
		}
	}

	if (!isDateValid()) 
	{
		if (CResponse)
		{
			CResponse.send('周末不发送');
		};
		return;
	};

	sequenceOfToday(function(seq){

		var nextSeq = (seq + 1) % names.length;

		var postText;

		if (seq < 0)
		{
			postText = '提醒失败';
		}
		else
		{
			var name = names[seq];
			var nextName = names[nextSeq];
			postText = '* 本周周会主持：__'+ name + '__。 \n* 下周周会主持：__'+nextName+
			'__，请尽快预定会议室。\n';
		}
		
		var mobile = mobiles[seq];
		var nextMobile = mobiles[nextSeq];
		console.log('今日手机：'+ mobile);
		var msg = {

			"text": {
				"title": "iOS周会提醒",
				"content": postText
			},
			"msgtype": "text",
			"at": {
	        	"atMobiles": [
	            	mobile,
	            	nextMobile
	       		], 
	        	"isAtAll": false
	    	}	
		};

		console.log(msg)

		sendRobotMsg(url, msg, function(){
			if (CResponse)
			{
				CResponse.send('发送成功');
			};
		});

		// 记录
		console.log('nextSeq:'+nextSeq);
		saveSequenceOfToday(nextSeq);
	});
}

function today()
{
	var dayOfWeek = Date.today().toFormat('DDD');

	console.log('dayOfWeek:' + dayOfWeek);

	if (dayOfWeek == 'Mon') 
	{
		return '周一';
	}
	else if (dayOfWeek == 'Tue')
	{
		return '周二';
	}
	else if (dayOfWeek == 'Wed')
	{
		return '周三';
	}
	else if (dayOfWeek == 'Thu')
	{
		return '周四';
	}
	else if (dayOfWeek == 'Fri')
	{
		return '周五';
	}
	else
	{
		return null;
	}
}

function isDateValid()
{
	var dayOfWeek = Date.today().toFormat('DDD');

	console.log('dayOfWeek:' + dayOfWeek);

	if (dayOfWeek == 'Thu') 
	{
		return true;
	}

	return false;
}

var fileName = 'sequenceOfToday';
function sequenceOfToday(func)
{
	fs.exists(fileName, function(exists){

		if (exists)	// 存在
		{
			fs.readFile(fileName,"utf8",function (error,data){
			    if(error)
			    {
			        console.log("The file read fail! " + error);
			        func(-1);
			    }
			 	else
			 	{
			    	func(parseInt(data));
			 	}
			});
		}
		else	// 不存在
		{
			func(0);
		}
	});
}

function saveSequenceOfToday(seq)
{
	fs.writeFile(fileName, ""+seq, function(error) {
	    if(error)
	    {
	        console.log("The file was not saved! " + error);
	    }
	 	else
	 	{
	    	console.log("The file was saved!");
	 	}
	});
}

/* 发送机器人 */
var url = 'https://oapi.dingtalk.com/robot/send?access_token=439acc73b1405bd5c05c6ed6f9846802b66ca95143dac9b9afe676e026a04eba';
function sendRobotMsg(url, msg, func)
{
	var testUrl = CRequest ? CRequest.query.test_url : null;
	var postOptions = {
		url: testUrl?testUrl:url,
		method: "POST",
		json:true,
		headers: {
			"Content-Type": "application/json; charset=utf-8"
		},
		body:msg
	};
	request(postOptions, function(err, httpResponse, body) {
		console.log('SendRobotMsg Succesfully');
		func();
	});
}

/* 功能测试 */
// dosomething();