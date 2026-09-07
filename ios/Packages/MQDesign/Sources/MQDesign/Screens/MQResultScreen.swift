import SwiftUI

/// End of a set.
///
/// Three rules shaped this screen and all three are laws rather than taste:
///
///  * **Nothing here asks for the child to come back.** No "see you tomorrow",
///    no day counter, no "your streak ends in 4 hours". The fade-out law says
///    the best day is the day they do not need this app, and a results screen is
///    exactly where retention machinery normally gets installed.
///  * **Nothing here shames a mistake.** There is no red cross, no "you got 3
///    wrong", no tombstone. The wrong ones are simply the ones worth another
///    look, they come with their figure and the generator's own one-line
///    explanation, and the monster is sitting on the sand next to the hero
///    rather than lying defeated.
///  * **The review is the point.** It gets the biggest object on screen -- the
///    scroll -- and the score gets four small carved numbers, not a trophy.
public struct MQResultScreen: View, MQTapAudited {
    let scene: MQResultScene
    let m: MQMetrics
    let p: MQPalette

    public init(scene: MQResultScene = .sample, metrics: MQMetrics,
                palette: MQPalette = .noon) {
        self.scene = scene; self.m = metrics; self.p = palette
    }

    private var compact: Bool { !m.isRegular }
    private var type: MQType { m.type }
    private var pad: CGFloat { m.isRegular ? 30 : 16 }

    /// The review scroll is the biggest object on the screen and the reason a
    /// result screen exists, so on a short frame the CAST shrinks and the
    /// scroll does not. Referenced to the authored heights (834 landscape /
    /// 852 portrait), floored so the two of them never become stickers.
    nonisolated static func castHeight(_ m: MQMetrics) -> CGFloat {
        let reference: CGFloat = m.isWide ? 834 : (m.isRegular ? 1194 : 852)
        let k = min(max(m.size.height / reference, 0.70), 1.10)
        return (m.isWide ? 150 : (m.isRegular ? 150 : 96)) * k
    }

    /// How many review rows the frame can carry. The landscape column can hold
    /// all three; a phone holds two; a 667 pt SE holds one, and one row a child
    /// can actually read beats three rows clipped off the bottom.
    nonisolated static func reviewRows(_ m: MQMetrics) -> Int {
        if m.isWide { return 3 }
        return m.size.height >= 800 ? 2 : 1
    }

    nonisolated static func buttonSize(_ m: MQMetrics, primary: Bool) -> CGFloat {
        let f: CGFloat = primary ? (m.isRegular ? 24 : 18) : (m.isRegular ? 20 : 15)
        return max(MQTap.min, f * 1.32 + (primary ? 30 : 24))
    }

    /// `MQPlankButton` carries its own `.frame(minHeight: MQTap.min)`, so these
    /// can never go under the floor by accident -- they are audited anyway so
    /// that removing that floor shows up as a red gate rather than as nothing.
    nonisolated public static func tapTargets(_ m: MQMetrics) -> [MQTapTarget] {
        [MQTapTarget("play again",
                     CGSize(width: MQTap.min, height: buttonSize(m, primary: true)))]
        + MQResultScene.sample.secondaryActions.map {
            MQTapTarget($0, CGSize(width: MQTap.min, height: buttonSize(m, primary: false)))
        }
    }

    public var body: some View {
        ZStack {
            MQWorld(p, horizon: m.isWide ? 0.34 : 0.26)
            (m.isWide ? AnyView(wide) : AnyView(tall))
                .padding(.horizontal, pad)
                .padding(.top, m.insets.top + pad * 0.6)
                .padding(.bottom, m.insets.bottom + pad * 0.6)
        }
    }

    // MARK: Wide

    private var wide: some View {
        VStack(spacing: 16) {
            titleBlock
            HStack(alignment: .top, spacing: 26) {
                VStack(spacing: 16) {
                    statGrid
                    Spacer(minLength: 0)
                    // Pushed to the bottom of the column so the two of them are
                    // standing on the dry sand rather than paddling.
                    cast(height: Self.castHeight(m))
                }
                .frame(width: min(320, m.size.width * 0.30))
                MQScroll(p, padH: 26, padV: 14) {
                    reviewList(rows: Array(scene.reviews.prefix(Self.reviewRows(m))),
                               figureWidth: 108, figureHeight: 70)
                }
            }
            .frame(maxHeight: .infinity)
            buttonRow
        }
    }

    // MARK: Tall

    private var tall: some View {
        VStack(spacing: 10) {
            titleBlock
            statGrid
            MQScroll(p, padH: m.isRegular ? 26 : 16, padV: m.isRegular ? 14 : 12) {
                reviewList(rows: Array(scene.reviews.prefix(Self.reviewRows(m))),
                           figureWidth: m.isRegular ? 108 : 86,
                           figureHeight: m.isRegular ? 70 : 62)
            }
            Spacer(minLength: 0)
            cast(height: Self.castHeight(m))
            buttonRow
        }
    }

    // MARK: Parts

    private var titleBlock: some View {
        VStack(spacing: compact ? 0 : 2) {
            Text(scene.title)
                .font(.mq(compact ? 32 : 46, .extrabold))
                .foregroundStyle(p.gold)
                .shadow(color: p.woodDeep.opacity(0.9), radius: 0, x: 0, y: 3)
            // On a plank. The subtitle was cream straight onto the world, which
            // measures 1.05:1 on `parchment`, 1.30:1 on `sandFar` and 2.11:1 on
            // `skyHigh` - the dress rehearsal's parent's-eye item 9, "white
            // captions on pale sand". A drop shadow does not enter a contrast
            // ratio, and it was the only thing making this line visible at all.
            MQRail(p, padH: compact ? 12 : 18, padV: compact ? 3 : 5) {
                Text(scene.message)
                    .font(.mq(compact ? 14 : 20, .medium))
                    .foregroundStyle(p.captionOnDark)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    /// Four numbers on one tag. Separate cards would have been four rounded
    /// rects with four shadows, which is the SaaS-kit reflex this whole system
    /// exists to avoid.
    private var statGrid: some View {
        MQTag(p) {
            Group {
                if compact {
                    HStack(spacing: 0) { ForEach(scene.stats) { stat($0) } }
                } else {
                    // Two by two on the iPad. Four across a 320pt column put
                    // "12 / 15" hard against "80%" with the captions running
                    // into each other.
                    VStack(spacing: 10) {
                        ForEach(0..<2, id: \.self) { row in
                            HStack(spacing: 0) {
                                ForEach(0..<2, id: \.self) { col in
                                    stat(scene.stats[row * 2 + col])
                                }
                            }
                        }
                    }
                }
            }
            .padding(.horizontal, compact ? 8 : 14)
            .padding(.vertical, compact ? 8 : 14)
        }
    }

    private func stat(_ s: MQStat) -> some View {
        VStack(spacing: -2) {
            Text(s.value)
                .font(.mq(compact ? 22 : 32, .extrabold))
                .monospacedDigit()
                .foregroundStyle(p.underLight(Color(hex: 0x4A2C12)))
                .lineLimit(1)
                .minimumScaleFactor(0.6)
            Text(s.caption)
                .font(.mq(compact ? 11 : 15, .medium))
                // Was `underLight(0x8A6A45)`, which measures 2.81:1 on the tag at
                // noon and 1.67:1 at dusk. `captionOnLight` is the lightest brown
                // that clears 4.5:1 on every pale ground in the system.
                .foregroundStyle(p.captionOnLight)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
        .frame(maxWidth: .infinity)
    }

    private func reviewList(rows: [MQReviewItem],
                            figureWidth: CGFloat, figureHeight: CGFloat) -> some View {
        VStack(alignment: .leading, spacing: compact ? 8 : 12) {
            Text(scene.reviewHeading)
                .font(.mq(compact ? 16 : 22, .bold))
                .foregroundStyle(p.inkSoft)
            ForEach(Array(rows.enumerated()), id: \.element.id) { i, item in
                if i > 0 {
                    // A hand-drawn rule, not a hairline divider.
                    Canvas { ctx, size in
                        ctx.stroke(Path.smoothOpen([
                            CGPoint(x: 0, y: size.height / 2),
                            CGPoint(x: size.width * 0.5, y: size.height / 2 - 1.5),
                            CGPoint(x: size.width, y: size.height / 2 + 1)
                        ]), with: .color(p.ink.opacity(0.18)),
                                   style: StrokeStyle(lineWidth: 2, lineCap: .round))
                    }
                    .frame(height: 4)
                }
                HStack(alignment: .top, spacing: compact ? 10 : 16) {
                    if item.figure != .none {
                        MQFigureView(p, item.figure)
                            .frame(width: figureWidth, height: figureHeight)
                    }
                    VStack(alignment: .leading, spacing: 1) {
                        // Same typesetting rule as the battle board: the review
                        // is where a child re-reads the question they got
                        // wrong, so "14 cm" holding together matters MORE here,
                        // not less.
                        MQQuestionText(p, item.question, size: compact ? 13 : 17)
                        Text(MQTypeset.bindUnits(item.answer))
                            .font(.mq(compact ? 15 : 20, .extrabold))
                            .monospacedDigit()
                            .foregroundStyle(p.leafDeep)
                        Text(item.explanation)
                            .font(.mq(compact ? 12 : 16, .regular))
                            .foregroundStyle(p.inkSoft)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    Spacer(minLength: 0)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    /// The two of them on the sand afterwards. The crab is not defeated, it is
    /// just sitting there -- which is the kid-safety rule drawn instead of
    /// written down.
    private func cast(height: CGFloat) -> some View {
        HStack(alignment: .bottom, spacing: compact ? 10 : 20) {
            MQCreature(scene.heroCast, p)
                .frame(width: height * MQCreature.box(scene.heroCast).width
                              / MQCreature.box(scene.heroCast).height, height: height)
            MQCreature(scene.monsterCast, p)
                .frame(width: height * MQCrab.box.width / MQCrab.box.height * 0.92,
                       height: height * 0.92)
        }
    }

    private var buttonRow: some View {
        HStack(spacing: compact ? 8 : 16) {
            MQPlankButton(p, scene.primaryAction, primary: true,
                          fontSize: m.isRegular ? 24 : 18)
            ForEach(scene.secondaryActions, id: \.self) { a in
                MQPlankButton(p, a, fontSize: m.isRegular ? 20 : 15)
            }
        }
    }
}
