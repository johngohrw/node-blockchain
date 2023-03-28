
const io_port = parseInt(window.location.port) + 6000;  // 3000 becomes 9000, 3001 becomes 9001
const io_address = `${window.location.hostname}:${io_port}`;
const socket = io(io_address);

TimeAgo.addDefaultLocale({
    locale: 'en',
    now: {
        now: {
            current: "now",
            future: "in a moment",
            past: "just now"
        }
    },
    long: {
        year: {
            past: {
                one: "{0} year ago",
                other: "{0} years ago"
            },
            future: {
                one: "in {0} year",
                other: "in {0} years"
            }
        },
    }
})

const timeAgo = new TimeAgo('en-US')

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min); // The maximum is exclusive and the minimum is inclusive
}

var blockchain = {};

socket.on('connect', function () {
    console.log('connected!')
    document.getElementById("status-bar").innerHTML = `socket.io connected to ${io_address}`;

    // updates blockchain upon connection. autoupdates in a 10 second interval.
    updateBlockchain();
    setInterval(updateBlockchain, 10000);
});

socket.on('clientInvalidTransaction', () => {
    console.log('invalid transaction')
    document.getElementById("status-bar").innerHTML = `invalid transaction ;(`;

});

socket.on('clientTransactionSuccess', () => {
    console.log('transaction success')
    document.getElementById("status-bar").innerHTML = `transaction success ;)`;

});

socket.on('disconnect', function () {
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

    let transaction = { from, to, amount, desc }
    socket.emit('transaction', JSON.stringify(transaction));
    console.log(`transaction emitted: ${transaction}`);

    // resetting form values, update status bar
    document.getElementById("input--from").value = "";
    document.getElementById("input--to").value = "";
    document.getElementById("input--amount").value = "";
    document.getElementById("input--desc").value = "";
    document.getElementById("status-bar").innerHTML = 'transaction has been sent to the server!';

};



const createBlockNode = ({ amount, timestamp, hash, prevHash, description, to, from }) => {
    const blockEl = document.createElement("div")
    blockEl.setAttribute("class", "blockchain__block")
    blockEl.innerHTML = `
        <div class="blockchain__block-top">
            <div class="blockchain__block-topleft">
                <div class="blockchain__block-to">${to}</div>
                <div class="blockchain__block-from">
                    <img class="blockchain__block-arrow" src="bent arrow.svg"/>
                    <span class="blockchain__block-from-inner">${from}</span>
                </div>
            </div>
            <div class="blockchain__block-topright">
                <span class="blockchain__block-amount">${amount}</span>
                <span class="blockchain__block-currency">coins</span>
            </div>
        </div>
        <div class="blockchain__block-mid">
            ${description}
        </div>
        <div class="blockchain__block-bottom">
            <div class="blockchain__block-timestamp">${new Date(timestamp).toLocaleString()}</div>
            <div class="blockchain__block-more" title="hash: ${hash}\nprevious hash: ${prevHash}">more details</div>
        </div>
    `
    return blockEl

}

// requests latest blockchain from server node
const updateBlockchain = () => {
    console.log('updateblockchain!');
    socket.emit('updateBlockchain', (newBlockchain) => {

        blockchain = newBlockchain.chain;
        $('.blockchain-container--inner').empty(); // emptying container

        for (let i = 0; i < blockchain.length; i++) {

            let newBlock = createBlockNode({
                to: blockchain[i].to,
                from: blockchain[i].from,
                description: blockchain[i].description,
                amount: blockchain[i].amount,
                timestamp: blockchain[i].timeStamp,
                hash: blockchain[i].hash,
                prevHash: blockchain[i].prevHash
            })
            let connector = `<div class="blockchain__connector"> </div>`;
            // if (i !== 0) {
            //    $('.blockchain-container--inner').append(connector);
            // };
            if (i > 0) {
                $('.blockchain-container--inner').append(connector);
            }
            $('.blockchain-container--inner').append(newBlock);
        };

    });

}


const validPeople = ["Rihanna", "Steve Jobs", "George Harrison", "Christopher Reeve",
    "Robin Williams", "Beyonce", "Kanye West", "Lionel Messi", "Gordon Ramsay"]

validPeople.forEach(name => {
    const optionEl = document.createElement("option")
    optionEl.setAttribute("value", name)
    optionEl.innerHTML = name
    document.getElementById("input--from").appendChild(optionEl)
})

validPeople.forEach(name => {
    const optionEl = document.createElement("option")
    optionEl.setAttribute("value", name)
    optionEl.innerHTML = name
    document.getElementById("input--to").appendChild(optionEl)
})


const descriptions = [
    "Futsal session last night",
    "Cigarettes",
    "Dinner last night",
    "Uber",
    "Thanks for that",
    "Concert tickets",
    "Gym membership",
    "New Shoes!",
    "Ski holiday",
    "New clothes",
    "Football tickets for everyone",
    "My dentist visit",
    "Phone repair",
    "For calling the locksmith",
    "Transport back home",
    "What i owed you",
    "Birthday lunch",
    "Pizza money",
    "Rent for July",
    "Mechanic",
    "For the trouble",
]


setInterval(() => {
    // get random to and from
    let from_ = 0
    let to_ = getRandomInt(1, validPeople.length)
    const rotate = getRandomInt(0, validPeople.length)
    from_ = (from_ + rotate) % validPeople.length
    to_ = (to_ + rotate) % validPeople.length

    console.log(from_, to_)
    const transaction_ = {
        from: validPeople[from_],
        to: validPeople[to_],
        desc: descriptions[getRandomInt(0, descriptions.length)],
        amount: getRandomInt(10, 200)
    }
    console.log("emitting transaction:", transaction_)
    socket.emit('transaction', JSON.stringify(transaction_));
}, 9500)


document.getElementById("toggleAccordion").addEventListener("click", () => {
    const closed = document.getElementById("form-container").classList.contains("closed")
    if (closed) {
        document.getElementById("form-container").classList.remove("closed")
    } else {
        document.getElementById("form-container").classList.add("closed")
    }
})
