import SwiftUI

// MARK: - Answer key

public enum MQAnswerState: Equatable {
    case idle
    case pressed
    case correct
    case wrong
    /// The other three options once the round is resolved. Present, readable,
    /// but out of the way -- never blanked out, because a kid learning from a
    /// mistake needs to still see what they picked.
    case dimmed
}

/// The big paper key a child taps to answer. This is the primary interactive
/// element of the whole app and is sized accordingly: never below 72pt tall,
/// against a 44pt platform floor.
public struct MQAnswerButton: View {
    @Environment(\.mqTheme) private var theme

    private let text: String
    private let state: MQAnswerState
    private let action: () -> Void

    public init(_ text: String, state: MQAnswerState = .idle, action: @escaping () -> Void = {}) {
        self.text = text
        self.state = state
        self.action = action
    }

    private var fill: Color {
        switch state {
        case .idle, .pressed: return theme.palette.key
        case .correct:        return theme.palette.lagoon
        case .wrong:          return theme.palette.coral
        case .dimmed:         return theme.palette.key
        }
    }

    private var label: Color {
        switch state {
        case .idle, .pressed: return theme.palette.keyInk
        case .correct, .wrong: return theme.palette.sand
        case .dimmed:         return theme.palette.keyInk
        }
    }

    public var body: some View {
        Button {
            MQHaptics.fire(state == .idle ? .tap : .correct)
            action()
        } label: {
            Text(text)
                .font(.mq(theme.type.key, .heavy))
                .mqNumerals()
                .foregroundStyle(label)
                .lineLimit(1)
                .minimumScaleFactor(0.5)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .padding(.horizontal, theme.space.m)
        }
        .buttonStyle(MQKeyButtonStyle(state: state, fill: fill))
        .opacity(state == .dimmed ? 0.55 : 1)
        .accessibilityLabel(Text(text))
    }
}

private struct MQKeyButtonStyle: ButtonStyle {
    @Environment(\.mqTheme) private var theme
    let state: MQAnswerState
    let fill: Color

    func makeBody(configuration: Configuration) -> some View {
        let down = configuration.isPressed || state == .pressed
        let lift = theme.paper.keyLift
        // The press IS the animation: the key drops into its own cast edge, the
        // way a real button goes down. No scale, no glow.
        return configuration.label
            .frame(minHeight: 72)
            .background(
                MQPaperBackground(
                    shape: RoundedRectangle(cornerRadius: theme.radius.key, style: .continuous),
                    style: MQPaperStyle(fill: fill, ink: theme.palette.ink,
                                        stroke: theme.paper.stroke,
                                        lift: down ? 1 : lift)
                )
            )
            .offset(y: down ? lift - 1 : 0)
            .padding(.bottom, lift)
            .animation(theme.motion.pressAnim, value: down)
            .contentShape(Rectangle())
    }
}

// MARK: - General buttons

public struct MQButton: View {
    @Environment(\.mqTheme) private var theme

    public enum Kind { case primary, secondary }

    private let title: String
    private let kind: Kind
    private let action: () -> Void

    public init(_ title: String, kind: Kind = .primary, action: @escaping () -> Void = {}) {
        self.title = title
        self.kind = kind
        self.action = action
    }

    public var body: some View {
        Button {
            MQHaptics.fire(.tap)
            action()
        } label: {
            Text(title)
                .font(.mq(kind == .primary ? theme.type.key : theme.type.body,
                          kind == .primary ? .black : .bold))
                .foregroundStyle(kind == .primary ? theme.palette.goldInk : theme.palette.skyInk)
                .padding(.horizontal, kind == .primary ? theme.space.xl : theme.space.l)
                .frame(maxWidth: .infinity)
        }
        .buttonStyle(
            MQPlankButtonStyle(
                fill: kind == .primary ? theme.palette.gold : theme.palette.plank,
                height: kind == .primary ? 68 : 52
            )
        )
    }
}

private struct MQPlankButtonStyle: ButtonStyle {
    @Environment(\.mqTheme) private var theme
    let fill: Color
    let height: CGFloat

    func makeBody(configuration: Configuration) -> some View {
        let down = configuration.isPressed
        let lift = theme.paper.lift
        return configuration.label
            .frame(height: height)
            .background(
                MQPaperBackground(
                    shape: RoundedRectangle(cornerRadius: theme.radius.key, style: .continuous),
                    style: MQPaperStyle(fill: fill, ink: theme.palette.ink,
                                        stroke: theme.paper.stroke,
                                        lift: down ? 1 : lift)
                )
            )
            .offset(y: down ? lift - 1 : 0)
            .padding(.bottom, lift)
            .animation(theme.motion.pressAnim, value: down)
            .contentShape(Rectangle())
    }
}

// MARK: - Icon button (pause, mute)

public struct MQIconButton: View {
    @Environment(\.mqTheme) private var theme
    private let systemName: String
    private let label: String
    private let action: () -> Void

    public init(systemName: String, label: String, action: @escaping () -> Void = {}) {
        self.systemName = systemName
        self.label = label
        self.action = action
    }

    public var body: some View {
        Button {
            MQHaptics.fire(.tap)
            action()
        } label: {
            Image(systemName: systemName)
                .font(.system(size: 22, weight: .heavy))
                .foregroundStyle(theme.palette.skyInk)
                // 48pt clears the 44pt floor with room for a small hand.
                .frame(width: 48, height: 48)
        }
        .buttonStyle(.plain)
        .mqPaper(
            RoundedRectangle(cornerRadius: theme.radius.chip, style: .continuous),
            fill: theme.palette.plank,
            ink: theme.palette.ink,
            stroke: theme.paper.stroke,
            lift: theme.paper.lift * 0.6
        )
        .accessibilityLabel(Text(label))
    }
}
