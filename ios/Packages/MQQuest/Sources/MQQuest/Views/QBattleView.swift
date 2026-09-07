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
    /// Set by the driver and the gate; nil in the app. See `QHitMap`.
    @Environment(\.qHitMap) private var hitMap
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
        /// The width the STEM is laid out in when there is no figure beside it.
        public var stemWidth: CGFloat = 0
        /// **How many lines of stem this frame can carry.**
        ///
        /// The typed screen is a fixed-height keypad, a slot, a chip row and a
        /// rail; what is left over is the stem's, and on a 744 pt iPad mini in
        /// landscape that is four lines. A five-line P3 money stem set at the
        /// screen's nominal question size overflowed it, which is K1 in one
        /// sentence. The CHOICE branch has a budget too - four tiles and a real
        /// figure are nearly as demanding, and measuring it found overflows at
        /// five matrix sizes that nothing had ever looked at.
        public var stemLineBudget: Int = .max
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
            // The cast yields FIRST and yields far: on the typed branch the
            // creatures are decoration beside a keypad, a slot, a chip row and a
            // four-line stem, and they were sized as though the answer tiles were
            // still there. Measured against real stems the old share overflowed the
            // iPad mini in landscape by 97 pt (Quest Refutation K1).
            let castShare: CGFloat = typed ? 0.15 : 0.265
            var castW = min(max(g.contentW * castShare, typed ? 120 : 190), typed ? 172 : 300)
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
            g.gaugeH = typed ? 24 : 28
            g.lantern = typed ? 50 : 58
            g.topRailH = typed ? 54 : 62
            g.showCast = true
            g.stemWidth = g.signW - 72
            g.stemLineBudget = typed
                ? (m.size.height >= 1000 ? 6 : (m.size.height >= 820 ? 5 : 4))
                : (m.size.height >= 1000 ? 6 : (m.size.height >= 820 ? 5 : 4))
        } else {
            let reference: CGFloat = m.isRegular ? 1194 : 852
            let k = min(max(m.size.height / reference, 0.74), 1.12)
            g.castW = (m.isRegular ? 200 : 140) * k
            g.tileH = (m.isRegular ? 96 : 72) * k
            g.tileW = (g.contentW - 12) / 2
            g.figureW = m.isRegular ? 220 : 180
            // 84 on a phone gave the pie a 26 pt disc once its labels were set at
            // the type floor - a picture too small to read the thing the question
            // asks about. 104 is what a legible sector label needs; the typed
            // branch scales it back down below.
            g.figureH = (m.isRegular ? 112 : 104) * k * (m.isShort ? 0.88 : 1)
            g.gaugeH = m.isRegular ? 26 : 20
            g.knob = m.isRegular ? 52 : 44
            g.ropeH = (m.isRegular ? 32 : 26) * k
            g.lantern = m.isRegular ? 50 : 38
            // **On a TALL frame the typed branch has no cast at all.**
            //
            // The keypad is four rows plus an action column; the slot and the chip
            // row are three more; and above them the rail, the crystal rope and a
            // real four-line P4 stem. It was `m.size.height >= 800`, which kept the
            // creatures on a 9.7" iPad in portrait and on an iPhone 15 and
            // overflowed both by more than 100 pt with real content (Quest
            // Refutation K1: the name tag, the streak lantern and the crystal rope
            // were sliced off the top and the bottom keypad row presented 18 pt of
            // a 58 pt key). Between a picture of a crab and a key a finger can
            // land on, the key wins - the fight is still told, by the two bars in
            // `compactGauges`.
            g.showCast = !typed
            g.stemWidth = g.contentW - (m.isRegular ? 60 : 40)
            g.stemLineBudget = typed
                ? (m.isRegular ? (m.size.height >= 1100 ? 6 : 5)
                               : (m.isShort ? 4 : 5))
                : (m.isRegular ? 7 : (m.isShort ? 4 : 5))
            if typed {
                // The stem and the figure yield too, in that order: a typed screen
                // is mostly keypad and the question has to fit above it.
                g.figureH *= m.isShort ? 0.62 : 0.72
                g.figureW *= 0.86
            }
        }
        return g
    }

    /// The question's type size. On the typed branch it comes down, because the
    /// bottom half of the screen is a fixed-height keypad and the stem is the only
    /// element that can give.
    private var questionSize: CGFloat {
        let base = !g.typed ? type.question
            : (m.isWide ? type.question * 0.90
                        : type.question * (m.isShort ? 0.78 : 0.84))
        let width = (hasFigure && !g.stackFigure && m.isWide)
            ? g.stemWidth - g.figureW - 20 : g.stemWidth
        return Self.fittedQuestionSize(q?.stemText ?? "", base: base,
                                       width: width, lines: g.stemLineBudget)
    }

    /// **The largest size at which this stem fits its line budget.**
    ///
    /// Not a taste knob and not a `minimumScaleFactor`: it is arithmetic over the
    /// stem's own length, so the gate can compute the same number the body draws
    /// and a stem that would run the keypad off the bottom of the glass comes down
    /// a point at a time instead (Quest Refutation K1). The character advance is
    /// Baloo 2's, measured conservatively at 0.52 em - over-estimating the width
    /// shrinks the type slightly early, which is the safe direction.
    ///
    /// The floor is 62% of the base. Below that the stem is not readable and the
    /// right answer is a shorter stem, so a topic that hits the floor and still
    /// overflows fails the matrix gate rather than shrinking to nothing.
    nonisolated static func fittedQuestionSize(_ stem: String, base: CGFloat,
                                               width: CGFloat, lines budget: Int) -> CGFloat {
        guard budget != .max, budget > 0, width > 40, !stem.isEmpty else { return base }
        let floorSize = (base * 0.62).rounded()
        var size = base
        while size > floorSize {
            let perLine = max(1, (width / (size * 0.52)).rounded(.down))
            let needed = Int((CGFloat(stem.count) / perLine).rounded(.up))
            if needed <= budget { break }
            size -= 1
        }
        return max(size, floorSize)
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
        .coordinateSpace(name: QHitMap.space)
    }

    /// **One Button, one recorded hit target, one closure.**
    ///
    /// The action passed here is the action the `Button` fires AND the action the
    /// hit map holds - the same closure value, not a re-derivation - so a driver
    /// that hit-tests the drawn bounds and fires it has taken the child's path.
    /// See `QHitMap` for why K1 made this necessary.
    private func hitButton<L: View>(
        _ name: String, enabled: Bool = true,
        action: @escaping @MainActor @Sendable () async -> Void,
        @ViewBuilder label: () -> L) -> some View {
        Button { Task { await action() } } label: { label() }
            .buttonStyle(.plain)
            .disabled(!enabled)
            .qHit(hitMap, name, enabled: enabled, fire: action)
    }

    /// The hit-map names the driver taps by. Hoisted so the driver never spells
    /// one out and a renamed target is a compile error rather than a silent miss.
    public enum Hit {
        public static let pause = "pause"
        public static func answer(_ i: Int) -> String { "answer-\(i)" }
        public static func key(_ k: QTypedEntry.Key) -> String {
            "key-\(QKeypad.glyph(k))"
        }
        public static func chip(_ unit: String) -> String { "chip-\(unit)" }
        public static let undo = "undo"
        public static let check = "check"
        public static let next = "next"
    }

    // MARK: Wide

    private var wide: some View {
        VStack(spacing: g.typed ? 8 : 12) {
            topRail
            ZStack(alignment: .bottom) {
                sign.frame(width: g.signW).padding(.bottom, g.typed ? 12 : 84)
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
        hitButton(Hit.pause, action: { [model] in await model.toMap() }) {
            MQKnob(p, .pause, size: g.knob)
        }
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
        MQSign(p, postHeight: g.typed ? 26 : 46,
               padH: max(36, MQBoard.frameInset + 1),
               padV: max(16, MQBoard.frameInset + 1)) {
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
            QFigureView(p, f, fallbackText: q?.extraText ?? "",
                        typeFloor: m.isRegular ? QFigureView.iPadTypeFloor
                                               : QFigureView.phoneTypeFloor)
                .frame(width: g.figureW, height: g.figureH)
        }
    }

    private var questionText: some View {
        MQQuestionText(p, q?.stemText ?? "", size: questionSize,
                       alignment: m.isWide ? .leading : .center)
            .frame(maxWidth: .infinity, alignment: m.isWide ? .leading : .center)
    }

    // MARK: Tall

    /// **The cast steps out when the picture needs the room.**
    ///
    /// `Geo.showCast` is computed without the question, because geometry is; this
    /// is the one thing that depends on it. On a PHONE a chart or a table is the
    /// question - the child reads values off it - and a 375 pt frame cannot carry
    /// the rail, a figure big enough to have legible labels (K5), four answer
    /// tiles and two creatures. Same trade the typed branch makes, same reason.
    private var castVisible: Bool {
        g.showCast && !(hasFigure && !m.isWide && !m.isRegular)
    }

    private var tall: some View {
        let tight = g.typed
        return VStack(spacing: tight ? (m.isShort ? 4 : 6)
                                     : (m.isRegular ? 12 : (m.isShort ? 5 : 8))) {
            compactRail
            if !castVisible { compactGauges }
            MQSign(p, postHeight: tight ? (m.isRegular ? 16 : 10)
                                        : (m.isRegular ? 26 : (m.isShort ? 12 : 18)),
                   padH: max(m.isRegular ? 30 : 20, MQBoard.frameInset + 1),
                   // **The wooden frame is 15 pt wide and the parchment starts
                   // inside it**, so content padded by 6 is content drawn ON the
                   // frame - which is where the pie's caption was landing (Quest
                   // Refutation K5). `MQBoard.frameInset` is the number, so this
                   // moves with the frame if the design lane ever changes it.
                   padV: max(tight ? (m.isRegular ? 9 : 6)
                                   : (m.isRegular ? 12 : (m.isShort ? 6 : 9)),
                             MQBoard.frameInset + 1)) {
                VStack(spacing: m.isRegular ? 10 : (m.isShort ? 4 : 6)) {
                    questionText
                    if hasFigure { figure }
                }
            }
            Spacer(minLength: 0)
            if castVisible { facingBand }
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
        hitButton(Hit.answer(i), action: { [model] in await model.choose(i) }) {
            MQAnswerTile(p, text, tilt: MQAnswerTile.tilts[i % 4], fontSize: type.tile)
                .frame(height: g.tileH)
        }
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
        VStack(alignment: .leading, spacing: m.isShort ? 5 : (m.isWide ? 10 : 7)) {
            // The prompt is a WIDE-frame element. On a tall frame the keypad is
            // already directly under the slot with the nib blinking in it, and the
            // line costs 26 pt of the height the keys need (K1).
            if m.isWide {
                Text(QStrings.typeYourAnswer)
                    .font(.mq(m.isRegular ? 18 : 14, .bold))
                    .foregroundStyle(p.carved.opacity(0.9))
                    .shadow(color: p.woodDeep.opacity(0.7), radius: 0, x: 0, y: 1.5)
            }
            MQTag(p) {
                QAnswerSlot(p, entry: model.entry, fontSize: g.slotFont,
                            active: model.phase == .asking)
                    .frame(width: m.isWide ? 280 : min(300, g.contentW - 40))
                    .padding(.horizontal, 6)
                    .padding(.vertical, 4)
            }
            if !model.chips.isEmpty {
                QUnitChipRow(p, chips: model.chips, selected: model.entry.unit,
                             compact: !m.isRegular, hitMap: hitMap) { [model] chip in
                    model.toggleChip(chip)
                }
            }
        }
    }

    private var keypad: some View {
        QKeypad(p, entry: model.entry, policy: model.keypadPolicy, geometry: g.keypad,
                hitMap: hitMap,
                press: { [model] k in model.press(k) },
                submit: { [model] in await model.submitTyped() })
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
            hitButton(Hit.next, action: { [model] in await model.advance() }) {
                MQPlankButton(p, nextLabel, primary: true,
                              fontSize: m.isRegular ? 20 : 16)
            }
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
