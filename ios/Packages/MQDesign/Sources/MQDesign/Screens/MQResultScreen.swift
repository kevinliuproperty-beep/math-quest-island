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
public struct MQResultScreen: View {
    let scene: MQResultScene
    let layout: MQLayout
    let insets: MQInsets
    let p: MQPalette

    public init(scene: MQResultScene = .sample, layout: MQLayout,
                insets: MQInsets = .none, palette: MQPalette = .noon) {
        self.scene = scene; self.layout = layout
        self.insets = insets; self.p = palette
    }

    private var compact: Bool { layout == .tall }
    private var type: MQType { compact ? .compact : .regular }
    private var pad: CGFloat { compact ? 16 : 30 }

    public var body: some View {
        ZStack {
            MQWorld(p, horizon: compact ? 0.26 : 0.34)
            (compact ? AnyView(tall) : AnyView(wide))
                .padding(.horizontal, pad)
                .padding(.top, insets.top + pad * 0.6)
                .padding(.bottom, insets.bottom + pad * 0.6)
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
                    cast(height: 150)
                }
                .frame(width: 320)
                MQScroll(p, padH: 26, padV: 14) {
                    reviewList(rows: scene.reviews, figureWidth: 108, figureHeight: 70)
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
            MQScroll(p, padH: 16, padV: 12) {
                reviewList(rows: Array(scene.reviews.prefix(2)),
                           figureWidth: 86, figureHeight: 62)
            }
            Spacer(minLength: 0)
            cast(height: 96)
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
            Text(scene.message)
                .font(.mq(compact ? 14 : 20, .medium))
                .foregroundStyle(p.carved)
                .shadow(color: p.woodDeep.opacity(0.75), radius: 0, x: 0, y: 2)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
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
                .foregroundStyle(p.underLight(Color(hex: 0x8A6A45)))
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
                        Text(item.question)
                            .font(.mq(compact ? 13 : 17, .semibold))
                            .foregroundStyle(p.ink)
                            .fixedSize(horizontal: false, vertical: true)
                        Text(item.answer)
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
                          fontSize: compact ? 18 : 24)
            ForEach(scene.secondaryActions, id: \.self) { a in
                MQPlankButton(p, a, fontSize: compact ? 15 : 20)
            }
        }
    }
}
