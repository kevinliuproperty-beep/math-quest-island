import SwiftUI

/// The first screen anybody sees, parents included.
///
/// There is no login, no account and no email box, so this screen has nothing to
/// ask for -- it only has to say who lives on this iPad. Three carved tokens
/// standing in the sand and one empty slot; the app's name above them; and one
/// plain sentence for the adult holding the device, which is the only piece of
/// copy on the screen written for someone other than the child.
///
/// Deliberately absent: a "welcome back", a last-played date, a streak, a
/// day counter, and anything else that would make coming back a debt. The
/// fade-out law starts at the front door.
public struct MQEntranceScreen: View {
    let scene: MQEntranceScene
    let layout: MQLayout
    let insets: MQInsets
    let p: MQPalette

    public init(scene: MQEntranceScene = .sample, layout: MQLayout,
                insets: MQInsets = .none, palette: MQPalette = .noon) {
        self.scene = scene; self.layout = layout
        self.insets = insets; self.p = palette
    }

    private var compact: Bool { layout == .tall }
    private var type: MQType { compact ? .compact : .regular }
    private var pad: CGFloat { compact ? 18 : 34 }

    public var body: some View {
        ZStack {
            MQWorld(p, horizon: compact ? 0.34 : 0.40)
            VStack(spacing: 0) {
                title
                // The extra room goes ABOVE the tokens, so the row stands on
                // the dry sand rather than floating at the waterline with half
                // a beach empty under it.
                Spacer(minLength: compact ? 14 : 24)
                tokens
                Color.clear.frame(height: compact ? 20 : 34)
                parentLine
            }
            .padding(.horizontal, pad)
            .padding(.top, insets.top + pad * 0.6)
            .padding(.bottom, insets.bottom + pad * 0.6)
        }
    }

    /// The name is the hero of this screen, so it is set as lettering rather
    /// than as a label: heavy, cut into the light, with a crystal either side
    /// standing in for the star the whole game is about collecting.
    private var title: some View {
        VStack(spacing: compact ? 2 : 4) {
            HStack(spacing: compact ? 10 : 16) {
                crystal(compact ? 20 : 30)
                Text(scene.title)
                    .font(.mq(type.title, .extrabold))
                    .foregroundStyle(p.carved)
                    .shadow(color: p.woodDeep.opacity(0.85), radius: 0, x: 0, y: 3)
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
                crystal(compact ? 20 : 30)
            }
            Text(scene.subtitle)
                .font(.mq(type.body, .medium))
                .foregroundStyle(p.carved.opacity(0.92))
                .shadow(color: p.woodDeep.opacity(0.7), radius: 0, x: 0, y: 2)
        }
    }

    private func crystal(_ size: CGFloat) -> some View {
        Canvas { ctx, s in
            mqDrawCrystal(&ctx, p, center: CGPoint(x: s.width / 2, y: s.height / 2),
                          r: s.height * 0.40, on: true)
        }
        .frame(width: size, height: size * 1.15)
    }

    @ViewBuilder private var tokens: some View {
        let slots: [MQProfile?] = scene.profiles.map { $0 } + [nil]
        if compact {
            // Two by two on the phone. Four across at 393pt would put a name
            // tag at 9pt, which is a label a five-year-old cannot read.
            VStack(spacing: 16) {
                ForEach(0..<2, id: \.self) { row in
                    HStack(spacing: 20) {
                        ForEach(0..<2, id: \.self) { col in
                            let i = row * 2 + col
                            if i < slots.count {
                                MQHeroToken(p, profile: slots[i],
                                            newLabel: scene.newSlotLabel,
                                            diameter: 124, compact: true)
                            }
                        }
                    }
                }
            }
        } else {
            HStack(alignment: .top, spacing: 30) {
                ForEach(0..<slots.count, id: \.self) { i in
                    MQHeroToken(p, profile: slots[i], newLabel: scene.newSlotLabel,
                                diameter: 186)
                }
            }
        }
    }

    private var parentLine: some View {
        MQTag(p) {
            Text(scene.parentLine)
                .font(.mq(compact ? 13 : 17, .medium))
                .foregroundStyle(p.underLight(Color(hex: 0x6E4B26)))
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.horizontal, compact ? 14 : 20)
                .padding(.vertical, compact ? 8 : 11)
        }
    }
}
