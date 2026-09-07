import SwiftUI

// Shared drawing primitives.
//
// Every character in both directions is DRAWN -- SwiftUI Paths filled and
// stroked, never an emoji and never an SF Symbol standing in for a creature.
// Emoji were the web app's stopgap and they were the single most generic thing
// in the rejected sample: a system glyph inside a circle reads as an avatar
// slot, not as a character with a face and a posture.
//
// Organic shapes are defined as a ring of control points and closed with a
// Catmull-Rom spline. That matters practically: a unicorn's cheek is easier to
// nudge as one point than as two bezier handles, so the creatures stayed
// editable while they were being drawn.

public extension Path {

    /// A closed, smooth curve through every point, in order.
    /// `tension` 0 = polygon, 1 = round. 0.5 is a Catmull-Rom.
    static func smoothClosed(_ pts: [CGPoint], tension: CGFloat = 0.5) -> Path {
        var path = Path()
        guard pts.count > 2 else {
            guard let first = pts.first else { return path }
            path.move(to: first)
            pts.dropFirst().forEach { path.addLine(to: $0) }
            path.closeSubpath()
            return path
        }
        let n = pts.count
        path.move(to: pts[0])
        for i in 0..<n {
            let p0 = pts[(i - 1 + n) % n]
            let p1 = pts[i]
            let p2 = pts[(i + 1) % n]
            let p3 = pts[(i + 2) % n]
            let c1 = CGPoint(x: p1.x + (p2.x - p0.x) * tension / 3,
                             y: p1.y + (p2.y - p0.y) * tension / 3)
            let c2 = CGPoint(x: p2.x - (p3.x - p1.x) * tension / 3,
                             y: p2.y - (p3.y - p1.y) * tension / 3)
            path.addCurve(to: p2, control1: c1, control2: c2)
        }
        path.closeSubpath()
        return path
    }

    /// An open smooth curve through every point (fronds, ropes, wave crests).
    static func smoothOpen(_ pts: [CGPoint], tension: CGFloat = 0.5) -> Path {
        var path = Path()
        guard pts.count > 2 else {
            guard let first = pts.first else { return path }
            path.move(to: first)
            pts.dropFirst().forEach { path.addLine(to: $0) }
            return path
        }
        let n = pts.count
        path.move(to: pts[0])
        for i in 0..<(n - 1) {
            let p0 = pts[max(i - 1, 0)]
            let p1 = pts[i]
            let p2 = pts[i + 1]
            let p3 = pts[min(i + 2, n - 1)]
            let c1 = CGPoint(x: p1.x + (p2.x - p0.x) * tension / 3,
                             y: p1.y + (p2.y - p0.y) * tension / 3)
            let c2 = CGPoint(x: p2.x - (p3.x - p1.x) * tension / 3,
                             y: p2.y - (p3.y - p1.y) * tension / 3)
            path.addCurve(to: p2, control1: c1, control2: c2)
        }
        return path
    }

    static func star(center c: CGPoint, points: Int, outer: CGFloat,
                     inner: CGFloat, rotation: CGFloat = -.pi / 2) -> Path {
        var path = Path()
        for i in 0..<(points * 2) {
            let r = i.isMultiple(of: 2) ? outer : inner
            let a = rotation + CGFloat(i) * .pi / CGFloat(points)
            let p = CGPoint(x: c.x + cos(a) * r, y: c.y + sin(a) * r)
            if i == 0 { path.move(to: p) } else { path.addLine(to: p) }
        }
        path.closeSubpath()
        return path
    }
}

public extension CGPoint {
    static func + (l: CGPoint, r: CGSize) -> CGPoint {
        CGPoint(x: l.x + r.width, y: l.y + r.height)
    }
    func offsetBy(_ dx: CGFloat, _ dy: CGFloat) -> CGPoint {
        CGPoint(x: x + dx, y: y + dy)
    }
}

public extension Color {
    /// Mix toward another colour. Used for cel shadow and rim light so a
    /// creature's shading stays a family of one hue instead of a grey wash.
    func mixed(with other: Color, by t: Double) -> Color {
        let a = other.rgbaComponents, b = rgbaComponents
        return Color(.sRGB,
                     red:   b.r + (a.r - b.r) * t,
                     green: b.g + (a.g - b.g) * t,
                     blue:  b.b + (a.b - b.b) * t,
                     opacity: b.a + (a.a - b.a) * t)
    }

    func shaded(_ t: Double) -> Color { mixed(with: Color(hex: 0x0B0620), by: t) }
    func lit(_ t: Double) -> Color { mixed(with: .white, by: t) }

    var rgbaComponents: (r: Double, g: Double, b: Double, a: Double) {
        #if canImport(UIKit)
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        UIColor(self).getRed(&r, green: &g, blue: &b, alpha: &a)
        return (Double(r), Double(g), Double(b), Double(a))
        #elseif canImport(AppKit)
        let ns = NSColor(self).usingColorSpace(.sRGB) ?? .black
        return (Double(ns.redComponent), Double(ns.greenComponent),
                Double(ns.blueComponent), Double(ns.alphaComponent))
        #else
        return (0, 0, 0, 1)
        #endif
    }
}

/// A soft ground shadow. Both directions ground their creatures on something --
/// a character floating with no contact shadow is the other half of why a
/// sprite reads as a sticker.
public struct MQContactShadow: View {
    let width: CGFloat
    let height: CGFloat
    let color: Color
    let opacity: Double

    public init(width: CGFloat, height: CGFloat, color: Color, opacity: Double = 0.30) {
        self.width = width; self.height = height
        self.color = color; self.opacity = opacity
    }

    public var body: some View {
        // Concentric ellipses instead of a blur: ImageRenderer is reliable with
        // fills and gradients, and unreliable with filters.
        ZStack {
            ForEach(0..<5, id: \.self) { i in
                let t = CGFloat(i) / 4
                Ellipse()
                    .fill(color.opacity(opacity * (1 - Double(t)) * 0.55))
                    .frame(width: width * (0.55 + t * 0.45),
                           height: height * (0.55 + t * 0.45))
            }
        }
        .frame(width: width, height: height)
    }
}
