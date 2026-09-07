import SwiftUI

// The cast, drawn.
//
// The rejected sample used 🦄 and 🕷️ in circles. A parent comparing this to
// Toca Boca sees a system glyph in a ring and reads "placeholder", correctly.
// These are Paths: fill, cel shadow on the side away from the sun, a warm rim
// where the sun catches, a coloured edge instead of a black outline, and a
// contact shadow on the sand so they stand in the world.
//
// Skitters is a CRAB, not a spider. Two reasons and one of them is not taste:
// a crab has a wide, symmetrical, unmistakable silhouette at 40pt, where a
// spider goes to a smudge; and a crab belongs on Shape Shore. A monster a
// seven-year-old finds cheeky rather than frightening is also the kid-safety
// posture the Patchwerk work already committed to.

// MARK: - Hero

public struct StorybookUnicorn: View {
    let p: StorybookPalette
    public init(_ p: StorybookPalette = .noon) { self.p = p }

    static let box = CGSize(width: 240, height: 250)

    public var body: some View {
        MQFigureCanvas(box: Self.box) { ctx, _ in Self.draw(&ctx, p) }
    }

    // Proportions are deliberately chibi -- head about a third of the whole
    // figure, stubby legs, big eye. That is not "cuter for its own sake": at
    // rail size the head is the only part with any information in it, and a
    // realistic horse's head at this scale is four pixels of muzzle.
    //
    // The mane is drawn BEHIND the neck as one flowing crescent. The first
    // attempt stacked round lobes ON the neck and the result read as a spine,
    // not as hair.
    static func draw(_ ctx: inout GraphicsContext, _ p: StorybookPalette) {
        let coat      = Color(hex: 0xFFF7EA)
        let coatShade = Color(hex: 0xEBD3B6)
        let coatDeep  = Color(hex: 0xD5B492)
        let coatEdge  = Color(hex: 0xB98F63)
        let mane      = Color(hex: 0xC08AE2)
        let maneLight = Color(hex: 0xE6BEF5)
        let maneDeep  = Color(hex: 0x8E58B4)
        let hoof      = Color(hex: 0x9E7748)

        // Contact shadow on the sand, thrown right by the low left sun.
        for i in 0..<4 {
            let t = CGFloat(i) / 3
            ctx.fill(Path(ellipseIn: CGRect(x: 42 - t * 14, y: 222 - t * 3,
                                            width: 110 + t * 32, height: 17 + t * 6)),
                     with: .color(p.sandShade.opacity(0.32 * (1 - Double(t) * 0.7))))
        }

        // --- Tail: low on the rump and clearly separated from the mane. When
        //     the two purple shapes met they fused into one ring and the animal
        //     lost its back.
        ctx.paint(Path.smoothClosed([
            CGPoint(x: 60, y: 172), CGPoint(x: 34, y: 176), CGPoint(x: 12, y: 202),
            CGPoint(x: 14, y: 230), CGPoint(x: 38, y: 232), CGPoint(x: 36, y: 208),
            CGPoint(x: 50, y: 190), CGPoint(x: 66, y: 182)
        ], tension: 0.55), mane, edge: maneDeep.opacity(0.55), width: 2)
        ctx.fill(Path.smoothClosed([
            CGPoint(x: 58, y: 176), CGPoint(x: 36, y: 182), CGPoint(x: 22, y: 206),
            CGPoint(x: 25, y: 222), CGPoint(x: 36, y: 204), CGPoint(x: 48, y: 188)
        ], tension: 0.55), with: .color(maneLight.opacity(0.8)))

        // --- Mane, behind the neck. Its INNER edge has to hug the neck: the
        //     first attempt left a coat-coloured gap and the mane read as a
        //     handle hovering off the back of the head.
        let maneBody = Path.smoothClosed([
            CGPoint(x: 154, y: 44), CGPoint(x: 134, y: 25), CGPoint(x: 108, y: 24),
            CGPoint(x: 84, y: 38), CGPoint(x: 67, y: 62), CGPoint(x: 57, y: 92),
            CGPoint(x: 57, y: 120), CGPoint(x: 72, y: 144), CGPoint(x: 96, y: 138),
            CGPoint(x: 96, y: 116), CGPoint(x: 104, y: 96), CGPoint(x: 116, y: 74),
            CGPoint(x: 134, y: 59), CGPoint(x: 150, y: 53)
        ], tension: 0.5)
        ctx.paint(maneBody, gradient: Gradient(colors: [maneLight, mane, maneDeep.lit(0.30)]),
                  from: CGPoint(x: 140, y: 28), to: CGPoint(x: 66, y: 144),
                  edge: maneDeep.opacity(0.6), width: 2)
        // Locks: one dark parting and two lit strands, so the mass reads as
        // hair rather than as a hood.
        for (colour, w, strand) in [
            (maneDeep.opacity(0.45), CGFloat(3), [CGPoint(x: 138, y: 32),
                                                  CGPoint(x: 104, y: 36),
                                                  CGPoint(x: 78, y: 66),
                                                  CGPoint(x: 68, y: 108),
                                                  CGPoint(x: 74, y: 138)]),
            (maneLight, CGFloat(8), [CGPoint(x: 144, y: 44), CGPoint(x: 114, y: 44),
                                     CGPoint(x: 90, y: 70), CGPoint(x: 80, y: 108),
                                     CGPoint(x: 84, y: 134)]),
            (maneLight.opacity(0.7), CGFloat(5), [CGPoint(x: 128, y: 30),
                                                  CGPoint(x: 98, y: 46),
                                                  CGPoint(x: 76, y: 82)])
        ] {
            ctx.stroke(Path.smoothOpen(strand), with: .color(colour),
                       style: StrokeStyle(lineWidth: w, lineCap: .round))
        }

        // --- Far legs. Shaded, not dark: high contrast on the far side reads
        //     as a second creature standing behind.
        ctx.paint(mqLimb(from: CGPoint(x: 100, y: 192), to: CGPoint(x: 94, y: 224),
                         wide: 21, narrow: 15, bow: 2), coatShade)
        ctx.paint(mqLimb(from: CGPoint(x: 72, y: 192), to: CGPoint(x: 76, y: 224),
                         wide: 21, narrow: 15, bow: -2), coatShade)

        // --- Body: small and round; the head does the talking.
        let body = Path.smoothClosed([
            CGPoint(x: 62, y: 140), CGPoint(x: 96, y: 130), CGPoint(x: 130, y: 142),
            CGPoint(x: 144, y: 172), CGPoint(x: 130, y: 200), CGPoint(x: 94, y: 210),
            CGPoint(x: 58, y: 200), CGPoint(x: 46, y: 170)
        ], tension: 0.55)
        ctx.paint(body, gradient: Gradient(colors: [coat, coat, coatShade]),
                  from: CGPoint(x: 66, y: 130), to: CGPoint(x: 112, y: 212),
                  edge: coatEdge, width: 2)
        ctx.fill(Path.smoothClosed([
            CGPoint(x: 54, y: 184), CGPoint(x: 92, y: 204), CGPoint(x: 136, y: 190),
            CGPoint(x: 140, y: 176), CGPoint(x: 94, y: 194), CGPoint(x: 56, y: 172)
        ], tension: 0.6), with: .color(coatDeep.opacity(0.5)))
        ctx.stroke(Path.smoothOpen([CGPoint(x: 54, y: 162), CGPoint(x: 76, y: 138),
                                    CGPoint(x: 110, y: 133)]),
                   with: .color(.white.opacity(0.9)),
                   style: StrokeStyle(lineWidth: 3.2, lineCap: .round))

        // --- Near legs + hooves.
        ctx.paint(mqLimb(from: CGPoint(x: 122, y: 190), to: CGPoint(x: 128, y: 230),
                         wide: 25, narrow: 17, bow: 3), coat, edge: coatEdge, width: 1.8)
        ctx.paint(mqLimb(from: CGPoint(x: 60, y: 190), to: CGPoint(x: 52, y: 230),
                         wide: 25, narrow: 17, bow: -3), coat, edge: coatEdge, width: 1.8)
        for x in [CGFloat(118), CGFloat(42)] {
            ctx.paint(Path(roundedRect: CGRect(x: x, y: 221, width: 21, height: 13),
                           cornerRadius: 5), hoof, edge: hoof.shaded(0.3), width: 1.4)
        }
        for x in [CGFloat(87), CGFloat(69)] {
            ctx.paint(Path(roundedRect: CGRect(x: x, y: 216, width: 17, height: 11),
                           cornerRadius: 4), hoof.mixed(with: coatShade, by: 0.35))
        }

        // --- Neck: short. A long neck at this scale just separates the two
        //     things a child looks at.
        ctx.paint(Path.smoothClosed([
            CGPoint(x: 102, y: 148), CGPoint(x: 118, y: 104), CGPoint(x: 152, y: 96),
            CGPoint(x: 156, y: 132), CGPoint(x: 136, y: 156)
        ], tension: 0.5), gradient: Gradient(colors: [coat, coatShade]),
                  from: CGPoint(x: 112, y: 100), to: CGPoint(x: 152, y: 156),
                  edge: coatEdge, width: 2)

        // --- Head: big cranium, real muzzle, looking at the problem.
        let head = Path.smoothClosed([
            CGPoint(x: 126, y: 84), CGPoint(x: 146, y: 58), CGPoint(x: 178, y: 54),
            CGPoint(x: 204, y: 70), CGPoint(x: 222, y: 92), CGPoint(x: 224, y: 112),
            CGPoint(x: 206, y: 126), CGPoint(x: 176, y: 128), CGPoint(x: 144, y: 118),
            CGPoint(x: 126, y: 102)
        ], tension: 0.55)
        ctx.paint(head, gradient: Gradient(colors: [coat, coat, coatShade]),
                  from: CGPoint(x: 138, y: 56), to: CGPoint(x: 210, y: 130),
                  edge: coatEdge, width: 2)
        // Muzzle: a touch pinker, and the reason it reads as a horse.
        ctx.fill(Path.smoothClosed(mqBlob(center: CGPoint(x: 205, y: 104),
                                          rx: 22, ry: 17, wobble: 0.10)),
                 with: .color(Color(hex: 0xF9DDCB).opacity(0.92)))

        // Ear. Big enough to be an ear rather than a nick in the outline.
        ctx.paint(Path.smoothClosed([
            CGPoint(x: 136, y: 68), CGPoint(x: 118, y: 20), CGPoint(x: 158, y: 50)
        ], tension: 0.30), coat, edge: coatEdge, width: 1.8)
        ctx.fill(Path.smoothClosed([
            CGPoint(x: 139, y: 62), CGPoint(x: 127, y: 33), CGPoint(x: 150, y: 51)
        ], tension: 0.30), with: .color(Color(hex: 0xF0B9CB)))

        // Horn: big, gold, spiralled. It is the badge that says "unicorn" at
        // 40pt, so it is drawn at a size a child could not miss.
        let hornL = CGPoint(x: 162, y: 52), hornR = CGPoint(x: 184, y: 58)
        let hornTip = CGPoint(x: 182, y: 2)
        ctx.paint(Path.smoothClosed([hornL, hornTip, hornR], tension: 0.10),
                  gradient: Gradient(colors: [Color(hex: 0xFFEDBC), Color(hex: 0xE9A82C)]),
                  from: hornTip, to: CGPoint(x: 173, y: 56),
                  edge: Color(hex: 0xB87E14), width: 1.8)
        for i in 0..<4 {
            let t = 0.16 + CGFloat(i) * 0.20
            let a = CGPoint(x: hornL.x + (hornTip.x - hornL.x) * t,
                            y: hornL.y + (hornTip.y - hornL.y) * t)
            let b = CGPoint(x: hornR.x + (hornTip.x - hornR.x) * t,
                            y: hornR.y + (hornTip.y - hornR.y) * t)
            ctx.stroke(Path.smoothOpen([a, CGPoint(x: (a.x + b.x) / 2,
                                                   y: (a.y + b.y) / 2 + 3), b]),
                       with: .color(Color(hex: 0xB87E14).opacity(0.7)),
                       style: StrokeStyle(lineWidth: 1.8, lineCap: .round))
        }
        ctx.stroke(Path.smoothOpen([CGPoint(x: 164, y: 50), hornTip]),
                   with: .color(.white.opacity(0.75)),
                   style: StrokeStyle(lineWidth: 2.2, lineCap: .round))

        // Forelock over the brow, in front of the head.
        ctx.paint(Path.smoothClosed([
            CGPoint(x: 146, y: 56), CGPoint(x: 174, y: 60), CGPoint(x: 166, y: 84),
            CGPoint(x: 142, y: 78)
        ], tension: 0.55), mane, edge: maneDeep.opacity(0.5), width: 1.6)
        ctx.fill(Path.smoothClosed([
            CGPoint(x: 150, y: 60), CGPoint(x: 166, y: 63), CGPoint(x: 158, y: 78),
            CGPoint(x: 148, y: 72)
        ], tension: 0.55), with: .color(maneLight.opacity(0.8)))

        // --- Face. The eye is the character; it is drawn last and biggest.
        ctx.fill(Path(ellipseIn: CGRect(x: 176, y: 82, width: 21, height: 24)),
                 with: .color(p.ink))
        ctx.fill(Path(ellipseIn: CGRect(x: 181, y: 86, width: 8.5, height: 8.5)),
                 with: .color(.white.opacity(0.96)))
        ctx.fill(Path(ellipseIn: CGRect(x: 179, y: 97, width: 5, height: 5)),
                 with: .color(.white.opacity(0.6)))
        ctx.stroke(Path.smoothOpen([CGPoint(x: 172, y: 80), CGPoint(x: 186, y: 75),
                                    CGPoint(x: 199, y: 80)]),
                   with: .color(p.ink), style: StrokeStyle(lineWidth: 3.2, lineCap: .round))
        ctx.fill(Path(ellipseIn: CGRect(x: 210, y: 100, width: 6, height: 8)),
                 with: .color(p.ink.opacity(0.6)))
        ctx.stroke(Path.smoothOpen([CGPoint(x: 202, y: 118), CGPoint(x: 209, y: 120),
                                    CGPoint(x: 215, y: 116)]),
                   with: .color(p.ink.opacity(0.5)),
                   style: StrokeStyle(lineWidth: 2, lineCap: .round))
        ctx.fill(Path(ellipseIn: CGRect(x: 170, y: 104, width: 22, height: 13)),
                 with: .color(Color(hex: 0xF09AA8).opacity(0.40)))
    }
}

// MARK: - Monster

public struct StorybookCrab: View {
    let p: StorybookPalette
    public init(_ p: StorybookPalette = .noon) { self.p = p }

    static let box = CGSize(width: 220, height: 190)

    public var body: some View {
        MQFigureCanvas(box: Self.box) { ctx, _ in Self.draw(&ctx, p) }
    }

    static func draw(_ ctx: inout GraphicsContext, _ p: StorybookPalette) {
        let shell      = Color(hex: 0xE86F4C)
        let shellLight = Color(hex: 0xF7A277)
        let shellDeep  = Color(hex: 0xB8442A)
        let shellEdge  = Color(hex: 0x92321D)
        let belly      = Color(hex: 0xF6C9A2)

        for i in 0..<4 {
            let t = CGFloat(i) / 3
            ctx.fill(Path(ellipseIn: CGRect(x: 40 - t * 18, y: 156 - t * 3,
                                            width: 128 + t * 36, height: 18 + t * 7)),
                     with: .color(p.sandShade.opacity(0.28 * (1 - Double(t) * 0.7))))
        }

        // Six legs, three a side, each with a knee. A straight leg reads as a
        // stick; the bend is what makes it an animal's.
        for side in [-1.0, 1.0] as [CGFloat] {
            for i in 0..<3 {
                let t = CGFloat(i) / 2
                let hip = CGPoint(x: 110 + side * (38 + t * 20), y: 112 + t * 6)
                let knee = CGPoint(x: 110 + side * (62 + t * 34), y: 104 + t * 10)
                let foot = CGPoint(x: 110 + side * (72 + t * 42), y: 164 - t * 4)
                ctx.paint(mqLimb(from: hip, to: knee, wide: 15 - t * 3, narrow: 11 - t * 2),
                          shell, edge: shellEdge, width: 1.6)
                ctx.paint(mqLimb(from: knee, to: foot, wide: 11 - t * 2, narrow: 5),
                          shellDeep, edge: shellEdge, width: 1.4)
            }
        }

        // Shell: wider than tall, a shade domed, bumpy along the top edge.
        let body = Path.smoothClosed([
            CGPoint(x: 44, y: 106), CGPoint(x: 58, y: 74), CGPoint(x: 86, y: 56),
            CGPoint(x: 110, y: 52), CGPoint(x: 138, y: 58), CGPoint(x: 165, y: 78),
            CGPoint(x: 177, y: 108), CGPoint(x: 164, y: 132), CGPoint(x: 110, y: 142),
            CGPoint(x: 55, y: 130)
        ], tension: 0.5)
        ctx.paint(body, gradient: Gradient(colors: [shellLight, shell, shellDeep]),
                  from: CGPoint(x: 80, y: 50), to: CGPoint(x: 130, y: 145),
                  edge: shellEdge, width: 2.2)
        // Pale underside band.
        ctx.fill(Path.smoothClosed([
            CGPoint(x: 62, y: 124), CGPoint(x: 110, y: 138), CGPoint(x: 160, y: 124),
            CGPoint(x: 150, y: 134), CGPoint(x: 110, y: 143), CGPoint(x: 70, y: 134)
        ], tension: 0.55), with: .color(belly.opacity(0.75)))
        // Sun catching the top-left of the shell.
        ctx.fill(Path.smoothClosed(mqBlob(center: CGPoint(x: 86, y: 76),
                                          rx: 30, ry: 15, count: 9, wobble: 0.12,
                                          rotation: -0.35)),
                 with: .color(.white.opacity(0.30)))
        // Three darker freckles: shell texture without noise.
        for (x, y, r) in [(72.0, 108.0, 7.0), (140.0, 100.0, 6.0), (108.0, 116.0, 5.0)] {
            ctx.fill(Path(ellipseIn: CGRect(x: x, y: y, width: r * 2, height: r * 1.5)),
                     with: .color(shellDeep.opacity(0.35)))
        }

        // Claws. One down, one raised -- posture, not symmetry.
        drawClaw(&ctx, hinge: CGPoint(x: 50, y: 104), tip: CGPoint(x: 18, y: 96),
                 scale: 1.0, open: 0.55, shell: shell, light: shellLight,
                 deep: shellDeep, edge: shellEdge)
        drawClaw(&ctx, hinge: CGPoint(x: 168, y: 92), tip: CGPoint(x: 200, y: 54),
                 scale: 1.12, open: 0.9, shell: shell, light: shellLight,
                 deep: shellDeep, edge: shellEdge)

        // Eyes on stalks -- the single most legible feature at thumbnail size,
        // so they are big and they lean outward.
        drawEye(&ctx, base: CGPoint(x: 90, y: 62), top: CGPoint(x: 79, y: 24),
                r: 15, pupil: CGPoint(x: 2, y: 2), shell: shell, edge: shellEdge, ink: p.ink)
        drawEye(&ctx, base: CGPoint(x: 132, y: 62), top: CGPoint(x: 145, y: 22),
                r: 15, pupil: CGPoint(x: 3, y: 2), shell: shell, edge: shellEdge, ink: p.ink)

        // A cheeky mouth, and two blunt little mandibles. Nothing here should
        // frighten a seven-year-old at bedtime.
        ctx.stroke(Path.smoothOpen([CGPoint(x: 96, y: 112), CGPoint(x: 110, y: 122),
                                    CGPoint(x: 124, y: 112)]),
                   with: .color(shellEdge),
                   style: StrokeStyle(lineWidth: 3.4, lineCap: .round))
        ctx.fill(Path.smoothClosed([CGPoint(x: 100, y: 114), CGPoint(x: 104, y: 122),
                                    CGPoint(x: 96, y: 120)], tension: 0.3),
                 with: .color(.white.opacity(0.9)))
        ctx.fill(Path.smoothClosed([CGPoint(x: 120, y: 114), CGPoint(x: 124, y: 120),
                                    CGPoint(x: 116, y: 122)], tension: 0.3),
                 with: .color(.white.opacity(0.9)))
    }

    static func drawClaw(_ ctx: inout GraphicsContext, hinge: CGPoint, tip: CGPoint,
                         scale: CGFloat, open: CGFloat,
                         shell: Color, light: Color, deep: Color, edge: Color) {
        let dx = tip.x - hinge.x, dy = tip.y - hinge.y
        let len = max(sqrt(dx * dx + dy * dy), 0.001)
        let ux = dx / len, uy = dy / len
        let nx = -uy, ny = ux
        // Arm
        ctx.paint(mqLimb(from: hinge, to: CGPoint(x: hinge.x + ux * len * 0.45,
                                                  y: hinge.y + uy * len * 0.45),
                         wide: 18 * scale, narrow: 15 * scale), shell, edge: edge, width: 1.8)
        let base = CGPoint(x: hinge.x + ux * len * 0.42, y: hinge.y + uy * len * 0.42)
        let s = 30 * scale
        // Local frame: `f` forward along the arm, `g` across it.
        func pt(_ f: CGFloat, _ g: CGFloat) -> CGPoint {
            CGPoint(x: base.x + ux * s * f + nx * s * g,
                    y: base.y + uy * s * f + ny * s * g)
        }
        // Dark mouth between the jaws, so the gap reads as a gap. Without it
        // two similar lobes read as leaves, which is what the first pass drew.
        ctx.fill(Path.smoothClosed([pt(0.15, 0), pt(1.45, 0.30), pt(1.45, -0.30)],
                                   tension: 0.2), with: .color(edge))

        let lift = 0.34 + open * 0.40
        // Lower jaw: the fat one, a wedge.
        ctx.paint(Path.smoothClosed([
            pt(-0.10, -0.62), pt(0.72, -0.86), pt(1.42, -0.62),
            pt(1.62, -0.26), pt(1.24, -0.12), pt(0.42, -0.16)
        ], tension: 0.42),
                  gradient: Gradient(colors: [light, shell, deep]),
                  from: pt(0, -0.9), to: pt(1.5, 0),
                  edge: edge, width: 2.2)
        // Upper jaw: the thin hooked one.
        ctx.paint(Path.smoothClosed([
            pt(-0.05, lift * 1.15), pt(0.70, lift * 1.42), pt(1.38, lift * 1.02),
            pt(1.58, lift * 0.44), pt(1.16, lift * 0.30), pt(0.40, lift * 0.36)
        ], tension: 0.42),
                  gradient: Gradient(colors: [light, shell]),
                  from: pt(0, lift * 1.5), to: pt(1.5, lift * 0.3),
                  edge: edge, width: 2.2)
    }

    static func drawEye(_ ctx: inout GraphicsContext, base: CGPoint, top: CGPoint,
                        r: CGFloat, pupil: CGPoint,
                        shell: Color, edge: Color, ink: Color) {
        ctx.paint(mqLimb(from: base, to: top, wide: 11, narrow: 8,
                         bow: (top.x - base.x) * 0.16), shell, edge: edge, width: 1.8)
        ctx.paint(Path(ellipseIn: CGRect(x: top.x - r, y: top.y - r,
                                         width: r * 2, height: r * 2.06)),
                  Color(hex: 0xFFF8EC), edge: edge, width: 2.0)
        ctx.fill(Path(ellipseIn: CGRect(x: top.x - r * 0.42 + pupil.x,
                                        y: top.y - r * 0.46 + pupil.y,
                                        width: r * 0.86, height: r * 0.96)),
                 with: .color(ink))
        ctx.fill(Path(ellipseIn: CGRect(x: top.x - r * 0.34 + pupil.x,
                                        y: top.y - r * 0.40 + pupil.y,
                                        width: r * 0.34, height: r * 0.34)),
                 with: .color(.white))
    }
}
