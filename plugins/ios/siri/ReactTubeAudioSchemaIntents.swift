// Copied into the app target by plugins/ios/withSiri.js.
//
// On iOS 27, Siri hands free-form requests such as "search Queen in
// ReactTube" to the Apple Intelligence planner instead of SiriKit media
// intents. The planner only considers intents and entities that conform to an
// App Schema, so ReactTube offers `.system.searchInApp` and `.audio.playAudio`.
//
// The entities cannot be looked up on the device: YouTube Music is only
// reachable from JavaScript. Their queries therefore wrap the spoken name, and
// JavaScript searches for it when the intent runs.

import AppIntents
import Intents
// internal: ExpoModulesProvider imports the module with that access level.
internal import SiriMedia

/// Entity ids: `search:<spoken name>` or `video:<YouTube video id>`.
@available(iOS 27.0, *)
private enum SchemaEntityID {
  static let searchPrefix = "search:"
  static let videoPrefix = "video:"

  static func search(_ name: String) -> String {
    return searchPrefix + name
  }

  static func name(of id: String) -> String {
    return id.hasPrefix(searchPrefix) ? String(id.dropFirst(searchPrefix.count)) : id
  }

  /// The donated-item identifier JavaScript understands, if the id names a video.
  static func itemIdentifier(of id: String) -> String? {
    guard id.hasPrefix(videoPrefix) else {
      return nil
    }
    return "rt:video:" + id.dropFirst(videoPrefix.count)
  }
}

// MARK: - Search

@available(iOS 27.0, *)
@AppIntent(schema: .system.searchInApp)
struct SystemSearchInAppIntent: ShowInAppSearchResultsIntent {
  static var searchScopes: [StringSearchScope] = [.general]
  static let openAppWhenRun = true

  var criteria: StringSearchCriteria

  @MainActor
  func perform() async throws -> some IntentResult {
    SiriMediaAppIntentBridge.search(query: criteria.term)
    return .result()
  }
}

// MARK: - Entities

@available(iOS 27.0, *)
@AppEntity(schema: .audio.artist)
struct ArtistEntity {
  static let defaultQuery = ArtistEntityQuery()

  let id: String

  var name: String

  var displayRepresentation: DisplayRepresentation {
    DisplayRepresentation(title: "\(name)")
  }

  init(id: String) {
    self.id = id
    name = SchemaEntityID.name(of: id)
  }

  struct ArtistEntityQuery: EntityStringQuery {
    func entities(for identifiers: [String]) async throws -> [ArtistEntity] {
      return identifiers.map(ArtistEntity.init(id:))
    }

    func entities(matching string: String) async throws -> [ArtistEntity] {
      return [ArtistEntity(id: SchemaEntityID.search(string))]
    }
  }
}

@available(iOS 27.0, *)
@AppEntity(schema: .audio.album)
struct AlbumEntity {
  static let defaultQuery = AlbumEntityQuery()

  let id: String

  var title: String
  var artistName: String
  var artists: [ArtistEntity]
  var universalProductCode: String?

  var displayRepresentation: DisplayRepresentation {
    DisplayRepresentation(title: "\(title)")
  }

  init(id: String) {
    self.id = id
    title = SchemaEntityID.name(of: id)
    artistName = ""
    artists = []
  }

  struct AlbumEntityQuery: EntityStringQuery {
    func entities(for identifiers: [String]) async throws -> [AlbumEntity] {
      return identifiers.map(AlbumEntity.init(id:))
    }

    func entities(matching string: String) async throws -> [AlbumEntity] {
      return [AlbumEntity(id: SchemaEntityID.search(string))]
    }
  }
}

@available(iOS 27.0, *)
@AppEntity(schema: .audio.song)
struct SongEntity {
  static let defaultQuery = SongEntityQuery()

  let id: String

  var title: String
  var artistName: String
  var composerName: String?
  var albumTitle: String?
  var artists: [ArtistEntity]
  var album: AlbumEntity?
  var composers: [ArtistEntity]
  var internationalStandardRecordingCode: String?

  var displayRepresentation: DisplayRepresentation {
    DisplayRepresentation(title: "\(title)")
  }

  init(id: String) {
    self.id = id
    title = SchemaEntityID.name(of: id)
    artistName = ""
    artists = []
    composers = []
  }

  struct SongEntityQuery: EntityStringQuery {
    func entities(for identifiers: [String]) async throws -> [SongEntity] {
      return identifiers.map(SongEntity.init(id:))
    }

    func entities(matching string: String) async throws -> [SongEntity] {
      return [SongEntity(id: SchemaEntityID.search(string))]
    }
  }
}

@available(iOS 27.0, *)
@AppEntity(schema: .audio.playlist)
struct PlaylistEntity {
  static let defaultQuery = PlaylistEntityQuery()

  let id: String

  var title: String
  var owner: PlaylistOwner?
  var createdByMe: Bool?
  var curatedForMe: Bool?

  var displayRepresentation: DisplayRepresentation {
    DisplayRepresentation(title: "\(title)")
  }

  init(id: String) {
    self.id = id
    title = SchemaEntityID.name(of: id)
  }

  struct PlaylistEntityQuery: EntityStringQuery {
    func entities(for identifiers: [String]) async throws -> [PlaylistEntity] {
      return identifiers.map(PlaylistEntity.init(id:))
    }

    func entities(matching string: String) async throws -> [PlaylistEntity] {
      return [PlaylistEntity(id: SchemaEntityID.search(string))]
    }
  }
}

/// The `playlist` schema types the owner as a person or a plain name.
@available(iOS 27.0, *)
@UnionValue
enum PlaylistOwner {
  case person(IntentPerson)
  case name(String)
}

/// Required by the `playAudio` schema; ReactTube does not warm up a queue.
@available(iOS 27.0, *)
@AppEntity(schema: .audio.warmupAudioQueueResult)
struct WarmupAudioQueueResult {
  static let defaultQuery = WarmupAudioQueueResultQuery()

  let id: String

  var displayRepresentation: DisplayRepresentation {
    DisplayRepresentation(title: "\(id)")
  }

  struct WarmupAudioQueueResultQuery: EntityStringQuery {
    func entities(for identifiers: [String]) async throws -> [WarmupAudioQueueResult] {
      return identifiers.map(WarmupAudioQueueResult.init(id:))
    }

    func entities(matching string: String) async throws -> [WarmupAudioQueueResult] {
      return []
    }
  }
}

@available(iOS 27.0, *)
@AppEnum(schema: .audio.playbackAttributes)
enum PlaybackAttributes: String {
  case shuffle
  case `repeat`

  static let caseDisplayRepresentations: [Self: DisplayRepresentation] = [
    .shuffle: "Shuffle",
    .repeat: "Repeat",
  ]
}

@available(iOS 27.0, *)
@AppEnum(schema: .audio.queueInsertionLocation)
enum QueueInsertionLocation: String {
  case next
  case tail

  static let caseDisplayRepresentations: [Self: DisplayRepresentation] = [
    .next: "Next",
    .tail: "Tail",
  ]
}

@available(iOS 27.0, *)
@UnionValue
enum AudioItem {
  case song(SongEntity)
  case album(AlbumEntity)
  case artist(ArtistEntity)
  case playlist(PlaylistEntity)
}

// MARK: - Play

@available(iOS 27.0, *)
@AppIntent(schema: .audio.playAudio)
struct PlayAudioIntent {
  var audioEntity: AudioItem
  var playbackAttributes: Set<PlaybackAttributes>
  var warmupAudioQueueResult: WarmupAudioQueueResult?
  var queueLocation: QueueInsertionLocation?

  @MainActor
  func perform() async throws -> some IntentResult & ProvidesDialog {
    let request: (id: String, type: INMediaItemType)
    switch audioEntity {
    case let .song(song):
      request = (song.id, .song)
    case let .album(album):
      request = (album.id, .album)
    case let .artist(artist):
      request = (artist.id, .artist)
    case let .playlist(playlist):
      request = (playlist.id, .playlist)
    }

    let outcome = await SiriMediaAppIntentBridge.play(
      query: SchemaEntityID.name(of: request.id),
      mediaType: request.type,
      itemIdentifier: SchemaEntityID.itemIdentifier(of: request.id),
      startReactHeadless: startReactHeadless
    )
    let track = try track(from: outcome)
    return .result(dialog: playingDialog(title: track.title, artist: track.artist))
  }
}
