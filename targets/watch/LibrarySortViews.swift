import Accessibility
import SwiftUI

extension LibrarySorter {
  static func videos(_ values: [Video], selection: LibrarySortSelection, locale: Locale) -> [Video]
  {
    ordered(
      values, selection: selection, locale: locale, id: { $0.id },
      text: { selection.criterion == "artist" ? $0.artist : $0.title },
      number: {
        switch selection.criterion {
        case "validity": return $0.validUntil?.timeIntervalSince1970
        case "added": return $0.addedAt?.timeIntervalSince1970
        case "downloaded": return $0.downloadedAt?.timeIntervalSince1970
        default: return $0.durationMillis > 0 ? Double($0.durationMillis) : nil
        }
      })
  }
  static func playlists(_ values: [Playlist], selection: LibrarySortSelection, locale: Locale)
    -> [Playlist]
  {
    ordered(
      values, selection: selection, locale: locale, id: { $0.id }, text: { $0.title },
      number: {
        switch selection.criterion {
        case "added": return $0.addedAt?.timeIntervalSince1970
        case "lastPlayed": return $0.lastPlayedAt?.timeIntervalSince1970
        default: return Double(max($0.videoIDs.count, $0.videos.count))
        }
      })
  }
}

struct SortHeaderButton: View {
  let scope: LibrarySortScope
  var playlistID: String? = nil
  @State private var presenting = false
  @AccessibilityFocusState private var focused: Bool
  @AppStorage("uiLanguage") private var language = "en"
  private let preferences = LibrarySortPreferences.shared
  var body: some View {
    Button {
      presenting = true
    } label: {
      Label(summary, systemImage: "arrow.up.arrow.down").fixedSize(
        horizontal: false, vertical: true
      )
      .frame(maxWidth: .infinity, alignment: .leading)
    }
    .accessibilityFocused($focused)
    .onChange(of: presenting) { _, visible in if !visible { focused = true } }
    .sheet(isPresented: $presenting) {
      SortPickerSheet(
        scope: scope, playlistID: playlistID,
        initial: preferences.selection(scope, playlistID: playlistID))
    }
  }
  private var summary: String {
    sortSummary(preferences.selection(scope, playlistID: playlistID))
  }
}
private func sortSummary(_ value: LibrarySortSelection) -> String {
  guard value.hasDirection else {
    return LibraryCopy.format("sort.summaryOrder", LibraryCopy.text("criterion.order"))
  }
  return LibraryCopy.format(
    "sort.summary", LibraryCopy.text("criterion.\(value.criterion)"),
    LibraryCopy.text(directionKey(value)))
}
private func directionKey(_ value: LibrarySortSelection) -> String {
  switch value.criterion {
  case "count": return value.descending ? "direction.most" : "direction.fewest"
  case "duration": return value.descending ? "direction.longest" : "direction.shortest"
  case "validity": return value.descending ? "direction.later" : "direction.sooner"
  case "added", "downloaded", "lastPlayed":
    return value.descending ? "direction.newest" : "direction.oldest"
  default: return value.descending ? "direction.za" : "direction.az"
  }
}
struct SortPickerSheet: View {
  let scope: LibrarySortScope
  let playlistID: String?
  let initial: LibrarySortSelection
  @State private var draft: LibrarySortSelection
  @Environment(\.dismiss) private var dismiss
  init(scope: LibrarySortScope, playlistID: String? = nil, initial: LibrarySortSelection) {
    self.scope = scope
    self.playlistID = playlistID
    self.initial = initial
    _draft = State(initialValue: initial)
  }
  var body: some View {
    ScrollViewReader { proxy in
      List {
        Section(LibraryCopy.text("sort.by")) {
          ForEach(scope.criteria, id: \.self) { criterion in
            option(
              LibraryCopy.text("criterion.\(criterion)"), selected: draft.criterion == criterion
            ) {
              if draft.criterion != criterion { draft = LibrarySortSelection(criterion: criterion) }
            }.id(criterion)
          }
        }
        // The playlist order has no direction to choose.
        if draft.hasDirection {
          Section(LibraryCopy.text("sort.order")) {
            ForEach([false, true], id: \.self) { descending in
              let value = LibrarySortSelection(criterion: draft.criterion, descending: descending)
              option(LibraryCopy.text(directionKey(value)), selected: draft.descending == descending)
              { draft.descending = descending }
            }
          }
        }
        Button(LibraryCopy.text("sort.apply")) {
          LibrarySortPreferences.shared.set(draft, for: scope, playlistID: playlistID)
          AccessibilityNotification.Announcement(sortSummary(draft)).post()
          dismiss()
        }.disabled(draft == initial)
        Button(LibraryCopy.text("cancel"), role: .cancel) { dismiss() }
      }.navigationTitle(LibraryCopy.text("sort.title"))
        .onAppear { proxy.scrollTo(initial.criterion, anchor: .top) }
    }
  }
  private func option(_ text: String, selected: Bool, action: @escaping () -> Void) -> some View {
    Button(action: action) {
      HStack {
        Text(text)
        Spacer()
        if selected { Image(systemName: "checkmark") }
      }
    }.accessibilityAddTraits(selected ? .isSelected : [])
  }
}

struct SortValueLabel: View {
  let video: Video
  let selection: LibrarySortSelection
  let now: Date
  var body: some View {
    if selection.criterion == "duration" {
      Text(
        video.durationMillis > 0
          ? String(
            format: "%d:%02d", video.durationMillis / 60000, video.durationMillis / 1000 % 60)
          : LibraryCopy.text("duration.unknown")
      )
      .font(.footnote).foregroundStyle(.secondary)
    } else if selection.criterion == "validity", !video.downloaded, video.fileURL == nil {
      Text(
        LibraryCopy.format(
          "stream.remaining",
          max(0, Int((video.validUntil?.timeIntervalSince(now) ?? 0) / 60)).formatted(
            .number.locale(LibraryCopy.locale)))
      )
      .font(.footnote).foregroundStyle(.secondary)
    } else if selection.criterion == "added" {
      SortDateLabel(key: "value.added", date: video.addedAt)
    } else if selection.criterion == "downloaded" {
      SortDateLabel(key: "value.downloaded", date: video.downloadedAt)
    }
  }
}

/// Shows the date criterion of a playlist; the title count is already in the row.
struct PlaylistSortValueLabel: View {
  let playlist: Playlist
  let selection: LibrarySortSelection
  var body: some View {
    if selection.criterion == "added" {
      SortDateLabel(key: "value.added", date: playlist.addedAt)
    } else if selection.criterion == "lastPlayed" {
      SortDateLabel(key: "value.lastPlayed", date: playlist.lastPlayedAt, relative: true)
    }
  }
}

/// Labeled date of the active criterion. A missing historical value is shown
/// as unknown and never replaced by an invented date or "never".
struct SortDateLabel: View {
  let key: String
  let date: Date?
  var relative = false
  var body: some View {
    Text(date.map { LibraryCopy.format(key, format($0)) } ?? LibraryCopy.text(key + "Unknown"))
      .font(.footnote).foregroundStyle(.secondary)
      .fixedSize(horizontal: false, vertical: true)
  }
  private func format(_ date: Date) -> String {
    if relative, Date().timeIntervalSince(date) < 7 * 24 * 3600 {
      return date.formatted(.relative(presentation: .named).locale(LibraryCopy.locale))
    }
    return date.formatted(.dateTime.day().month(.abbreviated).year().locale(LibraryCopy.locale))
  }
}
