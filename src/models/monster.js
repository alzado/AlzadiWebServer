class Monster {
    constructor(monsterObject) {
        this.monsterName = monsterObject.monsterName;
        this.xLocation = monsterObject.xLocation;
        this.yLocation = monsterObject.yLocation;
        this.zLocation = monsterObject.zLocation;
    }

    convertToObject = () => {
        return JSON.parse(JSON.stringify(this));
    }
}

module.exports.Monster = Monster;