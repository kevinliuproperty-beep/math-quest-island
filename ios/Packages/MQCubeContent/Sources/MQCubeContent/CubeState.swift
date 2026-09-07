import Foundation

/// A cube, exactly as the JS cores model it.
///
/// The small cube is 8 corner blocks: `cp` says which block sits in each slot, `co` how
/// far it is twisted (0, 1, 2). The big cube adds 12 edge blocks (`ep`, `eo` with a flip
/// of 0 or 1) and 6 middle squares (`cn`, which never come apart and only ever get
/// rotated as a set).
///
/// `ep`, `eo` and `cn` are optional because the small cube genuinely does not have them -
/// not because they might be missing. A 2x2 with an `ep` array would be a bug, and a 3x3
/// without one likewise; ``isWellFormed(for:)`` says so.
public struct CubeState: Codable, Sendable, Hashable {
    public var cp: [Int]
    public var co: [Int]
    public var ep: [Int]?
    public var eo: [Int]?
    public var cn: [Int]?

    public init(cp: [Int], co: [Int], ep: [Int]? = nil, eo: [Int]? = nil, cn: [Int]? = nil) {
        self.cp = cp; self.co = co; self.ep = ep; self.eo = eo; self.cn = cn
    }

    public var size: CubeSize { ep == nil ? .small : .big }

    public func isWellFormed(for size: CubeSize) -> Bool {
        guard cp.count == 8, co.count == 8 else { return false }
        switch size {
        case .small:
            return ep == nil && eo == nil && cn == nil
        case .big:
            return ep?.count == 12 && eo?.count == 12 && cn?.count == 6
        }
    }
}

/// A cube plus the key that identifies it. `key` is the cores' own `keyOf` string, so two
/// snapshots are the same cube exactly when their keys match - which is also how the
/// parity corpus pins 20,000 round trips in a few hundred kilobytes.
public struct CubeSnapshot: Codable, Sendable, Hashable {
    public let size: Int
    public let state: CubeState
    public let key: String
}

/// A scramble: the cube it produced and the moves that got there.
public struct CubeScramble: Codable, Sendable, Hashable {
    public let size: Int
    public let state: CubeState
    public let key: String
    public let moves: [String]
    /// FNV-1a of the space-joined moves. Eight characters that pin a whole sequence.
    public let movesHash: String?
    public let seed: Int?
    public let preset: String?
}

/// The result of applying moves, with the inverse that undoes them.
public struct CubeMoveResult: Codable, Sendable, Hashable {
    public let size: Int
    public let state: CubeState
    public let key: String
    public let keyBefore: String
    /// The sequence that undoes `moves`, from the core's own `invertSeq`.
    public let inverse: [String]
    /// What was actually applied. A whole-turn key expands here: on the small cube
    /// `["y"]` comes back as `["U", "D'"]`, because `CUBE.WHOLE.y` is a pair of face
    /// turns and not a move of its own.
    public let moves: [String]
    public let movesHash: String?
}

/// "Solved" is two different questions and the method needs both answers.
///
/// * ``keyedSolved`` - the cube is keyed identical to a fresh one. The small core exports
///   `isSolved` for this; the big core does not, so the engine compares keys.
/// * ``facesAllOneColour`` - every side is one colour. This is what a finished cube looks
///   like after the method has turned it over, and it is true of cubes that are NOT keyed
///   solved. Both cores export it.
///
/// Reading the first where you meant the second is how a solve gets reported as unfinished.
public struct CubeSolved: Codable, Sendable, Hashable {
    public let size: Int
    public let key: String
    public let solvedKey: String
    public let facesAllOneColour: Bool
    /// How the engine answered `solved` for this size, in words, for a rehearsal log.
    public let normalisedBy: String

    private enum CodingKeys: String, CodingKey {
        case size, key, solvedKey, facesAllOneColour, normalisedBy
        case keyedSolved = "solved"
    }
    public let keyedSolved: Bool

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        size = try c.decode(Int.self, forKey: .size)
        key = try c.decode(String.self, forKey: .key)
        solvedKey = try c.decode(String.self, forKey: .solvedKey)
        keyedSolved = try c.decode(Bool.self, forKey: .keyedSolved)
        facesAllOneColour = try c.decode(Bool.self, forKey: .facesAllOneColour)
        normalisedBy = try c.decodeIfPresent(String.self, forKey: .normalisedBy) ?? ""
    }
    public func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(size, forKey: .size)
        try c.encode(key, forKey: .key)
        try c.encode(solvedKey, forKey: .solvedKey)
        try c.encode(keyedSolved, forKey: .keyedSolved)
        try c.encode(facesAllOneColour, forKey: .facesAllOneColour)
        try c.encode(normalisedBy, forKey: .normalisedBy)
    }
}

/// What `validate` said about a painting.
///
/// The refusals are the point of this type, not the acceptances. The split lane's fixture
/// only ever fed `validate` stickers taken from a real cube, so every rejection branch was
/// unreached in all 1,218 fixture rows - and a mutation that DELETED the "that is not a
/// real cube block" refusal passed every gate. `code` and `message` come across verbatim
/// so the child reads the core's own words and a gate can check them.
public struct CubeValidation: Codable, Sendable, Hashable {
    public let size: Int
    public let ok: Bool
    /// `blank`, `odd`, `counts`, `twice`, `notreal`, `missing`, `twist`, and on the big
    /// cube also `centre-twice`, `no-white`, `etwice`, `enotreal`, `missinge`, `flip`,
    /// `parity`. `nil` when the painting is legal.
    public let code: String?
    /// The whole sentence the child is shown. Never rebuilt in Swift.
    public let message: String
    /// The squares to ring, by sticker index.
    public let suspects: [Int]
    /// The cube she has described, when the painting is legal.
    public let state: CubeState?
    public let key: String?

    public var refusal: String? { ok ? nil : (code ?? "unknown") }
}

/// One step of the method.
public struct CubeStep: Codable, Sendable, Hashable {
    public let n: Int
    public let id: String
    public let label: String
    public let done: Bool
}

/// Where a cube stands against the method.
///
/// `firstUnfinished` is what a UI shows on the step rail. `extras` carries the predicates
/// that are not steps but that the guided solve reads - and on the small cube it is where
/// `step1DoneAtCeiling` lives, deliberately NOT as step 1: `step1Done` asks whether the
/// white layer is built *at the ceiling*, and the last beat of step 1 turns the cube over,
/// after which it is false by design. `layerIntact` is the test that means "built, held
/// some way", and that is what step 1 reports.
public struct CubeStepStatus: Codable, Sendable {
    public let size: Int
    public let key: String
    public let steps: [CubeStep]
    public let firstUnfinished: Int?
    public let allDone: Bool
    public let facesAllOneColour: Bool
    public let extras: [String: JSONValue]

    public var step1DoneAtCeiling: Bool? {
        if case .bool(let b)? = extras["step1DoneAtCeiling"] { return b }
        return nil
    }
    public var resumePoint: Int? {
        if case .number(let d)? = extras["resumePoint"] { return Int(d) }
        return nil
    }
}

/// One beat of a guided solve. `say`, `why` and `title` are the words the child reads and
/// they cross the bridge verbatim; a Cube Quest law forbids changing them.
public struct CubeBeat: Codable, Sendable, Hashable {
    public let phase: Int?
    public let kind: String
    public let moves: [String]
    public let chant: String?
    public let ord: Int?
    public let of: Int?
    public let say: String?
    public let why: String?
    public let title: String?
}

public struct CubePlan: Codable, Sendable {
    public let size: Int
    public let key: String
    public let plan: Body?

    public struct Body: Codable, Sendable {
        public let ok: Bool
        public let beatCount: Int
        public let beats: [CubeBeat]
        public let end: CubeState?
        public let endKey: String?
    }
}

/// A node of the guided script.
public struct CubeGuideNode: Codable, Sendable {
    public let id: String
    public let phase: Int?
    public let title: String
    public let say: String
    public let why: String
    public let src: JSONValue?
    public let kind: String?
    public let moves: [String]
    public let chant: String?
    public let cheer: JSONValue?
    public let panic: Bool
    public let end: Bool
    public let method: Bool
    public let askOnly: Bool
    public let rephrase: Bool
    public let ask: JSONValue?
    public let to: JSONValue?
    public let worldKey: String?
    public let exits: JSONValue?

    /// The words, joined the way the snapshot hashes them. Used by the gate to prove no
    /// node's text moved between the monolith and the bundle.
    public var textForHashing: String { "\(id) \(say) \(why) \(title)" }
}

public struct CubeGuideScript: Codable, Sendable {
    public let ok: Bool
    public let first: JSONValue?
    public let last: JSONValue?
    public let order: [String]
    public let nodeCount: Int
    public let nodes: [CubeGuideNode]
}

/// What the inference engine says about a half-painted cube.
///
/// `ranking` is the whole ask order, not only the winner: a tie-break that changes which
/// of two equally sharp squares wins moves the ranking while leaving `best` alone, and
/// that is precisely the mutation the split lane's first probe walked past.
public struct CubeQuestion: Codable, Sendable {
    public struct Completions: Codable, Sendable { public let count: Int; public let capped: Bool; public let listSize: Int }
    public struct Rank: Codable, Sendable, Hashable {
        public let sid: Int
        public let worst: Int
        public let spread: Int
        public let easy: Int
    }
    public let size: Int
    public let completions: Completions
    public let best: JSONValue?
    public let schemeCount: Int
    public let ranking: [Rank]
}

/// One block, placed. This is the SceneKit contract.
///
/// `m` is a 3x3 rotation matrix as rows of three - hand it to `SCNMatrix4` or a
/// `simd_float3x3`. `t` is the block's centre in cubie units; multiply by whatever edge
/// length the scene uses (the web renderer multiplies by 50 on the small cube and by
/// 200/3 on the big one, which is CSS pixels and nothing a SceneKit view has to inherit).
public struct CubePiece: Codable, Sendable, Hashable {
    public let key: String        // "c0", "e11", "n3"
    public let kind: String       // "c" corner, "e" edge, "n" middle square
    public let index: Int
    public let slot: Int
    public let twist: Int
    public let m: [[Double]]
    public let t: [Double]
    /// Which of the six faces carry a sticker on this block, in the core's own order.
    public let faces: [Int]
    /// The colour each of those faces shows.
    public let colours: [String]
}

public struct CubeGeometry: Codable, Sendable {
    public let size: Int
    public let key: String
    public let pieces: [CubePiece]
    public let faceDirections: [[Double]]
    public let faceColours: [String]
    public let faceLetters: [String]
}

/// A move, as something to animate: which blocks travel, about which axis, how far.
public struct CubeMoveGeometry: Codable, Sendable {
    public let size: Int
    public let move: String
    public let axis: [Double]
    public let deg: Double
    /// Slots, on the small cube only; the big core answers in pieces instead.
    public let slots: [Int]?
    /// Piece keys, on both sizes - the normalisation that lets one renderer animate either.
    public let pieces: [String]
    public let isWhole: Bool
    public let moves: [String]
    public let inverse: String?
}

/// The words. Verbatim, hashed by the gate, never rebuilt in Swift.
public struct CubeWords: Codable, Sendable {
    public let CAPTION: [String: String]
    public let SLOT_NAMES: [String]
    public let COLOURS: [String]
    public let FACE_COLOUR: [String]
    public let FACE_LETTER: [String]
    public let ordinal: [String]
    public let ESLOT_NAMES: [String]?
    public let CHANT_TWICE: String?
    public let PRESETS: [Preset]
    public let CHANTS: [String: Chant]

    public struct Preset: Codable, Sendable {
        public let id: String
        public let name: String
        public let hint: String
        public let scramble: String
        public let quiz: Quiz?
        public struct Quiz: Codable, Sendable {
            public let q: String
            public let a: [String]
            /// WHICH ANSWER IS RIGHT. Mutating this passed every gate the split lane had.
            public let right: Int
            public let why: String?
        }
    }
    public struct Chant: Codable, Sendable {
        public let id: String
        public let name: String
        public let moves: [String]
        public let breath: Int?
        public let say: String?
        public let what: String?
        public let why: String?
    }
}

/// Which cube engine is running.
public struct CubeBuild: Codable, Sendable {
    public struct Block: Codable, Sendable, Hashable {
        public let name: String
        public let startLine: Int
        public let endLine: Int
        public let bytes: Int
        public let sha256: String
    }
    public let stamp: String
    public let date: String
    public let sha: String
    public let payloadHash: String
    public let source: String
    public let blocks: [Block]
    public let platform: String
    public let sizes: [Int]
    public let exportCounts: [String: Int]
    public let api: [String]
}
