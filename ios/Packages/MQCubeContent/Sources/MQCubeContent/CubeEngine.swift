import Foundation

/// The seam between Cube Quest's UI and whatever computes the cube.
///
/// # Why this is a SIBLING of `MQContent` and not a protocol inside it
///
/// `MQContent` is the question seam: `QuestionSource`, `Question`, `Verdict`, `Figure`.
/// It is imported by every quiz screen in the app. Cube Quest shares **nothing** with it -
/// no question, no answer, no grading - and hanging cube state, sticker views, method
/// steps, guided-script nodes and 3x3 rotation matrices off it would mean:
///
/// * every quiz screen recompiling when the cube's geometry types change, and vice versa;
/// * two independently-versioned engines (`engine.bundle.js`, `cube-engine.bundle.js`)
///   reached through one module, so a bump to either invalidates both;
/// * the brief's own rule - *module = package = lane* - quietly broken, because the cube
///   lane and the content lane would be editing the same target.
///
/// So: `MQCubeContent` is the cube's `MQContent`. The contract rule carries over
/// unchanged - **UI imports `MQCubeContent` and never `MQCubeEngineJS`** - which is what
/// keeps a future Swift port, or a recorded fixture source, a drop-in.
///
/// # What the protocol promises
///
/// Statelessness. Every call takes the cube it is about; nothing is held between calls.
/// A `CubeState` can be written to disk, the app quit, relaunched, and the same cube
/// carries on being solved. That is a property of the JS cores, not a convention: they
/// have no session map and no cache.
public protocol CubeEngine: Sendable {

    /// Which bundle is running, so a rehearsal log can say which cube the child played.
    func cubeBuild() async throws -> CubeBuild

    /// A finished cube.
    func newSolved(size: CubeSize) async throws -> CubeSnapshot

    /// A scramble. Deterministic in `seed`: same seed, same moves, in Node and in
    /// JavaScriptCore, which is what lets the parity corpus be a committed file.
    func scramble(size: CubeSize, seed: Int, depth: Int) async throws -> CubeScramble

    /// A scramble from an explicit sequence, or from one of the app's named messes.
    func scramble(size: CubeSize, moves: [String]) async throws -> CubeScramble
    func scramble(size: CubeSize, preset: String) async throws -> CubeScramble

    /// Apply moves. A whole-cube turn key (`y`, `x2`, ...) is accepted on BOTH sizes even
    /// though only the big core carries them as moves.
    func applyMoves(size: CubeSize, state: CubeState, moves: [String]) async throws -> CubeMoveResult

    /// The two readings of "solved", which are different questions - see ``CubeSolved``.
    func isSolved(size: CubeSize, state: CubeState) async throws -> CubeSolved

    /// The painted view of a cube: 24 squares on the small one, 54 on the big one.
    func stickers(size: CubeSize, state: CubeState) async throws -> [String]

    /// The painter's door into the core. `nil` entries are squares she has not coloured.
    func validate(size: CubeSize, stickers: [String?]) async throws -> CubeValidation

    /// Every step of the method, and whether it is finished.
    func stepStatus(size: CubeSize, state: CubeState) async throws -> CubeStepStatus

    /// The guided solve for this cube, beat by beat.
    func buildPlan(size: CubeSize, state: CubeState, includeText: Bool) async throws -> CubePlan

    /// The whole guided script, verbatim.
    func guideScript(size: CubeSize) async throws -> CubeGuideScript
    /// One node of it, by id.
    func guideNode(size: CubeSize, id: String) async throws -> CubeGuideNode

    /// Which single square is worth asking about next, and the whole ask ranking.
    ///
    /// The answer comes back TWICE - see ``CubeQuestion``. `best` is the web's own
    /// question, asked with the `nameable` predicate the painter supplies; `plain` is the
    /// no-options answer this bridge used to give on its own, and they are different
    /// squares often enough that the refutation called it a wound.
    ///
    /// `nameable` lets a caller supply the resolved boolean array itself (JSON cannot
    /// carry a function). Passing `nil` - the normal case - has the engine compute the
    /// page's own `canNameByColour`.
    func bestQuestion(size: CubeSize, painted: [String?], nameable: [Bool]?) async throws -> CubeQuestion

    /// Is this thing a cube at all, and is it a cube a child could be holding?
    ///
    /// A restored save goes through here BEFORE it is drawn. Statelessness means a
    /// `CubeState` can be written to disk and read back months later by a different build;
    /// nothing else in this protocol checks that what came back is a cube.
    func validateState(size: CubeSize, state: CubeState) async throws -> CubeStateValidation

    /// Everything a SceneKit view needs to place the blocks of this cube.
    func geometry(size: CubeSize, state: CubeState) async throws -> CubeGeometry

    /// Which blocks a move turns, about what axis, by how much.
    func moveGeometry(size: CubeSize, state: CubeState, move: String) async throws -> CubeMoveGeometry

    /// The words: captions, chants, preset hints, slot names, ordinals.
    func words(size: CubeSize) async throws -> CubeWords
}

public extension CubeEngine {
    /// The common case: let the engine resolve the page's own nameable predicate.
    func bestQuestion(size: CubeSize, painted: [String?]) async throws -> CubeQuestion {
        try await bestQuestion(size: size, painted: painted, nameable: nil)
    }
}

/// The two cube sizes. Not an `Int`, because "size 4" is not a thing and the engine
/// refuses it by name; making that unrepresentable in Swift is cheaper than handling it.
public enum CubeSize: Int, Codable, Sendable, CaseIterable {
    case small = 2   // 2x2: 8 corner blocks, 24 squares, three steps, two chants
    case big = 3     // 3x3: + 12 edge blocks and 6 middle squares, 54 squares, eight steps

    public var squareCount: Int { self == .small ? 24 : 54 }
    public var pieceCount: Int { self == .small ? 8 : 26 }
    public var stepCount: Int { self == .small ? 3 : 8 }
}
