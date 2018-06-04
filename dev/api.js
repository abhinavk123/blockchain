const bodyParser = require('body-parser');
const express = require('express');
const app = express();
const Blockchain = require('./blockchain');
const uuid = require('uuid/v1');
const nodeAddress = uuid().split('-').join('');
const bitcoin = new Blockchain();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}));

app.get('/blockchain',function(req,res){
	res.send(bitcoin);
});

app.post('/transcation',function(req,res){
	const blockIndex = bitcoin.createNewTransaction(req.body.amount, req.body.sender, req.body.recepient);
	res.json({note:'transcation will be added in block ${blockIndex}.'});
});

app.get('/mine',function(req,res){
	const lastBlock = bitcoin.getLastBlock();
	const previousBlockHash = lastBlock['hash'];
	const currentBlockData = {
		transcation: bitcoin.pendingTransactions,
		index: lastBlock['index']+1
	};
	const nonce = bitcoin.proofOfWork(previousBlockHash,currentBlockData);
	const blockHash = bitcoin.hashBlock(previousBlockHash,currentBlockData,nonce);
	const newBlock = bitcoin.createNewBlock(nonce, previousBlockHash,blockHash);
	bitcoin.createNewTransaction(12.5,"00",nodeAddress);//sending a reward of 12.5 bitcoin for completing the mining process, to the recepient address nodeAdress
	res.json({
		note:"New block mine complete.",
		block: newBlock
	});
});

app.listen(3000,function(){
	console.log('port open');
})