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
///
/// **The typed item is drawn here, not filtered out of the feed.**
///
/// The Phase 1 dress rehearsal measured a real 150-item Patchwerk run: 50 items
/// arrived TYPED into a screen whose only input was `answer(choice:)`, so a child
/// met four blank planks one item in three, scored wrong on every one of them,
/// ate a 1.5 s stun each time and reset the stack multiplier each time - best
/// stacks 4 against a cap of 10, which is the stack mechanic (the mode itself)
/// unable to function. A further 35 items carried a figure and none was drawn.
///
/// This mirrors the web's arrangement rather than re-deciding it:
/// `js/modes/patchwerk.js` renders no question at all - it calls
/// `ctx.nextQuestion()` - and `js/app.js`'s `nextQuestion()` is the ONE question
/// surface in the whole app: `Q.typed` gets the typed input, everything else gets
/// choice buttons, and `figHtml(Q)` draws `q.figure` for every mode alike.
///
/// **Filtering the feed to choice items was the rejected alternative.** The web
/// does not filter; the feed's rotation over every live class-level topic is the
/// mode's entire variety mechanism (measured repeat rate 0.021 against the main
/// mode's 0.376); and a filter would narrow the pool a child sees without saying
/// so anywhere on the glass or in the record.
public struct MQPatchwerkScreen: View, MQTapAudited {
    let scene: MQPatchwerkScene
    let m: MQMetrics
    /// A key on the typed keypad. No-op in the storybook and in the matrix gate,
    /// which render the screen as a picture.
    var onKey: @MainActor @Sendable (MQTypedEntry.Key) -> Void = { _ in }
    var onChip: @MainActor @Sendable (String) -> Void = { _ in }
    var onSubmit: @MainActor @Sendable () async -> Void = {}

    public init(scene: MQPatchwerkScene = .sample, metrics: MQMetrics) {
        self.scene = scene; self.m = metrics
    }

    /// The live arena: the same picture, with the typed surface wired.
    ///
    /// The four choice tiles stay DRAWN-only and keep their transparent overlay in
    /// `PatchwerkRunView` - that overlay is gated on the pixels at twelve sizes and
    /// is not disturbed here. The keypad, the chips and `Check` carry their own
    /// buttons because there are seventeen of them and an overlay would have to
    /// re-derive seventeen rects.
    public init(scene: MQPatchwerkScene, metrics: MQMetrics,
                onKey: @escaping @MainActor @Sendable (MQTypedEntry.Key) -> Void,
                onChip: @escaping @MainActor @Sendable (String) -> Void,
                onSubmit: @escaping @MainActor @Sendable () async -> Void) {
        self.scene = scene; self.m = metrics
        self.onKey = onKey; self.onChip = onChip; self.onSubmit = onSubmit
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

    /// **The arena's keypad, which is smaller than the Quest board's on a short
    /// frame, and that is a measurement rather than a preference.**
    ///
    /// The Quest battle carries a name tag, a crystal rope and a signboard above
    /// its keypad. This screen carries a TWO-ROW HUD rail (hourglass, damage,
    /// stack spar, freeze pips) and a boss gauge as well, and it may not drop
    /// either - the clock and the stacks are the mode. With `MQKeypad.geometry`
    /// unchanged, the typed arena measured **816 pt on a 667 pt iPhone SE**, and
    /// what went off the bottom was `Check`.
    ///
    /// 46 x 44 is Apple's floor exactly, not under it, and `tapTargets` audits
    /// the same number this draws from.
    nonisolated public static func keypadGeometry(_ m: MQMetrics) -> MQKeypad.Geo {
        var g = MQKeypad.geometry(m)
        if !m.isRegular {
            g.key = CGSize(width: 46, height: MQTap.min)
            g.gap = 5
            g.actionWidth = 96
            g.glyph = 21
            return g
        }
        // The SHORT iPads - the 9.7" and the mini in landscape, 768 and 744 pt of
        // height - carry the same rail and gauge in a third less room. The full
        // 68 x 58 pad wants 262 pt of that and the mini landscape came out 17 pt
        // over on a long stem. 60 x 50 costs 224 and is still 6 pt clear of
        // Apple's floor on the short side.
        if m.isWide && m.size.height <= 768 {
            g.key = CGSize(width: 60, height: 50)
            g.gap = 8
            g.actionWidth = 132
            g.glyph = 26
        }
        return g
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
        tapTargets(m, typed: false)
    }

    /// What a child may hit, which now depends on the ITEM and not only on the
    /// device: a typed item has no answer planks and seventeen other controls.
    ///
    /// `MQTapAudited` takes a size and nothing else, so the choice case keeps the
    /// protocol's signature and this is the one a caller with a scene in hand asks.
    nonisolated public static func tapTargets(_ m: MQMetrics, typed: Bool) -> [MQTapTarget] {
        let knob = [MQTapTarget("pause", square: knobSize(m))]
        guard typed else {
            let t = tileSize(m)
            return knob + (0..<4).map { MQTapTarget("answer \($0 + 1)", t) }
        }
        let g = keypadGeometry(m)
        let chip = MQUnitChipRow.chipSize(compact: !m.isRegular)
        return knob
            + (0...9).map { MQTapTarget("key \($0)", g.key) }
            + [MQTapTarget("undo", CGSize(width: g.actionWidth, height: g.key.height)),
               // `Check` is the action column's remaining height: three key rows
               // and the two gaps between them.
               MQTapTarget("check", CGSize(width: g.actionWidth,
                                           height: g.key.height * 3 + g.gap * 2))]
            + (0..<3).map { MQTapTarget("chip \($0 + 1)", chip) }
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
                    sign.frame(maxWidth: signWidth)
                    if let flash = scene.flash { banner(flash, size: 20) }
                }
                .frame(maxWidth: .infinity)
                MQCrab(p, lit: scene.enraged)
                    .frame(width: Self.crabWidth(m) * (scene.isTyped ? 0.62 : 1),
                           height: Self.crabWidth(m) * (scene.isTyped ? 0.62 : 1)
                               * MQCrab.box.height / MQCrab.box.width)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            // The dummy is scenery and yields height first; the keypad is the
            // child's only way to answer and yields nothing.
            if scene.isTyped { typedRowWide } else { answerRow }
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
            // On a typed item the keypad wants 191-262 pt of the bottom of the
            // frame, and in THIS layout the dummy is a stacked element that pays
            // for its full height. The screen's own first law for it applies: it
            // is scenery, so it is the first thing to yield. Measured: with the
            // crab in, the typed arena wants 1,142 pt of a 1,024 pt iPad 9.7
            // portrait on a long stem, and `Check` is what goes off the bottom.
            //
            // It stays in the WIDE layout, where it stands beside the board and
            // costs the band's height rather than adding to it.
            if !scene.isTyped {
                MQCrab(p, lit: scene.enraged)
                    .frame(width: Self.crabWidth(m),
                           height: Self.crabWidth(m) * MQCrab.box.height / MQCrab.box.width)
            }
            Spacer(minLength: 0)
            if scene.isTyped { typedColumn } else { answerGrid }
        }
    }

    // MARK: Parts

    private var freezeBlock: some View {
        VStack(spacing: 1) {
            MQFreezePips(p, held: scene.freezeHeld, total: scene.freezeTotal,
                         size: compact ? 22 : 30)
            Text("freeze")
                .font(.mq(compact ? 11 : 14, .bold))
                // Full strength, not 82%: cream at 0.82 over `woodDark` measures
                // 4.19:1 and the same cream at full opacity measures 5.34:1. The
                // 18% was the whole difference between passing WCAG AA and not.
                .foregroundStyle(p.captionOnDark)
                .shadow(color: p.woodDeep.opacity(0.7), radius: 0, x: 0, y: 1.5)
        }
    }

    /// The dummy's bar, and the one place the tier and class level are stated.
    private var bossLine: some View {
        HStack(spacing: 12) {
            // On a plank, not on the open world. Cream on the noon sky measures
            // 1.22:1 (skyLow) to 2.95:1 (seaMid) - this line only ever LOOKED
            // legible because every shot of it in the rehearsal was taken during
            // the enrage, where the sky is nearly black and it measures 14.6:1.
            // MQRail's own doc comment is the doctrine: a dark plank fixes a
            // cream readout at both times of day with one object rather than two
            // colour sets.
            MQRail(p, padH: 10, padV: 2) {
                Text("\(scene.tierName) - \(scene.level)")
                    .font(.mq(compact ? 13 : 17, .bold))
                    .foregroundStyle(p.captionOnDark)
                    .fixedSize()
            }
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
                MQQuestionText(p, scene.question, size: questionSize,
                               alignment: m.isWide ? .leading : .center)
                    // No `maxWidth: .infinity` in the wide case: a Patchwerk
                    // question can be four words, and a sheet stretched to the
                    // cap around "What is 3.6 x 100?" is the mass problem in
                    // miniature. The board takes the width the words need, up
                    // to the cap.
                    .frame(maxWidth: m.isWide ? nil : .infinity,
                           alignment: m.isWide ? .leading : .center)
                if let spec = scene.spec {
                    // `MQFigures`, the same seven-spec renderer the Quest battle
                    // board and the review row use - it was `MQQuest.QFigureView`
                    // until the rehearsal fix pass. This slot used to take the
                    // three-case `MQFigure` projection, and the mode fed it
                    // `.none` unconditionally: 35 figure-bearing items in the
                    // measured 150-item run, 0 drawn. The projection would have
                    // dropped 29 of those 35 even had the mode filled it in.
                    MQFigures(p, spec, fallbackText: scene.figureFallback,
                              typeFloor: m.isRegular ? MQFigures.iPadTypeFloor
                                                     : MQFigures.phoneTypeFloor)
                        // The typed layouts give the diagram some of its box back
                        // to the keypad, which is the only element on this screen
                        // that stops WORKING when it is squeezed. A figure is
                        // still drawn - the rehearsal's finding was zero of 35.
                        .frame(width: typedCompact ? 118 : (scene.isTyped ? 150
                                                            : (compact ? 170 : 190)),
                               height: typedCompact ? 62 : (scene.isTyped ? 92
                                                            : (compact ? 80 : 126)))
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

    // MARK: The typed surface
    //
    // The same three objects the Quest battle uses - `MQAnswerSlot`,
    // `MQUnitChipRow`, `MQKeypad` - which is the point: they were promoted out of
    // `MQQuest` on this pass precisely so a second mode could reach them, and
    // there is one submission-string builder (`MQTypedEntry.submission`) behind
    // both. Duplicating that for Patchwerk would have been two graders.

    /// The slot AND the chips on one tag.
    ///
    /// One plate rather than two objects, and the reason is contrast rather than
    /// taste: the chip row's own words ("Unit", "or leave it blank") are set in
    /// `inkSoft`, which is authored for the Quest signboard's parchment. Loose on
    /// this screen they land on open sand and measure 2.91:1. On a tag, in
    /// `captionOnLight`, they measure 4.60:1 at the worst ground in the system.
    private var slotAndChips: some View {
        MQTag(p) {
            VStack(alignment: .leading, spacing: 6) {
                MQAnswerSlot(p, entry: scene.typed ?? MQTypedEntry(),
                             fontSize: m.isRegular ? 32 : (m.isShort ? 21 : 24))
                    .frame(width: m.isWide ? 260 : min(300, m.size.width - pad * 2 - 48))
                if !scene.chips.isEmpty {
                    MQUnitChipRow(p, chips: scene.chips, selected: scene.typed?.unit,
                                  compact: !m.isRegular,
                                  promptTint: p.captionOnLight,
                                  hit: nil, tap: onChip)
                }
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 6)
        }
    }

    private var keypad: some View {
        MQKeypad(p, entry: scene.typed ?? MQTypedEntry(), policy: scene.keypad,
                 geometry: Self.keypadGeometry(m),
                 hit: nil, press: onKey, submit: onSubmit)
    }

    /// A typed item on a compact frame is the tightest thing this screen draws:
    /// the keypad alone is 191 pt of the 667 an iPhone SE has. The question and
    /// the diagram give way first, because the child can still read both - the
    /// keypad is the only thing that stops being usable when it is squeezed.
    private var typedCompact: Bool { scene.isTyped && !m.isRegular }

    // MARK: The stem, sized to its own length
    //
    // MEASURED, 2026-09-07. `MQQuestionText` deliberately has no
    // `minimumScaleFactor` - its own doc comment says a question that does not
    // fit means the composition is wrong and the build should go red. So the
    // SCREEN has to hand it a size that fits, which is what `QBattleView` does
    // too. Without this the arena wants **924 pt of a 768 pt iPad 9.7 landscape**
    // on the engine's longest stem with four choice planks under it, and 1,096 pt
    // with a keypad under it: the whole answer surface off the bottom of the
    // glass, silently, because nothing in this app scrolls.
    //
    // The arithmetic is `QBattleView.fittedQuestionSize`'s, character for
    // character, and it is duplicated rather than shared because a mode may not
    // depend on a mode. Its honest home is `MQQuestionText` beside the rule it
    // enforces; moving it there means editing a file both modes' gates pin, which
    // is a change for whoever owns them, not for this pass.

    /// The signboard's cap in the wide layout, which the body also draws from.
    private var signWidth: CGFloat { min(600, m.size.width * 0.52) }

    /// The width the stem actually gets: the board minus its own padding, minus
    /// the figure when one sits beside it.
    private var stemWidth: CGFloat {
        let signPad: CGFloat = m.isRegular ? 72 : 44
        let figure: CGFloat = scene.spec == nil ? 0
            : (typedCompact ? 118 : (scene.isTyped ? 150 : (compact ? 170 : 190))) + 20
        let board = m.isWide ? signWidth : m.size.width - pad * 2
        return max(80, board - signPad - figure)
    }

    /// How many lines of stem the band above the answers can carry. Four on a
    /// wide frame and on a short one; five where there is room.
    private var stemLines: Int { (m.isWide || m.isShort) ? 4 : 5 }

    private var questionSize: CGFloat {
        Self.fittedQuestionSize(scene.question,
                                base: typedCompact ? 15 : type.question,
                                width: stemWidth, lines: stemLines)
    }

    /// **The largest size at which this stem fits its line budget.**
    ///
    /// Arithmetic over the stem's own length, so a gate can compute the number
    /// the body draws. The advance is Baloo 2's, measured conservatively at
    /// 0.52 em - over-estimating shrinks the type slightly early, which is the
    /// safe direction. The floor is 62% of the base: below that the stem is not
    /// readable, and a stem that hits the floor and still overflows must fail the
    /// matrix gate rather than shrink to nothing.
    nonisolated public static func fittedQuestionSize(_ stem: String, base: CGFloat,
                                                      width: CGFloat, lines budget: Int) -> CGFloat {
        guard budget > 0, width > 40, !stem.isEmpty else { return base }
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

    private var typedRowWide: some View {
        HStack(alignment: .bottom, spacing: 22) {
            slotAndChips
            Spacer(minLength: 8)
            keypad
        }
    }

    private var typedColumn: some View {
        VStack(spacing: m.isShort ? 6 : 9) {
            slotAndChips
            keypad
        }
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
