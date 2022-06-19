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
                z: 0,
            },
            currentExperience: 0,
            currentHealth: 100,
        }
    }

    convertToObject = () => {
        return JSON.parse(JSON.stringify(this));
    }
}

module.exports.NewCharacter = NewCharacter;