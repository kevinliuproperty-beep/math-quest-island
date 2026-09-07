import SwiftUI

/// A health / progress bar.
///
/// The notches are not decoration: at `segments: 8` each notch is roughly one
/// monster hit, so a kid can read "three hits left" off the bar instead of
/// doing arithmetic on a percentage. Pass `segments: 0` for a plain bar
/// (timers, mastery meters) where there is nothing to count.
public struct MQBar: View {
    @Environment(\.mqTheme) private var theme

    public enum Role {
        case hero      // lagoon
        case monster   // coral
        case crystal   // gold
        case custom(Color)
    }

    private let value: Double        // 0...1
    private let role: Role
    private let segments: Int
    private let height: CGFloat

    public init(value: Double, role: Role = .hero, segments: Int = 0, height: CGFloat = 20) {
        self.value = min(max(value, 0), 1)
        self.role = role
        self.segments = segments
        self.height = height
    }

    private var tint: Color {
        switch role {
        case .hero:            return theme.palette.lagoon
        case .monster:         return theme.palette.coral
        case .crystal:         return theme.palette.gold
        case .custom(let c):   return c
        }
    }

    public var body: some View {
        let ink = theme.palette.ink
        let shape = Capsule()

        GeometryReader { geo in
            let inset = theme.paper.stroke
            let innerW = max(0, geo.size.width - inset * 2)

            ZStack(alignment: .leading) {
                // The empty bar still has to read as an object, not a hole.
                shape.fill(theme.palette.trough)

                shape
                    .fill(tint)
                    .frame(width: innerW * value + inset * 2)
                    .animation(theme.motion.barAnim, value: value)

                if segments > 1 {
                    HStack(spacing: 0) {
                        ForEach(0..<segments, id: \.self) { i in
                            Rectangle()
                                .fill(i == segments - 1 ? Color.clear : ink.opacity(0.38))
                                .frame(width: theme.paper.stroke * 0.7)
                                .frame(maxWidth: .infinity, alignment: .trailing)
                        }
                    }
                    .padding(.horizontal, inset)
                }

                shape.strokeBorder(ink, lineWidth: theme.paper.stroke)
            }
        }
        .frame(height: height)
        .accessibilityElement()
        .accessibilityValue(Text("\(Int((value * 100).rounded())) percent"))
    }
}

/// A bar with a name to its left and a readout to its right. This is the shape
/// the arena rails and the top bar both use, so a fighter always looks the same
/// wherever it appears.
public struct MQVitals: View {
    @Environment(\.mqTheme) private var theme

    private let name: String?
    private let value: Double
    private let readout: String?
    private let role: MQBar.Role
    private let segments: Int
    private let barHeight: CGFloat

    /// `name` is optional on purpose. In the arena the hero's name is dropped:
    /// a child knows who they are, and it is already on the top bar. The
    /// monster keeps its name, because that is the thing you have to learn.
    public init(name: String?, value: Double, readout: String? = nil,
                role: MQBar.Role = .hero, segments: Int = 0, barHeight: CGFloat = 20) {
        self.name = name; self.value = value; self.readout = readout
        self.role = role; self.segments = segments; self.barHeight = barHeight
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: theme.space.xs) {
            if name != nil || readout != nil {
                HStack(alignment: .firstTextBaseline, spacing: theme.space.s) {
                    if let name {
                        Text(name)
                            .font(.mq(theme.type.label, .heavy))
                            .foregroundStyle(theme.palette.skyInk)
                            .lineLimit(1)
                            .minimumScaleFactor(0.7)
                    }
                    Spacer(minLength: 0)
                    if let readout {
                        Text(readout)
                            .font(.mq(theme.type.micro, .bold))
                            .mqNumerals()
                            .foregroundStyle(theme.palette.skyInkSoft)
                            .fixedSize()
                    }
                }
            }
            MQBar(value: value, role: role, segments: segments, height: barHeight)
        }
    }
}
