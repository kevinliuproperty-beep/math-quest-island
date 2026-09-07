import SwiftUI

// Screen-specific parts, built from the same rule as the rest of the chrome:
// everything is a THING on a beach. A profile is a carved token, a quest is a
// post in the sand, a timer is an hourglass, a streak stack is a row of
// crystals notched into a spar.

// MARK: - Entrance: an explorer's token

/// A slice of driftwood with a creature carved into it, standing in the sand.
///
/// This is the first object anyone sees, including a parent, so it says exactly
/// three things and no more: who you are, which class level, and how many
/// crystals you have found. There is no "last played", no streak, and no
/// come-back-tomorrow anywhere on this screen -- per the fade-out law, the app
/// never asks to be returned to.
public struct MQHeroToken: View {
    let p: MQPalette
    let profile: MQProfile?
    let newLabel: String
    let diameter: CGFloat
    let compact: Bool

    public init(_ p: MQPalette = .noon, profile: MQProfile?,
                newLabel: String = "New explorer", diameter: CGFloat, compact: Bool = false) {
        self.p = p; self.profile = profile
        self.newLabel = newLabel; self.diameter = diameter; self.compact = compact
    }

    public var body: some View {
        VStack(spacing: compact ? 6 : 10) {
            ZStack {
                Canvas { ctx, size in disc(&ctx, size) }
                    .frame(width: diameter, height: diameter)
                if let profile {
                    MQCreature(profile.cast, p)
                        .frame(width: diameter * 0.80, height: diameter * 0.80)
                        .offset(y: diameter * 0.04)
                } else {
                    Canvas { ctx, size in plus(&ctx, size) }
                        .frame(width: diameter * 0.42, height: diameter * 0.42)
                }
            }
            .frame(width: diameter, height: diameter)

            if let profile {
                MQTag(p) {
                    HStack(spacing: 7) {
                        // **THE NAME YIELDS; THE BADGE DOES NOT.**
                        //
                        // Both of these carried `.fixedSize()`, so the plaque
                        // demanded whatever "Charlotte" + "P4" happened to want
                        // and the 2x2 portrait layout - which gives a token half
                        // a 768 pt screen, not the whole of it - clipped the
                        // overflow. The overflow is the TRAILING edge, so the
                        // level badge was cut to a green sliver on Charlotte's
                        // own iPad in her own second orientation, while "Ben P3"
                        // and "Mei P5" fitted and nobody noticed (Phase 1 dress
                        // rehearsal, leg 1; crop entrance-portrait-charlotte-plaque.png).
                        //
                        // A name is a string of unbounded length and a class
                        // level is three characters, so the name is the part
                        // that can afford to shrink. It scales, floored at 0.62
                        // (25 pt -> 15.5 pt on an iPad, 17 -> 10.5 compact) and
                        // truncates only below that; the badge keeps `fixedSize`
                        // and takes layout priority, so it is never the thing
                        // that goes.
                        Text(profile.name)
                            .font(.mq(compact ? 17 : 25, .extrabold))
                            .foregroundStyle(p.underLight(Color(hex: 0x4A2C12)))
                            .lineLimit(1)
                            .minimumScaleFactor(0.62)
                        Text(profile.level)
                            .font(.mq(compact ? 12 : 14, .bold))
                            .foregroundStyle(p.carved)
                            .padding(.horizontal, 7).padding(.vertical, 1)
                            .background(Capsule().fill(p.leafDeep))
                            .fixedSize()
                            .layoutPriority(1)
                    }
                    .padding(.horizontal, compact ? 10 : 16)
                    .padding(.vertical, compact ? 5 : 7)
                }
                HStack(spacing: 5) {
                    Canvas { ctx, size in
                        mqDrawCrystal(&ctx, p,
                                      center: CGPoint(x: size.width / 2, y: size.height / 2),
                                      r: size.height * 0.40, on: true)
                    }
                    .frame(width: compact ? 16 : 20, height: compact ? 18 : 22)
                    Text("\(profile.crystals)")
                        .font(.mq(compact ? 15 : 18, .bold))
                        .monospacedDigit()
                        .foregroundStyle(p.carved)
                        .shadow(color: p.woodDeep.opacity(0.8), radius: 0, x: 0, y: 1.5)
                }
            } else {
                MQTag(p) {
                    Text(newLabel)
                        .font(.mq(compact ? 15 : 21, .bold))
                        .foregroundStyle(p.underLight(Color(hex: 0x6E4B26)))
                        .lineLimit(1)
                        .fixedSize()
                        .padding(.horizontal, compact ? 10 : 16)
                        .padding(.vertical, compact ? 6 : 9)
                }
                // The empty slot keeps the same vertical rhythm as a filled one,
                // so the row does not jump when a third child is added.
                Color.clear.frame(height: compact ? 18 : 22)
            }
        }
        // Deliberately NOT clamped to the disc's width: a name plank is allowed
        // to be wider than the token it names, and clamping it truncated
        // "Charlotte" to "Charl..." at phone width.
        .frame(minWidth: diameter)
    }

    private func disc(_ ctx: inout GraphicsContext, _ size: CGSize) {
        let c = CGPoint(x: size.width / 2, y: size.height / 2)
        let r = min(size.width, size.height) / 2
        // Standing in the sand, not floating over it.
        for i in 0..<4 {
            let t = CGFloat(i) / 3
            ctx.fill(Path(ellipseIn: CGRect(x: c.x - r * (0.72 + t * 0.28),
                                            y: size.height - 12 + t * 2,
                                            width: r * 2 * (0.72 + t * 0.28) , height: 16 + t * 5)),
                     with: .color(p.sandShade.opacity(0.26 * (1 - Double(t) * 0.7))))
        }
        let empty = profile == nil
        ctx.fill(Path(ellipseIn: CGRect(x: c.x - r, y: c.y - r + 5,
                                        width: r * 2, height: r * 2)),
                 with: .color(p.woodDeep.opacity(0.45)))
        ctx.fill(Path(ellipseIn: CGRect(x: c.x - r, y: c.y - r, width: r * 2, height: r * 2)),
                 with: .linearGradient(
                    Gradient(colors: empty
                             ? [p.parchmentEdge, p.underLight(Color(hex: 0xC9AC81))]
                             : [p.woodLight, p.wood, p.woodDark]),
                    startPoint: CGPoint(x: c.x - r, y: c.y - r),
                    endPoint: CGPoint(x: c.x + r * 0.4, y: c.y + r)))
        ctx.stroke(Path(ellipseIn: CGRect(x: c.x - r + 2, y: c.y - r + 2,
                                          width: r * 2 - 4, height: r * 2 - 4)),
                   with: .color(p.woodDeep.opacity(empty ? 0.45 : 0.8)), lineWidth: 3.4)
        // Growth rings. Three, off-centre, so the disc reads as cut wood.
        for (i, k) in [(0, 0.74), (1, 0.52), (2, 0.30)] {
            let rr = r * CGFloat(k)
            ctx.stroke(Path(ellipseIn: CGRect(x: c.x - rr - CGFloat(i) * 3,
                                              y: c.y - rr + CGFloat(i) * 2,
                                              width: rr * 2, height: rr * 2)),
                       with: .color(p.woodDeep.opacity(empty ? 0.10 : 0.16)), lineWidth: 1.6)
        }
        // Sun catching the upper left.
        ctx.fill(Path.smoothClosed(mqBlob(center: CGPoint(x: c.x - r * 0.36, y: c.y - r * 0.50),
                                          rx: r * 0.44, ry: r * 0.22, count: 9,
                                          wobble: 0.10, rotation: -0.45)),
                 with: .color(.white.opacity(p.isDusk ? 0.10 : 0.18)))
    }

    private func plus(_ ctx: inout GraphicsContext, _ size: CGSize) {
        let c = CGPoint(x: size.width / 2, y: size.height / 2)
        let r = min(size.width, size.height) / 2
        for rect in [CGRect(x: c.x - r, y: c.y - r * 0.17, width: r * 2, height: r * 0.34),
                     CGRect(x: c.x - r * 0.17, y: c.y - r, width: r * 0.34, height: r * 2)] {
            ctx.fill(Path(roundedRect: rect, cornerRadius: r * 0.12),
                     with: .color(p.woodDark.opacity(0.55)))
        }
    }
}

// MARK: - Map: a quest marker planted at a place

public struct MQMapMarker: View {
    let p: MQPalette
    let node: MQMapNode
    let scale: CGFloat

    public init(_ p: MQPalette = .noon, node: MQMapNode, scale: CGFloat = 1) {
        self.p = p; self.node = node; self.scale = scale
    }

    /// The post at the top of the marker, which is the NARROWEST part of the
    /// thing a child aims at. The name plank below it is always wider (ten-odd
    /// characters plus padding), so this is the dimension that decides whether
    /// the marker clears the 44 pt floor -- and at the design lane's compact
    /// scale of 0.72 it did not: 54 x 0.72 = 38.9 pt. `MQMapScreen` now floors
    /// the scale at 0.82 for exactly this reason.
    nonisolated public static let postBox = CGSize(width: 54, height: 64)

    /// What the audit measures. Conservative on purpose: the post only, never
    /// the plank, so the number can be trusted without measuring text.
    nonisolated public static func hitBox(scale: CGFloat) -> CGSize {
        CGSize(width: postBox.width * scale, height: (postBox.height + 3) * scale)
    }

    private var locked: Bool {
        if case .comingSoon = node.state { return true }
        return false
    }

    public var body: some View {
        VStack(spacing: 3 * scale) {
            Canvas { ctx, size in post(&ctx, size) }
                .frame(width: 54 * scale, height: 64 * scale)
            MQTag(p) {
                VStack(spacing: 1) {
                    Text(node.name)
                        .font(.mq(15 * scale, .bold))
                        .foregroundStyle(p.underLight(Color(hex: locked ? 0x8A7150 : 0x4A2C12)))
                        .lineLimit(1)
                        .fixedSize()
                    detail
                }
                .padding(.horizontal, 10 * scale)
                .padding(.vertical, 5 * scale)
            }
            .opacity(locked ? 0.82 : 1)
        }
        // The WHOLE marker is the target -- post, plank and the gap between
        // them -- not just whatever ink happens to be under the finger. Without
        // this a child has to hit a 12 pt-wide wooden post.
        .contentShape(Rectangle())
    }

    @ViewBuilder private var detail: some View {
        switch node.state {
        case .cleared:
            Text("Cleared")
                .font(.mq(11.5 * scale, .medium))
                .foregroundStyle(p.leafDeep)
        case let .inProgress(collected, total):
            // Mastery, drawn rather than written: four crystals found of five.
            // A percentage would be a number about the child; crystals are a
            // number about the island.
            Canvas { ctx, size in
                let step = size.width / CGFloat(total)
                for i in 0..<total {
                    mqDrawCrystal(&ctx, p,
                                  center: CGPoint(x: step * (CGFloat(i) + 0.5),
                                                  y: size.height / 2),
                                  r: min(step * 0.34, size.height * 0.40),
                                  on: i < collected)
                }
            }
            .frame(width: CGFloat(total) * 15 * scale, height: 15 * scale)
        case .open:
            Text("Ready")
                .font(.mq(11.5 * scale, .medium))
                .foregroundStyle(p.underLight(Color(hex: 0x6E4B26)))
        case .comingSoon:
            Text("Coming soon")
                .font(.mq(11.5 * scale, .medium))
                .foregroundStyle(p.underLight(Color(hex: 0x8A7150)))
        }
    }

    private func post(_ ctx: inout GraphicsContext, _ size: CGSize) {
        let W = size.width, H = size.height
        let cx = W / 2
        // Sand at the foot.
        ctx.fill(Path(ellipseIn: CGRect(x: cx - W * 0.34, y: H - 11, width: W * 0.68, height: 13)),
                 with: .color(p.sandShade.opacity(0.5)))
        // The post itself.
        let post = CGRect(x: cx - W * 0.10, y: H * 0.42, width: W * 0.20, height: H * 0.55)
        ctx.fill(Path(roundedRect: post, cornerRadius: 4),
                 with: .linearGradient(Gradient(colors: [p.woodLight, p.woodDark]),
                                       startPoint: CGPoint(x: post.minX, y: 0),
                                       endPoint: CGPoint(x: post.maxX, y: 0)))
        ctx.stroke(Path(roundedRect: post, cornerRadius: 4),
                   with: .color(p.woodDeep.opacity(0.7)), lineWidth: 1.4)

        switch node.state {
        case .cleared:
            mqDrawCrystal(&ctx, p, center: CGPoint(x: cx, y: H * 0.26), r: W * 0.28, on: true)
        case let .inProgress(collected, total):
            // The current stop is the biggest object on the path, and the only
            // one wearing a lantern glow.
            for i in stride(from: 4, through: 1, by: -1) {
                let r = W * 0.14 * CGFloat(i)
                ctx.fill(Path(ellipseIn: CGRect(x: cx - r, y: H * 0.26 - r,
                                                width: r * 2, height: r * 2)),
                         with: .color(p.gold.opacity(0.10)))
            }
            mqDrawCrystal(&ctx, p, center: CGPoint(x: cx, y: H * 0.24), r: W * 0.34,
                          on: collected * 2 >= total)
        case .open:
            mqDrawCrystal(&ctx, p, center: CGPoint(x: cx, y: H * 0.26), r: W * 0.28, on: false)
        case .comingSoon:
            mqDrawCrystal(&ctx, p, center: CGPoint(x: cx, y: H * 0.26), r: W * 0.24, on: false)
            // A rope lashed across the post. Not a padlock: nothing here is
            // being withheld from the child, it simply is not built yet.
            for dy in [CGFloat(0), 9] {
                ctx.stroke(Path.smoothOpen([
                    CGPoint(x: cx - W * 0.26, y: H * 0.56 + dy),
                    CGPoint(x: cx, y: H * 0.60 + dy),
                    CGPoint(x: cx + W * 0.26, y: H * 0.55 + dy)
                ]), with: .color(p.rope),
                           style: StrokeStyle(lineWidth: 3.4, lineCap: .round))
            }
        }
    }
}

// MARK: - Patchwerk parts

/// The fight clock. An hourglass rather than a digital pill, because everything
/// else in this world is an object and a rounded rect with a colon in it would
/// be the one piece of app furniture on screen.
public struct MQHourglass: View {
    let p: MQPalette
    let time: String
    let fraction: Double     // 0...1 of sand still in the top bulb
    let size: CGFloat
    let urgent: Bool

    public init(_ p: MQPalette = .noon, time: String, fraction: Double,
                size: CGFloat = 56, urgent: Bool = false) {
        self.p = p; self.time = time; self.fraction = fraction
        self.size = size; self.urgent = urgent
    }

    public var body: some View {
        HStack(spacing: 10) {
            Canvas { ctx, s in draw(&ctx, s) }
                .frame(width: size * 0.66, height: size)
            Text(time)
                .font(.mq(size * 0.62, .extrabold))
                .monospacedDigit()
                .foregroundStyle(urgent ? p.gold : p.carved)
                .shadow(color: p.woodDeep.opacity(0.85), radius: 0, x: 0, y: 2)
        }
    }

    private func draw(_ ctx: inout GraphicsContext, _ s: CGSize) {
        let W = s.width, H = s.height
        for r in [CGRect(x: 0, y: 0, width: W, height: H * 0.10),
                  CGRect(x: 0, y: H * 0.90, width: W, height: H * 0.10)] {
            ctx.fill(Path(roundedRect: r, cornerRadius: W * 0.08),
                     with: .linearGradient(Gradient(colors: [p.woodLight, p.woodDark]),
                                           startPoint: CGPoint(x: 0, y: r.minY),
                                           endPoint: CGPoint(x: 0, y: r.maxY)))
        }
        for x in [W * 0.06, W * 0.94] {
            ctx.fill(Path(roundedRect: CGRect(x: x - W * 0.035, y: H * 0.08,
                                              width: W * 0.07, height: H * 0.84),
                          cornerRadius: W * 0.03), with: .color(p.woodDark))
        }
        // Glass: two bulbs meeting at a waist.
        let glass = Path.smoothClosed([
            CGPoint(x: W * 0.18, y: H * 0.12), CGPoint(x: W * 0.82, y: H * 0.12),
            CGPoint(x: W * 0.56, y: H * 0.50), CGPoint(x: W * 0.82, y: H * 0.88),
            CGPoint(x: W * 0.18, y: H * 0.88), CGPoint(x: W * 0.44, y: H * 0.50)
        ], tension: 0.18)
        ctx.fill(glass, with: .color(p.parchment.opacity(0.30)))
        // Sand still in the top bulb, drawn as a trapezoid that follows the
        // glass wall. (Deliberately not a Path boolean: `Path.intersection` is
        // newer than this package's macOS 13 / iOS 16 floor.)
        let f = CGFloat(max(0, min(1, fraction)))
        let waistY = H * 0.50, topY = H * 0.13
        let sandTopY = waistY - (waistY - topY) * f
        func halfWidth(at y: CGFloat) -> CGFloat {
            let t = (y - topY) / (waistY - topY)          // 0 at the top, 1 at the waist
            return (W * 0.32) + (W * 0.06 - W * 0.32) * t
        }
        if f > 0.01 {
            let hwTop = halfWidth(at: sandTopY), hwWaist = halfWidth(at: waistY)
            ctx.fill(Path { g in
                g.move(to: CGPoint(x: W / 2 - hwTop, y: sandTopY))
                g.addLine(to: CGPoint(x: W / 2 + hwTop, y: sandTopY))
                g.addLine(to: CGPoint(x: W / 2 + hwWaist, y: waistY))
                g.addLine(to: CGPoint(x: W / 2 - hwWaist, y: waistY))
                g.closeSubpath()
            }, with: .color(p.gold))
        }
        ctx.fill(Path.smoothClosed([
            CGPoint(x: W * 0.20, y: H * 0.87), CGPoint(x: W * 0.50, y: H * 0.72),
            CGPoint(x: W * 0.80, y: H * 0.87)
        ], tension: 0.3), with: .color(p.gold))
        ctx.stroke(Path { $0.move(to: CGPoint(x: W * 0.50, y: H * 0.50))
                          $0.addLine(to: CGPoint(x: W * 0.50, y: H * 0.74)) },
                   with: .color(p.gold.opacity(0.9)), lineWidth: 2)
        ctx.stroke(glass, with: .color(p.parchment.opacity(0.55)), lineWidth: 2)
    }
}

/// The stack counter, as a spar of crystals rather than a debuff badge.
///
/// The Patchwerk note flagged the borrowed `x10 (2.00x)` badge as the one thing
/// Kevin has to judge by eye. This is the storybook answer to it: the number
/// stays, because a child chasing stacks wants to read it, but it sits on a
/// carved plate beside a row a child can COUNT -- ten notches, filling toward
/// the cap.
public struct MQStackSpar: View {
    let p: MQPalette
    let stacks: Int
    let cap: Int
    let multiplier: String
    let compact: Bool

    public init(_ p: MQPalette = .noon, stacks: Int, cap: Int,
                multiplier: String, compact: Bool = false) {
        self.p = p; self.stacks = stacks; self.cap = cap
        self.multiplier = multiplier; self.compact = compact
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 1) {
            HStack(alignment: .firstTextBaseline, spacing: 6) {
                Text("x\(stacks)")
                    .font(.mq(compact ? 22 : 30, .extrabold))
                    .monospacedDigit()
                    .foregroundStyle(p.gold)
                Text(multiplier)
                    .font(.mq(compact ? 12 : 15, .bold))
                    .monospacedDigit()
                    .foregroundStyle(p.carved.opacity(0.78))
            }
            .shadow(color: p.woodDeep.opacity(0.85), radius: 0, x: 0, y: 2)
            Canvas { ctx, size in
                let step = size.width / CGFloat(cap)
                ctx.fill(Path(roundedRect: CGRect(x: 0, y: size.height * 0.40,
                                                  width: size.width, height: size.height * 0.20),
                              cornerRadius: size.height * 0.10),
                         with: .color(p.woodDeep.opacity(0.55)))
                for i in 0..<cap {
                    mqDrawCrystal(&ctx, p,
                                  center: CGPoint(x: step * (CGFloat(i) + 0.5),
                                                  y: size.height / 2),
                                  r: min(step * 0.36, size.height * 0.42),
                                  on: i < stacks)
                }
            }
            .frame(width: CGFloat(cap) * (compact ? 13 : 17), height: compact ? 18 : 24)
        }
    }
}

/// Freeze credits, as shards of ice on a cord. `frost` is the only cold colour
/// in the whole palette, which is what makes one pip readable at a glance in a
/// scene otherwise built entirely of warm wood and sand.
public struct MQFreezePips: View {
    let p: MQPalette
    let held: Int
    let total: Int
    let size: CGFloat

    public init(_ p: MQPalette = .noon, held: Int, total: Int, size: CGFloat = 26) {
        self.p = p; self.held = held; self.total = total; self.size = size
    }

    public var body: some View {
        Canvas { ctx, s in
            let step = s.width / CGFloat(total)
            for i in 0..<total {
                let c = CGPoint(x: step * (CGFloat(i) + 0.5), y: s.height / 2)
                let r = min(step * 0.40, s.height * 0.46)
                let on = i < held
                let shard = Path { g in
                    g.move(to: CGPoint(x: c.x, y: c.y - r * 1.2))
                    g.addLine(to: CGPoint(x: c.x + r * 0.72, y: c.y - r * 0.30))
                    g.addLine(to: CGPoint(x: c.x + r * 0.44, y: c.y + r * 1.1))
                    g.addLine(to: CGPoint(x: c.x - r * 0.44, y: c.y + r * 1.1))
                    g.addLine(to: CGPoint(x: c.x - r * 0.72, y: c.y - r * 0.30))
                    g.closeSubpath()
                }
                if on {
                    for k in stride(from: 3, through: 1, by: -1) {
                        let rr = r * (1.0 + CGFloat(k) * 0.34)
                        ctx.fill(Path(ellipseIn: CGRect(x: c.x - rr, y: c.y - rr,
                                                        width: rr * 2, height: rr * 2)),
                                 with: .color(p.frost.opacity(0.10)))
                    }
                }
                ctx.fill(shard, with: .linearGradient(
                    Gradient(colors: on ? [p.frost.lit(0.45), p.frost, p.frostDeep]
                                        : [p.woodDark.opacity(0.5), p.woodDeep.opacity(0.6)]),
                    startPoint: CGPoint(x: c.x - r, y: c.y - r),
                    endPoint: CGPoint(x: c.x + r, y: c.y + r)))
                ctx.stroke(shard, with: .color(on ? p.frostDeep : p.woodDeep.opacity(0.8)),
                           style: StrokeStyle(lineWidth: 2, lineJoin: .round))
                ctx.stroke(Path { g in
                    g.move(to: CGPoint(x: c.x, y: c.y - r * 1.0))
                    g.addLine(to: CGPoint(x: c.x, y: c.y + r * 0.9))
                }, with: .color(.white.opacity(on ? 0.55 : 0.10)), lineWidth: 1.6)
            }
        }
        .frame(width: CGFloat(total) * size, height: size)
    }
}

/// One number that is the whole point of the screen, carved into a slab.
public struct MQCarvedNumber: View {
    let p: MQPalette
    let value: String
    let caption: String
    let valueSize: CGFloat
    let tint: Color?

    public init(_ p: MQPalette = .noon, value: String, caption: String,
                valueSize: CGFloat, tint: Color? = nil) {
        self.p = p; self.value = value; self.caption = caption
        self.valueSize = valueSize; self.tint = tint
    }

    public var body: some View {
        VStack(spacing: -valueSize * 0.10) {
            Text(value)
                .font(.mq(valueSize, .extrabold))
                .monospacedDigit()
                .foregroundStyle(tint ?? p.gold)
                .shadow(color: p.woodDeep.opacity(0.9), radius: 0, x: 0, y: 3)
            Text(caption)
                .font(.mq(max(11, valueSize * 0.24), .bold))
                // **Full strength, not 82%.** Measured on the rehearsal fix pass:
                // this cream at 0.82 alpha over `MQRail`'s light stop
                // (`woodDark`) is 4.19:1, which misses WCAG AA by 0.31 - and the
                // 18% IS the whole of the cause, because the same cream at full
                // strength measures 5.34:1. This is the HUD's "damage" caption,
                // one of the strings behind the parent's "white captions on pale
                // sand" (Phase 1 dress rehearsal, parent's list item 9).
                .foregroundStyle(p.captionOnDark)
                .shadow(color: p.woodDeep.opacity(0.7), radius: 0, x: 0, y: 1.5)
        }
    }
}

// MARK: - A dark rail to hang a HUD from

/// A length of oiled driftwood, lashed at both ends.
///
/// Patchwerk's readouts are gold and cream, and at noon they sat on an open sky
/// where "1.70x" in cream on a cloud is invisible. A dark plank behind the row
/// fixes that at BOTH times of day with one object rather than two colour sets,
/// which is the whole argument for building chrome out of things instead of
/// tinting text per mode.
public struct MQRail<Content: View>: View {
    let p: MQPalette
    let padH: CGFloat
    let padV: CGFloat
    let content: Content

    public init(_ p: MQPalette = .noon, padH: CGFloat = 18, padV: CGFloat = 8,
                @ViewBuilder content: () -> Content) {
        self.p = p; self.padH = padH; self.padV = padV; self.content = content()
    }

    public var body: some View {
        content
            .padding(.horizontal, padH)
            .padding(.vertical, padV)
            .background {
                Canvas { ctx, size in
                    let r = CGRect(origin: .zero, size: size)
                    let radius = min(18, size.height / 2)
                    ctx.fill(Path(roundedRect: r.offsetBy(dx: 0, dy: 4), cornerRadius: radius),
                             with: .color(p.woodDeep.opacity(0.55)))
                    ctx.fill(Path(roundedRect: r, cornerRadius: radius),
                             with: .linearGradient(
                                Gradient(colors: [p.woodDark, p.woodDeep]),
                                startPoint: .zero, endPoint: CGPoint(x: 0, y: size.height)))
                    ctx.stroke(Path(roundedRect: r.insetBy(dx: 1.2, dy: 1.2),
                                    cornerRadius: radius),
                               with: .color(p.woodDeep), lineWidth: 2.4)
                    ctx.stroke(Path(roundedRect: r.insetBy(dx: 4, dy: 4), cornerRadius: radius - 3),
                               with: .color(p.woodLight.opacity(0.20)), lineWidth: 1.6)
                    for i in 0..<3 {
                        let y = size.height * (0.26 + CGFloat(i) * 0.24)
                        ctx.stroke(Path.smoothOpen([CGPoint(x: 14, y: y),
                                                    CGPoint(x: size.width * 0.5, y: y + 2),
                                                    CGPoint(x: size.width - 14, y: y - 1)]),
                                   with: .color(.black.opacity(0.10)), lineWidth: 1.6)
                    }
                    // Rope whipping at both ends.
                    for x in [radius, size.width - radius] {
                        ctx.fill(Path(roundedRect: CGRect(x: x - 4, y: -2,
                                                          width: 8, height: size.height + 4),
                                      cornerRadius: 4), with: .color(p.rope.opacity(0.9)))
                    }
                }
            }
    }
}

// MARK: - Results: a quest log, unrolled

/// A parchment sheet on two dowels. Deliberately a DIFFERENT object from the
/// battle signboard: a signboard is planted where a question is asked, a scroll
/// is what you take away afterwards, and a child should be able to tell the two
/// screens apart from across a room.
public struct MQScroll<Content: View>: View {
    let p: MQPalette
    let padH: CGFloat
    let padV: CGFloat
    let content: Content

    public init(_ p: MQPalette = .noon, padH: CGFloat = 26, padV: CGFloat = 20,
                @ViewBuilder content: () -> Content) {
        self.p = p; self.padH = padH; self.padV = padV; self.content = content()
    }

    /// The dowels eat 15pt off each end of the sheet, so the content has to
    /// clear them -- otherwise the first heading and the last line of the last
    /// row are rolled up inside the wood, which is exactly what the first
    /// render did.
    private var dowel: CGFloat { 15 }

    public var body: some View {
        content
            .padding(.horizontal, padH)
            .padding(.vertical, padV + dowel + 6)
            .frame(maxWidth: .infinity)
            .background { Canvas { ctx, size in draw(&ctx, size) } }
    }

    private func draw(_ ctx: inout GraphicsContext, _ size: CGSize) {
        let W = size.width, H = size.height
        let dowel = self.dowel

        for i in 0..<3 {
            let t = CGFloat(i)
            ctx.fill(Path(roundedRect: CGRect(x: 6 + t * 4, y: dowel + 8 + t * 4,
                                              width: W, height: H - dowel * 2),
                          cornerRadius: 6),
                     with: .color(p.sandShade.opacity(0.14)))
        }
        // Sheet.
        let sheet = CGRect(x: 0, y: dowel, width: W, height: H - dowel * 2)
        var edge: [CGPoint] = []
        let steps = 44
        for i in 0..<steps {
            let a = CGFloat(i) / CGFloat(steps) * 2 * .pi
            let jitter = sin(CGFloat(i) * 2.13) * 1.3 + sin(CGFloat(i) * 0.77) * 0.9
            let k: CGFloat = 9
            let cs = cos(a), sn = sin(a)
            edge.append(CGPoint(
                x: sheet.midX + copysign(pow(abs(cs), 2 / k), cs) * (sheet.width / 2 + jitter),
                y: sheet.midY + copysign(pow(abs(sn), 2 / k), sn) * (sheet.height / 2 + jitter)))
        }
        let paper = Path.smoothClosed(edge, tension: 0.22)
        ctx.fill(paper, with: .radialGradient(
            Gradient(colors: [p.parchment, p.parchment, p.parchmentEdge]),
            center: CGPoint(x: sheet.midX - sheet.width * 0.18, y: sheet.midY - sheet.height * 0.2),
            startRadius: 0, endRadius: max(sheet.width, sheet.height) * 0.72))
        ctx.fill(Path(ellipseIn: CGRect(x: sheet.maxX - 96, y: sheet.minY + 14,
                                        width: 72, height: 34)),
                 with: .color(p.parchmentEdge.opacity(0.40)))
        ctx.fill(Path(ellipseIn: CGRect(x: sheet.minX + 30, y: sheet.maxY - 44,
                                        width: 62, height: 28)),
                 with: .color(p.parchmentEdge.opacity(0.32)))

        // Two dowels, with the sheet curling over each.
        for y in [CGFloat(0), H - dowel * 2] {
            let r = CGRect(x: -6, y: y, width: W + 12, height: dowel * 2)
            ctx.fill(Path(roundedRect: r, cornerRadius: dowel),
                     with: .linearGradient(
                        Gradient(colors: [p.woodLight, p.wood, p.woodDark]),
                        startPoint: CGPoint(x: 0, y: r.minY), endPoint: CGPoint(x: 0, y: r.maxY)))
            ctx.stroke(Path(roundedRect: r.insetBy(dx: 1, dy: 1), cornerRadius: dowel),
                       with: .color(p.woodDeep.opacity(0.75)), lineWidth: 2)
            for cx in [r.minX + dowel, r.maxX - dowel] {
                ctx.fill(Path(ellipseIn: CGRect(x: cx - dowel * 0.62, y: r.midY - dowel * 0.62,
                                                width: dowel * 1.24, height: dowel * 1.24)),
                         with: .color(p.woodDeep.opacity(0.35)))
            }
        }
    }
}
