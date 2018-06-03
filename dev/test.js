const Blockchain = require('./blockchain');
const bitcoin = new Blockchain();
console.log(bitcoin);
// const previousBlockHash = 'dasfasas';
// const currentBlockData = [
// 	{
// 		amount :10,
// 		sender:'dasdas',
// 		recepient :'dasdasfafa'
// 	},
// 	{
// 		amount :5,
// 		sender:'dasfas',
// 		recepient:'dasdasdafa'
// 	},
// 	{
// 		amount:65,
// 		sender:'fasfasfag',
// 		recepient:'fasfg'
// 	}
// ];

// console.log(bitcoin.proofOfWork(previousBlockHash,currentBlockData));
// const nonce = 100;
// bitcoin.hashBlock(previousBlockHash,currentBlockData,nonce);
// console.log(bitcoin.hashBlock(previousBlockHash,currentBlockData,nonce));