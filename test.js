const io_client = require("socket.io-client");

const port = 9000;
const url = `http://localhost:${port}`;
console.log(`Connecting to ${url}`);

const socket = io_client.connect(url);

let transaction1 = {from: "C1", to: "C2", amount: 0, desc: "description"};
const max = 1000000;
let amount = 1;
let desc = 'hahaha';
const increment = 10;
socket.on("connect", () => {
    let timer = setInterval( () => {
        console.log(`Current amount: ${amount}`);
        transaction1.amount = amount;
        transaction1.desc = desc;
        socket.emit("transaction", JSON.stringify(transaction1));

        if (amount === max) {
            console.log("END OF BENCHMARKING");
            clearInterval(timer);
            process.exit(0);
        }
        else {
            amount *= increment;
            desc += desc;
        }
    }, 200);
});

