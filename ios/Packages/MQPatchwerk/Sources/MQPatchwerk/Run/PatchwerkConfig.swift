import Foundation

/// Every knob in the fight, mirrored from `js/modes/patchwerk.js`'s `CONFIG`.
///
/// **These numbers are not a design decision on this side of the wall.** They are
/// a COPY, and the copy is proved by `tools/fixtures/patchwerk-parity.json`: 300
/// scripted runs recorded from the web implementation, replayed here, every
/// answer compared. Web and iOS damage totals are meant to be the same number for
/// the same play, so a child cannot beat their own web score by switching device.
///
/// If a knob changes, it changes in `js/modes/patchwerk.js` FIRST, the corpus is
/// regenerated (`node tools/make-patchwerk-parity.mjs`), and the diff shows up in
/// both places in one commit. A change made only here is a silent fork.
public struct PatchwerkConfig: Sendable, Equatable {

    /// A selectable fight length. Three of them, so the fight is a choice rather
    /// than a setting buried in options.
    public struct Tier: Sendable, Equatable, Identifiable, Codable {
        public let id: String
        public let label: String
        public let durationMs: Int

        public init(id: String, label: String, durationMs: Int) {
            self.id = id; self.label = label; self.durationMs = durationMs
        }

        /// "2 min" / "3 min" / "5 min".
        public var minutesLabel: String { "\(durationMs / 60_000) min" }
    }

    /// Ordered short -> normal -> long. The order is the picker's order.
    public var tiers: [Tier]
    public var defaultTier: String

    /// Damage before any multiplier, by difficulty pool. Flattened relative to the
    /// main game's `18 + level*6` so STACKS, not pool, are the thing you chase.
    public var baseDamage: [Int: Double]
    public var baseDamageFallback: Double

    public var stackStep: Double
    public var stackCap: Int

    public var speedBonusMax: Double
    public var speedFastMs: Double
    public var speedZeroMs: Double

    public var freezeEarnEvery: Int
    public var freezeMaxHeld: Int

    /// Wrong answer locks input. Time keeps running - that is the actual price,
    /// and it is why guessing is strictly worse than thinking.
    public var stunMs: Int

    public var enrageWindowMs: Int
    public var enrageMult: Double

    /// Cosmetic only. The bar drains and REFILLS; the fight is the timer, and the
    /// boss's health can never end a run early.
    public var bossHpPerPhase: Int

    public init(tiers: [Tier], defaultTier: String, baseDamage: [Int: Double],
                baseDamageFallback: Double, stackStep: Double, stackCap: Int,
                speedBonusMax: Double, speedFastMs: Double, speedZeroMs: Double,
                freezeEarnEvery: Int, freezeMaxHeld: Int, stunMs: Int,
                enrageWindowMs: Int, enrageMult: Double, bossHpPerPhase: Int) {
        self.tiers = tiers; self.defaultTier = defaultTier
        self.baseDamage = baseDamage; self.baseDamageFallback = baseDamageFallback
        self.stackStep = stackStep; self.stackCap = stackCap
        self.speedBonusMax = speedBonusMax; self.speedFastMs = speedFastMs
        self.speedZeroMs = speedZeroMs
        self.freezeEarnEvery = freezeEarnEvery; self.freezeMaxHeld = freezeMaxHeld
        self.stunMs = stunMs
        self.enrageWindowMs = enrageWindowMs; self.enrageMult = enrageMult
        self.bossHpPerPhase = bossHpPerPhase
    }

    /// The web's CONFIG, value for value.
    public static let mirrored = PatchwerkConfig(
        tiers: [
            Tier(id: "short",  label: "Trash Pull", durationMs: 2 * 60 * 1000),
            Tier(id: "normal", label: "Patchwerk",  durationMs: 3 * 60 * 1000),
            Tier(id: "long",   label: "Heroic",     durationMs: 5 * 60 * 1000)
        ],
        defaultTier: "normal",
        baseDamage: [1: 10, 2: 15, 3: 25],
        baseDamageFallback: 10,
        stackStep: 0.10,
        stackCap: 10,
        speedBonusMax: 0.15,
        speedFastMs: 2000,
        speedZeroMs: 8000,
        freezeEarnEvery: 5,
        freezeMaxHeld: 2,
        stunMs: 1500,
        enrageWindowMs: 20 * 1000,
        enrageMult: 1.5,
        bossHpPerPhase: 1200
    )

    /// The tier for an id, falling back to the default exactly as the web does
    /// (`cfg.TIERS[opts.tier] ? ... : cfg.TIERS[cfg.DEFAULT_TIER]`).
    public func tier(_ id: String?) -> Tier {
        if let id, let hit = tiers.first(where: { $0.id == id }) { return hit }
        return tiers.first { $0.id == defaultTier } ?? tiers[0]
    }

    /// Base damage for a pool, with the web's fallback for an unknown one.
    public func base(forLevel level: Int?) -> Double {
        guard let level, let b = baseDamage[level] else { return baseDamageFallback }
        return b
    }

    /// The multiplier a child holding `stacks` stacks will hit for NEXT.
    public func stackMultiplier(_ stacks: Int) -> Double {
        1 + stackStep * Double(min(stacks, stackCap))
    }

    /// `"2.00x"`, the HUD's own reading of the same number.
    public func multiplierLabel(_ stacks: Int) -> String {
        String(format: "%.2fx", stackMultiplier(stacks))
    }
}
