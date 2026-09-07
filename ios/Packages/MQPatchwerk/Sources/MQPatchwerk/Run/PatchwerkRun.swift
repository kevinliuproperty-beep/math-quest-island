import Foundation

/// Everything the fight holds, as one value.
///
/// A struct, so a view can hold a snapshot and a test can compare two moments
/// field by field. `PatchwerkRun` owns the only mutable copy.
public struct PatchwerkRunState: Sendable, Equatable {
    public var damage: Int = 0
    /// Stacks held RIGHT NOW. The HUD counter is a prediction of the next hit,
    /// which is what makes it worth watching.
    public var stacks: Int = 0
    public var maxStacks: Int = 0
    public var correct: Int = 0
    public var wrong: Int = 0
    /// Freeze credits in hand.
    public var freezes: Int = 0
    public var freezesUsed: Int = 0
    /// Consecutive correct answers since the last credit was banked OR the last
    /// wrong answer of any kind. See the deliberate sharp edge in `apply`.
    public var earnProgress: Int = 0
    /// Input is swallowed while `elapsed < stunUntilMs`. -1 = never stunned yet,
    /// mirroring the web's initial value.
    public var stunUntilMs: Int = -1
    public var lastEventMs: Int = 0
    public var enraged: Bool = false
    public var bossHp: Int
    public var bossPhase: Int = 1
    public var ended: Bool = false

    public init(bossHp: Int) { self.bossHp = bossHp }

    public var attempts: Int { correct + wrong }
    public var accuracy: Double { attempts == 0 ? 0 : Double(correct) / Double(attempts) }
}

/// What one answer did. Returned so the HUD can flash the right thing without
/// diffing two states.
public struct PatchwerkEvent: Sendable, Equatable {
    /// Swallowed: the run was over, or the answer landed inside a stun window.
    /// The child sees NOTHING happen, which is the anti-spam guard working.
    public var ignored: Bool = false
    public var correct: Bool = false
    public var damage: Int = 0
    /// Stacks held after the answer.
    public var stacks: Int = 0
    /// A freeze credit absorbed this wrong answer. Stacks survived.
    public var froze: Bool = false
    public var earnedFreeze: Bool = false
    public var stunMs: Int = 0
    public var enraged: Bool = false
}

/// The fight, as a deterministic state machine.
///
/// **No UI, no engine, no persistence, and no `Date()`.** It takes a clock and a
/// stream of (correct, level, answerMs) and produces damage. That separation is
/// what lets the parity suite replay 300 recorded web runs through it in
/// milliseconds, and what lets a whole 5-minute Heroic tier be a unit test.
///
/// Every arithmetic step below is ordered the way `js/modes/patchwerk.js` orders
/// it. That is not stylistic: `base * mult * (1 + bonus)` and
/// `base * (1 + bonus) * mult` are different doubles, and a corpus that compares
/// rounded integers would catch it only sometimes.
public final class PatchwerkRun {

    public let config: PatchwerkConfig
    public let tier: PatchwerkConfig.Tier
    private let clock: PatchwerkClock
    private let startedAtMs: Int

    public private(set) var state: PatchwerkRunState

    public init(tier tierID: String? = nil,
                config: PatchwerkConfig = .mirrored,
                clock: PatchwerkClock = PatchwerkSystemClock()) {
        self.config = config
        self.tier = config.tier(tierID)
        self.clock = clock
        self.startedAtMs = clock.nowMs
        self.state = PatchwerkRunState(bossHp: config.bossHpPerPhase)
    }

    // MARK: - Time

    /// Milliseconds since the run began, from the injected clock.
    public var elapsedMs: Int { clock.nowMs - startedAtMs }

    public func timeLeftMs(at elapsed: Int) -> Int { max(0, tier.durationMs - elapsed) }
    public var timeLeftMs: Int { timeLeftMs(at: elapsedMs) }

    /// The last `ENRAGE_WINDOW_MS` of the fight. Note the upper bound: at exactly
    /// zero left the run is OVER, not enraged, and the web is equally strict
    /// (`timeLeft <= window && timeLeft > 0`).
    public func isEnraged(at elapsed: Int) -> Bool {
        let left = timeLeftMs(at: elapsed)
        return left <= config.enrageWindowMs && left > 0
    }
    public var isEnraged: Bool { isEnraged(at: elapsedMs) }

    public func isStunned(at elapsed: Int) -> Bool { elapsed < state.stunUntilMs }
    public var isStunned: Bool { isStunned(at: elapsedMs) }

    /// mm:ss of the time left, rounded UP so the clock reads 0:00 only when the
    /// fight is actually over.
    public func clockLabel(at elapsed: Int) -> String {
        PatchwerkRun.clockLabel(ms: timeLeftMs(at: elapsed))
    }

    public static func clockLabel(ms: Int) -> String {
        let t = max(0, Int((Double(ms) / 1000).rounded(.up)))
        return "\(t / 60):\(String(format: "%02d", t % 60))"
    }

    // MARK: - Scoring parts (public so the HUD and the tests read ONE source)

    public var stackMultiplier: Double { config.stackMultiplier(state.stacks) }
    public var multiplierLabel: String { config.multiplierLabel(state.stacks) }

    /// Full bonus under 2 s, decaying linearly to zero at 8 s. Deliberately
    /// smaller than a single stack, so thinking for one more beat and being right
    /// always beats being fast and wrong.
    public func speedBonus(_ answerMs: Double?) -> Double {
        guard let answerMs, answerMs.isFinite else { return 0 }
        if answerMs <= config.speedFastMs { return config.speedBonusMax }
        if answerMs >= config.speedZeroMs { return 0 }
        let span = config.speedZeroMs - config.speedFastMs
        return config.speedBonusMax * (1 - (answerMs - config.speedFastMs) / span)
    }

    /// JavaScript's `Math.round`: half goes UP, not away from zero.
    ///
    /// Every damage value here is positive, where Swift's `rounded()` agrees - but
    /// the rule is written out rather than assumed, because the one case they
    /// differ on (negatives) is exactly the kind of thing a future "small tweak"
    /// to the formula would wander into.
    @inline(__always)
    static func jsRound(_ x: Double) -> Int { Int((x + 0.5).rounded(.down)) }

    // MARK: - The one scoring entry point

    /// Score one answer.
    ///
    /// - Parameter elapsed: nil reads the clock. The tests and the parity replay
    ///   pass it explicitly, which is the same thing the web's shell does when it
    ///   hands `ctx.elapsedMs` in.
    @discardableResult
    public func answer(_ correct: Bool, level: Int?, answerMs: Double?,
                       at elapsed: Int? = nil) -> PatchwerkEvent {
        let now = elapsed ?? elapsedMs
        var ev = PatchwerkEvent()
        ev.correct = correct
        ev.stacks = state.stacks
        ev.enraged = isEnraged(at: now)

        // Two ways an answer is swallowed, in the web's order: the run is over, or
        // input is locked. Neither is shown to the child - a mashing kid never
        // even sees a rejected tap flash.
        if state.ended || timeLeftMs(at: now) <= 0 { ev.ignored = true; return ev }
        if isStunned(at: now) { ev.ignored = true; return ev }

        state.lastEventMs = now
        state.enraged = ev.enraged

        if correct {
            var dmg = config.base(forLevel: level) * stackMultiplier * (1 + speedBonus(answerMs))
            if ev.enraged { dmg *= config.enrageMult }
            let rounded = PatchwerkRun.jsRound(dmg)

            // The total is MONOTONIC. It never goes down, for any reason.
            state.damage += rounded
            state.correct += 1
            state.stacks = min(state.stacks + 1, config.stackCap)
            state.maxStacks = max(state.maxStacks, state.stacks)

            state.earnProgress += 1
            if state.earnProgress >= config.freezeEarnEvery {
                state.earnProgress = 0
                if state.freezes < config.freezeMaxHeld {
                    state.freezes += 1
                    ev.earnedFreeze = true
                }
            }

            // Cosmetic bar: it refills rather than ending the fight.
            state.bossHp -= rounded
            while state.bossHp <= 0 {
                state.bossPhase += 1
                state.bossHp += config.bossHpPerPhase
            }

            ev.damage = rounded
            ev.stacks = state.stacks
            return ev
        }

        // Wrong.
        state.wrong += 1
        if state.freezes > 0 {
            state.freezes -= 1
            state.freezesUsed += 1
            ev.froze = true                  // stacks survive, credit spent
        } else {
            state.stacks = 0
        }
        // Earn progress resets on ANY wrong, including a frozen one. Otherwise a
        // freeze would both save the streak and keep banking the next credit,
        // which is a self-sustaining loop that makes accuracy free.
        state.earnProgress = 0
        state.stunUntilMs = now + config.stunMs
        ev.stunMs = config.stunMs
        ev.stacks = state.stacks
        return ev
    }

    /// Call on the frame or second timer. Returns the record the moment the clock
    /// hits zero, so the caller needs no end condition of its own.
    @discardableResult
    public func tick(level: Int, date: String, at elapsed: Int? = nil) -> PatchwerkRecord? {
        let now = elapsed ?? elapsedMs
        guard timeLeftMs(at: now) <= 0, !state.ended else { return nil }
        return finish(level: level, date: date, at: now)
    }

    /// End the run and produce the leaderboard record. Idempotent in the sense
    /// that a second call is refused by `state.ended` at the tick above; calling
    /// `finish` directly twice is the caller's own bug and produces the same
    /// numbers anyway.
    @discardableResult
    public func finish(level: Int, date: String, at elapsed: Int? = nil) -> PatchwerkRecord {
        _ = elapsed
        state.ended = true
        return PatchwerkRecord(
            mode: "patchwerk",
            tier: tier.id,
            level: level,
            damage: state.damage,
            maxStacks: state.maxStacks,
            correct: state.correct,
            wrong: state.wrong,
            freezesUsed: state.freezesUsed,
            durationMs: tier.durationMs,
            date: date
        )
    }

    /// A boss bar that drains and refills, as 0...1 for `MQGauge`.
    public var bossFraction: Double {
        max(0, min(1, Double(state.bossHp) / Double(config.bossHpPerPhase)))
    }

    /// Sand left in the hourglass, 0...1.
    public func sandFraction(at elapsed: Int) -> Double {
        guard tier.durationMs > 0 else { return 0 }
        return max(0, min(1, Double(timeLeftMs(at: elapsed)) / Double(tier.durationMs)))
    }
}
