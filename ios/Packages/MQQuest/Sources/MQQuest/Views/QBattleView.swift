import SwiftUI
import MQContent
import MQDesign

/// The battle, interactive.
///
/// `MQDesign.MQBattleScreen` is a pure function of a scene and draws four answer
/// tiles; it has no callbacks, no typed branch and no feedback state, because the
/// contract says a design screen owns none of those. This screen is the same
/// composition with the interaction the mode owns, and it composes the SAME
/// components (`MQSign`, `MQQuestionText`, `MQGauge`, `MQCrystalRope`,
/// `MQLantern`, `MQKnob`, `MQAnswerTile`, `MQCreature`) so the two cannot drift
/// apart visually.
///
/// **The typed branch is the part that has no design-lane ancestor.** A question
/// with no options needs the whole bottom of the screen: the answer slot, the
/// unit chips, and the keypad. On that branch the cast shrinks or steps out and
/// the two gauges move up into the rail - the fight is still on screen, it is
/// just told by the bars rather than by the bodies.
public struct QBattleView: View, MQTapAudited {
    @ObservedObject var model: QQuestModel
    let m: MQMetrics
    let p: MQPalette

    public init(model: QQuestModel, metrics: MQMetrics, palette: MQPalette = .noon) {
        self.model = model; self.m = metrics; self.p = palette
    }

    private var g: Geo { Self.geometry(m, typed: model.question?.isTyped ?? false) }
    private var type: MQType { m.type }
    private var q: Question? { model.question }

    // MARK: - Geometry

    public struct Geo: Sendable, Equatable {
        public var pad: CGFloat
        public var contentW: CGFloat
        public var typed: Bool
        public var castW: CGFloat = 0
        public var signW: CGFloat = 0
        public var overlap: CGFloat = 0
        public var stackFigure = false
        public var figureW: CGFloat = 0
        public var figureH: CGFloat = 0
        public var tileW: CGFloat = 0
        public var tileH: CGFloat = 0
        public var knob: CGFloat = 44
        public var gaugeH: CGFloat = 20
        public var lantern: CGFloat = 46
        public var topRailH: CGFloat = 56
        public var ropeH: CGFloat = 0
        /// Typed branch.
        public var keypad = QKeypad.Geo(key: .zero, gap: 0, actionWidth: 0, glyph: 0)
        public var slotFont: CGFloat = 30
        public var chip: CGSize = .zero
        public var showCast = true
        public var nextButtonH: CGFloat = MQTap.min
    }

    nonisolated static let signMinWidth: CGFloat = 320
    nonisolated static let signMaxWidth: CGFloat = 620
    nonisolated static let sideBySideFloor: CGFloat = 250

    nonisolated public static func geometry(_ m: MQMetrics, typed: Bool) -> Geo {
        var g = Geo(pad: m.isWide ? 26 : (m.isRegular ? 24 : 14), contentW: 0, typed: typed)
        g.contentW = m.size.width - g.pad * 2
        g.keypad = QKeypad.geometry(m)
        g.chip = QUnitChipRow.chipSize(compact: !m.isRegular)
        g.slotFont = m.isRegular ? 34 : 26
        g.nextButtonH = max(MQTap.min, (m.isRegular ? 20 : 16) * 1.32 + 24)

        if m.isWide {
            g.overlap = MQBoard.frameInset
            // On the typed branch the keypad owns the bottom-right of the frame,
            // so the cast yields first - it is the element that can be smaller
            // without anything becoming unreadable.
            let castShare: CGFloat = typed ? 0.19 : 0.265
            var castW = min(max(g.contentW * castShare, typed ? 150 : 190), typed ? 230 : 300)
            var signW = g.contentW - castW * 2 + g.overlap * 2
            if signW < signMinWidth {
                signW = signMinWidth
                castW = max((g.contentW + g.overlap * 2 - signW) / 2, 130)
            }
            g.castW = castW
            g.signW = min(signW, signMaxWidth)
            g.figureW = min(max(g.signW * 0.31, 120), 190)
            g.figureH = g.figureW * 130 / 190
            g.stackFigure = (g.signW - 80 - g.figureW - 22) < sideBySideFloor
            g.tileH = min(max(m.size.height * 0.125, 76), 118)
            g.tileW = (g.contentW - 18 * 3) / 4
            g.knob = 54
            g.gaugeH = 28
            g.lantern = 58
            g.topRailH = 62
            g.showCast = true
        } else {
            let reference: CGFloat = m.isRegular ? 1194 : 852
            let k = min(max(m.size.height / reference, 0.74), 1.12)
            g.castW = (m.isRegular ? 200 : 140) * k
            g.tileH = (m.isRegular ? 96 : 72) * k
            g.tileW = (g.contentW - 12) / 2
            g.figureW = m.isRegular ? 220 : 180
            g.figureH = (m.isRegular ? 112 : 84) * k * (m.isShort ? 0.88 : 1)
            g.gaugeH = m.isRegular ? 26 : 20
            g.knob = m.isRegular ? 52 : 44
            g.ropeH = (m.isRegular ? 32 : 26) * k
            g.lantern = m.isRegular ? 50 : 38
            // The keypad is four rows tall. On a 667 pt phone the cast and the
            // keypad cannot both be on the glass, and between a picture of a crab
            // and a reachable unit chip the chip wins.
            g.showCast = !typed || m.size.height >= 800
        }
        return g
    }

    /// Everything a child may hit. The keypad's keys and the unit chips are in
    /// here because PHASE1's rule says an element sized by a literal in the body
    /// is invisible to the gate - so they are sized in `Geo` and audited here.
    nonisolated public static func tapTargets(_ m: MQMetrics) -> [MQTapTarget] {
        var out = [MQTapTarget("pause", square: geometry(m, typed: false).knob)]
        let choice = geometry(m, typed: false)
        out += (0..<4).map {
            MQTapTarget("answer \($0 + 1)",
                        CGSize(width: choice.tileW, height: choice.tileH))
        }
        let typed = geometry(m, typed: true)
        out.append(MQTapTarget("keypad digit", typed.keypad.key))
        out.append(MQTapTarget("keypad undo",
                               CGSize(width: typed.keypad.actionWidth,
                                      height: typed.keypad.key.height)))
        out.append(MQTapTarget("keypad check",
                               CGSize(width: typed.keypad.actionWidth,
                                      height: typed.keypad.key.height)))
        out.append(MQTapTarget("unit chip", typed.chip))
        out.append(MQTapTarget("next", CGSize(width: MQTap.min, height: typed.nextButtonH)))
        return out
    }

    // MARK: - Body

    public var body: some View {
        ZStack {
            MQWorld(p, horizon: m.isWide ? 0.30 : 0.28)
            if m.isWide { wide } else { tall }
        }
    }

    // MARK: Wide

    private var wide: some View {
        VStack(spacing: 12) {
            topRail
            ZStack(alignment: .bottom) {
                sign.frame(width: g.signW).padding(.bottom, g.typed ? 24 : 84)
                HStack(alignment: .bottom, spacing: 0) {
                    heroColumn(width: g.castW)
                    Spacer(minLength: 0)
                    monsterColumn(width: g.castW)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            bottom
        }
        .padding(.horizontal, g.pad)
        .padding(.top, m.insets.top + g.pad * 0.7)
        .padding(.bottom, m.insets.bottom + g.pad * 0.7)
    }

    private var topRail: some View {
        HStack(alignment: .center, spacing: 16) {
            MQNameTag(p, name: model.profile?.name ?? "",
                      level: model.profile?.level ?? "",
                      quest: model.node?.name ?? "")
            Spacer(minLength: 10)
            MQCrystalRope(p, filled: model.run.crystals, total: QMonster.chain.count,
                          shell: 32)
                .frame(width: min(260, g.contentW * 0.23), height: 50)
            Spacer(minLength: 10)
            MQLantern(p, streak: model.run.streak, size: g.lantern)
            pauseKnob
        }
        .frame(height: g.topRailH)
    }

    private var pauseKnob: some View {
        Button { Task { await model.toMap() } } label: {
            MQKnob(p, .pause, size: g.knob)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(QStrings.pause)
    }

    private func heroColumn(width: CGFloat) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            MQGauge(p, value: model.run.heroHPFraction,
                    readout: "\(max(0, model.run.heroHP))", side: .hero, height: g.gaugeH)
                .frame(width: width * 0.80)
            MQCreature(model.profile?.cast ?? .unicorn, p)
                .frame(width: width, height: castHeight(width, model.profile?.cast ?? .unicorn))
        }
        .frame(width: width, alignment: .leading)
    }

    private func monsterColumn(width: CGFloat) -> some View {
        VStack(alignment: .trailing, spacing: 6) {
            MQMonsterName(p, name: model.run.monster.name, size: 21)
            MQGauge(p, value: model.run.monsterHPFraction,
                    readout: "\(max(0, model.run.monsterHP))", side: .monster, height: g.gaugeH)
                .frame(width: width * 0.80)
            MQCreature(.crab, p)
                .frame(width: width, height: width * MQCrab.box.height / MQCrab.box.width)
        }
        .frame(width: width, alignment: .trailing)
    }

    private func castHeight(_ w: CGFloat, _ cast: MQCast) -> CGFloat {
        w * MQCreature.box(cast).height / MQCreature.box(cast).width
    }

    /// The board. Question, then the figure - and the figure is `QFigureView`,
    /// which draws all seven engine spec types rather than the design enum's two.
    private var sign: some View {
        MQSign(p, postHeight: g.typed ? 26 : 46, padH: 36, padV: 16) {
            Group {
                if g.stackFigure || !hasFigure {
                    VStack(alignment: .leading, spacing: 12) {
                        questionText
                        if hasFigure { figure.frame(maxWidth: .infinity, alignment: .center) }
                    }
                } else {
                    HStack(alignment: .center, spacing: 20) {
                        questionText
                        figure
                    }
                }
            }
        }
    }

    private var hasFigure: Bool {
        guard let q else { return false }
        return q.figure != nil
    }

    @ViewBuilder private var figure: some View {
        if let f = q?.figure {
            QFigureView(p, f, fallbackText: q?.extraText ?? "")
                .frame(width: g.figureW, height: g.figureH)
        }
    }

    private var questionText: some View {
        MQQuestionText(p, q?.stemText ?? "", size: type.question,
                       alignment: m.isWide ? .leading : .center)
            .frame(maxWidth: .infinity, alignment: m.isWide ? .leading : .center)
    }

    // MARK: Tall

    private var tall: some View {
        VStack(spacing: m.isRegular ? 12 : (m.isShort ? 5 : 8)) {
            compactRail
            if !g.showCast { compactGauges }
            MQSign(p, postHeight: m.isRegular ? 26 : (m.isShort ? 12 : 18),
                   padH: m.isRegular ? 30 : 20,
                   padV: m.isRegular ? 12 : (m.isShort ? 6 : 9)) {
                VStack(spacing: m.isRegular ? 10 : (m.isShort ? 4 : 6)) {
                    questionText
                    if hasFigure { figure }
                }
            }
            Spacer(minLength: 0)
            if g.showCast { facingBand }
            Spacer(minLength: 0)
            bottom
        }
        .padding(.horizontal, g.pad)
        .padding(.top, m.insets.top + g.pad * 0.5)
        .padding(.bottom, m.insets.bottom + g.pad * 0.5)
    }

    private var compactRail: some View {
        VStack(spacing: m.isShort ? 5 : 8) {
            HStack(alignment: .center, spacing: 10) {
                MQNameTag(p, name: model.profile?.name ?? "",
                          level: model.profile?.level ?? "",
                          quest: model.node?.name ?? "", compact: !m.isRegular)
                Spacer(minLength: 6)
                MQLantern(p, streak: model.run.streak, size: g.lantern)
                pauseKnob
            }
            MQCrystalRope(p, filled: model.run.crystals, total: QMonster.chain.count,
                          shell: m.isRegular ? 24 : 19)
                .frame(height: g.ropeH)
        }
    }

    /// The two bars side by side, for the typed branch on a short frame where the
    /// creatures have stepped off. Same components, same colours, same readouts.
    private var compactGauges: some View {
        HStack(spacing: 10) {
            MQGauge(p, value: model.run.heroHPFraction,
                    readout: "\(max(0, model.run.heroHP))", side: .hero, height: g.gaugeH)
            MQGauge(p, value: model.run.monsterHPFraction,
                    readout: "\(max(0, model.run.monsterHP))", side: .monster, height: g.gaugeH)
        }
    }

    private var facingBand: some View {
        HStack(alignment: .bottom, spacing: 4) {
            VStack(spacing: 6) {
                MQGauge(p, value: model.run.heroHPFraction,
                        readout: "\(max(0, model.run.heroHP))", side: .hero, height: g.gaugeH)
                    .frame(width: g.castW * 0.95)
                MQCreature(model.profile?.cast ?? .unicorn, p)
                    .frame(width: g.castW,
                           height: castHeight(g.castW, model.profile?.cast ?? .unicorn))
            }
            Spacer(minLength: 0)
            VStack(spacing: 4) {
                MQMonsterName(p, name: model.run.monster.name, size: m.isRegular ? 19 : 15)
                MQGauge(p, value: model.run.monsterHPFraction,
                        readout: "\(max(0, model.run.monsterHP))", side: .monster,
                        height: g.gaugeH)
                    .frame(width: g.castW * 0.86)
                MQCreature(.crab, p)
                    .frame(width: g.castW,
                           height: g.castW * MQCrab.box.height / MQCrab.box.width)
            }
        }
    }

    // MARK: The bottom third

    @ViewBuilder private var bottom: some View {
        switch model.phase {
        case .feedback: feedbackCard
        default:
            if q?.isTyped == true { typedEntry } else { answerTiles }
        }
    }

    @ViewBuilder private var answerTiles: some View {
        let choices = q?.choiceTexts ?? []
        if m.isWide {
            HStack(spacing: 18) {
                ForEach(Array(choices.enumerated()), id: \.offset) { i, a in
                    answerTile(i, a)
                }
            }
            .frame(height: g.tileH)
        } else {
            VStack(spacing: m.isShort ? 8 : 12) {
                ForEach(0..<((choices.count + 1) / 2), id: \.self) { row in
                    HStack(spacing: m.isShort ? 8 : 12) {
                        ForEach(0..<2, id: \.self) { col in
                            let i = row * 2 + col
                            if i < choices.count { answerTile(i, choices[i]) }
                        }
                    }
                }
            }
        }
    }

    private func answerTile(_ i: Int, _ text: String) -> some View {
        Button { Task { await model.choose(i) } } label: {
            MQAnswerTile(p, text, tilt: MQAnswerTile.tilts[i % 4], fontSize: type.tile)
                .frame(height: g.tileH)
        }
        .buttonStyle(.plain)
    }

    private var typedEntry: some View {
        Group {
            if m.isWide {
                HStack(alignment: .top, spacing: 20) {
                    VStack(alignment: .leading, spacing: 12) {
                        slotBlock
                        Spacer(minLength: 0)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    keypad
                }
            } else {
                VStack(alignment: .leading, spacing: m.isShort ? 6 : 10) {
                    slotBlock
                    keypad.frame(maxWidth: .infinity, alignment: .center)
                }
            }
        }
    }

    private var slotBlock: some View {
        VStack(alignment: .leading, spacing: m.isShort ? 6 : 10) {
            Text(QStrings.typeYourAnswer)
                .font(.mq(m.isRegular ? 18 : 14, .bold))
                .foregroundStyle(p.carved.opacity(0.9))
                .shadow(color: p.woodDeep.opacity(0.7), radius: 0, x: 0, y: 1.5)
            MQTag(p) {
                QAnswerSlot(p, entry: model.entry, fontSize: g.slotFont,
                            active: model.phase == .asking)
                    .frame(width: m.isWide ? 280 : min(300, g.contentW - 40))
                    .padding(.horizontal, 6)
                    .padding(.vertical, 4)
            }
            if !model.chips.isEmpty {
                QUnitChipRow(p, chips: model.chips, selected: model.entry.unit,
                             compact: !m.isRegular) { model.toggleChip($0) }
            }
        }
    }

    private var keypad: some View {
        QKeypad(p, entry: model.entry, policy: model.keypadPolicy, geometry: g.keypad,
                press: { model.press($0) },
                submit: { Task { await model.submitTyped() } })
    }

    // MARK: Feedback

    /// The card after an answer. The unit lesson leads it when the number was
    /// right and the unit was not - see `QFeedback.lines`.
    private var feedbackCard: some View {
        HStack(alignment: .center, spacing: 14) {
            MQScroll(p, padH: m.isRegular ? 22 : 14, padV: m.isRegular ? 12 : 9) {
                VStack(alignment: .leading, spacing: 4) {
                    ForEach(Array((model.feedback?.lines ?? []).enumerated()), id: \.offset) { i, line in
                        Text(MQTypeset.bindUnits(line))
                            .font(.mq(i == 0 ? (m.isRegular ? 20 : 16)
                                             : (m.isRegular ? 17 : 13),
                                      i == 0 ? .bold : .regular))
                            .foregroundStyle(i == 0
                                ? (model.feedback?.item.isCorrect == true ? p.leafDeep : p.ink)
                                : p.inkSoft)
                            .fixedSize(horizontal: false, vertical: true)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
            }
            Button { Task { await model.advance() } } label: {
                MQPlankButton(p, nextLabel, primary: true,
                              fontSize: m.isRegular ? 20 : 16)
            }
            .buttonStyle(.plain)
            .frame(minWidth: MQTap.min, minHeight: g.nextButtonH)
        }
        .frame(maxWidth: .infinity)
    }

    private var nextLabel: String {
        let last = model.run.answered >= model.setSize
            || model.run.isDefeated || model.run.clearedTheChain
        return last ? QStrings.finishSet : QStrings.nextQuestion
    }
}
