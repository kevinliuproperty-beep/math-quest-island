import Foundation
import Testing
@testable import MQCubeEngineJS
import MQCubeContent

/// The two committed fixtures the Swift gate replays, and the two hashes it needs.
///
/// A missing fixture is a FAILURE, never a skip. A gate that quietly runs fewer checks
/// when a file is absent is the same false green the executed-test floor exists to catch.
enum CubeFixtures {

    static func repoRoot() throws -> URL {
        guard let root = CubeBundleLocator.repoRoot() else {
            Issue.record("could not find the repo root from \(#filePath) - the Swift gate needs the committed fixtures")
            throw CocoaError(.fileNoSuchFile)
        }
        return root
    }

    static func data(at relativePath: String) throws -> Data {
        let url = try repoRoot().appendingPathComponent(relativePath)
        guard FileManager.default.fileExists(atPath: url.path) else {
            Issue.record("missing fixture \(relativePath) - regenerate it and commit the result")
            throw CocoaError(.fileNoSuchFile)
        }
        return try Data(contentsOf: url)
    }

    // MARK: - the value snapshot (cube/tools/fixtures/cube-engine-snapshot.json)

    struct Snapshot: Decodable {
        struct Node: Decodable {
            let id: String
            let title: String
            let say: String
            let why: String
            let textHash: String
        }
        struct Guide: Decodable {
            let nodeCount: Int
            let order: [String]
            let textHash: String
            let nodes: [Node]
        }
        struct RefusalCase: Decodable {
            let kind: String
            let how: String
            let code: String
            let msg: String
            let suspects: [Int]
            let stickers: [String?]
        }
        struct Refusals: Decodable {
            let codes: [String]
            let unreached: [String]
            let cases: [RefusalCase]
        }
        struct Size: Decodable {
            let size: Int
            let exports: [String]
            let guide: Guide
            let refusals: Refusals
            /// The word surface, recorded from the MONOLITH by
            /// `cube-engine-sanity.mjs --record`. It decodes straight into the same
            /// `CubeWords` the bridge returns, which is what lets the Swift gate compare
            /// them field for field - see `CubeWordsTests`.
            let words: CubeWords
        }
        struct Probe: Decodable { let sizes: [String: Size] }
        let capturedFrom: String
        let sourceSha256: String
        let probe: Probe
    }

    static func snapshot() throws -> Snapshot {
        try JSONDecoder().decode(Snapshot.self, from: data(at: "cube/tools/fixtures/cube-engine-snapshot.json"))
    }

    // MARK: - the parity corpus (tools/fixtures/cube-parity-corpus.json)

    /// One seeded round trip: scramble by seed, undo by the engine's own inverse, and the
    /// sticker view along the way. Stored as a compact array so 20,000 rows stay readable
    /// in a diff, so it is decoded positionally.
    struct ParityRow: Decodable {
        let seed: Int
        let depth: Int
        let moves: String
        let keyAfter: String
        /// nil means "landed back on the solved key", which is the normal case.
        let back: String?
        let stickersFnv: String

        init(from decoder: Decoder) throws {
            var c = try decoder.unkeyedContainer()
            seed = try c.decode(Int.self)
            depth = try c.decode(Int.self)
            moves = try c.decode(String.self)
            keyAfter = try c.decode(String.self)
            back = try c.decodeIfPresent(String.self)
            stickersFnv = try c.decode(String.self)
        }
    }
    struct ParityBand: Decodable {
        let solvedKey: String
        let rowCount: Int
        let wandered: Int
        let rows: [ParityRow]
    }
    struct ParityCorpus: Decodable {
        let stamp: String
        let payloadHash: String
        let rowsPerSize: Int
        let sizes: [String: ParityBand]
    }

    static func parityCorpus() throws -> ParityCorpus {
        try JSONDecoder().decode(ParityCorpus.self, from: data(at: "tools/fixtures/cube-parity-corpus.json"))
    }

    // MARK: - hashes

    /// FNV-1a, 32-bit, the standard constants. The bundle computes the same thing in
    /// JavaScript (`CUBE_API`'s `fnv1a`) and the corpus generator in node; a mismatch here
    /// means the MOVES differ, not that the hash does.
    static func fnv1a(_ s: String) -> String {
        var h: UInt32 = 0x811c9dc5
        for u in s.unicodeScalars {
            let c = UInt32(u.value)
            h ^= (c & 0xff)
            if c > 0xff { h ^= (c >> 8) }
            h = h &+ ((h << 1) &+ (h << 4) &+ (h << 7) &+ (h << 8) &+ (h << 24))
        }
        return String(format: "%08x", h)
    }

    /// SHA-256, first 32 hex characters - the same digest the probe writes into the
    /// snapshot (`sha()` there is sha256 truncated to 32 chars).
    ///
    /// Written out rather than taken from CryptoKit on purpose: this test target has to
    /// build under Command Line Tools with no Xcode, and one 30-line function is a smaller
    /// bet than a framework's availability on whatever Supreme is running.
    static func sha256Short(_ s: String) -> String {
        var message = Array(s.utf8)
        let bitLength = UInt64(message.count) * 8
        message.append(0x80)
        while message.count % 64 != 56 { message.append(0) }
        for i in (0..<8).reversed() { message.append(UInt8((bitLength >> (UInt64(i) * 8)) & 0xff)) }

        var h: [UInt32] = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
                           0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]
        let k: [UInt32] = [
            0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
            0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
            0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
            0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
            0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
            0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
            0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
            0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]

        var w = [UInt32](repeating: 0, count: 64)
        var chunk = 0
        while chunk < message.count {
            for i in 0..<16 {
                let o = chunk + i * 4
                w[i] = (UInt32(message[o]) << 24) | (UInt32(message[o + 1]) << 16)
                     | (UInt32(message[o + 2]) << 8) | UInt32(message[o + 3])
            }
            for i in 16..<64 {
                let s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >> 3)
                let s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >> 10)
                w[i] = w[i - 16] &+ s0 &+ w[i - 7] &+ s1
            }
            var a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hh = h[7]
            for i in 0..<64 {
                let S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)
                let ch = (e & f) ^ (~e & g)
                let t1 = hh &+ S1 &+ ch &+ k[i] &+ w[i]
                let S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)
                let maj = (a & b) ^ (a & c) ^ (b & c)
                let t2 = S0 &+ maj
                hh = g; g = f; f = e; e = d &+ t1; d = c; c = b; b = a; a = t1 &+ t2
            }
            h[0] = h[0] &+ a; h[1] = h[1] &+ b; h[2] = h[2] &+ c; h[3] = h[3] &+ d
            h[4] = h[4] &+ e; h[5] = h[5] &+ f; h[6] = h[6] &+ g; h[7] = h[7] &+ hh
            chunk += 64
        }
        return h.map { String(format: "%08x", $0) }.joined().prefix(32).description
    }

    private static func rotr(_ x: UInt32, _ n: UInt32) -> UInt32 { (x >> n) | (x << (32 - n)) }
}
