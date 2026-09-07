import SwiftUI
import MQContent

// The data every screen renders. Kept as plain values with no engine, no
// networking and no persistence anywhere near them, so a screen is a pure
// function of a struct -- which is what makes the headless snapshot gate a
// real gate rather than a screenshot of a mood.
//
// These deliberately mirror the shapes `MQContent` will hand over (see the iOS
// Native Brief): a `Figure` is DATA, never a markup string, because six engine
// topics currently emit SVG from inside their generators and the whole point of
// the figure-spec contract is that SwiftUI draws it.

// MARK: - Geometry

/// Wide = iPad landscape (the battle line). Tall = iPhone and iPad portrait.
public enum MQLayout: Sendable { case wide, tall }

/// Device chrome the screen has to sit inside.
public struct MQInsets: Sendable, Equatable {
    public var top: CGFloat
    public var bottom: CGFloat
    public init(top: CGFloat, bottom: CGFloat) { self.top = top; self.bottom = bottom }
    public static let none = MQInsets(top: 0, bottom: 0)
}

// MARK: - The shared value types, now owned by MQContent

// `MQCast`, `MQFigure`, `MQProfile` and `MQReviewItem` were declared HERE until the
// progress fix pass of 2026-09-07. They moved to `MQContent` because MQProgress - a
// persistence layer that draws nothing - had to import this package (SwiftUI plus a
// bundled font resource) just to name them, which inverts the brief's architecture
// rule that a logic package never imports a UI package.
//
// Re-exported as typealiases rather than deleted: every `import MQDesign` call site in
// the app, the screens below and the other lanes' packages compiles unchanged, and the
// design still owns the RENDERING of all four (`MQFigureView`, `MQHeroToken`,
// `MQCreature`, the review row) - only the value declaration moved.
public typealias MQCast = MQContent.MQCast
public typealias MQFigure = MQContent.MQFigure
public typealias MQProfile = MQContent.MQProfile
public typealias MQReviewItem = MQContent.MQReviewItem

// MARK: - Battle

/// Real P4 content from the shipped engine: a perimeter question whose wrong
/// options are the mistakes a child actually makes -- area (126),
/// half-perimeter (23), three sides (32).
public struct MQBattleScene: Sendable, Equatable {
    public var heroName: String
    public var heroCast: MQCast
    public var level: String
    public var questName: String
    public var monsterName: String

    public var question: String
    public var figure: MQFigure
    public var answers: [String]

    /// 0...1
    public var heroHP: Double
    public var heroHPReadout: String
    public var monsterHP: Double
    public var monsterHPReadout: String

    public var streak: Int
    public var crystals: Int
    public var crystalsTotal: Int

    public static let sample = MQBattleScene(
        heroName: "Charlotte",
        heroCast: .unicorn,
        level: "P4",
        questName: "Perimeter Palace",
        monsterName: "Skitters",
        question: "The rectangle is 14 cm long and 9 cm wide. What is its perimeter?",
        figure: .rect(long: "14 cm", wide: "9 cm", ratio: 14.0 / 9.0),
        answers: ["46 cm", "23 cm", "126 cm", "32 cm"],
        heroHP: 0.76, heroHPReadout: "76",
        monsterHP: 0.44, monsterHPReadout: "44",
        streak: 7, crystals: 3, crystalsTotal: 6
    )
}

// MARK: - Entrance

public struct MQEntranceScene: Sendable, Equatable {
    public var title: String
    public var subtitle: String
    /// The line a parent reads before they hand the iPad over.
    public var parentLine: String
    public var profiles: [MQProfile]
    public var newSlotLabel: String

    public static let sample = MQEntranceScene(
        title: "Math Quest Island",
        subtitle: "Pick your explorer.",
        parentLine: "No sign-in, no accounts. Everything stays on this iPad.",
        profiles: [
            MQProfile(name: "Charlotte", cast: .unicorn, level: "P4", crystals: 24),
            MQProfile(name: "Ben", cast: .turtle, level: "P2", crystals: 9),
            MQProfile(name: "Mira", cast: .octopus, level: "P5", crystals: 31)
        ],
        newSlotLabel: "New explorer"
    )
}

// MARK: - Map

// `MQMapNode` and `MQLandmark` moved to MQContent with the rest of the shared value
// types: MQProgress derives a node's state and must not import a UI package to name the
// four cases it is deriving. The island still owns every pixel of what a `.reef` looks
// like (`MQIslandMap`, `MQMapMarker`).
public typealias MQMapNode = MQContent.MQMapNode
public typealias MQLandmark = MQContent.MQLandmark

public struct MQMapScene: Sendable, Equatable {
    public var title: String
    public var subtitle: String
    public var heroName: String
    public var heroCast: MQCast
    public var level: String
    public var crystals: Int
    public var nodes: [MQMapNode]

    /// The real P4 island, in the registry's own order and with the registry's
    /// own names. The two `comingSoon` stops are the app's real locked nodes --
    /// they belong to P6, and drawing them at the far end of the path is how the
    /// map says "next year" without inventing content.
    public static let sample = MQMapScene(
        title: "Quest Island",
        subtitle: "Quests for P4. Where will you adventure today?",
        heroName: "Charlotte",
        heroCast: .unicorn,
        level: "P4",
        crystals: 24,
        nodes: [
            MQMapNode("Perimeter Palace", .cleared,
                      at: CGPoint(x: 0.13, y: 0.76), landmark: .palace),
            MQMapNode("Factor Reef", .cleared,
                      at: CGPoint(x: 0.28, y: 0.55), landmark: .reef),
            MQMapNode("Decimal Bay", .inProgress(collected: 3, total: 5),
                      at: CGPoint(x: 0.45, y: 0.75), landmark: .bay),
            MQMapNode("Long Sum Landing", .open,
                      at: CGPoint(x: 0.58, y: 0.52), landmark: .jetty),
            MQMapNode("Mixed Number Cove", .open,
                      at: CGPoint(x: 0.72, y: 0.74), landmark: .cove),
            MQMapNode("Line Graph Lagoon", .open,
                      at: CGPoint(x: 0.85, y: 0.52), landmark: .lagoon),
            MQMapNode("Percentage Peak", .comingSoon,
                      at: CGPoint(x: 0.60, y: 0.27), landmark: .peak),
            MQMapNode("Algebra Atoll", .comingSoon,
                      at: CGPoint(x: 0.87, y: 0.25), landmark: .atoll)
        ]
    )
}

// MARK: - End of set

/// One number and what it counts. A tuple would not carry `Sendable` cleanly
/// through a value type, and a stat is a thing the design lays out anyway.
public struct MQStat: Sendable, Equatable, Identifiable {
    public var id: String { caption }
    public var value: String
    public var caption: String
    public init(_ value: String, _ caption: String) {
        self.value = value; self.caption = caption
    }
}

public struct MQResultScene: Sendable, Equatable {
    public var title: String
    public var message: String
    public var heroName: String
    public var heroCast: MQCast
    public var monsterCast: MQCast
    public var stats: [MQStat]
    public var reviewHeading: String
    public var reviews: [MQReviewItem]
    public var primaryAction: String
    public var secondaryActions: [String]

    public static let sample = MQResultScene(
        title: "Victory!",
        message: "Charlotte saved all 6 Star Crystals of Perimeter Palace.",
        heroName: "Charlotte",
        heroCast: .unicorn,
        monsterCast: .crab,
        stats: [MQStat("12 / 15", "correct"), MQStat("80%", "accuracy"),
                MQStat("7", "best streak"), MQStat("4:32", "time")],
        reviewHeading: "Worth another look",
        reviews: [
            MQReviewItem(
                question: "The rectangle is 14 cm long and 9 cm wide. What is its perimeter?",
                figure: .rect(long: "14 cm", wide: "9 cm", ratio: 14.0 / 9.0),
                answer: "46 cm",
                explanation: "Perimeter is all four sides: 14 + 9 + 14 + 9 = 46 cm."),
            MQReviewItem(
                question: "A square has a perimeter of 36 cm. How long is one side?",
                figure: .rect(long: "9 cm", wide: "9 cm", ratio: 1),
                answer: "9 cm",
                explanation: "A square has 4 equal sides, so 36 divided by 4 is 9 cm."),
            MQReviewItem(
                question: "Which fraction of the bar is shaded?",
                figure: .fractionBar(parts: 5, filled: 3),
                answer: "3/5",
                explanation: "3 of the 5 equal parts are shaded, so the fraction is 3/5.")
        ],
        primaryAction: "Play again",
        secondaryActions: ["Island map", "Home"]
    )
}

// MARK: - Patchwerk

/// The training-dummy mode. No hero HP and no monster HP anywhere on this
/// screen: they carry a fail state Patchwerk does not have. The clock is the
/// only thing that can end the run.
public struct MQPatchwerkScene: Sendable, Equatable {
    public var tierName: String
    public var level: String
    /// mm:ss.
    public var timer: String
    /// Already comma-formatted; the design never does arithmetic.
    public var damage: String
    public var stacks: Int
    public var stackCap: Int
    public var multiplier: String
    public var freezeHeld: Int
    public var freezeTotal: Int
    /// Cosmetic. The dummy heals to full; the bar can never end the fight.
    public var bossHP: Double

    public var question: String
    public var figure: MQFigure
    public var answers: [String]

    public var enraged: Bool
    /// One short line, only when the run has something to say.
    public var flash: String?

    public static let sample = MQPatchwerkScene(
        tierName: "Patchwerk",
        level: "P4",
        timer: "2:47",
        damage: "1,240",
        stacks: 7,
        stackCap: 10,
        multiplier: "1.70x",
        freezeHeld: 1,
        freezeTotal: 2,
        bossHP: 0.62,
        question: "What is 3.6 x 100?",
        figure: .none,
        answers: ["360", "36", "0.036", "3600"],
        enraged: false,
        flash: nil
    )

    /// The last twenty seconds. Everything hits for 1.5x, and the world itself
    /// is the warning -- the light drops to a storm dusk. No red border, no
    /// pulsing frame, nothing that reads as punishment.
    public static let enraged: MQPatchwerkScene = {
        var s = MQPatchwerkScene.sample
        s.timer = "0:18"
        s.damage = "1,806"
        s.stacks = 10
        s.multiplier = "2.00x"
        s.freezeHeld = 2
        s.bossHP = 0.31
        s.question = "A ribbon 2.4 m long is cut into 8 equal pieces. How long is each piece?"
        s.answers = ["0.3 m", "3 m", "0.03 m", "19.2 m"]
        s.enraged = true
        s.flash = "Damage x1.5 - finish strong."
        return s
    }()
}
