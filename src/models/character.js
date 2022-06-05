
class Character {
    constructor(characterObject) {
        this.account = characterObject.account;
        this.xLocation = characterObject.xLocation;
        this.yLocation = characterObject.yLocation;
        this.zLocation = characterObject.zLocation;
    }

    convertToObject = () => {
        return JSON.parse(JSON.stringify(this));
    }

    updateLocation = (locationObject) => {
        this.xLocation = locationObject.xLocation;
        this.yLocation = locationObject.yLocation;
        this.zLocation = locationObject.zLocation;
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
            xLocation: 0,
            yLocation: 0,
            zLocation: 100,
        }
    }

    convertToObject = () => {
        return JSON.parse(JSON.stringify(this));
    }
}

module.exports.Character = Character;
module.exports.NewCharacter = NewCharacter;