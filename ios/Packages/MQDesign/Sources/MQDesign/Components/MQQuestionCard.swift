import SwiftUI

/// Where a diagram will be drawn by MQFigures. Shown here in its empty state.
public struct MQFigureSlot: View {
    @Environment(\.mqTheme) private var theme
    private let minHeight: CGFloat
    private let grow: Bool

    public init(minHeight: CGFloat = 120, grow: Bool = false) {
        self.minHeight = minHeight
        self.grow = grow
    }

    public var body: some View {
        RoundedRectangle(cornerRadius: theme.radius.chip, style: .continuous)
            .strokeBorder(
                theme.palette.sandInkSoft.opacity(0.5),
                style: StrokeStyle(lineWidth: 2.5, dash: [9, 7])
            )
            // A Shape is greedy in both axes, so a bare minHeight lets the slot
            // swallow every spare point in the card. Pin it unless it is
            // explicitly allowed to grow.
            .frame(maxWidth: .infinity,
                   minHeight: minHeight,
                   maxHeight: grow ? .infinity : minHeight)
            .overlay(
                Image(systemName: "chart.bar.fill")
                    .font(.system(size: 26, weight: .semibold))
                    .foregroundStyle(theme.palette.sandInkSoft.opacity(0.35))
            )
    }
}

/// The problem, on the one light plane in the app.
///
/// The text is LEFT aligned, not centred. P3-P5 questions are mostly word
/// problems, and a child tracking back to the start of the next line needs a
/// straight left edge more than a bare expression needs to sit dead centre. The
/// measure is capped so no line runs past a comfortable read.
public struct MQQuestionCard<Figure: View>: View {
    @Environment(\.mqTheme) private var theme

    private let question: String
    private let figure: Figure

    public init(question: String, @ViewBuilder figure: () -> Figure) {
        self.question = question
        self.figure = figure()
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: theme.space.l) {
            Text(question)
                .font(.mq(theme.type.question, .heavy))
                .mqNumerals()
                .foregroundStyle(theme.palette.sandInk)
                .multilineTextAlignment(.leading)
                .fixedSize(horizontal: false, vertical: true)
                .lineSpacing(theme.type.question * 0.14)
                .frame(maxWidth: 640, alignment: .leading)

            figure
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(theme.isCompact ? theme.space.l : theme.space.xl)
        .mqPaper(
            RoundedRectangle(cornerRadius: theme.radius.card, style: .continuous),
            fill: theme.palette.sand,
            ink: theme.palette.ink,
            stroke: theme.paper.stroke,
            lift: theme.paper.lift
        )
    }
}

public extension MQQuestionCard where Figure == MQFigureSlot {
    init(question: String, figureMinHeight: CGFloat = 120, figureGrows: Bool = false) {
        self.init(question: question) {
            MQFigureSlot(minHeight: figureMinHeight, grow: figureGrows)
        }
    }
}
