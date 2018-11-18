const SHA256 = require('crypto-js/sha256');

module.exports = class Block {
    
    constructor(index, timeStamp, description,from, to, amount, prevHash = "") {
        this.index = index;
        this.timeStamp = timeStamp;
        this.description = description;
        this.prevHash = prevHash;
        this.from = from;
        this.to = to;
        this.amount = amount;
        this.hash = this.calculateHash();
    }

    calculateHash() {
        return SHA256(this.index + this.prevHash + this.timeStamp + JSON.stringify(this.data) + this.from, + this.to + this.amount).toString();
    }
}
