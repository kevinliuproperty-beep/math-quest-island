import SwiftUI

/// Quest battle, mid-question.
///
///     wide (any landscape iPad)
///     +----------------------------------------------------------------+
///     | [name tag]      ~~ crystals on a spar ~~     (lantern) (pause)  |
///     |                                                                |
///     |   [gauge]        +----------------------+       [name][gauge]  |
///     |  (unicorn)       | question | figure    |         (crab)       |
///     |    .....         +--- posts in sand ----+          .....       |
///     |  [  tile  ]   [  tile  ]   [  tile  ]   [  tile  ]             |
///     +----------------------------------------------------------------+
///
/// **The mass fix (design lane, kept).** The first storybook pass put a
/// full-width board in the middle of the frame with the question centred over a
/// fixed 168pt figure slot -- 418pt of an 834pt screen, the largest, brightest
/// and flattest object in the picture, with the two creatures pushed out to the
/// margins as decoration. The board is now sized to its content, question and
/// figure sit side by side, and the cast is large and stands IN FRONT of the
/// board's outer edges. Overlap is what turns two rails and a card into one
/// place.
///
/// **The width fix (this lane).** That composition was authored at exactly one
/// size, 1194x834, and its three widths -- 300 + 620 + 300 -- were literals. On
/// a 4:3 iPad they sum to more than the screen: at 1024 pt landscape the two
/// creatures had to eat 44 pt of board EACH to fit, and the board's parchment
/// starts only `MQBoard.frameInset` (15 pt) in from its outer edge. The unicorn's
/// horn was therefore standing on the paper, and 3 pt of it on the words. That
/// is the clipping the conn would not wait for.
///
/// The three widths are now solved rather than declared, from one hard
/// constraint:
///
///     castW * 2 + signW - 2 * overlap  <=  contentWidth
///     overlap                          <=  MQBoard.frameInset
///
/// The cast is sized first (it is the character; it takes ~26.5% of the content
/// width, capped at the authored 300) and the board takes what is left. The
/// overlap can never exceed the wooden frame, so a creature is in front of the
/// BOARD and never on the PARCHMENT, at every width in the matrix. At 1194 the
/// board comes out at 564 rather than 620 -- the honest cost of the fix, paid by
/// the element the lane itself called the composition's mass problem, and it
/// buys back the 3 pt the horn was taking off the first line.
///
/// A narrow board also cannot hold question and figure side by side: at 1024
/// landscape the text column would be 231 pt at 34 pt type, which is three words
/// a line. Below a 260 pt text column the two stack, which costs vertical slack
/// the 4:3 screen has and horizontal room it does not.
public struct MQBattleScreen: View, MQTapAudited {
    let scene: MQBattleScene
    let m: MQMetrics
    let p: MQPalette

    public init(scene: MQBattleScene = .sample, metrics: MQMetrics,
                palette: MQPalette = .noon) {
        self.scene = scene; self.m = metrics; self.p = palette
    }

    private var g: Geo { Self.geometry(m) }
    private var type: MQType { m.type }

    // MARK: - Geometry
    //
    // ONE place. The body draws from it and `tapTargets` audits it, so a control
    // cannot be shrunk past the 44 pt floor with the gate still green.

    public struct Geo: Sendable, Equatable {
        public var pad: CGFloat
        public var contentW: CGFloat
        /// Wide only.
        public var castW: CGFloat = 0
        public var signW: CGFloat = 0
        /// How far each creature stands in front of the board. Never more than
        /// `MQBoard.frameInset`, which is the width of the wooden frame.
        public var overlap: CGFloat = 0
        public var stackFigure = false
        public var figureW: CGFloat = 0
        public var figureH: CGFloat = 0
        public var tileW: CGFloat = 0
        public var tileH: CGFloat = 0
        public var knob: CGFloat = 44
        public var gaugeH: CGFloat = 20
        /// Tall only.
        public var heroW: CGFloat = 0
        public var crabW: CGFloat = 0
        public var ropeH: CGFloat = 0
        public var lantern: CGFloat = 0
        public var topRailH: CGFloat = 0
    }

    /// The board's minimum useful width. Below this a P4 word problem is a
    /// column of two-word lines and the composition has failed, so the cast
    /// yields instead.
    nonisolated static let signMinWidth: CGFloat = 340
    /// The authored maximum, from the approved 1194 pt render.
    nonisolated static let signMaxWidth: CGFloat = 620
    /// Text column below which question and figure stop sitting side by side.
    nonisolated static let sideBySideFloor: CGFloat = 260
    nonisolated static let signPadH: CGFloat = 40

    nonisolated public static func geometry(_ m: MQMetrics) -> Geo {
        var g = Geo(pad: m.isWide ? 30 : (m.isRegular ? 26 : 16),
                    contentW: 0)
        g.contentW = m.size.width - g.pad * 2

        if m.isWide {
            g.overlap = MQBoard.frameInset
            var castW = min(max(g.contentW * 0.265, 190), 300)
            var signW = g.contentW - castW * 2 + g.overlap * 2
            if signW < signMinWidth {
                // The board has a floor; the cast yields to it.
                signW = signMinWidth
                castW = max((g.contentW + g.overlap * 2 - signW) / 2, 150)
            }
            g.castW = castW
            g.signW = min(signW, signMaxWidth)
            g.figureW = min(max(g.signW * 0.31, 120), 190)
            g.figureH = g.figureW * 130 / 190
            g.stackFigure =
                (g.signW - signPadH * 2 - g.figureW - 22) < sideBySideFloor
            g.tileH = min(max(m.size.height * 0.125, 76), 118)
            g.tileW = (g.contentW - 18 * 3) / 4
            g.knob = 54
            g.gaugeH = 28
            g.lantern = 58
            g.topRailH = 62
        } else {
            // Everything on the facing band is a fraction of the height budget,
            // referenced to the size it was authored at, so the approved iPhone
            // 15 and iPad 11" portrait renders are unchanged (k = 1) and the
            // shorter screens shrink rather than overflow.
            let reference: CGFloat = m.isRegular ? 1194 : 852
            let k = min(max(m.size.height / reference, 0.74), 1.12)
            g.heroW = (m.isRegular ? 210 : 148) * k
            g.crabW = (m.isRegular ? 230 : 162) * k
            g.tileH = (m.isRegular ? 96 : 72) * k
            g.tileW = (g.contentW - 12) / 2
            g.figureW = m.isRegular ? 230 : 190
            g.figureH = (m.isRegular ? 116 : 86) * k * (m.isShort ? 0.88 : 1)
            g.gaugeH = m.isRegular ? 26 : 20
            g.knob = m.isRegular ? 52 : 44
            g.ropeH = (m.isRegular ? 34 : 27) * k
            g.lantern = m.isRegular ? 50 : 38
        }
        return g
    }

    /// Everything a child may hit, at the size this screen gives it.
    nonisolated public static func tapTargets(_ m: MQMetrics) -> [MQTapTarget] {
        let g = geometry(m)
        return [MQTapTarget("pause", square: g.knob)]
            + (0..<4).map { MQTapTarget("answer \($0 + 1)",
                                        CGSize(width: g.tileW, height: g.tileH)) }
    }

    public var body: some View {
        ZStack {
            MQWorld(p, horizon: m.isWide ? 0.30 : 0.28)
            if m.isWide { wide } else { tall }
        }
    }

    // MARK: Wide

    private var wide: some View {
        VStack(spacing: 16) {
            topRail
            ZStack(alignment: .bottom) {
                // Drawn FIRST, so the cast is in front of it. The board also
                // sits further UP the beach -- its posts are in the wet sand,
                // the creatures on the dry sand nearer the child -- which is
                // what lets them overlap its outer edges at all.
                sign
                    .frame(width: g.signW)
                    .padding(.bottom, 84)
                HStack(alignment: .bottom, spacing: 0) {
                    heroColumn(width: g.castW)
                    Spacer(minLength: 0)
                    monsterColumn(width: g.castW)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            answerRow
        }
        .padding(.horizontal, g.pad)
        .padding(.top, m.insets.top + g.pad * 0.7)
        .padding(.bottom, m.insets.bottom + g.pad * 0.7)
    }

    private var topRail: some View {
        HStack(alignment: .center, spacing: 18) {
            MQNameTag(p, name: scene.heroName, level: scene.level, quest: scene.questName)
            Spacer(minLength: 12)
            MQCrystalRope(p, filled: scene.crystals, total: scene.crystalsTotal, shell: 32)
                .frame(width: min(270, g.contentW * 0.24), height: 52)
            Spacer(minLength: 12)
            MQLantern(p, streak: scene.streak, size: g.lantern)
            MQKnob(p, .pause, size: g.knob)
        }
        .frame(height: g.topRailH)
    }

    /// Each fighter's gauge is pushed to the OUTSIDE of its own column. Centred,
    /// it drifted inward over the signboard's frame and read as debris lying on
    /// the paper; against the frame edge it reads as that fighter's own kit.
    private func heroColumn(width: CGFloat) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            MQGauge(p, value: scene.heroHP, readout: scene.heroHPReadout,
                    side: .hero, height: g.gaugeH)
                .frame(width: width * 0.80)
            MQCreature(scene.heroCast, p)
                .frame(width: width, height: width * MQCreature.box(scene.heroCast).height
                                                  / MQCreature.box(scene.heroCast).width)
        }
        .frame(width: width, alignment: .leading)
    }

    private func monsterColumn(width: CGFloat) -> some View {
        VStack(alignment: .trailing, spacing: 6) {
            MQMonsterName(p, name: scene.monsterName, size: 21)
            MQGauge(p, value: scene.monsterHP, readout: scene.monsterHPReadout,
                    side: .monster, height: g.gaugeH)
                .frame(width: width * 0.80)
            MQCreature(.crab, p)
                .frame(width: width, height: width * MQCrab.box.height / MQCrab.box.width)
        }
        .frame(width: width, alignment: .trailing)
    }

    /// Question and figure, side by side while the text column can carry a
    /// sentence and stacked when it cannot.
    private var sign: some View {
        MQSign(p, postHeight: 46, padH: Self.signPadH, padV: 18) {
            if g.stackFigure {
                VStack(alignment: .leading, spacing: 14) {
                    MQQuestionText(p, scene.question, size: type.question)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    if scene.figure != .none {
                        MQFigureView(p, scene.figure)
                            .frame(width: g.figureW, height: g.figureH)
                            .frame(maxWidth: .infinity, alignment: .center)
                    }
                }
            } else {
                HStack(alignment: .center, spacing: 22) {
                    MQQuestionText(p, scene.question, size: type.question)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    if scene.figure != .none {
                        MQFigureView(p, scene.figure)
                            .frame(width: g.figureW, height: g.figureH)
                    }
                }
            }
        }
    }

    private var answerRow: some View {
        HStack(spacing: 18) {
            ForEach(Array(scene.answers.enumerated()), id: \.offset) { i, a in
                MQAnswerTile(p, a, tilt: MQAnswerTile.tilts[i % 4], fontSize: type.tile)
            }
        }
        .frame(height: g.tileH)
    }

    // MARK: Tall

    private var tall: some View {
        VStack(spacing: m.isRegular ? 14 : (m.isShort ? 5 : 8)) {
            compactRail
            MQSign(p, postHeight: m.isRegular ? 30 : (m.isShort ? 14 : 20),
                   padH: m.isRegular ? 34 : 22,
                   padV: m.isRegular ? 14 : (m.isShort ? 7 : 9)) {
                VStack(spacing: m.isRegular ? 10 : (m.isShort ? 4 : 6)) {
                    MQQuestionText(p, scene.question, size: type.question,
                                   alignment: .center)
                    if scene.figure != .none {
                        MQFigureView(p, scene.figure)
                            .frame(width: g.figureW, height: g.figureH)
                    }
                }
            }
            Spacer(minLength: 0)
            facingBand
            Spacer(minLength: 0)
            answerGrid
        }
        .padding(.horizontal, g.pad)
        .padding(.top, m.insets.top + g.pad * 0.5)
        .padding(.bottom, m.insets.bottom + g.pad * 0.5)
    }

    private var compactRail: some View {
        VStack(spacing: m.isShort ? 5 : 8) {
            HStack(alignment: .center, spacing: 10) {
                MQNameTag(p, name: scene.heroName, level: scene.level,
                          quest: scene.questName, compact: !m.isRegular)
                Spacer(minLength: 6)
                MQLantern(p, streak: scene.streak, size: g.lantern)
                MQKnob(p, .pause, size: g.knob)
            }
            MQCrystalRope(p, filled: scene.crystals, total: scene.crystalsTotal,
                          shell: m.isRegular ? 24 : 19)
                .frame(height: g.ropeH)
        }
    }

    private var facingBand: some View {
        HStack(alignment: .bottom, spacing: 4) {
            VStack(spacing: 6) {
                MQGauge(p, value: scene.heroHP, readout: scene.heroHPReadout,
                        side: .hero, height: g.gaugeH)
                    .frame(width: g.heroW * 0.95)
                MQCreature(scene.heroCast, p)
                    .frame(width: g.heroW,
                           height: g.heroW * MQCreature.box(scene.heroCast).height
                                   / MQCreature.box(scene.heroCast).width)
            }
            Spacer(minLength: 0)
            VStack(spacing: 4) {
                MQMonsterName(p, name: scene.monsterName, size: m.isRegular ? 19 : 15)
                MQGauge(p, value: scene.monsterHP, readout: scene.monsterHPReadout,
                        side: .monster, height: g.gaugeH)
                    .frame(width: g.crabW * 0.86)
                MQCreature(.crab, p)
                    .frame(width: g.crabW, height: g.crabW * MQCrab.box.height / MQCrab.box.width)
            }
        }
    }

    private var answerGrid: some View {
        VStack(spacing: m.isShort ? 8 : 12) {
            ForEach(0..<2, id: \.self) { row in
                HStack(spacing: m.isShort ? 8 : 12) {
                    ForEach(0..<2, id: \.self) { col in
                        let i = row * 2 + col
                        MQAnswerTile(p, scene.answers[i], tilt: MQAnswerTile.tilts[i],
                                     fontSize: type.tile)
                            .frame(height: g.tileH)
                    }
                }
            }
        }
    }
}
