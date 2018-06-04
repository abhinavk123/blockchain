var express = require('express');
var app = express();

app.get('/blockchain',function(req,res){
	res.send('hello world');
});

app.post('/transcation',function(req,res){
	res.send('works');
});

app.get('/mine',function(req,res){

});

app.listen(3000,function(){
	console.log('port open');
})