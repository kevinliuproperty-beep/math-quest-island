import SwiftUI

// The same two characters, restyled for the cabinet.
//
// Storybook shades with light; arcade shades with LUMINANCE STEPS -- a flat
// base, one hard cel shadow, and a rim light on the edge facing the arena.
// Nothing is soft, because a soft edge in a dark scene disappears.
//
// Posture is the second half of the direction. The unicorn is braced forward
// mid-charge with its ears back and its horn lit; the crab is rearing with both
// claws up and, right now, taking a hit. A creature standing squarely facing
// the camera is a mascot; a creature leaning is in a fight.

public struct ArcadeUnicorn: View {
    let p: ArcadePalette
    public init(_ p: ArcadePalette = .standard) { self.p = p }

    static let box = CGSize(width: 250, height: 250)

    public var body: some View {
        MQFigureCanvas(box: Self.box) { ctx, _ in Self.draw(&ctx, p) }
    }

    // Same skeleton and same chibi proportions as the storybook hero -- one
    // character, two costumes -- but braced forward, ears back, and lit from
    // the arena rather than from the sun.
    static func draw(_ ctx: inout GraphicsContext, _ p: ArcadePalette) {
        let coat     = Color(hex: 0xF0F1FF)
        let coatMid  = Color(hex: 0xBEC1EE)
        let coatDark = Color(hex: 0x6E6FBC)
        let coatEdge = Color(hex: 0x2E2270)
        let mane1    = Color(hex: 0x8B5CFF)
        let mane2    = Color(hex: 0x2FE6BE)
        let maneHi   = Color(hex: 0xC6A9FF)
        let rim      = p.mint

        // Glow pool on the floor.
        for i in stride(from: 5, through: 1, by: -1) {
            let rx = CGFloat(i) * 23
            ctx.fill(Path(ellipseIn: CGRect(x: 110 - rx, y: 226 - rx * 0.22,
                                            width: rx * 2, height: rx * 0.44)),
                     with: .color(p.mint.opacity(0.08)))
        }

        // Tail: streaming back, angular.
        ctx.paint(Path.smoothClosed([
            CGPoint(x: 62, y: 152), CGPoint(x: 26, y: 138), CGPoint(x: 2, y: 158),
            CGPoint(x: 14, y: 176), CGPoint(x: 4, y: 206), CGPoint(x: 34, y: 200),
            CGPoint(x: 44, y: 176), CGPoint(x: 66, y: 166)
        ], tension: 0.36), mane1, edge: coatEdge, width: 2.4)
        ctx.fill(Path.smoothClosed([
            CGPoint(x: 58, y: 156), CGPoint(x: 28, y: 148), CGPoint(x: 16, y: 168),
            CGPoint(x: 34, y: 172), CGPoint(x: 48, y: 168)
        ], tension: 0.36), with: .color(mane2.opacity(0.85)))

        // Mane: swept back off the crest, inner edge hugging the neck, outer
        // edge cut into shards rather than curled.
        ctx.paint(Path.smoothClosed([
            CGPoint(x: 162, y: 42), CGPoint(x: 138, y: 20), CGPoint(x: 110, y: 20),
            CGPoint(x: 84, y: 36), CGPoint(x: 66, y: 62), CGPoint(x: 56, y: 96),
            CGPoint(x: 52, y: 130), CGPoint(x: 62, y: 156), CGPoint(x: 80, y: 174),
            CGPoint(x: 106, y: 166), CGPoint(x: 103, y: 130), CGPoint(x: 110, y: 99),
            CGPoint(x: 122, y: 74), CGPoint(x: 140, y: 57), CGPoint(x: 158, y: 51)
        ], tension: 0.38), gradient: Gradient(colors: [mane1, mane1.mixed(with: mane2, by: 0.75)]),
                  from: CGPoint(x: 150, y: 34), to: CGPoint(x: 70, y: 170),
                  edge: coatEdge, width: 2.6)
        for strand in [[CGPoint(x: 150, y: 38), CGPoint(x: 116, y: 36),
                        CGPoint(x: 88, y: 64), CGPoint(x: 74, y: 108)],
                       [CGPoint(x: 70, y: 132), CGPoint(x: 72, y: 158),
                        CGPoint(x: 88, y: 168)]] {
            ctx.stroke(Path.smoothOpen(strand), with: .color(maneHi),
                       style: StrokeStyle(lineWidth: 8, lineCap: .round))
        }

        // Far legs.
        ctx.paint(mqLimb(from: CGPoint(x: 104, y: 190), to: CGPoint(x: 84, y: 224),
                         wide: 21, narrow: 14, bow: -3), coatDark)
        ctx.paint(mqLimb(from: CGPoint(x: 76, y: 190), to: CGPoint(x: 56, y: 222),
                         wide: 20, narrow: 13, bow: -3), coatDark)

        // Body.
        let body = Path.smoothClosed([
            CGPoint(x: 68, y: 138), CGPoint(x: 102, y: 128), CGPoint(x: 136, y: 140),
            CGPoint(x: 150, y: 170), CGPoint(x: 136, y: 198), CGPoint(x: 100, y: 208),
            CGPoint(x: 64, y: 198), CGPoint(x: 52, y: 168)
        ], tension: 0.55)
        ctx.paint(body, gradient: Gradient(colors: [coat, coatMid]),
                  from: CGPoint(x: 74, y: 128), to: CGPoint(x: 120, y: 210),
                  edge: coatEdge, width: 2.6)
        // One hard cel shadow.
        ctx.fill(Path.smoothClosed([
            CGPoint(x: 60, y: 182), CGPoint(x: 98, y: 202), CGPoint(x: 142, y: 188),
            CGPoint(x: 146, y: 174), CGPoint(x: 100, y: 192), CGPoint(x: 62, y: 170)
        ], tension: 0.6), with: .color(coatDark.opacity(0.85)))

        // Near legs: front planted forward, hind pushed back.
        ctx.paint(mqLimb(from: CGPoint(x: 132, y: 186), to: CGPoint(x: 162, y: 226),
                         wide: 26, narrow: 16, bow: 5), coat, edge: coatEdge, width: 2.4)
        ctx.paint(mqLimb(from: CGPoint(x: 66, y: 186), to: CGPoint(x: 34, y: 226),
                         wide: 26, narrow: 16, bow: -5), coat, edge: coatEdge, width: 2.4)
        for x in [CGFloat(152), CGFloat(24)] {
            ctx.paint(Path(roundedRect: CGRect(x: x, y: 218, width: 23, height: 14),
                           cornerRadius: 5), p.mint, edge: coatEdge, width: 2)
        }

        // Neck, lowered into the charge.
        ctx.paint(Path.smoothClosed([
            CGPoint(x: 108, y: 146), CGPoint(x: 126, y: 100), CGPoint(x: 160, y: 94),
            CGPoint(x: 164, y: 130), CGPoint(x: 142, y: 154)
        ], tension: 0.5), gradient: Gradient(colors: [coat, coatMid]),
                  from: CGPoint(x: 120, y: 98), to: CGPoint(x: 160, y: 154),
                  edge: coatEdge, width: 2.6)

        // Head.
        let head = Path.smoothClosed([
            CGPoint(x: 134, y: 82), CGPoint(x: 154, y: 56), CGPoint(x: 186, y: 52),
            CGPoint(x: 212, y: 68), CGPoint(x: 230, y: 90), CGPoint(x: 232, y: 110),
            CGPoint(x: 214, y: 124), CGPoint(x: 184, y: 126), CGPoint(x: 152, y: 116),
            CGPoint(x: 134, y: 100)
        ], tension: 0.55)
        ctx.paint(head, gradient: Gradient(colors: [coat, coatMid]),
                  from: CGPoint(x: 146, y: 54), to: CGPoint(x: 218, y: 128),
                  edge: coatEdge, width: 2.6)
        ctx.fill(Path.smoothClosed(mqBlob(center: CGPoint(x: 213, y: 102),
                                          rx: 21, ry: 16, wobble: 0.10)),
                 with: .color(coatMid.opacity(0.7)))

        // Ear laid back. Kept small and coat-shaded: at ear size, a big white
        // wedge beside a horn just reads as a second horn.
        ctx.paint(Path.smoothClosed([
            CGPoint(x: 152, y: 68), CGPoint(x: 126, y: 40), CGPoint(x: 158, y: 50)
        ], tension: 0.28), coatMid, edge: coatEdge, width: 2.2)

        // Horn: the brightest object on the hero. Halo, blade, core. Its base
        // is wide and planted on the forehead -- a thin spike floating above
        // the skull reads as a party hat.
        let hornL = CGPoint(x: 164, y: 58), hornR = CGPoint(x: 192, y: 60)
        let hornTip = CGPoint(x: 194, y: 4)
        for i in stride(from: 7, through: 1, by: -1) {
            let r = CGFloat(i) * 8
            ctx.fill(Path(ellipseIn: CGRect(x: hornTip.x - r, y: hornTip.y + 10 - r,
                                            width: r * 2, height: r * 2)),
                     with: .color(p.gold.opacity(0.055)))
        }
        ctx.paint(Path.smoothClosed([hornL, hornTip, hornR], tension: 0.08),
                  gradient: Gradient(colors: [Color(hex: 0xFFF7CE), p.gold, p.goldDeep]),
                  from: hornTip, to: CGPoint(x: 181, y: 54),
                  edge: Color(hex: 0x6E4200), width: 2)
        ctx.stroke(Path.smoothOpen([CGPoint(x: 168, y: 56), hornTip]),
                   with: .color(.white.opacity(0.95)),
                   style: StrokeStyle(lineWidth: 2.8, lineCap: .round))

        // Forelock, tucked behind the horn base.
        ctx.paint(Path.smoothClosed([
            CGPoint(x: 152, y: 60), CGPoint(x: 178, y: 64), CGPoint(x: 170, y: 84),
            CGPoint(x: 148, y: 78)
        ], tension: 0.55), mane1, edge: coatEdge, width: 2)

        // Eye, lit, on the target. Sized to the storybook hero's: the same
        // character has to have the same eye.
        ctx.fill(Path(ellipseIn: CGRect(x: 183, y: 78, width: 27, height: 30)),
                 with: .color(Color(hex: 0x140C36)))
        ctx.fill(Path(ellipseIn: CGRect(x: 188, y: 83, width: 16, height: 17)),
                 with: .color(p.mint))
        ctx.fill(Path(ellipseIn: CGRect(x: 191, y: 85, width: 7, height: 7)),
                 with: .color(.white))
        // Brow: a few degrees of tilt is the difference between determined and
        // startled.
        ctx.stroke(Path.smoothOpen([CGPoint(x: 178, y: 76), CGPoint(x: 196, y: 69),
                                    CGPoint(x: 212, y: 76)]),
                   with: .color(coatEdge), style: StrokeStyle(lineWidth: 4.8, lineCap: .round))
        ctx.fill(Path(ellipseIn: CGRect(x: 219, y: 99, width: 6.5, height: 8)),
                 with: .color(coatEdge.opacity(0.85)))

        // Rim light along the leading edges only -- never across a face. This
        // one pass is what makes flat vector shapes sit inside a dark scene
        // instead of on top of it.
        for stroke in [[CGPoint(x: 200, y: 60), CGPoint(x: 222, y: 78),
                        CGPoint(x: 232, y: 102)],
                       [CGPoint(x: 138, y: 148), CGPoint(x: 150, y: 172),
                        CGPoint(x: 144, y: 196)],
                       [CGPoint(x: 140, y: 190), CGPoint(x: 160, y: 214)]] {
            ctx.stroke(Path.smoothOpen(stroke), with: .color(rim),
                       style: StrokeStyle(lineWidth: 3.6, lineCap: .round))
        }
    }
}

public struct ArcadeCrab: View {
    let p: ArcadePalette
    /// 0 = at rest, 1 = the frame the answer lands. Shown mid-flash here, which
    /// is the state the first sample could not show at all.
    let flash: Double

    public init(_ p: ArcadePalette = .standard, flash: Double = 0) {
        self.p = p; self.flash = flash
    }

    static let box = CGSize(width: 230, height: 210)

    public var body: some View {
        MQFigureCanvas(box: Self.box) { ctx, _ in Self.draw(&ctx, p, flash: flash) }
    }

    static func draw(_ ctx: inout GraphicsContext, _ p: ArcadePalette, flash: Double) {
        let shell     = Color(hex: 0xFF5A5A)
        let shellDark = Color(hex: 0xA51B3E)
        let shellEdge = Color(hex: 0x4A0A24)
        let shellHi   = Color(hex: 0xFF9A86)
        let rim       = Color(hex: 0xFF3D71)

        for i in stride(from: 5, through: 1, by: -1) {
            let rx = CGFloat(i) * 21
            ctx.fill(Path(ellipseIn: CGRect(x: 115 - rx, y: 182 - rx * 0.22,
                                            width: rx * 2, height: rx * 0.44)),
                     with: .color(p.rose.opacity(0.075)))
        }

        // Legs, angular and braced: thigh out, shin down.
        for side in [-1.0, 1.0] as [CGFloat] {
            for i in 0..<3 {
                let t = CGFloat(i) / 2
                let hip = CGPoint(x: 115 + side * (36 + t * 20), y: 120 + t * 6)
                let knee = CGPoint(x: 115 + side * (62 + t * 32), y: 108 + t * 12)
                let foot = CGPoint(x: 115 + side * (72 + t * 40), y: 176 - t * 6)
                ctx.paint(mqLimb(from: hip, to: knee, wide: 16 - t * 3, narrow: 12 - t * 2),
                          shell, edge: shellEdge, width: 2)
                ctx.paint(mqLimb(from: knee, to: foot, wide: 12 - t * 2, narrow: 5),
                          shellDark, edge: shellEdge, width: 1.8)
            }
        }

        // Shell: angular, spiked, reared up.
        let body = Path.smoothClosed([
            CGPoint(x: 46, y: 112), CGPoint(x: 62, y: 76), CGPoint(x: 92, y: 58),
            CGPoint(x: 116, y: 54), CGPoint(x: 146, y: 62), CGPoint(x: 172, y: 84),
            CGPoint(x: 184, y: 114), CGPoint(x: 168, y: 138), CGPoint(x: 114, y: 148),
            CGPoint(x: 58, y: 136)
        ], tension: 0.42)
        ctx.paint(body, gradient: Gradient(colors: [shellHi, shell, shellDark]),
                  from: CGPoint(x: 88, y: 52), to: CGPoint(x: 140, y: 150),
                  edge: shellEdge, width: 2.6)
        // Cel shadow.
        ctx.fill(Path.smoothClosed([
            CGPoint(x: 60, y: 124), CGPoint(x: 114, y: 146), CGPoint(x: 178, y: 122),
            CGPoint(x: 182, y: 108), CGPoint(x: 116, y: 130), CGPoint(x: 56, y: 106)
        ], tension: 0.5), with: .color(shellDark.opacity(0.8)))
        // Spikes along the crest.
        for (x, h) in [(78.0, 16.0), (100.0, 22.0), (124.0, 22.0), (148.0, 15.0)] {
            let bx = CGFloat(x), bh = CGFloat(h)
            let top = 58 + abs(bx - 116) * 0.14
            ctx.paint(Path.smoothClosed([
                CGPoint(x: bx - 11, y: top + 6), CGPoint(x: bx, y: top - bh),
                CGPoint(x: bx + 11, y: top + 6)
            ], tension: 0.16), shellDark, edge: shellEdge, width: 2)
        }
        // Plate seams.
        for t in [0.36, 0.64] as [CGFloat] {
            ctx.stroke(Path.smoothOpen([
                CGPoint(x: 46 + 138 * t, y: 66), CGPoint(x: 50 + 134 * t, y: 104),
                CGPoint(x: 54 + 128 * t, y: 142)
            ]), with: .color(shellEdge.opacity(0.5)), lineWidth: 2)
        }

        // Both claws up.
        StorybookCrab.drawClaw(&ctx, hinge: CGPoint(x: 56, y: 100), tip: CGPoint(x: 20, y: 52),
                               scale: 1.05, open: 0.95, shell: shell, light: shellHi,
                               deep: shellDark, edge: shellEdge)
        StorybookCrab.drawClaw(&ctx, hinge: CGPoint(x: 176, y: 98), tip: CGPoint(x: 212, y: 46),
                               scale: 1.12, open: 1.0, shell: shell, light: shellHi,
                               deep: shellDark, edge: shellEdge)

        // Eyes on stalks, narrowed, with brows.
        for (bx, tx, dir) in [(94.0, 82.0, -1.0), (138.0, 152.0, 1.0)] {
            let base = CGPoint(x: bx, y: 64), top = CGPoint(x: tx, y: 26)
            ctx.paint(mqLimb(from: base, to: top, wide: 12, narrow: 9,
                             bow: (top.x - base.x) * 0.18), shell, edge: shellEdge, width: 2)
            let r: CGFloat = 16
            ctx.paint(Path(ellipseIn: CGRect(x: top.x - r, y: top.y - r,
                                             width: r * 2, height: r * 2)),
                      Color(hex: 0xFFF0D8), edge: shellEdge, width: 2.2)
            ctx.fill(Path(ellipseIn: CGRect(x: top.x - r * 0.36 + dir * 3,
                                            y: top.y - r * 0.44,
                                            width: r * 0.78, height: r * 0.94)),
                     with: .color(Color(hex: 0x2A0A18)))
            ctx.fill(Path(ellipseIn: CGRect(x: top.x - r * 0.30 + dir * 3, y: top.y - r * 0.40,
                                            width: r * 0.30, height: r * 0.30)),
                     with: .color(.white))
            // Angry brow: a wedge cutting into the top of the eye.
            ctx.fill(Path.smoothClosed([
                CGPoint(x: top.x - r * 1.05, y: top.y - r * (dir < 0 ? 0.72 : 1.02)),
                CGPoint(x: top.x + r * 1.05, y: top.y - r * (dir < 0 ? 1.02 : 0.72)),
                CGPoint(x: top.x + r * 1.05, y: top.y - r * 1.45),
                CGPoint(x: top.x - r * 1.05, y: top.y - r * 1.45)
            ], tension: 0.05), with: .color(shellDark))
        }

        // Grimace.
        ctx.stroke(Path.smoothOpen([CGPoint(x: 96, y: 122), CGPoint(x: 116, y: 112),
                                    CGPoint(x: 136, y: 122)]),
                   with: .color(shellEdge), style: StrokeStyle(lineWidth: 4, lineCap: .round))

        // Rim light along the edge facing the hero.
        ctx.stroke(Path.smoothOpen([
            CGPoint(x: 184, y: 116), CGPoint(x: 172, y: 84), CGPoint(x: 144, y: 62)
        ]), with: .color(rim), style: StrokeStyle(lineWidth: 3.4, lineCap: .round))

        // ---- HIT FLASH. The monster taking damage IS the feedback; there is
        // no shaming visual anywhere in this system, which is the Patchwerk
        // kid-safety rule drawn rather than described.
        if flash > 0.01 {
            ctx.fill(body, with: .color(Color(hex: 0xFFE7B0).opacity(0.40 * flash)))
            let impact = CGPoint(x: 80, y: 88)
            // A warm burst, not white glass: the flash has to say "your answer
            // landed", not "the shell shattered".
            for i in stride(from: 4, through: 1, by: -1) {
                let r = CGFloat(i) * 15
                ctx.fill(Path(ellipseIn: CGRect(x: impact.x - r, y: impact.y - r,
                                                width: r * 2, height: r * 2)),
                         with: .color(Color(hex: 0xFFC94A).opacity(0.13 * flash)))
            }
            for i in 0..<8 {
                let a = CGFloat(i) * .pi * 2 / 8 - 0.35
                let inner = CGFloat(16), outer = CGFloat(40 + CGFloat((i % 3) * 12))
                ctx.fill(Path.smoothClosed([
                    CGPoint(x: impact.x + cos(a) * inner, y: impact.y + sin(a) * inner),
                    CGPoint(x: impact.x + cos(a + 0.10) * outer, y: impact.y + sin(a + 0.10) * outer),
                    CGPoint(x: impact.x + cos(a + 0.30) * inner, y: impact.y + sin(a + 0.30) * inner)
                ], tension: 0.02), with: .color(Color(hex: 0xFFDE7A).opacity(0.9 * flash)))
            }
            ctx.fill(Path.star(center: impact, points: 4, outer: 34, inner: 7),
                     with: .color(Color(hex: 0xFFF8DC).opacity(0.95 * flash)))
        }
    }
}
