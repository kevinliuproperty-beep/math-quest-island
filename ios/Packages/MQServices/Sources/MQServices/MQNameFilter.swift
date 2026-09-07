import Foundation

/// The web's leaderboard name rule, carried over verbatim.
///
/// `api/leaderboard.js` does exactly this before a name touches storage:
///
/// ```js
/// let name = String(b.name||'').replace(/[^\w \-]/g,'').trim().slice(0,14) || 'Hero';
/// if(BAD.some(w=>name.toLowerCase().includes(w))) name = 'Hero';
/// ```
///
/// It is carried rather than improved on purpose. A different filter on iOS means
/// a name that is allowed on one and rewritten on the other, and the first person
/// to notice would be a child whose own name came back as "Hero" on one device.
///
/// Two properties worth stating, because both are deliberate and both look like
/// bugs from the outside:
///
///  * `\w` in JavaScript is ASCII `[A-Za-z0-9_]`. So this strips accents and every
///    non-Latin script - precomposed "Zoë" becomes "Zo". That is a real limitation
///    of the web rule and it is inherited knowingly; changing it is a change to
///    BOTH runtimes, not a patch to this file.
///  * **It filters UNICODE SCALARS, not Characters, and that is the whole of the
///    2026-09-07 fix.** A JS regex without `/u` walks UTF-16 CODE UNITS: given
///    decomposed "José" (`e` + U+0301) it drops the combining mark and KEEPS the
///    `e`, so the web returns "Jose". Swift's `String` iterates GRAPHEME CLUSTERS,
///    so `raw.filter { allowed.contains($0) }` saw one Character `é`, found it not
///    allowed, and threw the base letter away with the accent - "Jos". 704 of
///    3,043 unicode names diverged; ASCII was exact, which is why the lane's own
///    tests never saw it. Decomposed text is not exotic on Apple platforms: paste,
///    iCloud, and anything that has been through an APFS/HFS+ path produces it.
///    A non-BMP scalar is two disallowed UTF-16 units on the web and one
///    disallowed scalar here, so the two agree there too.
///    Pinned by `tools/fixtures/leaderboard-names.json` (7,053 cases computed by
///    node from the real rule) and gated by `npm run test:name-parity`.
///  * the block list is SUBSTRING-matched, so it over-blocks (the Scunthorpe
///    problem). On a board a child's parent can see, over-blocking to "Hero" is
///    the cheap failure and under-blocking is the expensive one.
public enum MQNameFilter {

    /// The web's `BAD` list, byte for byte from `api/leaderboard.js`.
    public static let blocked: [String] = [
        "fuck", "shit", "bitch", "cunt", "dick", "cock", "nigg",
        "fag", "slut", "whore", "asshole"
    ]

    /// The fallback the web uses. A name, not an error: a child who types
    /// something unusable still gets a row.
    public static let fallback = "Hero"

    public static let maxLength = 14

    /// JavaScript's `\w`, plus the space and hyphen the web rule keeps.
    ///
    /// A set of SCALARS, not of Characters. See the note on the type: the unit the
    /// web's regex works in is the UTF-16 code unit, and a scalar set is the only
    /// Swift alphabet that agrees with it on decomposed input.
    private static let allowed: Set<Unicode.Scalar> = {
        var s = Set<Unicode.Scalar>()
        for u in UInt32(65)...UInt32(90) { s.insert(Unicode.Scalar(u)!) }    // A-Z
        for u in UInt32(97)...UInt32(122) { s.insert(Unicode.Scalar(u)!) }   // a-z
        for u in UInt32(48)...UInt32(57) { s.insert(Unicode.Scalar(u)!) }    // 0-9
        s.insert("_"); s.insert(" "); s.insert("-")
        return s
    }()

    /// Sanitise a name for display and storage.
    public static func clean(_ raw: String) -> String {
        // `.replace(/[^\w \-]/g,'')` over UTF-16 code units. Filtering scalars is
        // the same walk: every allowed scalar is one BMP code unit, and every
        // disallowed one - a combining mark, a CJK ideograph, half a surrogate
        // pair - is dropped on both sides.
        let kept = String(String.UnicodeScalarView(raw.unicodeScalars.filter { allowed.contains($0) }))
        // JS `.trim()` strips whitespace at both ends; only the space survives the
        // filter above, so trimming spaces is the whole of it.
        let trimmed = kept.trimmingCharacters(in: .whitespaces)
        // `.slice(0,14)` counts UTF-16 units; after the filter every kept
        // character is one unit, so a character count is the same cut.
        let cut = String(trimmed.prefix(maxLength))
        if cut.isEmpty { return fallback }
        let lower = cut.lowercased()
        if blocked.contains(where: { lower.contains($0) }) { return fallback }
        return cut
    }
}
