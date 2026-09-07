import SwiftUI

/// A Canvas that draws in a fixed design box and scales to fit.
///
/// Characters are authored at one size and one size only. Everything downstream
/// -- rail avatars, the arena, a future map pin -- is the same drawing at a
/// different scale, so a creature can never drift between screens the way six
/// separately-tuned emoji sizes did.
public struct MQFigureCanvas: View {
    let box: CGSize
    let draw: (inout GraphicsContext, CGSize) -> Void

    public init(box: CGSize,
                @_implicitSelfCapture draw: @escaping (inout GraphicsContext, CGSize) -> Void) {
        self.box = box
        self.draw = draw
    }

    public var body: some View {
        Canvas { ctx, size in
            let k = min(size.width / box.width, size.height / box.height)
            ctx.translateBy(x: (size.width - box.width * k) / 2,
                            y: (size.height - box.height * k) / 2)
            ctx.scaleBy(x: k, y: k)
            draw(&ctx, box)
        }
        .aspectRatio(box.width / box.height, contentMode: .fit)
    }
}

/// Control points for an organic oval, wobbled so nothing in the world is a
/// perfect ellipse. `wobble` is a per-vertex radius jitter driven by index, not
/// by randomness, so a creature draws identically every render -- a snapshot
/// gate needs the picture to be a function of the code.
public func mqBlob(center c: CGPoint, rx: CGFloat, ry: CGFloat,
                   count: Int = 10, wobble: CGFloat = 0.06,
                   rotation: CGFloat = 0) -> [CGPoint] {
    (0..<count).map { i in
        let t = CGFloat(i) / CGFloat(count)
        let a = rotation + t * 2 * .pi
        let w = 1 + wobble * sin(CGFloat(i) * 2.399)
        return CGPoint(x: c.x + cos(a) * rx * w, y: c.y + sin(a) * ry * w)
    }
}

/// A tapered limb: wide at `from`, narrow at `to`.
public func mqLimb(from a: CGPoint, to b: CGPoint,
                   wide: CGFloat, narrow: CGFloat, bow: CGFloat = 0) -> Path {
    let dx = b.x - a.x, dy = b.y - a.y
    let len = max(sqrt(dx * dx + dy * dy), 0.001)
    let nx = -dy / len, ny = dx / len
    let mid = CGPoint(x: (a.x + b.x) / 2 + nx * bow, y: (a.y + b.y) / 2 + ny * bow)
    return Path.smoothClosed([
        CGPoint(x: a.x + nx * wide / 2, y: a.y + ny * wide / 2),
        CGPoint(x: mid.x + nx * (wide + narrow) / 4, y: mid.y + ny * (wide + narrow) / 4),
        CGPoint(x: b.x + nx * narrow / 2, y: b.y + ny * narrow / 2),
        CGPoint(x: b.x - nx * narrow / 2, y: b.y - ny * narrow / 2),
        CGPoint(x: mid.x - nx * (wide + narrow) / 4, y: mid.y - ny * (wide + narrow) / 4),
        CGPoint(x: a.x - nx * wide / 2, y: a.y - ny * wide / 2)
    ], tension: 0.42)
}

public extension GraphicsContext {
    /// Fill, then trace the same path in a darker version of its own colour.
    /// A drawn character needs an edge; a *coloured* edge is the difference
    /// between gouache and clip art.
    mutating func paint(_ path: Path, _ fill: Color,
                        edge: Color? = nil, width: CGFloat = 1.6) {
        self.fill(path, with: .color(fill))
        if let edge {
            stroke(path, with: .color(edge), style: StrokeStyle(lineWidth: width, lineJoin: .round))
        }
    }

    mutating func paint(_ path: Path, gradient: Gradient,
                        from: CGPoint, to: CGPoint,
                        edge: Color? = nil, width: CGFloat = 1.6) {
        fill(path, with: .linearGradient(gradient, startPoint: from, endPoint: to))
        if let edge {
            stroke(path, with: .color(edge), style: StrokeStyle(lineWidth: width, lineJoin: .round))
        }
    }
}
