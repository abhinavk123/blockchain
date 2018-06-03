const sha256 = require('sha256');

function Blockchain(){
	this.chain = [];
	this.pendingTransactions = [];

	this.createNewBlock(100,'0','0');//this will be used to create our genesis block using arbitary parameters
};

Blockchain.prototype.createNewBlock = function(nonce, previousBlockHash, hash) {
	const newBlock = {
		index: this.chain.length +1,//describes what number block is this in our blockchain
		transactions : this.pendingTransactions,//all the transcastions in this block should be the new transactions that are waiting to be placed inside this block (that is all new transactions since the creatin f the previous block)
		nonce : nonce,//a proof that this block was created in a legit way using proof of work
		hash: hash,//single string of code that has the record of all previous transactions of current block
		previousBlockHash : previousBlockHash//data transactions of upto previous block
	};
	this.pendingTransactions = [];//clearing the pending transactions
	this.chain.push(newBlock);

	return newBlock;
}

Blockchain.prototype.getLastBlock = function(first_argument) {
	return this.chain[this.chain.length -1];
}

Blockchain.prototype.createNewTransaction = function(amount, sender, recepient) {
	const newTransaction = {
		amount : amount,
		sender : sender,
		recepient :recepient
	};

	this.pendingTransactions.push(newTransaction);//this add the newTransaction to the pendingTransactions array

	return this.getLastBlock()['index']/*index of the last block in our chain*/ + 1;
}

Blockchain.prototype.hashBlock = function(previousBlockHash, currentBlockData, nonce) {
	const dataAsString = previousBlockHash + nonce.toString() +JSON.stringify(currentBlockData);//taking all the passed in data concatenated into a single string
	const hash = sha256(dataAsString);
	return hash;
}

//the method that will be required to generate the proof of work .It is difficult and complex to generate the proof of work but verry easy to verify
Blockchain.prototype.proofOfWork = function(previousBlockHash, currentBlockData) {
	//we are trying to get a hash value that starts with four zeros for that we start with a nonce value of zero and reiterate it multiple times by incrementing the nonce value, till we get our needed hash value  
	let nonce = 0;
	let hash = this.hashBlock(previousBlockHash,currentBlockData, nonce);
	while(hash.substring(0,4)!=='0000'){
		nonce++;
		hash = this.hashBlock(previousBlockHash,currentBlockData,nonce);

	}

	return nonce;//returning the suitable nonce
}

module.exports = Blockchain;//exporting constructer function so it can be tested in test.js