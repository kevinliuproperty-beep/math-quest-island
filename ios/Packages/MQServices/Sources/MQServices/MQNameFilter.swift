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
///    non-Latin script - "Zoë" becomes "Zo". That is a real limitation of the web
///    rule and it is inherited knowingly; changing it is a change to BOTH
///    runtimes, not a patch to this file.
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
    private static let allowed: Set<Character> = {
        var s = Set<Character>("abcdefghijklmnopqrstuvwxyz")
        s.formUnion("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
        s.formUnion("0123456789")
        s.insert("_"); s.insert(" "); s.insert("-")
        return s
    }()

    /// Sanitise a name for display and storage.
    public static func clean(_ raw: String) -> String {
        let kept = String(raw.filter { allowed.contains($0) })
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
