import Foundation

/// The fight's arithmetic, lifted from `js/app.js` and kept PURE.
///
/// Every number in this file is the web app's, and the tests assert that against
/// the source lines rather than against a remembered value. The reason to copy
/// rather than to redesign: Charlotte has played the web version, and a hit that
/// takes a different bite out of the bar is a different game. The reason to make
/// it pure: the roll comes in as an argument, so the state machine is testable
/// without a random source at all.
///
/// ```js
/// const HERO_MAX=100;
/// // hero hits monster
/// const crit = S.streak>=3;
/// const dmg  = (18 + S.level*6 + ri(0,4)) * (crit?2:1);
/// // monster hits hero
/// const dmg  = MONSTERS[S.mi].dmg + ri(0,3);
/// // monster down
/// S.heroHp = Math.min(HERO_MAX, S.heroHp+12);
/// ```
public enum QBattleMath {

    public static let heroMax = 100
    /// What a felled monster gives back. `js/app.js` `monsterDown()`.
    public static let heroHealOnMonsterDown = 12
    /// `crit = S.streak >= 3`, evaluated AFTER the streak has been incremented
    /// for the answer being resolved.
    public static let critStreak = 3
    /// `if (S.rightRow >= 3 && S.level < 3) { S.level++; S.rightRow = 0 }`
    public static let levelUpAfter = 3
    /// `if (S.wrongRow >= 2 && S.level > 1) { S.level--; S.wrongRow = 0 }`
    public static let levelDownAfter = 2
    public static let minLevel = 1
    public static let maxLevel = 3

    /// Damage the hero deals. `roll` is `ri(0, 4)`.
    public static func heroDamage(level: Int, streakAfter: Int, roll: Int) -> Int {
        let crit = streakAfter >= critStreak
        return (18 + level * 6 + roll) * (crit ? 2 : 1)
    }

    /// Damage the monster deals. `roll` is `ri(0, 3)`.
    public static func monsterDamage(monsterDamage base: Int, roll: Int) -> Int {
        base + roll
    }

    public static func isCritical(streakAfter: Int) -> Bool {
        streakAfter >= critStreak
    }
}

/// The chain of monsters, verbatim from `js/app.js`. The emoji are the web's own
/// and are carried for the transcript only - the native app draws `MQCrab`, and
/// an emoji never reaches the glass.
public struct QMonster: Sendable, Equatable {
    public let emoji: String
    public let name: String
    public let hp: Int
    public let damage: Int

    public init(emoji: String, name: String, hp: Int, damage: Int) {
        self.emoji = emoji; self.name = name; self.hp = hp; self.damage = damage
    }

    public static let chain: [QMonster] = [
        QMonster(emoji: "\u{1F7E2}", name: "Gloop the Slime", hp: 50, damage: 10),
        QMonster(emoji: "\u{1F987}", name: "Flapper", hp: 60, damage: 12),
        QMonster(emoji: "\u{1F47B}", name: "BooBoo", hp: 70, damage: 12),
        QMonster(emoji: "\u{1F577}", name: "Skitters", hp: 80, damage: 14),
        QMonster(emoji: "\u{1F9DF}", name: "Grumbles", hp: 90, damage: 14),
        QMonster(emoji: "\u{1F409}", name: "FRACTOR the Dragon", hp: 140, damage: 16)
    ]
}

/// The Quest run's whole mutable state, as a value.
///
/// **Where this deliberately departs from the web.** `js/app.js` runs an endless
/// chain: the run ends when the sixth monster falls or the hero's HP hits zero.
/// The iOS flow is a SET OF N ITEMS on one map node, which is what the brief
/// asks for and what a map with nodes implies - you go somewhere, you do a set,
/// you come back with what you learnt. So the run also ends when the Nth item is
/// answered. Everything else - the damage formulas, the heal, the level ladder,
/// the streak rule - is the web's, unchanged.
public struct QRunState: Sendable, Equatable {
    public var heroHP: Int
    public var monsterIndex: Int
    public var monsterHP: Int
    /// The engine's difficulty pool, 1...3. Climbs and falls per the web ladder.
    public var level: Int
    public var streak: Int
    public var bestStreak: Int
    public var rightRow: Int
    public var wrongRow: Int
    public var correct: Int
    public var answered: Int
    /// Monsters felled this run. Drawn as the crystal rope.
    public var crystals: Int

    public init(startLevel: Int = 1) {
        heroHP = QBattleMath.heroMax
        monsterIndex = 0
        monsterHP = QMonster.chain[0].hp
        level = min(max(startLevel, QBattleMath.minLevel), QBattleMath.maxLevel)
        streak = 0; bestStreak = 0; rightRow = 0; wrongRow = 0
        correct = 0; answered = 0; crystals = 0
    }

    public var monster: QMonster { QMonster.chain[min(monsterIndex, QMonster.chain.count - 1)] }
    public var heroHPFraction: Double {
        Double(max(0, heroHP)) / Double(QBattleMath.heroMax)
    }
    public var monsterHPFraction: Double {
        Double(max(0, monsterHP)) / Double(max(1, monster.hp))
    }
    public var isDefeated: Bool { heroHP <= 0 }
    public var clearedTheChain: Bool { monsterIndex >= QMonster.chain.count }
}

/// What one resolved answer did, so the UI can animate it and the transcript can
/// record it without re-deriving anything.
public struct QResolution: Sendable, Equatable {
    public var wasCorrect: Bool
    public var damageDealt: Int
    public var damageTaken: Int
    public var critical: Bool
    public var monsterFell: Bool
    public var healed: Int
    public var levelBefore: Int
    public var levelAfter: Int
    public var streakAfter: Int
    public var heroHPAfter: Int
    public var monsterHPAfter: Int
    public var crystalsAfter: Int
}

public extension QRunState {

    /// Apply one graded answer. The two rolls arrive as arguments so this is a
    /// pure function of (state, correctness, rolls) - which is what makes the HP
    /// parity test possible without stubbing a generator.
    ///
    /// Order of operations is `js/app.js`'s exactly:
    /// `resolve(true)` increments correct/streak/rightRow, clears wrongRow,
    /// climbs the level, THEN computes damage from the NEW level and the NEW
    /// streak. `markWrong` zeroes the streak, increments wrongRow, clears
    /// rightRow and drops the level, and the counterattack uses the CURRENT
    /// monster's base damage.
    mutating func apply(correct: Bool, heroRoll: Int, monsterRoll: Int) -> QResolution {
        let levelBefore = level
        answered += 1

        if correct {
            self.correct += 1
            streak += 1
            rightRow += 1
            wrongRow = 0
            bestStreak = max(bestStreak, streak)
            if rightRow >= QBattleMath.levelUpAfter && level < QBattleMath.maxLevel {
                level += 1; rightRow = 0
            }
            let crit = QBattleMath.isCritical(streakAfter: streak)
            let dmg = QBattleMath.heroDamage(level: level, streakAfter: streak, roll: heroRoll)
            monsterHP -= dmg
            var fell = false
            var healed = 0
            if monsterHP <= 0 {
                fell = true
                crystals += 1
                healed = min(QBattleMath.heroMax, heroHP + QBattleMath.heroHealOnMonsterDown) - heroHP
                heroHP += healed
                monsterIndex += 1
                monsterHP = monsterIndex < QMonster.chain.count
                    ? QMonster.chain[monsterIndex].hp : 0
            }
            return QResolution(wasCorrect: true, damageDealt: dmg, damageTaken: 0,
                               critical: crit, monsterFell: fell, healed: healed,
                               levelBefore: levelBefore, levelAfter: level,
                               streakAfter: streak, heroHPAfter: heroHP,
                               monsterHPAfter: max(0, monsterHP),
                               crystalsAfter: crystals)
        } else {
            streak = 0
            wrongRow += 1
            rightRow = 0
            if wrongRow >= QBattleMath.levelDownAfter && level > QBattleMath.minLevel {
                level -= 1; wrongRow = 0
            }
            let dmg = QBattleMath.monsterDamage(monsterDamage: monster.damage, roll: monsterRoll)
            heroHP -= dmg
            return QResolution(wasCorrect: false, damageDealt: 0, damageTaken: dmg,
                               critical: false, monsterFell: false, healed: 0,
                               levelBefore: levelBefore, levelAfter: level,
                               streakAfter: 0, heroHPAfter: heroHP,
                               monsterHPAfter: max(0, monsterHP),
                               crystalsAfter: crystals)
        }
    }
}
