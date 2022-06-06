const { MongoClient } = require('mongodb');
const crypto = require('crypto');
const { randomUUID } = require('crypto');
const WebSocket = require('ws');
const { WebSocketServer } = require('ws');

const { Character, NewCharacter } = require('./models/character.js');
const { Monster } = require('./models/monster.js');

// SERVER FUNCTIONALITY

let connectedClients = new Map(); // has to be a Map instead of {} due to non-string keys
let connectedAccounts = new Map(); // keep track of logged clients
let connectedServer;
let spawnedMonsters = new Map();
let webSocketServer = new WebSocketServer({ port: 8080 }); // initiate a new server that listens on port 8080
// let counterDataReceived = 0; // debuger

// set up event handlers and do other things upon a client connecting to the server
webSocketServer.on('connection', (webSocket) => {
    const connectedClientId = randomUUID(); // create an id to track the client
    connectedClients.set(webSocket, connectedClientId); // assign id to client
    console.log(`New connection assigned id: ${connectedClientId}`);

    // send a message to all connected clients upon receiving a message from one of the connected clients
    webSocket.on('message', (dataReceived) => {
        // counterDataReceived += 1; // debuger
        // console.log(counterDataReceived);
        console.log(`Received: ${dataReceived}`);

        let objectReceived = JSON.parse(dataReceived); // get JSON object from string

        if (objectReceived.topic === "serverStart") {
            if (connectedServer === undefined || connectedServer === null) {
                connectedServer = webSocket; // VOY A TENER QUE GENERAR LAS COMUNICACIONES DEL SERVER
                console.log("Server connected");
            } else {
                console.log("Server already running");
                webSocket.close();
            }
        } else {
            if (connectedServer === undefined || connectedServer === null) {
                broadcastToOneAccount(webSocket, "serverStartError", { message: "Server has no started yet" });
                webSocket.close();
            }
            else if (objectReceived.topic === "characterLogin") {
                characterLogin(webSocket, objectReceived.content);
            } else if (objectReceived.topic === "characterMove") {
                characterMove(webSocket, objectReceived.content);
            } else if (objectReceived.topic === "characterLogout") {
                characterLogout(webSocket);
            } else if (objectReceived.topic === "characterCreate") {
                characterCreate(webSocket, objectReceived.content);
            } else if (objectReceived.topic === "monsterSpawn") {
                monsterSpawn(objectReceived.content);
            }

        }
    });

    // stop tracking the client upon that client closing the connection
    webSocket.on('close', () => {
        // automatic server logout
        if (connectedServer === webSocket) {
            // tell everyone that server was shut down
            connectedServer = undefined;
        }

        // automatic proxys logout
        if (connectedAccounts.has(webSocket)) {
            broadcastToOtherConnectedAccounts(webSocket, "proxyLogoutSuccess", { account: connectedAccounts.get(webSocket).getAccount() });
            connectedAccounts.delete(webSocket);
        }

        if (connectedClients.has(webSocket)) {
            console.log(`Connection (id = ${connectedClients.get(webSocket)}) closed`);
            connectedClients.delete(webSocket);
        }
    });


    // send the id back to the newly connected client
    // ws.send(JSON.stringify({ topic: "particular_communication", content: { message: `You have been assigned id ${id}` } }));
});

// send a message to all the connected clients about how many of them there are every 15 seconds
setInterval(() => {
    console.log(`Number of connected clients: ${connectedClients.size}`);

    // to prevent server shut down in 300 seconds
    if (connectedServer !== null && connectedServer !== undefined) {
        broadcastToOneAccount(connectedServer, "serverCheckSuccess", null);
    }
    // serverBroadcast({ topic: "general_communication", content: { message: `Number of connected clients: ${clients.size}` } });
}, 10000);

// broadcast to other connected accounts
function broadcastToOtherConnectedAccounts(webSocket, topic, objectToSend) {
    connectedAccounts.forEach((value, key, map) => {
        if (key.readyState === WebSocket.OPEN && key !== webSocket) {
            key.send(JSON.stringify({ topic: topic, content: objectToSend }));
        }
    });
}

// broadcast info from connected accounts to new connected account
function broadcastOtherConnectedAccountsInfoToNewConnectedAccount(webSocket, topic) {
    connectedAccounts.forEach((value, key, map) => {
        let objectToSend = { topic: topic, content: value.convertToObject() };
        webSocket.send(JSON.stringify(objectToSend));
    });
}

function broadcastToOneAccount(webSocket, topic, objectToSend) {
    webSocket.send(JSON.stringify({ topic: topic, content: objectToSend }));
}

console.log('The server is running and waiting for connections');


// DB FUNCTIONALITY

const dataBaseUrl = "mongodb://root:%40Alzadialu.3@mongodatabase"; // define db url
const dataBaseName = "alzadiDataBase"; // define db name
const dataBaseCollection = "characterInfo"; // define db collection

// Create new character
function createNewCharacterInDataBase(resolve, reject, objectToInsert) {
    MongoClient.connect(dataBaseUrl, (error, dataBase) => {
        if (error) {
            reject(error);
        } else if (dataBase === null) {
            reject("Data base does not exist");
        } else {
            let dataBaseObject = dataBase.db(dataBaseName);

            dataBaseObject.collection(dataBaseCollection).insertOne(objectToInsert, (error, result) => {
                dataBase.close();
                if (error) {
                    reject(error);
                } else if (result === null) {

                } else {
                    resolve("Character successfully created");
                }
            });
        }
    });
}

// Find objects by account

function findObjectByAccountInDataBase(resolve, reject, objectToFind) {
    MongoClient.connect(dataBaseUrl, (error, dataBase) => {
        if (error) {
            reject(error);
        } else if (dataBase === null) {
            reject("Data base does not exist");
        } else {

            let dataBaseObject = dataBase.db(dataBaseName);
            let query = { "public.account": objectToFind.account };

            dataBaseObject.collection(dataBaseCollection).findOne(query, (error, result) => {
                dataBase.close();
                if (error) {
                    reject(error);
                } else if (result === null) {
                    reject("Account does not exist");
                } else {
                    resolve(result.public);
                }
            });
        }
    });
}

// Search if account does not exist
function checkIfAccountDoesNotExistInDataBase(resolve, reject, objectToFind) {
    MongoClient.connect(dataBaseUrl, (error, dataBase) => {
        if (error) {
            reject(error);
        } else if (dataBase === null) {
            reject("Data base does not exist");
        } else {

            let dataBaseObject = dataBase.db(dataBaseName);
            let query = { "public.account": objectToFind.account };

            dataBaseObject.collection(dataBaseCollection).findOne(query, (error, result) => {
                dataBase.close();
                if (error) {
                    reject(error);
                } else if (result === null || result === undefined) {
                    resolve("Account does not exist");
                } else {
                    reject("Account already exists");
                }
            });
        }
    });
}

// Search if account does exist
function checkIfAccountDoesExistInDataBase(resolve, reject, objectToFind) {
    MongoClient.connect(dataBaseUrl, (error, dataBase) => {
        if (error) {
            reject(error);
        } else if (dataBase === null) {
            reject("Data base does not exist");
        } else {

            let dataBaseObject = dataBase.db(dataBaseName);
            let query = { "public.account": objectToFind.account };

            dataBaseObject.collection(dataBaseCollection).findOne(query, (error, result) => {
                dataBase.close();
                if (error) {
                    reject(error);
                } else if (result === null || result === undefined) {
                    reject("Account does not exist");
                } else {
                    resolve("Account already exists");
                }
            });
        }
    });
}

// Check if password is correct
function checkIfPasswordIsCorrect(resolve, reject, objectToFind) {
    MongoClient.connect(dataBaseUrl, (error, dataBase) => {
        if (error) {
            reject(error);
        } else if (dataBase === null) {
            reject("Data base does not exist");
        } else {

            let dataBaseObject = dataBase.db(dataBaseName);
            let query = { "public.account": objectToFind.account };

            dataBaseObject.collection(dataBaseCollection).findOne(query, (error, result) => {
                dataBase.close();

                let salt = "alzadi";
                let hash = crypto.pbkdf2Sync(objectToFind.password, salt, 1000, 64, "sha512").toString("hex");

                if (error) {
                    reject(error);
                } else if (result.private.hash === hash) {
                    resolve("Password is correct");
                } else {
                    reject("Incorrect password");
                }
            });
        }
    });
}

// Update object x and y location
function updateObjectLocationInDataBase(resolve, reject, objectReceived) {
    MongoClient.connect(dataBaseUrl, (error, dataBase) => {
        if (error) reject(error);
        let dataBaseObject = dataBase.db(dataBaseName);
        let query = { "public.account": objectReceived.account };
        let paramsToUpdate = { $set: { "public.xLocation": objectReceived.xLocation, "public.yLocation": objectReceived.yLocation, "public.zLocation": objectReceived.zLocation } };
        dataBaseObject.collection(dataBaseCollection).updateOne(query, paramsToUpdate, (error, result) => {
            dataBase.close();
            if (error) {
                reject(error);
            } else if (result === null) {
                reject("Account does not exist");
            } else {
                resolve(result.public);
            }
        });
    });
}

// Save complete object
function updateObjectInDataBase(resolve, reject, objectReceived) {
    MongoClient.connect(dataBaseUrl, (error, dataBase) => {
        if (error) reject(error);
        let dataBaseObject = dataBase.db(dataBaseName);
        let query = { "public.account": objectReceived.account };
        let paramsToUpdate = { $set: { public: objectReceived } };
        dataBaseObject.collection(dataBaseCollection).updateOne(query, paramsToUpdate, (error, result) => {
            dataBase.close();
            if (error) {
                reject(error);
            } else if (result === null) {
                reject("Account does not exist");
            } else {
                resolve(result.public);
            }
        });
    });
}


// insert_object(alzadidb,character_info,{account: "gugo", is_online: false, x_location: 150, y_location: 150});

// GAME FUNCTIONALITY

// On character login
async function characterLogin(webSocket, objectToFind) {
    //check if account exists
    let doesAccountExist = false;
    let promise = new Promise((resolve, reject) => {
        checkIfAccountDoesExistInDataBase(resolve, reject, objectToFind);
    });
    try {
        let result = await promise;
        doesAccountExist = true;
    } catch (error) {
        broadcastToOneAccount(webSocket, "characterLoginError", { message: error })
    }

    if (doesAccountExist) {
        //check if password is correct
        let isPasswordCorrect = false;
        let promise = new Promise((resolve, reject) => {
            checkIfPasswordIsCorrect(resolve, reject, objectToFind);
        });

        try {
            let result = await promise;
            isPasswordCorrect = true;
        } catch (error) {
            broadcastToOneAccount(webSocket, "characterLoginError", { message: error });
        }

        if (isPasswordCorrect) {

            //check if account is already loged in
            let isLogedIn = false;
            connectedAccounts.forEach((value, key, map) => {
                if (objectToFind.account === value.getAccount()) {
                    isLogedIn = true;
                    broadcastToOneAccount(webSocket, "characterLoginError", { message: "Account already loged in" });
                }
            });

            if (!isLogedIn) {
                // Create a promise that search for character info
                let promise = new Promise((resolve, reject) => {
                    findObjectByAccountInDataBase(resolve, reject, objectToFind)
                });

                try {
                    let result = await promise; // waits until new connection data is fetched

                    // returns location to new connected character
                    broadcastToOneAccount(webSocket, "characterLoginSuccess", result);

                    // returns location to other connected characters
                    broadcastToOtherConnectedAccounts(webSocket, "proxyLoginSuccess", result);

                    // returns location of other connected characters to new connected character
                    broadcastOtherConnectedAccountsInfoToNewConnectedAccount(webSocket, "proxyLoginSuccess");

                    // Important: here Character is created
                    connectedAccounts.set(webSocket, new Character(result));
                    console.log(`${objectToFind.account} logged in`);
                } catch (error) {
                    console.log(error);
                    broadcastToOneAccount(webSocket, "characterLoginError", { message: error });
                }
            }
        }
    }
}

// On character move
async function characterMove(webSocket, objectReceived) {

    connectedAccounts.get(webSocket).updateLocation(objectReceived); // update location of character in memory
    broadcastToOtherConnectedAccounts(webSocket, "proxyMoveSuccess", objectReceived); // update location of character for other accounts

    // save location of character in DB
    let promise = new Promise((resolve, reject) => {
        updateObjectLocationInDataBase(resolve, reject, objectReceived)
    });

    try {
        let result = await promise;
        console.log("Player location updated");
    } catch (error) {
        console.log(error);
    }
}

// On character logout
async function characterLogout(webSocket) {

    let objectToUpdate = connectedAccounts.get(webSocket).convertToObject();
    // save everything before logout
    let promise = new Promise((resolve, reject) => {
        updateObjectInDataBase(resolve, reject, objectToUpdate);
    });

    try {
        //wait until saved
        let result = await promise;

        // let user know that character is saved, so can proceed to logout
        broadcastToOneAccount(webSocket, "characterLogoutSuccess", result);

        // let others know that character is loged out
        broadcastToOtherConnectedAccounts(webSocket, "proxyLogoutSuccess", objectToUpdate);

        // delete info in memory
        if (connectedAccounts.has(webSocket)) {
            connectedAccounts.delete(webSocket);
        }

        // disconect from server
        if (connectedClients.has(webSocket)) {
            connectedClients.delete(webSocket);
        }
    } catch (error) {
        console.log(error);
    }
}

async function characterCreate(webSocket, objectReceived) {

    // check if account exists
    let doesAccountExist = false;
    let promise = new Promise((resolve, reject) => {
        checkIfAccountDoesNotExistInDataBase(resolve, reject, objectReceived);
    });

    try {
        let result = await promise;
    } catch (error) {
        doesAccountExist = true;
        broadcastToOneAccount(webSocket, "characterCreateError", { message: error });
    }

    if (!doesAccountExist) {

        // check if account is 8 digit long
        let doesAccountIsLongEnough = false;
        if (objectReceived.account.length >= 1) {
            doesAccountIsLongEnough = true;
        } else {
            broadcastToOneAccount(webSocket, "characterCreateError", { message: "Account must be 8 character long" });
        }

        if (doesAccountIsLongEnough) {

            // check if password is 8 digit long
            let doesPasswordIsLongEnough = false;
            if (objectReceived.password.length >= 1) {
                doesPasswordIsLongEnough = true;
            } else {
                broadcastToOneAccount(webSocket, "characterCreateError", { message: "Password must be 8 character long" });
            }

            if (doesPasswordIsLongEnough) {
                // create character, hash password and give location
                let salt = "alzadi";
                let hash = crypto.pbkdf2Sync(objectReceived.password, salt, 1000, 64, "sha512").toString("hex");

                let objectToInsert = new NewCharacter(objectReceived.account, hash).convertToObject();

                let promise = new Promise((resolve, reject) => {
                    createNewCharacterInDataBase(resolve, reject, objectToInsert);
                });

                try {
                    let result = await promise;
                    broadcastToOneAccount(webSocket, "characterCreateSuccess", { message: result });
                } catch (error) {
                    broadcastToOneAccount(webSocket, "characterCreateError", { message: error });
                }
            }
        }
    }
}

function monsterSpawn(objectReceived) {
    // load monster in game
    spawnedMonsters(objectReceived.monsterName, new Monster(objectReceived));

    // tell all connected players a new monster apeared
    broadcastToOtherConnectedAccounts(connectedServer, "monsterSpawnSuccess", objectReceived);

    // tell new players that this monster appeared (va en character login)
}