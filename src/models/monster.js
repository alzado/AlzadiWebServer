class Monster {
    constructor(monsterObject) {
        this.monsterName = monsterObject.monsterName;
        this.characterLocation = monsterObject.characterLocation;
        this.characterSprite = monsterObject.characterSprite;
    }

    convertToObject = () => {
        return JSON.parse(JSON.stringify(this));
    }
}

module.exports.Monster = Monster;