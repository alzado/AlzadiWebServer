
class Character {
    constructor(characterObject) {
        this.account = characterObject.account;
        this.characterLocation = characterObject.characterLocation;
    }

    convertToObject = () => {
        return JSON.parse(JSON.stringify(this));
    }

    updateLocation = (locationObject) => {
        this.characterLocation = locationObject.characterLocation;
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
            characterLocation: {
                x: 0,
                y: 0,
                z: 100,
            },
        }
    }

    convertToObject = () => {
        return JSON.parse(JSON.stringify(this));
    }
}

module.exports.Character = Character;
module.exports.NewCharacter = NewCharacter;