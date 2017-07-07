var responseMock = function()
{
	
}

responseMock.prototype.send = function(text)
{
	console.log('mock send: ' + text);
}

responseMock.prototype.json = function(text)
{
	console.log('mock json: ' + text);	
}

var mock = function()
{
	
}

mock.prototype.response = new responseMock();

module.exports = new mock();
