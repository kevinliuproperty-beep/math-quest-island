import MQDesign

/// The unit tables, which now live in `MQDesign`.
///
/// Moved with `QTypedEntry` on the rehearsal fix pass, 2026-09-07, so the
/// Patchwerk arena can offer the same chips the Quest battle does. See
/// `QTypedEntry.swift` for the measurement that forced the move and
/// `MQDesign/Core/MQUnits.swift` for the tables themselves - every one of them
/// measured off the shipped bundle rather than guessed, which is exactly why
/// there must be only one copy.
public typealias QUnits = MQUnits
public typealias QUnitClass = MQUnitClass
