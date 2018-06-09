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

app.post('/transaction',function(req,res){
	const blockIndex = bitcoin.createNewTransaction(req.body.amount, req.body.sender, req.body.recepient);
	res.json({note:`transaction will be added in block ${blockIndex}.`});
});

//this will 1.create a new transaction 2.broadcast that transaction to all the other transactions of the network 
app.post('/transaction/broadcast',function(req,res){
	const newTransaction = bitcoin.createNewTransaction(req.body.amount,req.body.sender,req.body.recepient);
	bitcoin.addTransactionToPendingTransactions(newTransaction);

	const requestPromises = [];
	bitcoin.networkNodes.forEach(networkNodeUrl => {
		const requestOptions = {
			uri:networkNodeUrl +'/transaction',
			method:'POST',
			body:newTransaction,
			json:true
		};
		requestPromises.push(rp(requestOptions));
	});
	
	Promise.all(requestPromises)
	.then(data=>{
		res.json({note:'Transaction creation and broadcast successful'});
	});
});



app.get('/mine',function(req,res){
	const lastBlock = bitcoin.getLastBlock();
	const previousBlockHash = lastBlock['hash'];
	const currentBlockData = {
		transaction: bitcoin.pendingTransactions,
		index: lastBlock['index']+1
	};
	const nonce = bitcoin.proofOfWork(previousBlockHash,currentBlockData);
	const blockHash = bitcoin.hashBlock(previousBlockHash,currentBlockData,nonce);
	const newBlock = bitcoin.createNewBlock(nonce, previousBlockHash,blockHash);
	//bitcoin.createNewTransaction(12.5,"00",nodeAddress);//sending a reward of 12.5 bitcoin for completing the mining process, to the recepient address nodeAddress

	const requestPromises = [];
	//broadcasting our newly mined block to all the other nodes in the network(as an attempt to make the network synchronous)
	bitcoin.networkNodes.forEach(networkNodeUrl => {
		const requestOptions = {
				uri: networkNodeUrl + '/receive-new-block',
				method: 'POST',
				body : {newBlock:newBlock},
				json : true
			}; 
		requestPromises.push(rp(requestOptions));	
	});

	Promise.all(requestPromises)//1.run all these requests 
	.then(data => {//2.then when they finish run this code
		const requestOptions = {
			uri:bitcoin.currentNodeUrl +'/tarnscation/broadcast',
			method:'POST',
			body:{//mining reward transaction that is broadcasted to the entire network as well
				amount:12.5,
				sender:"00",
				recepient:nodeAddress
			},
			json: true,
		};
		return	rp(requestOptions)//this will return a promise from this request
	})
	.then(data =>{//3.then when 2 finishes run this code
		res.json({
			note:"New block mined & broadcast complete.",
			block: newBlock
		});
	});
});

app.post('/receive-new-block',function(req,res){
	const newBlock = req.body.newBlock;
	const lastBlock = bitcoin.getLastBlock();
	const correctHash = lastBlock.hash === newBlock.previousBlockHash;//checking if the new block does indeed come after the previous block to make sure blockchain is not tampered with
	const correctIndex = lastBlock['index']+1 === newBlock['index'];

	if(correctHash && correctIndex){
		bitcoin.chain.push(newBlock);
		bitcoin.pendingTransactions=[];
		res.json({
			note:'new block received and accepted',
			newBlock : newBlock
		});
	}else{//if new block is not legit
		res.json({
			note:'new block rejected',
			newBlock:newBlock
		});
	}
});

//register a node on its own server and broadcast that node to the whole network
app.post('/register-and-breadcast-node',function(req,res){
	const newNodeUrl = req.body.newNodeUrl;
	if (bitcoin.networkNodes.indexOf(newNodeUrl)==-1) bitcoin.networkNodes.push(newNodeUrl);//if the new node is not already present, then add it to the network 

	//for all the preexisting nodes in the network, we wanna register the new node by hitting  '/register-node'  
	const regNodesPromises = [];//defining an array of promises
	bitcoin.networkNodes.forEach(networkNodeUrl => {
		//'/register-node'
		const requestOptions = {
			uri: networkNodeUrl + '/register-node',//we are hitting register node for all other networkNodes
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
	const nodeNotAlreadyPresent = bitcoin.networkNodes.indexOf(newNodeUrl) == -1;
	const notCurrentNode = bitcoin.currentNodeUrl !== newNodeUrl;//checking if the newNodeUrl is actually the current node that we are on
	if(nodeNotAlreadyPresent && notCurrentNode) bitcoin.networkNodes.push(newNodeUrl);	
	res.json({note: 'New node registered with network.'});
});

//the new node that we are registering gets the other nodes data at this 
//this endpoint is only hit on the new node that we are registering on the network
app.post('/register-nodes-bulk',function(req,res){
	const allNetworkNodes = req.body.allNetworkNodes;//this is an array of all the network nodeUrls that are already in our blockchain network
	allNetworkNodes.forEach((networkNodeUrl) => {
		const nodeNotAlreadyPresent = bitcoin.networkNodes.indexOf(networkNodeUrl) == -1;//if node not already present in the array
		const notCurrentNode = bitcoin.currentNodeUrl !== networkNodeUrl;
		if(nodeNotAlreadyPresent && notCurrentNode)
		{
			bitcoin.networkNodes.push(networkNodeUrl); //looping through all the urls in the array and registering it with the new node
		}
	});
	res.json({ note : 'Bulk register complete.'});
});

//
app.get('/consensus',function(req,res){
	const requestPromises = [];
	bitcoin.networkNodes.forEach(networkNodeUrl =>{
		const requestOptions = {
			uri:networkNodeUrl + '/blockchain',
			method : 'GET',
			json:true
		};
		requestPromises.push(rp(requestOptions));
	});
 
	/*blockchains present inside the 'then' is an array of all the other blockchains that are hosted on all the other nodes in our network*/
	Promise.all(requestPromises)
	.then(blockchains=>{
		const currentChainLength = bitcoin.chain.length;
		let maxChainLength = currentChainLength;
		let newLongestChain = null;
		let newPendingTransactions = null;

		blockchains.forEach(blockchain => {
			/*here we cycle through all the blockchains of the blockchains array that we get to check if there is any blockhchain in the network that is bigger than the blockchain hosted on our current node*/
			if(blockchain.chain.length > maxChainLength){
				maxChainLength = blockchain.chain.length;
				newLongestChain = blockchain.chain;
				newPendingTransactions = blockchain.pendingTransactions;
			};
		});

		if(!newLongestChain || (newLongestChain && bitcoin.chainIsValid(newLongestChain))){
			res.json({
				note:'current chain has not been replaced',
				chain : bitcoin.chain 
			});
		}
		else if(newLongestChain && bitcoin.chainIsValid(newLongestChain)){
			bitcoin.chain = newLongestChain;
			bitcoin.pendingTransactions = newPendingTransactions;
			res.json({
				note:'this chain has been replaces',
				chain:bitcoin.chain
			});
		}

	});
});



app.listen(port,function(){
	console.log(`port open on port ${port}`);
})