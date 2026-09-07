import SwiftUI
import MQDesign

/// The mode, end to end: tier picker -> run -> result -> board.
///
/// The only stateful view in the package. It owns the heartbeat that drives the
/// run and nothing else; every decision is the session's.
///
/// The heartbeat is `PatchwerkTicker` - a 100 ms `Timer` inside an observable
/// object held by `@StateObject`, created ONCE per view identity and invalidated
/// when the run ends or the view disappears. It was a `Timer.publish(...)` stored
/// property on this struct, which SwiftUI re-initialises on every `@Published`
/// change: a fresh publisher and a re-subscription per tick, on the exact device
/// (iPad 6) whose heat the 100 ms choice was made to avoid. See `PatchwerkTicker`
/// for the mechanism and `TickerTests` for the counter that proves one per run.
public struct PatchwerkFlow: View {

    @ObservedObject var session: PatchwerkSession
    @StateObject private var ticker = PatchwerkTicker()
    let m: MQMetrics
    var onExit: () -> Void

    public init(session: PatchwerkSession, metrics: MQMetrics, onExit: @escaping () -> Void = {}) {
        self.session = session; self.m = metrics; self.onExit = onExit
    }

    public var body: some View {
        Group {
            switch session.phase {
            case .picker:
                PatchwerkTierPicker(
                    tiers: session.config.tiers, selected: session.tierID,
                    level: session.player.level, metrics: m,
                    onSelect: { session.choose(tier: $0) },
                    onFight: { Task { await session.start() } },
                    onBoard: { Task { await session.showBoard() } },
                    onBack: onExit)

            case .running:
                PatchwerkRunView(
                    scene: session.scene, metrics: m, locked: session.inputLocked,
                    onAnswer: { i in Task { await session.answer(choice: i) } },
                    onPause: { Task { await session.abandon() } },
                    // One item in three this feed serves is TYPED. Until the
                    // rehearsal fix pass these three had nowhere to go and 50 of
                    // 150 items were unanswerable.
                    onKey: { k in session.press(k) },
                    onChip: { c in session.toggleChip(c) },
                    onSubmit: { await session.submitTyped() })

            case .result:
                if let record = session.record {
                    PatchwerkResultView(
                        record: record, tierLabel: session.tier.label,
                        level: session.player.level, placement: session.placement,
                        leavesTheDevice: false, metrics: m,
                        onAgain: { Task { await session.playAgain() } },
                        onTiers: { session.backToPicker() },
                        onBoard: { Task { await session.showBoard(tier: record.tier) } })
                } else {
                    // Unreachable by construction; a blank world beats a crash on
                    // a child's screen.
                    MQWorld(.noon)
                }

            case .board:
                PatchwerkBoardView(
                    tiers: session.config.tiers, selected: session.boardTier,
                    level: session.player.level, rows: session.board,
                    highlight: session.myEntryID, metrics: m,
                    onTier: { id in Task { await session.showBoard(tier: id) } },
                    onBack: { session.backToPicker() })
            }
        }
        .onAppear { sync(session.phase) }
        .onChange(of: session.phase) { sync($0) }
        .onDisappear { ticker.stop() }
    }

    /// One timer while a fight is on, none at any other time. Called on appear and
    /// on every phase change rather than from `body`, so the number of timers is a
    /// function of the RUN's lifetime and not of how often SwiftUI re-renders.
    private func sync(_ phase: PatchwerkSession.Phase) {
        guard phase == .running else { ticker.stop(); return }
        ticker.start { Task { await session.tick() } }
    }
}
