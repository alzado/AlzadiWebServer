const { MongoClient } = require('mongodb');
const crypto = require('crypto');
const { randomUUID } = require('crypto');
const WebSocket = require('ws');
const { WebSocketServer } = require('ws');

const { NewCharacter } = require('./models/character.js');
const { Monster } = require('./models/monster.js');

// SERVER FUNCTIONALITY

let connectedClients = new Map(); // keep track of logged clients
let connectedAccounts = new Map();
let webSocketServer = new WebSocketServer({ port: 8080 }); // initiate a new server that listens on port 8080

// set up event handlers and do other things upon a client connecting to the server
webSocketServer.on('connection', (webSocket) => {
    let connectedClientId = randomUUID();
    connectedClients.set(webSocket, connectedClientId);
    console.log(`Client connected with id: ${connectedClientId}`);

    // send a message to all connected clients upon receiving a message from one of the connected clients
    webSocket.on('message', (dataReceived) => {
        console.log(`Received: ${dataReceived}`);

        let objectReceived = JSON.parse(dataReceived); // get JSON object from string

        if (objectReceived.topic === "characterLogin") {
            characterLogin(webSocket, objectReceived.content);
        } else if (objectReceived.topic === "characterMove") {
            characterMove(webSocket, objectReceived.content);
        } else if (objectReceived.topic === "characterLogout") {
            characterLogout(webSocket, objectReceived.content);
        } else if (objectReceived.topic === "characterCreate") {
            characterCreate(webSocket, objectReceived.content);
        } else if (objectReceived.topic === "uploadCharacterInfo") {
            uploadCharacterInfo(webSocket, objectReceived.content);
        }
    });

    // stop tracking the client upon that client closing the connection
    webSocket.on('close', () => {
        console.log(`Client ${connectedClients.get(webSocket)} has disconnected`);
        connectedClients.delete(webSocket);

        if (connectedAccounts.has(webSocket)) {
            console.log(`${connectedAccounts.get(webSocket)} has disconnected`);
            connectedAccounts.delete(webSocket);
        }
    });

});

console.log('Web Server is running and waiting for Game Server to connect');

// send a message to all the connected clients about how many of them there are every 15 seconds
// setInterval(() => {
// }, 10000);

function broadcastToGameServer(webSocket, topic, message, objectToSend) {
    let objetToBroadcast = { topic: topic, message: message, content: objectToSend };
    console.log(`Sent: ${JSON.stringify(objetToBroadcast)}`);
    webSocket.send(JSON.stringify(objetToBroadcast));
}



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
function updateCharacterInDataBase(resolve, reject, objectReceived) {
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


// GAME FUNCTIONALITY

// On character login
async function characterLogin(webSocket, objectToFind) {
    //check if account exists
    let doesAccountExist = false;
    let promise = new Promise((resolve, reject) => {
        checkIfAccountDoesExistInDataBase(resolve, reject, objectToFind);
    });
    try {
        await promise;
        doesAccountExist = true;
    } catch (error) {
        broadcastToGameServer(webSocket, "characterLoginError", error, objectToFind);
    }

    if (doesAccountExist) {
        //check if password is correct
        let isPasswordCorrect = false;
        let promise = new Promise((resolve, reject) => {
            checkIfPasswordIsCorrect(resolve, reject, objectToFind);
        });

        try {
            await promise;
            isPasswordCorrect = true;
        } catch (error) {
            broadcastToGameServer(webSocket, "characterLoginError", error, objectToFind);
        }

        if (isPasswordCorrect) {

            //check if account is already loged in
            let isLogedIn = false;
            connectedAccounts.forEach((value, key, map) => {
                if (objectToFind.account === value) {
                    isLogedIn = true;
                    broadcastToGameServer(webSocket, "characterLoginError", "Account already loged in", objectToFind);
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
                    broadcastToGameServer(webSocket, "characterLoginSuccess", null, result);

                    // Important: here Character is created
                    connectedAccounts.set(webSocket, objectToFind.account);
                    console.log(`${connectedAccounts.get(webSocket)} logged in`);
                } catch (error) {
                    console.log(error);
                    broadcastToGameServer(webSocket, "characterLoginError", error, null);
                }
            }
        }
    }
}

// On character move
async function uploadCharacterInfo(webSocket, objectReceived) {

    // update account
    objectReceived.account = connectedAccounts.get(webSocket);

    // save location of character in DB
    let promise = new Promise((resolve, reject) => {
        updateCharacterInDataBase(resolve, reject, objectReceived)
    });

    try {
        await promise;
        broadcastToGameServer(webSocket, "uploadCharacterInfoSuccess", null, null);
        console.log("Player info updated");
    } catch (error) {
        broadcastToGameServer(webSocket, "uploadCharacterInfoError", null, null);
        console.log(error);
    }
}

// On character logout
async function characterLogout(webSocket, objectReceived) {

    // let objectToUpdate = s.get(webSocket).convertToObject();
    // save everything before logout
    objectReceived.account = connectedAccounts.get(webSocket);

    let promise = new Promise((resolve, reject) => {
        updateObjectInDataBase(resolve, reject, objectReceived);
    });

    try {
        //wait until saved
        await promise;

        // delete info in memory
        if (connectedAccounts.has(webSocket)) {
            connectedAccounts.delete(webSocket);
        }

        // let user know that character is saved, so can proceed to logout
        broadcastToGameServer(webSocket, "characterLogoutSuccess", null, null);
        console.log(`${objectReceived.account} successfully logged out`);
    } catch (error) {
        broadcastToGameServer(webSocket, "characterLogoutError", null, null);
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
        await promise;
    } catch (error) {
        doesAccountExist = true;
        broadcastToGameServer(webSocket, "characterCreateError", error, null);
    }

    if (!doesAccountExist) {

        // check if account is 8 digit long
        let doesAccountIsLongEnough = false;
        if (objectReceived.account.length >= 1) {
            doesAccountIsLongEnough = true;
        } else {
            broadcastToGameServer(webSocket, "characterCreateError", "Account must be 8 character long", null);
        }

        if (doesAccountIsLongEnough) {

            // check if password is 8 digit long
            let doesPasswordIsLongEnough = false;
            if (objectReceived.password.length >= 1) {
                doesPasswordIsLongEnough = true;
            } else {
                broadcastToGameServer(webSocket, "characterCreateError", "Password must be 8 character long", null);
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
                    broadcastToGameServer(webSocket, "characterCreateSuccess", result, null);
                } catch (error) {
                    broadcastToGameServer(webSocket, "characterCreateError", error, null);
                }
            }
        }
    }
}