const Block = require("./def/Block.js");
const blockchain = require("./def/Blockchain.js");

module.exports = {
    validate: (transaction, BlockChain, callback) => {
        const sender = transaction.from;
        const receiver = transaction.to;
        const description = transaction.desc;
        const amount = transaction.amount;

        let newBlockchain = new blockchain();
        newBlockchain.chain = BlockChain.chain;

        const balance = newBlockchain.calculateBalance(sender);

        let block = null;
        if ( newBlockchain.checkAmount(balance, amount) ) {
            const index = newBlockchain.getLength();
            const timestamp = new Date().getTime();
            block = new Block(index, timestamp,
                    description, sender,
                    receiver, amount);
            newBlockchain.addBlock(block);
        }

        callback(block);
    },

    findWithAttr: (array, attr, value) => {
        for(var i = 0; i < array.length; i += 1) {
            if(array[i][attr] === value) {
                return i;
            }
        }
        return -1;
    }
}
