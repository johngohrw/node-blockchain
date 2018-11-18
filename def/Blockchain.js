let Block = require("./Block");

module.exports = class Blockchain {

    constructor() {
        this.chain = [];
    }

    createGenesisBlock() {
        this.chain.push(new Block(0, new Date().getTime(), "Genesis Block", "0", "0", "0", "0"));
    }

    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    addBlock(newBlock) {
        newBlock.prevHash = this.getLatestBlock().hash;
        newBlock.hash = newBlock.calculateHash();
        this.chain.push(newBlock);
    }

    getLength() {
        return this.chain.length;
    }

    isChainValid() {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const prevBlock = this.chain[i - 1];
            if (currentBlock.hash != currentBlock.calculateHash()) {
                return false;
            }
            if (currentBlock.prevHash != prevBlock.hash) {
                return false;
            }
          }
            return true;
    }

    calculateBalance(client){
        let bal = 0
        for (let i = 0; i < this.chain.length; i++){
            let curr = this.chain[i]
            if (curr.from == client)
                bal -= curr.amount;
            if (curr.to == client)
                bal += curr.amount;
        }
        return bal
    }

    checkAmount(bal, amount){
        let value = 0
        value = bal - amount
        if (value < 0){
            return false
        }
        else{
            return true
        }
    }
}
