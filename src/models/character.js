class NewCharacter {
    constructor(hash, objectReceived) {
        this.private = {
            hash: hash,
        };
        this.public = {
            info: objectReceived.info,
            stat: objectReceived.stat,
            itemData: objectReceived.itemData,
        }
    }

    convertToObject = () => {
        return JSON.parse(JSON.stringify(this));
    }
}

module.exports.NewCharacter = NewCharacter;