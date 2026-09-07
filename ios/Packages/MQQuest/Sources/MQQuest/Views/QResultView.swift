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
    @Environment(\.qHitMap) private var hitMap
    let m: MQMetrics
    let p: MQPalette

    /// The hit-map names the driver taps by.
    public enum Hit {
        public static let playAgain = "play-again"
        public static let islandMap = "island-map"
        public static let home = "home"
        public static let reviewBack = "review-back"
        public static let reviewMore = "review-more"
    }

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

    /// **The review is PAGED, and every wrong item is on one of the pages.**
    ///
    /// The doc comment that used to live here argued for a bounded ScrollView and
    /// described a screen that was never built: `ScrollView` renders EMPTY under
    /// `ImageRenderer` (this lane's own finding), so the scroll was removed and
    /// what shipped was `items.prefix(reviewRows(m))` - **2 of up to 12 wrong
    /// items on a landscape iPad and 1 everywhere else, with no scroll, no page,
    /// no count and no hint that anything was missing.** A 0-of-9 knockout showed
    /// items 1 and 2 and then nothing (Quest Refutation K4).
    ///
    /// Paging is the option a headless gate can both drive and see: the plank
    /// keeps its deterministic height, every row stays complete, and the page
    /// state lives on `QQuestModel` (not in `@State`) so the gate can turn the
    /// page and render it. The count band says "3-4 of 9" so the child knows the
    /// list has more in it than the plank is holding.
    nonisolated static func reviewHeight(_ m: MQMetrics) -> CGFloat {
        // A SHARE of the frame, not a chrome subtraction. The subtraction was
        // tried first and was wrong at every size by a different amount (22 pt
        // landscape, 108 pt portrait, 24 pt on the SE), because it has to
        // predict the height of a title block whose message wraps, a stat tag
        // whose layout differs by device class, and a cast whose scale is itself
        // a function of the height. A share is one number, is right by
        // construction, and is what the gate measures.
        let usable = m.size.height - m.insets.top - m.insets.bottom
        // The pager band sits under the plank, so the plank yields its height.
        let share: CGFloat = m.isWide ? 0.60 : (m.isRegular ? 0.372 : 0.40)
        return max(usable * share, 110)
    }

    /// The height of the page band under the plank. Zero when there is one page:
    /// a pager on a one-page list is chrome about nothing.
    nonisolated static func pagerHeight(_ m: MQMetrics) -> CGFloat {
        max(MQTap.min, (m.isRegular ? 17 : 14) * 1.32 + 16)
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

    /// The items on one page. The ONE definition of the slice, so the gate, the
    /// count band and the drawn list can never be three different lists - which is
    /// exactly how K4 hid: the flow test asserted `model.wrongItems` and the
    /// screen drew `items.prefix(reviewRows(m))`.
    nonisolated public static func pageSlice(_ items: [QAnsweredItem], page: Int,
                                             rows: Int) -> ArraySlice<QAnsweredItem> {
        guard rows > 0, !items.isEmpty else { return [] }
        let start = min(max(page, 0) * rows, max(items.count - 1, 0))
        return items[start..<min(start + rows, items.count)]
    }

    nonisolated public static func pageCount(_ items: [QAnsweredItem], rows: Int) -> Int {
        guard rows > 0 else { return 1 }
        return max(1, Int((Double(items.count) / Double(rows)).rounded(.up)))
    }

    /// The list exactly as the body draws it. Public so the fit gate renders the
    /// same view the child sees rather than a reconstruction of it.
    @MainActor
    public static func reviewListView(_ p: MQPalette, items: [QAnsweredItem],
                                      metrics m: MQMetrics, page: Int = 0) -> some View {
        QReviewList(p: p, items: Array(pageSlice(items, page: page, rows: reviewRows(m))),
                    m: m)
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
                     CGSize(width: MQTap.min, height: buttonSize(m, primary: false))),
         MQTapTarget(QStrings.reviewOlder,
                     CGSize(width: MQTap.min + 24, height: pagerHeight(m))),
         MQTapTarget(QStrings.reviewNewer,
                     CGSize(width: MQTap.min + 24, height: pagerHeight(m)))]
    }

    public var body: some View {
        ZStack {
            MQWorld(p, horizon: m.isWide ? 0.34 : 0.26)
            (m.isWide ? AnyView(wide) : AnyView(tall))
                .padding(.horizontal, pad)
                .padding(.top, m.insets.top + pad * 0.6)
                .padding(.bottom, m.insets.bottom + pad * 0.6)
        }
        .coordinateSpace(name: QHitMap.space)
    }

    private func hitButton<L: View>(
        _ name: String, enabled: Bool = true,
        action: @escaping @MainActor @Sendable () async -> Void,
        @ViewBuilder label: () -> L) -> some View {
        Button { Task { await action() } } label: { label() }
            .buttonStyle(.plain)
            .disabled(!enabled)
            .qHit(hitMap, name, enabled: enabled, fire: action)
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
                VStack(spacing: 6) {
                    MQScroll(p, padH: 26, padV: 14) {
                        reviewList
                    }
                    .frame(height: Self.reviewHeight(m))
                    pager
                }
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
            pager
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
            // **On a plank, not on the sand.** This subtitle - the line that says
            // what the child just did - was cream straight onto the world, which
            // measures 1.05:1 on `parchment`, 1.30:1 on `sandFar` and 2.11:1 on
            // `skyHigh`. It is the parent's-eye item 9 of the Phase 1 dress
            // rehearsal ("white captions on pale sand"), and a drop shadow does
            // not enter a contrast ratio - the shadow was the only thing making
            // the line visible at all. `MQResultScreen` took the same fix; this
            // is the screen a child actually gets.
            MQRail(p, padH: compact ? 12 : 18, padV: compact ? 1 : 3) {
                Text(QStrings.resultMessage(hero: model.profile?.name ?? "",
                                            node: model.node?.name ?? "",
                                            correct: summary?.correct ?? 0,
                                            total: summary?.total ?? 0))
                    .font(.mq(compact ? 14 : 20, .medium))
                    .foregroundStyle(p.captionOnDark)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
            }
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
                // Was `underLight(0x8A6A45)` - 2.81:1 on the tag at noon and
                // 1.67:1 at dusk. `captionOnLight` is the lightest brown that
                // clears 4.5:1 on every pale ground in the system.
                .foregroundStyle(p.captionOnLight)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
        .frame(maxWidth: .infinity)
    }

    private var reviewItems: [QAnsweredItem] { summary?.review ?? [] }
    private var rows: Int { Self.reviewRows(m) }
    private var pageCount: Int { Self.pageCount(reviewItems, rows: rows) }
    private var page: Int { min(model.reviewPage, pageCount - 1) }

    private var reviewList: some View {
        Self.reviewListView(p, items: reviewItems, metrics: m, page: page)
    }

    /// **The band that says the list is longer than the plank.**
    ///
    /// Drawn only when there is more than one page. Two planks and a count, in the
    /// same material as every other control on this screen; nothing here scrolls,
    /// because `ScrollView` renders empty under `ImageRenderer` and a surface a
    /// headless gate cannot see is a surface nobody has checked.
    @ViewBuilder private var pager: some View {
        if pageCount > 1 {
            let first = page * rows + 1
            let last = min(first + rows - 1, reviewItems.count)
            let rowsNow = rows
            HStack(spacing: compact ? 8 : 14) {
                hitButton(Hit.reviewBack, enabled: page > 0,
                          action: { [model] in model.reviewPageBack(rows: rowsNow) }) {
                    MQPlankButton(p, QStrings.reviewOlder, fontSize: m.isRegular ? 17 : 14)
                }
                .opacity(page == 0 ? 0.4 : 1)
                // The counter that says which of the wrong answers you are
                // looking at, on a plank for the same reason as the subtitle:
                // cream on open sand is 1.30:1 and the drop shadow that made it
                // legible is not a contrast ratio.
                MQRail(p, padH: m.isRegular ? 12 : 8, padV: m.isRegular ? 2 : 1) {
                    Text(QStrings.reviewPageOf(first: first, last: last,
                                               total: reviewItems.count))
                        .font(.mq(m.isRegular ? 17 : 14, .bold))
                        .monospacedDigit()
                        .foregroundStyle(p.captionOnDark)
                        .lineLimit(1)
                }
                hitButton(Hit.reviewMore, enabled: page < pageCount - 1,
                          action: { [model] in model.reviewPageForward(rows: rowsNow) }) {
                    MQPlankButton(p, QStrings.reviewNewer, fontSize: m.isRegular ? 17 : 14)
                }
                .opacity(page >= pageCount - 1 ? 0.4 : 1)
            }
            .frame(height: Self.pagerHeight(m))
        }
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
            hitButton(Hit.playAgain, action: { [model] in await model.playAgain() }) {
                MQPlankButton(p, QStrings.playAgain, primary: true,
                              fontSize: m.isRegular ? 24 : 18)
            }
            hitButton(Hit.islandMap, action: { [model] in await model.toMap() }) {
                MQPlankButton(p, QStrings.islandMap, fontSize: m.isRegular ? 20 : 15)
            }
            hitButton(Hit.home, action: { [model] in await model.backToEntrance() }) {
                MQPlankButton(p, QStrings.home, fontSize: m.isRegular ? 20 : 15)
            }
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
                QFigureView(p, f, fallbackText: item.question.extraText,
                            typeFloor: m.isRegular ? QFigureView.iPadTypeFloor
                                                   : QFigureView.phoneTypeFloor)
                    .frame(width: figureWidth, height: figureHeight)
            }
            VStack(alignment: .leading, spacing: 1) {
                MQQuestionText(p, item.question.stemText, size: compact ? 13 : 16)
                    .lineLimit(QResultView.stemLines)
                // The unit lesson, FIRST, and only when the number was right.
                if case .wrongUnit = item.reason {
                    Text(MQTypeset.bindUnits(QStrings.unitLesson(
                        unit: QUnits.canonical(item.question),
                        why: QUnits.why(for: QUnits.canonical(item.question)))))
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
