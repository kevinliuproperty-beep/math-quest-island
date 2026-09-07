import SwiftUI

/// The first screen anybody sees, parents included.
///
/// There is no login, no account and no email box, so this screen has nothing to
/// ask for -- it only has to say who lives on this iPad. Carved tokens standing
/// in the sand and one empty slot; the app's name above them; and one plain
/// sentence for the adult holding the device, which is the only piece of copy on
/// the screen written for someone other than the child.
///
/// Deliberately absent: a "welcome back", a last-played date, a streak, a day
/// counter, and anything else that would make coming back a debt. The fade-out
/// law starts at the front door.
///
/// **Composition pass (phase 1).** The lane that drew this called it its own
/// weakest screen and was right: 244 pt of slack on the iPad, an empty top
/// third, four tokens ruled across the middle in one straight line and a wide
/// unbroken sweep of sand beneath -- *"a row of buttons on a wallpaper rather
/// than a place"*. Two changes, both compositional:
///
///  1. **The beach is somewhere now.** `MQBeachCamp` puts a jetty and a moored
///     boat in the lagoon behind the tokens and a driftwood fire on the near
///     sand in front of them. It is one story (you arrived, somebody lit a
///     fire) rather than three ornaments, and it fills the empty top third with
///     the thing that was missing from it: a reason.
///  2. **The tokens are staggered in depth.** They sit on four different lines
///     up the beach and at four sizes, nearest largest, so the row reads as
///     explorers standing about on a beach instead of as a segmented control.
///     The ORDER is untouched -- the new-explorer slot is still last and still
///     the same object -- because a parent scanning for their child's name
///     should not have to re-learn the row.
///
/// The "no login" model is unchanged and non-negotiable: two or three saved
/// heroes plus one new-explorer slot, held on this device, no accounts anywhere.
public struct MQEntranceScreen: View, MQTapAudited {
    let scene: MQEntranceScene
    let m: MQMetrics
    let p: MQPalette

    public init(scene: MQEntranceScene = .sample, metrics: MQMetrics,
                palette: MQPalette = .noon) {
        self.scene = scene; self.m = metrics; self.p = palette
    }

    private var g: Geo { Self.geometry(m, slots: scene.profiles.count + 1) }
    private var type: MQType { m.type }

    // MARK: - Geometry

    public struct Geo: Sendable, Equatable {
        public var pad: CGFloat
        public var horizon: CGFloat
        /// Token disc diameter. Every slot is sized from this; the depth
        /// stagger scales it per slot.
        public var diameter: CGFloat
        /// One row, or 2x2. Decided by whether the row FITS, not by device
        /// class: an iPad 9.7" portrait is 768 pt wide and cannot hold four
        /// 186 pt tokens in a line any more than a phone can.
        public var oneRow: Bool
        public var spacing: CGFloat
    }

    /// Nearest-to-furthest, as (scale, vertical offset in points). Slot 1 is
    /// nearest the child; slot 3 is furthest up the beach. Offsets are negative
    /// upward -- further away is higher in frame, which is the only depth cue a
    /// flat illustration has besides size.
    nonisolated public static let depth: [(scale: CGFloat, dy: CGFloat)] = [
        (0.93, -26), (1.00, 10), (0.88, -42), (0.96, -8)
    ]

    nonisolated public static func geometry(_ m: MQMetrics, slots: Int) -> Geo {
        let pad: CGFloat = m.isRegular ? 34 : 18
        let contentW = m.size.width - pad * 2
        let spacing: CGFloat = m.isRegular ? 30 : 20
        // The widest a token may be and still leave the row on the screen, with
        // the largest depth scale accounted for.
        let maxScale = Self.depth.prefix(slots).map(\.scale).max() ?? 1
        let fitted = (contentW - spacing * CGFloat(slots - 1)) / CGFloat(slots) / maxScale
        let authored: CGFloat = m.isRegular ? 186 : 124
        let oneRow = fitted >= (m.isRegular ? 150 : 104)
        return Geo(pad: pad,
                   horizon: m.isWide ? 0.40 : (m.isRegular ? 0.38 : 0.34),
                   diameter: oneRow ? min(authored, fitted) : authored,
                   oneRow: oneRow,
                   spacing: spacing)
    }

    /// A token is the tap target, and it is enormous -- the smallest one in the
    /// matrix is still more than double the floor. Worth auditing anyway: the
    /// depth stagger MULTIPLIES the diameter, and slot 3 is the smallest.
    nonisolated public static func tapTargets(_ m: MQMetrics) -> [MQTapTarget] {
        let slots = MQEntranceScene.sample.profiles.count + 1
        let g = geometry(m, slots: slots)
        return (0..<slots).map { i in
            let s = depth[i % depth.count].scale
            return MQTapTarget("slot \(i + 1)", square: g.diameter * s)
        }
    }

    public var body: some View {
        ZStack {
            MQWorld(p, horizon: g.horizon)
            MQBeachCamp(p, horizon: g.horizon, compact: !g.oneRow)
            VStack(spacing: 0) {
                title
                Spacer(minLength: m.isRegular ? 24 : 14)
                tokens
                Color.clear.frame(height: m.isRegular ? 34 : 20)
                parentLine
            }
            .padding(.horizontal, g.pad)
            .padding(.top, m.insets.top + g.pad * 0.6)
            .padding(.bottom, m.insets.bottom + g.pad * 0.6)
        }
    }

    /// The name is the hero of this screen, so it is set as lettering rather
    /// than as a label: heavy, cut into the light, with a crystal either side
    /// standing in for the star the whole game is about collecting.
    private var title: some View {
        VStack(spacing: m.isRegular ? 4 : 2) {
            HStack(spacing: m.isRegular ? 16 : 10) {
                crystal(m.isRegular ? 30 : 20)
                Text(scene.title)
                    .font(.mq(type.title, .extrabold))
                    .foregroundStyle(p.carved)
                    .shadow(color: p.woodDeep.opacity(0.85), radius: 0, x: 0, y: 3)
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
                crystal(m.isRegular ? 30 : 20)
            }
            Text(scene.subtitle)
                .font(.mq(type.body, .medium))
                .foregroundStyle(p.carved.opacity(0.92))
                .shadow(color: p.woodDeep.opacity(0.7), radius: 0, x: 0, y: 2)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
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
        if g.oneRow {
            // Bottom-aligned, so the stagger reads as distance up the beach
            // rather than as four differently-sized buttons floating.
            HStack(alignment: .bottom, spacing: g.spacing) {
                ForEach(0..<slots.count, id: \.self) { i in
                    token(slots[i], i)
                }
            }
            // The furthest token is lifted 42pt; the padding gives that lift
            // somewhere to go instead of pushing the whole block down.
            .padding(.top, 42)
        } else {
            // Two by two. Four across at 393 pt would put a name tag at 9 pt,
            // which is a label a five-year-old cannot read; the same is true of
            // a 507 pt Split View column and a 744 pt mini in portrait.
            VStack(spacing: m.isRegular ? 26 : 16) {
                ForEach(0..<2, id: \.self) { row in
                    HStack(alignment: .bottom, spacing: g.spacing) {
                        ForEach(0..<2, id: \.self) { col in
                            let i = row * 2 + col
                            if i < slots.count { token(slots[i], i) }
                        }
                    }
                }
            }
            .padding(.top, 24)
        }
    }

    /// One slot at its depth. Scale is applied to the token's own diameter
    /// rather than with `.scaleEffect`, so the name plank's TYPE stays at full
    /// size -- a name set at 88% is the "everything shrank" look, not depth.
    private func token(_ profile: MQProfile?, _ i: Int) -> some View {
        let d = Self.depth[i % Self.depth.count]
        return MQHeroToken(p, profile: profile, newLabel: scene.newSlotLabel,
                           diameter: g.diameter * d.scale, compact: !m.isRegular)
            .offset(y: d.dy * (g.diameter / (m.isRegular ? 186 : 124)))
    }

    private var parentLine: some View {
        MQTag(p) {
            Text(scene.parentLine)
                .font(.mq(m.isRegular ? 17 : 13, .medium))
                .foregroundStyle(p.underLight(Color(hex: 0x6E4B26)))
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.horizontal, m.isRegular ? 20 : 14)
                .padding(.vertical, m.isRegular ? 11 : 8)
        }
    }
}
