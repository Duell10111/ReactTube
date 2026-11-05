import Foundation

enum LibraryCopy {
  static var language: String {
    UserDefaults.standard.string(forKey: "uiLanguage") == "de" ? "de" : "en"
  }
  static var locale: Locale { Locale(identifier: language) }
  static func text(_ key: String) -> String {
    let english = Bundle.main.path(forResource: "en", ofType: "lproj").flatMap(Bundle.init(path:))
    let selected = Bundle.main.path(forResource: language, ofType: "lproj").flatMap(
      Bundle.init(path:))
    let fallback = english?.localizedString(forKey: key, value: key, table: "Library") ?? key
    return selected?.localizedString(forKey: key, value: fallback, table: "Library") ?? fallback
  }
  static func format(_ key: String, _ arguments: CVarArg...) -> String {
    String(format: text(key), locale: locale, arguments: arguments)
  }
}
