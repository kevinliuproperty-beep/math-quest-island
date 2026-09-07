import SwiftUI
import MQDesign

/// The fight, live.
///
/// **The picture is `MQPatchwerkScreen`, unmodified.** That composition is the one
/// the design lane authored, the one Kevin approved, and the one the device
/// matrix gates at twelve sizes - re-drawing it here with buttons in it would
/// fork the look the moment either copy was touched. So this view renders the
/// gated screen and lays a TRANSPARENT interaction layer over it.
///
/// The layer's sizes are not re-derived: they are read out of
/// `MQPatchwerkScreen.tapTargets(_:)`, which is the screen's own public statement
/// of what a child may hit. If the screen re-sizes a tile, this moves with it. The
/// only things duplicated are the two stack spacings the screen's body uses (18
/// wide, 7/10 tall), and they are duplicated as a LAYOUT, not as coordinates -
/// the overlay runs the same HStack/VStack so it cannot drift by a rounding.
///
/// PROMOTION CANDIDATE #2: fold the action closures into `MQPatchwerkScreen`
/// itself (`onAnswer:`, `onPause:`) and delete this overlay. It belongs in
/// MQDesign; it is here because this lane must not edit that package.
public struct PatchwerkRunView: View {

    let scene: MQPatchwerkScene
    let m: MQMetrics
    let locked: Bool
    var onAnswer: (Int) -> Void
    var onPause: () -> Void

    public init(scene: MQPatchwerkScene, metrics: MQMetrics, locked: Bool,
                onAnswer: @escaping (Int) -> Void, onPause: @escaping () -> Void) {
        self.scene = scene; self.m = metrics; self.locked = locked
        self.onAnswer = onAnswer; self.onPause = onPause
    }

    nonisolated static func pad(_ m: MQMetrics) -> CGFloat { m.isRegular ? 30 : 16 }

    /// The tile size the drawn screen itself declares.
    nonisolated public static func tileSize(_ m: MQMetrics) -> CGSize {
        MQPatchwerkScreen.tapTargets(m)
            .first { $0.name == "answer 1" }?.size ?? CGSize(width: 44, height: 44)
    }

    nonisolated public static func knobSize(_ m: MQMetrics) -> CGFloat {
        MQPatchwerkScreen.tapTargets(m).first { $0.name == "pause" }?.least ?? 44
    }

    public var body: some View {
        ZStack(alignment: .top) {
            MQPatchwerkScreen(scene: scene, metrics: m)
            pauseLayer
            answerLayer
        }
    }

    // The pause knob sits at the end of the top rail: outer padding, then the
    // rail's own padH/padV.
    private var pauseLayer: some View {
        let railPadH: CGFloat = m.isWide ? 22 : 12
        let railPadV: CGFloat = m.isWide ? 6 : (m.isShort ? 4 : 6)
        return VStack {
            HStack {
                Spacer(minLength: 0)
                Button(action: onPause) {
                    Color.clear
                        .frame(width: Self.knobSize(m), height: Self.knobSize(m))
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Pause")
            }
            Spacer(minLength: 0)
        }
        .padding(.horizontal, Self.pad(m) + railPadH)
        .padding(.top, m.insets.top + Self.pad(m) * 0.6 + railPadV)
    }

    private var answerLayer: some View {
        VStack {
            Spacer(minLength: 0)
            if m.isWide {
                HStack(spacing: 18) { ForEach(0..<4, id: \.self) { tile($0) } }
                    .frame(height: Self.tileSize(m).height)
            } else {
                VStack(spacing: m.isShort ? 7 : 10) {
                    ForEach(0..<2, id: \.self) { row in
                        HStack(spacing: m.isShort ? 7 : 10) {
                            ForEach(0..<2, id: \.self) { col in tile(row * 2 + col) }
                        }
                    }
                }
            }
        }
        .padding(.horizontal, Self.pad(m))
        .padding(.bottom, m.insets.bottom + Self.pad(m) * 0.6)
    }

    private func tile(_ i: Int) -> some View {
        Button { onAnswer(i) } label: {
            Color.clear
                .frame(maxWidth: .infinity)
                .frame(height: Self.tileSize(m).height)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        // The run engine swallows a stunned answer anyway. Disabling here too is
        // the web's belt and braces: a mashing child never even sees a tap land.
        .disabled(locked)
        .accessibilityLabel(scene.answers.indices.contains(i) ? scene.answers[i] : "")
    }
}
