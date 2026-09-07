import Foundation
import CoreGraphics

// The shared VALUE types every layer names: who a child is, and what they got wrong.
//
// These lived in MQDesign until the progress fix pass of 2026-09-07. They moved here
// because MQProgress - a persistence layer with no pixels in it - had to `import
// MQDesign` to say the word `MQProfile`, which pulled SwiftUI and a bundled font
// resource into the store and pinned it to a UI platform. The brief's architecture rule
// is the other way round: **a logic package never imports a UI package.**
//
// MQDesign now consumes them (`MQDesign` typealiases each one straight through, so
// every existing `import MQDesign` call site still compiles unchanged) and nothing in
// this file draws anything: no SwiftUI, no fonts, no palette. Geometry, sizes and
// colour stay entirely in the renderer.

// MARK: - The cast

/// Who a child can be, and who they fight. One drawing per member, authored at
/// one size in `MQFigureCanvas`, used everywhere from a 44pt token to a 340pt
/// arena figure -- so a creature can never drift between screens the way six
/// separately-tuned emoji sizes did.
///
/// `Codable` since the move: a profile row on disk is a cast, and a store should not
/// have to spell the raw string itself to persist one.
public enum MQCast: String, Sendable, Codable, CaseIterable {
    case unicorn, turtle, octopus
    /// The monster. Never selectable as a hero.
    case crab

    public var species: String {
        switch self {
        case .unicorn: return "Unicorn"
        case .turtle:  return "Turtle"
        case .octopus: return "Octopus"
        case .crab:    return "Crab"
        }
    }
}

// MARK: - Figures

/// The figure contract as the DESIGN draws it today: three cases, because
/// `MQFigureView` has three renderers. `none` is a first-class case - the angles
/// topics have no diagram BY DESIGN, and a dashed placeholder box in their place was
/// the clearest "unfinished template" signal the rejected sample had in it.
///
/// **This is a projection, not the truth.** The engine emits `MQContent.Figure`, which
/// has EIGHT cases. Anything held for later - a review row, a session on disk, a
/// transcript - must carry `Figure`, never this: the refuter measured 180 of 216
/// figure-bearing review rows losing their diagram to `.none` because `StoredReview`
/// persisted the three-case type (Progress Refutation W7, 2026-09-07).
public enum MQFigure: Sendable, Equatable {
    case none
    /// A rectangle drawn to scale with both dimensions tagged.
    case rect(long: String, wide: String, ratio: CGFloat)
    /// A bar of `parts` equal pieces with `filled` of them shaded.
    case fractionBar(parts: Int, filled: Int)

    /// The three-case projection of an engine figure spec. Everything the design
    /// cannot draw yet becomes `.none` HERE, at the moment of drawing, and never on
    /// the way to disk.
    public init(_ spec: Figure?) {
        switch spec {
        case .some(.rect(let r)):
            let ratio = r.breadth == 0 ? 1 : CGFloat(r.length) / CGFloat(r.breadth)
            self = .rect(long: "\(r.length) \(r.unit)", wide: "\(r.breadth) \(r.unit)", ratio: ratio)
        case .some(.fractionBar(let f)):
            self = .fractionBar(parts: f.parts, filled: f.filled)
        default:
            self = .none
        }
    }
}

// MARK: - Profiles

/// One saved explorer. There are no accounts anywhere in this app: a profile is
/// a name, a creature and a class level held on this iPad, so two siblings can
/// share one device without either of them signing in to anything.
///
/// `id` is the display NAME, which is a display identity and not a stable one. A store
/// that has to survive a rename keys on its own id and pairs the two; see
/// `MQProgress.ProfileRecord`.
public struct MQProfile: Sendable, Equatable, Identifiable {
    public var id: String { name }
    public var name: String
    public var cast: MQCast
    public var level: String
    /// Shown as crystals on the token. Never a nag: this is where you got to,
    /// not how long since you last played.
    public var crystals: Int

    public init(name: String, cast: MQCast, level: String, crystals: Int) {
        self.name = name; self.cast = cast; self.level = level; self.crystals = crystals
    }
}

// MARK: - Map nodes

/// One stop on the island.
///
/// Here rather than in MQDesign for the same reason as the rest of this file: the STORE
/// derives a node's state (`MQProgress.NodeProgress.State.asMapState` is the one mapping
/// in the app, kept in one place so no feature lane writes its own and gets a case
/// wrong), and a persistence layer must not import a UI package to name the four cases
/// it is deriving. `at` and `landmark` are geography, not pixels - the island decides
/// what a `.reef` looks like and where 0.28, 0.55 lands on the glass.
public struct MQMapNode: Sendable, Equatable, Identifiable {
    public enum State: Sendable, Equatable {
        /// Every crystal collected.
        case cleared
        /// Where the child is now, with mastery part-way.
        case inProgress(collected: Int, total: Int)
        /// Unlocked, never played.
        case open
        /// Not built yet. Says so, plainly.
        case comingSoon
    }

    public var id: String { name }
    public var name: String
    public var state: State
    /// Where the node sits on the island, in unit coordinates of the map canvas.
    public var at: CGPoint
    /// Which landmark the island draws under the marker.
    public var landmark: MQLandmark

    public init(_ name: String, _ state: State, at: CGPoint, landmark: MQLandmark) {
        self.name = name; self.state = state; self.at = at; self.landmark = landmark
    }
}

/// The island's own geography. A node is a PLACE, not an icon in a list -- which
/// is the whole difference between a map and the web app's zig-zag of emoji.
public enum MQLandmark: Sendable, Equatable {
    case palace, reef, bay, jetty, cove, lagoon, peak, atoll
}

// MARK: - Review rows

/// One item worth another look, as the result screen renders it.
///
/// It carries the figure TWICE on purpose, and the two can never disagree:
///
/// * `spec` is the engine's own `Figure` - all eight kinds, `Codable`, and the thing
///   anything durable must persist;
/// * `figure` is the three-case projection `MQFigureView` can actually draw today,
///   DERIVED from `spec` whenever there is one.
///
/// A build that teaches `MQDesign` to draw a pie chart changes the projection and
/// every review row already on disk gains its diagram, because the row kept the spec.
public struct MQReviewItem: Sendable, Equatable, Identifiable {
    public var id: String { question }
    public var question: String
    /// What MQDesign can draw today. Derived from `spec` when one is present.
    public var figure: MQFigure
    /// The engine's own figure spec, all eight kinds. The truth; what gets persisted.
    public var spec: Figure?
    public var answer: String
    /// The generator's own one-line explanation. Static, authored per generator
    /// in the engine -- there is no oracle and no model in this loop.
    public var explanation: String

    /// The design's own initialiser, unchanged since before the move: a row built from
    /// a drawable figure and nothing else. `spec` is nil, which is honest - a hand-built
    /// preview row has no engine spec behind it.
    public init(question: String, figure: MQFigure, answer: String, explanation: String) {
        self.question = question; self.figure = figure; self.spec = nil
        self.answer = answer; self.explanation = explanation
    }

    /// The engine's initialiser: hand it the spec and the projection follows.
    public init(question: String, spec: Figure?, answer: String, explanation: String) {
        self.question = question; self.spec = spec; self.figure = MQFigure(spec)
        self.answer = answer; self.explanation = explanation
    }
}
