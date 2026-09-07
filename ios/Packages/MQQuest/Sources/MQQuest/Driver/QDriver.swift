import Foundation
import SwiftUI
import MQContent
import MQDesign
import MQProgress
#if os(macOS)
import AppKit
#else
import UIKit
#endif

// =============================================================================
// THE HEADLESS DRIVER
//
// Kai has Command Line Tools and no Xcode, no simulator and no screen. Every gate
// on this box therefore has to be either a value assertion or an `ImageRenderer`
// render. This file is the second kind: it plays a WHOLE SCRIPTED SESSION through
// the real flow model and the real engine, writes a PNG per screen and a JSON
// transcript, and exits.
//
// That is what lets a refuter, or a dress rehearsal, LIVE a session on this box
// rather than read the code and take the lane's word for it - and it is why the
// strategies include `wrong-unit`: the one path a builder testing their own work
// never takes.
// =============================================================================

/// How the driver answers.
public enum QStrategy: String, Codable, Sendable, CaseIterable {
    case alwaysCorrect = "always-correct"
    case alwaysWrong = "always-wrong"
    /// The right number under a unit the question does not want. Falls back to
    /// `alwaysWrong` on a question that declares no unit, and the transcript
    /// SAYS SO rather than quietly recording a plain wrong answer.
    case wrongUnit = "wrong-unit"
    case random
}

public struct QDriveProfile: Codable, Sendable {
    public var name: String
    /// `unicorn` | `turtle` | `octopus`.
    public var cast: String
    public var level: String

    public init(name: String, cast: String, level: String) {
        self.name = name; self.cast = cast; self.level = level
    }

    public var mqCast: MQCast { MQCast(rawValue: cast) ?? .unicorn }
}

/// The script `--drive` reads.
public struct QDriveScript: Codable, Sendable {
    public var name: String
    /// Seeds the damage rolls and the `random` strategy. Same seed, same run.
    public var seed: UInt64
    /// A key in `QDriveScript.devices`, or `WxH`.
    public var device: String
    public var profile: QDriveProfile
    /// The engine topic id, e.g. `p4area`.
    public var node: String
    public var items: Int
    /// One strategy for the whole set.
    public var strategy: QStrategy?
    /// Or one per item, cycled if shorter than `items`.
    public var strategies: [QStrategy]?
    /// `noon` (default) | `dusk`.
    public var palette: String?
    /// **How the driver answers: through the drawn VIEW, or through the model.**
    ///
    /// `true` (the default, and what the gate uses) hit-tests the drawn bounds of
    /// the tile / key / chip and fires the Button's own action, so a control that
    /// is off the glass records a MISS instead of a green transcript row - which
    /// is exactly what K1 hid. `false` is `--model`: the old fast path, kept for
    /// bulk runs where layout is not the question.
    public var viewPath: Bool?
    /// Render scale. 1 by default: these are read by an agent and by a human at
    /// 100%, and @2x quadruples the bytes for no extra legibility.
    public var scale: CGFloat?
    /// **Where the progress document lives, if it is to live at all.**
    ///
    /// The driver used to build `MQProgressStore.inMemory()` unconditionally, so
    /// a driven run could never observe whether a single answer reached a disk -
    /// and none of them did. `QQuestModel.pick` built its store key from the
    /// child's NAME while `addProfile` minted a UUID, `record()` took its "no
    /// profile" early return on every answer ever given, and the whole packet was
    /// green (Phase 1 dress rehearsal, leg 8). A driven run can now be pointed at
    /// a file, restarted against the same file, and read.
    public var storePath: String?
    /// Reopen `storePath` instead of creating a profile in it: the second half of
    /// a persistence gate is a COLD process finding what the first one wrote.
    public var reopenStore: Bool?
    /// Make the profile through the `+` token's own sheet - tap `+`, tap a
    /// creature, tap a class, tap Start - instead of injecting it into the store.
    /// This is the only path that exercises what a parent on a fresh install does.
    public var createProfile: Bool?

    public init(name: String, seed: UInt64, device: String, profile: QDriveProfile,
                node: String, items: Int, strategy: QStrategy? = nil,
                strategies: [QStrategy]? = nil, palette: String? = nil,
                scale: CGFloat? = nil, viewPath: Bool? = nil,
                storePath: String? = nil, reopenStore: Bool? = nil,
                createProfile: Bool? = nil) {
        self.name = name; self.seed = seed; self.device = device
        self.profile = profile; self.node = node; self.items = items
        self.strategy = strategy; self.strategies = strategies
        self.palette = palette; self.scale = scale; self.viewPath = viewPath
        self.storePath = storePath; self.reopenStore = reopenStore
        self.createProfile = createProfile
    }

    public var drivesTheViewPath: Bool { viewPath ?? true }
    public var reopensStore: Bool { reopenStore ?? false }
    public var createsProfile: Bool { createProfile ?? false }

    /// The device matrix names `mqdesign-snap` uses, so a driven PNG can be laid
    /// beside a matrix PNG of the same screen at the same size.
    public static let devices: [String: CGSize] = [
        "ipad97-landscape":  CGSize(width: 1024, height: 768),
        "ipad97-portrait":   CGSize(width: 768,  height: 1024),
        "ipad11-landscape":  CGSize(width: 1194, height: 834),
        "ipad11-portrait":   CGSize(width: 834,  height: 1194),
        "ipad13-landscape":  CGSize(width: 1366, height: 1024),
        "ipadmini-portrait": CGSize(width: 744,  height: 1133),
        "iphone-se":         CGSize(width: 375,  height: 667),
        "iphone15":          CGSize(width: 393,  height: 852)
    ]

    public var size: CGSize {
        if let s = Self.devices[device] { return s }
        let parts = device.lowercased().split(separator: "x")
        if parts.count == 2, let w = Double(parts[0]), let h = Double(parts[1]) {
            return CGSize(width: w, height: h)
        }
        return CGSize(width: 1024, height: 768)
    }

    public var mqPalette: MQPalette { palette == "dusk" ? .dusk : .noon }

    public func strategy(at index: Int) -> QStrategy {
        if let list = strategies, !list.isEmpty { return list[index % list.count] }
        return strategy ?? .alwaysCorrect
    }
}

// MARK: - Transcript

/// One item, exactly as the brief asks: question, answer, verdict, reason, HP
/// after. Plus the pieces a refuter needs to check the lane's own claims -
/// which chips were offered, which was tapped, and whether the classifier had to
/// ask the engine a second question.
public struct QTranscriptItem: Codable, Sendable {
    public var index: Int
    public var strategy: String
    /// Recorded when `wrong-unit` could not be played on this question.
    public var strategyFellBackTo: String?

    public var questionID: String
    public var topic: String
    public var skill: String
    public var generator: String?
    public var pool: Int
    public var level: Int
    public var kind: String
    public var stem: String
    public var declaredUnit: String
    public var figureType: String?
    public var figureDrawable: Bool
    public var choices: [String]
    public var expected: String

    /// What was sent to `grade`, verbatim.
    public var submitted: String
    public var chipsOffered: [String]
    public var chipTapped: String?
    public var choiceIndex: Int?
    /// `"view"` when every tap in this item went through the drawn Button, or
    /// `"model"` when the run was asked for the fast path.
    public var inputPath: String?
    /// **Taps that could not be made.** A control that is not drawn, is drawn off
    /// the glass, or is disabled. Empty on a healthy item; a key that is 18 pt
    /// tall and flush to the bottom of the frame lands here instead of typing a
    /// perfect answer nobody could have typed (Quest Refutation K1).
    public var tapMisses: [String]?

    public var correct: Bool
    /// The engine's own words.
    public var engineReason: String?
    /// This build's classification.
    public var reason: String
    public var parsedValue: Double?
    public var parsedUnit: String?

    public var heroHPAfter: Int
    public var monsterHPAfter: Int
    public var monsterIndexAfter: Int
    public var monsterName: String
    public var damageDealt: Int
    public var damageTaken: Int
    public var critical: Bool
    public var monsterFell: Bool
    public var streakAfter: Int
    public var levelBefore: Int
    public var levelAfter: Int
    public var crystalsAfter: Int
    public var screenshot: String?
    public var feedbackScreenshot: String?
    public var feedbackLines: [String]
}

public struct QTranscript: Codable, Sendable {
    /// Bumped when a field is removed or its meaning changes, so a refuter's
    /// reader can fail loudly instead of reading a stale shape.
    /// 2: `inputPath`, `tapMisses` and `unitsAccepted` per item; `tapMisses` and
    /// `inputPath` on the run.
    /// 3: `store` - what the PROGRESS DOCUMENT holds when the run is over. A
    /// transcript that reports twelve correct answers and cannot say whether one
    /// of them was written down is the transcript that passed the branch on
    /// which nothing a child did was ever recorded.
    public static let schemaVersion = 3

    public var schema: Int = QTranscript.schemaVersion
    public var name: String
    public var recordedAt: String
    public var engineStamp: String
    public var enginePayloadHash: String
    public var device: String
    public var size: [Double]
    public var seed: UInt64
    public var profile: QDriveProfile
    public var node: String
    public var nodeName: String
    public var setSize: Int
    public var items: [QTranscriptItem]

    public var correct: Int
    public var total: Int
    public var bestStreak: Int
    public var crystals: Int
    public var heroHP: Int
    public var accuracy: Int
    public var reviewCount: Int
    public var screenshots: [String]
    /// `"view"` or `"model"`. A gate run is `"view"`.
    public var inputPath: String = "view"
    /// Every tap in the run that could not be made. **Empty is the pass.**
    public var tapMisses: [String] = []
    /// How many pages the review needed, and how many were rendered.
    public var reviewPages: Int = 1
    /// **What the store holds when the run is over.** See `QStoreReadback`.
    public var store: QStoreReadback?
}

/// The progress document, read back through the store's own API after the run.
///
/// This exists because of the single largest defect in the Phase 1 packet: the
/// app recorded nothing a child did, and 402 green tests, twelve driven sessions
/// and a matrix gate all passed anyway, because no gate ever asked the store what
/// it held afterwards. Every number here is a number that was ZERO on the branch
/// the rehearsal drove, against a run of 34 answers with 34 correct.
public struct QStoreReadback: Codable, Sendable {
    /// The id the run recorded against - the store's own, never a display name.
    public var profileID: String
    /// The document on disk, if there was one.
    public var path: String?
    /// Skill rows with any history at all.
    public var skills: Int
    /// Finished sessions the store is holding.
    public var sessions: Int
    /// Crystals over the profile's whole life.
    public var lifetimeCrystals: Int
    /// Nodes the island now draws as Cleared.
    public var clearedNodes: Int
    /// `skill -> mastery`, so a refuter can recompute `correct / attempts` by hand.
    public var mastery: [String: Double]
}

// MARK: - The driver

/// Plays a script. Everything it touches is the real thing: the real
/// `QQuestModel`, the real `QuestionSource` handed in by the composition root
/// (which is `JSQuestionEngine` under `mqhost`), the real screens.
@MainActor
public final class QDriver {

    public struct Output: Sendable {
        public var transcriptPath: String
        public var pngPaths: [String]
        public var transcript: QTranscript
    }

    let source: any QuestionSource
    let script: QDriveScript
    let outDir: URL
    /// Filled in by every render, read by every tap. See `QHitMap`.
    let hits = QHitMap()

    public init(source: any QuestionSource, script: QDriveScript, outDir: URL) {
        self.source = source; self.script = script; self.outDir = outDir
    }

    public func run() async throws -> Output {
        _ = MQFonts.register()
        try FileManager.default.createDirectory(at: outDir, withIntermediateDirectories: true)

        // **The store is a FILE when the script names one**, and the profile is
        // made through the `+` token's own sheet when the script asks. Both are
        // new on the rehearsal fix pass, and both exist because the old driver
        // could not see the branch's largest defect: an in-memory store seeded by
        // a direct `addProfile` call, never reopened, cannot show you that not one
        // answer a child gives is ever written down.
        let store: MQProgressStore
        if let path = script.storePath {
            store = try MQProgressStore.onDisk(url: URL(fileURLWithPath: path),
                                               writes: .immediate)
        } else {
            store = MQProgressStore.inMemory()
        }
        if !script.reopensStore && !script.createsProfile {
            _ = await store.addProfile(name: script.profile.name,
                                       cast: script.profile.mqCast,
                                       level: script.profile.level)
        }
        let random = QSeededRandom(seed: script.seed)
        let model = QQuestModel(source: source, store: store, random: random,
                                setSize: script.items)
        let metrics = MQMetrics.device(script.size)
        let palette = script.mqPalette
        let scale = script.scale ?? 1

        var pngs: [String] = []

        await model.load()
        pngs.append(try shoot(model, metrics, palette, scale, "01-entrance"))

        var misses: [String] = []

        // **The `+` leg.** Tap the empty slot, tap a creature, tap a class, tap
        // Start - every one of them a hit test against the DRAWN bounds, so a
        // control that is not on the glass records a MISS rather than a green
        // row. This is the path a parent on a fresh install takes, and it was
        // dead: the empty slot's Button action returned immediately and nothing
        // in the app called `addProfile` (Phase 1 dress rehearsal, leg 1).
        if script.createsProfile {
            await tap(model, metrics, palette, QEntranceView.Hit.newExplorer, &misses)
            pngs.append(try shoot(model, metrics, palette, scale, "01b-new-explorer"))
            await tap(model, metrics, palette,
                      QNewExplorerView.Hit.cast(script.profile.mqCast), &misses)
            await tap(model, metrics, palette,
                      QNewExplorerView.Hit.level(script.profile.level), &misses)
            pngs.append(try shoot(model, metrics, palette, scale, "01c-new-explorer-picked"))
            await tap(model, metrics, palette, QNewExplorerView.Hit.start, &misses)
            misses = misses.map { "new explorer: \($0)" }
            guard model.currentProfileID != nil else { throw QDriverError.noProfile }
        } else {
            // Pick by the STORE's own record. A `first(where: { $0.name == ... })`
            // over `[MQProfile]` is how the identity came apart in the first
            // place; the driver is not allowed to reintroduce it.
            guard let record = model.records.first(where: {
                      $0.profile.name == script.profile.name })
                    ?? model.records.first else {
                throw QDriverError.noProfile
            }
            if script.drivesTheViewPath {
                await tap(model, metrics, palette,
                          QEntranceView.Hit.profile(record.id), &misses)
            }
            if model.phase == .entrance { await model.pick(record) }
        }
        pngs.append(try shoot(model, metrics, palette, scale, "02-map"))

        guard let node = model.island?.nodes.first(where: { $0.topicID == script.node }) else {
            throw QDriverError.noSuchNode(script.node,
                                          available: model.island?.nodes.map(\.topicID) ?? [])
        }
        await model.open(node)

        var items: [QTranscriptItem] = []
        var index = 0
        while model.phase == .asking, index < script.items {
            guard let q = model.question else { break }
            let strategy = script.strategy(at: index)
            let shotName = String(format: "%02d-q%02d-ask", index + 3, index + 1)
            let ask = try shoot(model, metrics, palette, scale, shotName)
            pngs.append(ask)

            // Fill the entry, then SHOOT BEFORE SUBMITTING. The mid-entry frame
            // is the only one that shows the keypad in use, the digits in the
            // slot and the chosen chip lit - which is exactly the state a
            // refuter needs and the state a builder never screenshots.
            var played = await enter(model, metrics, palette, question: q,
                                     strategy: strategy)
            if q.isTyped {
                let typedName = String(format: "%02d-q%02d-typed", index + 3, index + 1)
                pngs.append(try shoot(model, metrics, palette, scale, typedName))
            }
            await submit(model, metrics, palette, question: q, played: &played)

            let fbName = String(format: "%02d-q%02d-answer", index + 3, index + 1)
            let fb = try shoot(model, metrics, palette, scale, fbName)
            pngs.append(fb)

            if let last = model.answered.last {
                items.append(transcriptItem(index: index, strategy: strategy,
                                            fellBackTo: played.fellBackTo,
                                            item: last, model: model,
                                            chips: played.chips, chip: played.chip,
                                            choiceIndex: played.choiceIndex,
                                            misses: played.misses,
                                            ask: ask, feedback: fb))
            } else if !played.misses.isEmpty {
                // The item could not be answered AT ALL through the drawn screen.
                // Recorded loudly rather than skipped: this is the K1 signal.
                misses += played.misses.map { "item \(index + 1): \($0)" }
            }
            index += 1
            if script.drivesTheViewPath, model.phase == .feedback {
                var advanceMisses: [String] = []
                await tap(model, metrics, palette, QBattleView.Hit.next, &advanceMisses)
                misses += advanceMisses.map { "item \(index): \($0)" }
                if model.phase == .feedback { await model.advance() }
            } else {
                await model.advance()
            }
        }
        if model.phase != .result { await model.finish() }
        pngs.append(try shoot(model, metrics, palette, scale, "99-result"))

        // **Every review page gets a PNG.** K4's whole point: the screen shows a
        // page of the wrong items, and a driven run that only ever renders page
        // one proves nothing about the rest. Paged through the drawn "More"
        // plank on the view path, so the pager is driven the way a finger drives
        // it rather than by setting the page on the model.
        let reviewRows = QResultView.reviewRows(metrics)
        let reviewPages = QResultView.pageCount(model.summary?.review ?? [],
                                                rows: reviewRows)
        for page in 1..<max(reviewPages, 1) {
            if script.drivesTheViewPath {
                var pageMisses: [String] = []
                await tap(model, metrics, palette, QResultView.Hit.reviewMore, &pageMisses)
                misses += pageMisses.map { "review page \(page + 1): \($0)" }
            }
            if model.reviewPage != page { model.showReviewPage(page, rows: reviewRows) }
            pngs.append(try shoot(model, metrics, palette, scale,
                                  String(format: "99-result-p%02d", page + 1)))
        }
        if reviewPages > 1 { model.showReviewPage(0, rows: reviewRows) }

        // **Read the store back.** Not the run's own counters - the STORE's, and
        // through the store's own API, after `finish()` has ended the session.
        // On the branch the rehearsal drove every one of these was 0 against 34
        // correct answers, and nothing in the packet asked.
        await store.flush()
        var readback: QStoreReadback?
        if let pid = model.currentProfileID {
            let mastery = await store.mastery(profile: pid)
            let sessions = await store.sessions(profile: pid)
            let crystals = await store.profileRecords()
                .first { $0.id == pid }?.profile.crystals ?? 0
            readback = QStoreReadback(
                profileID: pid.raw,
                path: script.storePath,
                skills: mastery.count,
                sessions: sessions.count,
                lifetimeCrystals: crystals,
                clearedNodes: (model.island?.nodes ?? []).filter {
                    if case .cleared = $0.state { return true } else { return false }
                }.count,
                mastery: Dictionary(uniqueKeysWithValues:
                    mastery.map { ($0.key.raw, $0.value) }))
        }

        let build = try? await source.engineBuild()
        let transcript = QTranscript(
            name: script.name,
            recordedAt: ISO8601DateFormatter().string(from: Date()),
            engineStamp: build?.stamp ?? "",
            enginePayloadHash: build?.payloadHash ?? "",
            device: script.device,
            size: [Double(script.size.width), Double(script.size.height)],
            seed: script.seed,
            profile: script.profile,
            node: script.node,
            nodeName: node.name,
            setSize: script.items,
            items: items,
            correct: model.run.correct,
            total: model.run.answered,
            bestStreak: model.run.bestStreak,
            crystals: model.run.crystals,
            heroHP: model.run.heroHP,
            accuracy: model.summary?.accuracy ?? 0,
            reviewCount: model.wrongItems.count,
            screenshots: pngs.map { URL(fileURLWithPath: $0).lastPathComponent },
            inputPath: script.drivesTheViewPath ? "view" : "model",
            tapMisses: misses + items.flatMap { row in
                (row.tapMisses ?? []).map { "item \(row.index + 1): \($0)" } },
            reviewPages: reviewPages,
            store: readback)

        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        let path = outDir.appendingPathComponent("transcript.json")
        try encoder.encode(transcript).write(to: path)
        return Output(transcriptPath: path.path, pngPaths: pngs, transcript: transcript)
    }

    // MARK: Playing one item

    struct Played {
        var chips: [String] = []
        var chip: String?
        var choiceIndex: Int?
        var fellBackTo: String?
        var misses: [String] = []
    }

    /// Fill the entry (or pick the choice) without submitting.
    ///
    /// On the view path every one of these is a hit test against the DRAWN bounds
    /// followed by the Button's own action; on `--model` they are the model calls
    /// the old driver made.
    private func enter(_ model: QQuestModel, _ m: MQMetrics, _ p: MQPalette,
                       question q: Question, strategy: QStrategy) async -> Played {
        var played = Played()
        played.chips = model.chips

        var effective = strategy
        if strategy == .random {
            // Seeded through the model's own generator so the whole run is one
            // reproducible stream.
            effective = model.random.ri(0, 1) == 0 ? .alwaysCorrect : .alwaysWrong
            played.fellBackTo = effective.rawValue
        }
        if effective == .wrongUnit && (!q.isTyped || played.chips.isEmpty) {
            effective = .alwaysWrong
            played.fellBackTo = QStrategy.alwaysWrong.rawValue
        }

        if q.isTyped {
            let correctText = Self.correctTypedText(q)
            let accepted = q.acceptedUnits
            switch effective {
            case .alwaysCorrect, .random:
                await type(model, m, p, correctText, &played.misses)
                if effective == .alwaysCorrect,
                   let chip = played.chips.first(where: {
                       QUnits.accepts($0, in: accepted) }) {
                    await tapChip(model, m, p, chip, &played)
                }
            case .alwaysWrong:
                await type(model, m, p, Self.wrongTypedText(correctText), &played.misses)
            case .wrongUnit:
                await type(model, m, p, correctText, &played.misses)
                if let chip = played.chips.first(where: {
                    !QUnits.accepts($0, in: accepted) }) {
                    await tapChip(model, m, p, chip, &played)
                }
            }
        } else {
            let correct = max(q.correctIndex, 0)
            switch effective {
            case .alwaysCorrect, .random: played.choiceIndex = correct
            case .alwaysWrong, .wrongUnit:
                played.choiceIndex = q.choices.count > 1
                    ? (correct + 1) % q.choices.count : correct
            }
        }
        return played
    }

    private func tapChip(_ model: QQuestModel, _ m: MQMetrics, _ p: MQPalette,
                         _ chip: String, _ played: inout Played) async {
        if script.drivesTheViewPath {
            await tap(model, m, p, QBattleView.Hit.chip(chip), &played.misses)
        } else {
            model.toggleChip(chip)
        }
        played.chip = model.entry.unit
    }

    private func submit(_ model: QQuestModel, _ m: MQMetrics, _ p: MQPalette,
                        question q: Question, played: inout Played) async {
        if q.isTyped {
            if script.drivesTheViewPath {
                await tap(model, m, p, QBattleView.Hit.check, &played.misses)
            } else {
                await model.submitTyped()
            }
        } else if let i = played.choiceIndex {
            if script.drivesTheViewPath {
                await tap(model, m, p, QBattleView.Hit.answer(i), &played.misses)
            } else {
                await model.choose(i)
            }
        }
    }

    /// Every character goes through the KEYPAD's own key, not into the entry
    /// directly - and on the view path through the key as DRAWN, so a key that is
    /// off the glass records a miss instead of typing perfectly.
    private func type(_ model: QQuestModel, _ m: MQMetrics, _ p: MQPalette,
                      _ text: String, _ misses: inout [String]) async {
        for ch in text {
            let key: QTypedEntry.Key?
            switch ch {
            case "0"..."9": key = .digit(Int(String(ch)) ?? 0)
            case ".":       key = .decimalPoint
            case "/":       key = .slash
            case "-":       key = .minus
            default:        key = nil
            }
            guard let key else { continue }
            if script.drivesTheViewPath {
                await tap(model, m, p, QBattleView.Hit.key(key), &misses)
            } else {
                model.press(key)
            }
        }
    }

    /// The bare number that grades correct, without the unit.
    nonisolated public static func correctTypedText(_ q: Question) -> String {
        if case .typed(let s) = q.selfAnswer { return s }
        return q.answerTextPlain
    }

    /// A number that is not the answer. `+1` rather than a random value, so a
    /// transcript is readable: the wrong answer is always one off.
    nonisolated public static func wrongTypedText(_ correct: String) -> String {
        if let d = Double(correct) { return JSONValue.numberText(d + 1) }
        return correct.isEmpty ? "1" : correct + "1"
    }

    // MARK: Transcript row

    private func transcriptItem(index: Int, strategy: QStrategy, fellBackTo: String?,
                                item: QAnsweredItem, model: QQuestModel,
                                chips: [String], chip: String?, choiceIndex: Int?,
                                misses: [String],
                                ask: String, feedback: String) -> QTranscriptItem {
        let q = item.question
        return QTranscriptItem(
            index: index,
            strategy: strategy.rawValue,
            strategyFellBackTo: fellBackTo,
            questionID: q.id, topic: q.topic, skill: q.skill,
            generator: q.generator, pool: q.pool, level: q.level,
            kind: q.kind.rawValue, stem: q.stemText, declaredUnit: q.unit,
            figureType: q.figure?.type, figureDrawable: q.figure?.isDrawable ?? false,
            choices: q.choiceTexts, expected: q.answerTextPlain,
            submitted: item.submitted, chipsOffered: chips, chipTapped: chip,
            choiceIndex: choiceIndex,
            inputPath: script.drivesTheViewPath ? "view" : "model",
            tapMisses: misses.isEmpty ? nil : misses,
            correct: item.verdict.correct,
            engineReason: item.verdict.reason,
            reason: item.reason.token,
            parsedValue: item.verdict.parsed?.value,
            parsedUnit: item.verdict.parsed?.unit,
            heroHPAfter: item.resolution.heroHPAfter,
            monsterHPAfter: item.resolution.monsterHPAfter,
            monsterIndexAfter: model.run.monsterIndex,
            monsterName: model.run.monster.name,
            damageDealt: item.resolution.damageDealt,
            damageTaken: item.resolution.damageTaken,
            critical: item.resolution.critical,
            monsterFell: item.resolution.monsterFell,
            streakAfter: item.resolution.streakAfter,
            levelBefore: item.resolution.levelBefore,
            levelAfter: item.resolution.levelAfter,
            crystalsAfter: item.resolution.crystalsAfter,
            screenshot: URL(fileURLWithPath: ask).lastPathComponent,
            feedbackScreenshot: URL(fileURLWithPath: feedback).lastPathComponent,
            feedbackLines: model.feedback?.lines ?? [])
    }

    // MARK: Rendering

    /// The screen, with the hit map hung on it. Every render this driver performs
    /// goes through here, so the map is never one state behind the pixels.
    private func screenView(_ model: QQuestModel, _ m: MQMetrics,
                            _ p: MQPalette) -> some View {
        hits.beginPass()
        hits.setScreen(m.size)
        return QScreenForPhase(model: model, metrics: m, palette: p)
            .environment(\.qHitMap, hits)
    }

    /// Lay the current screen out WITHOUT writing a file, purely to refresh the
    /// hit map before a tap. `cgImage` rather than `render { }` because the
    /// `GeometryReader` bodies that do the recording only run on a real pass.
    private func refreshHits(_ model: QQuestModel, _ m: MQMetrics, _ p: MQPalette) {
        let view = screenView(model, m, p)
        let renderer = ImageRenderer(content:
            view.frame(width: m.size.width, height: m.size.height))
        renderer.scale = 1
        renderer.proposedSize = ProposedViewSize(m.size)
        _ = renderer.cgImage
    }

    /// **A tap: hit-test the drawn bounds, then fire the Button's own action.**
    /// A miss is recorded and nothing is fired.
    private func tap(_ model: QQuestModel, _ m: MQMetrics, _ p: MQPalette,
                     _ name: String, _ misses: inout [String]) async {
        refreshHits(model, m, p)
        if let miss = await hits.tap(name) { misses.append(miss.description) }
    }

    @discardableResult
    private func shoot(_ model: QQuestModel, _ m: MQMetrics, _ p: MQPalette,
                       _ scale: CGFloat, _ name: String) throws -> String {
        let view = screenView(model, m, p)
        let url = outDir.appendingPathComponent("\(name).png")
        guard let data = QDriver.png(view, size: m.size, scale: scale) else {
            throw QDriverError.renderFailed(name)
        }
        try data.write(to: url)
        return url.path
    }

    /// `ImageRenderer` to PNG. The only way a headless box produces a picture, and
    /// the same call `mqdesign-snap` uses for the device matrix.
    public static func png(_ view: some View, size: CGSize, scale: CGFloat) -> Data? {
        let renderer = ImageRenderer(content:
            view.frame(width: size.width, height: size.height))
        renderer.scale = scale
        renderer.proposedSize = ProposedViewSize(size)
        #if os(macOS)
        guard let image = renderer.nsImage,
              let tiff = image.tiffRepresentation,
              let rep = NSBitmapImageRep(data: tiff) else { return nil }
        return rep.representation(using: .png, properties: [:])
        #else
        guard let image = renderer.uiImage else { return nil }
        return image.pngData()
        #endif
    }
}

public enum QDriverError: Error, CustomStringConvertible {
    case noProfile
    case noSuchNode(String, available: [String])
    case renderFailed(String)

    public var description: String {
        switch self {
        case .noProfile:
            return "the script's profile could not be created"
        case .noSuchNode(let id, let available):
            return "no node \"\(id)\" on this profile's island. Available: "
                + available.joined(separator: ", ")
        case .renderFailed(let name):
            return "ImageRenderer produced no image for \(name)"
        }
    }
}
