var express = require('express');
var router = express.Router();

var cronJob = require('cron').CronJob;
var request = require("request");
var dateUtils = require('date-utils');
var fs = require('fs');

// 定时任务，每天早上8点发出
var job = new cronJob('00 00 19 * * *', dosomething, null, true);

var CRequest;	// Current Reqest
var CResponse;	// Current Response

var names = [
	'子推',	/* 子推 */
	'昏晓',	/* 昏晓 */
	'和仲',	/* 和仲 */
	'君跃',	/* 君跃 */
	'龙醒',	/* 龙醒 */
	'安步',	/* 安步 */
	'云信',	/* 云信 */
	'超丕',	/* 超丕 */
	'佑界',	/* 佑界 */
	'绫缨',	/* 绫缨 */
	'苏翊',	/* 苏翊 */
	 ];

var mobiles = [
	'15858280136',	/* 子推 */
	'17681800020',	/* 昏晓 */
	'17706512977',	/* 和仲 */
	'18626866331',	/* 君跃 */
	'17682442931',	/* 龙醒 */
	'18668169218',	/* 安步 */
	'18657107753',	/* 云信 */
	'17681800616',	/* 超丕 */
	'15311115553',	/* 佑界 */
	'17681808788',	/* 绫缨 */
	'13615813105',	/* 苏翊 */
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

	var idx = CRequest.query.idx;
	if (idx)
	{
		saveSequenceOfToday(idx);
		CResponse.send('重置位置：'+names[idx]);
		return ;
	}


	if (!isDateValid) 
	{
		CResponse.send('周末不发送');
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
			postText = '· 今天是'+today()+'，【'+ name + '】值日! 明日：'+nextName+'\n'+
			'· 请填写[阿里巴巴钉钉-日志-团队每日精进]\n'+
			'· 负责收集基础各小组的问题、机会点、Badcase、发布内容、团队人员情况等。';
		}
		
		var mobile = mobiles[seq];
		console.log('今日手机：'+ mobile);
		var msg = {
			"text": {
				"title": "每日精进提醒",
				"content": postText
			},
			"msgtype": "text",
			"at": {
	        "atMobiles": [
	            mobile
	        ], 
	        "isAtAll": false,
	    }
		};

		sendRobotMsg(url, msg, function(){
			CResponse.send('发送成功');
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

	if (dayOfWeek == 'Sat' || dayOfWeek == 'Sun') 
	{
		return false;
	}

	return true;
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
var url = 'https://oapi.dingtalk.com/robot/send?access_token=1ed9af8c0be743a2933c57e0392bcc31484d24cdb26b289b400399b9c4cc6ce8';
function sendRobotMsg(url, msg, func)
{
	var postOptions = {
		url: url,
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