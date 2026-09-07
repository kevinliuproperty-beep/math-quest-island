import SwiftUI
import CoreText

/// Bundled display faces.
///
/// The first sample was set entirely in SF Rounded. SF Rounded is the
/// platform's own toy voice, which means it is also every other kid app's toy
/// voice -- the single loudest reason that render read as a template. Both
/// rework directions bundle an OFL face instead and register it at runtime, so
/// the type is the app's rather than the OS's.
///
/// Registration goes through CoreText rather than an Info.plist key, because
/// the taste gate renders headlessly on macOS with no app bundle at all. The
/// same call works unchanged on iOS.
///
/// Both files are variable fonts; CoreText exposes their named instances under
/// ordinary PostScript names (`Baloo2-ExtraBold`, `Fredoka-SemiBold`), so
/// `Font.custom` resolves them without any variation-axis plumbing.
public enum MQFonts {

    /// Baloo 2 -- Ek Type. A rounded face with a hand-cut wobble in the
    /// terminals and a very tall x-height. Warm, storybook, slightly imperfect.
    public enum Baloo {
        public static let regular   = "Baloo2-Regular"
        public static let medium    = "Baloo2-Medium"
        public static let semibold  = "Baloo2-SemiBold"
        public static let bold      = "Baloo2-Bold"
        public static let extrabold = "Baloo2-ExtraBold"
    }

    /// Fredoka -- Milena Brandao / Hafontia. Geometric, wide, uniform stroke.
    /// Reads like moulded plastic: the arcade voice.
    public enum Fredoka {
        public static let regular  = "Fredoka-Regular"
        public static let medium   = "Fredoka-Medium"
        public static let semibold = "Fredoka-SemiBold"
        public static let bold     = "Fredoka-Bold"
    }

    private static let files = ["Baloo2-Variable", "Fredoka-Variable"]

    private static var didRegister = false
    private static let lock = NSLock()

    /// Idempotent. Call once before rendering anything; calling it again is
    /// free. Returns the faces that failed, so a caller can fail loudly rather
    /// than silently falling back to the system face -- a silent fallback is
    /// exactly how a bespoke design turns back into a template.
    @discardableResult
    public static func register() -> [String] {
        lock.lock()
        defer { lock.unlock() }
        if didRegister { return [] }

        var failed: [String] = []
        for name in files {
            guard let url = Bundle.module.url(forResource: name, withExtension: "ttf")
                    ?? Bundle.module.url(forResource: name, withExtension: "ttf", subdirectory: "Fonts") else {
                failed.append("\(name).ttf (not in bundle)")
                continue
            }
            var error: Unmanaged<CFError>?
            if !CTFontManagerRegisterFontsForURL(url as CFURL, .process, &error) {
                // Already-registered is a success from our point of view.
                let code = (error?.takeRetainedValue()).map { CFErrorGetCode($0) } ?? -1
                if code != CTFontManagerError.alreadyRegistered.rawValue {
                    failed.append("\(name).ttf (CoreText \(code))")
                }
            }
        }
        didRegister = failed.isEmpty
        return failed
    }

    /// True once the named face actually resolves. Used by the snapshot tool as
    /// a gate: a render that quietly fell back to the system font is a failed
    /// render, not a rendered one.
    public static func resolves(_ postScriptName: String) -> Bool {
        let desc = CTFontDescriptorCreateWithAttributes(
            [kCTFontNameAttribute: postScriptName as CFString] as CFDictionary
        )
        let font = CTFontCreateWithFontDescriptor(desc, 12, nil)
        return (CTFontCopyPostScriptName(font) as String) == postScriptName
    }
}
