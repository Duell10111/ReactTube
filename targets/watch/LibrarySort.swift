import Foundation
import Observation

enum LibrarySortScope: String {
  case playlists, videos, downloaded, available, playlistDetail
  /// Explicit per-view allow list; criteria are never shared through `CaseIterable`.
  var criteria: [String] {
    switch self {
    case .playlists: return ["title", "count", "lastPlayed", "added"]
    case .videos: return ["title", "artist", "duration", "added"]
    case .downloaded: return ["title", "artist", "duration", "downloaded"]
    case .available: return ["title", "artist", "validity"]
    case .playlistDetail: return ["order", "title", "artist", "duration"]
    }
  }
  var defaultSelection: LibrarySortSelection {
    LibrarySortSelection(criterion: self == .playlistDetail ? "order" : "title")
  }
}
struct LibrarySortSelection: Codable, Equatable {
  /// Criteria whose first direction is descending (most, newest).
  static let descendingFirst: Set<String> = ["count", "added", "downloaded", "lastPlayed"]
  var criterion = "title"
  var descending = false
  init(criterion: String = "title", descending: Bool? = nil) {
    self.criterion = criterion
    // The playlist order has no direction, so no hidden reversal is stored.
    self.descending =
      criterion == "order" ? false : descending ?? Self.descendingFirst.contains(criterion)
  }
  var hasDirection: Bool { criterion != "order" }
}
@Observable final class LibrarySortPreferences {
  static let shared = LibrarySortPreferences()
  private static let detailsKey = "sort.playlistDetails"
  private let defaults: UserDefaults
  private var selections: [String: LibrarySortSelection] = [:]
  private var details: [String: LibrarySortSelection] = [:]
  init(defaults: UserDefaults = .standard) {
    self.defaults = defaults
    for scope in [LibrarySortScope.playlists, .videos, .downloaded, .available] {
      if let data = defaults.data(forKey: "sort.\(scope.rawValue)"),
        let selection = try? JSONDecoder().decode(LibrarySortSelection.self, from: data),
        scope.criteria.contains(selection.criterion)
      {
        selections[scope.rawValue] = selection
      }
    }
    if let data = defaults.data(forKey: Self.detailsKey),
      let stored = try? JSONDecoder().decode([String: LibrarySortSelection].self, from: data)
    {
      details = stored.filter { LibrarySortScope.playlistDetail.criteria.contains($0.value.criterion) }
    }
  }
  /// Playlist details are stored per playlist ID; other scopes ignore `playlistID`.
  func selection(_ scope: LibrarySortScope, playlistID: String? = nil) -> LibrarySortSelection {
    let stored = scope == .playlistDetail ? playlistID.flatMap { details[$0] } : selections[scope.rawValue]
    return stored ?? scope.defaultSelection
  }
  func set(_ selection: LibrarySortSelection, for scope: LibrarySortScope, playlistID: String? = nil) {
    guard scope.criteria.contains(selection.criterion) else { return }
    if scope == .playlistDetail {
      guard let playlistID else { return }
      details[playlistID] = selection
      persistDetails()
    } else {
      selections[scope.rawValue] = selection
      defaults.set(try? JSONEncoder().encode(selection), forKey: "sort.\(scope.rawValue)")
    }
  }
  /// Called when a playlist is deleted; a refresh or sync of it keeps the setting.
  func removePlaylist(id: String) {
    guard details.removeValue(forKey: id) != nil else { return }
    persistDetails()
  }
  func removeAllPlaylists() {
    details.removeAll()
    defaults.removeObject(forKey: Self.detailsKey)
  }
  private func persistDetails() {
    defaults.set(try? JSONEncoder().encode(details), forKey: Self.detailsKey)
  }
}

/// Missing values always follow known values; IDs break ties independently of direction.
enum LibrarySorter {
  static func ordered<T>(
    _ values: [T], selection: LibrarySortSelection, locale: Locale,
    id: (T) -> String, text: (T) -> String?, number: (T) -> Double?
  ) -> [T] {
    // The original playlist order is taken over unchanged, without any comparison.
    guard selection.hasDirection else { return values }
    return values.sorted { a, b in
      let result: ComparisonResult
      if ["title", "artist"].contains(selection.criterion) {
        let left = text(a)?.trimmingCharacters(in: .whitespacesAndNewlines)
        let right = text(b)?.trimmingCharacters(in: .whitespacesAndNewlines)
        let l = left.flatMap { $0.isEmpty ? nil : $0 }
        let r = right.flatMap { $0.isEmpty ? nil : $0 }
        if (l == nil) != (r == nil) { return l != nil }
        result =
          l?.compare(
            r ?? "", options: [.numeric, .caseInsensitive, .diacriticInsensitive], locale: locale)
          ?? .orderedSame
      } else {
        let l = number(a)
        let r = number(b)
        if (l == nil) != (r == nil) { return l != nil }
        result =
          l == r ? .orderedSame : ((l ?? 0) < (r ?? 0) ? .orderedAscending : .orderedDescending)
      }
      if result == .orderedSame { return id(a) < id(b) }
      return result == (selection.descending ? .orderedDescending : .orderedAscending)
    }
  }
  static func streamAvailable(
    downloaded: Bool, file: String?, stream: String?, until: Date?, now: Date
  ) -> Bool {
    !downloaded && file == nil && stream != nil && (until.map { $0 > now } ?? false)
  }
}

/// ID-based queue decisions, kept free of player and database types.
enum QueueOrder {
  /// Removes duplicates while keeping the first occurrence.
  static func unique(_ ids: [String]) -> [String] {
    var seen: Set<String> = []
    return ids.filter { seen.insert($0).inserted }
  }
  /// Position of the selected title among the playable items. Never falls back
  /// to a neighbor or a stored index: an unplayable selection starts nothing.
  static func startIndex(playable: [String], selectedID: String) -> Int? {
    playable.firstIndex(of: selectedID)
  }
  /// Order of a resumed playlist queue. The stored queue wins over the current
  /// playlist order; titles that left the playlist are skipped and new ones are
  /// not inserted. Resume data without a stored queue uses the current order.
  static func resumed(stored: [String]?, current: [String]) -> [String] {
    guard let stored else { return unique(current) }
    let members = Set(current)
    return unique(stored.filter { members.contains($0) })
  }
}
