
const io_port = parseInt(window.location.port) + 6000;  // 3000 becomes 9000, 3001 becomes 9001
const io_address = `${window.location.hostname}:${io_port}`;
const socket = io(io_address);

var blockchain = {};

socket.on('connect', function(){
    console.log('connected!')
    document.getElementById("status-bar").innerHTML = `socket.io connected to ${io_address}`;

    // updates blockchain upon connection. autoupdates in a 10 second interval.
    updateBlockchain();
    setInterval(updateBlockchain,10000);
});

socket.on('clientInvalidTransaction', () => {
    console.log('invalid transaction')
    document.getElementById("status-bar").innerHTML = `invalid transaction ;(`;

});

socket.on('clientTransactionSuccess', () => {
    console.log('transaction success')
    document.getElementById("status-bar").innerHTML = `transaction success ;)`;

});

socket.on('disconnect', function(){
    console.log('disconnect!')
    document.getElementById("status-bar").innerHTML = `socket.io disconnected from ${io_address}`;
    clearInterval(updateBlockchain);
});

// submitting a new transaction
document.getElementById("submit-transaction").onclick = () => {
    let from = document.getElementById("input--from").value;
    let to = document.getElementById("input--to").value;
    let amount = document.getElementById("input--amount").value;
    let desc = document.getElementById("input--desc").value;

    // form validations (empty fields, numbers only in 'amount' field).
    if (from === "" || to === "" || amount === "" || desc === "") {
        alert('all fields must be filled!')
        return;
    };
    if (!/^[0-9]*$/.test(amount)) {
        alert('amount must be in numbers only!')
        return;
    }

    let transaction = {from, to, amount, desc}
    socket.emit('transaction', JSON.stringify(transaction));
    console.log(`transaction emitted: ${transaction}`);

    // resetting form values, update status bar
    document.getElementById("input--from").value = "";
    document.getElementById("input--to").value = "";
    document.getElementById("input--amount").value = "";
    document.getElementById("input--desc").value = "";
    document.getElementById("status-bar").innerHTML = 'transaction has been sent to the server!';

};

// requests latest blockchain from server node
const updateBlockchain = () => {
    console.log('updateblockchain!');
    socket.emit('updateBlockchain', (newBlockchain) => {

        blockchain = newBlockchain.chain;
        $('.blockchain-container--inner').empty(); // emptying container

        for (let i = 0; i < blockchain.length; i++) {
            let newBlock = `<div class="blockchain__block">
                                <strong>timestamp:</strong><br>
                                ${blockchain[i].timeStamp}<br>
                                <strong>hash:</strong><br>
                                <span class="smallcode">${blockchain[i].hash}</span><br>
                                <strong>prevhash:</strong><br>
                                <span class="smallcode">${blockchain[i].prevHash}</span><br>
                                <strong>description:</strong><br>
                                ${blockchain[i].description}<br>
                                <strong>from:</strong><br>
                                ${blockchain[i].from}<br>
                                <strong>to:</strong><br>
                                ${blockchain[i].to}<br>
                                <strong>amount:</strong><br>
                                ${blockchain[i].amount}
                            </div>`
            let connector = `<div class="blockchain__connector"> </div>`;
            // if (i !== 0) {
            //    $('.blockchain-container--inner').append(connector);
            // };
            $('.blockchain-container--inner').append(newBlock);
            $('.blockchain-container--inner').append(connector);
        };

    });




}
