import SwiftUI

/// The scene both directions render, so the comparison is about look and
/// nothing else. Real P4 content: a perimeter question whose wrong options are
/// the mistakes a child actually makes -- area (126), half-perimeter (23),
/// three sides (32).
public struct MQScene: Sendable, Equatable {
    public var heroName: String
    public var level: String
    public var questName: String
    public var monsterName: String

    public var question: String
    public var answers: [String]

    /// 0...1
    public var heroHP: Double
    public var heroHPReadout: String
    public var monsterHP: Double
    public var monsterHPReadout: String
    /// The chunk the monster lost on the previous answer, still draining.
    public var monsterHPGhost: Double
    public var lastDamage: Int

    public var streak: Int
    public var crystals: Int
    public var crystalsTotal: Int

    public static let sample = MQScene(
        heroName: "Charlotte",
        level: "P4",
        questName: "Shape Shore",
        monsterName: "Skitters",
        question: "The rectangle is 14 cm long and 9 cm wide. What is its perimeter?",
        answers: ["46 cm", "23 cm", "126 cm", "32 cm"],
        heroHP: 0.76, heroHPReadout: "76",
        monsterHP: 0.44, monsterHPReadout: "44",
        monsterHPGhost: 0.58, lastDamage: 14,
        streak: 7, crystals: 3, crystalsTotal: 6
    )
}

/// Wide = iPad landscape (the battle line). Tall = iPhone and iPad portrait.
public enum MQLayout: Sendable { case wide, tall }

/// Device chrome the screen has to sit inside.
public struct MQInsets: Sendable, Equatable {
    public var top: CGFloat
    public var bottom: CGFloat
    public init(top: CGFloat, bottom: CGFloat) {
        self.top = top; self.bottom = bottom
    }
    public static let none = MQInsets(top: 0, bottom: 0)
}

/// Kept from the first sample, unchanged and non-negotiable: Apple says 44pt,
/// and nothing interactive in either direction ships smaller.
public enum MQTap {
    public static let min: CGFloat = 44
}
