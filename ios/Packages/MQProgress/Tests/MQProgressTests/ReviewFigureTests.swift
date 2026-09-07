import Testing
import Foundation
import MQContent
@testable import MQProgress

/// **A review row keeps the diagram the child got wrong.**
///
/// It did not. `StoredReview` persisted `MQDesign.MQFigure`, which has three cases, while
/// the engine emits eight; measured over 1,500 real engine draws, 216 questions carried a
/// figure and **180 of them (83%) came back on the result screen with no diagram at all**
/// - bar 36, line 24, table 18, lshape 12, pie/other 90. A bar-graph question was re-read
/// as bare text (Progress Refutation W7, 2026-09-07).
///
/// The fix is a type, not a workaround: `ReviewSnapshot` and `StoredReview` carry
/// `MQContent.Figure`, and `MQReviewItem` derives the three-case projection MQDesign can
/// draw today. Teach the design to draw a pie chart and every row already on disk gains
/// its picture, because the row kept the spec.
@Suite("Review rows keep every figure the engine emits")
struct ReviewFigureTests {

    /// The refuter's own sample: 216 figure-bearing rows in the proportions the live
    /// engine produces (bar 36, line 24, table 18, lshape 12, pie/other 90, rect and
    /// fractionBar making up the 36 that were representable).
    static let measuredMix: [(Figure, Int)] = [
        (Fixtures.everyFigureKind[0], 36),   // bar
        (Fixtures.everyFigureKind[5], 24),   // line
        (Fixtures.everyFigureKind[4], 18),   // table
        (Fixtures.everyFigureKind[3], 12),   // lshape
        (Fixtures.everyFigureKind[6], 90),   // pie / other
        (Fixtures.everyFigureKind[1], 18),   // rect
        (Fixtures.everyFigureKind[2], 18)    // fractionBar
    ]

    @Test("All 216 figure-bearing rows survive the disk: 0 lost, was 180")
    func noFigureIsLost() async throws {
        let dir = Fixtures.tempDir()
        defer { try? FileManager.default.removeItem(at: dir) }
        let url = dir.appendingPathComponent("progress.json")

        var expected: [String: Figure] = [:]
        let profileID: ProfileID
        do {
            let store = try MQProgressStore(persistence: FilePersistence(url: url))
            profileID = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
            var n = 0
            // Eight rows a session is what the result screen shows (the web's own
            // `slice(0,8)`), so 216 rows is 27 sessions - well under the 60-session cap.
            var pending: [(String, Figure)] = []
            for (figure, count) in Self.measuredMix {
                for _ in 0..<count { n += 1; pending.append(("Q\(n)", figure)) }
            }
            #expect(pending.count == 216)
            for chunk in stride(from: 0, to: pending.count, by: MQRule.reviewsShown).map({
                Array(pending[$0..<min($0 + MQRule.reviewsShown, pending.count)])
            }) {
                let s = await store.beginSession(profile: profileID, mode: .quest, topic: "geometry")
                for (question, figure) in chunk {
                    expected[question] = figure
                    await store.answer(s, profileID, "peri", correct: false,
                                       item: ReviewSnapshot(question: question, figure: figure,
                                                            answer: "x", explanation: "because"))
                }
                _ = await store.endSession(s)
            }
        }

        // Reopened from the bytes on disk, which is the only reading that counts.
        let reopened = try MQProgressStore(persistence: FilePersistence(url: url))
        var seen = 0, lost = 0
        for session in await reopened.sessions(profile: profileID) {
            for row in session.summary.worthAnotherLook {
                guard let want = expected[row.question] else { continue }
                seen += 1
                if row.spec != want { lost += 1 }
            }
        }
        #expect(seen == 216, "only \(seen) of 216 rows came back")
        #expect(lost == 0, "\(lost) of 216 rows lost their figure")
    }

    @Test("Every kind the engine emits round-trips, including one this build cannot draw",
          arguments: Fixtures.everyFigureKind)
    func everyKindRoundTrips(_ figure: Figure) async throws {
        let backing = InMemoryPersistence()
        let store = try MQProgressStore(persistence: backing)
        let p = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        let s = await store.beginSession(profile: p, mode: .quest)
        await store.answer(s, p, "peri", correct: false,
                           item: ReviewSnapshot(question: "Q", figure: figure,
                                                answer: "x", explanation: "y"))
        _ = await store.endSession(s)

        let reopened = try MQProgressStore(persistence: InMemoryPersistence(seed: backing.raw))
        let row = try #require(await reopened.sessions(profile: p).first?
            .summary.worthAnotherLook.first)
        #expect(row.spec == figure)
        #expect(row.spec?.type == figure.type)
    }

    @Test("The design's three-case projection is derived, and cannot disagree with the spec")
    func projectionIsDerived() {
        // What MQDesign can draw TODAY. Everything else becomes `.none` at the moment of
        // drawing - never on the way to disk.
        let rect = MQReviewItem(question: "Q", spec: Fixtures.rectFigure,
                                answer: "46 cm", explanation: "e")
        #expect(rect.figure == .rect(long: "14 cm", wide: "9 cm", ratio: 14.0 / 9.0))
        let bar = MQReviewItem(question: "Q", spec: Fixtures.everyFigureKind[0],
                               answer: "5", explanation: "e")
        #expect(bar.figure == .none)          // not drawable yet
        #expect(bar.spec != nil)              // but not LOST
        let frac = MQReviewItem(question: "Q", spec: Fixtures.everyFigureKind[2],
                                answer: "3/5", explanation: "e")
        #expect(frac.figure == .fractionBar(parts: 5, filled: 3))
        // A degenerate spec must not divide by zero on its way to a ratio.
        let flat = MQReviewItem(question: "Q",
                                spec: Fixtures.figure(#"{"type":"rect","length":4,"breadth":0,"unit":"m"}"#),
                                answer: "0", explanation: "e")
        #expect(flat.figure == .rect(long: "4 m", wide: "0 m", ratio: 1))
        // And a row with no engine behind it says so.
        #expect(MQReviewItem(question: "Q", figure: .none, answer: "a", explanation: "e").spec == nil)
    }

    @Test("A row with no diagram stays a row with no diagram")
    func noFigureIsFine() async throws {
        let backing = InMemoryPersistence()
        let store = try MQProgressStore(persistence: backing)
        let p = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        let s = await store.beginSession(profile: p, mode: .quest)
        await store.answer(s, p, "peri", correct: false, item: Fixtures.review(1, figure: nil))
        _ = await store.endSession(s)
        let reopened = try MQProgressStore(persistence: InMemoryPersistence(seed: backing.raw))
        let row = try #require(await reopened.sessions(profile: p).first?.summary.worthAnotherLook.first)
        #expect(row.spec == nil)
        #expect(row.figure == .none)
    }
}
