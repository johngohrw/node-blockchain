console.log('server2 is running!');

// module imports
const rng = require("./rng");
const socketFunctions = require("./socket");
const Blockchain = require("./def/Blockchain");
const Block = require('./def/Block');
const validate = require('./helper').validate;
const findWithAttr = require('./helper').findWithAttr;

// port numbers
const express_port = 3001;
const io_port = 8001;
const io_client_port = 9001;

// starting express and socket.io instances
const io = require('socket.io').listen(io_port);
const io_client_server = require('socket.io').listen(io_client_port);
const io_client = require('socket.io-client');
const express = require('express');
const app = express();

// Initialize spreadsheet content
const fs = require('fs');
const filename = "./results.tsv"
const LE = "\r\n";
fs.writeFileSync(filename, `amount\tsize${LE}`);

const fileOptions = { flags: 'a' }; // append to file
var fileStream = fs.createWriteStream(filename, fileOptions);

const writePayloadSize = (payload, deserialized) => {
    const amount = deserialized.amount;
    const size = sizeof(payload);
    fileStream.write(`${amount}\t${size}${LE}`);
};

// Object-sizeof module
const sizeof = require('object-sizeof');

// this Node's info
var nodeInfo = require("./def/NodeInfo").Record;
nodeInfo.name = "server2";
nodeInfo.portSocketio = io_port;
nodeInfo.portExpress = express_port;
nodeInfo.address = `http://localhost:${io_port}`;
nodeInfo.wealth = 10;

// starting express server
app.listen(express_port, () => {
    console.log(`${nodeInfo.name} >>> Express server listening at ${express_port}`);
});

app.use(express.static('public'));  // serves 'public' folder to client.

// creating blockchain object
var myBlockChain = new Blockchain();

// globally synchronized list of all nodes and sockets in the network
var node_records = [nodeInfo];
var sockets = [null];

// server to server discovery beacon.
socketFunctions.discover(io_client, io_port, io_client_server, nodeInfo, node_records, sockets, myBlockChain,
    // Failed to discover valid blockchain networks,
    // callback creates genesis block, starts a new network.
    () => {
        console.log(`${nodeInfo.name} >>> Generating genesis block..`)
        myBlockChain.createGenesisBlock();

    },
    // Blockchain updating callback
    (newBlockchain) => {
        myBlockChain = newBlockchain;
        console.log(`${nodeInfo.name} >>> Blockchain updated! length: ${JSON.stringify(myBlockChain.chain.length)}`)
    },
    // blockchain validator callback
    (transaction, originServer) => {
        const deserialized = JSON.parse(transaction);
        writePayloadSize(transaction, deserialized);

        let newBlockchain = new Blockchain();
        newBlockchain.chain = myBlockChain.chain;
        validate(deserialized, newBlockchain, (block) => {
            if (block === null) {
                console.log("Transaction was invalid.");
                let socketIndex = findWithAttr(node_records, 'name', originServer.name);
                let originSocket = sockets[socketIndex];
                originSocket.emit('invalid')
            }
            else {
                console.log('Transaction valid!')
                nodeInfo.wealth += 3;
                console.log(`Added +3 wealth to ${nodeInfo.name}`)
                console.log(`${nodeInfo.name} now has ${nodeInfo.wealth} wealth.`)
                console.log("Block added, need to inform others!");
                sockets.map((current) => {
                    if (current !== null) {
                        console.log(`emit addblock to ${current.id}`);
                        current.emit('addBlock', block, originServer);
                    }
                });
            }
        });
    }
);

// client to server listener
io_client_server.sockets.on("connection", (socket) => {
    let self = node_records[0];
    console.log(`${nodeInfo.name} >>> a client has connected to the server!`);

    socket.on('updateBlockchain', (callback) => {
        callback(myBlockChain);
    });

    socket.on('transaction', (transaction) => {
        console.log(`incoming transaction! ${transaction}`);
        const wealth = node_records.map((record) => record.wealth);
        console.log(`wealth of servers: ${wealth}`);
        const result = rng.decideValidator(wealth);
        console.log(`Validator chosen: ${result} (array index)`);
        if (sockets[result] !== null) {
            let originServer = nodeInfo;
            sockets[result].emit('validate', transaction, originServer);
        }
        // When the server itself becomes the validator
        else {
            console.log(`${nodeInfo.name} >>> Oh, its me. I have picked myself as the validator`);
            let newDeserialized = JSON.parse(transaction);
            validate(newDeserialized, myBlockChain, (block) => {
                if (block === null) {
                    console.log("Transaction was invalid.");
                    io_client_server.sockets.emit('clientInvalidTransaction')
                }
                else {
                    console.log('Transaction valid!')
                    nodeInfo.wealth += 3;
                    console.log(`Added +3 wealth to ${nodeInfo.name}`)
                    console.log(`${nodeInfo.name} now has ${nodeInfo.wealth} wealth.`)
                    console.log("Block added, need to inform other server nodes!");
                    let originServer = nodeInfo;
                    sockets.map((current) => {
                        if (current !== null) {
                            console.log(`emitting addBlock to ${current.id}`);
                            current.emit('addBlock', block, originServer);
                        }
                    });
                    // tell client transaction was a success
                    io_client_server.sockets.emit('clientTransactionSuccess')
                }
            });
        }
    });

    socket.on("disconnect", () => {
        console.log(`${nodeInfo.name} >>> a client has disconnected from the server!`);
    });
})

// server to server listener
io.sockets.on('connection', (socket) => {

    // Initial join handshake, when a new node joins this network
    socket.on('joinHandshake1', (newNodeInfo, socketid) => {
        node_records.push(newNodeInfo) // adds new node's Record
        sockets.push(socket) // add new node's socket
        console.log(`${nodeInfo.name} >>> ${newNodeInfo.name} connected. List of nodes and sockets updated`)

        // debug printing
        console.log(' ------------- connected sockets')
        sockets.forEach(obj => {
            if (obj === null) {
                console.log('| > null (myself)');
            } else {
                console.log(`| > ${obj.id}`);
            }
        });
        console.log(' - - - - - - - ')
        node_records.forEach(obj => {
            console.log(`| > ${obj.name}`);
        })
        console.log(' ------------- connected servers')

        // acknowledge the connection of the new Node, sends info about current Node.
        socket.emit('joinAcknowledge1', nodeInfo);
    })

    // second join handshake, shares list of connected peers with newly joined node
    socket.on('joinHandshake2', () => {
        socket.emit('joinAcknowledge2', node_records)
    })

    // If some other node wants to check whether this server is part of a
    // 'valid blockchain network'. callback returns true or false.
    // is determined by the existence of genesis block.
    socket.on('networkIsValid', (callback) => {
        if (myBlockChain.chain.length > 0) {
            callback(true);
        } else {
            callback(false);
        }
    })

    // sends peer the requested blockchain
    socket.on('getBlockchain', (callback) => {
        callback(myBlockChain);
    })

    // Server chosen to be validator
    socket.on('validate', (transaction, originServer) => {
        console.log(`${nodeInfo.name} >>> ${originServer.name} has picked this server as a Validator`);

        const deserialized = JSON.parse(transaction);
        writePayloadSize(transaction, deserialized);

        validate(deserialized, myBlockChain, (block) => {
            if (block === null) {
                console.log("Transaction was invalid.");
                socket.emit('invalid');
            }
            else {
                console.log('Transaction valid!')
                nodeInfo.wealth += 3;
                console.log(`Added +3 wealth to ${nodeInfo.name}`)
                console.log(`${nodeInfo.name} now has ${nodeInfo.wealth} wealth.`)
                console.log("Block added, need to inform others!");
                sockets.map((current) => {
                    if (current !== null) {
                        console.log(`emit addblock to ${current.id}`);
                        current.emit('addBlock', block, originServer);
                    }
                });
            }
        });
    });

    // When one of the servers broadcasts a new block
    socket.on('addBlock', (block, originServer) => {
        let newBlock = new Block();
        Object.keys(newBlock).map((key, index) => {
            newBlock[key] = block[key];
        });
        myBlockChain.addBlock(newBlock);
        console.log(`New block has been added to chain by a client from ${originServer.name}`);

        // inform client of success if im the one who performed the transaction.
        if (originServer.name === nodeInfo.name) {
            io_client_server.sockets.emit('clientTransactionSuccess');
        }
    });

    // When one of the servers broadcasts a new block
    socket.on('invalid', () => {
        console.log("That was an invalid transaction that you sent!");
        io_client_server.sockets.emit('clientInvalidTransaction')
    });

    // Upon external socket's disconnection,
    // remove nodeInfo & socket.id from node_records & sockets
    socket.on("disconnect", () => {
        let indexToDelete = null;
        indexToDelete = sockets.indexOf(socket);
        // only update 'node_records' and 'sockets' if the socket.id can be found in 'sockets'
        if (indexToDelete !== -1) {
            console.log(`${nodeInfo.name} >>> ${node_records[indexToDelete].name} has disconnected, updating node records and sockets list`);
            sockets.splice(indexToDelete, 1);
            node_records.splice(indexToDelete, 1);

            // debug printing
            console.log(' ------------- connected sockets')
            sockets.forEach(obj => {
                if (obj === null) {
                    console.log('| > null (myself)');
                } else {
                    console.log(`| > ${obj.id}`);
                }
            });
            console.log(' - - - - - - - ')
            node_records.forEach(obj => {
                console.log(`| > ${obj.name}`);
            })
            console.log(' ------------- connected servers')
        }
    });
})

