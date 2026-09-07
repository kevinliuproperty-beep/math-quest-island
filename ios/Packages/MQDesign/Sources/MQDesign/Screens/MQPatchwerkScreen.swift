import SwiftUI

/// Patchwerk: a fixed clock, a training dummy, and as much damage as you can do
/// before it enrages.
///
/// What is deliberately NOT on this screen: hero health and monster health. They
/// carry a fail state Patchwerk does not have, and the clock is the only thing
/// that can end a run. The boss bar drains and refills; it is scenery.
///
/// **The enrage is the light.** The Patchwerk note flagged the stack badge and
/// the freeze pips as the one thing that has to be judged by eye, and the web
/// build answered the enrage with a red pulsing border round the app frame.
/// Here the last twenty seconds simply turn the island into a storm at dusk:
/// the sky goes red, the sea goes black, the dummy is lit from below, and the
/// gold in the hourglass and the crystals becomes the brightest thing on the
/// screen. A child does not need to be told; the world tells them.
public struct MQPatchwerkScreen: View, MQTapAudited {
    let scene: MQPatchwerkScene
    let m: MQMetrics

    public init(scene: MQPatchwerkScene = .sample, metrics: MQMetrics) {
        self.scene = scene; self.m = metrics
    }

    private var p: MQPalette { scene.enraged ? .enrage : .noon }
    private var compact: Bool { !m.isRegular }
    private var type: MQType { m.type }
    private var pad: CGFloat { m.isRegular ? 30 : 16 }

    /// The dummy. It is scenery, so it is the first thing that yields height on
    /// a short frame -- the clock, the damage number and the answers do not.
    nonisolated static func crabWidth(_ m: MQMetrics) -> CGFloat {
        let reference: CGFloat = m.isWide ? 834 : (m.isRegular ? 1194 : 852)
        let k = min(max(m.size.height / reference, 0.62), 1.10)
        return (m.isWide ? 420 : (m.isRegular ? 300 : 210)) * k
    }

    nonisolated static func knobSize(_ m: MQMetrics) -> CGFloat {
        m.isWide ? 46 : (m.isRegular ? 50 : 44)
    }

    /// The height of the rail row the pause knob is vertically CENTRED in.
    ///
    /// Hoisted and pinned rather than left to intrinsic sizing, because the knob's
    /// position in this row is the one thing a consumer has to be able to compute.
    /// `PatchwerkRunView` lays a transparent button over the drawn knob; before
    /// this existed the wide row was pinned to 60 and the tall row was whatever
    /// its contents happened to want, so the overlay pinned its button to the TOP
    /// of the rail and the hit rect sat 5-8 pt ABOVE the drawn knob at all twelve
    /// device sizes - 44x36 pt of effective on-target area on the iPhone SE and in
    /// Split View, under Apple's floor in the vertical, and invisible to a tap
    /// audit that measures the DECLARED 44/46/50 pt square. (Refutation,
    /// 2026-09-07.)
    ///
    /// 61 for the tall layout is the natural height of that row measured on Kai
    /// (60.0 at iPad type, 60.8 at phone type, both with the hourglass and the
    /// carved damage number in it), rounded up so pinning it cannot clip.
    /// PHASE1.md's rule for interactive elements: put the number in the screen's
    /// geometry, draw from it, and let the audit read the same value.
    nonisolated public static func railRowHeight(_ m: MQMetrics) -> CGFloat {
        m.isWide ? 60 : 61
    }

    /// The hourglass's size in the live rail, and the rect its canvas occupies on
    /// the full screen. The measurement suite reads the sand out of the PIXELS in
    /// this rect, so it is declared here beside the drawing rather than
    /// re-derived from padding constants in a test.
    nonisolated public static func hourglassSize(_ m: MQMetrics) -> CGFloat {
        m.isWide ? 56 : 40
    }

    nonisolated public static func hourglassRect(_ m: MQMetrics) -> CGRect {
        let pad: CGFloat = m.isRegular ? 30 : 16
        let railPadH: CGFloat = m.isWide ? 22 : 12
        let railPadV: CGFloat = m.isWide ? 6 : (m.isShort ? 4 : 6)
        let size = hourglassSize(m)
        let row = railRowHeight(m)
        // MQHourglass is `Canvas().frame(width: size * 0.66, height: size)` at the
        // leading edge of the row, vertically centred in it.
        return CGRect(x: pad + railPadH,
                      y: m.insets.top + pad * 0.6 + railPadV + (row - size) / 2,
                      width: size * 0.66, height: size)
    }

    nonisolated static func tileSize(_ m: MQMetrics) -> CGSize {
        let padH: CGFloat = m.isRegular ? 30 : 16
        let contentW = m.size.width - padH * 2
        let reference: CGFloat = m.isWide ? 834 : (m.isRegular ? 1194 : 852)
        let k = min(max(m.size.height / reference, 0.74), 1.12)
        if m.isWide {
            return CGSize(width: (contentW - 18 * 3) / 4,
                          height: min(max(m.size.height * 0.1175, 72), 112))
        }
        return CGSize(width: (contentW - 10) / 2,
                      height: (m.isRegular ? 92 : 68) * k)
    }

    nonisolated public static func tapTargets(_ m: MQMetrics) -> [MQTapTarget] {
        let t = tileSize(m)
        return [MQTapTarget("pause", square: knobSize(m))]
            + (0..<4).map { MQTapTarget("answer \($0 + 1)", t) }
    }

    /// Sand left in the hourglass: the run's own fraction, not a mood.
    ///
    /// This was `scene.enraged ? 0.10 : 0.92` -- a constant, so the glass read
    /// nearly full for the whole fight and then jumped to nearly empty at the
    /// enrage. See `MQPatchwerkScene.sand`.
    private var sandLeft: Double { scene.sand }

    public var body: some View {
        ZStack {
            MQWorld(p, horizon: m.isWide ? 0.22 : 0.24)
            (m.isWide ? AnyView(wide) : AnyView(tall))
                .padding(.horizontal, pad)
                .padding(.top, m.insets.top + pad * 0.6)
                .padding(.bottom, m.insets.bottom + pad * 0.6)
        }
    }

    // MARK: Wide

    private var wide: some View {
        VStack(spacing: 12) {
            MQRail(p, padH: 22, padV: 6) {
                HStack(alignment: .center, spacing: 22) {
                    MQHourglass(p, time: scene.timer, fraction: sandLeft,
                                size: Self.hourglassSize(m), urgent: scene.enraged)
                    MQCarvedNumber(p, value: scene.damage, caption: "damage", valueSize: 40)
                    Spacer(minLength: 12)
                    MQStackSpar(p, stacks: scene.stacks, cap: scene.stackCap,
                                multiplier: scene.multiplier)
                    freezeBlock
                    MQKnob(p, .pause, size: Self.knobSize(m))
                        .overlay { MQProbe.screenTint(4) }
                }
                .frame(height: Self.railRowHeight(m))
            }
            bossLine
            // Board on the left, dummy on the right -- the same battle line the
            // Quest screen uses, so the two modes are recognisably one game.
            HStack(alignment: .bottom, spacing: 12) {
                VStack(spacing: 14) {
                    Spacer(minLength: 0)
                    sign.frame(maxWidth: min(600, m.size.width * 0.52))
                    if let flash = scene.flash { banner(flash, size: 20) }
                }
                .frame(maxWidth: .infinity)
                MQCrab(p, lit: scene.enraged)
                    .frame(width: Self.crabWidth(m),
                           height: Self.crabWidth(m) * MQCrab.box.height / MQCrab.box.width)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            answerRow
        }
    }

    // MARK: Tall

    private var tall: some View {
        VStack(spacing: m.isShort ? 5 : 8) {
            MQRail(p, padH: 12, padV: m.isShort ? 4 : 6) {
                VStack(spacing: m.isShort ? 4 : 6) {
                    HStack(alignment: .center, spacing: 10) {
                        MQHourglass(p, time: scene.timer, fraction: sandLeft,
                                    size: Self.hourglassSize(m), urgent: scene.enraged)
                        Spacer(minLength: 4)
                        MQCarvedNumber(p, value: scene.damage, caption: "damage",
                                       valueSize: 28)
                        MQKnob(p, .pause, size: Self.knobSize(m))
                            .overlay { MQProbe.screenTint(4) }
                    }
                    .frame(height: Self.railRowHeight(m))
                    HStack(spacing: 10) {
                        MQStackSpar(p, stacks: scene.stacks, cap: scene.stackCap,
                                    multiplier: scene.multiplier, compact: true)
                        Spacer(minLength: 4)
                        freezeBlock
                    }
                }
            }
            bossLine
            // The free height goes ABOVE the board, so its posts land on the
            // dry sand instead of standing in the sea.
            Spacer(minLength: 0)
            if let flash = scene.flash { banner(flash, size: 15) }
            sign
            MQCrab(p, lit: scene.enraged)
                .frame(width: Self.crabWidth(m),
                       height: Self.crabWidth(m) * MQCrab.box.height / MQCrab.box.width)
            Spacer(minLength: 0)
            answerGrid
        }
    }

    // MARK: Parts

    private var freezeBlock: some View {
        VStack(spacing: 1) {
            MQFreezePips(p, held: scene.freezeHeld, total: scene.freezeTotal,
                         size: compact ? 22 : 30)
            Text("freeze")
                .font(.mq(compact ? 11 : 14, .bold))
                .foregroundStyle(p.carved.opacity(0.82))
                .shadow(color: p.woodDeep.opacity(0.7), radius: 0, x: 0, y: 1.5)
        }
    }

    /// The dummy's bar, and the one place the tier and class level are stated.
    private var bossLine: some View {
        HStack(spacing: 12) {
            Text("\(scene.tierName) - \(scene.level)")
                .font(.mq(compact ? 13 : 17, .bold))
                .foregroundStyle(p.carved)
                .shadow(color: p.woodDeep.opacity(0.8), radius: 0, x: 0, y: 1.5)
                .fixedSize()
            MQGauge(p, value: scene.bossHP, side: .boss, height: compact ? 18 : 24)
        }
    }

    private func banner(_ text: String, size: CGFloat) -> some View {
        Text(text)
            .font(.mq(size, .extrabold))
            .foregroundStyle(p.carved)
            .padding(.horizontal, size)
            .padding(.vertical, size * 0.28)
            .background {
                Canvas { ctx, s in
                    let cloth = Path.smoothClosed([
                        CGPoint(x: 3, y: 3), CGPoint(x: s.width * 0.5, y: 0),
                        CGPoint(x: s.width - 3, y: 4), CGPoint(x: s.width, y: s.height - 3),
                        CGPoint(x: s.width * 0.5, y: s.height), CGPoint(x: 2, y: s.height - 4)
                    ], tension: 0.14)
                    ctx.fill(cloth, with: .linearGradient(
                        Gradient(colors: [p.coral, p.coralDeep]),
                        startPoint: .zero, endPoint: CGPoint(x: 0, y: s.height)))
                    ctx.stroke(cloth, with: .color(Color(hex: 0x63200F).opacity(0.8)),
                               lineWidth: 2)
                }
            }
    }

    private var sign: some View {
        MQSign(p, postHeight: m.isRegular ? 40 : (m.isShort ? 13 : 18),
               padH: m.isRegular ? 36 : 22,
               padV: m.isRegular ? 16 : (m.isShort ? 7 : 9)) {
            HStack(alignment: .center, spacing: 20) {
                MQQuestionText(p, scene.question, size: type.question,
                               alignment: m.isWide ? .leading : .center)
                    // No `maxWidth: .infinity` in the wide case: a Patchwerk
                    // question can be four words, and a sheet stretched to the
                    // cap around "What is 3.6 x 100?" is the mass problem in
                    // miniature. The board takes the width the words need, up
                    // to the cap.
                    .frame(maxWidth: m.isWide ? nil : .infinity,
                           alignment: m.isWide ? .leading : .center)
                if scene.figure != .none {
                    MQFigureView(p, scene.figure)
                        .frame(width: compact ? 170 : 190, height: compact ? 80 : 126)
                }
            }
        }
    }

    private var answerRow: some View {
        HStack(spacing: 18) {
            ForEach(Array(scene.answers.enumerated()), id: \.offset) { i, a in
                MQAnswerTile(p, a, tilt: MQAnswerTile.tilts[i % 4], fontSize: type.tile)
                    .overlay { MQProbe.screenTint(i) }
            }
        }
        .frame(height: Self.tileSize(m).height)
    }

    private var answerGrid: some View {
        VStack(spacing: m.isShort ? 7 : 10) {
            ForEach(0..<2, id: \.self) { row in
                HStack(spacing: m.isShort ? 7 : 10) {
                    ForEach(0..<2, id: \.self) { col in
                        let i = row * 2 + col
                        MQAnswerTile(p, scene.answers[i], tilt: MQAnswerTile.tilts[i],
                                     fontSize: type.tile)
                            .frame(height: Self.tileSize(m).height)
                            .overlay { MQProbe.screenTint(i) }
                    }
                }
            }
        }
    }
}
