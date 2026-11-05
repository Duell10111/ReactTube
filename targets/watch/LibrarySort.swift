import Foundation
import Observation

enum VideoSortCriterion: String, Codable, CaseIterable {
  case title, artist, duration, validity
}
enum PlaylistSortCriterion: String, Codable, CaseIterable {
  case title, count
}
enum LibrarySortScope: String {
  case playlists, videos, downloaded, available
  var criteria: [String] {
    switch self {
    case .playlists: return PlaylistSortCriterion.allCases.map(\.rawValue)
    case .available: return VideoSortCriterion.allCases.map(\.rawValue)
    default: return ["title", "artist", "duration"]
    }
  }
}
struct LibrarySortSelection: Codable, Equatable {
  var criterion = "title"
  var descending = false
  init(criterion: String = "title", descending: Bool? = nil) {
    self.criterion = criterion
    self.descending = descending ?? (criterion == "count")
  }
}
@Observable final class LibrarySortPreferences {
  static let shared = LibrarySortPreferences()
  private let defaults: UserDefaults
  private var selections: [String: LibrarySortSelection] = [:]
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
  }
  func selection(_ scope: LibrarySortScope) -> LibrarySortSelection {
    selections[scope.rawValue] ?? LibrarySortSelection()
  }
  func set(_ selection: LibrarySortSelection, for scope: LibrarySortScope) {
    guard scope.criteria.contains(selection.criterion) else { return }
    selections[scope.rawValue] = selection
    defaults.set(try? JSONEncoder().encode(selection), forKey: "sort.\(scope.rawValue)")
  }
}

/// Missing values always follow known values; IDs break ties independently of direction.
enum LibrarySorter {
  static func ordered<T>(
    _ values: [T], selection: LibrarySortSelection, locale: Locale,
    id: (T) -> String, text: (T) -> String?, number: (T) -> Double?
  ) -> [T] {
    values.sorted { a, b in
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
