const rng = require("./rng");
const helper = require("./helper");
const Blockchain = require('./def/Blockchain');
const Block = require('./def/Block');

// Function names
const validate = helper.validate;

module.exports = {
    
    discover: (io_client, io_port, clientPageSocket, nodeInfo, node_records, sockets, blockchain, callback, blockchainUpdaterCallback, blockchainValidatorCallback) => {

        const portLowBound = 8000;

        // Decremental search:
        // recursive search method. attempts to connect to each localhost:port decrementally
        // checking if each localhost:port is part of a valid blockchain network.
        // once it reaches the lower port boundary, searching has failed.
        // callback function will create a genesis block. 
        const decrementalSearch = (port) => {
            if (port < portLowBound) {
                console.log('Node Discovery: [Failed] Port number exceeded boundary')
                callback();  // callback creates genesis block
                return null;
            } else if (port == io_port) { // same port number as current server, skip.
                console.log(`Node Discovery: (localhost:${port}) Skipping current server..`);
                decrementalSearch(parseInt(port) - 1);
            } else {
                attemptConnect(port, (ableToConnect) => {
                    if (ableToConnect) {
                        console.log(`Node Discovery: (localhost:${port}) Valid server found`)
                        connectNode(port); // connects to this server (for real this time)
                    } else {
                        decrementalSearch(parseInt(port) - 1)
                    }
                    return null;
                });
            }
        }

        // attemptConnect:
        // auxilliary function, attempts to connect to localhost:port
        // if connection is successful, checks further if it's a valid blockchain network
        // if its not a valid server or blockchain network, callback returns false.
        const attemptConnect = (port, _callback) => {
            console.log(`Node Discovery: (localhost:${port}) Attempting connection`)
            let socket = io_client.connect(`http://localhost:${port}`);
            
            socket.on("connect", () => {
                socket.emit('networkIsValid', (isValid) => {
                    if (isValid) {
                        console.log(`Node Discovery: (localhost:${port}) Valid blockchain detected`)
                        socket.close();
                        _callback(true);
                    } else {
                        console.log(`Node Discovery: (localhost:${port}) Unable to find valid blockchain`)
                        socket.close();
                        _callback(false);
                    }
                });
            });
            socket.on("connect_error", () => {
                console.log(`Node Discovery: (localhost:${port}) Connection attempt failed`)
                socket.close();
                _callback(false);
            });
        }

        // connectNode:
        // actually connects to the localhost:port combination, joins the blockchain network
        const connectNode = (port) => {
            console.log(`${nodeInfo.name} >>> Connecting to localhost:${port}`);
            let socket = io_client.connect(`http://localhost:${port}`);
            
            socket.on("connect", () => {
                console.log(`${nodeInfo.name} >>> Connected to localhost:${port}`);

                // initiates join handshake upon joining.
                socket.emit("joinHandshake1", nodeInfo);

                // first join acknowledgement. receives peer's nodeInfo, add into our node_records
                socket.on('joinAcknowledge1', (peerInfo) => {
                    node_records.push(peerInfo);
                    sockets.push(socket) // add peer node's socket.id
                    socket.emit("joinHandshake2");
                });

                // second join acknowledgement. receives list of peers from the newly connected server.
                // also requests blockchain.
                socket.on('joinAcknowledge2', (peerList) => {
                    connectPeers(peerList);

                    socket.emit('getBlockchain', (returnedBlockchain) => {
                        blockchainUpdaterCallback(returnedBlockchain);
                    })

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

                });

                // When one of the servers broadcasts a new block
                socket.on('addBlock', (block, originServer) => {
                    
                    socket.emit('getBlockchain', (returnedBlockchain) => {
                        let newBlockchain = new Blockchain();
                        newBlockchain.chain = returnedBlockchain.chain;
                        // let newBlock = new Block();
                        // Object.keys(newBlock).map((key, index) => {
                        //     newBlock[key] = block[key];
                        // });
                        // newBlockchain.addBlock(newBlock);
                        blockchainUpdaterCallback(newBlockchain);
                    })                    
                    console.log(`New block has been added to chain by a client from ${originServer.name}`);

                    // inform client of success if im the one who performed the transaction.
                    if (originServer.name === nodeInfo.name) {
                        clientPageSocket.sockets.emit('clientTransactionSuccess');
                    }
                });

                // When one of the servers broadcasts a new block
                socket.on('invalid', () => {
                    console.log("That was an invalid transaction that you sent!");
                    clientPageSocket.sockets.emit('clientInvalidTransaction');
                });

                // Server chosen to be validator
                socket.on('validate', (transaction, originServer) => {
                    console.log(`${nodeInfo.name} >>> ${originServer.name} has picked this server as a Validator`);
                    blockchainValidatorCallback(transaction, originServer);
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

            });
        };

        const connectPeers = (peerList) => {
            let myPorts = []    // pushing my own node_record ports into a list
            for (let i = 0; i < node_records.length; i++) {
                myPorts.push(node_records[i].portSocketio);
            }
            // checks each peer's port, to see if i still need to connect to it.
            for (let i = 0; i < peerList.length; i++) {
                let currentPort = peerList[i].portSocketio;
                // if this port is not already in node_records AND is not the current port, connect to it 
                if (myPorts.indexOf(currentPort) == -1 && currentPort !== nodeInfo.portSocketio) {
                    connectNode(currentPort);
                } 
            }
        }
        decrementalSearch(io_port);
    },
};
