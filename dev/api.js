const bodyParser = require('body-parser');
const express = require('express');
const app = express();
const Blockchain = require('./blockchain');
const uuid = require('uuid/v1');
const port = process.argv[2];//taking in argument from the terminal and running node number as specified by the external argument
const rp = require('request-promise');
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

//register a node on its own server and broadcast that node to the whole network
app.post('/register-and-breadcast-node',function(req,res){
	const newNodeUrl = req.body.newNodeUrl;
	if (bitcoin.networkNodes.indexOf(newNodeUrl)==-1) bitcoin.networkNodes.push(newNodeUrl);//if the new node is not already present, then add it to the network 

	//for all the preexisting nodes in the network, we wanna register the new node by hitting  '/register-node'  
	const regNodesPromises = [];//defining an array of proomises
	bitcoin.networkNodes.forEach(networkNodeUrl => {
		//'/register-node'
		const requestOptions = {
			uri: networkNodeUrl + '/register-node',//we are hitting register node for all other networkNdes
			method : 'POST',
			body : { newNodeUrl : newNodeUrl},//what data are we passing in the request
			json:true//sending as json
		};
		//all the request will be asynchronous
		regNodesPromises.push(rp(requestOptions));//this request will return a promise
	});
	Promise.all(regNodesPromises)
	.then(data => {//after all the nodes have been registered with this node
		const bulkRegOptions = {
			uri: newNodeUrl + '/register-nodes-bulk',//we try to register all the registered node with this node
			method: 'POST',
			body:{ allNetworkNodes: [...bitcoin.networkNodes,bitcoin.currentNodeUrl]},//the data that we are sending in our body consists of all the network nodes and the url of the current node
			json:true
		};
		return rp(bulkRegOptions)
	}).
	then(data =>{
		res.json({node : 'New node registered with network'});
	});
});

// register a node with the network. The other nodes of the network receive the data at this point
app.post('/register-node',function(req,res){
	const newNodeUrl = req.body.newNodeUrl;
	bitcoin.networkNodes.push(newNodeUrl);
});

//the new node that we are registering gets the other nodes data at this 
app.post('/register-nodes-bulk',function(req,res){

});
app.listen(port,function(){
	console.log(`port open on port ${port}`);
})