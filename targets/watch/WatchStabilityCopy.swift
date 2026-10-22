//
//  WatchStabilityCopy.swift
//  watch
//

import Foundation

/// Typed native copy for stability, recovery and download UI. This preference is
/// separate from the language sent to YouTube and can be selected before the
/// store opens.
enum WatchStabilityCopy {
  enum Key: CaseIterable {
    case downloadSaveFailed, downloadStartFailed, downloadUnavailable
    case downloadMetadataFailed, downloadConnectionFailed
    case downloadLinkExpired, downloadServerError, downloadNetworkFailed
    case downloadInterrupted, downloadFailed
    case recoveryLoading, recoveryTitle, recoveryExplanation, recoveryRetry
    case recoveryRebuild, recoveryCancel, recoveryConfirmation, recoveryBackup
    case appLanguage, switchLanguage
    case downloadNotificationsSetting
    case batchTitlePhone, batchTitlePlaylist, batchTitleVideo
    case batchSingleDownloaded, batchSingleFailed
    case batchDownloadedOne, batchDownloadedOther
    case batchFailedOne, batchFailedOther
    case batchPartial
  }

  static func text(_ key: Key, language: String? = nil) -> String {
    let value: (en: String, de: String)
    switch key {
    case .downloadSaveFailed: value = ("The downloaded file could not be saved.", "Die heruntergeladene Datei konnte nicht gespeichert werden.")
    case .downloadStartFailed: value = ("The download could not be started.", "Der Download konnte nicht gestartet werden.")
    case .downloadUnavailable: value = ("No download URL available.", "Kein Download-Link verfügbar.")
    case .downloadMetadataFailed: value = ("The iPhone could not load download information. Please try again.", "Das iPhone konnte die Downloadinformationen nicht laden. Bitte erneut versuchen.")
    case .downloadConnectionFailed: value = ("Download information timed out. Reconnect the iPhone and try again.", "Zeitüberschreitung beim Laden der Downloadinformationen. Das iPhone erneut verbinden und noch einmal versuchen.")
    case .downloadLinkExpired: value = ("The download link has expired. Try again to request a new one.", "Der Download-Link ist abgelaufen. Erneut versuchen, um einen neuen anzufordern.")
    case .downloadServerError: value = ("The server rejected the download (HTTP %d).", "Der Server hat den Download abgelehnt (HTTP %d).")
    case .downloadNetworkFailed: value = ("The connection was lost during the download.", "Die Verbindung ist während des Downloads abgebrochen.")
    case .downloadInterrupted: value = ("The system stopped the download.", "Das System hat den Download abgebrochen.")
    case .downloadFailed: value = ("The download failed.", "Der Download ist fehlgeschlagen.")
    case .recoveryLoading: value = ("Opening library…", "Bibliothek wird geöffnet …")
    case .recoveryTitle: value = ("Library unavailable", "Bibliothek nicht verfügbar")
    case .recoveryExplanation: value = ("The library could not be opened. Retry, or back it up and create an empty library.", "Die Bibliothek konnte nicht geöffnet werden. Erneut versuchen oder nach einer Sicherung eine leere Bibliothek anlegen.")
    case .recoveryRetry: value = ("Try again", "Erneut versuchen")
    case .recoveryRebuild: value = ("Back up and reset library", "Bibliothek sichern und zurücksetzen")
    case .recoveryCancel: value = ("Cancel", "Abbrechen")
    case .recoveryConfirmation: value = ("Your playlists and library entries will be reset. The existing database will be backed up first. Downloaded files will be kept.", "Playlists und Bibliothekseinträge werden zurückgesetzt. Die bisherige Datenbank wird vorher gesichert. Heruntergeladene Dateien bleiben erhalten.")
    case .recoveryBackup: value = ("Database backup:", "Datenbanksicherung:")
    case .appLanguage: value = ("App language", "App-Sprache")
    case .switchLanguage: value = ("Deutsch", "English")
    case .downloadNotificationsSetting: value = ("Download notifications", "Download-Mitteilungen")
    case .batchTitlePhone: value = ("Downloads from iPhone", "Downloads vom iPhone")
    case .batchTitlePlaylist: value = ("Playlist download", "Playlist-Download")
    case .batchTitleVideo: value = ("Download finished", "Download abgeschlossen")
    case .batchSingleDownloaded: value = ("Downloaded", "Heruntergeladen")
    case .batchSingleFailed: value = ("Could not be downloaded", "Konnte nicht geladen werden")
    case .batchDownloadedOne: value = ("%@ title downloaded", "%@ Titel heruntergeladen")
    case .batchDownloadedOther: value = ("%@ titles downloaded", "%@ Titel heruntergeladen")
    case .batchFailedOne: value = ("%@ title could not be downloaded", "%@ Titel konnte nicht geladen werden")
    case .batchFailedOther: value = ("%@ titles could not be downloaded", "%@ Titel konnten nicht geladen werden")
    case .batchPartial: value = ("%1$@ of %2$@ titles downloaded, %3$@ failed", "%1$@ von %2$@ Titeln geladen, %3$@ fehlgeschlagen")
    }
    return resolvedLanguage(language) == "de" ? value.de : value.en
  }

  /// Fills the placeholders with numbers formatted for the UI language.
  static func format(_ key: Key, _ numbers: Int..., language: String? = nil) -> String {
    let locale = Locale(identifier: resolvedLanguage(language))
    let arguments: [CVarArg] = numbers.map { $0.formatted(.number.locale(locale)) }
    return String(format: text(key, language: language), locale: locale, arguments: arguments)
  }

  /// Picks the singular or plural form for a count.
  static func plural(_ count: Int, one: Key, other: Key, language: String? = nil) -> String {
    format(count == 1 ? one : other, count, language: language)
  }

  private static func resolvedLanguage(_ language: String?) -> String {
    language ?? UserDefaults.standard.string(forKey: "uiLanguage")
      ?? Locale.current.language.languageCode?.identifier ?? "en"
  }
}
