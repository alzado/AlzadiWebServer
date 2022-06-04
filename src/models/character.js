
class Character {
    constructor(characterObject) {
        this.account = characterObject.account;
        this.xLocation = characterObject.xLocation;
        this.yLocation = characterObject.yLocation;
    }

    convertToObject = () => {
        return JSON.parse(JSON.stringify(this));
    }

    updateLocation = (locationObject) => {
        this.xLocation = locationObject.xLocation;
        this.yLocation = locationObject.yLocation;
    };

    getAccount = () => {
        return this.account;
    };
}

class NewCharacter {
    constructor(account, hash) {
        this.private = {
            hash: hash,
        };
        this.public = {
            account: account,
            xLocation: 150,
            yLocation: 150,
        }
    }

    convertToObject = () => {
        return JSON.parse(JSON.stringify(this));
    }
}

module.exports.Character = Character;
module.exports.NewCharacter = NewCharacter;