import SwiftUI
import MQDesign

/// The mode, end to end: tier picker -> run -> result -> board.
///
/// The only stateful view in the package. It owns the timer that drives the run
/// and nothing else; every decision is the session's.
///
/// The clock is a 100 ms `Timer`, not a `TimelineView(.animation)`: the HUD reads
/// seconds and a stun boundary, the fight lasts five minutes, and waking SwiftUI
/// sixty times a second to redraw a world full of `Canvas` art is how a 9.7"
/// iPad 6 gets hot and slow. Nothing on this screen animates per frame.
public struct PatchwerkFlow: View {

    @ObservedObject var session: PatchwerkSession
    let m: MQMetrics
    var onExit: () -> Void

    public init(session: PatchwerkSession, metrics: MQMetrics, onExit: @escaping () -> Void = {}) {
        self.session = session; self.m = metrics; self.onExit = onExit
    }

    private let ticker = Timer.publish(every: 0.1, on: .main, in: .common).autoconnect()

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
                    onPause: { Task { await session.abandon() } })

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
        .onReceive(ticker) { _ in
            guard session.phase == .running else { return }
            Task { await session.tick() }
        }
    }
}
