import SwiftUI
import MQContent
import MQDesign

/// End of a set.
///
/// `MQResultScreen`'s three laws hold here unchanged - nothing asks the child to
/// come back, nothing shames a mistake, the review is the point and gets the
/// biggest object on screen - and this adds two things that screen could not:
///
///  * **the review rows draw the REAL figure**, through `QFigureView`, so a pie
///    chart the child got wrong comes back as a pie chart rather than as nothing
///    (`MQReviewItem.figure` can only carry a rectangle or a fraction bar);
///  * **a wrong-unit row leads with the unit lesson**, above the answer and the
///    working, because a child whose number was right made one specific mistake
///    and "the answer is 360 cm²" on its own teaches them they got the sum wrong.
public struct QResultView: View, MQTapAudited {
    @ObservedObject var model: QQuestModel
    let m: MQMetrics
    let p: MQPalette

    public init(model: QQuestModel, metrics: MQMetrics, palette: MQPalette = .noon) {
        self.model = model; self.m = metrics; self.p = palette
    }

    private var compact: Bool { !m.isRegular }
    private var pad: CGFloat { m.isRegular ? 30 : 16 }
    private var summary: QSummary? { model.summary }

    nonisolated static func castHeight(_ m: MQMetrics) -> CGFloat {
        let reference: CGFloat = m.isWide ? 834 : (m.isRegular ? 1194 : 852)
        let k = min(max(m.size.height / reference, 0.70), 1.10)
        return (m.isWide ? 150 : (m.isRegular ? 150 : 96)) * k
    }

    /// **The review scroll is the ONE surface in this app that scrolls, and the
    /// deviation is deliberate.**
    ///
    /// `MQFit`'s own header says "Nothing in this app scrolls. A battle screen
    /// that scrolls is a worksheet." That law is about the BATTLE, and it holds:
    /// nothing on `QBattleView` scrolls. The result review is the one surface
    /// whose content length is not bounded by the design - up to twelve wrong
    /// items, each a three-line P4 word problem plus a two-line unit lesson plus
    /// the generator's working - and `MQResultScreen`'s answer to that (show the
    /// first three, drop the rest) was measured on this branch and does not fit:
    /// three real rows ran the title off the top of a 9.7" iPad and the buttons
    /// off the bottom.
    ///
    /// The three options were: clip the working (teaches half a method), show one
    /// row (the review IS the result screen, per that screen's own third law), or
    /// bound the scroll's HEIGHT and let the content move inside it. The third
    /// keeps every wrong answer complete and keeps the frame deterministic, which
    /// is what `reviewHeight` is: the height is a function of the device, hoisted
    /// here per PHASE1's rule, so the fit gate measures a fixed number rather
    /// than however much content this run happened to produce.
    ///
    /// **Worth Kevin's eye**, because it is a departure from a design-lane note.
    nonisolated static func reviewHeight(_ m: MQMetrics) -> CGFloat {
        // A SHARE of the frame, not a chrome subtraction. The subtraction was
        // tried first and was wrong at every size by a different amount (22 pt
        // landscape, 108 pt portrait, 24 pt on the SE), because it has to
        // predict the height of a title block whose message wraps, a stat tag
        // whose layout differs by device class, and a cast whose scale is itself
        // a function of the height. A share is one number, is right by
        // construction, and is what the gate measures.
        let usable = m.size.height - m.insets.top - m.insets.bottom
        let share: CGFloat = m.isWide ? 0.65 : (m.isRegular ? 0.43 : 0.45)
        return max(usable * share, 120)
    }

    /// How many review rows the bounded scroll can hold.
    ///
    /// **`MQResultScreen` says 3 on a landscape iPad, and 3 does not fit.** Its
    /// sample rows are one-line questions with one-line explanations; a real P4
    /// item is a three-line word problem and a wrong-unit one adds the two-line
    /// teaching sentence on top. Measured against real drawn content at this
    /// commit, 2 fits a 9.7" in either orientation and 1 fits the SE.
    /// **Two on a landscape iPad, ONE anywhere taller than it is wide.**
    ///
    /// Not a preference - measured. A 768x1024 iPad portrait holds the title
    /// block, the four-number stat tag, the cast and the button row above and
    /// below the plank, and what is left cannot carry two real P4 rows: two rows
    /// want 424 pt and the largest plank the rest of the screen can spare is 412.
    /// Pushed to 2 anyway, the screen overflows by 64 pt.
    ///
    /// The consequence is visible and is an open item rather than a fix: the
    /// portrait result screen has half a plank of empty parchment under its one
    /// row, which inverts that screen's own third law ("the review is the point
    /// and gets the biggest object"). The fix is compositional - the stat tag and
    /// the cast are what is eating the height - and it belongs to whoever next
    /// opens `MQResultScreen`.
    nonisolated static func reviewRows(_ m: MQMetrics) -> Int { m.isWide ? 2 : 1 }

    /// Line caps for ONE row, so a single pathological explanation cannot push
    /// the row below it off the plank.
    nonisolated static let stemLines = 3
    nonisolated static let lessonLines = 2
    nonisolated static let workingLines = 2

    /// The width the review column actually gets, and the height inside the
    /// scroll's own padding. Both are what `QResultFitTests` measures the list
    /// against - a gate that measures the LIST rather than the screen, because a
    /// fixed-height container that does not clip hides its overflow from any
    /// measurement of its parent.
    nonisolated static func reviewColumnWidth(_ m: MQMetrics) -> CGFloat {
        let pad: CGFloat = m.isRegular ? 30 : 16
        let content = m.size.width - pad * 2
        if m.isWide { return content - min(272, m.size.width * 0.27) - 26 - 52 }
        return content - (m.isRegular ? 52 : 32)
    }

    nonisolated static func reviewInnerHeight(_ m: MQMetrics) -> CGFloat {
        reviewHeight(m) - (m.isRegular ? 28 : 24)
    }

    /// The list exactly as the body draws it. Public so the fit gate renders the
    /// same view the child sees rather than a reconstruction of it.
    @MainActor
    public static func reviewListView(_ p: MQPalette, items: [QAnsweredItem],
                                      metrics m: MQMetrics) -> some View {
        QReviewList(p: p, items: Array(items.prefix(reviewRows(m))), m: m)
    }

    nonisolated static func buttonSize(_ m: MQMetrics, primary: Bool) -> CGFloat {
        let f: CGFloat = primary ? (m.isRegular ? 24 : 18) : (m.isRegular ? 20 : 15)
        return max(MQTap.min, f * 1.32 + (primary ? 30 : 24))
    }

    nonisolated public static func tapTargets(_ m: MQMetrics) -> [MQTapTarget] {
        [MQTapTarget(QStrings.playAgain,
                     CGSize(width: MQTap.min, height: buttonSize(m, primary: true))),
         MQTapTarget(QStrings.islandMap,
                     CGSize(width: MQTap.min, height: buttonSize(m, primary: false))),
         MQTapTarget(QStrings.home,
                     CGSize(width: MQTap.min, height: buttonSize(m, primary: false)))]
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

    private var wide: some View {
        VStack(spacing: 16) {
            titleBlock
            HStack(alignment: .top, spacing: 26) {
                VStack(spacing: 16) {
                    statGrid
                    Spacer(minLength: 0)
                    cast(height: Self.castHeight(m))
                }
                .frame(width: min(272, m.size.width * 0.27))
                MQScroll(p, padH: 26, padV: 14) {
                    reviewList
                }
                .frame(height: Self.reviewHeight(m))
            }
            buttonRow
        }
    }

    private var tall: some View {
        VStack(spacing: 10) {
            titleBlock
            statGrid
            MQScroll(p, padH: m.isRegular ? 26 : 16, padV: m.isRegular ? 14 : 12) {
                reviewList
            }
            .frame(height: Self.reviewHeight(m))
            Spacer(minLength: 0)
            cast(height: Self.castHeight(m))
            buttonRow
        }
    }

    private var titleBlock: some View {
        VStack(spacing: compact ? 0 : 2) {
            Text(summary?.title ?? QStrings.resultTitleGoodRun)
                .font(.mq(compact ? 32 : 46, .extrabold))
                .foregroundStyle(p.gold)
                .shadow(color: p.woodDeep.opacity(0.9), radius: 0, x: 0, y: 3)
            Text(QStrings.resultMessage(hero: model.profile?.name ?? "",
                                        node: model.node?.name ?? "",
                                        correct: summary?.correct ?? 0,
                                        total: summary?.total ?? 0))
                .font(.mq(compact ? 14 : 20, .medium))
                .foregroundStyle(p.carved)
                .shadow(color: p.woodDeep.opacity(0.75), radius: 0, x: 0, y: 2)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private var stats: [MQStat] {
        guard let s = summary else { return [] }
        return [MQStat("\(s.correct) / \(s.total)", QStrings.statCorrect),
                MQStat("\(s.accuracy)%", QStrings.statAccuracy),
                MQStat("\(s.bestStreak)", QStrings.statBestStreak),
                MQStat("\(s.crystals)", QStrings.statCrystals)]
    }

    private var statGrid: some View {
        MQTag(p) {
            Group {
                if compact {
                    HStack(spacing: 0) { ForEach(stats) { stat($0) } }
                } else {
                    VStack(spacing: 10) {
                        ForEach(0..<2, id: \.self) { row in
                            HStack(spacing: 0) {
                                ForEach(0..<2, id: \.self) { col in
                                    let i = row * 2 + col
                                    if i < stats.count { stat(stats[i]) }
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

    private var reviewList: some View {
        Self.reviewListView(p, items: summary?.review ?? [], metrics: m)
    }

    private func cast(height: CGFloat) -> some View {
        HStack(alignment: .bottom, spacing: compact ? 10 : 20) {
            let hero = model.profile?.cast ?? .unicorn
            MQCreature(hero, p)
                .frame(width: height * MQCreature.box(hero).width
                              / MQCreature.box(hero).height, height: height)
            MQCreature(.crab, p)
                .frame(width: height * MQCrab.box.width / MQCrab.box.height * 0.92,
                       height: height * 0.92)
        }
    }

    private var buttonRow: some View {
        HStack(spacing: compact ? 8 : 16) {
            Button { Task { await model.playAgain() } } label: {
                MQPlankButton(p, QStrings.playAgain, primary: true,
                              fontSize: m.isRegular ? 24 : 18)
            }
            .buttonStyle(.plain)
            Button { Task { await model.toMap() } } label: {
                MQPlankButton(p, QStrings.islandMap, fontSize: m.isRegular ? 20 : 15)
            }
            .buttonStyle(.plain)
            Button { Task { await model.backToEntrance() } } label: {
                MQPlankButton(p, QStrings.home, fontSize: m.isRegular ? 20 : 15)
            }
            .buttonStyle(.plain)
        }
    }
}

/// The review rows, as their own view.
///
/// Lifted out of `QResultView` so the fit gate can render EXACTLY what the child
/// sees at exactly the width the layout gives it. A gate that reconstructs the
/// list is a gate on the reconstruction.
struct QReviewList: View {
    let p: MQPalette
    let items: [QAnsweredItem]
    let m: MQMetrics

    private var compact: Bool { !m.isRegular }
    private var figureWidth: CGFloat { m.isRegular ? 108 : 86 }
    private var figureHeight: CGFloat { m.isRegular ? 70 : 62 }

    var body: some View {
        VStack(alignment: .leading, spacing: compact ? 8 : 12) {
            Text(items.isEmpty ? QStrings.reviewEmpty : QStrings.reviewHeading)
                .font(.mq(compact ? 16 : 22, .bold))
                .foregroundStyle(p.inkSoft)
            ForEach(Array(items.enumerated()), id: \.element.id) { i, item in
                if i > 0 { rule }
                row(item)
            }
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var rule: some View {
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

    private func row(_ item: QAnsweredItem) -> some View {
        HStack(alignment: .top, spacing: compact ? 10 : 16) {
            if let f = item.question.figure {
                QFigureView(p, f, fallbackText: item.question.extraText)
                    .frame(width: figureWidth, height: figureHeight)
            }
            VStack(alignment: .leading, spacing: 1) {
                MQQuestionText(p, item.question.stemText, size: compact ? 13 : 16)
                    .lineLimit(QResultView.stemLines)
                // The unit lesson, FIRST, and only when the number was right.
                if case .wrongUnit = item.reason {
                    Text(MQTypeset.bindUnits(QStrings.unitLesson(
                        unit: QUnits.canonical(item.question.unit),
                        why: QUnits.why(for: QUnits.canonical(item.question.unit)))))
                        .font(.mq(compact ? 13 : 16, .bold))
                        .foregroundStyle(p.ink)
                        .lineLimit(QResultView.lessonLines)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Text(MQTypeset.bindUnits(item.question.answerTextPlain))
                    .font(.mq(compact ? 15 : 19, .extrabold))
                    .monospacedDigit()
                    .foregroundStyle(p.leafDeep)
                    .lineLimit(1)
                Text(item.explanation?.text ?? item.question.explainText)
                    .font(.mq(compact ? 12 : 15, .regular))
                    .foregroundStyle(p.inkSoft)
                    .lineLimit(QResultView.workingLines)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 0)
        }
    }
}
